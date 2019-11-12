

[CGroup技术：内部创业公司应该独立核算成本](https://time.geekbang.org/column/article/115582)

## 一、能限制什么

cgroup定义了下面一系列的子系统，每个子系统用于控制某一类资源：
- CPU子系统：主要限制进程的cpu使用率
- cpuacct子系统：可以统计cgroups中的进程的cpu使用报告
- cpuset子系统：可以为cgroups中的进程分配单独的cpu节点或者内存节点
- memory子系统：可以限制进程的memory使用量
- blkio子系统：可以限制进程的块设备io
- devices子系统：可以控制进程能够访问某些设备
- net_cls子系统：可以标记cgroups中进程的网络数据包，然后通过tc模块（traffic control）对数据包进程控制
- freezer子系统：可以挂起或者恢复cgroups中的进程


## 二、通过例子去看原理

```shell
# docker run -d --cpu-shares 513 --cpus 2 --cpuset-cpus 1,3 --memory 1024M --memory-swap 1234M --memory-swappiness 7 -p 8081:80 nginx
bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc
[root@172_27_132_95 ~]# docker ps | grep nginx
bbdadec016e2        nginx                                                                                     "nginx -g 'daemon of…"   36 seconds ago      Up 35 seconds       0.0.0.0:8081->80/tcp   mystifying_lumiere
```

- --cpu-shares: 在多个进程之间，使用CPU的比例，详情见[cpu-share-constraint](https://docs.docker.com/engine/reference/run/#cpu-share-constraint)
- --cpus: 用几个cpu，这个是由*cpu.cfs_period_us*和*cpu.cfs_quota_us*共同决定
- --cpuset-cpus: 这容器用在哪几个cpu上执行，详情见[cpuset-constraint](https://docs.docker.com/engine/reference/run/#cpuset-constraint)
- --memory: 内存的限制，详情见：[user-memory-constraints](https://docs.docker.com/engine/reference/run/#user-memory-constraints)
- --memory-swap: 设置交换分区的大小，一般要大于memory
- --memory-swappiness: 使用swap memory的比例，0～100区间，0表示尽量不要用swap，100表示尽量使用swap

### 参考
- [Linux中Swap与Memory内存简单介绍](https://www.cnblogs.com/wzj4858/p/7910994.html)



在Linux上，有一个专门的Cgroup文件系统，可以运行mount命令看到：

```shell
# mount -t cgroup
cgroup on /sys/fs/cgroup/systemd type cgroup (rw,nosuid,nodev,noexec,relatime,xattr,release_agent=/usr/lib/systemd/systemd-cgroups-agent,name=systemd)
cgroup on /sys/fs/cgroup/hugetlb type cgroup (rw,nosuid,nodev,noexec,relatime,hugetlb)
cgroup on /sys/fs/cgroup/net_cls,net_prio type cgroup (rw,nosuid,nodev,noexec,relatime,net_prio,net_cls)
cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,nosuid,nodev,noexec,relatime,cpuacct,cpu)
cgroup on /sys/fs/cgroup/freezer type cgroup (rw,nosuid,nodev,noexec,relatime,freezer)
cgroup on /sys/fs/cgroup/devices type cgroup (rw,nosuid,nodev,noexec,relatime,devices)
cgroup on /sys/fs/cgroup/blkio type cgroup (rw,nosuid,nodev,noexec,relatime,blkio)
cgroup on /sys/fs/cgroup/perf_event type cgroup (rw,nosuid,nodev,noexec,relatime,perf_event)
cgroup on /sys/fs/cgroup/cpuset type cgroup (rw,nosuid,nodev,noexec,relatime,cpuset)
cgroup on /sys/fs/cgroup/pids type cgroup (rw,nosuid,nodev,noexec,relatime,pids)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)
```


在*/sys/fs/cgroup/cpu,cpuacct*下面是对CPU的资源控制配置文件：
```shell
# ll /sys/fs/cgroup/cpu,cpuacct
总用量 0
-rw-r--r--   1 root root 0 8月  28 15:46 cgroup.clone_children
--w--w--w-   1 root root 0 8月  28 15:46 cgroup.event_control
-rw-r--r--   1 root root 0 8月  28 15:46 cgroup.procs
-r--r--r--   1 root root 0 8月  28 15:46 cgroup.sane_behavior
-r--r--r--   1 root root 0 8月  28 15:46 cpuacct.stat
-rw-r--r--   1 root root 0 8月  28 15:46 cpuacct.usage
-r--r--r--   1 root root 0 8月  28 15:46 cpuacct.usage_percpu
-rw-r--r--   1 root root 0 8月  28 15:46 cpu.cfs_period_us
-rw-r--r--   1 root root 0 8月  28 15:46 cpu.cfs_quota_us
-rw-r--r--   1 root root 0 8月  28 15:46 cpu.rt_period_us
-rw-r--r--   1 root root 0 8月  28 15:46 cpu.rt_runtime_us
-rw-r--r--   1 root root 0 8月  28 15:46 cpu.shares
-r--r--r--   1 root root 0 8月  28 15:46 cpu.stat
drwxr-xr-x   7 root root 0 11月  9 17:24 docker
-rw-r--r--   1 root root 0 8月  28 15:46 notify_on_release
-rw-r--r--   1 root root 0 8月  28 15:46 release_agent
drwxr-xr-x 425 root root 0 11月 11 00:00 system.slice
-rw-r--r--   1 root root 0 8月  28 15:46 tasks
drwxr-xr-x   2 root root 0 8月  28 15:46 user.slice
```
看docker下面有啥：
```shell
ll /sys/fs/cgroup/cpu,cpuacct/docker/
总用量 0
drwxr-xr-x 2 root root 0 11月 11 09:53 bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc
-rw-r--r-- 1 root root 0 8月  28 16:04 cgroup.clone_children
--w--w--w- 1 root root 0 8月  28 16:04 cgroup.event_control
-rw-r--r-- 1 root root 0 8月  28 16:04 cgroup.procs
-r--r--r-- 1 root root 0 8月  28 16:04 cpuacct.stat
-rw-r--r-- 1 root root 0 8月  28 16:04 cpuacct.usage
-r--r--r-- 1 root root 0 8月  28 16:04 cpuacct.usage_percpu
-rw-r--r-- 1 root root 0 8月  28 16:04 cpu.cfs_period_us
-rw-r--r-- 1 root root 0 8月  28 16:04 cpu.cfs_quota_us
-rw-r--r-- 1 root root 0 8月  28 16:04 cpu.rt_period_us
-rw-r--r-- 1 root root 0 8月  28 16:04 cpu.rt_runtime_us
-rw-r--r-- 1 root root 0 8月  28 16:04 cpu.shares
-r--r--r-- 1 root root 0 8月  28 16:04 cpu.stat
-rw-r--r-- 1 root root 0 8月  28 16:04 notify_on_release
-rw-r--r-- 1 root root 0 8月  28 16:04 tasks
```
下面的id就是刚才创建的nginx容器的id，在瞅瞅有啥：
```shell
# ll /sys/fs/cgroup/cpu,cpuacct/docker/bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc/
总用量 0
-rw-r--r-- 1 root root 0 11月 11 09:53 cgroup.clone_children
--w--w--w- 1 root root 0 11月 11 09:53 cgroup.event_control
-rw-r--r-- 1 root root 0 11月 11 09:53 cgroup.procs
-r--r--r-- 1 root root 0 11月 11 09:53 cpuacct.stat
-rw-r--r-- 1 root root 0 11月 11 09:53 cpuacct.usage
-r--r--r-- 1 root root 0 11月 11 09:53 cpuacct.usage_percpu
-rw-r--r-- 1 root root 0 11月 11 09:53 cpu.cfs_period_us
-rw-r--r-- 1 root root 0 11月 11 09:53 cpu.cfs_quota_us
-rw-r--r-- 1 root root 0 11月 11 09:53 cpu.rt_period_us
-rw-r--r-- 1 root root 0 11月 11 09:53 cpu.rt_runtime_us
-rw-r--r-- 1 root root 0 11月 11 09:53 cpu.shares
-r--r--r-- 1 root root 0 11月 11 09:53 cpu.stat
-rw-r--r-- 1 root root 0 11月 11 09:53 notify_on_release
-rw-r--r-- 1 root root 0 11月 11 09:53 tasks
```
下面的tasks文件是这个容器里面所有进程的进程号，即所有这些进程都被这些CPU策略控制：
```shell
cat /sys/fs/cgroup/cpu,cpuacct/docker/f9ab36a90a5a3cb0ca3276f3937eb875b32bb201255a34783b8778fcf07717c8/tasks
1753
2059
```

查看这两个进程看看：
```shell
]# pstree 1753
nginx───nginx
# pstree 2059
nginx
```
我们查看cpu.shares，就能看到我们最开始设置的*--cpu-shares*这个参数了
```shell
# cat /sys/fs/cgroup/cpu,cpuacct/docker/bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc/cpu.shares
513
```
我们还设置了cpus，这个参数是由cpu.cfs_period_us和cpu.cfs_quota_us共同决定的。
- cpu.cfs_period_us：指的是运行周期
- cpu.cfs_quota_us：这个周期内这个进程占用多少时间

我们设置了cpus为2，代表的意思是在10000ms的运行周期内占用10000ms的时间，即要两个CPU。
```shell
# cat /sys/fs/cgroup/cpu,cpuacct/docker/bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc/cpu.cfs_quota_us
200000
# cat /sys/fs/cgroup/cpu,cpuacct/docker/bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc/cpu.cfs_period_us
100000
```
对于cpuset，就要到*/sys/fs/cgroup/cpuset/*这个目录下的，
```shell
# cat /sys/fs/cgroup/cpuset/docker/bbdadec016e2667a1de24f2e683bfa84c6a5c0ed1add6e1a4ae4e289e004eefc/cpuset.cpus
1,3
```
我们就能看到我们设置的要跑在哪几个cpu上。
内存的也就同理的，都是在*/sys/fs/cgroup*下面去找。

![image](https://user-images.githubusercontent.com/12036324/68635549-e2841780-0533-11ea-8b6a-eabbf77c58b1.png)

## 内核中怎么实现的

在系统初始化的时候，cgroup也会进程初始化，在start_kernel中，cpu_init_early和cgroup_init都会进程初始化。

```c

asmlinkage __visible void __init start_kernel(void)
{
......
  cgroup_init_early();
......
  cgroup_init();
......
}
```
在*cgroup_init_early* 和 *cgroup_init*中，都会有下面的循环：
```c

for_each_subsys(ss, i) {
  ss->id = i;
  ss->name = cgroup_subsys_name[i];
......
  cgroup_init_subsys(ss, true);
}

#define for_each_subsys(ss, ssid)          \
  for ((ssid) = 0; (ssid) < CGROUP_SUBSYS_COUNT &&    \
       (((ss) = cgroup_subsys[ssid]) || true); (ssid)++)
```
for_each_subsys会在cgroup_subsys数组中进行循环。在SUBSYS这宏定义了这个cgroup_subsys数组，数组中的项定义在cgroup_subsys.h头文件中。
```c

#define SUBSYS(_x) [_x ## _cgrp_id] = &_x ## _cgrp_subsys,
struct cgroup_subsys *cgroup_subsys[] = {
#include <linux/cgroup_subsys.h>
};
#undef SUBSYS
```
对于cpu和内存有下面的定义：
```c

//cgroup_subsys.h

#if IS_ENABLED(CONFIG_CPUSETS)
SUBSYS(cpuset)
#endif

#if IS_ENABLED(CONFIG_CGROUP_SCHED)
SUBSYS(cpu)
#endif

#if IS_ENABLED(CONFIG_CGROUP_CPUACCT)
SUBSYS(cpuacct)
#endif

#if IS_ENABLED(CONFIG_MEMCG)
SUBSYS(memory)
#endif
```
根据 SUBSYS 的定义，SUBSYS(cpu) 其实是 [cpu_cgrp_id] = &cpu_cgrp_subsys，而 SUBSYS(memory) 其实是 [memory_cgrp_id] = &memory_cgrp_subsys。


我们能够找到cpu_cgrp_subsys和memory_cgrp_subsys的定义：
```c

cpuset_cgrp_subsys
struct cgroup_subsys cpuset_cgrp_subsys = {
  .css_alloc  = cpuset_css_alloc,
  .css_online  = cpuset_css_online,
  .css_offline  = cpuset_css_offline,
  .css_free  = cpuset_css_free,
  .can_attach  = cpuset_can_attach,
  .cancel_attach  = cpuset_cancel_attach,
  .attach    = cpuset_attach,
  .post_attach  = cpuset_post_attach,
  .bind    = cpuset_bind,
  .fork    = cpuset_fork,
  .legacy_cftypes  = files,
  .early_init  = true,
};

cpu_cgrp_subsys
struct cgroup_subsys cpu_cgrp_subsys = {
  .css_alloc  = cpu_cgroup_css_alloc,
  .css_online  = cpu_cgroup_css_online,
  .css_released  = cpu_cgroup_css_released,
  .css_free  = cpu_cgroup_css_free,
  .fork    = cpu_cgroup_fork,
  .can_attach  = cpu_cgroup_can_attach,
  .attach    = cpu_cgroup_attach,
  .legacy_cftypes  = cpu_files,
  .early_init  = true,
};

memory_cgrp_subsys
struct cgroup_subsys memory_cgrp_subsys = {
  .css_alloc = mem_cgroup_css_alloc,
  .css_online = mem_cgroup_css_online,
  .css_offline = mem_cgroup_css_offline,
  .css_released = mem_cgroup_css_released,
  .css_free = mem_cgroup_css_free,
  .css_reset = mem_cgroup_css_reset,
  .can_attach = mem_cgroup_can_attach,
  .cancel_attach = mem_cgroup_cancel_attach,
  .post_attach = mem_cgroup_move_task,
  .bind = mem_cgroup_bind,
  .dfl_cftypes = memory_files,
  .legacy_cftypes = mem_cgroup_legacy_files,
  .early_init = 0,
};
```

在for_each_subsys的循环中，cgroup_subsys[]数组中的每一个cgroup_subsys，都会调用cgroup_init_subsys，对于cgroup_subsys进程初始化。
```c

static void __init cgroup_init_subsys(struct cgroup_subsys *ss, bool early)
{
  struct cgroup_subsys_state *css;
......
  idr_init(&ss->css_idr);
  INIT_LIST_HEAD(&ss->cfts);

  /* Create the root cgroup state for this subsystem */
  ss->root = &cgrp_dfl_root;
  css = ss->css_alloc(cgroup_css(&cgrp_dfl_root.cgrp, ss));
......
  init_and_link_css(css, ss, &cgrp_dfl_root.cgrp);
......
  css->id = cgroup_idr_alloc(&ss->css_idr, css, 1, 2, GFP_KERNEL);
  init_css_set.subsys[ss->id] = css;
......
  BUG_ON(online_css(css));
......
}
```
cgroup_init_subsys里面会做两件事情：
1. 调用css_alloc创建一个cgroup_subsys_state
2. 调用online_css，也即调用cgroup_subsys的css_online函数激活这个cgroup

对于CPU来讲，css_alloc函数就是cpu_cgroup_css_alloc。这里面会调用sched_create_group创建一个*struct task_group*。在这个结构中，第一项就是cgroup_subsys_state，task_group是cgroup_subsys_state的一个扩展，最终返回cgroup_subsys_state结构的指针，可以通过强制类型转换为*task_group*。
```c

struct task_group {
  struct cgroup_subsys_state css;

#ifdef CONFIG_FAIR_GROUP_SCHED
  /* schedulable entities of this group on each cpu */
  struct sched_entity **se;
  /* runqueue "owned" by this group on each cpu */
  struct cfs_rq **cfs_rq;
  unsigned long shares;

#ifdef  CONFIG_SMP
  atomic_long_t load_avg ____cacheline_aligned;
#endif
#endif

  struct rcu_head rcu;
  struct list_head list;

  struct task_group *parent;
  struct list_head siblings;
  struct list_head children;

  struct cfs_bandwidth cfs_bandwidth;
};
```
task_group下面的sched_entity是调度实体。

接下来online_css会被调用。对于CPU来讲，online_css调用的是cpu_cgroup_css_online。他会调用sched_online_group -> online_fair_sched_group。
```c

void online_fair_sched_group(struct task_group *tg)
{
  struct sched_entity *se;
  struct rq *rq;
  int i;

  for_each_possible_cpu(i) {
    rq = cpu_rq(i);
    se = tg->se[i];
    update_rq_clock(rq);
    attach_entity_cfs_rq(se);
    sync_throttle(tg, i);
  }
}
```
对于每一个CPU，取出每个CPU的运行队列rq，也取出task_group的sched_entity，然后通过attach_entity_cfs_rq讲sched_entity添加到运行队列中。



对于内存来讲，css_alloc 函数就是 mem_cgroup_css_alloc。这里面会调用 mem_cgroup_alloc，创建一个 struct mem_cgroup。在这个结构中，第一项就是 cgroup_subsys_state，也就是说，mem_cgroup 是 cgroup_subsys_state 的一个扩展，最终返回的是指向 cgroup_subsys_state 结构的指针，我们可以通过强制类型转换变为 mem_cgroup。

```c

struct mem_cgroup {
  struct cgroup_subsys_state css;

  /* Private memcg ID. Used to ID objects that outlive the cgroup */
  struct mem_cgroup_id id;

  /* Accounted resources */
  struct page_counter memory;
  struct page_counter swap;

  /* Legacy consumer-oriented counters */
  struct page_counter memsw;
  struct page_counter kmem;
  struct page_counter tcpmem;

  /* Normal memory consumption range */
  unsigned long low;
  unsigned long high;

  /* Range enforcement for interrupt charges */
  struct work_struct high_work;

  unsigned long soft_limit;

......
  int  swappiness;
......
  /*
   * percpu counter.
   */
  struct mem_cgroup_stat_cpu __percpu *stat;

  int last_scanned_node;

  /* List of events which userspace want to receive */
  struct list_head event_list;
  spinlock_t event_list_lock;

  struct mem_cgroup_per_node *nodeinfo[0];
  /* WARNING: nodeinfo must be the last member here */
};
```
在cgroup_init函数中，cgroup的初始化还做了一件很重要的事情，他会调用cgroup_init_cftypes(NULL, cgroup1_base_files),来初始化cgroup文件类型cftype的操作函数，也就是将struct kernfs_ops *kf_ops设置为cgroup_kf_ops。
```c

struct cftype cgroup1_base_files[] = {
......
    {
        .name = "tasks",
        .seq_start = cgroup_pidlist_start,
        .seq_next = cgroup_pidlist_next,
        .seq_stop = cgroup_pidlist_stop,
        .seq_show = cgroup_pidlist_show,
        .private = CGROUP_FILE_TASKS,
        .write = cgroup_tasks_write,
    },
}

static struct kernfs_ops cgroup_kf_ops = {
  .atomic_write_len  = PAGE_SIZE,
  .open      = cgroup_file_open,
  .release    = cgroup_file_release,
  .write      = cgroup_file_write,
  .seq_start    = cgroup_seqfile_start,
  .seq_next    = cgroup_seqfile_next,
  .seq_stop    = cgroup_seqfile_stop,
  .seq_show    = cgroup_seqfile_show,
};
```
在cgroup初始化完毕之后，接下来就是创建一个cgroup的文件系统，用户配置和操作cgroup。
cgroup是一种特殊的文件系统：
```c

struct file_system_type cgroup_fs_type = {
  .name = "cgroup",
  .mount = cgroup_mount,
  .kill_sb = cgroup_kill_sb,
  .fs_flags = FS_USERNS_MOUNT,
};
```
当我们mount这个cgroup文件系统的时候，会调用cgroup_mount ->cgroup1_mount。
```c

struct dentry *cgroup1_mount(struct file_system_type *fs_type, int flags,
           void *data, unsigned long magic,
           struct cgroup_namespace *ns)
{
  struct super_block *pinned_sb = NULL;
  struct cgroup_sb_opts opts;
  struct cgroup_root *root;
  struct cgroup_subsys *ss;
  struct dentry *dentry;
  int i, ret;
  bool new_root = false;
......
  root = kzalloc(sizeof(*root), GFP_KERNEL);
  new_root = true;

  init_cgroup_root(root, &opts);

  ret = cgroup_setup_root(root, opts.subsys_mask, PERCPU_REF_INIT_DEAD);
......
  dentry = cgroup_do_mount(&cgroup_fs_type, flags, root,
         CGROUP_SUPER_MAGIC, ns);
......
  return dentry;
}
```
cgroup被组织为树形结构，因而有cgroup_root。init_cgroup_root会初始化这个cgroup_root。cgroup_root是cgroup的根，他有一个成员kf_root，是cgroup文件系统的根*struct kernfs_root*。kernfs_create_root就是用来创建这个kernfs_root结构。
```c

int cgroup_setup_root(struct cgroup_root *root, u16 ss_mask, int ref_flags)
{
  LIST_HEAD(tmp_links);
  struct cgroup *root_cgrp = &root->cgrp;
  struct kernfs_syscall_ops *kf_sops;
  struct css_set *cset;
  int i, ret;

  root->kf_root = kernfs_create_root(kf_sops,
             KERNFS_ROOT_CREATE_DEACTIVATED,
             root_cgrp);
  root_cgrp->kn = root->kf_root->kn;

  ret = css_populate_dir(&root_cgrp->self);
  ret = rebind_subsystems(root, ss_mask);
......
  list_add(&root->root_list, &cgroup_roots);
  cgroup_root_count++;
......
  kernfs_activate(root_cgrp->kn);
......
}
```
就像在普通文件系统上，每一个文件都对应一个 inode，在 cgroup 文件系统上，每个文件都对应一个 struct kernfs_node 结构，当然 kernfs_root 作为文件系的根也对应一个 kernfs_node 结构。


接下来css_populate_dir会调用cgroup_addrm_files->cgroup_add_file来创建整棵文件树，并且为树中的每个文件创建对应的kernfs_node结构，并将这个文件的操作函数设置为*kf_ops*也即指向*cgroup_kf_ops*。
```c

static int cgroup_add_file(struct cgroup_subsys_state *css, struct cgroup *cgrp,
         struct cftype *cft)
{
  char name[CGROUP_FILE_NAME_MAX];
  struct kernfs_node *kn;
......
  kn = __kernfs_create_file(cgrp->kn, cgroup_file_name(cgrp, cft, name),
          cgroup_file_mode(cft), 0, cft->kf_ops, cft,
          NULL, key);
......
}

struct kernfs_node *__kernfs_create_file(struct kernfs_node *parent,
           const char *name,
           umode_t mode, loff_t size,
           const struct kernfs_ops *ops,
           void *priv, const void *ns,
           struct lock_class_key *key)
{
  struct kernfs_node *kn;
  unsigned flags;
  int rc;

  flags = KERNFS_FILE;

  kn = kernfs_new_node(parent, name, (mode & S_IALLUGO) | S_IFREG, flags);

  kn->attr.ops = ops;
  kn->attr.size = size;
  kn->ns = ns;
  kn->priv = priv;
......
  rc = kernfs_add_one(kn);
......
  return kn;
}
```

从cgroup_setup_root返回后，接下来在cgroup1_mount中，要做的一件事情是cgroup_do_mount，调用kernfs_mount真的去mount这个文件系统，返回一个普通的dentry。这种特殊的文件系统对应的文件操作为kernfs_file_fops。
```c

const struct file_operations kernfs_file_fops = {
  .read    = kernfs_fop_read,
  .write    = kernfs_fop_write,
  .llseek    = generic_file_llseek,
  .mmap    = kernfs_fop_mmap,
  .open    = kernfs_fop_open,
  .release  = kernfs_fop_release,
  .poll    = kernfs_fop_poll,
  .fsync    = noop_fsync,
};
```
当我们要写入CGroup文件来设置参数的时候，根据文件系统的操作kernfs_fop_write会被调用，在这里面会调用*kernfs_ops*的write函数，根据上面的定义*cgroup_file_write*，在这里调用的cftype的write函数。对于CPU和内存的write函数有下面不同的定义：
```c

static struct cftype cpu_files[] = {
#ifdef CONFIG_FAIR_GROUP_SCHED
    {
        .name = "shares",
        .read_u64 = cpu_shares_read_u64,
        .write_u64 = cpu_shares_write_u64,
    },
#endif
#ifdef CONFIG_CFS_BANDWIDTH
    {
        .name = "cfs_quota_us",
        .read_s64 = cpu_cfs_quota_read_s64,
        .write_s64 = cpu_cfs_quota_write_s64,
    },
    {
        .name = "cfs_period_us",
        .read_u64 = cpu_cfs_period_read_u64,
        .write_u64 = cpu_cfs_period_write_u64,
    },
}


static struct cftype mem_cgroup_legacy_files[] = {
    {
        .name = "usage_in_bytes",
        .private = MEMFILE_PRIVATE(_MEM, RES_USAGE),
        .read_u64 = mem_cgroup_read_u64,
    },
    {
        .name = "max_usage_in_bytes",
        .private = MEMFILE_PRIVATE(_MEM, RES_MAX_USAGE),
        .write = mem_cgroup_reset,
        .read_u64 = mem_cgroup_read_u64,
    },
    {
        .name = "limit_in_bytes",
        .private = MEMFILE_PRIVATE(_MEM, RES_LIMIT),
        .write = mem_cgroup_write,
        .read_u64 = mem_cgroup_read_u64,
    },
    {
        .name = "soft_limit_in_bytes",
        .private = MEMFILE_PRIVATE(_MEM, RES_SOFT_LIMIT),
        .write = mem_cgroup_write,
        .read_u64 = mem_cgroup_read_u64,
    },
}
```
如果设置的是cpu.shares，则调用的是cpu_shares_write_u64。在这里面，task_group的shares变量更新了，并且更新到CPU队列上的调度实体。
```c

int sched_group_set_shares(struct task_group *tg, unsigned long shares)
{
  int i;

  shares = clamp(shares, scale_load(MIN_SHARES), scale_load(MAX_SHARES));

  tg->shares = shares;
  for_each_possible_cpu(i) {
    struct rq *rq = cpu_rq(i);
    struct sched_entity *se = tg->se[i];
    struct rq_flags rf;

    update_rq_clock(rq);
    for_each_sched_entity(se) {
      update_load_avg(se, UPDATE_TG);
      update_cfs_shares(se);
    }
  }
......
}
```
还要将CPU目录下面的tasks写入进程号。写入一个进程号到tasks文件里面，按照cgroup1_base_files里面的定义，我们应该调用cgroup_tasks_write。


接下来的调用链为：cgroup_tasks_write -> __cgroup_proces_write -> cgroup_attach_task -> cgroup_migrate -> cgroup_migrate_execute。将这个进程和一个cgroup关联起来，即将这个进程迁移到这个cgroup下面。
```c

static int cgroup_migrate_execute(struct cgroup_mgctx *mgctx)
{
  struct cgroup_taskset *tset = &mgctx->tset;
  struct cgroup_subsys *ss;
  struct task_struct *task, *tmp_task;
  struct css_set *cset, *tmp_cset;
......
  if (tset->nr_tasks) {
    do_each_subsys_mask(ss, ssid, mgctx->ss_mask) {
      if (ss->attach) {
        tset->ssid = ssid;
        ss->attach(tset);
      }
    } while_each_subsys_mask();
  }
......
}
```
每个cgroup子系统都会调用相应的attach函数。而CPU调用的是cpu_cgroup_attach -> sched_move_task -> sched_change_group。
```c

static void sched_change_group(struct task_struct *tsk, int type)
{
  struct task_group *tg;

  tg = container_of(task_css_check(tsk, cpu_cgrp_id, true),
        struct task_group, css);
  tg = autogroup_task_group(tsk, tg);
  tsk->sched_task_group = tg;

#ifdef CONFIG_FAIR_GROUP_SCHED
  if (tsk->sched_class->task_change_group)
    tsk->sched_class->task_change_group(tsk, type);
  else
#endif
    set_task_rq(tsk, task_cpu(tsk));
}
```
sched_change_group中设置这个进程以这个task_group的方式参与调度，从而使得cpu.shares起作用。


对于内存来讲，写入内存的限制使用函数 mem_cgroup_write->mem_cgroup_resize_limit 来设置 struct mem_cgroup 的 memory.limit 成员。



在进程执行过程中，申请内存的时候，我们会调用 handle_pte_fault->do_anonymous_page()->mem_cgroup_try_charge()。

```c

int mem_cgroup_try_charge(struct page *page, struct mm_struct *mm,
        gfp_t gfp_mask, struct mem_cgroup **memcgp,
        bool compound)
{
  struct mem_cgroup *memcg = NULL;
......
  if (!memcg)
    memcg = get_mem_cgroup_from_mm(mm);

  ret = try_charge(memcg, gfp_mask, nr_pages);
......
}
```
在mem_cgroup_try_charge中，先是调用get_mem_cgroup_from_mm获得这个进程对应的mem_cgroup结构，然后在tey_charge中，根据mem_cgroup的限制，看看能都申请内存。


## 总结

![image](https://user-images.githubusercontent.com/12036324/68635112-7fde4c00-0532-11ea-9c1c-90a2f4d73997.png)


1. 系统初始化的时候，初始化cgroup的各个子系统的操作函数，分配个各个子系统的数据结构
2. mount cgroup文件系统，创建文件系统的树形结构以及操作函数。
3. 写入cgroup文件，设置cpu和memory的相关参数，这个时候的文件系统的操作函数会调用到cgroup子系统的操作函数，从而将参数设置到cgroup子系统的数据结构
4. 下入tasks文件，将进程交给某个cgroup进行管理，因为tasks文件也是一个cgroup文件，统一会调用文件系统的操作函数进而调用cgroup子系统的操作函数，将cgroup子系统的数据结构和进程关联起来。
5. 对于cpu来讲，会修改scheduled entity放入相应的队列里面。从而下次调度的时候就起作用了。对于内存的cgroup的设定，只有申请内存的时候才起作用。

