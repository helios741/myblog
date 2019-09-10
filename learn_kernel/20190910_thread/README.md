[线程：如何让复杂的项目并行执行？](https://time.geekbang.org/column/article/91289)



## 为什么要有线程

- 创建进程太浪费资源
- 进程间通信太费劲

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


github图


## 线程数据

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


可以查看同级目录下面的`mutex.c`,使用下面的命令进行编译看看：
```shell
gcc mutex.c -lpthread
```
https://garlicspace.com/2019/06/20/posix-threads-api-%E6%95%B4%E7%90%86/

