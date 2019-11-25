[虚拟文件系统：文件多了就需要档案管理系统](https://time.geekbang.org/column/article/98855)


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



## 打开文件


## 总结
