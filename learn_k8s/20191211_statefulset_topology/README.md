# StatefulSet: 拓扑状态

## StatefulSet的作用
有状态应用：
- 分布式应用：主从关系、主备关系
- 数据存储类应用： 无状态应用的实例一旦被杀掉，重建之后，实例和数据的对应关系就丢失了，从而导致应用失败。

所以，实例之间有不对等关系，以及实例对外部数据有依赖关系的应用，就被称为“有状态应用”。

StatefulSet把有状态应用抽象为两种：
- 拓扑状态： pod的启动有先后顺序
- 存储状态：pod重不重建，都要保证读取到的是一个数据库应用

Stateful的核心功能就是通过某种方式去记录这些状态，然后在pod重建的时候，为pod恢复这些状态。

## Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
app: nginx
```

Headless Service 不需要分配一个 VIP，而是可以直接以 DNS 记录 的方式解析出被代理 Pod 的 IP 地址。


这个的作用就是不要service VIP的负载均衡的功能，通过*<pod-name>.<svc-name>.<namespace>.svc.cluster.local*对应唯一的一个pod服务。


有了这个“可解析身份”，只要你知道了一个 Pod 的名字，以及它对应的 Service 的名字，你 就可以非常确定地通过这条 DNS 记录访问到 Pod 的 IP 地址。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 2
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
        image: nginx:1.9.1
        ports:
        - containerPort: 80
        name: web
```

`serviceName=nginx`就是告诉 StatefulSet 控制器，在执行控制循环(Control Loop)的时候， 请使用 nginx 这个 Headless Service 来保证 Pod 的“可解析身份”。

可以通过下面的命令查看他们的hostname：
```shell
kubectl exec web-0 -- sh -c 'hostname'
web-0
$ kubectl exec web-1 -- sh -c 'hostname'
web-1
```

```shell
kubectl run -i --tty --image busybox dns-test --restart=Never --rm /bin/sh
```
通过这条命令，我们启动了一个一次性的 Pod，因为–rm 意味着 Pod 退出后就会被删除掉。然 后，在这个 Pod 的容器里面，我们尝试用 nslookup 命令，解析一下 Pod 对应的 Headless Service:

```shell
# kubectl run -i --tty --image busybox:1.28.4 dns-test --restart=Never --rm /bin/sh
If you don't see a command prompt, try pressing enter.
/ # nslookup web-0.nginx
Server:    10.68.0.2
Address 1: 10.68.0.2 kube-dns.kube-system.svc.cluster.local

Name:      web-0.nginx
Address 1: 172.20.2.17 web-0.nginx.default.svc.cluster.local
```


## 总结

StatefulSet控制器的主要作用：
- 使用pod模版创建pod的时候，对他们进行编号，并且按照编号顺序逐一完成创建工作
- 当 StatefulSet 的“控 制循环”发现 Pod 的“实际状态”与“期望状态”不一致，需要新建或者删除 Pod 进行“调谐”的时候，它会严格按照这些 Pod 编号的顺序，逐一完成这些操 作。
- 通过 Headless Service 的方式，StatefulSet 为每个 Pod 创建了一个固定并且稳定 的 DNS 记录，来作为它的访问入口。


**在部署“有状态应用”的时候，应用的每个实例拥有唯一并且稳定的“网络标识”，是一个非常重要的假设**


## 问题
你曾经运维过哪些有拓扑状态的应用呢(比如:主从、主主、主备、一主多从等结构)?你觉得 这些应用实例之间的拓扑关系，能否借助这种为 Pod 实例编号的方式表达出来呢?如果不能， 你觉得 Kubernetes 还应该为你提供哪些支持来管理这个拓扑状态呢?
