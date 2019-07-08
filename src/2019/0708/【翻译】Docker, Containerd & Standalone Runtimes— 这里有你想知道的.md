这片文章旨在想您介绍Containerd在docker架构中的集成。


让我们先来定义Docker Daemon然后看它是如何定义进docker架构和Containerd当中的。


## Docker Daemon


像进程有守护进程一样（Like the init has its daemon）， cron有crond, dhcp有dhcpd, Docker 也有自己的守护进程dockerd。



你能使用下面的命令列出所有的Linux的守护进程：

```shell
ps -U0 -o ‘tty,pid,comm’ | grep ^?
```

译者注：
```shell
# 译者使用的是centos 7，原作者的命令不能用，要用下面的
ps -eo tty,pid,comm | grep ^? 
```

并且在输出中grep出dockerd

```shell

ps -U0 -o ‘tty,pid,comm’ | grep ^?|grep -i dockerd 
# 译者注：同上，要用：ps -eo tty,pid,comm | grep ^? |grep -i dockerd 
? 2779 dockerd
```


你可可能会看到` docker-containerd-shim`，我们将要这篇文章的后面去讲解。

如果你已经运行了docker，那么当你在命令后输入`dockerd`的时候会出现类似下面的信息：
```shell
FATA[0000] Error starting daemon: pid file found, ensure docker is not running or delete /var/run/docker.pid
```

现在让我们来停止docker：

```shell
systemctl stop docker
```

然后在命令行使用`dockerd`命令运行守护进程。

使用`dockerd`在命令行运行docker的守护进程是一个很好的debug工具，你能在命令行上看到真实的运行轨迹。

```shell
INFO[0000] libcontainerd: new containerd process, pid: 19717 
WARN[0000] containerd: low RLIMIT_NOFILE changing to max  current=1024 max=4096
INFO[0001] [graphdriver] using prior storage driver "aufs" 
INFO[0003] Graph migration to content-addressability took 0.63 seconds 
WARN[0003] Your kernel does not support swap memory limit. 
WARN[0003] mountpoint for pids not found                
INFO[0003] Loading containers: start.                   
INFO[0003] Firewalld running: false                     
INFO[0004] Removing stale sandbox ingress_sbox (ingress-sbox) 
INFO[0004] Default bridge (docker0) is assigned with an IP address 172.17.0.0/16. Daemon option --bip can be used to set a preferred IP address
INFO[0004] Loading containers: done.                    
INFO[0004] Listening for local connections               addr=/var/lib/docker/swarm/control.sock proto=unix
INFO[0004] Listening for connections                     addr=[::]:2377 proto=tcp
INFO[0004] 61c88d41fce85c57 became follower at term 12  
INFO[0004] newRaft 61c88d41fce85c57 [peers: [], term: 12, commit: 290, applied: 0, lastindex: 290, lastterm: 12] 
INFO[0004] 61c88d41fce85c57 is starting a new election at term 12 
INFO[0004] 61c88d41fce85c57 became candidate at term 13 
INFO[0004] 61c88d41fce85c57 received vote from 61c88d41fce85c57 at term 13 
INFO[0004] 61c88d41fce85c57 became leader at term 13    
INFO[0004] raft.node: 61c88d41fce85c57 elected leader 61c88d41fce85c57 at term 13 
INFO[0004] Initializing Libnetwork Agent Listen-Addr=0.0.0.0 Local-addr=192.168.0.47 Adv-addr=192.168.0.47 Remote-addr = 
INFO[0004] Daemon has completed initialization          
INFO[0004] Initializing Libnetwork Agent Listen-Addr=0.0.0.0 Local-addr=192.168.0.47 Adv-addr=192.168.0.47 Remote-addr = 
INFO[0004] Docker daemon                                 commit=7392c3b graphdriver=aufs version=1.12.5
INFO[0004] Gossip cluster hostname eonSpider-3e64aecb2dd5 
INFO[0004] API listen on /var/run/docker.sock           
INFO[0004] No non-localhost DNS nameservers are left in resolv.conf. Using default external servers : [nameserver 8.8.8.8 nameserver 8.8.4.4] 
INFO[0004] IPv6 enabled; Adding default IPv6 external servers : [nameserver 2001:4860:4860::8888 nameserver 2001:4860:4860::8844] 
INFO[0000] Firewalld running: false
```

现在如果你在另一个窗口运行或者删除一个容器，你就能看到docker的守护进程连接了docker的客户端和容器。



下面是docker的全局架构（docker的C/S架构）：
![image](https://user-images.githubusercontent.com/12036324/60764321-e4d3f200-a0b9-11e9-9c35-4a60b5879f08.png)

## Containerd

它的目的是破坏docker架构中的模块化（its purpose is breaking up more modularity to Docker architecture）和与其他行业参（云提供者以及编排服务）与者相比更加中立。

据Solomon Hykes说，截止到2016年的4月，被包含在Docker 1.11中的Containerd已经被部署在数百万的机器中，宣布扩展Containerd的roadmap得到了许多云提供厂商的一件，这些云厂商包括阿里云，AWS，谷歌，IBM，微软和其他容器生态系统的活跃成员。


更多的docker引擎的功能将要被添加到containerd中，以至于containerd 1.0将要提供在linux或者windows上管理容器的所有原语：

- 容器的执行和监督（supervision）
- 镜像分发（Image distribution）
- 网络接口管理
- 本地存储
- 原生管道（plumbing）级API
- 完整的OCI支持，以及扩展的OCI镜像规范

你可能为了构建，传输，运行容器化应用继续使用docker，但是如果你寻找一种标准化组建那么你可以考虑containerd。


Docker Engine 1.11是第一个基于runC（基于OCI技术的runtime）和containerd构建的版本。下图是containerd的集成架构：
![image](https://user-images.githubusercontent.com/12036324/60764922-c1627480-a0c4-11e9-8fa3-069d9202b27f.png)

Open Container Initiative (OCI)组织成立于2015年的6月，旨在建立容器的通用标准为了避免在容器系统内部可能存在的碎片和分裂。

它包含两个标准：
- runtime-spec： runtime标准
- image-spec： 镜像标准

runtime规范概述了如何在磁盘上解压文件系统包。
- 一个标准化容器系统包应该包括所需的配置和信息，为了加载和运行容器，这个配置包含包的在根目录中的config.json里面
- 一个标准化的容器包应该包括代表容器根文件系统的所有目录，一般这个目录类似rootfs的常规名称。

如果你导出和提出一个镜像你能看到这个json的文件。下面的这个例子，我们将要使用busybox作为例子：

```shell
mkdir my_container
cd my_container
mkdir rootfs
docker export $(docker create busybox) | tar -C rootfs -xvf -
```

现在我们在rootfs中已经有一个提取出来的busybox的镜像。

```shell
tree -d my_container/
my_container/
└── rootfs
    ├── bin
    ├── dev
    │   ├── pts
    │   └── shm
    ├── etc
    ├── home
    ├── proc
    ├── root
    ├── sys
    ├── tmp
    ├── usr
    │   └── sbin
    └── var
        ├── spool
        │   └── mail
        └── www
```

我们能够通过下面的命令生成config.json这个文件：

```shell
docker-runc spec
```

生成的配置文件如下：

```shell
{
 "ociVersion": "1.0.0-rc2-dev",
 "platform": {
  "os": "linux",
  "arch": "amd64"
 },
 "process": {
  "terminal": true,
  "consoleSize": {
   "height": 0,
   "width": 0
  },
  "user": {
   "uid": 0,
   "gid": 0
  },
  "args": [
   "sh"
  ],
  "env": [
   "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
   "TERM=xterm"
  ],
  "cwd": "/",
  "capabilities": [
   "CAP_AUDIT_WRITE",
   "CAP_KILL",
   "CAP_NET_BIND_SERVICE"
  ],
  "rlimits": [
   {
    "type": "RLIMIT_NOFILE",
    "hard": 1024,
    "soft": 1024
   }
  ],
  "noNewPrivileges": true
 },
 "root": {
  "path": "rootfs",
  "readonly": true
 },
 "hostname": "runc",
 "mounts": [
  {
   "destination": "/proc",
   "type": "proc",
   "source": "proc"
  },
  {
   "destination": "/dev",
   "type": "tmpfs",
   "source": "tmpfs",
   "options": [
    "nosuid",
    "strictatime",
    "mode=755",
    "size=65536k"
   ]
  },
  {
   "destination": "/dev/pts",
   "type": "devpts",
   "source": "devpts",
   "options": [
    "nosuid",
    "noexec",
    "newinstance",
    "ptmxmode=0666",
    "mode=0620",
    "gid=5"
   ]
  },
  {
   "destination": "/dev/shm",
   "type": "tmpfs",
   "source": "shm",
   "options": [
    "nosuid",
    "noexec",
    "nodev",
    "mode=1777",
    "size=65536k"
   ]
  },
  {
   "destination": "/dev/mqueue",
   "type": "mqueue",
   "source": "mqueue",
   "options": [
    "nosuid",
    "noexec",
    "nodev"
   ]
  },
  {
   "destination": "/sys",
   "type": "sysfs",
   "source": "sysfs",
   "options": [
    "nosuid",
    "noexec",
    "nodev",
    "ro"
   ]
  },
  {
   "destination": "/sys/fs/cgroup",
   "type": "cgroup",
   "source": "cgroup",
   "options": [
    "nosuid",
    "noexec",
    "nodev",
    "relatime",
    "ro"
   ]
  }
 ],
 "hooks": {},
 "linux": {
  "resources": {
   "devices": [
    {
     "allow": false,
     "access": "rwm"
    }
   ]
  },
  "namespaces": [
   {
    "type": "pid"
   },
   {
    "type": "network"
   },
   {
    "type": "ipc"
   },
   {
    "type": "uts"
   },
   {
    "type": "mount"
   }
  ],
  "maskedPaths": [
   "/proc/kcore",
   "/proc/latency_stats",
   "/proc/timer_list",
   "/proc/timer_stats",
   "/proc/sched_debug",
   "/sys/firmware"
  ],
  "readonlyPaths": [
   "/proc/asound",
   "/proc/bus",
   "/proc/fs",
   "/proc/irq",
   "/proc/sys",
   "/proc/sysrq-trigger"
  ]
 }
}
```


现在你就可以编辑这个配置文件里面的内容，然后不通过docker启动一个容器，通过runc：


```shell
runc run container-name
```

首先在你第一次用它的时候要先安装它：
```shell
sudo apt install runc 
```
你也能通过源文件安装它：

```shell
mkdir -p ~/golang/src/github.com/opencontainers/
cd ~/golang/src/github.com/opencontainers/
git clone https://github.com/opencontainers/runc
cd ./runc
make
sudo make install
```

runC是一个完全**符合规范**的容器运行时，它允许你扩展（spin）一个容器，能与它们进行交互并且管理它们的声明周期，这要是为什么一个引擎（比如docker）构建的容器，能够在另一个容器中运行的原因。

容器作为runC的一个子进程，也能不通过守护进程（docker的守护进程）切入一些变量到系统之中。


runC构建在libcontainer上，libcontainer也是为docker引擎安装提供相同的容器库。在docker1.11之前，docker引擎用来管理存储，网络，容器以及镜像等等，现在docker的架构被拆为了四个部分：
- docker engine
- containerd
- containerd-shm 
- runC
二进制文件分别称为：
- docker
- docker-containerd
- docker-containerd-shim
- and docker-runc


为了运行一个容器，docker engine创建了一镜像，然后把它传递给containerd，然后containerd去调用containerd-shm ，containerd-shm 再去调用runC去运行这个容器。containerd-shim 允许runC在创建容器之后退出。这样我们就可以运行无守护进程的容器，因为我们没必要去为容器运行长时间的runtime进程。


目前，容器通过runC（经由containerd）创建的，但是可能通过另一种非runC的二进制暴露出相同的docker命令行以及接收OCI包。

你能在你的机器上看到不同的runtime通过下面的命令：
```shell

docker info|grep -i runtime
```

如果用的默认的会得到下面的输出：

```shell
Runtimes: runc
Default Runtime: runc
```

通过下面的命令你可以增加一个runtime：

```shell

docker daemon --add-runtime "<runtime-name>=<runtime-path>"

# docker daemon --add-runtime "oci=/usr/local/sbin/runc"
```

按流程它们只是一个containerd-shim，它管理标准的IO的先入先出队列，和保证在容器挂掉的时候能启动容器。

它也负责发送容器退出的状态给像docker这样的上层。


下图是当前的docker的架构。
![image](https://user-images.githubusercontent.com/12036324/60769823-fdb6c480-a106-11e9-92ea-f3f285c9c032.png)


Containerd实现了容器runtime，声明周期的支持和执行（create, start, stop, pause, resume, exec, signal & delete）这些特性。其他的特性（比如存储，日志等）被其他的组件实现。下图是Containerd Github 的一个图，展示了不同的特性并告诉这个特性是是否在范围Containerd之内。
![image](https://user-images.githubusercontent.com/12036324/60769872-9e0ce900-a107-11e9-92cc-9f3291a501dc.png)




我们运行容器：

```shell
docker run --name mariadb -e MYSQL_ROOT_PASSWORD=password -v /data/lists:/var/lib/mysql -d mariadb
Unable to find image 'mariadb:latest' locally
latest: Pulling from library/mariadb
75a822cd7888: Pull complete 
b8d5846e536a: Pull complete 
b75e9152a170: Pull complete 
832e6b030496: Pull complete 
034e06b5514d: Pull complete 
374292b6cca5: Pull complete 
d2a2cf5c3400: Pull complete 
f75e0958527b: Pull complete 
1826247c7258: Pull complete 
68b5724d9fdd: Pull complete 
d56c5e7c652e: Pull complete 
b5d709749ac4: Pull complete 
Digest: sha256:0ce9f13b5c5d235397252570acd0286a0a03472a22b7f0384fce09e65c680d13
Status: Downloaded newer image for mariadb:latest
db5218c494190c11a2fcc9627ea1371935d7021e86b5f652221bdac1cf182843
```


如果你运行`ps aux`命令，你能注意到docker-containerd-shim和容器运行通过下面的一些参数关联：
- db5218c494190c11a2fcc9627ea1371935d7021e86b5f652221bdac1cf182843
- /var/run/docker/libcontainerd/db5218c494190c11a2fcc9627ea1371935d7021e86b5f652221bdac1cf182843
- runC 程序 ( docker-runc )


这是具有正确格式的完整行：
```shell
docker-containerd-shim <container_id>
 /var/run/docker/libcontainerd/<container_id> docker-runc
```
db5218c494190c11a2fcc9627ea1371935d7021e86b5f652221bdac1cf182843是你创建容器之后能看到的id。

```shell
ls -l /var/run/docker/libcontainerd/db5218c494190c11a2fcc9627ea1371935d7021e86b5f652221bdac1cf182843
total 4
-rw-r--r-- 1 root root 3653 Dec 27 22:21 config.json
prwx------ 1 root root    0 Dec 27 22:21 init-stderr
prwx------ 1 root root    0 Dec 27 22:21 init-stdin
prwx------ 1 root root    0 Dec 27 22:21 init-stdout
```

## 总结

Docker的每个版本都在变化和发展，但有一些重大变化，比如Containerd的集成。在这篇文章中，我们已经看到了在这次集成（Containerd的集成）之后Docker发生了什么变化，以及OCI（在Docker的帮助下）如何通过引入使用独立运行时的可能性来改变容器世界。













