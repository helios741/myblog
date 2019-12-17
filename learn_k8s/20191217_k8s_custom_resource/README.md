# 深入解析声明式API(一):API对象的奥秘


## API 介绍
一个API在Etcd里的完整路径，是由Group（API组）、version（API版本）和Resource（API资源类型）三部分组成。

![image](https://user-images.githubusercontent.com/12036324/70957921-97b96a80-20b2-11ea-9e14-74a336612867.png)

对于下面声明的一个CronJob对象：
```yaml
apiVersion: batch/v2alpha1
kind: CronJob
....
```
- CronJob: API 对象的资源类型 (Resource)
- batch: 组(Group)
- v2alpha1: 版本(Version)

### Kubernetes 是如何对 Resource、Group 和 Version 进行解析，从而在 Kubernetes 项 目里找到 CronJob 对象的定义呢?

1. 首先匹配组
    + 核心对象（pod、node等）是没有Group的，即“”。
    + 对于非核心对象（CronJob等）就在/apis下面查找组，找到 /apis/batch
    + API Group的分类是以对象为依据的，比如Job和CronJob都属于batch
2. 匹配API对象的版本号
    + 会匹配到batch这个Group下面的v2alpha1
    + 同一个api对象可以有多个版本，这是k8s对API进行版本化的重要手段
3. 匹配资源类型
    + 根据前面的信息，k8s就知道要创建的是/apis/batch/v2alpha1下面的CronJob对象


## api-server创建资源的流程
下面就是apiserver创建这个CronJob对象的流程了：
![image](https://user-images.githubusercontent.com/12036324/70958643-e0722300-20b4-11ea-8eab-cbba0c27cebf.png)

1. kubectl发起创建CronJob的请求：yaml文件被提交到api-server
2. 过滤这个请求：完成一些前置工作比如：授权、超时处理、审计
3. MUX和Routes流程：API-server完成URL和Handler的绑定，而这个Handler做的事情就是上面查找匹配CronJob的过程
4. 根据yaml文件创建一个CronJob对象
    + Convert： 将用户提交的yaml文件转换为Super Version 对象，他是该API资源类型所有版本的全集。这就保证了用户提交的不同yaml文件，都可以通过这个对象来处理
5. Admission + Validation：
    + Admission： Admission Controller 和 Initializer
    + Validation： 负责验证这个对象里面的字段是否合法。被验证过的对象都保存在APIServer里一个叫Registry的数据结构中。也就是说只要一个API对象的定义能在Registry找到，那么它就是一个有效的k8s api对象
6. APIServer把验证过的对象转换为用户最初提交的版本，进行序列化操作，并调用Etcd的API把它存起来


##  CRD
我们可以看到上面如果添加一个k8s的api是一个特别费劲的过程。
在k8s 1.7版本之后，就可以定义CRD了。

```yaml
apiVersion: apiextensions.k8s.io/v1beta1
kind: CustomResourceDefinition
metadata:
  name: networks.samplecrd.k8s.io
spec:
  group: samplecrd.k8s.io
  version: v1
  names:
    kind: Network
    plural: networks
  scope: Namespaced
```

