
# 浅谈kubernetes存储

## 一、pv、pvc、storageclass是什么

### 1.1 pv/pvc的来源

在没有pv/pvc之前，应用如果想要使用远程存储的话，比如想要使用ceph，就要把声明ceph的信息（比如ceph的地址、用户名等）写在pod的spec中，就像下面这样：
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: rbd
spec:
  containers:
    - image: kubernetes/pause
      name: rbd-rw
      volumeMounts:
      - name: rbdpd
        mountPath: /mnt/rbd
  volumes:
    - name: rbdpd
      rbd:
        monitors:
        - '10.16.154.78:6789'
        - '10.16.154.82:6789'
        - '10.16.154.83:6789'
        pool: kube
        image: foo
        fsType: ext4
        readOnly: true
        user: admin
        keyring: /etc/ceph/keyring
        imageformat: "2"
        imagefeatures: "layering" 
```

这个对一个开发人员是很痛苦的，还要去了解ceph的知识，对于新手来说还大概率写错，如果多种存储的话还要去了解不同的存储（比如除了ceph还有NFS、gluster等）。但是开发人员的目的很单纯，就是想把数据存储某个目录下面，结果却要耗费额外的的时间去搞这些对于开发没有关系的东西，就像开发先知新模块的RD一样，为什么我要加这么多东西才能让我的这个模块跑起来。


现在我们来看看两种不同人员的诉求：
- 开发者：我本地数据怎么存，线上怎么存就行
- 运维/集群管理员：把存储的入口掌握在自己手里，做到可控
根据上述诉求，k8s设计了pv/pvc，其中：
- 声明存储：persistentVolume
- 使用存储：persistentVolumeClaim
- 把存储挂在到哪个目录：pod.spec

所以以后应用的开发人员只需要声明存储的大小和[权限](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)即可，如下：
```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: pv-claim
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

accessModes指的是这个存储的权限，包含下面几种：
- ReadWriteOnce（RWO）：只能被一个节点读写，比如local pv
- ReadOnlyMany（ROX）：能被多个节点读，比如NFS
- ReadWriteMany（RWX）：被多个节点读写，比如cephfs

更多内容可以参考[access-modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)

然后在POD中使用这个PVC
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pv-pod
spec:
  containers:
  - name: pv-container
    image: nginx
    ports:
      - containerPort: 80
        name: "http-server"
    volumeMounts:
      - mountPath: "/usr/share/nginx/html"
        name: pv-storage
    volumes:
      - name: pv-storage
        persistentVolumeClaim:
          claimName: pv-claim
```

至此应用开发人员做的工作就结束了。运维/集群管理员关心的是存储本身，所以需要根据声明PVC去创建PV(Persistent Volume)。
```yaml
kind: PersistentVolume
apiVersion: v1
metadata:
  name: pv-volume
  labels:
    type: local
spec:
  capacity:
    storage: 1Gi
  rbd:
    monitors:
    - '10.16.154.78:6789'
    - '10.16.154.82:6789'
    - '10.16.154.83:6789'
    pool: kube
    image: foo
    fsType: ext4
    readOnly: true
    user: admin
    keyring: /etc/ceph/keyring
    imageformat: "2"
    imagefeatures: "layering"
```
### 1.2 StorageClass来源

每次开发者提交新的PVC，运维人员就要手动创建PV，在一般集群中还能接受（比如先知）但是在大规模集群中时时刻刻都有人创建PVC，那对于运维/集群管理员来说又是一场灾难。所以kubernetes提供了动态创建pv的机制（上面的例子叫静态创建pv）即通过声明的PVC自动创建PV，其工作的核心在于StorageClass对象，作用是创建pv模板。

