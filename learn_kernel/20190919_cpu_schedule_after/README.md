[调度（下）：抢占式调度是如何发生的？](https://time.geekbang.org/column/article/93711)

## 抢占式调度

当一个进程的执行时间太长，OS一看该切换了。
怎么衡量运行时间呢？在计算机里面有一个时钟，在一段时间会触发一次时钟中断，然后通知OS又过去一个时钟周期了。


时钟中断处理函数会调用*scheduler_tick()*代码如下：
```c
void scheduler_tick(void)
{
	int cpu = smp_processor_id();
	struct rq *rq = cpu_rq(cpu);
	struct task_struct *curr = rq->curr;
......
	curr->sched_class->task_tick(rq, curr, 0);
	cpu_load_update_active(rq);
	calc_global_load_tick(rq);
......
}
```
1. 取出当前CPU的运行队列
2. 得到这个队列上当前正在运行中的进程的*task_struct*
3. 调用这个task_struct的调度类的task_tick函数（处理时钟事件）

如果当前运行的是普通进程，task_struct的调度类为*fair_sched_class*，调用的处理时钟的函数为*task_tick_fair*
```c
static void task_tick_fair(struct rq *rq, struct task_struct *curr, int queued)
{
	struct cfs_rq *cfs_rq;
	struct sched_entity *se = &curr->se;


	for_each_sched_entity(se) {
		cfs_rq = cfs_rq_of(se);
		entity_tick(cfs_rq, se, queued);
	}
......
}
```
根据当前进程的*task_struct*找到对应的调度实体*sched_entity*和*cfs_rq*队列，调用*entity_tick*
```c
static void
entity_tick(struct cfs_rq *cfs_rq, struct sched_entity *curr, int queued)
{
	update_curr(cfs_rq);
	update_load_avg(curr, UPDATE_TG);
	update_cfs_shares(curr);
.....
	if (cfs_rq->nr_running > 1)
		check_preempt_tick(cfs_rq, curr);
}
```
在entity_tick里面，通过update_curr更新当前进程的vruntime，然后调用check_preempt_tick（检查是否能被抢占）
```c
static void
check_preempt_tick(struct cfs_rq *cfs_rq, struct sched_entity *curr)
{
	unsigned long ideal_runtime, delta_exec;
	struct sched_entity *se;
	s64 delta;


	ideal_runtime = sched_slice(cfs_rq, curr);
	delta_exec = curr->sum_exec_runtime - curr->prev_sum_exec_runtime;
	if (delta_exec > ideal_runtime) {
		resched_curr(rq_of(cfs_rq));
		return;
	}
......
	se = __pick_first_entity(cfs_rq);
	delta = curr->vruntime - se->vruntime;
	if (delta < 0)
		return;
	if (delta > ideal_runtime)
		resched_curr(rq_of(cfs_rq));
}
```
1. 先调用sched_slice计算出ideal_runtime（一个调度周期中，这个进程应该运行的实际时间）
2. sum_exec_runtime指进程总共执行的实际时间
3. prev_sum_exec_runtime指上次该进程被调度时候已经占用的实际时间（每次在调度一个新的进程时都会把它的 se->prev_sum_exec_runtime = se->sum_exec_runtime）
4. delta_exec就是这次调度占用的实际时间
5. 如果delta_exec大于ideal_runtime就应该被抢占了。
6. resched_cur：当进程应该被抢占的时候，就先把它标记为可抢占。

resched_cur会调用set_tsk_need_resched，标记进程应该被抢占，但不是真的抢占，而是打上一个TIF_NEED_RESCHED标记
```c
static inline void set_tsk_need_resched(struct task_struct *tsk)
{
	set_tsk_thread_flag(tsk,TIF_NEED_RESCHED);
}
```

另外一个可能被抢占的场景是当一个进程被唤醒的时候。

当一个进程在等待一个I/O的时候，会主动放弃CPU。当I/O到来的时候，进程往往会被唤醒。当被唤醒的进程的优先级高于CPU当前进程，就会触发抢占。

try_to_wake_up()调用ttwu_queue将这个唤醒的任务添加到队列中。ttwu_queue再调用ttwu_do_wakeup。
```c
static void ttwu_do_wakeup(struct rq *rq, struct task_struct *p, int wake_flags,
			   struct rq_flags *rf)
{
	check_preempt_curr(rq, p, wake_flags);
	p->state = TASK_RUNNING;
	trace_sched_wakeup(p);
```


## 抢占时机

需要去调用*_schedule*，分为用户态和内核态两个。

## 用户态抢占时机

### 系统调用返回
从系统调用中返回的那个时刻，是一个被抢占实际。


64位的系统调用的链路为：*do_syscall_64->syscall_return_slowpath->prepare_exit_to_usermode->exit_to_usermode_loop*：
```c
static void exit_to_usermode_loop(struct pt_regs *regs, u32 cached_flags)
{
	while (true) {
		/* We have work to do. */
		local_irq_enable();


		if (cached_flags & _TIF_NEED_RESCHED)
			schedule();
......
	}
}
```

如果一个进程被打了*_TIF_NEED_RESCHED*标记，调用*schedule*进行调度，就会选择一个进程让出CPU，做上下文切换。


### 中断返回

在 arch/x86/entry/entry_64.S 中有中断的处理过程。

```c
common_interrupt:
        ASM_CLAC
        addq    $-0x80, (%rsp)
        interrupt do_IRQ
ret_from_intr:
        popq    %rsp
        testb   $3, CS(%rsp)
        jz      retint_kernel
/* Interrupt came from user space */
GLOBAL(retint_user)
        mov     %rsp,%rdi
        call    prepare_exit_to_usermode
        TRACE_IRQS_IRETQ
        SWAPGS
        jmp     restore_regs_and_iret
/* Returning to kernel space */
retint_kernel:
#ifdef CONFIG_PREEMPT
        bt      $9, EFLAGS(%rsp)
        jnc     1f
0:      cmpl    $0, PER_CPU_VAR(__preempt_count)
        jnz     1f
        call    preempt_schedule_irq
        jmp     0b
```
中断处理调用的是 do_IRQ 函数，中断完毕后分为两种情况，一个是返回用户态，一个是返回内核态。

retint_user会调用prepare_exit_to_usermode最终调用exit_to_usermode_loop,和上面的逻辑一样，发现有标记就调用*schedule*


## 内核态抢占时机

### preempt_enable()中

对于内核态，被抢占的实际一般发生在preempt_enable中。


在内核态的执行中，有的操作是不能被中断的，所以在进行这些操作之前，总是先调用*preempt_disable()*关闭抢占，当再次被打开的时候，就是一次内核代码被抢占的机会。


就像下面代码中展示的一样，preempt_enable() 会调用 preempt_count_dec_and_test()，判断 preempt_count 和 TIF_NEED_RESCHED 看是否可以被抢占。如果可以，就调用 preempt_schedule->preempt_schedule_common->__schedule 进行调度。还是满足进程调度第一定律的。

```c
#define preempt_enable() \
do { \
	if (unlikely(preempt_count_dec_and_test())) \
		__preempt_schedule(); \
} while (0)


#define preempt_count_dec_and_test() \
	({ preempt_count_sub(1); should_resched(0); })


static __always_inline bool should_resched(int preempt_offset)
{
	return unlikely(preempt_count() == preempt_offset &&
			tif_need_resched());
}


#define tif_need_resched() test_thread_flag(TIF_NEED_RESCHED)


static void __sched notrace preempt_schedule_common(void)
{
	do {
......
		__schedule(true);
......
	} while (need_resched())
```

### 从中断返回

在内核态也会遇到中断的情况，当中断返回的时候，返回的仍然是内核态。这个时候也是一个执行抢占的时机，现在我们再来上面中断返回的代码中返回内核的那部分代码，调用的是 preempt_schedule_irq。

```c
asmlinkage __visible void __sched preempt_schedule_irq(void)
{
......
	do {
		preempt_disable();
		local_irq_enable();
		__schedule(true);
		local_irq_disable();
		sched_preempt_enable_no_resched();
	} while (need_resched());
......
}
```
preempt_schedule_irq 调用 __schedule 进行调度。还是满足进程调度第一定律的。


### 中断返回

## 总结
这个脑图里面第一条就是总结了进程调度第一定律的核心函数 __schedule 的执行过程，这是上一节讲的，因为要切换的东西比较多，需要你详细了解每一部分是如何切换的。


第二条总结了标记为可抢占的场景，第三条是所有的抢占发生的时机，这里是真正验证了进程调度第一定律的。
![image](https://user-images.githubusercontent.com/12036324/65210454-de0c2700-dacd-11e9-915c-b398d119ffe7.png)

调度要解决的问题：
- 什么时间调度
    + 主动调度：程序自己调用*_schedule*让出CPU
    + 抢占式调度：
        + 用户态：系统调用返回和中断返回用户态
        + 内核态：内核打开“可抢占”和中断返回内核态
- 调度谁：
    + 当运行进程到时间的时候，如果是普通进程就从红黑树的最左边拿一个出来
- 怎么调度：
    + 都是调度*_schedule*

## 问题

通过对于内核中进程调度的分析，我们知道，时间对于调度是很重要的，你知道 Linux 内核是如何管理和度量时间的吗？
