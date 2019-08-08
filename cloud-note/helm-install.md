# 安装Helm
[kubernetes之helm简介、安装、配置、使用指南](https://blog.csdn.net/bbwangj/article/details/81087911)
## 安装Helm客户端


https://github.com/helm/helm/releases

这个地址里面找到对应的wget下来，以linux amd64举例：
1. wget https://get.helm.sh/helm-v2.14.3-linux-amd64.tar.gz
2. 解压 tar xvf https://get.helm.sh/helm-v2.14.3-linux-amd64.tar.gz
3. 把命令移动到/usr/local/bin： cd linux-amd64;cp helm 到/usr/local/bin

## 安装服务端


### 1. 先查看集群的基础状态(cluster-status)是否是okde

```shell
k get cs

NAME                 STATUS    MESSAGE              ERROR
controller-manager   Healthy   ok
scheduler            Healthy   ok
etcd-0               Healthy   {"health": "true"}

```
### 2. 在k8s集群中的每个节点安装socat

yum install -y socat

不安装一会儿会报下面的错误

```shell
E0522 22:22:15.492436   24409 portforward.go:331] an error occurred forwarding 38398 -> 44134: error forwarding port 44134 to pod dc6da4ab99ad9c497c0cef1776b9dd18e0a612d507e2746ed63d36ef40f30174, uid : unable to do port forwarding: socat not found.
Error: cannot connect to Tiller
```

### 3.1 能翻墙安装

Tiller 是以 Deployment 方式部署在 Kubernetes 集群中的，只需使用以下指令便可简单的完成安装。


如果能翻墙： `helm init`

### 3.2 不能翻墙安装

由于 Helm 默认会去 storage.googleapis.com 拉取镜像，如果你当前执行的机器不能访问该域名的话可以使用以下命令来安装：

1. helm init --client-only --stable-repo-url https://aliacs-app-catalog.oss-cn-hangzhou.aliyuncs.com/charts/
2. helm repo add incubator https://aliacs-app-catalog.oss-cn-hangzhou.aliyuncs.com/charts-incubator/
3. helm repo update
4. 创建服务端：helm init --service-account tiller --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.9.1  --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts
# 创建TLS认证服务端，参考地址：https://github.com/gjmzj/kubeasz/blob/master/docs/guide/helm.md
5. helm init --service-account tiller --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.9.1 --tiller-tls-cert /etc/kubernetes/ssl/tiller001.pem --tiller-tls-key /etc/kubernetes/ssl/tiller001-key.pem --tls-ca-cert /etc/kubernetes/ssl/ca.pem --tiller-namespace kube-system --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts
# -i指定自己的镜像


### 给 Tiller 授权


1. 创建 Kubernetes 的服务帐号和绑定角色
k create serviceaccount --namespace kube-system tiller
k create clusterrolebinding tiller-cluster-rule --clusterrole=cluster-admin --serviceaccount=kube-system:tiller
2. 为 Tiller 设置帐号
k patch deploy --namespace kube-system tiller-deploy -p '{"spec":{"template":{"spec":{"serviceAccount":"tiller"}}}}'
3. 查看是否授权成功
k get deploy --namespace kube-system   tiller-deploy  --output yaml|grep  serviceAccount
4. 验证
k -n kube-system get pods
helm version

```shell
Client: &version.Version{SemVer:"v2.14.3", GitCommit:"0e7f3b6637f7af8fcfddb3d2941fcc7cbebb0085", GitTreeState:"clean"}
Server: &version.Version{SemVer:"v2.9.1", GitCommit:"20adb27c7c5868466912eebdf6664e7390ebe710", GitTreeState:"clean"}
```


## 更换仓库

```shell
# 先移除原先的仓库
helm repo remove stable
# 添加新的仓库地址
helm repo add stable https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts
# 更新仓库
helm repo update
```






