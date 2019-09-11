[线程：如何让复杂的项目并行执行？](https://time.geekbang.org/column/article/91289)



## 为什么要有线程

- 创建进程太浪费资源
- 进程间通信太费劲
![](https://user-images.githubusercontent.com/12036324/64664218-0ddd7e00-d481-11e9-8559-2f4d6b3b0c1d.png)
## 如何创建进程

可以参考同级目录下的*download.c*

- pthread_attr_t: 声明线程属性
- pthread_attr_init: 初始化这个属性，并且设置`PTHREAD_CREATE_JOINABLE`,表明主线程等待这个线程的结束，并获取退出时的状态
- pthread_create:
  + 第一个参数：线程对象
  + 第二个参数：线程属性
  + 第三个参数：线程运行函数
  + 第四个参数：线程运行函数的参数
- pthread_exit: 通知主线程，退出了
- pthread_join: 获得线程退出的返回值


开始编译（多线程程序依赖libpthread.do）:
```shell
gcc download.c -lpthread
```
![](https://user-images.githubusercontent.com/12036324/64664211-074f0680-d481-11e9-8cb7-024a630c0895.png)


## 线程数据

![](https://user-images.githubusercontent.com/12036324/64664206-01f1bc00-d481-11e9-9185-21364a8c8c79.png)

1. 线程栈上的本地数据
可以通过下面函数修改`pthread_attr_t`，修改线程栈的大小：
```shell
int pthread_attr_setstacksize(pthread_attr_t *attr, size_t stacksize);
```

每个线程有自己独立的栈空间，为了避免线程之间数据踩踏，所以在线程之间有一块小的隔离区域，如果有线程踏进这个区域就会引发段错误。


2. 整个进程之间的共享数据

很好理解

3. 线程私有数据，可以通过下面函数创建：

```shell
int pthread_key_create(pthread_key_t *key, void (*destructor)(void*))
```
这个key一旦被创建，各个线程就能向key中填写不同的数据，这就相当于一个同名但不同值的全局变量。
可以通过下面的函数设置key对应的value：
```shell
int pthread_setspecific(pthread_key_t key, const void *value)
```
可以通过下面的函数获取key对应的value：
```shell
void *pthread_getspecific(pthread_key_t key)
```

等到线程退出的时候就会调用析构函数释放value。

## 数据保护

### 通过互斥锁

![](https://user-images.githubusercontent.com/12036324/64664200-fb634480-d480-11e9-9e6d-d9031b3a200a.png)
可以查看同级目录下面的`mutex.c`,使用下面的命令进行编译看看：
```shell
gcc mutex.c -lpthread
```
https://garlicspace.com/2019/06/20/posix-threads-api-%E6%95%B4%E7%90%86/

### 通过条件变量
![](https://user-images.githubusercontent.com/12036324/64664197-f69e9080-d480-11e9-9283-567467ed6253.png)

可以查看同级目录下的`coder.c`,是用下面的命令编译查看：
```shell
gcc coder.c -lpthread
```
解释一下几个名词：
- pthread_cond_wait: 用于阻塞当前线程，等待别的线程使用pthread_cond_signal()或pthread_cond_broadcast来唤醒它
pthread_cond_wait() 必须与pthread_mutex配套使用。pthread_cond_wait()函数一进入wait状态就会自动release mutex。当其他线程通过pthread_cond_signal()或pthread_cond_broadcast，把该线程唤醒
- pthread_cond_signal: 唤醒一个等待进程
- pthread_cond_broadcast: 唤醒所有进行

### 条件变量和互斥锁的区别
两个线程操作同一临界区时，通过互斥锁保护，若A线程已经加锁，B线程再加锁时候会被阻塞，直到A释放锁，B再获得锁运行，进程B必须不停的主动获得锁、检查条件、释放锁、再获得锁、再检查、再释放，一直到满足运行的条件的时候才可以（而此过程中其他线程一直在等待该线程的结束），这种方式是比较消耗系统的资源的。而条件变量同样是阻塞，还需要通知才能唤醒，线程被唤醒后，它将重新检查判断条件是否满足，如果还不满足，该线程就休眠了，应该仍阻塞在这里，等待条件满足后被唤醒，节省了线程不断运行浪费的资源。这个过程一般用while语句实现。当线程B发现被锁定的变量不满足条件时会自动的释放锁并把自身置于等待状态，让出CPU的控制权给其它线程。其它线程 此时就有机会去进行操作，当修改完成后再通知那些由于条件不满足而陷入等待状态的线程。这是一种通知模型的同步方式，大大的节省了CPU的计算资源，减少了线程之间的竞争，而且提高了线程之间的系统工作的效率。这种同步方式就是条件变量。

## 总结

![](https://user-images.githubusercontent.com/12036324/64664190-f0a8af80-d480-11e9-8720-047773a702c5.png)



