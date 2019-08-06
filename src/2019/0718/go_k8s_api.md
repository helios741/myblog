# Go语言操作K8S的API

[client-go](https://github.com/kubernetes/client-go)

## 每个目录的主要作用

- discovery: 用来发现被K8S的API服务支持的API


## 三种client的区别

https://fankangbest.github.io/2017/07/15/RESTClient-DynamicClient%E5%92%8CClientSet-Demo/

### REST client

### dynamic client


### client set


- [kube-controller-manager源码分析（三）之 Informer机制](https://www.huweihuang.com/kubernetes-notes/code-analysis/kube-controller-manager/sharedIndexInformer.html)
- [k8s.io/client-go/kubernetes](https://godoc.org/k8s.io/client-go/kubernetes): 访问K8S API的一系列clinet
- [k8s.io/apimachinery/pkg/apis/meta/v1](https://godoc.org/k8s.io/apimachinery/pkg/apis/meta/v1): 获取一个资源的meta信息
- [k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset](https://godoc.org/k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset): 自定义资源的clinetset
- [k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1beta1](https://godoc.org/k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1beta1): v1beta1版本的API
- [k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset/typed/apiextensions/v1beta1](https://godoc.org/k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset/typed/apiextensions/v1beta1): 自动生成类型化的clientset


```shell
# 代码生成的工作目录，也就是我们的项目路径
$ ROOT_PACKAGE="github.com/resouer/k8s-controller-custom-resource"
# API Group
$ CUSTOM_RESOURCE_NAME="samplecrd"
# API Version
$ CUSTOM_RESOURCE_VERSION="v1"

# 安装 k8s.io/code-generator
$ go get -u k8s.io/code-generator/...
$ cd $GOPATH/src/k8s.io/code-generator

# 执行代码自动生成，其中 pkg/client 是生成目标目录，pkg/apis 是类型定义目录
$ ./generate-groups.sh all "$ROOT_PACKAGE/pkg/client" "$ROOT_PACKAGE/pkg/apis" "$CUSTOM_RESOURCE_NAME:$CUSTOM_RESOURCE_VERSION"

```

reference:
- [Kubernetes Informer 详解](https://www.kubernetes.org.cn/2693.html)
- [如何用 client-go 拓展 Kubernetes 的 API](https://mp.weixin.qq.com/s?__biz=MzU1OTAzNzc5MQ==&mid=2247484052&idx=1&sn=cec9f4a1ee0d21c5b2c51bd147b8af59&chksm=fc1c2ea4cb6ba7b283eef5ac4a45985437c648361831bc3e6dd5f38053be1968b3389386e415&scene=21#wechat_redirect)
- [使用 client-go 控制原生及拓展的 Kubernetes API | PPT 实录](https://www.kubernetes.org.cn/1309.html)
- [使用 client-go 控制原生及拓展的 Kubernetes API | 视频](https://www.kubernetes.org.cn/1283.html)
- 


