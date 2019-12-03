
## pod和虚拟机（机器）
pod和机器的共同特征就是，它们都描述的是“机器”这个整体，而不是里面运行的“程序”。
- 配置“机器”的网卡：POD的网络定义
- 配置“机器”的磁盘：POD的存储定义
- 配置“机器”的防火墙：POD的安全定义
- “机器”运行在哪个物理服务器上：POD的调度

## POD的字段

- NodeName：表示这个pod已经被调度到了这个node上，主要是调试用的。
- HostAliases： 定义了POD的host文件(比如 /etc/hosts)里的内容
```yaml
apiVersion: v1
kind: Pod
...
spec:
  hostAliases:
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
...
```

和linux namespace打交道的也一定是POD级别的：
*POD的设计，就是让他们里面更多的容器尽可能多的共享linux namespace，让容器仅保留必要的隔离和限制的能力*

```shell
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  shareProcessNamespace: true
  containers:
    - name: nginx
      image: nginx
    - name: shell
      image: busybox
      stdin: true
      tty: true
```
上述的yaml就是开启了共享pid ns
当我们创建完这个pod之后，可以进入看，真的共享了PID NS：
```shell
# k exec -ti nginx -c shell sh
/ # ps au
PID   USER     TIME  COMMAND
    1 root      0:00 /pause
    7 root      0:00 nginx: master process nginx -g daemon off;
   13 101       0:00 nginx: worker process
   21 root      0:00 sh
   33 root      0:00 sh
   39 root      0:00 ps au
```
还可以共享宿主机的network，IPC和PID，看下面的yaml：
```shell
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  hostNetwork: true
  hostIPC: true
  hostPID: true
  containers:
    - name: nginx
      image: nginx
    - name: shell
      image: busybox
      tty: true
      stdin: true
```


最后是能通过POD的生命周期：
```shell
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
  - name: lifecycle-demo-container
    image: nginx
    lifecycle:
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo Hello from the postStart handler > /usr/share/message"]
      preStop:
        exec:
          command: ["/usr/sbin/nginx","-s","quit"]
```

结果：
```shell
# k exec -ti lifecycle-demo bash
root@lifecycle-demo:/# cat /usr/share/message
Hello from the postStart handler
```
- postStart: 在容器启动后，立刻执行一个指定的操作。虽然是在Docker 容器 ENTRYPOINT 执行之后，但是不是等Docker 容器 ENTRYPOINT 执行之后，不保证顺序。（postStart如果挂了，pod也挂了）
- preStop： 容器被杀死之前(比如，收到了 SIGKILL 信号)进行。他和postStart是不一样的，preStop是同步的，必须preStop执行玩之后pod才能退出，这就实现了优雅退出。


## pod的状态
当pod状态为Unknown时候，这是一个异常状态。意味着该pod不能持续的被kubelet汇报给apiserver，可能是主从节点通信（kubelet和apiserver）出现问题。

## 问题
你能否举出一些 Pod(即容器)的状态是 Running，但是应用其实已经停止服务的例子?相信 Java Web 开发者的亲身体会会比较多吧。
