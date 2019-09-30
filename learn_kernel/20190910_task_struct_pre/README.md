[进程数据结构（上）：项目多了就需要项目管理系统](https://time.geekbang.org/column/article/91550)

对于内核来言，无论是进程还是线程都是一个任务（task），使用`task_struct`结构管理。

![image](https://user-images.githubusercontent.com/12036324/64664741-a88a8c80-d482-11e9-8e2f-3ce58985b9b9.png)

下面的数据结构将`task_struct`串起来。
```c
struct list_head		tasks;
```

## 任务ID

`task_struct`里面涉及到任务ID的字段有下面几个：
```c
pid_t pid;
pid_t tgid;
struct task_struct *group_leader;
```

对于一个进程：
- 主线程：pid是自己，tgid是自己，group_leader指的是本线程（tgid）的指针
- 其他线程：pid是自己，tgid是主线程的pid，group_leader指的是本线程（tgid）的指针


## 信号处理

`task_struct`里面涉及到信号处理的字段有下面几个：

```c
/* Signal handlers: */
struct signal_struct		*signal;
struct sighand_struct		*sighand;
sigset_t			blocked;
sigset_t			real_blocked;
sigset_t			saved_sigmask;
struct sigpending		pending;
unsigned long			sas_ss_sp;
size_t				sas_ss_size;
unsigned int			sas_ss_flags;
```

这里定义了信号的状态：
- 被阻塞咱不处理：blocked
- 等待处理：pending
- 正在通过信号处理函数进行处理：sighand

处理的结果可以是忽略，也可以是结束进程等。


信号处理函数默认使用用户态的函数栈，当然也可以开辟新的栈专门用于信号处理，这就是 sas_ss_xxx 这三个变量的作用。


task_struct 里面有一个 struct sigpending pending。如果我们进入 struct signal_struct *signal 去看的话，还有一个 struct sigpending shared_pending。它们一个是本任务的，一个是线程组共享的。


## 任务状态

`task_struct`里面涉及任务状态的变量有：

```c
 volatile long state;    /* -1 unrunnable, 0 runnable, >0 stopped */
 int exit_state;
 unsigned int flags;
```

state（状态）可以取的值定义在`include/linux/sched.h`头文件中：

```c
/* Used in tsk->state: */
#define TASK_RUNNING                    0
#define TASK_INTERRUPTIBLE              1
#define TASK_UNINTERRUPTIBLE            2
#define __TASK_STOPPED                  4
#define __TASK_TRACED                   8
/* Used in tsk->exit_state: */
#define EXIT_DEAD                       16
#define EXIT_ZOMBIE                     32
#define EXIT_TRACE                      (EXIT_ZOMBIE | EXIT_DEAD)
/* Used in tsk->state again: */
#define TASK_DEAD                       64
#define TASK_WAKEKILL                   128
#define TASK_WAKING                     256
#define TASK_PARKED                     512
#define TASK_NOLOAD                     1024
#define TASK_NEW                        2048
#define TASK_STATE_MAX                  4096
```
![image](https://user-images.githubusercontent.com/12036324/64665400-fdc79d80-d484-11e9-9979-b611f7d1cd2a.png)

任务状态：
- TASK_RUNNING: 不是正在运行是，是就绪状态，等待时间片
- TASK_INTERRUPTIBLE： 可中断睡眠
- TASK_UNINTERRUPTIBLE： 不可中断睡眠
- TASK_KILLABLE: 和TASK_UNINTERRUPTIBLE相比，能响应致命信号
```c
#define TASK_KILLABLE           (TASK_WAKEKILL | TASK_UNINTERRUPTIBLE)
```
- TASK_STOPPED: 进程接收到 SIGSTOP、SIGTTIN、SIGTSTP 或者 SIGTTOU 信号之后进入该状态
- TASK_TRACED: 表示进程被 debugger 等进程监视，进程执行被调试程序所停止。当一个进程被另外的进程所监视，每一个信号都会让进程进入该状态


退出状态：
- EXIT_ZOMBIE： 一旦一个进程要结束，先进入的是 EXIT_ZOMBIE 状态，但是这个时候它的父进程还没有使用 wait() 等系统调用来获知它的终止信息，此时进程就成了僵尸进程。
- EXIT_DEAD： 进程的最终状态


还有一些标志（flag）：
```c
#define PF_EXITING		0x00000004
#define PF_VCPU			0x00000010
#define PF_FORKNOEXEC		0x00000040
```
- PF_EXITING: 正在退出。当有这个 flag 的时候，在函数 find_alive_thread 中，找活着的线程，遇到有这个 flag 的，就直接跳过。
- PF_VCPU：表示进程运行在虚拟cpu上。在函数 account_system_time 中，统计进程的系统运行时间，如果有这个 flag，就调用 account_guest_time，按照客户机的时间进行统计
- PF_FORKNOEXEC：表示fork完了还没有exec了。在 _do_fork 函数里面调用 copy_process，这个时候把 flag 设置为 PF_FORKNOEXEC。当 exec 中调用了 load_elf_binary 的时候，又把这个 flag 去掉。



## 进程调度
`task_struct`里面涉及进程调度的变量有：
```c
// 是否在运行队列上
int				on_rq;
// 优先级
int				prio;
int				static_prio;
int				normal_prio;
unsigned int			rt_priority;
// 调度器类
const struct sched_class	*sched_class;
// 调度实体
struct sched_entity		se;
struct sched_rt_entity		rt;
struct sched_dl_entity		dl;
// 调度策略
unsigned int			policy;
// 可以使用哪些 CPU
int				nr_cpus_allowed;
cpumask_t			cpus_allowed;
struct sched_info		sched_info;
```


## 总结
![image](https://user-images.githubusercontent.com/12036324/64664780-d374e080-d482-11e9-8555-ad75bac72520.png)


