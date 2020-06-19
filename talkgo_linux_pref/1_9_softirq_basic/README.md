
### 笔记

中断是一种异步的事件处理方式，可以提高系统的并发处理能力，即不用CPU每次都去死等数据，而是等信号来了通知CPU。

处理中断的时候，CPU是不中断的，所以要求处理中断的程序要尽可能的快。

为了造成一个中断占用CPU太长时间（下一个中断就进不来了），所以就把中断处理分为了两部分：
- 上半步（不可中断）：在中断禁止模式下运行，处理硬件相关或者时间敏感的工作
- 下半步（可中断）：延时处理上半步未完成的工作，通常以内核线程运行
- 上半步和下半步的通信，一般是上半步更新一下寄存器

查看软中断和内核线程：
- /proc/softirqs 提供了软中断的运行情况
- /proc/interrupts 提供了硬中断的运行情况


### 问题

1. 下半步的由内核触发的软中断，是和其他的任务一样对待，有时间片轮转的方式，还是一直占用CPU运行到结束的可中断任务呢？


2. “ksoftirqd/CPU 编号”这个内核的线程的作用是上半步的硬中断在哪个CPU上执行，保证软中断也在哪个CPU上执行么？

3. 上半步和下半步如何通信的
~

~
~