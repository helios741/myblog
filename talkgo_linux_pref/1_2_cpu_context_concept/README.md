
### 几个问题

#### 为什么多进程抢占CPU会导致平均负载升高

因为发生了上下文切换。

- 耗时： 每次上下文切换需要几十纳秒到几微秒
- TLB（管理虚拟内存到物理内存之间的映射）：进程切换会导致虚拟内存切换，虚拟内存更新之后，TLB也要刷新，内存访问变慢。缓存是被多处理器共享的，会影响多个处理器。

#### CPU的上下文指得是什么
- CPU寄存器：记录任务从哪里加载
- 程序计数器：下一条指令的位置，也即偏移量

#### 有多少种任务，每个任务对应的上下文切换是啥样的

- 进程
- 线程
- 中断

特权模式

用户态切换到内核态变迁（蓝色为上下文切换）
![](./privilege_mode)

从内核态到用户态还要一次相反的过程，所以是两次上下文切换。


特权模式和进程上下文切换的区别：
- 进程数量：
    + 特权模式是同一个进程
    + 进程上下文切换是两个进程
- 切换代价：
    + 进程上下文切换：只发生在内核态，不仅包括虚拟内存、栈、全局变量等用户空间资源，还包括内核堆栈、寄存器等内核空间状态
    + 特权模式：不需要切换虚拟内存、栈、全局变量等用户空间资源


线程上下文切换


如果是不同进程的线程之间发生切换，和进程切换一样了。

如果属于同一个进程，因为虚拟内存是共享的，只需要切换私有数据、寄存器等不共享的即可。


中断上下文切换

中断处理有比较高的优先级，会进行抢占。

类似于特权模式，不需要切换用户空间资源，因为指发生在内核态。只需要保存内核态资源即可。



#### 什么时候会触发上下文切换

Linux为每一个CPU维护就绪队列，将活跃进程（正在运行 + 等待运行）按照优先级和等待CPU时间排序，然后选择最需要的进程，即优先级最高和等待时间最长的。

1. 时间片到了
2. 资源不足被挂起
3. 通过sleep函数等主动挂起
4. 高优先级任务抢占
5. 硬件中断
