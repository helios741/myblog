
[传送门](https://time.geekbang.org/column/article/70077)

vmstate: 能查看系统的上下文切换情况
pidstate：加上-t参数就是显示子线程的的上下文切换，如果是不显示子进程的会远小于vmstate
    + cswch（voluntary context switches）：自愿上下文切换，等待自愿io等
    + nvcswch（non voluntary context switches）：非自愿上下文切换，被抢占
stress和sysbench压测工具的对比：
- stress基于多进程的，会fork多个进程，导致进程上下文切换，导致us开销很高
- sysbench基于多线程的，会创建多个线程，单一进程基于内核线程切换，导致sy的内核开销很高；

留言总结：
"
过多上下文切换会缩短进程运行时间
vmstat 1 1：分析内存使用情况、cpu上下文切换和中断的次数。cs每秒上下文切换的次数，in每秒中断的次数，r运行或等待cpu的进程数，b中断睡眠状态的进程数。
pidstat -w 5：查看每个进程详细情况。cswch（每秒自愿）上下文切换次数，如系统资源不足导致，nvcswch每秒非自愿上下文切换次数，如cpu时间片用完或高优先级线程
案例分析：
sysbench：多线程的基准测试工具，模拟context switch
终端1：sysbench --threads=10 --max-time=300 threads run
终端2：vmstat 1：sys列占用84%说明主要被内核占用，ur占用16%；r就绪队列8；in中断处理1w，cs切换139w==>等待进程过多，频繁上下文切换，内核cpu占用率升高
终端3：pidstat -w -u 1：sysbench的cpu占用100%（-wt发现子线程切换过多），其他进程导致上下文切换
watch -d cat /proc/interupts ：查看另一个指标中断次数，在/proc/interupts中读取，发现重调度中断res变化速度最快
总结：cswch过多说明资源IO问题，nvcswch过多说明调度争抢cpu过多，中断次数变多说明cpu被中断程序调用

"
