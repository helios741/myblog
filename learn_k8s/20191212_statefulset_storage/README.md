# StatefulSet 存储状态


## PVC

PVC提供给开发这，让他们不用关心后端使用的是什么存储。

PV一般是运维人员指定的，包含存储的细节，这些细节不用暴露给开发者。

## 总结

1. StatefulSet的控制器直接管理pod。StatefulSet里不同的pod实例，不再像 ReplicaSet 中那样都是完全一样的，而是pod名加上了编号
2. k8s通过headless Service为这些pod在DNS服务器中生成同样编号的DNS记录
3. StatefulSet为每个pod分配并创建一个同样编号的PVC，这样，Kubernetes 就可 以通过 Persistent Volume 机制为这个 PVC 绑定上对应的 PV，从而保证了每一个 Pod 都拥有 一个独立的 Volume。
4. Pod 被删除，它所对应的 PVC 和 PV 依然会保留下来。所以当这个 Pod 被重新创建出来之后，Kubernetes 会为它找到同样编号的 PVC，挂载这个 PVC 对应的 Volume，从而获取到以前保存在 Volume 里的数据


**有了编号后，也即是有了在k8s网络上的唯一标识，StatefulSet 就使用 Kubernetes 里的两个标准功能:Headless Service 和 PV/PVC，实现了对 Pod 的拓扑状态和存储状态的维护。**

## 问题

在实际场景中，有一些分布式应用的集群是这么工作的:当一个新节点加入到集群时，或者老节
点被迁移后重建时，这个节点可以从主节点或者其他从节点那里同步到自己所需要的数据。
在这种情况下，你认为是否还有必要将这个节点 Pod 与它的 PV 进行一对一绑定呢?(提示: 这个问题的答案根据不同的项目是不同的。关键在于，重建后的节点进行数据恢复和同步的时 候，是不是一定需要原先它写在本地磁盘里的数据)

