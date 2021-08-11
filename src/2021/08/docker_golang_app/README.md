# 为什么Go服务容器化之后延迟变高



在大会上看到有几个人都讲这个。。。

回来观察了下自己的服务，加上之后并没有什么问题。

正好组里一个也遇到这个问题。



准备在框架的下个版本中默认加上，写一篇文章总结一下这个过程。

因为事先已经知道结果，所以当你看的时候可能会感觉反过来了，我是从结论出发一步步推延过来的。

。。

## Go 调度知识扫盲

我们这里就不深入讲解GMP的调度模型，为了不影响初学者阅读，我只是简单介绍一下，理解的可以直接跳过这一小段。

![image-20210810155435517](/Users/helios/Library/Application Support/typora-user-images/image-20210810155435517.png)



## 现象

环境

- Go版本：1.13

- 物理机核数： 96C
- 容器设置的CPU：4C

下图中**绿**色表示通过`runtime.GOMAXPROCS()`讲P的数量设置为4，即服务能使用的核心数。**蓝色**表示没有管`runtime.GOMAXPROCS()`，P的数量默认设置为物理的核心数上（后面会解释为什么）。



![image-20210810202240271](/Users/helios/Library/Application Support/typora-user-images/image-20210810202240271.png)

各种压测数据。。。



很明显我们能到的XXX



## 为什么数据数据变差了



上个火焰图：



开了96个core thread



因为初始化的时候读的是/proc/cpuinfo，这个是宿主机的，没有



## automaxprocs的原理是什么



## 总结

