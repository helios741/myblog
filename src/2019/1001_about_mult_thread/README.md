# 浅谈python中的多线程编程

## 一、python中的GIL
注：本小节基于cpython解释器。

### 1. 什么是GIL
GIL（Global Interpreter Lock ）本质上类似操作系统的Mutex。对于每个python的线程，在CPython解释器中执行的时候，都会先锁着自己的线程，阻止别的线程执行。
在多线程编程中，如果多个线程引用（操作）同一个变量，那么就会引发Race Condition(竞争条件) 。
CPython为了解决这个问题就引入了GIL，主要有下面两个原因：
- 设计者为了规避类似Race Condition(竞争条件) 的问题
- CPython大量使用了C语言库，大部分的C语言库都不是原生线程安全的，因为线程安全会降低性能和增加复杂度。

### 2. GIL的原理
GIL并不是会锁住一个线程直到这个线程运行完，它有一个*check_interval*的机制，这个机制在python2中和python3中是不一样的：
- python2: 执行时钟的100ticks（对应1000个bytecodes）去释放这个锁
- python3: 执行5ms，然后释放
 
![image](https://user-images.githubusercontent.com/12036324/65946082-f08c4600-e467-11e9-9ab7-83cfd6061138.png)

在python2中当GIL释放之后，所有的线程去抢占的优先级都是一样的，在python3中进程了优化，具体的优化细节可以查看[Reworking the GIL](https://mail.python.org/pipermail/python-dev/2009-October/093321.html)。

### 3. 有了GIL我们的python程序也不是线程安全的
看代码：
```python
total = 0
MAX_N = 3000000
def add():
    global total
    for i in range(MAX_N):
        total += 1
        if 0 == total:
            print("add")
def desc():
    global total
    for i in range(MAX_N):
        total -= 1
        if total == 0:
            print("desc")

import threading
thread1 = threading.Thread(target=add)
thread2 = threading.Thread(target=desc)
thread1.start();thread2.start();
thread1.join();thread2.join()
print(total)
```
无论是我们使用的python2还是python3都会有不定的非0输出（经过笔者测试, 如果把上述代码的MAX_N改为100000，在python3中稳定输出0，python2稳定不对）。
这是结果为什么呢，我们先来看一个简单python函数的字节码：
```python
import dis

total = 0

def add():
    global total
    total += 1

def desc():
    global total
    total -= 1
dis.dis(add)
print("-----")
dis.dis(desc)
```
output:
```shell
   7           0 LOAD_GLOBAL              0 (total)
              3 LOAD_CONST               1 (1)
              6 INPLACE_ADD
              7 STORE_GLOBAL             0 (total)
             10 LOAD_CONST               0 (None)
             13 RETURN_VALUE
-----
 11           0 LOAD_GLOBAL              0 (total)
              3 LOAD_CONST               1 (1)
              6 INPLACE_SUBTRACT
              7 STORE_GLOBAL             0 (total)
             10 LOAD_CONST               0 (None)
             13 RETURN_VALUE
```
1. 当我们运行到add函数的*INPLACE_ADD*的时候，也就add函数就差给total赋值了，比如这个时候total是100，下一步就是*total = 100 + 1*
2. add这个线程的GIL的时间到了，切换为desc这个线程了
3. desc经过了一波操作把total变为20
4. desc这个线程的GIL的时间到了，切换为add这个线程了
5. add接着上次被切换走的配置继续运行，也就是*INPLACE_ADD*这个时候，这个时候
，然后desc有操作了一波total这个变量，total变为20了，这个时候因为desc把total中的值改了，所以就变为*total = 20 + 1*.
上面的过程就是多线程编程常见的Race Condition(竞争条件) 。


所以不要以为有了GIL就不要可以考虑线程之间的安全问题了，**GIL的设计主要是为了方便CPython解释器层面的编写者，而不是python的使用者**。所以我们为了安全还是要用常规多线程编程中的加锁等机制。

## 二、多线程编程

### 实例化类的方式
先看代码：
```python
from threading import Thread
from time import sleep, time
def test():
    print("start")
    sleep(2)
    print("end")

t = Thread(target=test)
start_time = time()
t.start()

print("main thread end, all time is{}".format(time() - start_time))
```
我们通过*threading*下面的*Thread*能够创建一个线程，通过*start()*来启动一个线程。我们来看一下输出：
```shell
start
main thread end, all time is0.000208139419556
end
```
这个很容易理解，test这个线程是主线程的一个子线程，*main thread end...*的运行时间肯定比test这个线程快，所以提前推出了，然后test线程推出了，然后打印了*end*。
我们可以把test这个子线程变为守护进程，代码如下：
```python
from threading import Thread
from time import sleep, time
def test():
    print("start")
    sleep(2)
    print("end")

t = Thread(target=test)
t.setDaemon(True)  # 新增代码
start_time = time()
t.start()

print("main thread end, all time is{}".format(time() - start_time))
```
output：
```shell
start
main thread end, all time is0.000208139419556
```

我们也可以让子线程运行完了，在运行主线程：
```shell
from threading import Thread
from time import sleep, time
def test():
    print("start")
    sleep(2)
    print("end")

t = Thread(target=test)
#t.setDaemon(True)
start_time = time()
t.start()
t.join()

print("main thread end, all time is{}".format(time() - start_time))
```
output:
```shell
start
end
main thread end, all time is2.00586509705
```

### 通过继承的方式
我们可以通过继承Thread这个类来实现：
```python
from threading import Thread
from time import sleep, time

class Test(Thread):
    def __init__(self, name):
        super().__init__(name=name)

    def start(self):
        print("start")
        sleep(2)
        print("end")

t = Test("helios")
start_time = time()
t.start()
print("test thread name is: {}".format(t.name))
print("main thread end, all time is{}".format(time() - start_time))
```
output:
```shell
start
end
test thread name is: helios
main thread end, all time is2.0056819915771484
```


## 三、线程通信
我们来通过一个生产者消费者的例子来说明这个问题。
我们可以通过共享队列的方式去实现通信，队列使用python中提供的[queue](https://docs.python.org/zh-cn/3/library/queue.html#module-queue)，因为queue本身就提供了线程安全，不用我们考虑锁的机制。


生产者消费者模型如下：
![image](https://user-images.githubusercontent.com/12036324/66446629-f1336680-ea7d-11e9-980c-6c54d57d6165.png)
我们先来看看一种比较粗犷的方式：

```python
from queue import Queue

from time import sleep, time
import threading


def consumer(q):
    while True:
        item = q.get()
        print("consumer {} start".format(item))
        sleep(2)
        print("consumer {} end".format(item))


def provider(q):
    print("provider start")
    sleep(3)
    for i in range(20):
        q.put(i)
    print("provider end")
#    while True:
#        print("provider start")
#        sleep(3)
#        for i in range(20):
#            q.put(i)
#        print("provider end")

share_q = Queue(maxsize = 100)
provider_thread = threading.Thread(target=provider, args=(share_q, ))
consumer_thread_1 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_2 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_3 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_4 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_5 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_6 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_9 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_7 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_8 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_10 = threading.Thread(target=consumer, args=(share_q, ))
start_time = time()

provider_thread.start()
consumer_thread_1.start()
consumer_thread_2.start()
consumer_thread_3.start()
consumer_thread_4.start()
consumer_thread_5.start()
consumer_thread_6.start()
consumer_thread_7.start()
consumer_thread_8.start()
consumer_thread_9.start()
consumer_thread_10.start()
provider_thread.join()
consumer_thread_1.join()
consumer_thread_2.join()
consumer_thread_3.join()
consumer_thread_4.join()
consumer_thread_5.join()
consumer_thread_6.join()
consumer_thread_7.join()
consumer_thread_8.join()
consumer_thread_9.join()
consumer_thread_10.join()
print ("last time: {}".format(time()-start_time))
```
很明显我们通过这样的方式如果开多个线程的话，会让代码变得十分ugly。在queue中提供了两个方法：
- join(): 阻塞到当前队列没有任务
- task_done():  每执行完队列中的一个任务，调用task_done方法通知队列，这个任务已经完成了。
很多人对join和task_done的关系不算理解，他们的关系可以用下图表示：

最开始：
![image](https://user-images.githubusercontent.com/12036324/66447299-97806b80-ea80-11e9-942a-5ff694cf3935.png)
当有个任务（比如说任务3）调用了task_done，就会变为：
![image](https://user-images.githubusercontent.com/12036324/66447433-cdbdeb00-ea80-11e9-8e44-d8f70baf62a5.png)
![image](https://user-images.githubusercontent.com/12036324/66447443-d6162600-ea80-11e9-8271-066b3852ea53.png)
到最后变为：
![image](https://user-images.githubusercontent.com/12036324/66447466-f645e500-ea80-11e9-90fa-6fc984a251c2.png)

我们理解了*join()* 和*task_done()*之后在看看看使用*join()* 和*task_done()*如何写：
```python
from queue import Queue

from time import sleep, time
import threading


def consumer(q):
    while True:
        item = q.get()
        print("consumer {} start".format(item))
        sleep(2)
        print("consumer {} end".format(item))
        q.task_done()


def provider(q):
    print("provider start")
    sleep(3)
    for i in range(20):
        q.put(i)
    print("provider end")
#    while True:
#        print("provider start")
#        sleep(3)
#        for i in range(20):
#            q.put(i)
#        print("provider end")

share_q = Queue(maxsize = 100)
provider_thread = threading.Thread(target=provider, args=(share_q, ))
provider_thread.start()
provider_thread.join()
for i in range(10):
    consumer_thread = threading.Thread(target=consumer, args=(share_q, ))
    consumer_thread.start()
start_time = time()

share_q.join()

print ("last time: {}".format(time()-start_time))
```

## 四、线程同步

当有两个以上线程对共享内存操作的时候（至少有一个写操作），就会产生竞争条件，这个时候就会导致执行代码出现异常，就像我们最开始讲GIL的时候的那个例子，本来我们对一个变量加*MAX_N*次又减了*MAX_N*次，最后结果是0，但是结果总是出人意料。


### 1. Lock
这也是最常用，最典型的一种方式了，我们先来看代码：
```python
import threading

total = 0
MAX_N = 300000
lock = threading.Lock()

def add():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        total += 1
        lock.release()
def desc():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        total -= 1
        lock.release()

thread1 = threading.Thread(target=add)
thread2 = threading.Thread(target=desc)
thread1.start();thread2.start();
thread1.join();thread2.join()
print(total)
```

锁又两种状态： locked（被某一线程拿到）和unlocked（可用状态）
他们遵循下面的规则：
- 状态为unlocked： 可以调用`acquire()`将状态改为locked
- 状态为locked：`acquire()`会被阻塞到另一线程调用`release()`释放锁
- 状态为unlocked：调用`release()`将导致*RuntimeError*

但是这种方式就是容易出现死锁，如下图：
![image](https://user-images.githubusercontent.com/12036324/66448578-8df90280-ea84-11e9-8f99-6a48e2bba5db.png)

### 2. RLock

*RLock*和*Lock*相比有下面两个特点：
1. 谁拿到谁释放：线程A拿到的锁，线程B是没有办法释放的
2. 一个线程能过多次拿锁，但这就意味着要释放多次，最后一次才能改为RLock的状态为unlocked。
```python
import threading

total = 0
MAX_N = 300000
lock = threading.RLock()

def add():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        lock.acquire()
        total += 1
        lock.release()
        lock.release()
def desc():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        total -= 1
        lock.release()

thread1 = threading.Thread(target=add)
thread2 = threading.Thread(target=desc)
thread1.start();thread2.start();
thread1.join();thread2.join()
print(total)
```

### 3. Condition（条件变量）

*条件变量*类似发布订阅者模式，
- 订阅者（wait）： 一些线程等待通知，等通知到了就能访问共享资源了
- 发布者（notify/notify_all）： 一些到达某些条件会通知其他线程，能够去访问共享资源了

```python
from threading import Thread, Condition
import time

items = []
condition = Condition()


class Producer(Thread):

    def produce(self):
        global condition
        global items
        condition.acquire()
        if len(items) == 5:
            print("Producer start wait notify")
            condition.wait()
            print("Producer success wait notify")
        items.append(1)
        print("Producer start notify, len(item):{}".format(len(items)))
        condition.notify()
        condition.release()

    def run(self):
        for i in range(0, 20):
            time.sleep(1)
            self.produce()

class Consumer(Thread):
    def consume(self):
        global condition
        global items
        condition.acquire()
        if len(items) == 0:
            print("Consumer start wait notify")
            condition.wait()
            print("Consumer success wait notify")
        items.pop()

        print("Consumer notify : items to consume are " + str(len(items)))

        condition.notify()
        condition.release()

    def run(self):
        for i in range(20):
            time.sleep(2)
            self.consume()

producer = Producer()
consumer = Consumer()
producer.start()
consumer.start()
producer.join()
consumer.join()
```
调用*wait()*会释放锁，等到被唤醒的时候又会把这锁加上，下图来源于网络，画的挺清晰的：
![image](https://user-images.githubusercontent.com/12036324/66531239-a7aa5080-eb3d-11e9-95cb-d9fca60af250.png)

注：
有兴趣的读者可以看一下Condition的源码，内部是基于上面说的*RLock*实现的

### 4. Semaphores(信号量)
信号量机制就是说明共享资源能够同时被多少个线程并发读取。

- 线程想要读取通过信号量关联的共享资源的时候，必须调用*acquire()*方法，这个操作减少信号量的内部变量的值：
    + 如果当前内部变量的值 >= 0：分配该线程能够访问共享资源的权限
    + 如果当前内部变量的值 < 0：线程被挂起，知道其他的线程释放资源
- 当线程使用完共享变量的时候，必须通过*release()*去释放，这个时候信号量的内部变量的值就会加一，以前挂起的线程就能获得访问共享资源的权限。
![image](https://user-images.githubusercontent.com/12036324/66532035-86972f00-eb40-11e9-88a3-3f985bf4e6a4.png)
```python
import threading
import time


class Consumer(threading.Thread):
    def __init__(self, v, sem):
        super().__init__()
        self.sem = sem
        self.value = v

    def run(self):
        time.sleep(2)
        print("-------{}-----".format(self.value))
        self.sem.release()

class Producer(threading.Thread):
    def __init__(self, sem):
        super().__init__()
        self.sem = sem
    def run(self):
        for i in range(10):
            self.sem.acquire()
            t = Consumer(i, self.sem)
            t.start()
sem = threading.Semaphore(3)
for i in range(3):
    producer = Producer(sem)
    producer.start()
```

注：
有兴趣的读者可以看一下Semaphores的源码，内部是基于上面说的*Condition*实现的

### 4. event

event是最简单的同步机制了（内部也是基于*Condition*实现的）。有的线程等待信号，有的线程发送信号，这就更类似于发布订阅者模式了是不是。
一个事件对象管理一个内部标识位，主要有三个函数：
- set(): 将内部标识位设置为true。所有正在等待这个事件的线程将被唤醒。当标志为true时，调用 wait() 方法的线程不会被被阻塞。
- clear(): 将内部标志设置为false。之后调用 wait() 方法的线程将会被阻塞，直到调用 set() 方法将内部标志再次设置为true。
- wait(timeout=None): 阻塞线程直到内部变量为true。如果调用时内部标志为true，将立即返回。否则将阻塞线程，直到调用 set() 方法将标志设置为true或者发生可选的超时。

```python
import time
from threading import Thread, Event
import random

items = []
event = Event()

class Consumer(Thread):
    def __init__(self, items, event):
        Thread.__init__(self)
        self.items = items
        self.event = event

    def run(self):
        while True:
            time.sleep(2)
            self.event.wait()
            item = self.items.pop()
            print("Consumer notify : current item is {}, list is {}".format(item, self.items))


class Producer(Thread):
    def __init__(self, items, event):
        Thread.__init__(self)
        self.items = items
        self.event = event

    def run(self):
        for i in range(100):
            time.sleep(2)
            item = random.randint(0, 256)
            self.items.append(item)
            print("Producer notify : current item is {}, list is {}".format(item, self.items))

            print("Producer start set")
            self.event.set()
            print("Producer start clear")
            self.event.clear()

t1 = Producer(items, event)
t2 = Consumer(items, event)
t1.start()
t2.start()
t1.join()
t2.join()

print("main thread ending")
```
![image](https://user-images.githubusercontent.com/12036324/66533743-9ca7ee00-eb46-11e9-83ab-9489366a0087.png)

### 5. 栅栏对象
栅栏类提供一个简单的同步原语，用于应对固定数量的线程需要彼此相互等待的情况。线程调用 wait() 方法后将阻塞，直到所有线程都调用了 wait() 方法。此时所有线程将被同时释放。

就是当一个任务需要多个线程同时合作完成的时候就派上了用场。
```python
import threading

def work(barrier):
    print('n_waitting = {}'.format(barrier.n_waiting))
    try:
        bid = barrier.wait()
        print("this bid is: {}".format(bid))
    except threading.BrokenBarrierError as err:
        print("threading.BrokenBarrierError err is : {}".format(err))

barrier = threading.Barrier(3)

for i in range(3):
    t = threading.Thread(target=work, args=(barrier,))
    t.start()
```


### 6. 在 with 语句中使用锁、条件和信号量

```python
import threading

def thread_with(stat):
    with stat:
        print("have with , stat is: {}".format(stat))

def thread_no_with(stat):
    stat.acquire()
    try:
        print("no with, stat is: {}".format(stat))
    finally:
        stat.release()


lock = threading.Lock()
rlock = threading.RLock()
cond = threading.Condition()
mutex = threading.Semaphore(1)
list = [lock, rlock, cond, mutex]

for stat in list:
    t1 = threading.Thread(target=thread_with, args=(stat, ))
    t2 = threading.Thread(target=thread_no_with, args=(stat, ))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
```

很明显通过with语句会更加简洁一些。这些线程模块提供的带有 acquire() 和 release() 方法的对象，可以被用作 with 语句的上下文管理器。当进入语句块时 acquire() 方法会被调用，退出语句块时 release() 会被调用。


## 五、总结

在这篇文章中，首先讲述了CPython解释器中GIL的相关内容，让你理解了人们经常谈论的python慢的原因是什么，如果想更加深入的了解GIL，可以阅读我推荐的几篇文章：

-  David Beazley2010年关于GIL的演讲PDF：[UnderstandingGIL](http://www.dabeaz.com/python/UnderstandingGIL.pdf)
- GIL官方文档： [term-global-interpreter-lock](https://docs.python.org/dev/glossary.html#term-global-interpreter-lock)
- 为什么python解释器不是线程安全的：[Why is the Python interpreter not thread safe?](https://stackoverflow.com/questions/49090416/why-is-the-python-interpreter-not-thread-safe)
- python的wiki关于GIL的介绍：[GlobalInterpreterLock](https://wiki.python.org/moin/GlobalInterpreterLock)
- [why-is-my-python-app-stalled-with-system-kernel-cpu-time](https://stackoverflow.com/questions/27810561/why-is-my-python-app-stalled-with-system-kernel-cpu-time)
- 中文的一个写的比较好的全局解释器的文章：[CPython-Internals gil](https://github.com/zpoint/CPython-Internals/blob/master/Interpreter/gil/gil_cn.md)
- python3重写了GIL的相关内容：[Reworking the GIL](https://mail.python.org/pipermail/python-dev/2009-October/093321.html)

然后介绍了python中使用多线程编程的两种方式，实例化*threading.Thread*和继承*threading.Thread*。通过实例化的方式使用起来比较简单，使用继承的方式更加具有封装性。

接着介绍了通过queue实现线程间的通信。
最后介绍了关于线程间同步的五种方法以及使用with语句让代码更简洁，易读。

## 参考

- [multi-threading](https://docs.python.org/3/whatsnew/3.2.html#multi-threading)
- [基于线程的并行](https://python-parallel-programmning-cookbook.readthedocs.io/zh_CN/latest/chapter2/index.html)
- [threading](https://docs.python.org/zh-cn/3/library/threading.html)
