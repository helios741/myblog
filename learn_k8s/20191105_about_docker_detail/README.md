
## docker的版本

docker CE在17.3之前叫做Docker Engine，版本见：[Docker Engine release notes](https://docs.docker.com/release-notes/docker-engine/)

在这之后就按照年月去命名了。每个季度会发一个版本。

## dockerd的作用是啥


### 参考
- [Understanding the Docker Internals](https://medium.com/@nagarwal/understanding-the-docker-internals-7ccb052ce9fe)
- [Docker Namespace and Cgroups](https://medium.com/@kasunmaduraeng/docker-namespace-and-cgroups-dece27c209c7)


### var/run/docker.sock 的作用

container和docker deamon之间通信的。

![image](https://user-images.githubusercontent.com/12036324/68357900-cbb77c80-0151-11ea-9f8e-eea32b07b894.png)

### 参考
- [Docker源码分析（二）之Docker Daemon](https://www.huweihuang.com/article/docker/code-analysis/code-analysis-of-docker-daemon/)
- [Docker 源码分析（三）：Docker Daemon 启动](https://www.infoq.cn/article/docker-source-code-analysis-part3)
- [Docker命令行与守护进程如何交互？](https://blog.fundebug.com/2017/05/22/docker-cli-daemon/)
- [关于/var/run/docker.sock](https://blog.fundebug.com/2017/04/17/about-docker-sock/)
- [docker doc： 配置daemon](https://docs.docker.com/config/daemon/)


## docker默认开始了多少中namespace
http://man7.org/linux/man-pages/man7/keyrings.7.html


### 一、共享pid
[pid](https://docs.docker.com/engine/reference/run/#pid-settings---pid)
```shell
docker run -ti -d --name helios docker-search.4pd.io/centos sleep 360
docker run -ti --entrypoint=bash --pid=container:helios docker-search.4pd.io/centos
[root@08f5f68fb0de /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 01:39 pts/0    00:00:00 /usr/bin/coreutils --coreutils-prog-shebang=sleep /usr/bin/sleep 360
root         6     0  2 01:40 pts/0    00:00:00 bash
root        19     6  0 01:40 pts/0    00:00:00 ps -ef
```

### 二、共享hostname/domain
[UTS](https://docs.docker.com/engine/reference/run/#pid-settings---pid)

UNIX Time-sharing System: 用来隔离hostname以及NIS domain name。
```shell
docker run -ti --entrypoint=bash --hostname dajiahao docker-search.4pd.io/centos
[root@dajiahao /]# exit
```

### 三、容器间通信

[IPC](https://docs.docker.com/engine/reference/run/#ipc-settings---ipc)
关于进程间通信，可以回顾一下：[Linux内核笔记：进程通信](https://github.com/helios741/myblog/tree/new/learn_go/learn_kernel/20191015_seven_process_ipc_pre#%E5%85%B1%E4%BA%AB%E5%86%85%E5%AD%98)
进程之间通信分为两个步骤：
1. 创建唯一标识
2. 通过唯一标识创建共享内存
通过下面的程序演示一下：
1. 在linux机器上通过gcc编译下面代码
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
2. 通过bind mount的方式，放在一个容器里面，同以ipc为shareable的方式时启动这个容器
```shell
docker run -d  --name=helios -v ~/a.out:/root/a.out --ipc=shareable docker-search.4pd.io/centos sleep 3600
```
3. 启动另一个容器，共享刚才上面启的容器，并且查看ipc
```shell
docker run -ti --entrypoint=bash --ipc=container:helios  docker-search.4pd.io/centos
```
```shell
[root@917a252012ee /]# ipcs

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages

------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status

------ Semaphore Arrays --------
key        semid      owner      perms      nsems
```
4. 在主容器（被共享的那个）创建共享内存
执行：*./a.out*
查看ipc
```shell
pcs

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
0x00030350 0          root       777        0            0

------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status

------ Semaphore Arrays --------
key        semid      owner      perms      nsems
```
5. 查看第二个容器的ipc，确认已经共享
```shell
[root@545ca6c969da /]# ipcs

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
0x00030350 0          root       777        0            0

------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status

------ Semaphore Arrays --------
key        semid      owner      perms      nsems
```

### 四、network namespace

[network-settings](https://docs.docker.com/engine/reference/run/#network-settings)


### 五、mount namespace

这个应该就没啥了，理解chroot就行了。

### 六、user namespace


### 七、cgroup namespace

### 进入namespace的方法

1. nsenter(进入一个已经存在的namespace)
```shell
nsenter --target 16289 --mount --uts --ipc --net --pid -- env --ignore-environment -- /bin/bash
```
2. unshare（创建一个进程，指定隔离哪些namespace）

```shell
unshare --mount --ipc --pid --mount-proc=/proc --fork /bin/bash
```
*mount*, *ipc*, *pid*都用了新的namespace。

对于PID namespace就比较特殊了，因为getpid会根据调用者的当前所在的PID namespace的pid。但是对于用户态程序或者库函数来言，他们认为进程的pid是个常量，PID的变化会引起这些进程的崩溃。

### 参考
- [Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)
- [Introduction to User Namespaces in Docker Engine](https://success.docker.com/article/introduction-to-user-namespaces-in-docker-engine)
- [Docker Namespace and Cgroups](https://medium.com/@kasunmaduraeng/docker-namespace-and-cgroups-dece27c209c7)
- [中文：Linux Namespace : PID](https://www.cnblogs.com/sparkdev/p/9442208.html)
- 容器与容器云3.1.1节

## namespace不能隔离的东西

## 为什么不敢把容器环境暴露到公网上


## Cgroup能够限制什么


## CGroup出了限制还能做什么


## cgroup挂载到哪个目录下，怎么看

## cgroup挂载的目录下面的目录含义



## 在cgroup下面的某个目录中新建一个目录，出现的各个文件的内容含义是什么


## docker的cgroup有哪些不完善的地方


## 如何修复容器中的 top 指令以及 /proc 文件系统中的信息呢?(提示:lxcfs)


## 在从虚拟机向容器环境迁移应用的过程中，你还遇到哪些容器与虚拟机的不一致问题


## Mount Namespace什么时候生效
Mount Namespace修改的是容器进程对文件系统“挂载点”的认知。这也就意味着只有挂载这个操作发生之后，进程的试图才会被改变。在这之前，新创建的容器会直接继承宿主机的各个挂载点。

![image](https://user-images.githubusercontent.com/12036324/68525751-df104680-030f-11ea-9078-16fdbc23dd2b.png)

一个挂载状态可以有一下几种：
- 共享挂载（shared）
- 从属挂载（slave）
- 共享 / 从属挂载（shared and slave）
- 私有挂载（private）
- 不可绑定挂载（unbindable）

### 共享关系（share relationship）
如果两个挂载对象具有共享关系，那么一个挂载对象中的挂载事件会传播到另一个挂载对象，反之亦然。
### 从属关系（slave relationship）
如果两个挂载对象形成从属关系，那么一个挂载对象中的挂载事件会传播到另一个挂载对象，但是反过来不行；在这种关系中，从属对象是事件的接收者。



### 参考
- [Docker 背后的内核知识——Namespace 资源隔离](https://www.infoq.cn/article/docker-kernel-knowledge-namespace-resource-isolation)


## chroot的原理和用法
原理：改变进程的根目录到指定的目录
用法：
```shell
mkdir -p ~/test_home
mkdir -p ~/test_home/{bin,lib64,lib}
cp -v /bin/{bash,ls} ~/test_home/bin/
T=~/test_home
list="$(ldd /bin/ls | egrep -o '/lib.*\.[0-9]')"
cp /lib64/libtinfo.so.5 $T/lib64
[root@172_27_132_95 ~]# chroot ~/test_home /bin/bash
bash-4.2# /bin/ls
bin  lib  lib64
```


## Docker的核心原理（三个）

1. 启动linux namespace的配置
2. 设置指定的Cgroups参数
3. 切换进程的根目录(chroot)

## 什么是rootfs



## pivot_root和chroot的区别

- pivot_root: 把进程切换到一个新的目录，对之前的root文件系统不再有依赖，这样就能unmount原来的文件系统了。
- chroot: 只是更改了root目录，还会依赖老的文件系统，主要的目的是为了先知用户的访问

## 什么是union File System


## docker支持多少种存储驱动，有什么异同
https://docs.docker.com/storage/storagedriver/select-storage-driver/


## docker镜像怎么使用数据存储驱动的


## Dockerfile 和rootfs的区别和联系


## CMD和entrypoint的区别

## 简单的通过rootfs实现Dockerfile的功能

## 容器既然是一个封闭的进程，那么外接程序是如何进入容器这个进程的呢（docker exec 怎么实现的）

## docker的volume的挂载机制怎么做的

## bind mount 原理


## docker commit对挂载点volume内容修改的影响是什么



## linux 4.6之后新增加的cgroup namespace的作用是什么


## 如果你执行 docker run -v /home:/test 的时候，容器镜像里的 /test 目录下本来就有内容 的话，你会发现，在宿主机的 /home 目录下，也会出现这些内容。这是怎么回事?为什么 它们没有被绑定挂载隐藏起来呢?(提示:Docker 的“copyData”功能)


## 请尝试给这个 Python 应用加上 CPU 和 Memory 限制，然后启动它。根据我们前面介绍 的 Cgroups 的知识，请你查看一下这个容器的 Cgroups 文件系统的设置，是不是跟我前 面的讲解一致。


## Docker的swarm和k8s在架构上的异同


## 编排和调度的区别


## k8s解决的是什么问题


## k8s中每个组件是干了啥



