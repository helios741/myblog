[IPC（下）：不同项目组之间抢资源，如何协调？](https://time.geekbang.org/column/article/104273)

## 信号量创建
创建信号量调用的是*semget*:
```c
SYSCALL_DEFINE3(semget, key_t, key, int, nsems, int, semflg)
{
	struct ipc_namespace *ns;
	static const struct ipc_ops sem_ops = {
		.getnew = newary,
		.associate = sem_security,
		.more_checks = sem_more_checks,
	};
	struct ipc_params sem_params;
	ns = current->nsproxy->ipc_ns;
	sem_params.key = key;
	sem_params.flg = semflg;
	sem_params.u.nsems = nsems;
	return ipcget(ns, &sem_ids(ns), &sem_ops, &sem_params);
}
```
三个参数分别为：
- sem_ids： 信号想对应的sem_ids
- sem_ops：对应的操作
- sem_params：对应的操作


ipcget中的*sem_params.key*设置为*IPC_PRIVATE*则永远创建新的，如果不是就会调用`ipcget_public`.
在`ipcget_public`中，我们按照key，去查找*struct kern_ipc_perm*，如果没有找到那就看是否设置了*IPC_CREAT*，如果设置了就创建个新的。如果找到了就返回对应的id。


按照参数*sem_ops*，创建新的信号量会调用*newary*：
```c
static int newary(struct ipc_namespace *ns, struct ipc_params *params)
{
	int retval;
	struct sem_array *sma;
	key_t key = params->key;
	int nsems = params->u.nsems;
	int semflg = params->flg;
	int i;
......
	sma = sem_alloc(nsems);
......
	sma->sem_perm.mode = (semflg & S_IRWXUGO);
	sma->sem_perm.key = key;
	sma->sem_perm.security = NULL;
......
	for (i = 0; i < nsems; i++) {
		INIT_LIST_HEAD(&sma->sems[i].pending_alter);
		INIT_LIST_HEAD(&sma->sems[i].pending_const);
		spin_lock_init(&sma->sems[i].lock);
	}
	sma->complex_count = 0;
	sma->use_global_lock = USE_GLOBAL_LOCK_HYSTERESIS;
	INIT_LIST_HEAD(&sma->pending_alter);
	INIT_LIST_HEAD(&sma->pending_const);
	INIT_LIST_HEAD(&sma->list_id);
	sma->sem_nsems = nsems;
	sma->sem_ctime = get_seconds();
	retval = ipc_addid(&sem_ids(ns), &sma->sem_perm, ns->sc_semmni);
......
	ns->used_sems += nsems;
......
	return sma->sem_perm.id;
}
```
1. 通过*kvmalloc*在直接映射区分配一个*struct sem_array*。这个结构用来描述信号，就是*struct kern_ipc_perm*，接下来就是填充*struct sem_array*这个结构，比如key，权限等。


*struct sem_array*里面有很多信号量，放在*struct sem sems[]*，在*struct sem*里面有当前的信号量的数值*semval*：
```c
struct sem {
	int	semval;		/* current value */
	/*
	 * PID of the process that last modified the semaphore. For
	 * Linux, specifically these are:
	 *  - semop
	 *  - semctl, via SETVAL and SETALL.
	 *  - at task exit when performing undo adjustments (see exit_sem).
	 */
	int	sempid;
	spinlock_t	lock;	/* spinlock for fine-grained semtimedop */
	struct list_head pending_alter; /* pending single-sop operations that alter the semaphore */
	struct list_head pending_const; /* pending single-sop operations that do not alter the semaphore*/
	time_t	sem_otime;	/* candidate for sem_otime */
} ____cacheline_aligned_in_smp;
```
struct list_head pending_alter: 在*sem_array*和*sem*各有一个链表*struct list_head pending_alter*分别表示对于整个信号量数组的修改和对于某个信号量的修改

2. 初始化这些链表
3. 通过*ipc_addid*将新创建的*struct sem_array*结构挂到*sem_ids*里面的基数树上，并返回对应的id



## 信号量初始化

通过semctl对信号量数组初始化：
```c
SYSCALL_DEFINE4(semctl, int, semid, int, semnum, int, cmd, unsigned long, arg)
{
	int version;
	struct ipc_namespace *ns;
	void __user *p = (void __user *)arg;
	ns = current->nsproxy->ipc_ns;
	switch (cmd) {
	case IPC_INFO:
	case SEM_INFO:
	case IPC_STAT:
	case SEM_STAT:
		return semctl_nolock(ns, semid, cmd, version, p);
	case GETALL:
	case GETVAL:
	case GETPID:
	case GETNCNT:
	case GETZCNT:
	case SETALL:
		return semctl_main(ns, semid, semnum, cmd, p);
	case SETVAL:
		return semctl_setval(ns, semid, semnum, arg);
	case IPC_RMID:
	case IPC_SET:
		return semctl_down(ns, semid, cmd, version, p);
	default:
		return -EINVAL;
	}
}
```
- SETALL操作调用的是semctl_main
- SETVAL操作调用的是semctl_setval

对于SETALL操作，传进来的操作参数为*union semun*里面的*unsigned short *array*会设置整个信号量的集合：
```c
static int semctl_main(struct ipc_namespace *ns, int semid, int semnum,
		int cmd, void __user *p)
{
	struct sem_array *sma;
	struct sem *curr;
	int err, nsems;
	ushort fast_sem_io[SEMMSL_FAST];
	ushort *sem_io = fast_sem_io;
	DEFINE_WAKE_Q(wake_q);
	sma = sem_obtain_object_check(ns, semid);
	nsems = sma->sem_nsems;
......
	switch (cmd) {
......
	case SETALL:
	{
		int i;
		struct sem_undo *un;
......
		if (copy_from_user(sem_io, p, nsems*sizeof(ushort))) {
......
		}
......
		for (i = 0; i < nsems; i++) {
			sma->sems[i].semval = sem_io[i];
			sma->sems[i].sempid = task_tgid_vnr(current);
		}
......
		sma->sem_ctime = get_seconds();
		/* maybe some queued-up processes were waiting for this */
		do_smart_update(sma, NULL, 0, 0, &wake_q);
		err = 0;
		goto out_unlock;
	}
	}
......
    wake_up_q(&wake_q);
......
}
```
- 先通过sem_obtain_object_check，根据信号量几个的id在基数树里面找到*struct sem_array*对象
    + 发现如果是SETALL：就将用户的参数的*unsigned short *array*通过copy_from_user拷贝带内核里面的*sem_io*数组中
    + 循环将信号量集合中的每个信号设置semval，以及修改这个信号量值的pid

对于SETVAL操作来讲，传进来的参数*union semun*里面的*int val*仅仅会设置某个信号量
```c
static int semctl_setval(struct ipc_namespace *ns, int semid, int semnum,
		unsigned long arg)
{
	struct sem_undo *un;
	struct sem_array *sma;
	struct sem *curr;
	int err, val;
	DEFINE_WAKE_Q(wake_q);
......
	sma = sem_obtain_object_check(ns, semid);
......
	curr = &sma->sems[semnum];
......
	curr->semval = val;
	curr->sempid = task_tgid_vnr(current);
	sma->sem_ctime = get_seconds();
	/* maybe some queued-up processes were waiting for this */
	do_smart_update(sma, NULL, 0, 0, &wake_q);
......
	wake_up_q(&wake_q);
	return 0;
}
```
- 通过sem_obtain_object_check，根据信号量id在基数树中找到*struct sem_array*对象，对于SETVAL操作，直接根据参数中的val设置semval，以及修改这个信号量的pid。

## P/V操作
P/V操作都是调用的semop。
```c
SYSCALL_DEFINE3(semop, int, semid, struct sembuf __user *, tsops,
		unsigned, nsops)
{
	return sys_semtimedop(semid, tsops, nsops, NULL);
}

SYSCALL_DEFINE4(semtimedop, int, semid, struct sembuf __user *, tsops,
		unsigned, nsops, const struct timespec __user *, timeout)
{
	int error = -EINVAL;
	struct sem_array *sma;
	struct sembuf fast_sops[SEMOPM_FAST];
	struct sembuf *sops = fast_sops, *sop;
	struct sem_undo *un;
	int max, locknum;
	bool undos = false, alter = false, dupsop = false;
	struct sem_queue queue;
	unsigned long dup = 0, jiffies_left = 0;
	struct ipc_namespace *ns;

	ns = current->nsproxy->ipc_ns;
......
	if (copy_from_user(sops, tsops, nsops * sizeof(*tsops))) {
		error =  -EFAULT;
		goto out_free;
	}

	if (timeout) {
		struct timespec _timeout;
		if (copy_from_user(&_timeout, timeout, sizeof(*timeout))) {
		}
		jiffies_left = timespec_to_jiffies(&_timeout);
	}
......
	/* On success, find_alloc_undo takes the rcu_read_lock */
	un = find_alloc_undo(ns, semid);
......
	sma = sem_obtain_object_check(ns, semid);
......
	queue.sops = sops;
	queue.nsops = nsops;
	queue.undo = un;
	queue.pid = task_tgid_vnr(current);
	queue.alter = alter;
	queue.dupsop = dupsop;

	error = perform_atomic_semop(sma, &queue);
	if (error == 0) { /* non-blocking succesfull path */
		DEFINE_WAKE_Q(wake_q);
......
		do_smart_update(sma, sops, nsops, 1, &wake_q);
......
		wake_up_q(&wake_q);
		goto out_free;
	}
	/*
	 * We need to sleep on this operation, so we put the current
	 * task into the pending queue and go to sleep.
	 */
	if (nsops == 1) {
		struct sem *curr;
		curr = &sma->sems[sops->sem_num];
......
		list_add_tail(&queue.list,
						&curr->pending_alter);
......
	} else {
......
		list_add_tail(&queue.list, &sma->pending_alter);
......
	}

	do {
		queue.status = -EINTR;
		queue.sleeper = current;

		__set_current_state(TASK_INTERRUPTIBLE);
		if (timeout)
			jiffies_left = schedule_timeout(jiffies_left);
		else
			schedule();
......
		/*
		 * If an interrupt occurred we have to clean up the queue.
		 */
		if (timeout && jiffies_left == 0)
			error = -EAGAIN;
	} while (error == -EINTR && !signal_pending(current)); /* spurious */
......
}
```
semop调用semtimedop。
semtimedop做的事情如下：
1. 将用户的参数（比如struct sembuf），通过调用*copy_from_user*拷贝到内核中来
2. 通过sem_obtain_object_check得到*struct sem_array*
    + 创建*struct sem_queue*表示当前信号量的操作
    + 调用perform_atomic_semop在实施信号量操作
```c
static int perform_atomic_semop(struct sem_array *sma, struct sem_queue *q)
{
	int result, sem_op, nsops;
	struct sembuf *sop;
	struct sem *curr;
	struct sembuf *sops;
	struct sem_undo *un;

	sops = q->sops;
	nsops = q->nsops;
	un = q->undo;

	for (sop = sops; sop < sops + nsops; sop++) {
		curr = &sma->sems[sop->sem_num];
		sem_op = sop->sem_op;
		result = curr->semval;
......
		result += sem_op;
		if (result < 0)
			goto would_block;
......
		if (sop->sem_flg & SEM_UNDO) {
			int undo = un->semadj[sop->sem_num] - sem_op;
.....
		}
	}

	for (sop = sops; sop < sops + nsops; sop++) {
		curr = &sma->sems[sop->sem_num];
		sem_op = sop->sem_op;
		result = curr->semval;

		if (sop->sem_flg & SEM_UNDO) {
			int undo = un->semadj[sop->sem_num] - sem_op;
			un->semadj[sop->sem_num] = undo;
		}
		curr->semval += sem_op;
		curr->sempid = q->pid;
	}
	return 0;
would_block:
	q->blocking = sop;
	return sop->sem_flg & IPC_NOWAIT ? -EAGAIN : 1;
}
```
对于所有信号量都有循环两次：
+ 第一次，如果发现计算出的result < 0就跳转到would_block，设置q->blocking = sop表示这个queue是block在这个操作上，如果需要等待就返回1
+ 第二次，如果第一次循环无需等待，则第二个循环实施所有的信号量操作，即将信号量的值设置为新的值，并且返回0
3. 对于需要等待的情况
- 对于一个信号量：将queue挂到这个信号量的pending_alter
- 对于整个信号量集合：将queue挂到整个信号量集合的pending_alter

接下来开始do-while循环：
- 如果等待没有时间限制，调用sechedule让出CPU
- 如果有时间限制，则调用schedule_timeout让出CPU，过一段时间再回来
- 当回来的时候判断
    + 没有超时：进入下一轮循环
    + 超时：退出循环，返回错误
- 让出CPU的时候，设置进程的状态为*TASK_INTERUPTIBLE*，循环结束后通过*singal_pending*查看是否收到过信号，这说明这个等待信号量的进程是可以被中断的，即一个等待信号量的进程是可以被kill杀掉的
4. 如果不需要等待

如果不需要等待则说明对于信号量的操作完成了。

## 总结

## 问题



