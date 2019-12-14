#  容器化守护进程的意义:DaemonSet

## Daemonset的含义和作用

### 1、daemonset的三个特征
- 这个pod运行在k8s集群里的每一个节点上
- 每个节点上只有一个pod实例
- 当有新节点加入k8s集群后，该pod会被自动地在新节点上被创建出来；当旧节点被删除后，它上面的pod也会被相应的回收

比如具体的例子有：
1. 各种网络插件的Agent组件
2. 各种存储的Agent组件
3. 各种监控组件和日志组件

## DaemonSet如何在指定的node上创建新pod
可以用nodeAffinity（nodeSelector即将被nodeAffinity）替代
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: metadata.name
            operator: In
            values:
            - node-geektime
```
nodeAffinity的含义是：
1. requiredDuringSchedulingIgnoredDuringExecution: 这个 nodeAffinity 必须在每次调度的时候予以考虑
2. 这个 Pod，将来只允许运行在“metadata.name”是“node-geektime”的节点上。

所以DaemonSet Controller会在创建POD的时候，自动在这个pod的API对象中加上这样一个nodeAffinity定义。其中需要绑定的节点名字，正是当前正在遍历的这个node。


此外DaemonSet还会给这个pod自动加上另外一个调度相关的字段，叫做tolerations。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-toleration
spec:
  tolerations:
  - key: node.kubernetes.io/unschedulable
    operator: Exists
    effect: NoSchedule
```
“容忍”所有被标记为 unschedulable“污点”的 Node;“容 忍”的效果是允许调度。



## controllerrevision

deploy是通过RS控制的应用版本，其他的控制器没有用这么麻烦，就用的controllerrevision这个资源。

```shell
# kubectl get controllerrevision -n kube-system -l name=fluentd-elasticsearch
NAME                               CONTROLLER                             REVISION   AGE
fluentd-elasticsearch-779b49fbd9   daemonset.apps/fluentd-elasticsearch   1          9h
```
查看daemonset的版本：
```shell
# kubectl rollout history daemonset fluentd-elasticsearch -n kube-system
daemonset.extensions/fluentd-elasticsearch
REVISION  CHANGE-CAUSE
1         <none>
```
版本回退：
```shell
kubectl rollout undo daemonset fluentd-elasticsearch --to-revision=1 -n kube-system
```





