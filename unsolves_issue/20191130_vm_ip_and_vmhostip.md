
## 问题描述

最近同事在通过kvm创建出来的虚拟机上部署了个k8s，但是查看组件状态，controller-manager和sceduler是Unhealthy，但是集群正常。

```shell
 k get cs
NAME                 STATUS      MESSAGE                                                                                     ERROR
scheduler            Unhealthy   Get http://127.0.0.1:10251/healthz: dial tcp 127.0.0.1:10251: connect: connection refused
controller-manager   Unhealthy   Get http://127.0.0.1:10252/healthz: dial tcp 127.0.0.1:10252: connect: connection refused
etcd-0               Healthy     {"health":"true"}
```
于是在本地通过curl一下访问：
```shell
# curl http://127.0.0.1:10251/healthz
curl: (7) Failed connect to 127.0.0.1:10251; 拒绝连接
```
通过本地ip整一发：
```shell
# curl http://172.27.140.198:10251/healthz
ok
```

这个很匪夷所思，理论上是先通过loopback，然后在通过网卡呀。

然后在另一个同事的另一个虚拟机上做看看，发现组件状态都是正常的
```shell
# k get cs
NAME                 STATUS    MESSAGE             ERROR
controller-manager   Healthy   ok
scheduler            Healthy   ok
etcd-0               Healthy   {"health":"true"}
```
BUT,通过ip访问竟然就是挂掉得了
```shell
# curl http://172.27.140.210:10251/healthz
curl: (7) Failed connect to 172.27.140.210:10251; 拒绝连接


# curl http://172.0.0.1:10251/healthz
ok
```

抓包看一下: * tcpdump -v port 10251*
竟然两个虚拟机都啥也没有，尴尬的要死。


又在一台物理机上搞了一发，发现是都没问题了。


现在所有的矛头都指向了是虚拟机的问题了。


