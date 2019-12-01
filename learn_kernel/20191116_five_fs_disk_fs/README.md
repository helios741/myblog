
[硬盘文件系统：如何最合理地组织档案库的文档？](https://time.geekbang.org/column/article/98440)

## inode与块的存储

硬盘分为大小相同的单元，我们称之为块。一个块的大小是扇区大小的整数倍，默认为4K。（在格式化的时候可以设定）


inode中的i是index的意思。
inode的定义如下：
```c

struct ext4_inode {
  __le16  i_mode;    /* File mode */
  __le16  i_uid;    /* Low 16 bits of Owner Uid */
  __le32  i_size_lo;  /* Size in bytes */
  __le32  i_atime;  /* Access time */
  __le32  i_ctime;  /* Inode Change time */
  __le32  i_mtime;  /* Modification time */
  __le32  i_dtime;  /* Deletion Time */
  __le16  i_gid;    /* Low 16 bits of Group Id */
  __le16  i_links_count;  /* Links count */
  __le32  i_blocks_lo;  /* Blocks count */
  __le32  i_flags;  /* File flags */
......
  __le32  i_block[EXT4_N_BLOCKS];/* Pointers to blocks */
  __le32  i_generation;  /* File version (for NFS) */
  __le32  i_file_acl_lo;  /* File ACL */
  __le32  i_size_high;
......
};
```
- i_mode: 文件的读写权限
- i_uid: 属于哪个用户
- i_gid: 属于哪个组
- i_size_io: 大小是多少
- i_blocks_io: 占用多少个块的
- i_atime: access time最近一个访问时间
- i_ctime: change time最近一次修改inode的时间
- i_mtime: modify time最近一次修改文件的时间
- i_block[EXT4_N_BLOCKS]: 文件中分为几块，每一块的放在哪里,i_block一共15项

EXT4_N_BLOCKS的定义如下：
```c

#define  EXT4_NDIR_BLOCKS    12
#define  EXT4_IND_BLOCK      EXT4_NDIR_BLOCKS
#define  EXT4_DIND_BLOCK      (EXT4_IND_BLOCK + 1)
#define  EXT4_TIND_BLOCK      (EXT4_DIND_BLOCK + 1)
#define  EXT4_N_BLOCKS      (EXT4_TIND_BLOCK + 1)
```
在 ext2 和 ext3 中，其中前 12 项直接保存了块的位置，也就是说，我们可以通过 i_block[0-11]，直接得到保存文件内容的块。

![image](https://user-images.githubusercontent.com/12036324/68989363-995bfc80-0880-11ea-90ec-e5beb19704d0.png)

- i_block[12]指向间接块
- i_block[13]指向间接块的间接块
- i_block[14]指向间接块的间接块的间接块


在ext4中引入了*Extends*的概念，*Extends*可用于存放连续的块，因为ext3/ext2那样散着放数据量太大。我们可以把大文件放在一个Extends里面。这样的话，对大文件的读写性能提高了，文件碎片也减少了。
inode中的i_block变为了一个*Extend header* + 四个 *Extend Entry*。
*Extends*通过保存为一棵树来存储：
![image](https://user-images.githubusercontent.com/12036324/68989633-9531de00-0884-11ea-8968-16d98b7dea28.png)
树中的节点，要么是叶子节点要么是分支节点。每个节点都有一个头，ext4_extent_header可以用来描述某个节点。
```c

struct ext4_extent_header {
  __le16  eh_magic;  /* probably will support different formats */
  __le16  eh_entries;  /* number of valid entries */
  __le16  eh_max;    /* capacity of store in entries */
  __le16  eh_depth;  /* has tree real underlying blocks? */
  __le32  eh_generation;  /* generation of the tree */
};
```
- eh_entries: 表示这个节点里面有多少项
    + 如果是叶子节点，这一项会直接指向硬盘上的连续块地址，我们称为数据节点: ext4_extent
    + 如果是分支节点，这一项会指向下一层的分支节点或叶子节点，我们称为索引节点:ext4_extent_idx
    + 上面两种类型大小都是12byte

```c

/*
 * This is the extent on-disk structure.
 * It's used at the bottom of the tree.
 */
struct ext4_extent {
  __le32  ee_block;  /* first logical block extent covers */
  __le16  ee_len;    /* number of blocks covered by extent */
  __le16  ee_start_hi;  /* high 16 bits of physical block */
  __le32  ee_start_lo;  /* low 32 bits of physical block */
};
/*
 * This is index on-disk structure.
 * It's used at all the levels except the bottom.
 */
struct ext4_extent_idx {
  __le32  ei_block;  /* index covers logical blocks from 'block' */
  __le32  ei_leaf_lo;  /* pointer to the physical block of the next *
         * level. leaf or next index could be there */
  __le16  ei_leaf_hi;  /* high 16 bits of physical block */
  __u16  ei_unused;
};
```
除了根节点，其他的节点都保存在一个块4K里面，4K扣除ext4_extent_header的12个byte，剩下还能够放340项，每个extent最大能表示128M的数据。340个extent最多能达到42.5G。

## inode位图和块位图

在Linux文件系统中，专门有一个块存储inode位图。在这4k里面，每一位对应一个inode，如果是1表示这个inode已经被用了。0表示没被用。同样也有一个块保存块位图。


如果创建一个文件，会调用open函数，并且参数会用O_CREAT。这表示当文件找不到的时候，我们就需要创建一个。open的过程如下：
```c

SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
  if (force_o_largefile())
    flags |= O_LARGEFILE;


  return do_sys_open(AT_FDCWD, filename, flags, mode);
}
```
调用链：*do_sys_open-> do_filp_open->path_openat->do_last->lookup_open*，这个调用链的逻辑是：
- 要打开一个文件，先要根据路径找到目录
- 如果目录下没有这个文件，同时又设置了O_CREAT，就说明要创建一个，我们就需要新的inode
```c

static int lookup_open(struct nameidata *nd, struct path *path,
      struct file *file,
      const struct open_flags *op,
      bool got_write, int *opened)
{
......
  if (!dentry->d_inode && (open_flag & O_CREAT)) {
......
    error = dir_inode->i_op->create(dir_inode, dentry, mode,
            open_flag & O_EXCL);
......
  }
......
}
```
想要创建新的 inode，我们就要调用 dir_inode，也就是文件夹的 inode 的 create 函数。它的具体定义是这样的：
```c

const struct inode_operations ext4_dir_inode_operations = {
  .create    = ext4_create,
  .lookup    = ext4_lookup,
  .link    = ext4_link,
  .unlink    = ext4_unlink,
  .symlink  = ext4_symlink,
  .mkdir    = ext4_mkdir,
  .rmdir    = ext4_rmdir,
  .mknod    = ext4_mknod,
  .tmpfile  = ext4_tmpfile,
  .rename    = ext4_rename2,
  .setattr  = ext4_setattr,
  .getattr  = ext4_getattr,
  .listxattr  = ext4_listxattr,
  .get_acl  = ext4_get_acl,
  .set_acl  = ext4_set_acl,
  .fiemap         = ext4_fiemap,
};
```
接下来的调用链是这样的：ext4_create->ext4_new_inode_start_handle->__ext4_new_inode。在 __ext4_new_inode 函数中，我们会创建新的 inode。
```c

struct inode *__ext4_new_inode(handle_t *handle, struct inode *dir,
             umode_t mode, const struct qstr *qstr,
             __u32 goal, uid_t *owner, __u32 i_flags,
             int handle_type, unsigned int line_no,
             int nblocks)
{
......
inode_bitmap_bh = ext4_read_inode_bitmap(sb, group);
......
ino = ext4_find_next_zero_bit((unsigned long *)
                inode_bitmap_bh->b_data,
                EXT4_INODES_PER_GROUP(sb), ino);
......
}
```
这里面一个重要的逻辑就是，从文件系统里面读取 inode 位图，然后找到下一个为 0 的 inode，就是空闲的 inode。


## 文件系统格式

数据块位图放在一个块里面，共4K。每位表示一个数据块，共表示`4 * 1024 * 8 = 2^15`,如果每个数据块是按照默认的4K，最大可以表示空间位`2^15 * 4 * 1024=2^27byte = 128M`。


一个块的位图表示一系列的块，一个块的inode位图表示一系列的inode，我们把这个结构称为块组。

对于块组，我们用*ext4_group_desc*表示：
- bg_inode_bitmap_io: 块组里面的inode位图
- bg_block_bitmap_io: 块位图
- bg_inode_table_io: inode列表

这样一个个块组就构成了我们整个文件系统的结构，因为块组有多个，块组描述符也同样组成一个列表，我们称为*块组描述符表*。


超级块ext4_super_block是对整个文件系统进行描述：
- s_inodes_count: 整个文件系统一共有多少个inode
- s_blocks_count_io: 一共有多少块
- s_inodes_pergroup: 每个块组有多少inode
- s_blocks_per_group: 每个块组有多少个块

如果是一个启动盘，我们需要预留一块区域作为引导区，所以第一个块组的前面要留1K，用于启动引导区。

最终的文件系统格式如下：
![image](https://user-images.githubusercontent.com/12036324/69687581-6cb8a800-10fe-11ea-991c-2137a3c038d6.png)

超级块和块组描述符都是全局信息，这些数据如果丢失了，整个文件系统都打不开了。

### 对于超级块的备份

如果开启了sparse_super,超级块和块组描述符会保存在索引为0、3、5、7的整数幂里面，在块组1（3^0 = 1）,块组3（3^1 = 3), 块组5（5^1=5）,块组7（7^1=7），块组9（3^2=9），块组25（5^2=25），块组27（3^3=27）的第一个block出也存在一个副本。

### 对于块组描述符的备份

对于块组描述符来讲，每个块组里面都包含完整的块组描述符表有点浪费。

改进的思路就是引入*Meta Block Group*特性
- 将所有的块组分组，称为元块组
- 每个元块组里面的块组描述符表仅仅包含自己的（一个元块组包含64个块组，这样一个块组描述符表最多64项）

比如我们一共又256个块组，分为四个元块组，每个元块组里面的块组描述符表就只有64项了。而且也都是自己备份自己的。

![image](https://user-images.githubusercontent.com/12036324/69909947-fe495200-143d-11ea-8c4e-01ade7231ea2.png)

根据上图，每个元块组包含64个块组，块组描述符也是64项。上图一共备份了三份（0，1，63）。

在超级块ext4_super_block的定义中，我们可以看到寻址分为高位和低位，均为32位，其中有用的有48位，2^48个块就是1EB。
```c

struct ext4_super_block {
......
  __le32  s_blocks_count_lo;  /* Blocks count */
  __le32  s_r_blocks_count_lo;  /* Reserved blocks count */
  __le32  s_free_blocks_count_lo;  /* Free blocks count */
......
  __le32  s_blocks_count_hi;  /* Blocks count */
  __le32  s_r_blocks_count_hi;  /* Reserved blocks count */
  __le32  s_free_blocks_count_hi;  /* Free blocks count */
......
}
```

## 目录的存储格式
目录本身也是个文件，也有inode。和文件的inode是保存文件数据不同的是，目录的inode保存的是目录里面一项项的文件信息，这些信息我们称为ext4_dir_entry。从代码来看，有两个版本，在成员来讲几乎没有差别，只不过第二个版本 ext4_dir_entry_2 是将一个 16 位的 name_len，变成了一个 8 位的 name_len 和 8 位的 file_type。
```c

struct ext4_dir_entry {
  __le32  inode;      /* Inode number */
  __le16  rec_len;    /* Directory entry length */
  __le16  name_len;    /* Name length */
  char  name[EXT4_NAME_LEN];  /* File name */
};
struct ext4_dir_entry_2 {
  __le32  inode;      /* Inode number */
  __le16  rec_len;    /* Directory entry length */
  __u8  name_len;    /* Name length */
  __u8  file_type;
  char  name[EXT4_NAME_LEN];  /* File name */
};
```
在目录的块中，最简单的保存格式是列表，就是将一项项的ext4_dir_entry_2列在那。



有时候，如果一个目录下面的文件太多的时候，我们想在这个目录下找一个文件，按照列表一个个去找，太慢了，于是我们就添加了索引的模式。


如果在 inode 中设置 EXT4_INDEX_FL 标志，则目录文件的块的组织形式将发生变化，变成了下面定义的这个样子：

```c

struct dx_root
{
  struct fake_dirent dot;
  char dot_name[4];
  struct fake_dirent dotdot;
  char dotdot_name[4];
  struct dx_root_info
  {
    __le32 reserved_zero;
    u8 hash_version;
    u8 info_length; /* 8 */
    u8 indirect_levels;
    u8 unused_flags;
  }
  info;
  struct dx_entry  entries[0];
};
```
dx_root_info中最重要的成员是indirect_levels，表示间接索引的层数。

dx_entry是文件名的哈希值和数据块的一个映射
```c

struct dx_entry
{
  __le32 hash;
  __le32 block;
};
```
如果我们要查找一个目录下面的文件名，可以通过名称取哈希。如果哈希能够匹配上，就说明这个文件的信息在相应的块里面。然后打开这个块，如果里面不再是索引，而是索引树的叶子节点的话，那里面还是 ext4_dir_entry_2 的列表，我们只要一项一项找文件名就行。通过索引树，我们可以将一个目录下面的 N 多的文件分散到很多的块里面，可以很快地进行查找。
![image](https://user-images.githubusercontent.com/12036324/69910098-8d576980-1440-11ea-923f-9036f1de6f19.png)


## 软链接和硬链接的存储格式

```shell
 ln [参数][源文件或目录][目标文件或目录]
```

ln -s 创建的是软链接，不带 -s 创建的是硬链接。它们有什么区别呢？在文件系统里面是怎么保存的呢？

![image](https://user-images.githubusercontent.com/12036324/69910134-3736f600-1441-11ea-8b51-91680fd83ab8.png)

如图：
- 硬链接： 与原始文件公用一个inode，但是inode是不能跨文件系统的，每个文件系统都有自己的inode列表，因而硬链接是没办法跨文件系统的
- 软链接：相当于重新创建了inode。

## 总结

![image](https://user-images.githubusercontent.com/12036324/69910189-05725f00-1442-11ea-8c30-89ea47a794c6.png)


[第4章 ext文件系统机制原理剖析](https://www.cnblogs.com/f-ck-need-u/p/7016077.html)写的很好。
## 问题

如何查看inode的内容和文件夹的内容：

df -i xxx
