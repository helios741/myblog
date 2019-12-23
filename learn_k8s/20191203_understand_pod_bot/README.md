

## 一、projected volume

在k8s v1.11版本之后，有种特殊的volume，叫做projected volume，可以把它翻译为投射数据卷。

[为什么会有projected volume](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/node/all-in-one-volume.md)

他们不是为了存放容器里的数据，也不是用来进行容器与宿主机之间的数据交换。这些特殊的volume是为容器提供预先定义好的数据，相当于映射好的环境变量。


### 1. Secret
secret的作用是帮你把pod想要的加密数据存放到etcd中。然后你就可以通过在POD容器中挂载volume的方式，访问到这些secret里保存的信息了。

pod的定义：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
  - name: container-test
    image: busybox
    args:
    - sleep
    - "86400"
    volumeMounts:
    - name: all-in-one
      mountPath: "/projected-volume"
      readOnly: true
  volumes:
  - name: all-in-one
    projected:
      sources:
      - secret:
          name: mysecret
          items:
            - key: user
              path: my-group/my-username
      - secret:
          name: mysecret
          items:
            - key: pass
              path: my-group/my-password
```

secret的定义
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
  type: Opaque
data:
  user: YWRtaW4=
  pass: MWYyZDFlMmU2N2Rm
[root@ambari yamk]# cat mysecret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
  type: Opaque
data:
  user: YWRtaW4=
  pass: MWYyZDFlMmU2N2R
```
查看：
```shell
# kubectl exec -ti volume-test ls /projected-volume
my-group
# kubectl exec -ti volume-test cat /projected-volume/my-group/my-username
admin
```
kubelet定期的维护这些volume，通过这种方式挂载到容器中的secret，一旦其ETCD里面的数据发生了变化，这些volume的内容同时也会被更新。



### 2. ConfigMap
和secret基本一样，就是不加密

### 3. Downward API
[downward api](https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test1
  labels:
    app: dsds
    app1: dsds
spec:
  containers:
  - name: container-test
    image: busybox
    args:
        - sleep
        - "86400"
    volumeMounts:
    - name: all-in-one
      mountPath: "/projected-volume"
      readOnly: true
  volumes:
  - name: all-in-one
    projected:
      sources:
      - secret:
          name: mysecret
          items:
            - key: user
              path: my-group/my-username
      - downwardAPI:
          items:
            - path: "labels"
              fieldRef:
                fieldPath: metadata.labels
```

结果：
```shell
# kubectl exec -ti volume-test1 cat /projected-volume/labels
app="dsds"
app1="dsds
```

### 4. ServiceAccountToken


是一种特殊的secrets，表示对API server的权限。
我们看到每个pod都会有个默认的secret(default-token-flthp)，标志着对API server的访问权限：
```shell
Volumes:
  all-in-one:
    Type:                Projected (a volume that contains injected data from multiple sources)
    SecretName:          mysecret
    SecretOptionalName:  <nil>
    DownwardAPI:         true
  default-token-flthp:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-flthp
    Optional:    false
QoS Class:       BestEffort
```

会默认挂载到*/var/run/secrets/kubernetes.io/serviceaccount*下面：
```shell
# kubectl exec -ti volume-test1 sh
/ # ll /var/run/secrets/kubernetes.io/serviceaccount
sh: ll: not found
/ # ls /var/run/secrets/kubernetes.io/serviceaccount
ca.crt     namespace  token
```


他们和环境变量的区别就是，环境变量不具备自动更新的功能。


## PodPreset
