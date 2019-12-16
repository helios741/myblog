
# 【翻译】：Kubernetes TLS bootstrapping

[原文地址](https://medium.com/@toddrosner/kubernetes-tls-bootstrapping-cf203776abc7)

译者注：
本文会把bootstrapping翻译为引导，但是为了给一些不适应的朋友体验，在涉及到bootstrapping的时候都会又*引导（bootstrapping）*的标注。



本文是介绍在k8s集群中节点和kubelet基于引导（bootstrapping）TLS通信的。这里（[kubelet-tls-bootstrapping](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet-tls-bootstrapping/)）有k8s的官方文档去介绍如何支持TLS引导（bootstrapping），并且这也是你必须去读的，但是并非始终的依靠它来满足你需求。您可能会通过github issue或者Stack Overflow中搜寻你遇到的问题。也就是说写这篇文章的目的不是为了替代k8s的官方文档，而是为了解答您可能遇到的问题。

注：本文是基于k8s 1.9版本的，如果你使用的版本小于1.9 ，您可能需要去寻找让*引导（bootstrapping）*生效的特殊要求。


当然，本文基于你已经使用cfssl工具创建了CA，相关的信息已经配置在etcd，api-server，kube-controller-manager，也就是说他们之间数据传输传输都要加密，以及身份验证。


## 目标

首先要说一下TLS*引导（bootstrapping）*的目标。
*引导（bootstrapping）*旨在简化将节点安全加入master的功能，还包括节点的扩缩容的问题。如果你不使用*引导（bootstrapping）*要么worker节点和master节点之间不加密通信，要么您必须手动更新TLS CSR的主机名和IP，然后重新生成证书和密钥并将其分发给每个master节点和worker节点。下图展示了TLS *引导（bootstrapping）*的流程：
![image](https://user-images.githubusercontent.com/12036324/70534302-ba6cf000-1b95-11ea-9207-1f08ba804619.png)

kubelet首先会去寻找kubeconfig文件，如果又kubeconfig文件，那么说明该节点和kubelet可能已经配置过认证信息，并且在启动的时候加入集群。如果kubeconfig文件不存在，kubelet将要使用bootstrap.kubeconfig文件，建立认证请求，当*引导（bootstrapping）*成功的时候动态的建立kubeconfig文件。

下图展示了每个节点的kubelet-bootstrap用户和每个节点本身的CSR。kubelet-bootstrap 用户的CSR会被自动approved，节点的CSR等待cluster-admin去approved。
![image](https://user-images.githubusercontent.com/12036324/70535105-6b27bf00-1b97-11ea-984f-044610e01897.png)

注：
*kubectl get nodes*命令没有节点返回，这是因为*system:node*的CSR还没有被approved。


现在已经建立了目标示例，让我们来看看实现这个目标的重要组成部分。


## token认证

启动进程的核心就是token认证。如果你对token认证的知识一无所知，请先看看k8s的官网：[static-token-file](https://kubernetes.io/docs/admin/authentication/#static-token-file).
在k8s官网中通过使用*/dev/urandom*生成token,然后在token.csv中增加username,UID和group。
```shell
head -c 16 /dev/urandom | od -An -t x | tr -d ' '
```

下图展示了token.csv 的内容。正如本例中所见，有两个实体：admin和kubelet-bootstrap。
- admin那行支持使用kubelet进行远程的身份验证
- kubelet-bootstrap 那一行是为启动kubelet准备的
![image](https://user-images.githubusercontent.com/12036324/70862812-2d9ea980-1f7c-11ea-88f5-f73600a036b1.png)
注：
*kubelet-bootstrap*那一行包含了叫做*system:node-bootstrapper*的group/role。如果你的集群支持RBAC就能通过*kubectl get clusterroles*看到这些角色，这些角色允许你create、get、list以及watch证书签名请求（CSR）。为了让TLS*引导（bootstrapping）*能成功，kubelet-bootstrap用户必须是这个组的成员。

## kubelet

因为开启引导（bootstrapping）kubelet需要特别的配置。下面的两个参数需要加入到kubelet的配置中，为了引导（bootstrap）配置，后引导（bootstrap）配置以及证书轮换。
```shell
--kubeconfig=/var/lib/kubelet/kubeconfig \
--bootstrap-kubeconfig=/var/lib/kubelet/bootstrap.kubeconfig
```
注意到不仅要有一个bootstrap.kubeconfig文件，还要有kubeconfig文件。
这是因为bootstrap.kubeconfig提供了和api-server、controller-manager建立连接的用户和具有最小权限的token（在token.csv中）。一旦建立连接，进而由controller-manager对生成的CSR进行签名之后，kubelet将动态的创建包含客户端证书和私钥的kubeconfig，然后kubelet为该节点生成另一个CSR，这个CSR需要在该节点被使用之前被手动approved。


下图展示可bootstrap.kubeconfig的文件内容：
![image](https://user-images.githubusercontent.com/12036324/70863171-3f824b80-1f80-11ea-8d23-a207f79ce1e9.png)
注意证书数据里面包含证书的签发机构。这是在生成bootstrap.kubeconfig时候被满足的一个要求。
```shell
kubectl config set-cluster ${project} \
  --certificate-authority=tls/ca.pem \
  --embed-certs=true \
  --server=https://${kubernetes_public_address}:6443
```
- project变量： 和集群名相关
- kubernetes_public_address变量：集群地址

下图展示了动态生成kube-config文件。客户端证书和私钥是kubelet自动生成的，随后用于以后的所有身份认证：
![image](https://user-images.githubusercontent.com/12036324/70863262-11513b80-1f81-11ea-93c2-9848266e79a3.png)


## kube-apiserver
kube-apiserver的host配置用于进行kubelet的认证和授权，这是为了确保kubelet和node能引导至集群，并且被approved最终由scheduler进行配置。


创建token.csv之后，将下面的配置添加到kube-apiserver的配置中：
```shell
--authorization-mode=Node,ABAC,RBAC \
--token-auth-file=/var/lib/kubernetes/token.csv \
```
节点的认证模型允许kubelet去执行api操作，以至于他能被引导进集群。涉及到TLS引导（bootstrapping）时，kubelet和apiserver进行联系，如果用户名和token引用了在token.csv中system:node-bootstrapper角色的，那么apiserver允许kuelet去create、get、list以及watch证书请求（CSR），就像下图所展示的。
![image](https://user-images.githubusercontent.com/12036324/70863496-c7b62000-1f83-11ea-8a2e-d0e1af655c3e.png)
可以使用ABAC和RBAC授权模型来支持从ABAC到RBAC到过渡，这是因为在TLS引导（bootstrapping）需要RBAC认证。

注：节点授权模型的顺序相当重要，如果你把RBAC放在Node前面，你能在api-server的日志中看到很多*RBAC DENY*，具体细节请看[RBAC Deny from get nodes, patch nodes/status, watch pods when using Node Authorization](https://github.com/kubernetes/kubernetes/issues/61511)


## kube-controller-manager

如前面所述，*kube-controller-manager*负责给所有的CSR签名因为扮演了很重要的角色。下面的配置需要加加到kube-controller-manager配置文件中：
```shell
--cluster-signing-cert-file=/etc/path/to/kubernetes/ca/ca.pem \
--cluster-signing-key-file=/etc/path/to/kubernetes/ca/ca.key \
```


## RBAC

如前所述，如果没有RBAC，*kubelet-bootstrap*用户不能加入已经开启了节点引导（bootstrapping）的集群。下面的三个命令需要执行以至于*kubelet-bootstrap*用户能够引导节点，以及CSR自动approved和自动续订（如果在主服务器中配置了自动续订）。
```shell
kubectl create clusterrolebinding kubelet-bootstrap \
  --clusterrole=system:node-bootstrapper \
  --user=kubelet-bootstrap
kubectl create clusterrolebinding node-client-auto-approve-csr \
  --clusterrole=system:certificates.k8s.io:certificatesigningrequests:nodeclient \
  --group=system:node-bootstrapper
kubectl create clusterrolebinding node-client-auto-renew-crt \
  --clusterrole=system:certificates.k8s.io:certificatesigningrequests:selfnodeclient \
  --group=system:nodes
```
完成以上步骤后，就可以配置kube-apiserver，kube-controller-manager和kubelet，kubelet在启动的时候想apiserver发起引导（bootstrap）程序请求，然后授权回发生在kubelet和controller-manager之间。

如果你不熟悉RBAC，请确保你的admin（在token.csv中）用户和cluster-admin的clusterrole进行 cluster role binding。如果您不这样做，那么您将很难在以后建立几种RBAC配置。
```shell
kubectl create clusterrolebinding cluster-admin-users \
  --clusterrole=cluster-admin \
  --user=admin
```

## Result

下图展示了*kubectl get csr*的输出：
![image](https://user-images.githubusercontent.com/12036324/70863819-0699a500-1f87-11ea-8725-b3f45ff8211f.png)
当CSR被approved的时候，就能通过*kubectl get nodes*看到集群中的节点了

## Auto Scaling

你可以还在想如何实现节点和kubelet的全自动伸缩，将*system:authenticated*组和cluster-admin进行进行bind能实现。但是这是不推荐和k8s的安全性、扩展性相悖的。通过kubernetes进行扩展的模式是一种安全且可控的模式，而TLS引导（bootstrapping)为了避免必须更新CSR、重新生成证书和从新分发的需求。手动approved CSR为集群增加安全性和控制性，而且集群角色（cluster role）可能会提供安全的自动approved和节点CSR的轮换。

## 总结

1. 阅读有关本文的k8s文档
2. 为kube-bootstrapper生成token并把它加入到token.csv
3. 生成bootstrap.kubeconfig文件
4. 配置kubelet的参数，包含kubeconfig和bootstrap.kubeconfig
5. 配置kube-apiserver的认证模型和配置token认证文件（token.csv）
6. 配置kube-controller-manager证书和私钥
7. 配置RBAC的cluster role bindings
