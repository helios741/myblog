[信号（下）：项目组A完成了，如何及时通知项目组B](https://time.geekbang.org/column/article/102893)

信号处理常见流程分为两步：
1. 注册信号处理函数
2. 发送信号和处理信号

## 发送信号

### 信号的产生

软硬件都能产生中断：
1. 软件：*Ctrl + C*产生*GIGINT*信号，*Ctrl + Z*产生*SIGTSTP*信号
2. 硬件：除0操作CPU会产生异常，然后把SIGFPE信号发送给进程，非法内存访问，内存管理模块会产生异常，发送把信号*SIGSEGV*发送给进程

### 硬件的信号和中断区别

1. 处理函数
    + 中断：注册中断处理函数，是在内核中
    + 信号：注册信号处理函数，在用户态
2. 对于硬件触发的，无论是中断，还是信号，肯定是先到内核的，然后内核对于中断和信号处理方式不同：
    + 中断：在内核中完全处理完毕
    + 信号：将信号的放在对应的进程的task_struct里面，然后等待进程在用户态去处理
3. 影响程度：
    + 信号：影响的是进程，处理慢了甚至错了，大不了把进程干掉就行了
    + 中断：影响整个系统，中断挂了，可能Linux就挂掉了

### 发送信号过程
有时候，内核在某些情况下，也会给进程发送信号。例如，向读端已关闭的管道写数据时产生 SIGPIPE 信号，当子进程退出时，我们要给父进程发送 SIG_CHLD 信号等。


最直接的发送信号的方法就是，通过命令 kill 来发送信号了。例如，我们都知道的 kill -9 pid 可以发送信号给一个进程，杀死它。


我们可以通过*kill*和*sigqueue*系统调用，发送信号给某个进程，也可以通过*tkill*或者*tgkill*发送信号给某个线程。但是这些最后都会调用*do_send_sig_info*函数，将信号放在*task_struct*结构里面。

- kill->kill_something_info->kill_pid_info->group_send_sig_info->do_send_sig_info
- tkill->do_tkill->do_send_specific->do_send_sig_info
- tgkill->do_tkill->do_send_specific->do_send_sig_info
- rt_sigqueueinfo->do_rt_sigqueueinfo->kill_proc_info->kill_pid_info->group_send_sig_info->do_send_sig_info


*do_send_sig_info*调用*send_signal*，最后调用*__send_signal*
```c
SYSCALL_DEFINE2(kill, pid_t, pid, int, sig)
{
	struct siginfo info;

	info.si_signo = sig;
	info.si_errno = 0;
	info.si_code = SI_USER;
	info.si_pid = task_tgid_vnr(current);
	info.si_uid = from_kuid_munged(current_user_ns(), current_uid());

	return kill_something_info(sig, &info, pid);
}


static int __send_signal(int sig, struct siginfo *info, struct task_struct *t,
			int group, int from_ancestor_ns)
{
	struct sigpending *pending;
	struct sigqueue *q;
	int override_rlimit;
	int ret = 0, result;
......
	pending = group ? &t->signal->shared_pending : &t->pending;
......
	if (legacy_queue(pending, sig))
		goto ret;

	if (sig < SIGRTMIN)
		override_rlimit = (is_si_special(info) || info->si_code >= 0);
	else
		override_rlimit = 0;

	q = __sigqueue_alloc(sig, t, GFP_ATOMIC | __GFP_NOTRACK_FALSE_POSITIVE,
		override_rlimit);
	if (q) {
		list_add_tail(&q->list, &pending->list);
		switch ((unsigned long) info) {
		case (unsigned long) SEND_SIG_NOINFO:
			q->info.si_signo = sig;
			q->info.si_errno = 0;
			q->info.si_code = SI_USER;
			q->info.si_pid = task_tgid_nr_ns(current,
							task_active_pid_ns(t));
			q->info.si_uid = from_kuid_munged(current_user_ns(), current_uid());
			break;
		case (unsigned long) SEND_SIG_PRIV:
			q->info.si_signo = sig;
			q->info.si_errno = 0;
			q->info.si_code = SI_KERNEL;
			q->info.si_pid = 0;
			q->info.si_uid = 0;
			break;
		default:
			copy_siginfo(&q->info, info);
			if (from_ancestor_ns)
				q->info.si_pid = 0;
			break;
		}

		userns_fixup_signal_uid(&q->info, t);

	}
......
out_set:
	signalfd_notify(t, sig);
	sigaddset(&pending->signal, sig);
	complete_signal(sig, t, group);
ret:
	return ret;
}
```

*sigpending*就是以前在task_struct里面关于信号量的变量。

*pending = group ? &t->signal->shared_pending : &t->pending;*主要是这一行，分为两种情况：
- kill发送的： 给整个进程的，shared_pending一看就是整个进程共享的信号
- tkill发送的：给某个线程的，pending这是这个线程的task_struct独享的

struct sigpending 里面有两个成员，一个是一个集合 sigset_t，表示都收到了哪些信号，还有一个链表，也表示收到了哪些信号。它的结构如下：

```c
struct sigpending {
	struct list_head list;
	sigset_t signal;
};
```
如果都表示收到了信号，这两者有什么区别呢？我们接着往下看 __send_signal 里面的代码。接下来，我们要调用 legacy_queue。如果满足条件，那就直接退出。那 legacy_queue 里面判断的是什么条件呢？我们来看它的代码。

```c
static inline int legacy_queue(struct sigpending *signals, int sig)
{
	return (sig < SIGRTMIN) && sigismember(&signals->signal, sig);
}


#define SIGRTMIN	32
#define SIGRTMAX	_NSIG
#define _NSIG		64
```
- sigset_t signal: 是为不可靠信号准备（小于32的）。不可靠信号就是，同时只能处理一个信号，比如有五个SIGUSR1的信号同时来，处理第一个同时（还在集合中），就不处理后续的了，等处理完了之后会将标识位清除，下面的SIGUSR1就能进来了，有点类似于锁
- list_head list：可靠信号。__sigqueue_alloc 会分配一个 struct sigqueue 对象，然后通过 list_add_tail 挂在 struct sigpending 里面的链表上。这样就靠谱多了是不是？如果发送过来 100 个信号，变成链表上的 100 项，都不会丢，哪怕相同的信号发送多遍，也处理多遍


当信号挂到task_struct上面之后，我们最后要调用*complete_signal*。就是既然进程信号有了，快找个线程跑起来吧。

```c
static void complete_signal(int sig, struct task_struct *p, int group)
{
	struct signal_struct *signal = p->signal;
	struct task_struct *t;

	/*
	 * Now find a thread we can wake up to take the signal off the queue.
	 *
	 * If the main thread wants the signal, it gets first crack.
	 * Probably the least surprising to the average bear.
	 */
	if (wants_signal(sig, p))
		t = p;
	else if (!group || thread_group_empty(p))
		/*
		 * There is just one thread and it does not need to be woken.
		 * It will dequeue unblocked signals before it runs again.
		 */
		return;
	else {
		/*
		 * Otherwise try to find a suitable thread.
		 */
		t = signal->curr_target;
		while (!wants_signal(sig, t)) {
			t = next_thread(t);
			if (t == signal->curr_target)
				return;
		}
		signal->curr_target = t;
	}
......
	/*
	 * The signal is already in the shared-pending queue.
	 * Tell the chosen thread to wake up and dequeue it.
	 */
	signal_wake_up(t, sig == SIGKILL);
	return;
}
```
在找到了一个进程或者线程的 task_struct 之后，我们要调用 signal_wake_up，来企图唤醒它，signal_wake_up 会调用 signal_wake_up_state。
```c
void signal_wake_up_state(struct task_struct *t, unsigned int state)
{
	set_tsk_thread_flag(t, TIF_SIGPENDING);


	if (!wake_up_state(t, state | TASK_INTERRUPTIBLE))
		kick_process(t);
}
```
*signal_wake_up_state*主要做两件事：
1. 给这个线程设置TIF_SIGPENDING，类似与进程调度的时候，也不是立马执行，而是设置*TIF_NEED_SRESCHED*
2. 尝试唤醒这个线程，*wake_up_state*会调用*try_to_wake_up*，这个函数将进程或者线程设置为*TASK_RUNNING*，然后放在运行队列里面。
    + 如果wake_up_state函数返回0，说明线程已经是TASK_RUNNING状态，如果他在另外一个CPU上运行，调用kick_process发送一个处理器间中断，强制那个进程或者线程重新调度，调度完毕后，返回用户态运行。这个时候是检查*TIF_SIGPENDING*的好时候


## 信号的处理
上面已经介绍了信号的发送，接下来就是真正的信号处理了。


以前在讲[调度](https://github.com/helios741/myblog/tree/new/learn_go/learn_kernel/20190919_cpu_schedule_after)的时候说过，无论是从系统调用还是中断返回的时候，都会调用*exit_to_usermode_loop*,只不过我们上次主要关注了 _TIF_NEED_RESCHED这个标识位，这次我们重点关注_TIF_SIGPENDING标识位。

```c
static void exit_to_usermode_loop(struct pt_regs *regs, u32 cached_flags)
{
	while (true) {
......
		if (cached_flags & _TIF_NEED_RESCHED)
			schedule();
......
		/* deal with pending signal delivery */
		if (cached_flags & _TIF_SIGPENDING)
			do_signal(regs);
......
		if (!(cached_flags & EXIT_TO_USERMODE_LOOP_FLAGS))
			break;
	}
}
```

如果在前一个环节中，已经设置了 _TIF_SIGPENDING，我们就调用 do_signal 进行处理。
```c
void do_signal(struct pt_regs *regs)
{
	struct ksignal ksig;

	if (get_signal(&ksig)) {
		/* Whee! Actually deliver the signal.  */
		handle_signal(&ksig, regs);
		return;
	}

	/* Did we come from a system call? */
	if (syscall_get_nr(current, regs) >= 0) {
		/* Restart the system call - no handlers present */
		switch (syscall_get_error(current, regs)) {
		case -ERESTARTNOHAND:
		case -ERESTARTSYS:
		case -ERESTARTNOINTR:
			regs->ax = regs->orig_ax;
			regs->ip -= 2;
			break;

		case -ERESTART_RESTARTBLOCK:
			regs->ax = get_nr_restart_syscall(regs);
			regs->ip -= 2;
			break;
		}
	}
	restore_saved_sigmask();
}
```
*do_signal*会调用*handle_signal*，信号处理就是调用用户提供的信号处理函数，但是这个信号处理函数在用户态，我们现在在内核态。

咱们又要来回忆系统调用的过程了。这个进程当时在用户态执行到某一行 Line A，调用了一个系统调用，在进入内核的那一刻，在内核 pt_regs 里面保存了用户态执行到了 Line A。现在我们从系统调用返回用户态了，按说应该从 pt_regs 拿出 Line A，然后接着 Line A 执行下去，但是为了响应信号，我们不能回到用户态的时候返回 Line A 了，而是应该返回**信号处理函数的起始地址**。


```c
static void
handle_signal(struct ksignal *ksig, struct pt_regs *regs)
{
	bool stepping, failed;
......
	/* Are we from a system call? */
	if (syscall_get_nr(current, regs) >= 0) {
		/* If so, check system call restarting.. */
		switch (syscall_get_error(current, regs)) {
		case -ERESTART_RESTARTBLOCK:
		case -ERESTARTNOHAND:
			regs->ax = -EINTR;
			break;
		case -ERESTARTSYS:
			if (!(ksig->ka.sa.sa_flags & SA_RESTART)) {
				regs->ax = -EINTR;
				break;
			}
		/* fallthrough */
		case -ERESTARTNOINTR:
			regs->ax = regs->orig_ax;
			regs->ip -= 2;
			break;
		}
	}
......
	failed = (setup_rt_frame(ksig, regs) < 0);
......
	signal_setup_done(failed, ksig, stepping);
}
```
我们就要通过干预*pt_regs*了，要分为两种情况：
- 从系统调用中正常返回
- 非运行状态的的系统调用被信号中断返回


我们这里解析一个最复杂的场景。还记得咱们解析进程调度的时候，我们举的一个例子，就是从一个 tap 网卡中读取数据。当时我们主要关注 schedule 那一行，也即如果当发现没有数据的时候，就调用 schedule，自己进入等待状态，然后将 CPU 让给其他进程。具体的代码如下：
```c
static ssize_t tap_do_read(struct tap_queue *q,
			   struct iov_iter *to,
			   int noblock, struct sk_buff *skb)
{
......
	while (1) {
		if (!noblock)
			prepare_to_wait(sk_sleep(&q->sk), &wait,
					TASK_INTERRUPTIBLE);

		/* Read frames from the queue */
		skb = skb_array_consume(&q->skb_array);
		if (skb)
			break;
		if (noblock) {
			ret = -EAGAIN;
			break;
		}
		if (signal_pending(current)) {
			ret = -ERESTARTSYS;
			break;
		}
		/* Nothing to read, let's sleep */
		schedule();
	}
......
}
```
1. 把进程或者线程的状态设置为TASK_INTERRUPTIBLE，这才能让这个系统调用可以被中断
2. 可被中断的系统调用一般是比较慢，会因为等待数据让出CPU。SO
    + 发送信号的时候，除了设置task_struct的 _TIF_SIGPENDING 标识位之外，还试图唤醒线程或者进程，就是将它从等待状态中设置为 TASK_RUNNING
    + 进程被唤醒时，因为是通过信号唤醒的，大概率读不到数据
    + 在*signal_pending*函数中，检测到_TIF_SIGPENDING标识位，说明系统调用还没做完，于是返回ERESTARTSYS，带着这个错误从系统调用中返回
3.  exit_to_usermode_loop->do_signal->handle_signal。在这里面，当发现出现错误 ERESTARTSYS 的时候，我们就知道这是从一个没有调用完的系统调用返回的，设置系统调用错误码 EINTR。
4. 最后，开始折腾pt_regs：

调用 setup_rt_frame->__setup_rt_frame。
```c
static int __setup_rt_frame(int sig, struct ksignal *ksig,
			    sigset_t *set, struct pt_regs *regs)
{
	struct rt_sigframe __user *frame;
	void __user *fp = NULL;
	int err = 0;

	frame = get_sigframe(&ksig->ka, regs, sizeof(struct rt_sigframe), &fp);
......
	put_user_try {
......
		/* Set up to return from userspace.  If provided, use a stub
		   already in userspace.  */
		/* x86-64 should always use SA_RESTORER. */
		if (ksig->ka.sa.sa_flags & SA_RESTORER) {
			put_user_ex(ksig->ka.sa.sa_restorer, &frame->pretcode);
		}
	} put_user_catch(err);

	err |= setup_sigcontext(&frame->uc.uc_mcontext, fp, regs, set->sig[0]);
	err |= __copy_to_user(&frame->uc.uc_sigmask, set, sizeof(*set));

	/* Set up registers for signal handler */
	regs->di = sig;
	/* In case the signal handler was declared without prototypes */
	regs->ax = 0;

	regs->si = (unsigned long)&frame->info;
	regs->dx = (unsigned long)&frame->uc;
	regs->ip = (unsigned long) ksig->ka.sa.sa_handler;

	regs->sp = (unsigned long)frame;
	regs->cs = __USER_CS;
......
	return 0;
}
```
1. *get_sigframe*函数的作用：
    - 得到pt_regs的sp变量
    - 将sp减去sizeof(struct rt_sigframe)，也就是把这个栈帧塞到了栈里面
2. 在*__setup_rt_frame*中把*regs->sp*设置为frame这就相当于在原来的用户态的栈强行插了一个帧
3. 将*regs->ip*设置为用户定义的sa_handler，这就意味着以前接着原来的代码执行的，现在不了，要执行 sa_handler 了那执行完了以后呢？按照函数栈的规则，弹出上一个栈帧来，也就是弹出了 frame。
4. *setup_sigcontext*函数，将原来的*pt_regs*保存在了frame里面的uc_mcontext
5. *put_user_ex*将*sa_restorer*放在*frame->pretcode*里面。当 sa_handler 执行完之后，弹出的函数栈是 frame，也就应该跳到 sa_restorer 的地址。这是什么地址呢？

咱们在 sigaction 介绍的时候就没有介绍它，在 Glibc 的 __libc_sigaction 函数中也没有注意到，它被赋值成了 restore_rt。这其实就是 sa_handler 执行完毕之后，马上要执行的函数。从名字我们就能感觉到，它将恢复原来程序运行的地方。

在 Glibc 中，我们可以找到它的定义，它竟然调用了一个系统调用，系统调用号为 __NR_rt_sigreturn。

```c
RESTORE (restore_rt, __NR_rt_sigreturn)

#define RESTORE(name, syscall) RESTORE2 (name, syscall)
# define RESTORE2(name, syscall) \
asm                                     \
  (                                     \
   ".LSTART_" #name ":\n"               \
   "    .type __" #name ",@function\n"  \
   "__" #name ":\n"                     \
   "    movq $" #syscall ", %rax\n"     \
   "    syscall\n"                      \
......
```
我们可以在内核里面找到 __NR_rt_sigreturn 对应的系统调用。
```c
asmlinkage long sys_rt_sigreturn(void)
{
	struct pt_regs *regs = current_pt_regs();
	struct rt_sigframe __user *frame;
	sigset_t set;
	unsigned long uc_flags;

	frame = (struct rt_sigframe __user *)(regs->sp - sizeof(long));
	if (__copy_from_user(&set, &frame->uc.uc_sigmask, sizeof(set)))
		goto badframe;
	if (__get_user(uc_flags, &frame->uc.uc_flags))
		goto badframe;

	set_current_blocked(&set);

	if (restore_sigcontext(regs, &frame->uc.uc_mcontext, uc_flags))
		goto badframe;
......
	return regs->ax;
......
}
```
在这里面，我们把上次填充的那个 rt_sigframe 拿出来，然后 restore_sigcontext 将 pt_regs 恢复成为原来用户态的样子。从这个系统调用返回的时候，应用还误以为从上次的系统调用返回的呢。

至此，整个信号处理过程才全部结束。

## 总结

![image](https://user-images.githubusercontent.com/12036324/66715318-9f2f6f80-edf4-11e9-952f-56ed0f331d86.png)

1. 假设我们有一个进程 A，main 函数里面调用系统调用进入内核。
2. 按照系统调用的原理，会将用户态栈的信息保存在 pt_regs 里面，也即记住原来用户态是运行到了 line A 的地方。
3. 在内核中执行系统调用读取数据。
4. 当发现没有什么数据可读取的时候，只好进入睡眠状态，并且调用 schedule 让出 CPU，这是进程调度第一定律。
5. 将进程状态设置为 TASK_INTERRUPTIBLE，可中断的睡眠状态，也即如果有信号来的话，是可以唤醒它的。
6. 其他的进程或者 shell 发送一个信号，有四个函数可以调用 kill、tkill、tgkill、rt_sigqueueinfo。
7. 四个发送信号的函数，在内核中最终都是调用 do_send_sig_info。
8. do_send_sig_info 调用 send_signal 给进程 A 发送一个信号，其实就是找到进程 A 的 task_struct，或者加入信号集合，为不可靠信号，或者加入信号链表，为可靠信号。
9. do_send_sig_info 调用 signal_wake_up 唤醒进程 A。
10. 进程 A 重新进入运行状态 TASK_RUNNING，根据进程调度第一定律，一定会接着 schedule 运行。
11. 进程 A 被唤醒后，检查是否有信号到来，如果没有，重新循环到一开始，尝试再次读取数据，如果还是没有数据，再次进入 TASK_INTERRUPTIBLE，即可中断的睡眠状态。
12. 当发现有信号到来的时候，就返回当前正在执行的系统调用，并返回一个错误表示系统调用被中断了。
13. 系统调用返回的时候，会调用 exit_to_usermode_loop。这是一个处理信号的时机。
14. 调用 do_signal 开始处理信号。
15. 根据信号，得到信号处理函数 sa_handler，然后修改 pt_regs 中的用户态栈的信息，让 pt_regs 指向 sa_handler。同时修改用户态的栈，插入一个栈帧 sa_restorer，里面保存了原来的指向 line A 的 pt_regs，并且设置让 sa_handler 运行完毕后，跳到 sa_restorer 运行。
16. 返回用户态，由于 pt_regs 已经设置为 sa_handler，则返回用户态执行 sa_handler。
17. sa_handler 执行完毕后，信号处理函数就执行完了，接着根据第 15 步对于用户态栈帧的修改，会跳到 sa_restorer 运行。
18. sa_restorer 会调用系统调用 rt_sigreturn 再次进入内核。
19. 在内核中，rt_sigreturn 恢复原来的 pt_regs，重新指向 line A。
20. 从 rt_sigreturn 返回用户态，还是调用 exit_to_usermode_loop。
21. 这次因为 pt_regs 已经指向 line A 了，于是就到了进程 A 中，接着系统调用之后运行，当然这个系统调用返回的是它被中断了，没有执行完的错误。

## 问题
在 Linux 内核里面，很多地方都存在信号和信号处理，所以 signal_pending 这个函数也随处可见，这样我们就能判断是否有信号发生。请你在内核代码中找到 signal_pending 出现的一些地方，看有什么规律，我们后面的章节会经常遇到它。
