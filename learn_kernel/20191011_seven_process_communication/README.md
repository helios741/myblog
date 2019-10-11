[进程间通信：遇到大项目需要项目组之间的合作才行](https://time.geekbang.org/column/article/101719)

## 管道模型
管道是一种单向传输数据的机制，其实就是一段缓存，里面的数据只能从一端写入从另一段读出。所以如果想互相通信，需要创建两个管道才行。

### 匿名管道
```shell
ps -ef | grep 关键字 | awk '{print $2}' | xargs kill -9
```
竖线代表的管道随着命令的执行自动创建，自动销毁。

### 命名管道

通过mkfifo命令显式的去创建。
```shell
mkfifo hello
```
创建出来的hello就是这个管道的名称。管道文件对应的类型是p，也就是pipe的意思。
```shell
# ls -l
prw-r--r--  1 root root         0 May 21 23:29 hello
```

我们要向管道写一个东西：
```shell
# echo "hello world" > hello
```
然后这个命令就会停在这里，我们想要读取管道中的内容可以再开一个中断：
```shell
# cat < hello
hello world
```

很明显这种方式不适合频繁的数据交换。

## 消息队列模型
消息队列模型就两个人发邮件，有来言有去语。
在消息队列中发送数据，会分为一个一个独立的数据单元，也就是消息体，每个消息体都是固定大小的存储块，在字节流上不连续。



接收方和发送方会提前约定好消息结构，比如下面这样：
```c
struct msg_buffer {
    long mtype;
    char mtext[1024];
};
```
接下来我们需要使用*msgget*创建一个消息队列。这个函数有一个参数，这是消息队列中的唯一标示，应该是唯一的，如果保持唯一呢，就要用到*ftok*这个函数。


我们指定一个文件，ftok会根据这个文件的inode，生成一个近乎唯一的key。只要在这个消息队列的生命周期内，这个文件不被删除就可以了。

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/msg.h>


int main() {
  int messagequeueid;
  key_t key;


  if((key = ftok("/root/messagequeue/messagequeuekey", 1024)) < 0)
  {
      perror("ftok error");
      exit(1);
  }


  printf("Message Queue key: %d.\n", key);


  if ((messagequeueid = msgget(key, IPC_CREAT|0777)) == -1)
  {
      perror("msgget error");
      exit(1);
  }


  printf("Message queue id: %d.\n", messagequeueid);
}
```
在运行程序之前，我们要把*/root/messagequeue/messagequeuekey*这个文件先创建出来。
```shell
# ./a.out
Message Queue key: 92536.
Message queue id: 0.
```
System V IPC 体系有一个统一的命令行工具：ipcmk，ipcs 和 ipcrm 用于创建、查看和删除 IPC 对象。

例如通过ipcs -q就能看到我们刚才创建的消息队列对象.
```shell
# ipcs -q

--------- 消息队列 -----------
键        msqid      拥有者  权限     已用字节数 消息
0x00029dd3 0          root       777        0            0
```
消息队列有了，接下来我们就要调用*msgsnd*，它有四个参数：
1. 消息队列的id
2. 消息的结构体
3. 消息的长度
4. 参数flag。这里面的*IP_NOWAIT*表示发送的时候不阻塞，直接返回。

下面的这段程序，getopt_long、do-while 循环以及 switch，是用来解析命令行参数的。命令行参数的格式定义在 long_options 里面。每一项的第一个成员“id”“type““message”是参数选项的全称，第二个成员都为 1，表示参数选项后面要跟参数，最后一个成员’i’‘t’'m’是参数选项的简称。
```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/msg.h>
#include <getopt.h>
#include <string.h>


struct msg_buffer {
    long mtype;
    char mtext[1024];
};


int main(int argc, char *argv[]) {
  int next_option;
  const char* const short_options = "i:t:m:";
  const struct option long_options[] = {
    { "id", 1, NULL, 'i'},
    { "type", 1, NULL, 't'},
    { "message", 1, NULL, 'm'},
    { NULL, 0, NULL, 0 }
  };

  int messagequeueid = -1;
  struct msg_buffer buffer;
  buffer.mtype = -1;
  int len = -1;
  char * message = NULL;
  do {
    next_option = getopt_long (argc, argv, short_options, long_options, NULL);
    switch (next_option)
    {
      case 'i':
        messagequeueid = atoi(optarg);
        break;
      case 't':
        buffer.mtype = atol(optarg);
        break;
      case 'm':
        message = optarg;
        len = strlen(message) + 1;
        if (len > 1024) {
          perror("message too long.");
          exit(1);
        }
        memcpy(buffer.mtext, message, len);
        break;
      default:
        break;
    }
  }while(next_option != -1);


  if(messagequeueid != -1 && buffer.mtype != -1 && len != -1 && message != NULL){
    if(msgsnd(messagequeueid, &buffer, len, IPC_NOWAIT) == -1){
      perror("fail to send message.");
      exit(1);
    }
  } else {
    perror("arguments error");
  }

  return 0;
}
```
编译运行：
```shell
gcc -o send sendmessage.c
./send -i 0 -t 123 -m "hello helios"
```
在来查看一下消息队列：
```shell
ipcs -q

--------- 消息队列 -----------
键        msqid      拥有者  权限     已用字节数 消息
0x00029dd3 0          root       777        13           1
```

接下来我们看接收消息的函数*msgrcv*，它有五个参数：
1. 消息队列的id
2. 消息的结构体
3. 可接收的最大长度
4. 消息类型
5. flag。这里的IPC_NOWAIT表示接收的时候不阻塞

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/msg.h>
#include <getopt.h>
#include <string.h>


struct msg_buffer {
    long mtype;
    char mtext[1024];
};


int main(int argc, char *argv[]) {
  int next_option;
  const char* const short_options = "i:t:";
  const struct option long_options[] = {
    { "id", 1, NULL, 'i'},
    { "type", 1, NULL, 't'},
    { NULL, 0, NULL, 0 }
  };

  int messagequeueid = -1;
  struct msg_buffer buffer;
  long type = -1;
  do {
    next_option = getopt_long (argc, argv, short_options, long_options, NULL);
    switch (next_option)
    {
      case 'i':
        messagequeueid = atoi(optarg);
        break;
      case 't':
        type = atol(optarg);
        break;
      default:
        break;
    }
  }while(next_option != -1);


  if(messagequeueid != -1 && type != -1){
    if(msgrcv(messagequeueid, &buffer, 1024, type, IPC_NOWAIT) == -1){
      perror("fail to recv message.");
      exit(1);
    }
    printf("received message type : %d, text: %s.", buffer.mtype, buffer.mtext);
  } else {
    perror("arguments error");
  }

  return 0;
}
```
接下来，我们可以编译并运行这个发送程序。可以看到，如果有消息，可以正确地读到消息；如果没有，则返回没有消息。
```shell
# ./recv -i 0 -t 123
received message type : 123, text: hello helios.
# ./recv -i 0 -t 123
fail to recv message.: No message of desired type
```


## 共享内存模型


每个进程都有自己独立的虚拟内存空间，不同进程的虚拟内存空间映射到不同的物理内存。共享内存模型就是拿出一块虚拟内存空间来，映射到相同的物理内存中。

和上面调用*msgget*创建消息队列一样，创建共享内存是通过*shmget*。在这个体系中，创建一个IPC对象都是xxxget，这里面有三个参数：
1. 和*msgget*中的key一样，都是唯一定位一个共享内存对象
2. 共享内存大小
3. flag。如果是IPC_CREAT表示创建一个新的

```c
int shmget(key_t key, size_t size, int flag);
```
创建完毕之后可以通过ipcs查看这个共享内存：
```shell
#ipcs ­­--shmems


------ Shared Memory Segments ------ ­­­­­­­­
key        shmid    owner perms    bytes nattch status
0x00000000 19398656 marc  600    1048576 2      dest
```
接下来，如果一个进程想要访问这一段共享内存，需要将这个内存加载到自己的虚拟地址空间的某个位置，通过 shmat 函数，就是 attach 的意思。其中 addr 就是要指定 attach 到这个地方。但是这个地址的设定难度比较大，除非对于内存布局非常熟悉，否则可能会 attach 到一个非法地址。所以，通常的做法是将 addr 设为 NULL，让内核选一个合适的地址。返回值就是真正被 attach 的地方。
```c
void *shmat(int shm_id, const void *addr, int flag);
```
如果共享内存使用完毕，可以通过 shmdt 解除绑定，然后通过 shmctl，将 cmd 设置为 IPC_RMID，从而删除这个共享内存对象。
```c
int shmdt(void *addr);


int shmctl(int shm_id, int cmd, struct shmid_ds *buf);
```

## 信号量
如果多个进程attach同一个共享内存，大家都往里面写东西，就会冲突。所以需要一种保护机制，使同一个共享资源只能被一个进程访问，在System V IPC进程间通信机制体系中使用*信号量*的方式去控制。

信号量其实就是一个计数器，主要用来实现进程间的互斥和同步，而不是用于存储进程间通信的数据。


我们将信号量初始化为一个数值，表示某种资源的总体数量。对于信号量来说有两种原子操作：
- P操作：申请资源。将信号量的数值减去N
- V操作：归还资源。将信号量加上M


我们通过*semget*创建一个信号量，有三个参数：
1. key：和上面消息队列和共享内存的一样
2. num_smes：不是指的资源数量，而是表示可以创建多少个信号量，形成一组信号量。也就是说你有多种资源需要管理，就可以创建一个信号量组
3. flag：和上面消息队列和共享内存的一样

```c
int semget(key_t key, int num_sems, int sem_flags);
```
接下来我们需要初始化信号量的总资源量，通过*semctl*，有四个参数：
1. 信号量组的id
2. semnum才是信号量组中某个信号量的id
3. 命令。如果是初始化就用*SETVAL*
4. union。如果是初始化，应该用里面的val设置资源总量

```c
int semctl(int semid, int semnum, int cmd, union semun args);


union semun
{
  int val;
  struct semid_ds *buf;
  unsigned short int *array;
  struct seminfo *__buf;
};
```
无论是P操作还是V操作，都统一用*semop*函数，有三个参数：
1. semid：信号量组的id，一次可以操作多个信号量
2. semoparray[]：操作数组，数组中的每一项都是*struct sembuf*，里面的第一个成员是这个操作的对象是哪个信号量。
3. numops：有多少个操作

第二个参数就是要对该信号量做多少改变。如果sem_op < 0，就请求sem_op的绝对值的资源。如果相应的资源数可以满足请求，则将该信号量的值减去 sem_op的绝对值，函数成功返回。


当相应的资源数不能满足请求时，就要看 sem_flg 了。如果把 sem_flg 设置为 IPC_NOWAIT，也就是没有资源也不等待，则 semop 函数出错返回 EAGAIN。如果 sem_flg 没有指定 IPC_NOWAIT，则进程挂起，直到当相应的资源数可以满足请求。若 sem_op > 0，表示进程归还相应的资源数，将 sem_op 的值加到信号量的值上。如果有进程正在休眠等待此信号量，则唤醒它们。

```c
int semop(int semid, struct sembuf semoparray[], size_t numops);


struct sembuf
{
  short sem_num; // 信号量组中对应的序号，0～sem_nums-1
  short sem_op;  // 信号量值在一次操作中的改变量
  short sem_flg; // IPC_NOWAIT, SEM_UNDO
}

```

## 信号

信号主要用于处理异常的情况，信号就是用一个代号一样的数字。Linux提供了几十种信号，分别代表不同的意义。

信号可以在任何时候发送给某一进程，进程需要为这个信号配置信号处理函数。当某个信号发生的时候，就默认执行这个函数就可以了。这就相当于咱们运维一个系统应急手册，当遇到什么情况，做什么事情，都事先准备好，出了事情照着做就可以了。

## 总结


- 管道： 类似瀑布开发模式，命令行中常用的模式
- 消息队列：类似邮件模式，消息队列其实很少使用，因为有太多的用户级别的消息队列，功能更强大。
- 共享内存：类似会议室联合开发的共享内存加信号量
- 信号：类似应急预案的信号，

