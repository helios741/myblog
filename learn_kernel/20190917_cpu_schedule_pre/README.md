[调度（上）：如何制定项目管理流程？](https://time.geekbang.org/column/article/93251)

## 调度策略和调度类
在Linux中进程分为两种：
- 实时进程：需要尽快返回结果的，优先级比较高、
- 普通进程：优先级没有实时进程高的普通进程

对于这两种进程，调度策略还是不同的，在task_struct里面，有一个成员变量，是调度策略：

```c
unsigned int policy;
```
它有以下几个定义：
```c
#define SCHED_NORMAL		0
#define SCHED_FIFO		1
#define SCHED_RR		2
#define SCHED_BATCH		3
#define SCHED_IDLE		5
#define SCHED_DEADLINE		6
```
配合调度策略，在task_struct的优先级变量如下：
```c
int prio, static_prio, normal_prio;
unsigned int rt_priority;
```
优先级其实就是一个数值，对于实时进程，优先级的范围是 0～99；对于普通进程，优先级的范围是 100～139。数值越小，优先级越高。从这里可以看出，所有的实时进程都比普通进程优先级要高。


## 实时调度策略

SCHED_FIFO, SCHED_RR, SCHED_DEADLINE是针对实时进程的调度策略。

- SCHED_FIFO： 同样优先级的先来先处理
- SCHED_RR：同样的优先级，采用时间片轮转
- SCHED_DEADLINE：按照任务的deadline，当产生一个调度点的时候，DL调度器总是选择其deadline距离当前时间点最近的那个任务进行调度执行。


## 普通调度策略

SCHED_NORMAL, SCHED_BATCH, SCHED_IDLE是针对普通进程的调度策略。

- SCHED_NORMAL： 正常的进程
- SCHED_BATCH：后台进程，这类进程可以默默执行，不影响需要交互的进程，可以降低他的优先级。
- SCHED_IDLE：空闲的时候才去跑的进程。

上面设置了策略（policy）和优先级（priority）变量，表示应该怎样调度，谁去调度就是由task_struct下面的这个变量决定的了：
```c
const struct sched_class *sched_class;
```
调度策略的执行策略就封装在这里面，它是真正干活的。
sched_class有下面几种实现：
- stop_sched_class：优先级最高的任务会使用这个策略，会针对所有任务，且不会被其他任务打断
- dl_sched_class：对应上面的SCHED_DEADLINE调度策略
- rt_sched_class：对应SCHED_FIFO或SCHED_RR的调度策略，具体的调度策略由task_struct->policy指定
- fair_sched_class：普通进程的调度策略
- idle_sched_class：空闲进程的调度策略


## 完全公平调度算法

普通进程使用基于CFS（Completely Fair Scheduling）的调度算法。


CFS会为每个进程安排一个虚拟运行时间vruntime，CPU的每个tick都会让进程的vruntime增加。每次为了保证公平，优先运行vruntime比较少的进程。
更新进程运行统计量的时候，可以看下面的逻辑：
```c
/*
 * Update the current task's runtime statistics.
 */
static void update_curr(struct cfs_rq *cfs_rq)
{
	struct sched_entity *curr = cfs_rq->curr;
	u64 now = rq_clock_task(rq_of(cfs_rq));
	u64 delta_exec;
......
	delta_exec = now - curr->exec_start;
......
	curr->exec_start = now;
......
	curr->sum_exec_runtime += delta_exec;
......
	curr->vruntime += calc_delta_fair(delta_exec, curr);
	update_min_vruntime(cfs_rq);
......
}


/*
 * delta /= w
 */
static inline u64 calc_delta_fair(u64 delta, struct sched_entity *se)
{
	if (unlikely(se->load.weight != NICE_0_LOAD))
        /* delta_exec * weight / lw.weight */
		delta = __calc_delta(delta, NICE_0_LOAD, &se->load);
	return delta;
}
```

可以看到vruntime的计算公式：
```txt
vruntime = delta_exec(实际运行时间) * NICE_0_LOAD / 权重
```
这样，针对高优先级的任务vruntime就算少了，高优先级的就相对算多了。


## 调度队列和调度实体

因为CFS要经常查询和更新vruntime还要保证排序，用的是红黑树这个数据结构。


红黑树中的节点（vruntime）被称为调度实体。

task_struct有以下成员变量：
- struct sched_entity se: 完全公平算法调度实体
- struct sched_rt_entity rt: 实时调度实体
- struct sched_dl_entity dl: deadline调度实体


不仅仅是CFS需要有这样一个数据结构进行排序，其他的调度策略也同样要有自己的数据结构进行排序，因此任务一个策略做调度的时候，都要区分任务运行的先后顺序。

而进程根据自己是实时的，还是普通的类型，通过这个成员变量，将自己挂在某一个数据结构里面，和其他的进程排序，等待被调度。如果这个进程是个普通进程，则通过 sched_entity，将自己挂在这棵红黑树上。


对于普通进程的调度实体定义如下，包含了vruntime和权重load_weight，以及运行时间的统计。
```c
struct sched_entity {
	struct load_weight		load;
	struct rb_node			run_node;
	struct list_head		group_node;
	unsigned int			on_rq;
	u64				exec_start;
	u64				sum_exec_runtime;
	u64				vruntime;
	u64				prev_sum_exec_runtime;
	u64				nr_migrations;
	struct sched_statistics		statistics;
......
};
```
下面是一个红黑树的例子

![image](https://user-images.githubusercontent.com/12036324/65008817-29db9680-d93d-11e9-9ba9-1b3f3550f80b.png)


cpu也有自己的struct rq结构，其用于描述在此CPU上运行的所有进程，包括一个实时进程rt_rq和一个CFS的运行队列cfs_rq，调度器首先去实时任务队列中找是否有实时任务需要运行，没有再去CFS队列找
```c
struct rq {
	/* runqueue lock: */
	raw_spinlock_t lock;
	unsigned int nr_running;
	unsigned long cpu_load[CPU_LOAD_IDX_MAX];
......
	struct load_weight load;
	unsigned long nr_load_updates;
	u64 nr_switches;


	struct cfs_rq cfs;
	struct rt_rq rt;
	struct dl_rq dl;
......
	struct task_struct *curr, *idle, *stop;
......
};
```
普通进程的cfs_rq的定义如下：
```c
/* CFS-related fields in a runqueue */
struct cfs_rq {
	struct load_weight load;
	unsigned int nr_running, h_nr_running;


	u64 exec_clock;
	u64 min_vruntime;
#ifndef CONFIG_64BIT
	u64 min_vruntime_copy;
#endif
	struct rb_root tasks_timeline;
	struct rb_node *rb_leftmost;


	struct sched_entity *curr, *next, *last, *skip;
......
};
```

- rb_root: 红黑树的根节点
- rb_leftmost: 指向最左边的节点

上面这些数据结构的关系图如下：

![image](https://user-images.githubusercontent.com/12036324/65008810-21835b80-d93d-11e9-97ae-0bee675d8bbb.png)


## 调度类是如何工作的

调度类定义如下：

```c
struct sched_class {
	const struct sched_class *next;


	void (*enqueue_task) (struct rq *rq, struct task_struct *p, int flags);
	void (*dequeue_task) (struct rq *rq, struct task_struct *p, int flags);
	void (*yield_task) (struct rq *rq);
	bool (*yield_to_task) (struct rq *rq, struct task_struct *p, bool preempt);


	void (*check_preempt_curr) (struct rq *rq, struct task_struct *p, int flags);


	struct task_struct * (*pick_next_task) (struct rq *rq,
						struct task_struct *prev,
						struct rq_flags *rf);
	void (*put_prev_task) (struct rq *rq, struct task_struct *p);


	void (*set_curr_task) (struct rq *rq);
	void (*task_tick) (struct rq *rq, struct task_struct *p, int queued);
	void (*task_fork) (struct task_struct *p);
	void (*task_dead) (struct task_struct *p);


	void (*switched_from) (struct rq *this_rq, struct task_struct *task);
	void (*switched_to) (struct rq *this_rq, struct task_struct *task);
	void (*prio_changed) (struct rq *this_rq, struct task_struct *task, int oldprio);
	unsigned int (*get_rr_interval) (struct rq *rq,
					 struct task_struct *task);
	void (*update_curr) (struct rq *rq)
}
```
- next: 指向下一个调度类

调度类分为下面几种：
```c
extern const struct sched_class stop_sched_class;
extern const struct sched_class dl_sched_class;
extern const struct sched_class rt_sched_class;
extern const struct sched_class fair_sched_class;
extern const struct sched_class idle_sched_class;
```
这五个东西是按照顺序放在链表中的，下面我们以*取下一个任务*为例：
```c
/*
 * Pick up the highest-prio task:
 */
static inline struct task_struct *
pick_next_task(struct rq *rq, struct task_struct *prev, struct rq_flags *rf)
{
	const struct sched_class *class;
	struct task_struct *p;
......
	for_each_class(class) {
		p = class->pick_next_task(rq, prev, rf);
		if (p) {
			if (unlikely(p == RETRY_TASK))
				goto again;
			return p;
		}
	}
}
```
`for_each_class`就是按照上面的调度类的顺序依次调用每个调度类的方法。对于每种调度类都有自己的实现，例如下面的CFS就有fair_sched_class
```c
const struct sched_class fair_sched_class = {
	.next			= &idle_sched_class,
	.enqueue_task		= enqueue_task_fair,
	.dequeue_task		= dequeue_task_fair,
	.yield_task		= yield_task_fair,
	.yield_to_task		= yield_to_task_fair,
	.check_preempt_curr	= check_preempt_wakeup,
	.pick_next_task		= pick_next_task_fair,
	.put_prev_task		= put_prev_task_fair,
	.set_curr_task          = set_curr_task_fair,
	.task_tick		= task_tick_fair,
	.task_fork		= task_fork_fair,
	.prio_changed		= prio_changed_fair,
	.switched_from		= switched_from_fair,
	.switched_to		= switched_to_fair,
	.get_rr_interval	= get_rr_interval_fair,
	.update_curr		= update_curr_fair,
};
```
对于同样的 pick_next_task 选取下一个要运行的任务这个动作，不同的调度类有自己的实现。fair_sched_class 的实现是 pick_next_task_fair，rt_sched_class 的实现是 pick_next_task_rt。

pick_next_task_fair和pick_next_task_rt分别操作的是rt_rq和cfs_rq
```c
static struct task_struct *
pick_next_task_rt(struct rq *rq, struct task_struct *prev, struct rq_flags *rf)
{
	struct task_struct *p;
	struct rt_rq *rt_rq = &rq->rt;
......
}


static struct task_struct *
pick_next_task_fair(struct rq *rq, struct task_struct *prev, struct rq_flags *rf)
{
	struct cfs_rq *cfs_rq = &rq->cfs;
	struct sched_entity *se;
	struct task_struct *p;
......
}
```

sched_class中与调度有关的函数：
- enqueue_task: 向就绪队列中添加一个进程，当某个进程进入可运行状态时，调用这个函数
- dequeue_task: 将一个进程从就绪队列中删除
- pick_next_task: 选择接下来运行的进程
- put_prev_task: 用另一个进程代替当前运行的进程
- set_curr_task: 用于修改调度策略
- task_tick: 每次时钟周期到的时候，这个函数被调用，可触发调度


在这里面，我们重点看 fair_sched_class 对于 pick_next_task 的实现 pick_next_task_fair，获取下一个进程。调用路径如下：pick_next_task_fair->pick_next_entity->__pick_first_entity。

```c
struct sched_entity *__pick_first_entity(struct cfs_rq *cfs_rq)
{
	struct rb_node *left = rb_first_cached(&cfs_rq->tasks_timeline);


	if (!left)
		return NULL;


	return rb_entry(left, struct sched_entity, run_node);
}
```
从这个函数的实现可以看出，就是从红黑树中取最左边的节点。

## 总结

1. CPU上有一个队列rq，里面包含实时任务队列和普通任务队列
2. cfs_rq通过红黑树去维护，其他任务有自己的数据结构
3. 红黑树上的每个节点都是一个调度实体
4. 每个调度实体属于某一个task_struct里面有指针指向这个进程属于哪个调度类

![image](https://user-images.githubusercontent.com/12036324/65008792-19c3b700-d93d-11e9-8a2f-56bcc3f68a5d.png)

## 思考题

这里讲了进程调度的策略和算法，你知道如何通过 API 设置进程和线程的调度策略吗？你可以写个程序尝试一下。

网上回答https://garlicspace.com/2019/07/16/linux-%e8%bf%9b%e7%a8%8b%ef%bc%8c%e7%ba%bf%e7%a8%8b%e7%9a%84%e8%b0%83%e5%ba%a6%e7%ad%96%e7%95%a5api/


