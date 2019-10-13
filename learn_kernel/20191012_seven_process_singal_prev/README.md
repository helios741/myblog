[信号（上）：项目组A完成了，如何及时通知项目组B？](https://time.geekbang.org/column/article/102281)

信号的机制就是在一些特殊情况下发送给某个进程的。

通过`kill -l`查看linux支持多少个信号：
```shell
# kill -l
 1) SIGHUP       2) SIGINT       3) SIGQUIT      4) SIGILL       5) SIGTRAP
 6) SIGABRT      7) SIGBUS       8) SIGFPE       9) SIGKILL     10) SIGUSR1
11) SIGSEGV     12) SIGUSR2     13) SIGPIPE     14) SIGALRM     15) SIGTERM
16) SIGSTKFLT   17) SIGCHLD     18) SIGCONT     19) SIGSTOP     20) SIGTSTP
21) SIGTTIN     22) SIGTTOU     23) SIGURG      24) SIGXCPU     25) SIGXFSZ
26) SIGVTALRM   27) SIGPROF     28) SIGWINCH    29) SIGIO       30) SIGPWR
31) SIGSYS      34) SIGRTMIN    35) SIGRTMIN+1  36) SIGRTMIN+2  37) SIGRTMIN+3
38) SIGRTMIN+4  39) SIGRTMIN+5  40) SIGRTMIN+6  41) SIGRTMIN+7  42) SIGRTMIN+8
43) SIGRTMIN+9  44) SIGRTMIN+10 45) SIGRTMIN+11 46) SIGRTMIN+12 47) SIGRTMIN+13
48) SIGRTMIN+14 49) SIGRTMIN+15 50) SIGRTMAX-14 51) SIGRTMAX-13 52) SIGRTMAX-12
53) SIGRTMAX-11 54) SIGRTMAX-10 55) SIGRTMAX-9  56) SIGRTMAX-8  57) SIGRTMAX-7
58) SIGRTMAX-6  59) SIGRTMAX-5  60) SIGRTMAX-4  61) SIGRTMAX-3  62) SIGRTMAX-2
63) SIGRTMAX-1  64) SIGRTMAX
```
这些信号的作用，可以通过*man 7 signal*命令查看，里面会有一个列表：
```shell
Signal     Value     Action   Comment
──────────────────────────────────────────────────────────────────────
SIGHUP        1       Term    Hangup detected on controlling terminal
                              or death of controlling process
SIGINT        2       Term    Interrupt from keyboard
SIGQUIT       3       Core    Quit from keyboard
SIGILL        4       Core    Illegal Instruction


SIGABRT       6       Core    Abort signal from abort(3)
SIGFPE        8       Core    Floating point exception
SIGKILL       9       Term    Kill signal
SIGSEGV      11       Core    Invalid memory reference
SIGPIPE      13       Term    Broken pipe: write to pipe with no
                              readers
SIGALRM      14       Term    Timer signal from alarm(2)
SIGTERM      15       Term    Termination signal
SIGUSR1   30,10,16    Term    User-defined signal 1
SIGUSR2   31,12,17    Term    User-defined signal 2
……
```
每个信号都有唯一的ID，还有遇到这种信号的默认操作。


一旦有信号产生，我们就有下面这几种用户进程对信号的处理方式：
1. 执行默认操作：linux对每种信号都规定了默认操作
    + Term：终止进程
    + Core：Core Dump，也即终止进程后，通过Core Dump将当前进程的运行状态保存在文件里面，方便后续排查
2. 捕捉信号：可以为信号定义一个信号处理函数。当信号发生时，执行相应的信号处理函数
3. 忽略信号：当我们不希望处理某些信号的时候，就可以忽略该信号，不做任何处理。*SIGKILL*和*SEGSTOP*无法被忽略，他们用于在任何时候中断和结束某个进程。


信号处理分为两步：
1. 注册信号处理函数
2. 发送信号

## 如何注册一个信号处理函数

如果我们不想让某个信号执行默认操作，可以对特定的信号注册相应的信号处理函数，设置信号处理方式的是*signal函数*
```c
typedef void (*sighandler_t)(int);
sighandler_t signal(int signum, sighandler_t handler);
```
就是当某个进程遇到这个信号的时候执行这个方法。


还有一个更加推荐的方法*sigaction*：
```c
int sigaction(int signum, const struct sigaction *act,
                     struct sigaction *oldact);
```
*sigaction*也是将信号和一个动作进行关联，只不过这个动作由一个结构体*struct sigaction*表示：
```c
struct sigaction {
	__sighandler_t sa_handler;
	unsigned long sa_flags;
	__sigrestore_t sa_restorer;
	sigset_t sa_mask;		/* mask last for extensibility */
};
```
和 signal 类似的是，这里面还是有 __sighandler_t。但是，其他成员变量可以让你更加细致地控制信号处理的行为。而 signal 函数没有给你机会设置这些。这里需要注意的是，signal 不是系统调用，而是 glibc 封装的一个函数。这样就像 man signal 里面写的一样，不同的实现方式，设置的参数会不同，会导致行为的不同。


在glibc里面会有这样一个实现：
```c
#  define signal __sysv_signal
__sighandler_t
__sysv_signal (int sig, __sighandler_t handler)
{
  struct sigaction act, oact;
......
  act.sa_handler = handler;
  __sigemptyset (&act.sa_mask);
  act.sa_flags = SA_ONESHOT | SA_NOMASK | SA_INTERRUPT;
  act.sa_flags &= ~SA_RESTART;
  if (__sigaction (sig, &act, &oact) < 0)
    return SIG_ERR;
  return oact.sa_handler;
}
weak_alias (__sysv_signal, sysv_signal)
```
- sa_flags:
    + SA_ONESHOT: 就用一次，完了就设置回默认设置
    + SA_NOMASK: 通过*__sigemptyset*将*sa_mask*设置为空。表示这个信号函数执行过程中，如果再有其他信号，哪怕是相同的信号来的时候也会被中断。当处理完了其他处理函数再处理这个问题也不大。
    + SA_INTERRUPT: 清除SA_INTERRUPT。当进程收到一个信号的时候（比如当前进程正在执行漫长的系统调用），会处理这个信号，当处理完这个信号就有两种情况：
        + SA_INTERRUPT： 告诉调用方，我不管了，给你一个*EINTR*自己看着办去吧
        + SA_RESTART：我给你重启一发
 

## sigaction做了什么

glibc 里面有个文件 syscalls.list。这里面定义了库函数调用哪些系统调用，在这里我们找到了 sigaction。
```c
sigaction    -       sigaction       i:ipp   __sigaction     sigaction
```
接下来，在 glibc 中，__sigaction 会调用 __libc_sigaction，并最终调用的系统调用是 rt_sigaction。
```c
int
__sigaction (int sig, const struct sigaction *act, struct sigaction *oact)
{
......
  return __libc_sigaction (sig, act, oact);
}


int
__libc_sigaction (int sig, const struct sigaction *act, struct sigaction *oact)
{
  int result;
  struct kernel_sigaction kact, koact;


  if (act)
    {
      kact.k_sa_handler = act->sa_handler;
      memcpy (&kact.sa_mask, &act->sa_mask, sizeof (sigset_t));
      kact.sa_flags = act->sa_flags | SA_RESTORER;


      kact.sa_restorer = &restore_rt;
    }


  result = INLINE_SYSCALL (rt_sigaction, 4,
                           sig, act ? &kact : NULL,
                           oact ? &koact : NULL, _NSIG / 8);
  if (oact && result >= 0)
    {
      oact->sa_handler = koact.k_sa_handler;
      memcpy (&oact->sa_mask, &koact.sa_mask, sizeof (sigset_t));
      oact->sa_flags = koact.sa_flags;
      oact->sa_restorer = koact.sa_restorer;
    }
  return result;
}
```
这也是很多人看信号处理的内核实现的时候，比较困惑的地方。例如，内核代码注释里面会说，系统调用 signal 是为了兼容过去，系统调用 sigaction 也是为了兼容过去，连参数都变成了 struct compat_old_sigaction，所以说，我们的库函数虽然调用的是 sigaction，到了系统调用层，调用的可不是系统调用 sigaction，而是系统调用 rt_sigaction。

```c
SYSCALL_DEFINE4(rt_sigaction, int, sig,
		const struct sigaction __user *, act,
		struct sigaction __user *, oact,
		size_t, sigsetsize)
{
	struct k_sigaction new_sa, old_sa;
	int ret = -EINVAL;
......
	if (act) {
		if (copy_from_user(&new_sa.sa, act, sizeof(new_sa.sa)))
			return -EFAULT;
	}


	ret = do_sigaction(sig, act ? &new_sa : NULL, oact ? &old_sa : NULL);


	if (!ret && oact) {
		if (copy_to_user(oact, &old_sa.sa, sizeof(old_sa.sa)))
			return -EFAULT;
	}
out:
	return ret;
}
```
在 rt_sigaction 里面，我们将用户态的 struct sigaction 结构，拷贝为内核态的 k_sigaction，然后调用 do_sigaction。do_sigaction 也很简单，还记得进程内核的数据结构里，struct task_struct 里面有一个成员 sighand，里面有一个 action。这是一个数组，下标是信号，内容就是信号处理函数，do_sigaction 就是设置 sighand 里的信号处理函数。
```c
int do_sigaction(int sig, struct k_sigaction *act, struct k_sigaction *oact)
{
	struct task_struct *p = current, *t;
	struct k_sigaction *k;
	sigset_t mask;
......
	k = &p->sighand->action[sig-1];


	spin_lock_irq(&p->sighand->siglock);
	if (oact)
		*oact = *k;


	if (act) {
		sigdelsetmask(&act->sa.sa_mask,
			      sigmask(SIGKILL) | sigmask(SIGSTOP));
		*k = *act;
......
	}


	spin_unlock_irq(&p->sighand->siglock);
	return 0;
}
```
至此，注册就完成了

## 总结

通过api注册信号处理函数的过程如下：
- 在用户程序里面，有两个函数可以调用，一个是 signal，一个是 sigaction，推荐使用 sigaction。
- 用户程序调用的是 Glibc 里面的函数，signal 调用的是 __sysv_signal，里面默认设置了一些参数，使得 signal 的功能受到了限制，sigaction 调用的是 __sigaction，参数用户可以任意设定。
- 无论是 __sysv_signal 还是 __sigaction，调用的都是统一的一个系统调用 rt_sigaction。
- 在内核中，rt_sigaction 调用的是 do_sigaction 设置信号处理函数。在每一个进程的 task_struct 里面，都有一个 sighand 指向 struct sighand_struct，里面是一个数组，下标是信号，里面的内容是信号处理函数。

![image](https://user-images.githubusercontent.com/12036324/66693820-baf52180-ecdf-11e9-93b3-d7e6c5b51504.png)

## 问题
你可以试着写一个程序，调用 sigaction 为某个信号设置一个信号处理函数，在信号处理函数中，如果收到信号则打印一些字符串，然后用命令 kill 发送信号，看是否字符串被正常输出。

见同目录的*test_sigaction.c*
