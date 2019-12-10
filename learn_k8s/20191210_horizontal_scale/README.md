# 作业副本与水平扩展


*Deployment*是一个两层控制器：
- 通过ReplicaSet的个数描述应用的版本
- 通过ReplicaSet的属性控制副本数量


## Deployment 和 ReplicaSet

![image](https://user-images.githubusercontent.com/12036324/70490077-6e3f9280-1b38-11ea-8127-38765bfc031b.png)

- ReplicaSet通过控制器模式，保证系统中pod的数量永远等于指定的数量。
- Deployment通过控制器模式，来操作ReplicaSet的属性和个数，进而实现“滚动更新”和“水平扩展 / 收缩”

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
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

先创建一下`kubectl create -f nginx-deployment.yaml --record`.
–record 参数的作用就是记录每一步所执行的操作，方便后续查看。

```shell
# kubectl get deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   0/3     3            0           1s
# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   3         3         1       7s
```
这个随机字符串（5754944d6c）叫做pod-template-hash，ReplicaSet会把这个随机字符串加在它所控制的pod的label里面，从而保证这些pod不会和其他集群的pod混淆。
可以通过下面下面的指令实时查看Deployment对象的实时变化：
```shell
# kubectl rollout status deployment/nginx-deployment
deployment "nginx-deployment" successfully rolled out
```


我们可以通过edit指令编辑直接修改正在运行的资源，比如我们把nginx的镜像从1.7.9变为1.9.1。
```shell
# kubectl edit deploy nginx-deployment
deployment.extensions/nginx-deployment edited
# kubectl rollout status deployment/nginx-deployment
Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
```

我们能通过看deployment的Event查看怎么滚动升级的：
```shell
...
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-7448597cd5 (3/3 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  8m52s  deployment-controller  Scaled up replica set nginx-deployment-5754944d6c to 3
  Normal  ScalingReplicaSet  3m4s   deployment-controller  Scaled up replica set nginx-deployment-7448597cd5 to 1
  Normal  ScalingReplicaSet  52s    deployment-controller  Scaled down replica set nginx-deployment-5754944d6c to 2
  Normal  ScalingReplicaSet  52s    deployment-controller  Scaled up replica set nginx-deployment-7448597cd5 to 2
  Normal  ScalingReplicaSet  19s    deployment-controller  Scaled down replica set nginx-deployment-5754944d6c to 1
  Normal  ScalingReplicaSet  19s    deployment-controller  Scaled up replica set nginx-deployment-7448597cd5 to 3
  Normal  ScalingReplicaSet  16s    deployment-controller  Scaled down replica set nginx-deployment-5754944d6c to 0
```

Deployment对象中有个RollingUpdateStrategy字段，如下所示：
```shell
...
spec:
...
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
```
- maxSurge: 在滚动更新中，最多能再创建几个pod
- maxUnavailable： 在滚动更新中，最多可以删除几个pod

如果写的是百分比的话，针对的是ReplicaSet的DESIRED字段的百分比。

上面说完了滚动升级，下面是比较简单的水平扩展：
```shell
kubectl scale deployment nginx-deployment --replicas=4
```


水平扩展和滚动升级之后，我们就能把三者的关系图变为如下：
![image](https://user-images.githubusercontent.com/12036324/70491666-dabc9080-1b3c-11ea-811f-fb0edb269e2c.png)

每个应用的版本对应的是一个ReplicaSet。这个版本应用的 Pod 数量，则由 ReplicaSet 通过它自己的控制器(ReplicaSet Controller)来保证

## Deployment 对应用进行版本控制的具体原理

deployment的回滚：

回滚的上一次：
```shell
kubectl rollout undo deployment/nginx-deployment
```
回滚到某一次：
先看历史：
```shell
kubectl rollout history deployment/nginx-deployment
```
查看某个版本的细节：
```
kubectl rollout history deployment/nginx-deployment --revision=2
```
回滚到某个版本：
```shell
kubectl rollout undo deployment/nginx-deployment --to-revision=2
deployment.extensions/nginx-deployment
```


如果你觉得每次depoyment的更新操作都会创建一个RS，会不会很浪费资源呢。
k8s也提供一个指令，使得我们对 Deployment 的多次更新操作，最后 只生成一个 ReplicaSet。
```shell
kubectl rollout pause deployment/nginx-deployment
deployment.extensions/nginx-deployment paused
```
我们一波操作之后能恢复回来：
```shell
kubectl rollout resume deploy/nginx-deployment
deployment.extensions/nginx-deployment resumed
```

Deployment 对象有一个字段，叫作 spec.revisionHistoryLimit，就是 Kubernetes 为 Deployment 保留的“历史版本”个数。所以，如果把它设置为 0，你就再也不能做回滚操 作了。


https://github.com/ContainerSolutions/k8s-deployment-strategies
