
查找kernel5.0版本的bug: neighbour: arp_cache: neighbor table overflow!的过程 

## 问题现象

kube-dns不断的重启。
kube-dns的pod容器错误提示无效参数：
```shell
socket.c:1915: internal_send: 127.0.0.1#53: Invalid argument.
```
查看内核日志发现：
```shell
# dmesg | head -10
[529566.514220] neighbour: arp_cache: neighbor table overflow!
[529566.514292] neighbour: arp_cache: neighbor table overflow!
[529571.395311] net_ratelimit: 143 callbacks suppressed
[529571.395313] neighbour: arp_cache: neighbor table overflow!
[529571.416911] neighbour: arp_cache: neighbor table overflow!
[529571.416915] neighbour: arp_cache: neighbor table overflow!
```

这个问题在下面两种情况下出现了：
- 当部署完k8s之后是没问题的，部署公司平台出现上述错误
- 当运行一段时间后，依然会出现上述问题


## 问题出现背景

因为公司客户的要求，要求在客户kernel为5.x的版本能运行公司的平台，我们公司的平台上运行在k8s上。
公司的k8s的配置如下：

- k8s的版本如下：
```shell
Client Version: version.Info{Major:"1", Minor:"8", GitVersion:"v1.8.14", GitCommit:"9d72fafc46543ebdad024b7577012268bab543a7", GitTreeState:"clean", BuildDate:"2018-06-18T21:59:19Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"8", GitVersion:"v1.8.14", GitCommit:"9d72fafc46543ebdad024b7577012268bab543a7", GitTreeState:"clean", BuildDate:"2018-06-18T21:52:13Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"linux/amd64"}
```
- dns使用的使用的是kube-dns三件套（kube-dns，dnsmasq，sidecar）加一个监控组件addon-resizer。
- 网络使用的flannel
- scheduler和controller-manager是通过二进制部署的
- 平常是部署在310内核或者414以上的内核。
- 部署公司的平台大致分为两个步骤：部署k8s，部署平台
- 出现问题的内核为5.0 的rc7版本


## 排查过程

### 问题怎么暂时解决

把`/proc/sys/net/ipv4/neigh/default/gc_thresh3`调整大，可以暂时解决。后面会说为什么是暂时解决。

### 前提知识
```shell
# ll /proc/sys/net/ipv4/neigh/default/gc_thresh*
-rw-r--r-- 1 root root 0 11月 26 14:09 /proc/sys/net/ipv4/neigh/default/gc_thresh1
-rw-r--r-- 1 root root 0 11月 26 14:09 /proc/sys/net/ipv4/neigh/default/gc_thresh2
-rw-r--r-- 1 root root 0 11月 27 14:43 /proc/sys/net/ipv4/neigh/default/gc_thresh3
```
根据内核文档[man 7 arp](http://man7.org/linux/man-pages/man7/arp.7.html)解释这三个参数：
- gc_thresh1： 存在于ARP高速缓存表中的最小层数，如果小于这个数，GC不会执行
- gc_thresh2: 保存在 ARP 高速缓存中的最多的记录*软*限制。垃圾收集器在开始收集前，允许记录数超过这个数字 5 秒
- c_thresh3: 保存在 ARP 高速缓存中的最多记录的*硬*限制，一旦高速缓存中的数目高于此，垃圾收集器将马上运行
也就是说**当低于gc_thresh1时不会触发gc，当达到gc_thresh2后开始触发回收，而gc_thresh3是一个硬上限，不能超过，否自会报没有空间存储arp表的错误.**


### 开始排查

为什么调整大gc_thresh3的值就可以了呢，猜测可能是因为arp映射表已经超过内核的限制，但是查看arp缓存映射表如下：
```shell
'# arp -v
Address                  HWtype  HWaddress           Flags Mask            Iface
10.244.26.98             ether   02:42:0a:f4:1a:62   C                     docker0
10.244.26.71             ether   02:42:0a:f4:1a:47   C                     docker0
.....
Entries: 72 Skipped: 0  Found: 72
```

这才七十多个，理论上是没有问题的。

网上也有人出现过*类似*的问题，比如：
- [中文：arp_cache: neighbor table overflow!](https://imroc.io/kubernetes-practice-guide/zh/troubleshooting/node/arp_cache-neighbor-table-overflow.html)
- [kops issue: arp_cache: neighbor table overflow! ](https://github.com/kubernetes/kops/issues/4533)
- [pr: AWS kube-up: set net.ipv4.neigh.default.gc_thresh1=0 to avoid ARP over-caching](https://github.com/kubernetes/kubernetes/pull/27682)
他们遇到的问题，要么就是运行的service中太多了，充爆arp缓存表，进而导致kube-dns报错。要不就是针对AWS那种公有云上的问题。

但是我这个是arp表并没有达到阈值就出现这个问题就很奇怪。

现在内心有两个想法：
- 我得知道gc_thresh3这个值怎么算出来的
- 公司在kernel 3和4运行的都没问题，搞不明白kernel 5为啥有问题


反正就是所有的矛头都指向的kernel，所以只能硬着头皮去看看kernel相应的代码。

为什么会抛`neighbour: arp_cache: neighbor table overflow!`这个错误的代码在[5-rc7 net/core/neighbour.c L388](https://github.com/torvalds/linux/blob/v5.0-rc7/net/core/neighbour.c#L388)
```c
static struct neighbour *neigh_alloc(struct neigh_table *tbl,
				     struct net_device *dev,
				     bool exempt_from_gc)
{
...
	if (exempt_from_gc)
		goto do_alloc;

	entries = atomic_inc_return(&tbl->gc_entries) - 1;
	if (entries >= tbl->gc_thresh3 ||
	    (entries >= tbl->gc_thresh2 &&
	     time_after(now, tbl->last_flush + 5 * HZ))) {
		if (!neigh_forced_gc(tbl) &&
		    entries >= tbl->gc_thresh3) {
			net_info_ratelimited("%s: neighbor table overflow!\n",
					     tbl->id);
			NEIGH_CACHE_STAT_INC(tbl, table_fulls);
			goto out_entries;
		}
	}

do_alloc:
	n = kzalloc(tbl->entry_size + dev->neigh_priv_len, GFP_ATOMIC);
	if (!n)
		goto out_entries;
....
	atomic_inc(&tbl->entries);
out:
	return n;

out_entries:
	if (!exempt_from_gc)
		atomic_dec(&tbl->gc_entries);
	goto out;
}
```
我们来看看这个函数怎么调进来的，它是通过[neigh_add](https://github.com/torvalds/linux/blob/v5.0-rc7/net/core/neighbour.c#L1838) -> [___neigh_create](___neigh_create) -> [neigh_alloc](https://github.com/torvalds/linux/blob/v5.0-rc7/net/core/neighbour.c#L377)调用进来的。
```c
static struct neighbour *___neigh_create(struct neigh_table *tbl,
					 const void *pkey,
					 struct net_device *dev,
					 bool exempt_from_gc, bool want_ref)
{
    struct neighbour *n1, *rc, *n = neigh_alloc(tbl, dev, exempt_from_gc);
...
/* Protocol specific setup. */
	/* Device specific setup. */
	if (n->parms->neigh_setup &&
	    (error = n->parms->neigh_setup(n)) < 0) {
		rc = ERR_PTR(error);
		goto out_neigh_release;
	}
    ...
out_neigh_release:
	neigh_release(n);
	goto out;
}
```
1. 调用neigh_alloc，仅仅是将tbl->gc_entries的值加一，然后判断超过没超过阈值（gc_thresh3）。如果超过就报错。
2. ___neigh_create查找这一项是否存在，如果存在就用新的代替老的
看来释放缓存表的逻辑都在neigh_release里面，我们来看看[neigh_release的定义](https://github.com/torvalds/linux/blob/v5.0-rc7/include/net/neighbour.h#L421)：
```c
static inline void neigh_release(struct neighbour *neigh)
{
	if (refcount_dec_and_test(&neigh->refcnt))
		neigh_destroy(neigh);
}
```
这个东西还是会调用neigh_destroy，我们继续来看[neigh_destroy的定义](https://github.com/torvalds/linux/blob/v5.0-rc7/net/core/neighbour.c#L827):
```c
void neigh_destroy(struct neighbour *neigh)
{
....
	atomic_dec(&neigh->tbl->entries);
	kfree_rcu(neigh, rcu);
}
```
我们需要关注的逻辑就是把刚开始tbl->entries的+1操作给reset一下（进行-1操作）。
**但是有一点很奇怪，就是在neigh_alloc函数中，不仅仅是把tbl->entries进行了原子加，还先把tbl->gc_entries进行了原子加，而且是通过tbl->gc_entries的值判断的是否有 neighbor table overflow!这个错误**


感觉原因已经找到了，但是还是不敢决定，去看一下kernel 414的代码实现，kernel414的实现和5.xde实现还是略有不同:

__neigh_create的实现和上述的基本一致，主要看一下[neigh_alloc](https://github.com/torvalds/linux/blob/v4.14/net/core/neighbour.c#L303)的实现
```c
static struct neighbour *neigh_alloc(struct neigh_table *tbl, struct net_device *dev)
{
...
	int entries;

	entries = atomic_inc_return(&tbl->entries) - 1;
	if (entries >= tbl->gc_thresh3 ||
	    (entries >= tbl->gc_thresh2 &&
	     time_after(now, tbl->last_flush + 5 * HZ))) {
		if (!neigh_forced_gc(tbl) &&
		    entries >= tbl->gc_thresh3) {
			net_info_ratelimited("%s: neighbor table overflow!\n",
					     tbl->id);
			NEIGH_CACHE_STAT_INC(tbl, table_fulls);
			goto out_entries;
		}
	}
...
out:
	return n;

out_entries:
	atomic_dec(&tbl->entries);
	goto out;
}
```
可以看到414的kernel只用到了tbl->entries，没有tbl->gc_entries所以就不会有上面的问题了。

所以现在真相大白了，经过观察，在[kernel 5.2 rc1](https://github.com/torvalds/linux/blob/v5.2-rc1/net/core/neighbour.c#L667)中解决了这个问题。

## 扩展：Linux为什么要做这样的操作

这是在为了优化邻居子系统的垃圾回收：[neighbor: Improve garbage collection](https://codeberg.org/mirror/git.kernel.org_pub_scm_linux_kernel_git_stable_linux/commit/58956317c8d)

优化点针对：
- GC的时候就遍历PERMANENT的项,如果这些项太多的话会影响效率
- 在GC的时间段内，有表项被创建出来了，这个时候这一项会被清理掉。这就违背了gc_thresh2的定义：“当表项存活超过5秒会被清理”
- 清除*全部*相邻的非永久/可获取/外部学习的条目当超过gc_thresh2时，将导致过度杀伤并造成垃圾特别是在启动过程中。

优化流程为：
- 使用单独的列表记录追踪可能被垃圾的条目（非永久/可获取/外部学习）以及增加一个计数器，GC的时候只用这些
- 表项在表尾插入从表头移出
- 表项只有更新时间大于5秒才会被清理
- 一旦在GC过程中，表项小于gc_thresh2，强制退出GC
- GC就不会管永久保存的哪些表项了

