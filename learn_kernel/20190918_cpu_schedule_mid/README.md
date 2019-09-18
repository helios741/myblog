[调度（中）：主动调度是如何发生的？](https://time.geekbang.org/column/article/93396)


## 主动调度

先看两个代码片段：

1. Btrfs（一种文件系统）写入设备的一个经典场景。写入需要一段时间，这段时间用不上CPU，所以直接主动让给其他任务：
```c
static void btrfs_wait_for_no_snapshoting_writes(struct btrfs_root *root)
{
......
	do {
		prepare_to_wait(&root->subv_writers->wait, &wait,
				TASK_UNINTERRUPTIBLE);
		writers = percpu_counter_sum(&root->subv_writers->counter);
		if (writers)
			schedule();
		finish_wait(&root->subv_writers->wait, &wait);
	} while (writers);
}
```
2. 从Tap网络设备等待一个读取。
Tap网络设备是虚拟机使用的网络设备。当没有数据来的时候，他需要等，所以也会主动让出CPU：
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
......
		/* Nothing to read, let's sleep */
		schedule();
	}
......
}
```

所以主动调度的方式就调度*schedule()*函数。

```c
asmlinkage __visible void __sched schedule(void)
{
	struct task_struct *tsk = current;


	sched_submit_work(tsk);
	do {
		preempt_disable();
		__schedule(false);
		sched_preempt_enable_no_resched();
	} while (need_resched());
}
```

*schedule()*主要调度*__schedule*函数实现。

*__schedule*这个函数比较复杂，分为几步来说：
```c
static void __sched notrace __schedule(bool preempt)
{
	struct task_struct *prev, *next;
	unsigned long *switch_count;
	struct rq_flags rf;
	struct rq *rq;
	int cpu;


	cpu = smp_processor_id();
	rq = cpu_rq(cpu);
	prev = rq->curr;
......
```
1. 取出任务队列rq
2. task_struct *prev指向这个任务队列上正在运行的任务（因为要切换了，正在运行的这个要变为前任了，所以是prev）

接下来：
```c
next = pick_next_task(rq, prev, &rf);
clear_tsk_need_resched(prev);
clear_preempt_need_resched();
```
- task_struct *next指向下一个任务，就是继任（如果是CFS，就是最左边的节点）

最后：
如果发现前任（prev）和继任（next）不同，就进行上下文切换，继任者任务进行运行：
```c
if (likely(prev != next)) {
		rq->nr_switches++;
		rq->curr = next;
		++*switch_count;
......
		rq = context_switch(rq, prev, next, &rf);
```

## 进程上下文切换

主要干两件事情：
- 切换进程空间，也即虚拟内存
- 切换寄存器和CPU上下文切换

```c
/*
 * context_switch - switch to the new MM and the new thread's register state.
 */
static __always_inline struct rq *
context_switch(struct rq *rq, struct task_struct *prev,
	       struct task_struct *next, struct rq_flags *rf)
{
	struct mm_struct *mm, *oldmm;
......
	mm = next->mm;
	oldmm = prev->active_mm;
......
	switch_mm_irqs_off(oldmm, mm, next);
......
	/* Here we just switch the register state and the stack. */
	switch_to(prev, next, prev);
	barrier();
	return finish_task_switch(prev);
}
```
先是内存空间的切换。
接下来是寄存器和栈的切换，它通过switch_to函数调度__switch_to_asm。__switch_to_asm是一段汇编代码，主要用户栈的切换。

对于32位OS切换的是栈顶指针ESP：
```c
/*
 * %eax: prev task
 * %edx: next task
 */
ENTRY(__switch_to_asm)
......
	/* switch stack */
	movl	%esp, TASK_threadsp(%eax)
	movl	TASK_threadsp(%edx), %esp
......
	jmp	__switch_to
END(__switch_to_asm)
```

对于64位OS切换的是栈顶指针rsp：
```c
/*
 * %rdi: prev task
 * %rsi: next task
 */
ENTRY(__switch_to_asm)
......
	/* switch stack */
	movq	%rsp, TASK_threadsp(%rdi)
	movq	TASK_threadsp(%rsi), %rsp
......
	jmp	__switch_to
END(__switch_to_asm)
```

可以看到最终都会跳转到*__switch_to*这个函数，这个函数在32位和64位虽然实现不同，但是做的事情差不多，下面是64位做的事情：
```c
__visible __notrace_funcgraph struct task_struct *
__switch_to(struct task_struct *prev_p, struct task_struct *next_p)
{
	struct thread_struct *prev = &prev_p->thread;
	struct thread_struct *next = &next_p->thread;
......
	int cpu = smp_processor_id();
	struct tss_struct *tss = &per_cpu(cpu_tss, cpu);
......
	load_TLS(next, cpu);
......
	this_cpu_write(current_task, next_p);


	/* Reload esp0 and ss1.  This changes current_thread_info(). */
	load_sp0(tss, next);
......
	return prev_p;
}
```

重点看一下Per CPU的这个结构体tss，在x86的体系结构中，提供了一种以硬件的方式进行进程切换的模式，对于每个进程，x86希望在内存中维护一个TSS（Task State Segment，任务状态段）的结构，这个里面有所有的寄存器。


另外，还有一个特殊的寄存器TR（Task Register，任务寄存器），指向某个进程的TSS。更改TR的值，将会触发硬件保存CPU的所有寄存器到当前进程的TSS中，然后从新进程的TSS中读出所有寄存器的值，加载到CPU对应的寄存器中。


下面是32为的TSS的结构：

![image](https://user-images.githubusercontent.com/12036324/65104504-2f4fe400-da04-11e9-90bf-3c7c10dda009.png)

但是这样每次进程切换的时候都要全量的切换，动作太大了。


Linux在系统初始化（cpu_init）的时候，会给每个CPU关联一个TSS，然后将TR指向这个TSS，在操作系统运行过程中，TR就不切换了，永远指向这个TSS。
```c
void cpu_init(void)
{
	int cpu = smp_processor_id();
	struct task_struct *curr = current;
	struct tss_struct *t = &per_cpu(cpu_tss, cpu);
    ......
    load_sp0(t, thread);
	set_tss_desc(cpu, t);
	load_TR_desc();
    ......
}


struct tss_struct {
	/*
	 * The hardware state:
	 */
	struct x86_hw_tss	x86_tss;
	unsigned long		io_bitmap[IO_BITMAP_LONGS + 1];
}
```

在Linux中，真正参与进程切换的寄存器很少，主要是栈顶寄存器。


在task_struct里面，有个thread这个成员变量。这里面保留了要切换进程需要修改的寄存器。
```c
/* CPU-specific state of this task: */
	struct thread_struct		thread;
```
进程切换，就是将某个进程的thread_struct里面寄存器的值，写入到CPU的TR指针指向的tss_struct里面，对于CPU来说，就算切换完成了。

## 指令指针的保存和恢复

从进程A切换到进程B，要切换的东西

- 用户栈：因为每个进程的用户栈是独立的，都在内存空间里面，切换内存空间的时候就切换了
- 内核栈：在*__switch_to*里面切换了，也就是将*current_task*指向当前的task_struct，task_struct里面的void *stack指针就是指向当前的内核栈
- 内核栈的栈顶指针：在*__switch_to_asm*里面已经切换了栈顶指针，并且将栈顶指针通过*__switch_to*加载到了TSS里面
- 用户栈的栈顶指针：如果当前在内核里面的话，它是在内核栈顶部的pt_regs结构里面。当从内核返回用户态的时候，pt_regs里面有所有当时在用户态的时候运行的上下文信息，就可以运行了。
- 指令指针寄存器：他是指向下一条指令，他是如何切换的下面重点说说。

**进程调度第一定律**：进程的调度最终都会调用到*__schedule*


我们用最前面的例子仔细分析这个过程。本来一个进程 A 在用户态是要写一个文件的，写文件的操作用户态没办法完成，就要通过系统调用到达内核态。在这个切换的过程中，用户态的指令指针寄存器是保存在 pt_regs 里面的，到了内核态，就开始沿着写文件的逻辑一步一步执行，结果发现需要等待，于是就调用 __schedule 函数。


这个时候，进程 A 在内核态的指令指针是指向 __schedule 了。这里请记住，A 进程的内核栈会保存这个 __schedule 的调用，而且知道这是从 btrfs_wait_for_no_snapshoting_writes 这个函数里面进去的。


__schedule 里面经过上面的层层调用，到达了 context_switch 的最后三行指令（其中 barrier 语句是一个编译器指令，用于保证 switch_to 和 finish_task_switch 的执行顺序，不会因为编译阶段优化而改变，这里咱们可以忽略它）。
```c
switch_to(prev, next, prev);
barrier();
return finish_task_switch(prev);
```

现在我们来假设A切换到B，B切换到C，C切换到A。
我们来看看switch_to的定义:
```c
#define switch_to(prev, next, last)					\
do {									\
	prepare_switch_to(prev, next);					\
									\
	((last) = __switch_to_asm((prev), (next)));			\
} while (0)
```
- A切换B：
    + prev：A
    + next：B
    + 执行完__switch_to_asm之后被切换走
- B切换C：同上
- C切换A：
    + 运行__switch_to_asm，是从C的内核栈运行的
    + prev：C
    + next：A
    + 运行__switch_to_asm之后，内核栈变为A
    + prev: A
    + next: B
    + last: C


## 总结

__schedule会做两件事情：
- 选取下一个进程
- 上下文切换：又分为用户态空间切换和内核态的切换

![image](https://user-images.githubusercontent.com/12036324/65104489-265f1280-da04-11e9-9db3-b018a5fbafac.png)


## 问题
你知道应该用什么命令查看进程的运行时间和上下文切换次数吗？
