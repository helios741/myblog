[IPC（上）：不同项目组之间抢资源，如何协调？](https://time.geekbang.org/column/article/103724)

共享内存和信号量也是 System V 系列的进程间通信机制.为了将共享内存和信号量结合起来使用，我这里定义了一个 share.h 头文件，里面放了一些共享内存和信号量在每个进程都需要的函数。
```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/sem.h>
#include <string.h>

#define MAX_NUM 128

struct shm_data {
  int data[MAX_NUM];
  int datalength;
};

union semun {
  int val;
  struct semid_ds *buf;
  unsigned short int *array;
  struct seminfo *__buf;
};

int get_shmid(){
  int shmid;
  key_t key;

  if((key = ftok("/root/sharememory/sharememorykey", 1024)) < 0){
      perror("ftok error");
          return -1;
  }

  shmid = shmget(key, sizeof(struct shm_data), IPC_CREAT|0777);
  return shmid;
}

int get_semaphoreid(){
  int semid;
  key_t key;

  if((key = ftok("/root/sharememory/semaphorekey", 1024)) < 0){
      perror("ftok error");
          return -1;
  }

  semid = semget(key, 1, IPC_CREAT|0777);
  return semid;
}

int semaphore_init (int semid) {
  union semun argument;
  unsigned short values[1];
  values[0] = 1;
  argument.array = values;
  return semctl (semid, 0, SETALL, argument);
}

int semaphore_p (int semid) {
  struct sembuf operations[1];
  operations[0].sem_num = 0;
  operations[0].sem_op = -1;
  operations[0].sem_flg = SEM_UNDO;
  return semop (semid, operations, 1);
}

int semaphore_v (int semid) {
  struct sembuf operations[1];
  operations[0].sem_num = 0;
  operations[0].sem_op = 1;
  operations[0].sem_flg = SEM_UNDO;
  return semop (semid, operations, 1);
}
```
## 共享内存
共享内存的操作需要下面几步：
1. 生成一个可以唯一表识这个共享内存的key，这个key可以是根据文件系统上的一个文件的inode随机生成。
2. 我们需要创建一个共享内存，和消息队列差不多，通过xxxget创建，创建共享内存使用下面这个函数：
```c
int shmget(key_t key, size_t size, int shmflag);
```
    - key_t key: 就是第一步生成的那个key
    - shmflag：如果为IPC_CREATE表示新创建，还可以指定读写权限0777
    - size：共享内存的大小。申请内存的最佳实践：把共享数据放在一个struct中，size就是这个struct的大小。这样每一个进程得到这个内存后，只要强制类型转换为这个struct类型，就能访问里面的共享数据
3. 定义了strcut shm_data结构（share.h），里面又两个成员，一个是整型数组，另一个是数组中元素的个数
4. 将这个共享内存映射到进程的虚拟地址中，用下面这个函数
```c
void *shmat(int  shm_id, const  void *addr, int shmflg);
```
    - shm_id: 上面创建的共享内存的id
    - addr：指定映射的地方，如果不指定，则内核会自动选择一个地址作为返回值返回，得到这个地址后我们需要将这个地址强制转换为shm_data结构
5. 共享内存使用完毕，可以通过*shmdt*接触他到虚拟内存的映射
```c
int shmdt(const  void *shmaddr)；
```


## 信号量
操作信号量的过程。

1. 生成key
2. 创建信号量
```c
int semget(key_t key, int nsems, int semflg);
```
    - key: 第一步的key
    - semflg: IPC_CREAT表示新创建还可以指定读写权限0777
    - nsems: 表示这个信号量集合中又几个信号量，最简单的情况下，我们设置为1

信号量代表某种资源的数量，如果用信号量做互斥，那往往信号量设置为1。这就是上面*semaphore_init*的作用，这个函数调用semctl，将这个信号量集合中的第0个信号量也就是唯一的信号量设置为1.


我们通过这个信号量来保护共享内存*struct shm_data*，使得同时只有一个进程可以操作这个结构。

下面是生产者和消费者例子：
producer.c
```c
#include "share.h"

int main() {
  void *shm = NULL;
  struct shm_data *shared = NULL;
  int shmid = get_shmid();
  int semid = get_semaphoreid();
  int i;

  shm = shmat(shmid, (void*)0, 0);
  if(shm == (void*)-1){
    exit(0);
  }
  shared = (struct shm_data*)shm;
  memset(shared, 0, sizeof(struct shm_data));
  semaphore_init(semid);
  while(1){
    semaphore_p(semid);
    if(shared->datalength > 0){
      semaphore_v(semid);
      sleep(1);
    } else {
      printf("how many integers to caculate : ");
      scanf("%d",&shared->datalength);
      if(shared->datalength > MAX_NUM){
        perror("too many integers.");
        shared->datalength = 0;
        semaphore_v(semid);
        exit(1);
      }
      for(i=0;i<shared->datalength;i++){
        printf("Input the %d integer : ", i);
        scanf("%d",&shared->data[i]);
      }
      semaphore_v(semid);
    }
  }
}
```
在无限循环里面，我们先通过 semaphore_p 申请访问共享内存的权利，如果发现 datalength 大于零，说明共享内存里面的数据没有被处理过，于是 semaphore_v 释放权利，先睡一会儿，睡醒了再看。如果发现 datalength 等于 0，说明共享内存里面的数据被处理完了，于是开始往里面放数据。让用户输入多少个数，然后每个数是什么，都放在 struct shm_data 结构中，然后 semaphore_v 释放权利，等待其他的进程将这些数拿去处理。

下面是consumer的代码：
```c
#include "share.h"

int main() {
  void *shm = NULL;
  struct shm_data *shared = NULL;
  int shmid = get_shmid();
  int semid = get_semaphoreid();
  int i;

  shm = shmat(shmid, (void*)0, 0);
  if(shm == (void*)-1){
    exit(0);
  }
  shared = (struct shm_data*)shm;
  while(1){
    semaphore_p(semid);
    if(shared->datalength > 0){
      int sum = 0;
      for(i=0;i<shared->datalength-1;i++){
        printf("%d+",shared->data[i]);
        sum += shared->data[i];
      }
      printf("%d",shared->data[shared->datalength-1]);
      sum += shared->data[shared->datalength-1];
      printf("=%d\n",sum);
      memset(shared, 0, sizeof(struct shm_data));
      semaphore_v(semid);
    } else {
      semaphore_v(semid);
      printf("no tasks, waiting.\n");
      sleep(1);
    }
  }
}
```
consumer的无限循环里面，我们先通过 semaphore_p 申请访问共享内存的权利，如果发现 datalength 等于 0，就说明没什么活干，需要等待。如果发现 datalength 大于 0，就说明有活干，于是将 datalength 个整型数字从 data 数组中取出来求和。最后将 struct shm_data 清空为 0，表示任务处理完毕，通过 semaphore_v 释放权利。


通过程序创建的共享内存和信号量集合，我们可以通过命令 ipcs 查看。当然，我们也可以通过 ipcrm 进行删除。
```shell
# ipcs
------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status
0x00016988 32768      root       777        516        0
------ Semaphore Arrays --------
key        semid      owner      perms      nsems
0x00016989 32768      root       777        1
```

## 总结
- 无论是共享内存还是信号量，创建与初始化都遵循同样流程，通过 ftok 得到 key，通过 xxxget 创建对象并生成 id；
- 生产者和消费者都通过 shmat 将共享内存映射到各自的内存空间，在不同的进程里面映射的位置不同；
- 为了访问共享内存，需要信号量进行保护，信号量需要通过 semctl 初始化为某个值；
- 接下来生产者和消费者要通过 semop(-1) 来竞争信号量，如果生产者抢到信号量则写入，然后通过 semop(+1) 释放信号量，如果消费者抢到信号量则读出，然后通过 semop(+1) 释放信号量；
- 共享内存使用完毕，可以通过 shmdt 来解除映射。

![image](https://user-images.githubusercontent.com/12036324/66795977-cf802680-ef38-11e9-8613-f6c67d07a1dc.png)

## 问题
信号量大于 1 的情况下，应该如何使用？你可以试着构建一个场景。
