
[k8s中所有的控制器位置](https://github.com/kubernetes/kubernetes/tree/master/pkg/controller)


所有的控制器都是遵循的同一种编排模式，即：控制循环（control loop）。

```shell
for {
    实际状态 := 获取集群中对象 X 的实际状态(Actual State) 
    期望状态 := 获取集群中对象 X 的期望状态(Desired State) 
    if 实际状态 == 期望状态{
        什么都不做
    } else {
     执行编排动作，将实际状态调整为期望状态
    } 
}
```

- 实际状态来自于k8s集群本身。比如，kubelet通过心跳汇报的容器状态和节点状态，监控系统中保存的应用监控数据或者控制器自己主动收集的
- 期望状态来自于用户提交的yaml文件

以下面的deplyment为例：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
        ports:
        - containerPort: 80
```
deployment对控制器模式的实现：
1. 从 Etcd 中获取到所有携带了“app: nginx”标签的 Pod，然后统计它们 的数量，这就是实际状态;
2. Deployment 对象的 Replicas 字段的值就是期望状态
3. Deployment 控制器将两个状态做比较，然后根据比较结果，确定是创建 Pod，还是删除已有 的 Pod

这个操作叫做调谐（Reconcile）。这个调谐的过程被称为“Reconcile Loop”（调谐循环）或者“Sync Loop”（同步循环）

而调谐的结果往往是对某种资源的写操作，比如增加 Pod，删除已有的 Pod，或者更新 Pod 的某个字段。


![image](https://user-images.githubusercontent.com/12036324/70105813-ddbb0b00-167c-11ea-94df-83dd29cdc0e4.png)

在所有 API 对象的 Metadata 里，都有一个字段叫作 ownerReference，用于保存 当前这个 API 对象的拥有者(Owner)的信息。

## 问题

1. 你能否说出，Kubernetes 使用的这个“控制器模式”，跟我们平常所说的“事件驱动”，有什么区 别和联系吗?

都是一个死循环，
区别1，“主动和被动”：
- 主动： 控制器模式是去主动搜集状态
- 被动：事件循环是等着别人去塞进来

区别2: “可重复”
- 一次性： 事件一般是一次性的，如果操作失败没有办法处理
- 重复：控制器模式是一直重复，等到期望状态

这些都归结于声明式api



2. pod能单独写出来，不写在deployment的template里面么

deployment的template是必写字段。

当然也是可以的，但是不仅要显示声明的label对上，还要有pod-template-hash这个label，也的对应上即可。
