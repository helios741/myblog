
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



## 目录的存储格式


## 软链接和硬链接的存储格式

## 总结


## 问题

如何查看inode的内容和文件夹的内容：

