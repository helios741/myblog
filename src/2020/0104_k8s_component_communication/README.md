---
[文章首发](https://github.com/helios741/myblog/tree/new/learn_go/src/2020/0104_k8s_component_communication)
---


# 解析k8s中工作节点组件和集群通信原理

本文会分析node节点的两个组件（kube-proxy和kubelet）同集群如何建立通信的过程。
这两个组件其实已经覆盖了从集群外（非POD形式）和集群进行通信的所有可能，为什么这么说，我们可以看一下这两个组件的特点：
- kube-proxy：只是做client和集群进行通信
- kubelet：即作为客户端去监听和获取集群中的信息，又要作为服务端让集群获取这个node节点上的pod信息

前两部分我们会简单的科普一下SSL的过程和k8s中通过RBAC进行认证的内容，因为这两部分内容属于看懂后续两部分的基础，如果对这两部分内容比较熟悉的同学可以跳过。

为了增加阅读体验，我把有过多代码的放到另一个文件里面，文章中相应的部分通过链接的方式。

## 一、密不透风：SSL的过程
![image](https://user-images.githubusercontent.com/12036324/71760548-5e7a5a80-2efa-11ea-97e5-dff093ee3617.png)


首先如果要想有一个CA机构签发的证书的话，会自己生成私钥，然后通过私钥证书签名请求（CSR）让CA去签名，这个证书签名中会包含服务端的一些信息（比如common name、organization等）还有公钥。


CA收到证书签名请求（CSR）之后，会生成一个证书，证书内容包括申请者的信息，CA的信息以及申请者公钥，然后会用CA的私钥进行加密，然后把证书给服务端。


当客户端想要和服务端进行SSL连接的时候要先要发个申请连接的请求。


然后服务端就会把通过CA签发的证书给客户端。


客户端用CA的证书去验证服务端的证书是否正确（一般CA证书会内置在操作系统中，这也是为什么第0步骤会用虚线表示）


客户端验证通过后会用证书中的公钥对数据进行加密保证安全。


注：
- 这里只是说的单向SSL过程，如果是双向的话客户端也要有自己的证书
- 验证证书通过后之后，客户端和服务端会协商一个对称加密进行通信，因为非对称加密太慢了。（因为对称加密的过程对本文没影响，所以有兴趣的读者可以自行查找资料或者和我探讨交流）
- 这里为了照顾大多数读者，没有细致的深入，比如CA怎么签发的服务端证书。考虑到本文主要讲k8s的，不是讲加密的，这里没有重点写出

附加几个生成密钥和查看的命令：
- 生成私钥：openssl genrsa -out helios.key 1024
- 通过私钥生成公钥：openssl rsa -in helios.key -pubout -out helios.pem
- 生成证书签名请求：openssl req -key helios.key -new -out helios.req
- CA签发证书：openssl x509 -req -in helios.req -CA cacertificate.pem -CAkey caprivate.key -out helioscertificate.pem
- 查看证书签名请求文件内容：openssl req -in helios.req -noout -text
- 如果不想自己懒得尝试命令可以看看我的[输出](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/openssl-shell.md)


## 二、各司其职：RBAC是什么

RBAC的本质就是给不同的用户不同的角色，角色代表的权限，是由k8s本身定义的，用户代表的访问集群的“人”。

所以要理解RBAC就要理解k8s中有几种用户，角色怎么控制权限，以及用户和角色之间如何绑定的，下面我们就来一个个的看。

### 2.1 k8s中的用户

在k8s中，用户从宏观上就可以分为两种，集群内的用户以及集群外的用户：
- 集群内的用户：serviceAccount
- 集群外的用户：User


集群外的user就是能通过HTTP请求体中拿到，
对于集群内的用户认证信息怎么拿到呢，我们来看个kube-system命名空间下面的coredns这个serviceAccount的[定义](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/coredns-sa.yaml),我们能看到它有一个secrets字段，这个字段的name字段就是指定的secrets的名字，也就是说如果某个POD声明使用了这个serviceAccount，就会把这个serviceAccount对应的secrets挂载到POD里面，这个secrets对应的定义[在这里](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/coredns-secrets.yaml)。在POD中挂载的目录为：*/var/run/secrets/kubernetes.io/serviceaccount/*，我们可以使用下面命令查看这个pod有没有访问某个api的权限：
```shell
kubectl  exec -ti centosb -n helios-ns bash
CA_CERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
curl --cacert $CA_CERT -H "Authorization: Bearer $TOKEN" "https://kubernetes.default.svc/api/v1/namespaces/$NAMESPACE/pods/"
```

在k8s中为了简化一系列用户有相同权限的操作，提出了Group的的概念，就是能给一个组的成员绑定角色，所以Group是个逻辑的概念，是对一组用户的抽象。这里我们先有个印象后面还会提及到。


### 2.2 RBAC中角色

角色就是一组权限的集合，我们可以看一下*system:coredns*这个角色的例子：[yaml文件地址](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/coredns-role.yaml)
对于system:coredns这个集群级用户来说，有对apiGroups为""下面endpoints、services、pod、namespaces的list和watch的权限。

### 2.3 RBAC的用法
k8s通过RBAC将权限的使用者和角色分离，提供四个新的资源，分为两组，分别为：
- rolebindings/roles： 针对单个namespace下面的资源，比如说endpoints、services等
- clusterrolebindings/clusterroles： 除了针对rolebindings/roles的功能外，还有集群级别的资源，比如说namespace、pvc等

我们可以看一下*system:coredns*这个clusterrolebinding的yaml定义：[yaml文件地址](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/coredns-crb.yaml)
上述的ClusterRoleBinding就是将kube-system下面的coredns用户（ServiceAccount）和system:coredns进行绑定使之有对应的权限。

现在对于RBAC的基本概念就解释完了，其实RBAC还是很容易理解的，这里提出两个问题供读者思考：
- rolebindings能和clusterroles绑定么
- clusterrolebindings能和roles绑定么

## 三、抛砖引玉：kube-proxy和集群通信的过程

![image](https://user-images.githubusercontent.com/12036324/71762798-e66a5f80-2f0e-11ea-86ea-8ee678e74e09.png)

### 3.1 启动前需要的手动配置

1. 创建证书签名请求[kube-proxy-csr.json](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-proxy-csr.json)
2. 通过ca的证书、私钥以及上一步的证书签名请求生成kube-proxy的私钥和证书
```shell
cfssl gencert -ca=/opt/k8s/work/ca.pem \
  -ca-key=/opt/k8s/work/ca-key.pem \
  -config=/opt/k8s/work/ca-config.json \
  -profile=kubernetes  kube-proxy-csr.json | cfssljson -bare kube-proxy
```
3. 通过set-cluster设置集群信息（比如设置为kubernetes），放在kube-proxy.kubeconfig文件中(这个时候的kube-proxy.kubeconfig的内容：[kube-proxy1.kubeconfig](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-proxy1.kubeconfig))
4. 设置访问集群的用户为kube-proxy，放在kube-proxy.kubeconfig文件中(这个时候的kube-proxy.kubeconfig的内容：[kube-proxy2.kubeconfig](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-proxy2.kubeconfig))
5. 创建上下文（将第4步和第5部的进行绑定即，用kube-proxy去访问kubernetes集群），使用kube-proxy.kubeconfig文件中。(这个时候的kube-proxy.kubeconfig的内容：[kube-proxy3.kubeconfig](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-proxy3.kubeconfig))
6. 在kube-proxy的配置文件中，配置访问apiserver的客户端（clientConnection.kubeconfig）
7. 使用第5步创建的上下文,这个时候的kube-proxy.kubeconfig文件内容为最终状态[kube-proxy.kubeconfig](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-proxy.kubeconfig)

在集群中针对kube-proxy会有如下的RBAC规则：通过system:node-proxier这个[CRB](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/node-proxier-crb.yaml)将用户system:kube-proxy和ClusterRole进行绑定.

### 3.2 启动之后

1. kube-proxy通过启动前生成的kube-proxy.kubeconfig和apiserver通信
2. apiserver通过内置的RBAC判断用户权限
3. 认证和授权结束，可以通信


## 四、千呼万唤始出来：kubele和集群通信的过程

kubelet和kube-proxy的区别就是，kube-proxy仅仅是作为和集群通信的库户端，但是kubelet既要做客户端（和集群通信）又要做服务端（供apiserver收集pod的日志等）。


kube-proxy生成一份客户端证书之后在各个node上是能通用的。kubelet的服务端证书中必须能表示这个node的身份(所以在kubelet证书里面有节点相关的CN信息)。

kubelet和kube-proxy有一些不相同的地方就是kubelet代表的是一个node节点，所以他的证书要能唯一标识（证书中的CN字段system:nodes:172.27.xxx.xxx）。


为了避免手动为每个节点手动创建个证书，所以k8s的1.4版本中引入了bootstrap（[Add proposal for kubelet TLS bootstrap](https://github.com/kubernetes/kubernetes/pull/20439)），bootstrap的目标就是省去上述这么多手动搞证书的步骤，把这个过程内置在k8s里面，基于bootstrap的过程如下：

### 4.1 启动前的配置
![image](https://user-images.githubusercontent.com/12036324/71762643-ce91dc00-2f0c-11ea-85c1-8dcd825b9e94.png)
#### 4.1.1 生成token

因为最开始的kubelet是没有证书的，这时候就要通过一个唯一的token的去和api-server通信，这个token的权限是比较低的。


token的格式为*[a-z0-9]{6}\.[a-z0-9]{16}*（例如abcdef.0123456789abcdef）token的格式分为两个部分tokenID和(.)secret
- tokenID是public信息，比如是会作为用户名system:bootstrap:<token id>
- secret只能给信任的第三用，作为认证信息
可以通过kubeadm来简化这个流程
```shell
# /opt/k8s/bin/kubeadm token create \
> --description helios-test \
> --groups system:bootstrappers:k8s01 \
> --kubeconfig ~/.kube/config
379jgz.xc7l8qnzwrw10obr
```

#### 4.1.2 创建secret
secrets有下面几种类型：
- Opaque： 单纯的通过把base64去encode密码，安全性不高
- kubernetes.io/dockerconfigjson：用来存储私有docker registry的认证信息，详情见[registry-secret-existing-credentials](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#registry-secret-existing-credentials)。
- kubernetes.io/service-account-token：用来存储注入给pod的认证信息
- bootstrap.kubernetes.io/token： 专门用于bootstrap的

secret的格式：[bootstrap-token-secret-format](https://kubernetes.io/docs/reference/access-authn-authz/bootstrap-tokens/#bootstrap-token-secret-format)
当然这个secret有几个要求：
- 必须在kube-system的命名空间下
- 比如以bootstrap-token-<tokenid>开头
- secret的类型必须是bootstrap.kubernetes.io/token
我们来验证一下：
```shell
# kubectl get secrets -n kube-system | grep bootstrap-token-
bootstrap-token-379jgz                           bootstrap.kubernetes.io/token         7      4h12m
```
bootstrap-token-379jgz这个secret的内容为：[bootstrap-token-secret](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/bootstrap-token-secret.yaml)
其中usage-bootstrap-*用于说明secret的目的：
- usage-bootstrap-authentication：这个token能作为认证token

auth-extra-groups:为该token的扩展认证：
```shell
echo -n "c3lzdGVtOmJvb3RzdHJhcHBlcnM6azhzMDE=" | base64 --decode
system:bootstrappers:k8s01
```

#### 4.1.3 设置RBAC规则
- 授予kubelet创建CSR的权限: [kubelet-bootstrap-crb](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kubelet-bootstrap-crb.yaml)、[kubelet-bootstrap-cr](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kubelet-bootstrap-cr.yaml)

- 授予过期轮换client证书的权限：[node-client-cert-renewal](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/node-client-cert-renewal.yaml)
- 授予过期轮换server证书的权限: [node-server-cert-renewal](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/node-server-cert-renewal.yaml)

#### 4.1.4 设置集群参数
```shell
kubectl config set-cluster kubernetes \
      --certificate-authority=/etc/kubernetes/cert/ca.pem \
      --embed-certs=true \
      --server=${KUBE_APISERVER} \
      --kubeconfig=kubelet-bootstrap-${node_name}.kubeconfig
```

### 4.1.5 根据第一步的token添加用户

```shell
kubectl config set-credentials kubelet-bootstrap \
      --token=${BOOTSTRAP_TOKEN} \
      --kubeconfig=kubelet-bootstrap-${node_name}.kubeconfig
```

### 4.1.6 设置上下文参数

```shell

kubectl config set-context default \
      --cluster=kubernetes \
      --user=kubelet-bootstrap \
      --kubeconfig=kubelet-bootstrap-${node_name}.kubeconfig
```

#### 4.1.7 设置默认上下文
```shell
kubectl config use-context default --kubeconfig=kubelet-bootstrap-${node_name}.kubeconfig
```

#### 4.1.8 配置各个组件参数
设置kubelet的启动参数:
```yaml
--bootstrap-kubeconfig=/etc/kubernetes/kubelet-bootstrap.kubeconfig
--cert-dir=/etc/kubernetes/cert
--kubeconfig=/etc/kubernetes/kubelet.kubeconfig
```
因为comtroller-manager负责签发证书，所有comtroller-manager的启动文件中要有CA的相关信息
```yaml
--cluster-signing-cert-file="/var/lib/kubernetes/ca.pem"
--cluster-signing-key-file="/var/lib/kubernetes/ca-key.pem"
--experimental-cluster-signing-duration=8760h
```

### 4.2 启动过程
![image](https://user-images.githubusercontent.com/12036324/71762665-16b0fe80-2f0d-11ea-89ae-d460b8c7ccac.png)
其实是先去找kubeconfg文件，如果找不到就会使用bootstrap-kubeconfig去开始bootstrsp的过程：

#### 4.2.1 第一次CSR的过程（申请client证书）
1. kubelet在node节点上生成clinet.key，然后把公钥和bootstrap-kubeconfig发送出去
2. api-server对请求进行认证，通过后创建CSR
    + api-server从bootstrap-kubeconfig文件中提取出token。
    + kube-system的ns下，寻找bootstrap-token-<tokenid>的secret
    + 用户为system:bootstrappers:<tokenid>，因为属于system:bootstrappers组下面，有创建CSR的权限
    + 创建CSR
3. controller-manager监听到了有CSR，并且这个用户有自动approve的权限，就颁发证书
4. kubelet通过watch看到创建的CSR变为了issued状态，就通过拿CSR中status.certificate的字段,然后base64解码变为本地文件

第一次CSR之后，就已经在kubelet的启动参数的--kubeconfig=路径中生成了访问apiserver的kube-config文件，为[kube-config](https://github.com/helios741/myblog/blob/new/learn_go/src/2020/0104_k8s_component_communication/kube-config.yaml)
我们可以看看证书中，用户的名字（CN）：
```shell

# cfssl certinfo -cert /etc/kubernetes/cert/kubelet-client-current.pem
{
  "subject": {
    "common_name": "system:node:k8s01",
    "organization": "system:nodes",
    "names": [
      "system:nodes",
      "system:node:k8s01"
    ]
  },
  ...
}
```
现在的用户就变为system:node:k8s01，组变为system:nodes了
#### 4.2.2 第二次CSR的过程（申请server端证书）

1. 用上述生成的kube-config文件去访问apiserver
2. apiserver通过RBAC查看该用户是否有创建CSR的权限（crb为：node-client-cert-renewal， approve-node-server-renewal-csr都给绑了）
3. 出于安全问题，因为这一步就相当于注册node的过程，所以要手动apporve
4. 真正给颁发证书的还是controller-manager
5. kubelet通过watch看到创建的CSR变为了issued状态，就通过拿CSR中status.certificate的字段,然后base64解码变为本地文件

## 文章讨论入口

如果您觉得有什么不理解，或者觉得文章有欠缺的地方，请您到[这里](https://github.com/helios741/myblog/issues/73)提出。我会很感谢您的建议也会解答您的问题。

## 参考：
- [【翻译】：Kubernetes TLS bootstrapping](https://github.com/helios741/myblog/tree/new/learn_go/src/2019/20191210_translate_k8s_tls_bootstrapping)
- [Kubernetes TLS bootstrapping 那点事](https://mritd.me/2018/01/07/kubernetes-tls-bootstrapping-note/)
- [使用 Bootstrap Token 完成 TLS Bootstrapping](https://mritd.me/2018/08/28/kubernetes-tls-bootstrapping-with-bootstrap-token/)
- [Serving Certificates, Authentication, and Authorization](https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/concepts/auth.md)
- [authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes API 安全机制详解](https://mp.weixin.qq.com/s/XIkQdh5gnr-KJhuFHboNag)
