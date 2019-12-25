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


## 访问控制器



### 访问webhook是什么

## 创建和配置一个访问webhook

### 前提

### 写webhook


##  构建这个项目


### 在集群中部署webserver

### 配置webhook

### 试一试

### 尝试mutating webhook

