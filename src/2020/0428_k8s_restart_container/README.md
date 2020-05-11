

先讲讲pod 的PLEG？

从源码角度分析一个容器什么时候重启


hashChange函数的做法


1.16 “fix”这个问题：https://github.com/kubernetes/kubernetes/blob/release-1.8/pkg/util/hash/hash.go#L28


现象
把master组件（apiserver/controller-manager/scheduler）都升级之后（从1.8.14 升级到1.16.8），开始升级kubelet，升级完kubelet之后，发现POD并没有restart，但是容器都重启了。

原因
kubelet判断重启不重启一个容器的条件是hash(Container.spec)有没有变化，如果变了就会重启容器。我们在升级的时候就遇到变化，1.8中Container Spec的定义和1.16中的Container Spec的定义。

因为[VolumeDevices](https://github.com/kubernetes/kubernetes/blob/029bb4e213502268af6222cc2f6903ab90de751b/staging/src/k8s.io/api/core/v1/types.go#L1723)、[StartupProbe](https://github.com/kubernetes/kubernetes/blob/v1.16.8/staging/src/k8s.io/api/core/v1/types.go#L2208)以及[SecurityContext](https://github.com/kubernetes/kubernetes/blob/v1.16.8/staging/src/k8s.io/api/core/v1/types.go#L5658:6)所以在计算hash的时候1.8和1.16就会计算的不一样。



解决方案
[Compute container hash based on API content, not go type](https://github.com/kubernetes/kubernetes/pull/57741)这个PR已经解决了升级上来增加则字段为nil或者空的情况下，就抛弃他们计算hash，这个是在1.16中增加了，为了达到hash计算方式的统一，所以只有当1.16升级到更高的版本的时候才有用。

因为上面的PR导致，在[1.8中的hash计算方法](https://github.com/kubernetes/kubernetes/blob/release-1.8/pkg/kubelet/container/helpers.go#L97)和[1.16中的计算方法](https://github.com/kubernetes/kubernetes/blob/release-1.16/pkg/kubelet/container/helpers.go#L97)有了区别。

所以解决方案就是把1.8和1.16中计算hash的方式统一，然后在计算[hash之前](https://github.com/kubernetes/kubernetes/blob/release-1.8/pkg/util/hash/hash.go#L28)，把对应的参数删掉，保证两次计算出的hash值相同即可。



相关issue：

- [Upgrading a node from kubelet 1.1.3 to 1.2.0 results in containers getting destroyed and recreated](https://github.com/kubernetes/kubernetes/issues/23104)
- [Upgrade kubelet from v1.11.3 to v.12.3 without draining pods causes containers to restart continuously](https://github.com/kubernetes/kubernetes/issues/72296)
- [Container spec hash changed. Container will be killed and recreated.](https://github.com/kubernetes/kubernetes/issues/53644)
- [Re-evaluate how kubelet determines whether a container meets the given spec](https://github.com/kubernetes/kubernetes/issues/63814)
- [Node upgrades: in-place upgrades](https://github.com/kubernetes/kubernetes/issues/6099)
参考
- [如何在Kubernetes中实现容器原地升级](https://my.oschina.net/jxcdwangtao/blog/3037250)
- [Kubelet从1.7.16升级到1.9.11，Sandbox以外的容器都被重建的问题调查](https://www.lijiaocn.com/%E9%97%AE%E9%A2%98/2019/01/14/kubelet-updates-container-restart.html)
