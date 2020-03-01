
容器网络模型要解决的问题有两个：
1. 为容器分配IP地址
2. 不同容器之间的互通

## 一、docker的网络模型CNM

![](./docker_network.png)


docker的CNM网络模型中三个部分，分别为：
- sandbox：
    + 容器的网络栈，包括对容器接口、路由表以及DNS配置的管理。
    + 一个sandbox可能包含多个endpoint。
    + 简单来说就是linux的namespace
- endpoint：
    + 一端属于网路一端属于sandbox
    + 简单来说就是veth pair
- network：
    + 一组能够相互通信的endpoint组成
    + 可以通过linux bridge或者vxlan实现

对于跨主机网络来说本质上是实现的一层overlay的网络。这也是swarm网络的实现方式。

![](./deep_dive_docker_network.webp)

图片来自[DEEP DIVE INTO DOCKER OVERLAY NETWORKS : PART 1](https://blog.d2si.io/2017/04/25/deep-dive-into-docker-overlay-networks-part-1/)，我们可以看出有如下特点：
- 容器的sandbox上至少有两个endpoint
- gwbridge是为了访问外部，br0是为了容器间互通
- 为了跨主机通信还有一个全局的KV数据库（这里用的consul）
- 容器间通信是通过vxlan实现的

如果有深入兴趣的可以读读[ Deep dive into docker overlay networks part](https://blog.d2si.io/2017/04/25/deep-dive-into-docker-overlay-networks-part-1/)系列文章，相信会有很大的收获。

我们在下面会讨论CNM和CNI差别。

## 二、CNI的介绍

docker的CNM网络模型有一定的缺陷，比如说依赖docker的守护进程和一个KV数据库。

全称是Container Network Interface

生产中的网络环境可能是多种多样的，有可能是二层连通的，也有可能是用的公有云的环境。

所以kublet的代码中就不会网络相关的实现，各个网络厂商实现这个接口即可。

CNI(Conteinre Network Interface)是Google和CoreOS联合定制的网络标准，这个标准基于[rkt](https://github.com/rkt/rkt)实现多容器通信的网络模型。




## 三、CNI原理

CNI的原理主要分为两个部分：
- 二进制插件配置POD的网卡和IP（runtime）：给POD插上网线
- Deamon进程实现网络互通（plugin）： 给POD连上网络

![](./cni.png)

cni的插件可以分为下面三类（这些插件官网已经独立出一个repo，有兴趣可以查看：[containernetworking/plugins](https://github.com/containernetworking/plugins/tree/master/plugins)）：
- Main插件：用来创建具体的网络设备的二进制文件，包括：
    + bridge： 在宿主机上创建网桥然后通过veth pair的方式连接到容器
    + macvlan：从虚拟出多个macvtap，每个macvtap都有不同的mac地址
    + ipvlan：和macvlan相似，也是通过一个主机接口虚拟出多个虚拟网络接口，不同的是ipvlan虚拟出来的是共享MAC地址，ip地址不同
    + loopback： lo设备（将回环接口设置成uo）
    + ptp： Veth Pair设备
    + vlan： 分配vlan设备
    + host-device： 移动宿主上已经存在的设备到容器中
- IPAM(IP Address Management)插件: 负责分配IP地址
    + dhcp： 宿主机上运行的守护进程，代表容器发出DHCP请求
    + host-local： 使用提前分配好的IP地址段来分配
    + static：用于为容器分配静态的IP地址，主要是调试使用
- Meta插件： 由CNI社区维护的内部插件
    + flannel: 专门为Flannel项目提供的插件
    + tuning：通过sysctl调整网络设备参数的二进制文件
    + portmap：通过iptables配置端口映射的二进制文件
    + bandwidth：使用 Token Bucket Filter (TBF)来进行限流的二进制文件
    + firewall：通过iptables或者firewalled添加规则控制容器的进出流量

    

- IPAM插件是分配ip地址的
- Meta插件回调用Main插件，比如flannel调用bridge插件


setUpPod方法：https://sourcegraph.com/github.com/kubernetes/kubernetes@f7c37d387dd30606ba8eb52d38f581532b473a1b/-/blob/pkg/kubelet/dockershim/network/cni/cni.go#L303
- http://qiankunli.github.io/2018/10/11/docker_to_k8s_network_note.html
## 四、k8s为什么选择CNI

- docker的网络模型是单个容器为单位的，CNI的实现是以一组容器（即POD）为单位的
- docker很依赖docker daemon，CNI是可插拔的
- docker跨主机通信的时候依赖KV数据库服务，CNI能使用K8S本身的KV存储（比如etcd）

## 五、如何使用CNI

通过下面的例子会对CNI有一个感性的了解。

- http://www.dasblinkenlichten.com/understanding-cni-container-networking-interface/
- http://www.dasblinkenlichten.com/using-cni-docker/

## 六、不同CNI插件的选择


## 七、总结

- 搞清楚CNM和CNI的区别
    + CNM：https://github.com/docker/libnetwork/blob/master/docs/design.md
    + CNI：https://github.com/containernetworking/cni/blob/master/CONVENTIONS.md
    + https://kccncna19.sched.com/event/Uaif/introduction-to-cni-the-container-network-interface-project-bryan-boreham-weaveworks-dan-williams-red-hat

- https://cizixs.com/2017/05/23/container-network-cni/
- https://yucs.github.io/2017/12/06/2017-12-6-CNI/
- https://www.cnblogs.com/YaoDD/p/7419383.html
- https://www.cnblogs.com/YaoDD/p/7405725.htm


## 参考
- [浅聊几种主流 Docker 网络的实现原理](https://www.infoq.cn/article/9vfPPfZPrXLM4ssLlxSR)
- https://www.jianshu.com/p/3b9389084701
