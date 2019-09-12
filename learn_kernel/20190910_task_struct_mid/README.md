[13 | 进程数据结构（中）：项目多了就需要项目管理系统](https://time.geekbang.org/column/article/92151)



## 运行统计信息

在进程的运行过程中，会有一些统计量，比如用户态和内核态消耗的时间，上下文切换的次数。

```c
u64				utime;// 用户态消耗的 CPU 时间
u64				stime;// 内核态消耗的 CPU 时间
unsigned long			nvcsw;// 自愿 (voluntary) 上下文切换计数
unsigned long			nivcsw;// 非自愿 (involuntary) 上下文切换计数
u64				start_time;// 进程启动时间，不包含睡眠时间
u64				real_start_time;// 进程启动时间，包含睡眠时间
```

## 进程的亲缘关系

进程之间的关系。

```c
struct task_struct __rcu *real_parent; /* real parent process */
struct task_struct __rcu *parent; /* recipient of SIGCHLD, wait4() reports */
struct list_head children;      /* list of my children */
struct list_head sibling;       /* linkage in my parent's children list */
```

- parent: 指向其父进程。当它终止时，必须向它的父进程发送信号
- children: 链表的头部。链表中的所有元素都是他的子进程
- sibling：用于把当前进程插入到兄弟链表中


通常情况下*real_parent*和*parent*是一样的但是也有例外，比如在bash上使用GDB来debug一个进程。这个时候bash就是*real_parent*,GDB是这个进程的*parent*。

## 进程权限

```c
/* Objective and real subjective task credentials (COW): */
const struct cred __rcu         *real_cred;
/* Effective (overridable) subjective task credentials (COW): */
const struct cred __rcu         *cred;
```

- *real_cred*就是说明谁能操作我这个进程
- *cred*就是说我这个进程是操作谁


cred的定义如下：
```c
struct cred {
......
        kuid_t          uid;            /* real UID of the task */
        kgid_t          gid;            /* real GID of the task */
        kuid_t          suid;           /* saved UID of the task */
        kgid_t          sgid;           /* saved GID of the task */
        kuid_t          euid;           /* effective UID of the task */
        kgid_t          egid;           /* effective GID of the task */
        kuid_t          fsuid;          /* UID for VFS ops */
        kgid_t          fsgid;          /* GID for VFS ops */
......
        kernel_cap_t    cap_inheritable; /* caps our children can inherit */
        kernel_cap_t    cap_permitted;  /* caps we're permitted */
        kernel_cap_t    cap_effective;  /* caps we can actually use */
        kernel_cap_t    cap_bset;       /* capability bounding set */
        kernel_cap_t    cap_ambient;    /* Ambient capability set */
......
} __randomize_layout;
```

- uid/gid: 谁启动的这个进程就是谁的id，但是审核权限的时候不比较这个
- euid/egid：看注释effective就是这个是起作用的，当这个进程要操作消息队列，共享内存，信号量等对象的时候，其实就是在比较这个用户和组是否有权限。
- fsuid/fsgid：对文件操作会审核的权限

一般来说uid/euid/fsuid都是一样的，gid/egid/fsgid也是一样的，但是也有特殊情况。

就是比如/bin/passwd的权限是*rwsr-xr-x*，当普通用户A执行passwd改自己密码的时候，创建进程的uid还是用户A，但是euid/fsuid就不是用户A了，因为看到了*set-user-id*的标示，就是改为文件所有者的ID，也就是说euid/fsuid就变为root用户了，这样就能改密码了。
![image](https://user-images.githubusercontent.com/12036324/64753287-3767d980-d555-11e9-9d30-7efd92bad8d6.png)

除了以用户和用户组的纬度来控制权限，linux还有个*capabilities*的机制，解决的问题就是普通用户权限太小，root用户权限太大，这是用位图标示权限，在*capability.h*里面找到权限定义：

```c
#define CAP_CHOWN            0
#define CAP_KILL             5
#define CAP_NET_BIND_SERVICE 10
#define CAP_NET_RAW          13
#define CAP_SYS_MODULE       16
#define CAP_SYS_RAWIO        17
#define CAP_SYS_BOOT         22
#define CAP_SYS_TIME         25
#define CAP_AUDIT_READ          37
#define CAP_LAST_CAP         CAP_AUDIT_READ

```

- cap_permitted: 表示进程能够使用的权限，但是真正起作用的是*cap_effective*，cap_permitted中可以包含cap_effective中没有的权限。一个进程可以在必要的时候放弃自己的某些权限，这样更加安全，假设自己的代码被攻破了，但是没有执行权限，那也算安全的了。
- cap_inheritable: 表示当可执行文件的扩展属性设置了 inheritable 位时，调用 exec 执行该程序会继承调用者的 inheritable 集合，并将其加入到 permitted 集合。但在非 root 用户下执行 exec 时，通常不会保留 inheritable 集合，但是往往又是非 root 用户，才想保留权限，所以非常鸡肋
- cap_bset: 也就是 capability bounding set，是系统中所有进程允许保留的权限。如果这个集合中不存在某个权限，那么系统中的所有进程都没有这个权限。即使以超级用户权限执行的进程，也是一样的.这样有很多好处。例如，系统启动以后，将加载内核模块的权限去掉，那所有进程都不能加载内核模块。这样，即便这台机器被攻破，也做不了太多有害的事情。
- cap_ambient: 是比较新加入内核的，就是为了解决 cap_inheritable 鸡肋的状况，也就是，非 root 用户进程使用 exec 执行一个程序的时候，如何保留权限的问题。当执行 exec 的时候，cap_ambient 会被添加到 cap_permitted 中，同时设置到 cap_effective 中。


## 内存管理

```c
/* Filesystem information: */
struct fs_struct                *fs;
/* Open file information: */
struct files_struct             *files;
```

## 文件和文件系统

```c
/* Filesystem information: */
struct fs_struct                *fs;
/* Open file information: */
struct files_struct             *files;
```


## 常用的几个命令


- pstree [pid]: 很好用
- strace: 用跟踪进程执行时的系统调用和所接收的信号：[linux xtrace 命令](https://www.cnblogs.com/ggjucheng/archive/2012/01/08/2316692.html)
- fuser: 通过文件找出使用该文件的进程,遇到不能unmout的时候经常遇到
- lsof: 列出进程所使用的文件名称,
```shell
[root@ambari install]# ./bin/deploy.sh prophet > a.txt &
[1] 19058
[root@ambari install]# lsof +d ./bin+ base_dir=/data
+ echo /data
+ '[' -z file:///data/apps.yaml ']'
+ /opt/work/bin/deploy
^C
[root@ambari install]# lsof +d ./bin
lsof: WARNING: can't stat() ext4 file system /mnt/disk01/data/k8s/lib/kubelet/pods/97eb35c2-d05e-11e9-aa5d-52540021189a/volume-subpaths/app-config/app/2 (deleted)
      Output information may be incomplete.
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF     NODE NAME
bash    19058 root  255r   REG  253,3     6993 33030169 ./bin/deploy.sh
```





## 总结图
![image](https://user-images.githubusercontent.com/12036324/64753283-3040cb80-d555-11e9-913c-ac9502a5983c.png)
