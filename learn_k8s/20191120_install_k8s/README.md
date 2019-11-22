
- [source code](https://github.com/kubernetes/kubernetes/tree/master/cmd/kubeadm)
- [kubeadm cmd source code](https://github.com/kubernetes/kubernetes/tree/master/cmd/kubeadm/app/cmd/phases)

## kubeamd 工作原理
在 Kubernetes 早期的部署脚本里，确实有一个脚本就是用 Docker 部署 Kubernetes 项 目的，这个脚本相比于 SaltStack 等的部署方式，也的确简单了不少。

但是，这样做会带来一个很麻烦的问题，即:**如何容器化 kubelet**。


kubelet是用来操作docker容器运行时的核心组件，除了CRI以外，kubelet在配置容器网络，管理容器数据卷时，都需要操作宿主机。


网络可以直接用宿主机的网络（host network，也就是不开启Network Namespace），但是让kubelet隔着容器操作宿主机的文件系统，就有点麻烦了。

可是，这时候问题来了。由于现在 kubelet 是运行在容器里的，这就意味着它要做的这个“mount -F nfs”命令，被隔离在了一个单独的 Mount Namespace 中。即，kubelet 做的挂载操作，不能 被“传播”到宿主机上。

kubeadm就把kubelet直接部署在宿主机上了。


## kubeamd init工作流程

### 一、Preflight Checks

进行一系列的检查，源码调用[preflight.go](https://github.com/kubernetes/kubernetes/blob/master/cmd/kubeadm/app/cmd/phases/init/preflight.go)

其中使用了：[k8s.io/kubernetes/cmd/kubeadm/app/preflight](https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/preflight)

-  Linux 内核的版本必须是否是 3.10 以上?
- Linux Cgroups 模块是否可用?
- 机器的 hostname 是否标准?在 Kubernetes 项目里，机器的名字以及一切存储在 Etcd 中的 API 对象，都必须使用标准的 DNS 命名(RFC 1123)。
- 用户安装的 kubeadm 和 kubelet 的版本是否匹配?
- 机器上是不是已经安装了 Kubernetes 的二进制文件?
- Kubernetes 的工作端口 10250/10251/10252 端口是不是已经被占用
- ip、mount 等 Linux 指令是否存在?
- Docker 是否已经安装?
- ...

### 二、生成Kubernetes 对外提供服务所需 的各种证书和对应的目录。

Kubernetes 对外提供服务时，除非专门开启“不安全模式”，否则都要通过 HTTPS 才能访问 kube-apiserver。这就需要为 Kubernetes 集群配置好证书文件。
所有的证书都在* /etc/kubernetes/pki*下。
最主要的证书是下面两个，通过这个生成不同的证书给集群中不同组件使用
```shell
ll /etc/kubernetes/pki/sa.*
-rw------- 1 root root 1675 6月  10 16:49 /etc/kubernetes/pki/sa.key
-rw------- 1 root root  451 6月  10 16:49 /etc/kubernetes/pki/sa.pub
```
通过kubele直接访问apiserver也是要认证的，kubeamd会生成下面的证书和私钥：
```shell
# ll /etc/kubernetes/pki/apiserver-kubelet-client.*
-rw-r--r-- 1 root root 1099 6月  10 16:49 /etc/kubernetes/pki/apiserver-kubelet-client.crt
-rw------- 1 root root 1679 6月  10 16:49 /etc/kubernetes/pki/apiserver-kubelet-client.key
```

### 三、为其他组件生成访问apiserver的配置文件

```shell
# ll /etc/kubernetes/*.conf
-rw------- 1 root root 5450 6月  10 16:49 /etc/kubernetes/admin.conf
-rw------- 1 root root 5486 6月  10 16:49 /etc/kubernetes/controller-manager.conf
-rw------- 1 root root 5514 6月  10 16:49 /etc/kubernetes/kubelet.conf
-rw------- 1 root root 5438 6月  10 16:49 /etc/kubernetes/scheduler.conf
```
这些文件里面记录的是，当前这个 Master 节点的服务器地址、监听端口、证书目录等信息。这 样，对应的客户端(比如 scheduler，kubelet 等)，可以直接加载相应的文件，使用里面的信息与 kube-apiserver 建立安全连接。

### 四、为master节点的组件生成静态pod
当kubelet启动的时候会自动检查*/etc/kubernetes/manifests/*目录下面的所有文件，加载所有的yaml文件，然后在机器上启动它们。

```shell
# ll  -t /etc/kubernetes/manifests/
总用量 16
-rw------- 1 root root 1933 6月  10 16:49 etcd.yaml
-rw------- 1 root root  990 6月  10 16:49 kube-scheduler.yaml
-rw------- 1 root root 2486 6月  10 16:49 kube-controller-manager.yaml
-rw------- 1 root root 2608 6月  10 16:49 kube-apiserver.yaml
```
### 五、安装后检查
kubeadm 会通过检查 localhost:6443/healthz 这个 Master 组件的健康检查 URL，等待 Master 组件完全运行起来。

然后，kubeadm 就会为集群生成一个 bootstrap token。在后面，只要持有这个 token，任何一 个安装了 kubelet 和 kubadm 的节点，都可以通过 kubeadm join 加入到这个集群当中。


有了这个token之后，kubeadm会将 ca.crt 等 Master 节点的重要信息，通过 ConfigMap 的方式 保存在 Etcd 当中，供后续部署 Node 节点使用。这个 ConfigMap 的名字是 cluster-info。
```shell
# kubectl get cm cluster-info -n kube-public
NAME           DATA   AGE
cluster-info   1      162d
```
### 六、安装默认插件
Kubernetes 默认 kube-proxy 和 DNS 这两个插 件是必须安装的。它们分别用来提供整个集群的服务发现和 DNS 功能。其实，这两个插件也只是两个容器镜像而已，所以 kubeadm 只要用 Kubernetes 客户端创建两个 Pod 就可以了。

### 参考：
- [kubeadm init](https://kubernetes.io/zh/docs/reference/setup-tools/kubeadm/kubeadm-init/)
- 

## kubeamd join工作流程
kubeadm init 生成 bootstrap token 之后，你就可以在任意一台安装了kubelet 和 kubeadm 的机器上执行 kubeadm join 了。

如果想要称为集群中的节点，就必须在集群的kube-apiserver上注册。要想和apiserver打交道，这台证书就必须要获取对应的证书文件（CA证书）。

但是为了能一键安装，就不能让用户去master节点手动拷贝这些文件。


所以kubeadm至少需要发起一次“不安全模式”的访问到apiserver，从而拿到保存在ConfigMap中的clustor-info（保存了APIServer的授权信息）。而bootstrap token扮演的就是这个过程中安全认证的角色。


只要有了 cluster-info 里的 kube-apiserver 的地址、端口、证书，kubelet 就可以以“安全模 式”连接到 apiserver 上，这样一个新的节点就部署完成了。

## 配置 kubeadm 的部署参数

```shell
kubeadm init --config kubeadm.yaml
```
比如要指定apiserver的参数，那么只要加下面这段信息：
```yaml
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
kubernetesVersion: v1.16.0
apiServer:
  extraArgs:
    advertise-address: 192.168.0.103
    anonymous-auth: "false"
    enable-admission-plugins: AlwaysPullImages,DefaultStorageClass
    audit-log-path: /home/johndoe/audit.log
```
然后，kubeadm 就会使用上面这些信息替换 /etc/kubernetes/manifests/kube-apiserver.yaml 里的 command 字段里的参数了。
基本上这个参数什么都能改，国内用户还能改镜像地址之类的。


### 参考：
- [Customizing control plane configuration with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/#apiserver-flags)



## 问题

### 一、你是否使用其他工具部署过 Kubernetes 项目?经历如何?

- [kubespray](https://github.com/kubernetes-sigs/kubespray)
- [kubeasz](https://github.com/easzlab/kubeasz)

### 二、你是否知道 Kubernetes 项目当前(v1.11)能够有效管理的集群规模是多少个节点?你在生产 环境中希望部署或者正在部署的集群规模又是多少个节点呢?

- No more than 5000 nodes
- No more than 150000 total pods
- No more than 300000 total containers
- No more than 100 pods per node

### 三、在 Linux 上为一个类似 kube-apiserver 的 Web Server 制作证书，你知道可以用哪些工具实 现吗?

openssl
还可以使用 GnuGPG，或者 keybase。
### 四、回忆一下 Kubernetes 架构，你能够说出 Kubernetes 各个功能组件之 间(包含 Etcd)，都有哪些建立连接或者调用的方式吗?(比如:HTTP/HTTPS，远程调用等 等)

https://www.huweihuang.com/article/kubernetes/kubernetes-architecture/
