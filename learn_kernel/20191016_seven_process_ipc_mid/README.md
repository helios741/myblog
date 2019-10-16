[IPC（中）：不同项目组之间抢资源，如何协调？](https://time.geekbang.org/column/article/104277)

## IPC在内核中

在内核中消息队列，共享内存，信号量的机制都是统一起来管理的，都叫ipcxxx。


为了维护三种进程间通信机制，在内核里，有一个三项的数组：
```c
struct ipc_namespace {
......
	struct ipc_ids	ids[3];
......
}

#define IPC_SEM_IDS	0
#define IPC_MSG_IDS	1
#define IPC_SHM_IDS	2

#define sem_ids(ns)	((ns)->ids[IPC_SEM_IDS])
#define msg_ids(ns)	((ns)->ids[IPC_MSG_IDS])
#define shm_ids(ns)	((ns)->ids[IPC_SHM_IDS])
```
- 第0项：信号量，通过sem_ids访问
- 第1项：消息队列，通过msg_ids访问
- 第2项：共享内存，通过shm_ids访问


我们再来看看ipc_ids这个里面保存了什么：
```c
struct ipc_ids {
	int in_use;
	unsigned short seq;
	struct rw_semaphore rwsem;
	struct idr ipcs_idr;
	int next_id;
};

struct idr {
	struct radix_tree_root	idr_rt;
	unsigned int		idr_next;
};
```
- in_use： 表示当前有多少个IPC
- seq + next_id：用于生成IPC的唯一id
- ipcs_idr：基数数
也就是说说*sem_ids*，*msg_ids*，*shm_ids*各有一个基数树

这颗树里面存放了什么东西才能统一管理这三类的IPC对象呢？


通过*ipc_obtain_object_idr*，这个函数根据id在基数树中找出*struct kern_ipc_perm*

```c
struct kern_ipc_perm *ipc_obtain_object_idr(struct ipc_ids *ids, int id)
{
	struct kern_ipc_perm *out;
	int lid = ipcid_to_idx(id);
	out = idr_find(&ids->ipcs_idr, lid);
	return out;
}
```
在信号量，消息队列以及共享内存的结构中，第一项都是*struct kern_ipc_perm*：
```c
struct sem_array {
	struct kern_ipc_perm	sem_perm;	/* permissions .. see ipc.h */
	time_t			sem_ctime;	/* create/last semctl() time */
	struct list_head	pending_alter;	/* pending operations */
						                /* that alter the array */
	struct list_head	pending_const;	/* pending complex operations */
						/* that do not alter semvals */
	struct list_head	list_id;	/* undo requests on this array */
	int			sem_nsems;	/* no. of semaphores in array */
	int			complex_count;	/* pending complex operations */
	unsigned int		use_global_lock;/* >0: global lock required */

	struct sem		sems[];
} __randomize_layout;

struct msg_queue {
	struct kern_ipc_perm q_perm;
	time_t q_stime;			/* last msgsnd time */
	time_t q_rtime;			/* last msgrcv time */
	time_t q_ctime;			/* last change time */
	unsigned long q_cbytes;		/* current number of bytes on queue */
	unsigned long q_qnum;		/* number of messages in queue */
	unsigned long q_qbytes;		/* max number of bytes on queue */
	pid_t q_lspid;			/* pid of last msgsnd */
	pid_t q_lrpid;			/* last receive pid */

	struct list_head q_messages;
	struct list_head q_receivers;
	struct list_head q_senders;
} __randomize_layout;

struct shmid_kernel /* private to the kernel */
{
	struct kern_ipc_perm	shm_perm;
	struct file		*shm_file;
	unsigned long		shm_nattch;
	unsigned long		shm_segsz;
	time_t			shm_atim;
	time_t			shm_dtim;
	time_t			shm_ctim;
	pid_t			shm_cprid;
	pid_t			shm_lprid;
	struct user_struct	*mlock_user;

	/* The task created the shm object.  NULL if the task is dead. */
	struct task_struct	*shm_creator;
	struct list_head	shm_clist;	/* list by creator */
} __randomize_layout;
```
也就是说，可以通过*struct kern_ipc_perm*强制类型转换后得到整个结构，具体如下：
```c
static inline struct sem_array *sem_obtain_object(struct ipc_namespace *ns, int id)
{
	struct kern_ipc_perm *ipcp = ipc_obtain_object_idr(&sem_ids(ns), id);
	return container_of(ipcp, struct sem_array, sem_perm);
}

static inline struct msg_queue *msq_obtain_object(struct ipc_namespace *ns, int id)
{
	struct kern_ipc_perm *ipcp = ipc_obtain_object_idr(&msg_ids(ns), id);
	return container_of(ipcp, struct msg_queue, q_perm);
}

static inline struct shmid_kernel *shm_obtain_object(struct ipc_namespace *ns, int id)
{
	struct kern_ipc_perm *ipcp = ipc_obtain_object_idr(&shm_ids(ns), id);
	return container_of(ipcp, struct shmid_kernel, shm_perm);
}
```
![image](https://user-images.githubusercontent.com/12036324/66893922-c1f29b80-f021-11e9-8149-8bdecfd790e0.png)

## 如何创建共享内存

创建共享内存通过*shmget*系统调用。
```c
SYSCALL_DEFINE3(shmget, key_t, key, size_t, size, int, shmflg)
{
	struct ipc_namespace *ns;
	static const struct ipc_ops shm_ops = {
		.getnew = newseg,
		.associate = shm_security,
		.more_checks = shm_more_checks,
	};
	struct ipc_params shm_params;
	ns = current->nsproxy->ipc_ns;
	shm_params.key = key;
	shm_params.flg = shmflg;
	shm_params.u.size = size;
	return ipcget(ns, &shm_ids(ns), &shm_ops, &shm_params);
}
```
这里面调用了*ipcget*，参数为：
- ids： 共享内存对应的shm_ids
- shm_ops：对应的操作
- shm_params：对应的参数

如果 key 设置为 IPC_PRIVATE 则永远创建新的，如果不是的话，就会调用 ipcget_public。ipcget 的具体代码如下：
```c
int ipcget(struct ipc_namespace *ns, struct ipc_ids *ids,
			const struct ipc_ops *ops, struct ipc_params *params)
{
	if (params->key == IPC_PRIVATE)
		return ipcget_new(ns, ids, ops, params);
	else
		return ipcget_public(ns, ids, ops, params);
}

static int ipcget_public(struct ipc_namespace *ns, struct ipc_ids *ids, const struct ipc_ops *ops, struct ipc_params *params)
{
	struct kern_ipc_perm *ipcp;
	int flg = params->flg;
	int err;
	ipcp = ipc_findkey(ids, params->key);
	if (ipcp == NULL) {
		if (!(flg & IPC_CREAT))
			err = -ENOENT;
		else
			err = ops->getnew(ns, params);
	} else {
		if (flg & IPC_CREAT && flg & IPC_EXCL)
			err = -EEXIST;
		else {
			err = 0;
			if (ops->more_checks)
				err = ops->more_checks(ipcp, params);
......
		}
	}
	return err;
}
```
在 ipcget_public 中，我们会按照 key，去查找 struct kern_ipc_perm。如果没有找到，那就看是否设置了 IPC_CREAT；如果设置了，就创建一个新的。如果找到了，就将对应的 id 返回。


通过shm_ops的struct定义，知道创建新的共享内存会调用*newseg*
```c
static int newseg(struct ipc_namespace *ns, struct ipc_params *params)
{
	key_t key = params->key;
	int shmflg = params->flg;
	size_t size = params->u.size;
	int error;
	struct shmid_kernel *shp;
	size_t numpages = (size + PAGE_SIZE - 1) >> PAGE_SHIFT;
	struct file *file;
	char name[13];
	vm_flags_t acctflag = 0;
......
	shp = kvmalloc(sizeof(*shp), GFP_KERNEL);
......
	shp->shm_perm.key = key;
	shp->shm_perm.mode = (shmflg & S_IRWXUGO);
	shp->mlock_user = NULL;

	shp->shm_perm.security = NULL;
......
	file = shmem_kernel_file_setup(name, size, acctflag);
......
	shp->shm_cprid = task_tgid_vnr(current);
	shp->shm_lprid = 0;
	shp->shm_atim = shp->shm_dtim = 0;
	shp->shm_ctim = get_seconds();
	shp->shm_segsz = size;
	shp->shm_nattch = 0;
	shp->shm_file = file;
	shp->shm_creator = current;

	error = ipc_addid(&shm_ids(ns), &shp->shm_perm, ns->shm_ctlmni);
......
	list_add(&shp->shm_clist, &current->sysvshm.shm_clist);
......
	file_inode(file)->i_ino = shp->shm_perm.id;

	ns->shm_tot += numpages;
	error = shp->shm_perm.id;
......
	return error;
}
```
1. *通过kvmalloc*在直接映射区分配一个*struct shmid_kernel*的结构来描述共享内存。填充这个结构，比如key、权限等。
2. 共享内存和文件关联。物理内存是某个进程共享的。虚拟内存可以映射到一个文件，文件是可以跨进程的
    + 在*mm/shmem.c*定义了一个基于内存的文件系统
    + shm*em*表示文件系统
    + shm表示进程通信机制
在系统初始化的时候，*shmem_init*注册了shmem文件系统*shmem_fs_type*，并且挂载到shm_mnt下面。
```c
int __init shmem_init(void)
{
	int error;
	error = shmem_init_inodecache();
	error = register_filesystem(&shmem_fs_type);
	shm_mnt = kern_mount(&shmem_fs_type);
......
	return 0;
}

static struct file_system_type shmem_fs_type = {
	.owner		= THIS_MODULE,
	.name		= "tmpfs",
	.mount		= shmem_mount,
	.kill_sb	= kill_litter_super,
	.fs_flags	= FS_USERNS_MOUNT,
};
```
3. 调用*shmen_kernel_file_setup*，其实就是在shmem文件系统里面创建一个文件
```c
/**
 * shmem_kernel_file_setup - get an unlinked file living in tmpfs which must be kernel internal.
 * @name: name for dentry (to be seen in /proc/<pid>/maps
 * @size: size to be set for the file
 * @flags: VM_NORESERVE suppresses pre-accounting of the entire object size */
struct file *shmem_kernel_file_setup(const char *name, loff_t size, unsigned long flags)
{
	return __shmem_file_setup(name, size, flags, S_PRIVATE);
}

static struct file *__shmem_file_setup(const char *name, loff_t size,
				       unsigned long flags, unsigned int i_flags)
{
	struct file *res;
	struct inode *inode;
	struct path path;
	struct super_block *sb;
	struct qstr this;
......
	this.name = name;
	this.len = strlen(name);
	this.hash = 0; /* will go */
	sb = shm_mnt->mnt_sb;
	path.mnt = mntget(shm_mnt);
	path.dentry = d_alloc_pseudo(sb, &this);
	d_set_d_op(path.dentry, &anon_ops);
......
	inode = shmem_get_inode(sb, NULL, S_IFREG | S_IRWXUGO, 0, flags);
	inode->i_flags |= i_flags;
	d_instantiate(path.dentry, inode);
	inode->i_size = size;
......
	res = alloc_file(&path, FMODE_WRITE | FMODE_READ,
		  &shmem_file_operations);
	return res;
}
```
__shmem_file_setup会创建shmem文件对应的dentery和inode，并将他们关联在一起，并且指向独特的shmem_file_operations。
```c
static const struct file_operations shmem_file_operations = {
	.mmap		= shmem_mmap,
	.get_unmapped_area = shmem_get_unmapped_area,
#ifdef CONFIG_TMPFS
	.llseek		= shmem_file_llseek,
	.read_iter	= shmem_file_read_iter,
	.write_iter	= generic_file_write_iter,
	.fsync		= noop_fsync,
	.splice_read	= generic_file_splice_read,
	.splice_write	= iter_file_splice_write,
	.fallocate	= shmem_fallocate,
#endif
};
```
4. ipc_addid将新创建的*struct shmid_kernel*结构挂载到*shm_ids*里面的基数树上，并放回对应的id，并且将*struct shmid_kernel*挂到当前进程的*sysvshm*队列中。

## 如何将共享内存映射到虚拟地址空间
共享内存的数据结构*struct shmid_kernel*，是通过它的成员*struct file *shm_file*来管理基于内存的文件系统的*shmem*上的内存文件的。无论这个共享内存是否被映射，*shm_file*都是存在的。


将共享内存映射到虚拟地址空间，使用的是系统调用*shmat*：
```c
SYSCALL_DEFINE3(shmat, int, shmid, char __user *, shmaddr, int, shmflg)
{
    unsigned long ret;
    long err;
    err = do_shmat(shmid, shmaddr, shmflg, &ret, SHMLBA);
    force_successful_syscall_return();
    return (long)ret;
}

long do_shmat(int shmid, char __user *shmaddr, int shmflg,
	      ulong *raddr, unsigned long shmlba)
{
	struct shmid_kernel *shp;
	unsigned long addr = (unsigned long)shmaddr;
	unsigned long size;
	struct file *file;
	int    err;
	unsigned long flags = MAP_SHARED;
	unsigned long prot;
	int acc_mode;
	struct ipc_namespace *ns;
	struct shm_file_data *sfd;
	struct path path;
	fmode_t f_mode;
	unsigned long populate = 0;
......
	prot = PROT_READ | PROT_WRITE;
	acc_mode = S_IRUGO | S_IWUGO;
	f_mode = FMODE_READ | FMODE_WRITE;
......
	ns = current->nsproxy->ipc_ns;
	shp = shm_obtain_object_check(ns, shmid);
......
	path = shp->shm_file->f_path;
	path_get(&path);
	shp->shm_nattch++;
	size = i_size_read(d_inode(path.dentry));
......
	sfd = kzalloc(sizeof(*sfd), GFP_KERNEL);
......
	file = alloc_file(&path, f_mode,
			  is_file_hugepages(shp->shm_file) ?
				&shm_file_operations_huge :
				&shm_file_operations);
......
	file->private_data = sfd;
	file->f_mapping = shp->shm_file->f_mapping;
	sfd->id = shp->shm_perm.id;
	sfd->ns = get_ipc_ns(ns);
	sfd->file = shp->shm_file;
	sfd->vm_ops = NULL;
......
	addr = do_mmap_pgoff(file, addr, size, prot, flags, 0, &populate, NULL);
	*raddr = addr;
	err = 0;
......
	return err;
}
```
- shm_obtain_object_check会通过共享内存的id，在基数树中找到*struct shmid_kernel*结构shp，通过它找到shmem上的内存文件
- 分配*struct shm_file_data sfd*来表示这个内存文件, 将shmem中指向内存文件的*shm_file*赋值给*struct shm_file_data*中的file成员
- 通过alloc_file创建一个文件，指向*shmem*中的内存文件
- 为什么要创建两个呢：
    - shmem中的*shm_file*用于管理内存文件，独立于任何一个进程的角色
    - 新创建的file专门用户内存映射的
- 新创建的 struct file 的 private_data，指向 struct shm_file_data，这样内存映射那部分的数据结构，就能够通过它来访问内存文件了。
- 新创建的 struct file 的 file_operations 也发生了变化，变成了 shm_file_operations。
```c
static const struct file_operations shm_file_operations = {
	.mmap		= shm_mmap,
	.fsync		= shm_fsync,
	.release	= shm_release,
	.get_unmapped_area	= shm_get_unmapped_area,
	.llseek		= noop_llseek,
	.fallocate	= shm_fallocate,
};
```
- do_mmap_pgoff会分配一个vm_area_struct指向虚拟地址空间中没有分配的区域，它的vm_file指向这个内存文件，然后他会调用shm_file_operations的.mmap函数（也就是shm_mmap）进程映射。
```c
static int shm_mmap(struct file *file, struct vm_area_struct *vma)
{
	struct shm_file_data *sfd = shm_file_data(file);
	int ret;
	ret = __shm_open(vma);
	ret = call_mmap(sfd->file, vma);
	sfd->vm_ops = vma->vm_ops;
	vma->vm_ops = &shm_vm_ops;
	return 0;
}
```
    - shm_mmap调用shm_file_data中的file的mmap函数，调用的是sh*mem*_file_operations的mmap，也就是*shmem_mmap*
```c
static int shmem_mmap(struct file *file, struct vm_area_struct *vma)
{
	file_accessed(file);
	vma->vm_ops = &shmem_vm_ops;
	return 0;
}
```
- *struct vm_area_struct*的vm_ops指向shmem_vm_ops。
- 等从call_mmap中返回之后，shm_file_data的vm_ops指向shmem_vm_ops，而vm_area_struct的vm_ops改为指向shm_vm_ops
```c
static const struct vm_operations_struct shm_vm_ops = {
	.open	= shm_open,	/* callback for a new vm-area open */
	.close	= shm_close,	/* callback for when the vm-area is released */
	.fault	= shm_fault,
};

static const struct vm_operations_struct shmem_vm_ops = {
	.fault		= shmem_fault,
	.map_pages	= filemap_map_pages,
};
```
访问虚拟内存的时候，访问不到怎么办呢


当访问不到的时候，先调用 vm_area_struct 的 vm_ops，也即 shm_vm_ops 的 fault 函数 shm_fault。然后它会转而调用 shm_file_data 的 vm_ops，也即 shmem_vm_ops 的 fault 函数 shmem_fault。

```c
static int shm_fault(struct vm_fault *vmf)
{
	struct file *file = vmf->vma->vm_file;
	struct shm_file_data *sfd = shm_file_data(file);
	return sfd->vm_ops->fault(vmf);
}
```
虽然基于内存的文件系统，已经为这个内存文件分配了 inode，但是内存也却是一点儿都没分配，只有在发生缺页异常的时候才进行分配。

```c
static int shmem_fault(struct vm_fault *vmf)
{
	struct vm_area_struct *vma = vmf->vma;
	struct inode *inode = file_inode(vma->vm_file);
	gfp_t gfp = mapping_gfp_mask(inode->i_mapping);
......
	error = shmem_getpage_gfp(inode, vmf->pgoff, &vmf->page, sgp,
				  gfp, vma, vmf, &ret);
......
}

/*
 * shmem_getpage_gfp - find page in cache, or get from swap, or allocate
 *
 * If we allocate a new one we do not mark it dirty. That's up to the
 * vm. If we swap it in we mark it dirty since we also free the swap
 * entry since a page cannot live in both the swap and page cache.
 *
 * fault_mm and fault_type are only supplied by shmem_fault:
 * otherwise they are NULL.
 */
static int shmem_getpage_gfp(struct inode *inode, pgoff_t index,
	struct page **pagep, enum sgp_type sgp, gfp_t gfp,
	struct vm_area_struct *vma, struct vm_fault *vmf, int *fault_type)
{
......
    page = shmem_alloc_and_acct_page(gfp, info, sbinfo,
					index, false);
......
}
```
shmem_fault会调用shmem_getpage_gfp在page cache和swap里面找到一个空闲页，如果找不到就调用shmem_alloc_and_acct_page在物理页面分配一个页面。


至此，共享内存才真的映射到了虚拟地址空间中，进程可以像访问本地内存一样访问共享内存。

## 总结
创建共享内存和映射的过程如下：
1. 调用 shmget 创建共享内存。
2. 先通过 ipc_findkey 在基数树中查找 key 对应的共享内存对象 shmid_kernel 是否已经被创建过，如果已经被创建，就会被查询出来，例如 producer 创建过，在 consumer 中就会查询出来。
3. 如果共享内存没有被创建过，则调用 shm_ops 的 newseg 方法，创建一个共享内存对象 shmid_kernel。例如，在 producer 中就会新建。
4. 在 shmem 文件系统里面创建一个文件，共享内存对象 shmid_kernel 指向这个文件，这个文件用 struct file 表示，我们姑且称它为 file1。
5. 调用 shmat，将共享内存映射到虚拟地址空间。
6. shm_obtain_object_check 先从基数树里面找到 shmid_kernel 对象。
7. 创建用于内存映射到文件的 file 和 shm_file_data，这里的 struct file 我们姑且称为 file2。
8. 关联内存区域 vm_area_struct 和用于内存映射到文件的 file，也即 file2，调用 file2 的 mmap 函数。
9. file2 的 mmap 函数 shm_mmap，会调用 file1 的 mmap 函数 shmem_mmap，设置 shm_file_data 和 vm_area_struct 的 vm_ops。
10. 内存映射完毕之后，其实并没有真的分配物理内存，当访问内存的时候，会触发缺页异常 do_page_fault。
11. vm_area_struct 的 vm_ops 的 shm_fault 会调用 shm_file_data 的 vm_ops 的 shmem_fault。
12. 在 page cache 中找一个空闲页，或者创建一个空闲页。
![image](https://user-images.githubusercontent.com/12036324/66893911-b606d980-f021-11e9-9884-8c4c586c3c9d.png)


## 问题
