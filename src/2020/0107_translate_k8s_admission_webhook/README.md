---
[翻译：In-depth introduction to Kubernetes admission webhooks](https://github.com/helios741/myblog/tree/new/learn_go/src/2020/0107_translate_k8s_admission_webhook)
---

# 翻译：In-depth introduction to Kubernetes admission webhooks

写在前面[原文传送门](https://banzaicloud.com/blog/k8s-admission-webhooks/)

译者注：
- 本译文把原作者开始关于[Pipiline](https://beta.banzaicloud.io/ui/)项目的介绍移除了，有兴趣的朋友可以点进去看一下，对应的github地址为[pipeline](https://github.com/banzaicloud/pipeline)。
- 本译文把原作者提及到的initializers和链接被我删除了，有下面三个原因
    1. initializers链接失效了
    2. initializers在1.13中被废弃，在1.16中被移除，觉得代价没有必要去看了，相关PR：[Completely remove initializers from k/k](https://github.com/kubernetes/kubernetes/pull/79504)
    3. 作者就是提及了一部分但是没有做介绍
具体没有翻译的原文如下：![image](https://user-images.githubusercontent.com/12036324/71428127-c8745200-26f9-11ea-96e3-30654cf3bc72.png)


Kubernetes提供了许多方式去扩展它的内部功能。可能最常用的扩展点就是自定义资源类型和自定义控制器。然而还是有一些像[admission-webhooks](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers)这样有趣的功能。它也是API层面的一个扩展点，它能修改某些k8s功能的基本行为。它的定义有点模糊，所以让我们通过动手去弄清楚什么是动态访问控制吧。


## 准入控制器
在开始之前，让我们看一下k8s官网关于准入控制器的定义：
***
准入控制器是一段在对象持久化之前，在认证和授权之后拦截对api server请求的代码。准入控制器包括验证（validating）和变更（mutating）。变更（mutating）控制器可能会修改请求的资源对象，验证（validating）控制器不会修改资源对象。如果任何一个阶段的控制器拒绝了请求，那么整个请求都会失败并且把错误返回给用户。
***
上面的意思就是k8s中会有特殊的控制器拦截K8s的api请求，并且能够根据自定义的逻辑去修改或者拒绝这个请求。这个[列表](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#what-does-each-admission-controller-do)是k8s已经实现的的控制器列表，你也可以根据自己的业务逻辑写自己的控制器。这些控制器听起来很强大，但需要编译到kube-apiserver中，并且只能在apiserver启动的时候开启。

准入webhook解决了这些限制并且提供了动态配置的能力。

### 准入webhook是什么

在apiserver中有两个特别的准入控制器：*MutatingAdmissionWebhook* 和 *ValidatingAdmissionWebhook*。这些控制器发送准入请求到扩展的HTTP服务以及接受对应的返回。如果两个准入控制器都开启，k8s管理员能够在集群中创建和配置准入webhook。
![image](https://user-images.githubusercontent.com/12036324/71430960-d6ca6a00-2709-11ea-8598-03b8faba54a4.png)
概括的说，执行次操作的步骤如下：
- 检查在集群中是否开启了准入webhook控制器，然后根据需求配置他们
- 编写出来准入控制的回调。这个回调可以是简单的HTTPserver也可以是像Kelsey写的一个serverless函数（[validating webhook demo.](https://github.com/kelseyhightower/denyenv-validating-admission-webhook)）
- 通过*ValidatingWebhookConfiguration*和*MutatingWebhookConfiguration*资源配置准入webhook

这两种准入webhook的区别很显而易见：
- validating webhooks 能拒绝请求，但是不能修改请求对象
- mutating webhooks通过创建patch来修改对象，然后在准入请求的响应中发送回去
- 如果有准入webhook拒绝了请求，那么就会返回端用户一个错误

***
如果你寻找准入webhook真实的生产例子，[istio](https://istio.io/docs/setup/additional-setup/sidecar-injection/)项目使用mutating webhooks自动的注入Envoy sidecar到pod里面。
***

## 创建和配置一个访问webhook

现在我们已经讲完了理论，让我们来进入实践并在真实的集群中尝试一下。我们首先要创建webhook server并且在集群中进行部署，然后创建webhook的配置观察是否生效

### 前提

你需要有一个k8s集群。确保在apiserver中开启了*MutatingAdmissionWebhook*和*ValidatingAdmissionWebhook*控制器，可以通过下面的命令查看是否有*admissionregistration.k8s.io/v1beta1*这个组和版本：
```shell
kubectl api-versions
```

### 写webhook
我们现在开始写我们的准入wenhook服务。在这个例子中，这个服务监听*/validate*和*/mutate*的路径分别服务于validating和mutating webhook。接下来，我们将要弄清楚一个可以轻松实现的简单任务：
k8s文档包含一组允许工具相互操作的[推荐label](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)，这些标签以所有工具都能理解的方式描述对象。除了支撑工具外，这些推荐标签还把程序描述为可查询的。


在我们的validating webhook例子中，我们要求deployment和service必须包含这些标签，我们所有的validating webhook会拒绝不包含这些标签的deployment和service。接下来我们配置mutating webhook，mutating webhook将会给deployment和service增加上值为not_available这个label（如果没有这个label的话）。


代码可以在[github的这个地址](https://github.com/banzaicloud/admission-webhook-example)上获得。morvencao写的关于mutating准入webhook的指南是很好的，我fork了[这个项目](https://github.com/morvencao/kube-mutating-webhook-tutorial)，然后基于这个代码进行修改。


我们的webhook是一个简单的具有TLS的HTTP服务，并且已经把它部署到集群中。
##  构建这个项目
下面的所有步骤是可以省去的，因为我已经构建了一个可用的docker镜像。如果您想修改代码做一些自己定制化的东西，你能构建这个项目，然后把它推到docker hub上。构建的[脚本](https://github.com/banzaicloud/admission-webhook-example/blob/blog/build)在这里。请确保在您的机器上装有*go*、*dep*以及*docker*并且登录到了docker resitry上。指定DOCKER_USER后运行下面的命令：
```shell
./build
```


### 在集群中部署webserver
为了部署这个服务，我们需要在集群中创建一个service和deployment。除了服务的TLS的配置，剩下的都很简单。如果你看*deployment.yaml*[文件](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/deployment.yaml)，您会发现从命令行中读取了证书和相应的私钥，并且这些文件来自于pod挂载的secret的volume。
```yaml
      args:
        - -tlsCertFile=/etc/webhook/certs/cert.pem
        - -tlsKeyFile=/etc/webhook/certs/key.pem
[...]
      volumeMounts:
        - name: webhook-certs
          mountPath: /etc/webhook/certs
          readOnly: true
volumes:
    - name: webhook-certs
      secret:
        secretName: spot-mutator-webhook-certs
```
在生产集群中，正确处理您的TLS证书和私钥特别重要，所以你可以用像[cert-manager](https://github.com/jetstack/cert-manager)这样的工具，或者把你的key存储在[Vault](https://github.com/banzaicloud/bank-vaults/)中，而不是通过简单的通过k8s的secrets。

我们可以使用任何种类的证书。最重要的是记住在后面的webhook配置中设置相应的CA证书，以至于这个请求将来会被apiserver接受。现在我们重用istio团队写的生成证书签名请求（CSR）的[脚本](https://github.com/istio/istio/blob/release-0.7/install/kubernetes/webhook-create-signed-cert.sh)。接下来我们将这个请求发送到apiserver，获得证书，然后根据结果创建所需的secrets。


第一步，运行[这个脚本](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/webhook-create-signed-cert.sh)，检查是否创建了包含证书和私钥的secret：
```shell
$ ./deployment/webhook-create-signed-cert.sh

creating certs in tmpdir /var/folders/3z/\_d8d8kl951ggyvw360dkd_y80000gn/T/tmp.xPApwE5H
Generating RSA private key, 2048 bit long modulus
..............................................+++
...........+++
e is 65537 (0x10001)
certificatesigningrequest.certificates.k8s.io "admission-webhook-example-svc.default" created
NAME                                    AGE       REQUESTOR               CONDITION
admission-webhook-example-svc.default   1s        ekscluster-marton-423   Pending
certificatesigningrequest.certificates.k8s.io "admission-webhook-example-svc.default" approved
secret "admission-webhook-example-certs" created

$ kubectl get secret admission-webhook-example-certs
NAME                              TYPE      DATA      AGE
admission-webhook-example-certs   Opaque    2         2m
```
一旦这个secret被创建，我们就能创建我们演示用的[deployment](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/deployment.yaml)和[service](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/service.yaml)。到目前位置，我们创建了监听443端口来接受请求的HTTP服务器。
```shell
$ kubectl create -f deployment/deployment.yaml
deployment.apps "admission-webhook-example-deployment" created

$ kubectl create -f deployment/service.yaml
service "admission-webhook-example-svc" created
```

### 配置webhook
现在我们的webhook服务已经运行了，它能够接受从apiserver发送过来的请求。我们首先还要在k8s中创建一些配置资源。我们先来配置 validating webhook，稍后我们在配置mutating webhook。如果你已经看了[webhook的配置文件](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/validatingwebhook.yaml),你应该注意到它包含*CA_BUNDLE*占位符：
```yaml
clientConfig:
  service:
    name: admission-webhook-example-webhook-svc
    path: "/validate"
  caBundle: ${CA_BUNDLE}
```
如前面所说的，为了让apiserver能信任webhook服务，webhook的配置中应该存在CA的证书。因为我们已经通过了k8s创建了证书，因此我们能从kubeconfig文件中提取CA证书。这个[小脚本](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/webhook-patch-ca-bundle.sh)使用这个CA去替换*CA_BUNDLE*占位符。在创建validating webhook配置之前运行下面的命令：
```shell
cat ./deployment/validatingwebhook.yaml | ./deployment/webhook-patch-ca-bundle.sh > ./deployment/validatingwebhook-ca-bundle.yaml
```
然后我们来看一下*validatingwebhook-ca-bundle.yaml*。如果刚才的脚本运行正确，则应该像下面这样填充*CA_BUNDLE*：
```shell
$ cat deployment/validatingwebhook-ca-bundle.yaml
apiVersion: admissionregistration.k8s.io/v1beta1
kind: ValidatingWebhookConfiguration
metadata:
  name: validation-webhook-example-cfg
  labels:
    app: admission-webhook-example
webhooks:
  - name: required-labels.banzaicloud.com
    clientConfig:
      service:
        name: admission-webhook-example-webhook-svc
        namespace: default
        path: "/validate"
      caBundle: LS0...Qo=
    rules:
      - operations: [ "CREATE" ]
        apiGroups: ["apps", ""]
        apiVersions: ["v1"]
        resources: ["deployments","services"]
    namespaceSelector:
      matchLabels:
        admission-webhook-example: enabled
```
Webhook的clientConfig指向的是我们先前部署的服务，服务的监听路径为 `/validate`。我们针对validation wenbhook和mutation webhook创建了不同的路径。


上面yaml文件的第二段包含了规则（rules字段）--执行的操作和对应的资源将会被validate webhook处理。当apiGroups和apiVersions下面的deployment（apps/v1）和service（v1）被创建（CREATE）的时候，这个请求将会被截获。我们也可以在这些字段中使用通配符（*）。


上面webhook的yaml文件的最后一部分是*namespaceSelector*。我们能够通过字段选出webhook server在哪些namespace下面工作。这不是一个必选属性，现在我们可以尝试一下。我们的webhook server只工作在含有*admission-webhook-example: enabled*标签的namespace上面。你能在k8s的[官方文献](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.10/#validatingwebhookconfiguration-v1beta1-admissionregistration-k8s-io)中查看这个资源配置完成信息。


首先，让我们标记default的namespace：
```shell
$ kubectl label namespace default admission-webhook-example=enabled
namespace "default" labeled

$ kubectl get namespace default -o yaml
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: 2018-09-24T07:50:11Z
  labels:
    admission-webhook-example: enabled
  name: default
...
```
最后创建这个validating webhook的配置。这会将webhook动态的添加到请求链中，一旦资源被创建，请求将要被我们配置的webhook server拦截:
```shell
$ kubectl create -f deployment/validatingwebhook-ca-bundle.yaml
validatingwebhookconfiguration.admissionregistration.k8s.io "validation-webhook-example-cfg" created
```
### 试一试

现在是令我们激动的部分了，我们来创建一个deployment并且观察我们的validation webhook如我们的预期。我们将要部署只包含一个容器的[deployment](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/sleep.yaml)。这个命令应该有下面的错误：
```shell
$ kubectl create -f deployment/sleep.yaml
Error from server (required labels are not set): error when creating "deployment/sleep.yaml": admission webhook "required-labels.banzaicloud.com" denied the request: required labels are not set
```
我们再来部署一个可经过验证（metadata里面有对应的label）的[deployment](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/sleep-with-labels.yaml)：
```shell
$ kubectl create -f deployment/sleep-with-labels.yaml
deployment.apps "sleep" created
```
我们再来尝试一下另一件事情。删除刚才的那个deployment和创建一个[没有所需label的deployment](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/sleep-no-validation.yaml)，但是这个deployment在annotation中增加了*admission-webhook-example.banzaicloud.com/validate: "false"*，我们看是否正常工作：
```shell
$ kubectl delete deployment sleep
$ kubectl create -f deployment/sleep-no-validation.yaml
deployment.apps "sleep" created
```

### 尝试mutating webhook

下面让我们尝试mutating webhook，首先要把刚才的validating webhook配置删掉，以至于它不会拦截请求，然后部署mutating webhook配置。[mutating webhook配置](https://github.com/banzaicloud/admission-webhook-example/blob/blog/deployment/mutatingwebhook.yaml)和上述的validating webhook配置差不多，就是把服务的监听路径改为*/mutate*，api-server将要发送请求给我们配置的HTTP服务。这个配置中也包含*CA_BUNDLE*占位符，我们首先要填充它：
```shell
$ kubectl delete validatingwebhookconfiguration validation-webhook-example-cfg
validatingwebhookconfiguration.admissionregistration.k8s.io "validation-webhook-example-cfg" deleted

$ cat ./deployment/mutatingwebhook.yaml | ./deployment/webhook-patch-ca-bundle.sh > ./deployment/mutatingwebhook-ca-bundle.yaml

$ kubectl create -f deployment/mutatingwebhook-ca-bundle.yaml
mutatingwebhookconfiguration.admissionregistration.k8s.io "mutating-webhook-example-cfg" created
```

现在，我们再一次部署我们的*sleep*应用，然后查看标签是否正确添加：
```shell
$ kubectl create -f deployment/sleep.yaml
deployment.apps "sleep" created

$ kubectl get  deploy sleep -o yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  annotations:
    admission-webhook-example.banzaicloud.com/status: mutated
    deployment.kubernetes.io/revision: "1"
  creationTimestamp: 2018-09-24T11:35:50Z
  generation: 1
  labels:
    app.kubernetes.io/component: not_available
    app.kubernetes.io/instance: not_available
    app.kubernetes.io/managed-by: not_available
    app.kubernetes.io/name: not_available
    app.kubernetes.io/part-of: not_available
    app.kubernetes.io/version: not_available
...
```

我们的最后一个例子，请重新创建validating webhook，让这两个配置都生效。现在，再次尝试去创建*sleep*这个应用，它会被创建成功，就像文档中说的：

***
访问控制的过程分为两个部分。第一阶段mutating访问控制器运行，第二阶段validating访问控制器在运行。
***
所以在第一阶段mutating webhook给deployment增加上缺少的label，然后在第二阶段的validating webhook不会拒绝deployment，因为它已经有了对应的label，并将他们的值设置为*not_available*
```shell
$ kubectl create -f deployment/validatingwebhook-ca-bundle.yaml
validatingwebhookconfiguration.admissionregistration.k8s.io "validation-webhook-example-cfg" created

$ kubectl create -f deployment/sleep.yaml
deployment.apps "sleep" created
```
