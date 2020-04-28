

## 环境准备
本文以centos 7为例，其他Linux平台类似

### go 版本和k8s版本的对应关系

| Kubernetes     | requires Go |
|----------------|-------------|
| 1.0 - 1.2      | 1.4.2       |
| 1.3, 1.4       | 1.6         |
| 1.5, 1.6       | 1.7 - 1.7.5 |
| 1.7            | 1.8.1       |
| 1.8            | 1.8.3       |
| 1.9            | 1.9.1       |
| 1.10           | 1.9.1       |
| 1.11           | 1.10.2      |
| 1.12           | 1.10.4      |
| 1.13           | 1.11.13     |
| 1.14 - 1.16    | 1.12.9      |
| 1.17+          | 1.13.4      |

如果你编译k8s 1.16的代码，就要用1.12.9的go环境，编译k8s 1.8的环境的就要用1.8.3的go环境。

### 安装go环境
在这个[地址](https://golang.google.cn/dl/)中查找你要安装的golang环境。
因为我要调试的是k8s 1.16，下面我以为1.12.9为例（一定要根据调试的k8s版本的选择go版本哟），搞一下：

```shell

# 下载二进制包
wget https://dl.google.com/go/go1.12.9.linux-amd64.tar.gz
ll go1.12.9.linux-amd64.tar.gz

# 解压二进制包到*/usr/loacl*目录下
tar -C /usr/local -zxvf go1.12.9.linux-amd64.tar.gz

# 将*/usr/loacl/go/bin*添加到环境变量中
讲下面的三行加入到/etc/profile
export GOROOT=/usr/local/go
export PATH=$PATH:$GOROOT/bin
export GOPATH=/home/gopath

source /etc/profile

# 查看gopath
echo $GOPATH
```
然后就大公告成了。


*注*：
如果你要调试多个版本的k8s，只需要把其他版本的go二进制包，放在其他目录下，然后修改`/etc/profile`的*GOROOT*，即可。

### clone k8s代码

可以直接从github上clone
```shell
mkdir -p  $GOPATH/src/k8s.io
cd $GOPATH/src/k8s.io
git clone https://github.com/kubernetes/kubernetes.git
```
*注*：这个过程可能会比较慢，可以看看加速github方法：[国内加速 GitHub 访问方法](https://blog.cuixx.com/1707.html)

clone之后，进入kubernetes目录，通过*git tag*命令就能你要调试的版本，通过**git branch  your_banch_name tag_name**(your_banch_name是取一个自己的分支名，tag_name是你要基于哪个k8s版本新建分支)


## 编译k8s

我们都知道k8s的组件，有两种部署方式，一是直接通过systemd管理的方式部署到宿主机，二是部署在k8s中，通过k8s管理。这两种方式对应下面的两种编译方式：*本地编译*和*容器编译*。

### 本地编译

```shell
kubernetes]# KUBE_BUILD_PLATFORMS=linux/amd64 make all  cmd/kubelet GOFLAGS=-v
+++ [0405 10:39:21] Building go targets for linux/amd64:
    cmd/kube-proxy
    cmd/kube-apiserver
    cmd/kube-controller-manager
    cmd/kubelet
    cmd/kubeadm
    cmd/hyperkube
    cmd/kube-scheduler
    ....
```
其中：
- WHAT：编译的组件，如果不传递默认是所有组件
- GOFLAGS: *go build*的时候传入的扩展参数
还有几个没提到的：
- GOLDFLAGS：*go build*的时候传入的额外链接参数
- GOGCFLAGS： *go build*的时候编译参数
具体怎么实现的可以查看这个[脚本](https://github.com/kubernetes/kubernetes/blob/master/build/root/Makefile)

编译完的二进制在*_output/bin/*目录下，我们可以看看刚才编译出来的kubelet的版本：
```shell
kubernetes]# _output/bin/kubelet --version
Kubernetes v1.16.8-dirty
```

也可以直接进入对应组件目录去build
```shell
cd cmd/kubelet/
kubelet]# ll
总用量 12
drwxr-xr-x 3 root root  308 3月  31 15:47 app
-rw-r--r-- 1 root root 1002 3月  31 15:47 BUILD
-rw-r--r-- 1 root root 1426 3月  31 15:47 kubelet.go
-rw-r--r-- 1 root root  189 3月  31 15:43 OWNERS
kubelet]# go build
kubelet]# ll
总用量 139520
drwxr-xr-x 3 root root       308 3月  31 15:47 app
-rw-r--r-- 1 root root      1002 3月  31 15:47 BUILD
-rwxr-xr-x 1 root root 142853248 4月   5 10:51 kubelet
-rw-r--r-- 1 root root      1426 3月  31 15:47 kubelet.go
-rw-r--r-- 1 root root       189 3月  31 15:43 OWNERS
kubelet]# ./kubelet --version
Kubernetes v0.0.0-master+$Format:%h$

### 容器编译

首先查看kube-cross的版本号，因为这个版本号要决定我们拉哪个版本的docker镜像(我这里编译的1.12的k8s)：
```shell
kubernetes]# cat ./build/build-image/cross/VERSION
v1.10.8-1
```

查看debian-iptables-amd64镜像的版本号：
```shell
kubernetes]# egrep -Rn "debian_iptables_version=" ./build/
./build/common.sh:88:  debian_iptables_version=v11.0.2
```

拉取对应的镜像
```shell
docker pull mirrorgooglecontainers/pause-amd64:3.1
docker pull mirrorgooglecontainers/kube-cross:v1.10.8-1
docker pull mirrorgooglecontainers/debian-base-amd64:0.4.0
docker pull mirrorgooglecontainers/debian-iptables-amd64:v11.0.2
docker pull mirrorgooglecontainers/debian-hyperkube-base-amd64:0.12.0

docker tag mirrorgooglecontainers/pause-amd64:3.1 k8s.gcr.io/pause-amd64:3.1
docker tag mirrorgooglecontainers/kube-cross:v1.10.8-1 k8s.gcr.io/kube-cross:v1.10.8-1
docker tag mirrorgooglecontainers/debian-base-amd64:0.4.0 k8s.gcr.io/debian-base-amd64:0.4.0
docker tag mirrorgooglecontainers/debian-iptables-amd64:v11.0.2 k8s.gcr.io/debian-iptables-amd64:v11.0.2
docker tag mirrorgooglecontainers/debian-hyperkube-base-amd64:0.12.0 k8s.gcr.io/debian-hyperkube-base-amd64:0.12.0
```

修改*build/lib/release.sh*文件，把自动pull去掉
```shell
"${DOCKER[@]}" build --pull -q -t "${docker_image_tag}" ${docker_build_path} >/dev/null
修改为:
"${DOCKER[@]}" build -q -t "${docker_image_tag}" ${docker_build_path} >/dev/null
```


编译之后就能在目录*_output/release-images/amd64/*先看到对应的tar包：
```shell
kubernetes]# ll _output/release-images/amd64/
总用量 643044
-rw-r--r-- 2 root root 144272896 4月   6 10:41 cloud-controller-manager.tar
-rw-r--r-- 2 root root 194008576 4月   6 10:41 kube-apiserver.tar
-rw-r--r-- 2 root root 164198400 4月   6 10:41 kube-controller-manager.tar
-rw-r--r-- 2 root root  97486848 4月   6 10:40 kube-proxy.tar
-rw-r--r-- 2 root root  58501632 4月   6 10:41 kube-scheduler.tar
```

通过如下的命令执行编译：
```shell
KUBE_BUILD_PLATFORMS=linux/amd64 KUBE_BUILD_CONFORMANCE=n KUBE_BUILD_HYPERKUBE=n make release-images GOFLAGS=-v GOGCFLAGS="-N -l"
```
- KUBE_BUILD_CONFORMANCE 和KUBE_BUILD_HYPERKUBE和n表示不用build *hyperkube-amd64*和*conformance-amd64*镜像
- make release-images指的是执行命令，具体执行的是这个[脚本](https://github.com/kubernetes/kubernetes/blob/v1.12.10/build/release-images.sh)

可以通过docker load把镜像load进来：
```shell
kubernetes]# docker load -i  _output/release-images/amd64/kube-proxy.tar
51507f049263: Loading layer [==================================================>]   50.2MB/50.2MB
Loaded image: k8s.gcr.io/kube-proxy:v1.12.10-dirty
Loaded image: gcr.io/google_containers/kube-proxy:v1.12.10-dirty
kubernetes]# docker images | grep kube-proxy
gcr.io/google_containers/kube-proxy                             v1.12.10-dirty                 f39a2d37a947        3 minutes ago       95.6MB
k8s.gcr.io/kube-proxy                                           v1.12.10-dirty                 f39a2d37a947        3 minutes ago       95.6MB
```

可以修改*kubernetes/hack/lib/version.sh*将变量KUBE_GIT_TREE_STATE从“diary”修改为“clean”。
- diary：表示源代码有修改
- clean：表示没有修改，能保证版本号干净

如果想更加深入了解可以查看这个[文档](https://github.com/kubernetes/kubernetes/tree/v1.12.10/build)


