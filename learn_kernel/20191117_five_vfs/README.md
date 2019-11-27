虚拟文件系统：文件多了就需要档案管理系统](https://time.geekbang.org/column/article/98855)


## 介绍
进程想要向文件系统里面读写数据，需要很多层的组件一起合作，有以下几层：
- 应用层，进程在进行文件的读写操作时候，可以调用`sys_open`, `sys_read`, `sys_write`
- 在内核：
    + 每个进程需要为打开的文件维护一定的数据结构
    + 整个系统打开的文件，也需要维护一定的数据结构】
- Linux可以支持多达数十种不同的文件系统，他们的实现各不相同。因此linux内核向用户空间统一的虚拟文件系统接口，来实现对文件系统的操作。
- 然后对接的就是真正的文件系统
- 为了读写（ext4）文件系统，要通过块设备的I/O层（BIO层）。这是文件系统层和块设备驱动的接口
- 为了加快块设备的读写效率，还有个缓存层
- 下面就是块设备驱动程序

![image](https://user-images.githubusercontent.com/12036324/69513059-85e81a00-0f81-11ea-90c8-a2d5aa2db263.png)

## 挂载文件系统

内核是不是支持某种类型的文件系统，我们需要注册才能知道。比如ext4文件系统，就需要通过register_filesystem进行注册，传入的参数是ext4_fs_type表示注册的是ext4类型的文件系统。里面有个成员变量就是ext4_mount。
```c

register_filesystem(&ext4_fs_type);


static struct file_system_type ext4_fs_type = {
  .owner    = THIS_MODULE,
  .name    = "ext4",
  .mount    = ext4_mount,
  .kill_sb  = kill_block_super,
  .fs_flags  = FS_REQUIRES_DEV,
};
```
如果一种文件系统曾经在内核注册过，说明可以使用这种文件系统。

mount系统调用如下：
```c

SYSCALL_DEFINE5(mount, char __user *, dev_name, char __user *, dir_name, char __user *, type, unsigned long, flags, void __user *, data)
{
......
  ret = do_mount(kernel_dev, dir_name, kernel_type, flags, options);
......
}
```
接下来的调用链为：*do_mount -> do_new_mount -> vfs_kern_mount*
```c

struct vfsmount *
vfs_kern_mount(struct file_system_type *type, int flags, const char *name, void *data)
{
......
  mnt = alloc_vfsmnt(name);
......
  root = mount_fs(type, flags, name, data);
......
  mnt->mnt.mnt_root = root;
  mnt->mnt.mnt_sb = root->d_sb;
  mnt->mnt_mountpoint = mnt->mnt.mnt_root;
  mnt->mnt_parent = mnt;
  list_add_tail(&mnt->mnt_instance, &root->d_sb->s_mounts);
  return &mnt->mnt;
}
```
vfs_kern_mount会先创建struct mount结构，每个挂载的文件系统都对应这样一个结构：
```c

struct mount {
  struct hlist_node mnt_hash;
  struct mount *mnt_parent;
  struct dentry *mnt_mountpoint;
  struct vfsmount mnt;
  union {
    struct rcu_head mnt_rcu;
    struct llist_node mnt_llist;
  };
  struct list_head mnt_mounts;  /* list of children, anchored here */
  struct list_head mnt_child;  /* and going through their mnt_child */
  struct list_head mnt_instance;  /* mount instance on sb->s_mounts */
  const char *mnt_devname;  /* Name of device e.g. /dev/dsk/hda1 */
  struct list_head mnt_list;
......
} __randomize_layout;


struct vfsmount {
  struct dentry *mnt_root;  /* root of the mounted tree */
  struct super_block *mnt_sb;  /* pointer to superblock */
  int mnt_flags;
} __randomize_layout;
```
其中：
- mnt_parent： 挂载点所在的父文件系统
- mnt_mountpoint：挂载点在的父文件系统的dentry。
- struct dentry： 表示目录，并和目录的inode关联
- mnt_root：当前文件系统的根目录的dentry
- mnt_sb：是指向超级块的指针

接下来就调用mount_fs挂载文件系统：
```c

struct dentry *
mount_fs(struct file_system_type *type, int flags, const char *name, void *data)
{
  struct dentry *root;
  struct super_block *sb;
......
  root = type->mount(type, flags, name, data);
......
  sb = root->d_sb;
......
}
```
这里调用的是ext4_fs_type的mount函数，也就是咱们上面提到的ext4_mount，从文件系统里面读取超级块。

在文件系统的实现中，每个在硬盘上的结构，在内存中也对应相同的结构。当所有数据结构都读到内存里面，内核就可以通过操作这些数据结构，来操作文件系统了。

### 一个例子
- 根文件系统下有个home目录，文件系统A挂载在这个目录下面，文件系统A根目录下有个hello目录
- 文件系统B挂载到/home/hello下面，文件系统B有个world目录，world目录下有个data目录

这些数据结构如下图所示：

![image](https://user-images.githubusercontent.com/12036324/69513042-79fc5800-0f81-11ea-89ec-fac3d2289651.png)

- 红色背景为dentry结构
- 黄色背景的为mount结构
- 中间绿色的为file结构，表示打开的文件，他有两个变量：
    + 指向相应的mount
    + 指向dentry




## 打开文件

```c

SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
......
  return do_sys_open(AT_FDCWD, filename, flags, mode);
}


long do_sys_open(int dfd, const char __user *filename, int flags, umode_t mode)
{
......
  fd = get_unused_fd_flags(flags);
  if (fd >= 0) {
    struct file *f = do_filp_open(dfd, tmp, &op);
    if (IS_ERR(f)) {
      put_unused_fd(fd);
      fd = PTR_ERR(f);
    } else {
      fsnotify_open(f);
      fd_install(fd, f);
    }
  }
  putname(tmp);
  return fd;
}
```
每个进程的task_struct中，有一个files指针，类型是files_struct
```c
struct files_struct    *files;
```
files_struct里面最重要的是一个文件描述符列表，每打开一个文件，就会在这个列表中分配一项，下标就是文件描述符：
```c
struct files_struct {
......
  struct file __rcu * fd_array[NR_OPEN_DEFAULT];
};
```
- 文件描述符0表示stdin
- 文件描述符1表示stdout
- 文件描述符2表示stderr
再打开的文件都会从这个列表中找一个空闲位置分配给它。


文件描述符列表的每一项都是一个指向struct file的指针（每打开一个文件，都会有一个struct file对应）

do_sys_open调用do_filp_open，就是创建这个struct file结构，然后调用fd_install(fd, f)将文件描述符和这个结构关联起来。
```c

struct file *do_filp_open(int dfd, struct filename *pathname,
    const struct open_flags *op)
{
......
  set_nameidata(&nd, dfd, pathname);
  filp = path_openat(&nd, op, flags | LOOKUP_RCU);
......
  restore_nameidata();
  return filp;
}
```
- set_nameidata: 初始化nameidata结构。这个结构是解析和查找路径的时候做辅助工作
struct nameidata里面有struct path这个关键成员变量：
```c

struct path {
  struct vfsmount *mnt;
  struct dentry *dentry;
} __randomize_layout;
```
    + struct vfsmount: 和文件系统挂载有关
    + struct dentry: 除了用于标识目录之外，还可以表示文件名，还会建立文件名和inode之间的关联
- path_openat：
    + get_empty_filp生成一个struct file结构
    + path_init初始化nameidata，准备开始节点路径查找
    + link_path_walk对于路径名逐层节点路径查找，用“/”逐层处理
    + do_last获取文件对应的inode对象，并且初始化file对象
```c

static struct file *path_openat(struct nameidata *nd,
      const struct open_flags *op, unsigned flags)
{
......
  file = get_empty_filp();
......
  s = path_init(nd, flags);
......
  while (!(error = link_path_walk(s, nd)) &&
    (error = do_last(nd, file, op, &opened)) > 0) {
......
  }
  terminate_walk(nd);
......
  return file;
}
```
例如文件“/root/hello/world/data”，link_path_walk会解析前面的路径部分“/root/hello/world”，解析完毕时候nameidata的dentry为路径名的最后一部分的父目录“/root/hello/world”，nameidata的filename为路径名的最后一部分“data”。

最后是do_last：
```c

static int do_last(struct nameidata *nd,
       struct file *file, const struct open_flags *op,
       int *opened)
{
......
  error = lookup_fast(nd, &path, &inode, &seq);
......
    error = lookup_open(nd, &path, file, op, got_write, opened);
......
  error = vfs_open(&nd->path, file, current_cred());
......
}
```
我们先需要查找文件路径最后一部分对应的dentry。
linux为了提高目录项的对象的处理效率，设计与实现了目录项高速缓存dentry cache，简称dcache。它由两个数据结构组成：
- 哈希表dentry_hashtable: dcache中所有的dentry都通过d_hash指针链到相应的detry哈希链表中
- 未使用的dentry对象链表s_dentry_lru：dentry对象通过其d_lru指针链如LRU链表中

![image](https://user-images.githubusercontent.com/12036324/69519255-89d16780-0f94-11ea-89c7-c693b3075fbb.png)

两个链表的关系如下：
- 引用为0: 一个在散列表中的dentry变为没有人引用，就会加入到LRU表中
- 再次被引用：一个在LRU表中的dentry再次被引用了，从LRU表中移除
- 分配：当dentry在散表中没找到就从Slub分配器中分配一个
- 过期归还：当LRU表中最长时间没有使用的dentry应该释放会Slub分配器
- 文件删除：文件删除了，相应的dentry应该释放回Slub分配器
- 结构复用：当需要分配一个dentry，但是无法分配新的，就从LRU表中取出一个复用

最后通过lookup_fast，先从缓存中查找dentry

如果缓存中没找到，就到真的文件系统里面找，lookup_open会创建一个dentry，并且返回上一级目录的inode的inode_operations的lookup函数，对于ext4来讲，调用的是ext4_lookup，会到文件系统里面去找inode。最终找到后将新生成的dentry赋给path变量。
```c

static int lookup_open(struct nameidata *nd, struct path *path,
      struct file *file,
      const struct open_flags *op,
      bool got_write, int *opened)
{
    ......
    dentry = d_alloc_parallel(dir, &nd->last, &wq);
    ......
    struct dentry *res = dir_inode->i_op->lookup(dir_inode, dentry,
                   nd->flags);
    ......
    path->dentry = dentry;
  path->mnt = nd->path.mnt;
}




const struct inode_operations ext4_dir_inode_operations = {
  .create    = ext4_create,
  .lookup    = ext4_lookup,
...
```
do_last() 的最后一步是调用 vfs_open 真正打开文件。
```c

int vfs_open(const struct path *path, struct file *file,
       const struct cred *cred)
{
  struct dentry *dentry = d_real(path->dentry, NULL, file->f_flags, 0);
......
  file->f_path = *path;
  return do_dentry_open(file, d_backing_inode(dentry), NULL, cred);
}


static int do_dentry_open(struct file *f,
        struct inode *inode,
        int (*open)(struct inode *, struct file *),
        const struct cred *cred)
{
......
  f->f_mode = OPEN_FMODE(f->f_flags) | FMODE_LSEEK |
        FMODE_PREAD | FMODE_PWRITE;
  path_get(&f->f_path);
  f->f_inode = inode;
  f->f_mapping = inode->i_mapping;
......
  f->f_op = fops_get(inode->i_fop);
......
  open = f->f_op->open;
......
  error = open(inode, f);
......
  f->f_flags &= ~(O_CREAT | O_EXCL | O_NOCTTY | O_TRUNC);
  file_ra_state_init(&f->f_ra, f->f_mapping->host->i_mapping);
  return 0;
......
}


const struct file_operations ext4_file_operations = {
......
  .open    = ext4_file_open,
......
};

```
vfs_open 里面最终要做的一件事情是，调用 f_op->open，也就是调用 ext4_file_open。另外一件重要的事情是将打开文件的所有信息，填写到 struct file 这个结构里面。
```c

struct file {
  union {
    struct llist_node  fu_llist;
    struct rcu_head   fu_rcuhead;
  } f_u;
  struct path    f_path;
  struct inode    *f_inode;  /* cached value */
  const struct file_operations  *f_op;
  spinlock_t    f_lock;
  enum rw_hint    f_write_hint;
  atomic_long_t    f_count;
  unsigned int     f_flags;
  fmode_t      f_mode;
  struct mutex    f_pos_lock;
  loff_t      f_pos;
  struct fown_struct  f_owner;
  const struct cred  *f_cred;
......
  struct address_space  *f_mapping;
  errseq_t    f_wb_err;
}
```


## 总结

![image](https://user-images.githubusercontent.com/12036324/69520287-37457a80-0f97-11ea-8577-65e9c1d1309f.png)

## 问题

上一节的总结中，我们说，同一个文件系统中，文件夹和文件的对应关系。如果跨的是文件系统，你知道如何维护这种映射关系吗？

