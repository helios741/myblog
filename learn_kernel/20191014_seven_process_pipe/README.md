[管道：项目组A完成了，如何交接给项目组B？](https://time.geekbang.org/column/article/103426)

管道的创建使用的是下面这个系统调用：
```c
int pipe(int fd[2])
```


## 匿名管道

我们创建管道之后会返回一个文件描述符的数组，里面包含两项：
- fd[0]: 负责读取
- fd[1]: 负责写

![image](https://user-images.githubusercontent.com/12036324/66728724-481fae00-ee79-11e9-8151-9e70cd09a531.png)
内核实现：
```c
SYSCALL_DEFINE1(pipe, int __user *, fildes)
{
	return sys_pipe2(fildes, 0);
}

SYSCALL_DEFINE2(pipe2, int __user *, fildes, int, flags)
{
	struct file *files[2];
	int fd[2];
	int error;

	error = __do_pipe_flags(fd, files, flags);
	if (!error) {
		if (unlikely(copy_to_user(fildes, fd, sizeof(fd)))) {
......
			error = -EFAULT;
		} else {
			fd_install(fd[0], files[0]);
			fd_install(fd[1], files[1]);
		}
	}
	return error;
}
```
主要的逻辑都是在*pipe2*这个系统调用中：
- 创建一个数组files，用于存放管道两端的打开文件
- 创建另一个数组fd，用户存放管道两端的文件描述符
- 如果调用*__do_pipe_flags*没有错误，那就调用*fd_install*，将两个fd和*struct file*关联起来。
*__do_pipe_flags*调用*create_pipe_files*生成两个fd：
```c
static int __do_pipe_flags(int *fd, struct file **files, int flags)
{
	int error;
	int fdw, fdr;
......
	error = create_pipe_files(files, flags);
......
	error = get_unused_fd_flags(flags);
......
	fdr = error;

	error = get_unused_fd_flags(flags);
......
	fdw = error;

	fd[0] = fdr;
	fd[1] = fdw;
	return 0;
......
}
```
创建一个管道，大部分的逻辑是在*create_pipe_files*里面实现的。从这里我们可以看出匿名管道也是创建在文件系统之上的，只不过是一个特殊的文件系统，创建一个特殊的文件，对应一个特殊的inode，就是我们这里的*get_pipe_inode()*
```c
int create_pipe_files(struct file **res, int flags)
{
	int err;
	struct inode *inode = get_pipe_inode();
	struct file *f;
	struct path path;
......
	path.dentry = d_alloc_pseudo(pipe_mnt->mnt_sb, &empty_name);
......
	path.mnt = mntget(pipe_mnt);

	d_instantiate(path.dentry, inode);

	f = alloc_file(&path, FMODE_WRITE, &pipefifo_fops);
......
	f->f_flags = O_WRONLY | (flags & (O_NONBLOCK | O_DIRECT));
	f->private_data = inode->i_pipe;

	res[0] = alloc_file(&path, FMODE_READ, &pipefifo_fops);
......
	path_get(&path);
	res[0]->private_data = inode->i_pipe;
	res[0]->f_flags = O_RDONLY | (flags & O_NONBLOCK);
	res[1] = f;
	return 0;
......
}
```
从*get_pipe_inode*的实现我们可以看出，匿名管道来自于一个特殊的文件系统pipefs。这个文件系统被挂载后，我们就得到了*struct vfsmount *pipe_mnt*。然后挂载的文件的系统的superblock就变为了*pipe_mnt->mnt_sb*。

```c
static struct file_system_type pipe_fs_type = {
	.name		= "pipefs",
	.mount		= pipefs_mount,
	.kill_sb	= kill_anon_super,
};

static int __init init_pipe_fs(void)
{
	int err = register_filesystem(&pipe_fs_type);

	if (!err) {
		pipe_mnt = kern_mount(&pipe_fs_type);
	}
......
}

static struct inode * get_pipe_inode(void)
{
	struct inode *inode = new_inode_pseudo(pipe_mnt->mnt_sb);
	struct pipe_inode_info *pipe;
......
	inode->i_ino = get_next_ino();

	pipe = alloc_pipe_info();
......
	inode->i_pipe = pipe;
	pipe->files = 2;
	pipe->readers = pipe->writers = 1;
	inode->i_fop = &pipefifo_fops;
	inode->i_state = I_DIRTY;
	inode->i_mode = S_IFIFO | S_IRUSR | S_IWUSR;
	inode->i_uid = current_fsuid();
	inode->i_gid = current_fsgid();
	inode->i_atime = inode->i_mtime = inode->i_ctime = current_time(inode);

	return inode;
......
}
```
*new_inode_pseudo*函数创建一个inode，这里面开始填写inode的成员。struct pipe_inode_info这个结构里面有个成员*struct pipe_bufer *bufs*。所谓的**匿名管道，就是内核里面的一串缓存**。
```c
const struct file_operations pipefifo_fops = {
	.open		= fifo_open,
	.llseek		= no_llseek,
	.read_iter	= pipe_read,
	.write_iter	= pipe_write,
	.poll		= pipe_poll,
	.unlocked_ioctl	= pipe_ioctl,
	.release	= pipe_release,
	.fasync		= pipe_fasync,
};
```
在create_pipe_files函数，
- 创建完inode还需要创建一个dentry和他对应。
- dentry和inode对应好之后，我们开始创建struct file对象
- 写入和读取都是操作的*pipefifo_fops*，就是标识位不一样
- 把private_data设置为pipe_inode_info，这样从struct file这个层级上，就能直接操作底层的读写操作

但是这个时候两个文件描述符都是在一个进程里面的，我们可以通过fork系统调用，子进程会复制父进程的*struct files_struct*，在这里面的fd数组会复制一份，这样就做到了两个进程各自有两个fd指向同一个*struct file*的模式，这样两个进程就可以通过各自的fd写入和读取同一个管道文件实现跨进程通信了。

![image](https://user-images.githubusercontent.com/12036324/66728738-5cfc4180-ee79-11e9-8881-67a0deedefaa.png)
由于管道只能一端写入，另一端读出，所以上面的这种模式会造成混乱，因为父进程和子进程都可以写入，也都可以读出，通常的方法是父进程关闭读取的 fd，只保留写入的 fd，而子进程关闭写入的 fd，只保留读取的 fd，如果需要双向通行，则应该创建两个管道。

父子通信通过管道的代码如下：
```c
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(int argc, char *argv[])
{
  int fds[2];
  if (pipe(fds) == -1)
    perror("pipe error");

  pid_t pid;
  pid = fork();
  if (pid == -1)
    perror("fork error");

  if (pid == 0){
    close(fds[0]);
    char msg[] = "hello world";
    write(fds[1], msg, strlen(msg) + 1);
    close(fds[1]);
    exit(0);
  } else {
    close(fds[1]);
    char msg[128];
    read(fds[0], msg, 128);
    close(fds[0]);
    printf("message : %s\n", msg);
    return 0;
  }
}
```
![image](https://user-images.githubusercontent.com/12036324/66728756-743b2f00-ee79-11e9-9292-39746229602b.png)
那如果是在shell上执行*ps -ef | grep systemd*这种模式呢
1. shell和A建立管道，shell关闭写，A关闭读
2. shell和B建立管道，这个时候shell和B都能保持对和A建立管道的读取
3. shell关闭读

![image](https://user-images.githubusercontent.com/12036324/66728760-7a311000-ee79-11e9-8166-87bfdacca042.png)
要将两端的输入输出关联起来，就要用dup2这个系统调用：
```c
int dup2(int oldfd, int newfd);
```
这个系统调用，将老的文件描述符赋值给新的文件描述符，让 newfd 的值和 oldfd 一样。


在 files_struct 里面，有这样一个表，下标是 fd，内容指向一个打开的文件 struct file。
```c
struct files_struct {
  struct file __rcu * fd_array[NR_OPEN_DEFAULT];
}
```
这个表中前三项是固定的：
1. STDIN_FILENO：标准输入
2. STDOUT_FILENO：标准输出
3. STDERR_FILENO：错误输出

- 在A进程中，写入端的操作： dup2(fd[1], STDOUT_FILENO)
- B进程：dup2(fd[1], STDIN_FILENO)
这样*ps -ef | grep systemd*就完成了，看代码：
```c
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(int argc, char *argv[])
{
  int fds[2];
  if (pipe(fds) == -1)
    perror("pipe error");

  pid_t pid;
  pid = fork();
  if (pid == -1)
    perror("fork error");

  if (pid == 0){
    dup2(fds[1], STDOUT_FILENO);
    close(fds[1]);
    close(fds[0]);
    execlp("ps", "ps", "-ef", NULL);
  } else {
    dup2(fds[0], STDIN_FILENO);
    close(fds[0]);
    close(fds[1]);
    execlp("grep", "grep", "systemd", NULL);
  }
  
  return 0;
}
```

## 命名管道
命令创建命名管道需要*mkfifo*，进行创建。如果通过代码创建命名管道也有这样一个函数，但不是一个系统调用而是Glibc提供的函数：
```c
int
mkfifo (const char *path, mode_t mode)
{
  dev_t dev = 0;
  return __xmknod (_MKNOD_VER, path, mode | S_IFIFO, &dev);
}

int
__xmknod (int vers, const char *path, mode_t mode, dev_t *dev)
{
  unsigned long long int k_dev;
......
  /* We must convert the value to dev_t type used by the kernel.  */
  k_dev = (*dev) & ((1ULL << 32) - 1);
......
  return INLINE_SYSCALL (mknodat, 4, AT_FDCWD, path, mode,
                         (unsigned int) k_dev);
}
```
Glibc的mkfifo会调用__xmknod进而调用mknodat系统调用。这里的命名管道是一个设备，调用的是*mknod*：
```c
SYSCALL_DEFINE4(mknodat, int, dfd, const char __user *, filename, umode_t, mode, unsigned, dev)
{
	struct dentry *dentry;
	struct path path;
	unsigned int lookup_flags = 0;
......
retry:
	dentry = user_path_create(dfd, filename, &path, lookup_flags);
......
	switch (mode & S_IFMT) {
......
		case S_IFIFO: case S_IFSOCK:
			error = vfs_mknod(path.dentry->d_inode,dentry,mode,0);
			break;
	}
......
}
```
对于mknod的解析：
1. 通过user_path_create对于这个管道文件创建一个dentry
2. 因为是S_FIFO，所以调用vfs_mknod
3. 由于管道文件是创建在普通文件系统上的，假设是ext4，vfs_mknod调用ext4_dir_inode_operations的mknod
4. 最后调用ext4_mknod
```c
const struct inode_operations ext4_dir_inode_operations = {
......
	.mknod		= ext4_mknod,
......
};

static int ext4_mknod(struct inode *dir, struct dentry *dentry,
		      umode_t mode, dev_t rdev)
{
	handle_t *handle;
	struct inode *inode;
......
	inode = ext4_new_inode_start_handle(dir, mode, &dentry->d_name, 0,
					    NULL, EXT4_HT_DIR, credits);
	handle = ext4_journal_current_handle();
	if (!IS_ERR(inode)) {
		init_special_inode(inode, inode->i_mode, rdev);
		inode->i_op = &ext4_special_inode_operations;
		err = ext4_add_nondir(handle, dentry, inode);
		if (!err && IS_DIRSYNC(dir))
			ext4_handle_sync(handle);
	}
	if (handle)
		ext4_journal_stop(handle);
......
}

#define ext4_new_inode_start_handle(dir, mode, qstr, goal, owner, \
				    type, nblocks)		    \
	__ext4_new_inode(NULL, (dir), (mode), (qstr), (goal), (owner), \
			 0, (type), __LINE__, (nblocks))

void init_special_inode(struct inode *inode, umode_t mode, dev_t rdev)
{
	inode->i_mode = mode;
	if (S_ISCHR(mode)) {
		inode->i_fop = &def_chr_fops;
		inode->i_rdev = rdev;
	} else if (S_ISBLK(mode)) {
		inode->i_fop = &def_blk_fops;
		inode->i_rdev = rdev;
	} else if (S_ISFIFO(mode))
		inode->i_fop = &pipefifo_fops;
	else if (S_ISSOCK(mode))
		;	/* leave it no_open_fops */
	else
......
}
```
在ext4_mknod中：
1. ext4_new_inode_start_handle会调用__ext4_new_inode，
2. 在ext4文件系统上真正的创建一个文件，
3. 但是会调用init_special_inode创建一个特殊的inode，将inode->i_ops指向管道文件（pipefifo_fops）
这样管道就创建完毕了。


接下来，要打开这个管道文件，我们还是会调用文件系统的 open 函数。还是沿着文件系统的调用方式，一路调用到 pipefifo_fops 的 open 函数，也就是 fifo_open。
```c
static int fifo_open(struct inode *inode, struct file *filp)
{
	struct pipe_inode_info *pipe;
	bool is_pipe = inode->i_sb->s_magic == PIPEFS_MAGIC;
	int ret;
	filp->f_version = 0;

	if (inode->i_pipe) {
		pipe = inode->i_pipe;
		pipe->files++;
	} else {
		pipe = alloc_pipe_info();
		pipe->files = 1;
		inode->i_pipe = pipe;
		spin_unlock(&inode->i_lock);
	}
	filp->private_data = pipe;
	filp->f_mode &= (FMODE_READ | FMODE_WRITE);

	switch (filp->f_mode) {
	case FMODE_READ:
		pipe->r_counter++;
		if (pipe->readers++ == 0)
			wake_up_partner(pipe);
		if (!is_pipe && !pipe->writers) {
			if ((filp->f_flags & O_NONBLOCK)) {
			filp->f_version = pipe->w_counter;
			} else {
				if (wait_for_partner(pipe, &pipe->w_counter))
					goto err_rd;
			}
		}
		break;
	case FMODE_WRITE:
		pipe->w_counter++;
		if (!pipe->writers++)
			wake_up_partner(pipe);
		if (!is_pipe && !pipe->readers) {
			if (wait_for_partner(pipe, &pipe->r_counter))
				goto err_wr;
		}
		break;
	case FMODE_READ | FMODE_WRITE:
		pipe->readers++;
		pipe->writers++;
		pipe->r_counter++;
		pipe->w_counter++;
		if (pipe->readers == 1 || pipe->writers == 1)
			wake_up_partner(pipe);
		break;
......
	}
......
}
```
在 fifo_open 里面，创建 pipe_inode_info，这一点和匿名管道也是一样的。这个结构里面有个成员是 struct pipe_buffer *bufs。我们可以知道，**所谓的命名管道，其实是也是内核里面的一串缓存。**.

- 对于管道的写入：调用pipefifo_fops的pipe_write函数，向pipe_buffer写入数据
- 对于管道的读取：调用pipefifo_fops的pipe_read函数，通过pipe_buffer读取数据

## 总结
无论是匿名管道，还是命名管道在内核中都是一个文件，主要是文件就有inode，字符设备，块设备还是管道都是这种特殊的inode。

在这种特殊的inode里面，file_operations指向管道特殊的pipefifo_fops，这个inode对应内存里面的缓存。


当我们用open函数打开这个管道设备的时候，会调用pipefifo_fops里面的方法创建*struct file*，他的inode指向特殊的inode，也对应内存里面的缓存。


写入一个 pipe 就是从 struct file 结构找到缓存写入，读取一个 pipe 就是从 struct file 结构找到缓存读出。

![image](https://user-images.githubusercontent.com/12036324/66728598-7224a080-ee78-11e9-8b0f-4a78ae2f5a4d.png)


## 问题
上面创建匿名管道的程序，你一定要运行一下，然后试着通过 strace 查看自己写的程序的系统调用，以及直接在命令行使用匿名管道的系统调用，做一个比较。
