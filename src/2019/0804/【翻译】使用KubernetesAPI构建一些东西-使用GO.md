[原文](https://medium.com/programming-kubernetes/building-stuff-with-the-kubernetes-api-part-4-using-go-b1d0e3c1c899)

-----------------
[文章首发](https://github.com/helios741/myblog/blob/new/learn_go/src/2019/0804/%E3%80%90%E7%BF%BB%E8%AF%91%E3%80%91%E4%BD%BF%E7%94%A8KubernetesAPI%E6%9E%84%E5%BB%BA%E4%B8%80%E4%BA%9B%E4%B8%9C%E8%A5%BF-%E4%BD%BF%E7%94%A8GO.md)
-----------------

![image](https://user-images.githubusercontent.com/12036324/62411695-d0880400-b629-11e9-9971-c2569d854b31.png)

在本系列文章的第四部分将要使用官方client介绍K8S API的可编程性。本篇文章使用[client-go](https://github.com/kubernetes/client-go)去实践一个简单的PVC的watch程序，这个程序在前面的文章里面已经使用[python](https://medium.com/programming-kubernetes/building-stuff-with-the-kubernetes-api-part-3-using-python-aea5ab16f627)和[java](https://medium.com/programming-kubernetes/building-stuff-with-the-kubernetes-api-part-2-using-java-ceb8a5ff7920)实现过了。


## kubernetes 的Go Client项目（client-go）

在进入代码之前，理解k8s的go client项目是对我们又帮助的。它是k8s client中最古老的一个，因此具有很多特性。 Client-go 没有使用Swagger生成器，就像前面我们介绍的openAPI一样。它使用的是源于k8s项目中的源代码生成工具，这个工具的目的是要生成k8s风格的对象和序列化程序。


该项目是一组包的集合，该包能够满足从REST风格的原语到复杂client的不同的编程需求。

![image](https://user-images.githubusercontent.com/12036324/62411930-61acaa00-b62d-11e9-9f6c-fcf5d8f4f4da.png)


RESTClient是一个基础包，它使用`api-machinery`库中的类型作为一组REST原语提供对API的访问。作为对`RESTClient`之上的抽象，*clientset*将是你创建k8s client工具的起点。它暴露了公开化的API资源及其对应的序列化。


注意：
在 client-go中还包含了如discovery, dynamic, 和 scale这样的包，虽然本次不介绍这些包，但是了解它们的能力还是很重要的。


## 一个简单的k8s client 工具

让我们再次回顾我们将要构建的工具，来说明go client的用法。**pvcwatch**是一个简单的命令行工具，它可以监听集群中声明的PVC容量。当总数到达一个阈值的时候，他会采取一个action（在这个例子中是在屏幕上通知显示）
![image](https://user-images.githubusercontent.com/12036324/62412081-c6690400-b62f-11e9-9bad-7ec3c2253a02.png)

**你能在[github](https://github.com/vladimirvivien/k8s-client-examples)上找到完整的例子**

这个例子是为了展示k8s的go client的以下几个方面：
- 如何去连接
- 资源列表的检索和遍历
- 对象监听

## Setup

client-go支持Godep和dep作为vendor的管理程序，我觉得dep便于使用所以继续使用dep。例如，以下是client-go v6.0和k8s API v1.9所需最低限度的`Gopkg.toml`。

```shell
[[constraint]]
  name = "k8s.io/api"
  version = "kubernetes-1.9.0"
[[constraint]]
  name = "k8s.io/apimachinery"
  version = "kubernetes-1.9.0"
[[constraint]]
  name = "k8s.io/client-go"
  version = "6.0.0"
```
运行`dep ensure`确保剩下的工作。

## 连接 API Server

我们Go client的第一步就是建立一个于API Server的连接。为了做到这一点，我们要使用实体包中的`clientcmd `，如下代码所示：

```go
import (
...
    "k8s.io/client-go/tools/clientcmd"
)
func main() {
    kubeconfig := filepath.Join(
         os.Getenv("HOME"), ".kube", "config",
    )
    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    if err != nil {
        log.Fatal(err)
    }
...
}
```

*Client-go*通过提供实体功能来从不同的上下文中获取你的配置，从而使之成为一个不重要的任务。

### 从config文件

正如上面的例子所做的那样，你能从kubeconfig文件启动配置来连接API server。当你的代码运行在集群之外的时候这是一个理想的方案。
`clientcmd.BuildConfigFromFlags("", configFile)`

### 从集群
当你的代码运行在这个集群中的时候，你可以用上面的函数并且不使用任何参数，这个函数就会通过集群的信息去连接api server。

`clientcmd.BuildConfigFromFlags("", "")`

或者我们可以通过rest包来创建一个使用集群中的信息去配置启动的(译者注：k8s里所有的Pod都会以Volume的方式自动挂载k8s里面默认的ServiceAccount,所以会实用默认的ServiceAccount的授权信息)，如下：
```
import "k8s.io/client-go/rest"
...
rest.InClusterConfig()
```

### 创建一个clientset

我们需要创建一个序列化的client为了让我们获取API对象。在`kubernetes `包中的Clientset类型定义，提供了去访问公开的API对象的序列化client，如下：
```go
type Clientset struct {
    *authenticationv1beta1.AuthenticationV1beta1Client
    *authorizationv1.AuthorizationV1Client
...
    *corev1.CoreV1Client
}
```

一旦我们有正确的配置连接，我们就能使用这个配置去初始化一个clientset，如下：
```go
func main() {
    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    ...
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }
}
```

对于我们的例子，我们使用的是`v1`的API对象。下一步，我们要使用clientset通过`CoreV1()`去访问核心api资源，如下：
```Go
func main() {
    ...
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }
    api := clientset.CoreV1()
}
```
你能在[这里](https://github.com/kubernetes/client-go/blob/master/kubernetes/clientset.go)看到可以获得clientsets。

## 获取集群的PVC列表

我们对clientset执行的最基本操作之一获取存储的API对象的列表。在我们的例子中，我们将要拿到一个namespace下面的pvc列表，如下：
```go
import (
...
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)
func main() {
    var ns, label, field string
    flag.StringVar(&ns, "namespace", "", "namespace")
    flag.StringVar(&label, "l", "", "Label selector")
    flag.StringVar(&field, "f", "", "Field selector")
...
    api := clientset.CoreV1()
    // setup list options
    listOptions := metav1.ListOptions{
        LabelSelector: label, 
        FieldSelector: field,
    }
    pvcs, err := api.PersistentVolumeClaims(ns).List(listOptions)
    if err != nil {
        log.Fatal(err)
    }
    printPVCs(pvcs)
...
}
```

在上面的代码中，我们使用`ListOptions `指定 label 和 field selectors （还有namespace）来缩小pvc列表的范围，这个结果的返回类型是`v1.PeristentVolumeClaimList`。下面的这个代码展示了我们如何去遍历和打印从api server中获取的pvc列表。

```Go
func printPVCs(pvcs *v1.PersistentVolumeClaimList) {
    template := "%-32s%-8s%-8s\n"
    fmt.Printf(template, "NAME", "STATUS", "CAPACITY")
    for _, pvc := range pvcs.Items {
        quant := pvc.Spec.Resources.Requests[v1.ResourceStorage]
        fmt.Printf(
            template, 
            pvc.Name, 
            string(pvc.Status.Phase), 
            quant.String())
    }
}
```

## 监听集群中pvc

k8s的Go client框架支持为指定的API对象在其生命周期事件中监听集群的能力，包括创建，更新，删除一个指定对象时候触发的`CREATED`,`MODIFIED`,`DELETED`事件。对于我们的命令行工具，我们将要监听在集群中已经声明的PVC的总量。

对于某一个namespace，当pvc的容量到达了某一个阈值（比如说200Gi），我们将会采取某个动作。为了简单起见，我们将要在屏幕上打印个通知。但是在更复杂的实现中，可以使用相同的办法触发一个自动操作。

### 启动监听功能

现在让我们为`PersistentVolumeClaim `这个资源通过`Watch`去创建一个监听器。然后这个监听器通过`ResultChan`从go的channel中访问事件通知。

```Go
func main() {
...
    api := clientset.CoreV1()
    listOptions := metav1.ListOptions{
        LabelSelector: label, 
        FieldSelector: field,
    }
    watcher, err :=api.PersistentVolumeClaims(ns).
       Watch(listOptions)
    if err != nil {
      log.Fatal(err)
    }
    ch := watcher.ResultChan()
...
}
```

### 循环事件

接下来我们将要处理资源事件。但是在我们处理事件之前，我们先声明`resource.Quantity`类型的的两个变量为`maxClaimsQuant `和`totalClaimQuant `来分别表示我们的申请资源阈值（译者注：代表某个ns下集群中运行的PVC申请的上限）和运行总数。

```Go
import(
    "k8s.io/apimachinery/pkg/api/resource"
    ...
)
func main() {
    var maxClaims string
    flag.StringVar(&maxClaims, "max-claims", "200Gi", 
        "Maximum total claims to watch")
    var totalClaimedQuant resource.Quantity
    maxClaimedQuant := resource.MustParse(maxClaims)
...
    ch := watcher.ResultChan()
    for event := range ch {
        pvc, ok := event.Object.(*v1.PersistentVolumeClaim)
        if !ok {
            log.Fatal("unexpected type")
        }
        ...
    }
}
```

在上面的`for-range`循环中，watcher的channel用于处理来自服务器传入的通知。每个事件赋值给变量event，并且`event.Object`的类型被声明为`PersistentVolumeClaim `类型，所以我们能从中提取出来。

### 处理ADDED事件

当一个新的PVC创建的时候，`event.Type`的值被设置为`watch.Added`。然后我们用下面的代码去获取新增的声明的容量（`quant`），将其添加到正在运行的总容量中（`totalClaimedQuant`）。最后我们去检查是否当前的容量总值大于当初设定的最大值(`maxClaimedQuant `)，如果大于的话我们就触发一个事件。

```Go
import(
    "k8s.io/apimachinery/pkg/watch"
    ...
)
func main() {
...
    for event := range ch {
        pvc, ok := event.Object.(*v1.PersistentVolumeClaim)
        if !ok {
            log.Fatal("unexpected type")
        }
        quant := pvc.Spec.Resources.Requests[v1.ResourceStorage]
        switch event.Type {
            case watch.Added:
                totalClaimedQuant.Add(quant)
                log.Printf("PVC %s added, claim size %s\n", 
                    pvc.Name, quant.String())
                if totalClaimedQuant.Cmp(maxClaimedQuant) == 1 {
                    log.Printf(
                        "\nClaim overage reached: max %s at %s",
                        maxClaimedQuant.String(),
                        totalClaimedQuant.String())
                    // trigger action
                    log.Println("*** Taking action ***")
                }
            }
        ...
        }
    }
}
```
### 处理DELETED事件

代码也会在PVC被删除的时候做出反应，它执行相反的逻辑以及把被删除的这个PVC申请的容量在正在运行的容量的总值里面减去。

```Go
func main() {
...
    for event := range ch {
        ...
        switch event.Type {
        case watch.Deleted:
            quant := pvc.Spec.Resources.Requests[v1.ResourceStorage]
            totalClaimedQuant.Sub(quant)
            log.Printf("PVC %s removed, size %s\n", 
               pvc.Name, quant.String())
            if totalClaimedQuant.Cmp(maxClaimedQuant) <= 0 {
                log.Printf("Claim usage normal: max %s at %s",
                    maxClaimedQuant.String(),
                    totalClaimedQuant.String(),
                )
                // trigger action
                log.Println("*** Taking action ***")
            }
        }
        ...
    }
}
```

## 运行程序

当程序在一个运行中的集群被执行的时候，首先会列出PVC的列表。然后开始监听集群中新的`PersistentVolumeClaim`事件。

```Go
$> ./pvcwatch
Using kubeconfig:  /Users/vladimir/.kube/config
--- PVCs ----
NAME                            STATUS  CAPACITY
my-redis-redis                  Bound   50Gi
my-redis2-redis                 Bound   100Gi
-----------------------------
Total capacity claimed: 150Gi
-----------------------------
--- PVC Watch (max claims 200Gi) ----
2018/02/13 21:55:03 PVC my-redis2-redis added, claim size 100Gi
2018/02/13 21:55:03
At 50.0% claim capcity (100Gi/200Gi)
2018/02/13 21:55:03 PVC my-redis-redis added, claim size 50Gi
2018/02/13 21:55:03
At 75.0% claim capcity (150Gi/200Gi)
```

下面让我们部署一个应用到集群中，这个应用会申请`75Gi `容量的存储。（例如，让我们通过[helm](https://github.com/helm/helm)去部署一个实例[influxdb](https://github.com/helm/charts/tree/master/stable/influxdb)）。

```Go
helm install --name my-influx \
--set persistence.enabled=true,persistence.size=75Gi stable/influxdb
```
正如下面你看到的，我们的工具立刻反应出来有个新的声明以及一个警告因为当前的运行的声明总量已经大于我们设定的阈值。

```Go
--- PVC Watch (max claims 200Gi) ----
...
2018/02/13 21:55:03
At 75.0% claim capcity (150Gi/200Gi)
2018/02/13 22:01:29 PVC my-influx-influxdb added, claim size 75Gi
2018/02/13 22:01:29
Claim overage reached: max 200Gi at 225Gi
2018/02/13 22:01:29 *** Taking action ***
2018/02/13 22:01:29
At 112.5% claim capcity (225Gi/200Gi)
```

相反，从集群中删除一个PVC的时候，该工具会相应展示提示信息。

```shell
...
At 112.5% claim capcity (225Gi/200Gi)
2018/02/14 11:30:36 PVC my-redis2-redis removed, size 100Gi
2018/02/14 11:30:36 Claim usage normal: max 200Gi at 125Gi
2018/02/14 11:30:36 *** Taking action ***
```

## 总结

这篇文章是进行的[系列](https://medium.com/programming-kubernetes/building-stuff-with-the-kubernetes-api-toc-84d751876650)的一部分,使用Go语言的官方k8s客户端与API server进行交互。和以前一样，这个代码会逐步的去实现一个命令行工具去监听指定namespace下面的PVC的大小。这个代码实现了一个简单的监听列表去触发从服务器返回的资源事件。

## 下一步

从这一点开始，这系列文章将要继续使用client-go这个框架。在接下来的写作中，将要用控制器模式使用client-go 创建更加更加强大的client。

## 参考

- 系列： [table of content](https://medium.com/programming-kubernetes/building-stuff-with-the-kubernetes-api-toc-84d751876650)
- Code: [https://github.com/vladimirvivien/k8s-client-examples](https://github.com/vladimirvivien/k8s-client-examples)
- Kubernetes clients : [https://kubernetes.io/docs/reference/client-libraries/](https://kubernetes.io/docs/reference/client-libraries/)
- Client-go:  [https://github.com/kubernetes/client-go](Client-go — https://github.com/kubernetes/client-go)
- Kubernetes API reference: [https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.10/](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.10/)











