
## 现象

集群在运行一段时间后，ClusterRoleBinding绑定ServiceAccount不生效。经过检查都是没问题：
- ClusterRoleBinding的ClusterRole是cluster-admin
- ClusterRoleBinding的subjects是某个namespace下面执行的serviceAccount

但是在pod中运行：
```shell
CA_CERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

curl --cacert $CA_CERT -H "Authorization: Bearer $TOKEN" "https://kubernetes.default.svc/api/v1/namespaces/$NAMESPACE/pods/"
```

![image](https://user-images.githubusercontent.com/12036324/70609658-20f91900-1c3d-11ea-828f-303e6f4207ef.png)

但是把上面的三个文件拷贝到本地，然后使用相同的命令就能list的到。


## 解决方法


重启了所有master节点的apiserver。

给k8s提了个issue：[RBAC is configured correctly, but pod cannot communicate with kube-apiserver ](https://github.com/kubernetes/kubernetes/issues/86153)

人家给的回答是：你的版本太低了。
