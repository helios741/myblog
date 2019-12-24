
# PV、PVC、StorageClass


## PV和PVC介绍
- PV描述的是持久化存储的数据卷。这个API对象主要定义的是一个持久化存储在宿主机的目录，比如一个NFS的挂载目录
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs
spec:
  storageClassName: manual
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.244.1.4
    path: "/"
```
- PVC描述的是POD希望持久化存储的属性，比如volume存储的大小，可读写权限等。
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: manual
  resources:
    requests:
      storage: 1Gi
```
开发人员创建的PVC，如果要能被POD使用，前提是要和某个符合要求的PV进行绑定：
- spec字段必须对的上，PV的存储大小必须满足PVC的要求
- PV 和 PVC 的 storageClassName

bind之后就能在pod中使用PVC了：
```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    role: web-frontend
spec:
  containers:
  - name: web
    image: nginx
    ports:
      - name: web
        containerPort: 80
    volumeMounts:
        - name: nfs
          mountPath: "/usr/share/nginx/html"
  volumes:
  - name: nfs
    persistentVolumeClaim:
      claimName: nfs
```

## Volume Controller

Volume Controller维护着多个控制循环，其中有一个控制循环PersistentVolumeController就负责PVC和PV的绑定操作。


Volume Controller会不断的查看当前的所有PVC是不是处在 Bound(已绑 定)状态。如果不是就遍历所有可用的PV，尝试为这个PVC找到一个PV。


PVC和PV进行绑定的标志就是在PVC对象的spec.VolumeName字段是对应PV的name。
```yaml
kubectl get pvc example-local-claim -o yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  annotations:
    pv.kubernetes.io/bind-completed: "yes"
    pv.kubernetes.io/bound-by-controller: "yes"
  creationTimestamp: "2019-06-15T06:27:02Z"
  finalizers:
  - kubernetes.io/pvc-protection
  name: example-local-claim
  namespace: default
  resourceVersion: "921862"
  selfLink: /api/v1/namespaces/default/persistentvolumeclaims/example-local-claim
  uid: 96185acf-8f36-11e9-afc8-525400495468
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: local-storage
  volumeMode: Filesystem
  volumeName: example-pv
status:
  accessModes:
  - ReadWriteOnce
  capacity:
    storage: 5Gi
  phase: Bound
```

## PV对象如何变为容器里的持久化存储

k8s使用远程的存储服务,比如远程文件存储(比如，NFS、GlusterFS)、远程块存储(比如，公有云提供的远程磁盘)等等，来为容器准备一个持久化的宿主机目录以供将来在绑定挂载的时候使用。这样容器在挂载的目录写入的文件都会保存在远程存储上，从而实现了“持久化”。


## "持久化"原理

当pod调度到一个node上的时候，kubelet就要负责给这个pod创建它的Volume目录。默认情况下，kubelet为Volume创建的目录路径如下：
```shell
/var/lib/kubelet/pods/<Pod 的 ID>/volumes/kubernetes.io~<Volume 类型 >/<Volume 名字 >
```
下面kunelet的操作就取决于Volume的类型了。

如果是远程块存储，就要进入“持久化”的第一个阶段：Attach。就是通过调用远程块存储的API创建一个一个块存储并且挂载到磁盘上。

如果是NFS等文件存储，省去了第一阶段的过程。


Attach阶段完成后，为了能够使用这块远程磁盘，kubelet要进行第二个操作：格式化这个磁盘并把它挂载到宿主机的指定挂载点：
```shell
# 通过 lsblk 命令获取磁盘设备 ID
$ sudo lsblk
# 格式化成 ext4 格式
$ sudo mkfs.ext4 -m 0 -F -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/< 磁盘设备 ID> 5 # 挂载到挂载点
$ sudo mkdir -p /var/lib/kubelet/pods/<Pod 的 ID>/volumes/kubernetes.io~<Volume 类型 >/<Volume 名字 >


## StorageClass

