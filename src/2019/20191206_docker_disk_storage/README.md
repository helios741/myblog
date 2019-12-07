# 浅谈docker中镜像和容器在本地的存储
--------

[文章首发](https://github.com/helios741/myblog/tree/new/learn_go/src/2019/20191206_docker_disk_storage)
-------

## 一、docker拉取镜像的过程

如果对manifest和image config不了解的可以去看一下：[manifest spec](https://github.com/opencontainers/image-spec/blob/master/manifest.md) 和[Image Configuration](https://github.com/opencontainers/image-spec/blob/master/config.md)。
简单的来说前者描述一个镜像在registry上的存储，后者描述的是在本地磁盘的存储。

![image](https://user-images.githubusercontent.com/12036324/70367494-646d2380-18db-11ea-992a-d2bca4cbfeb0.png)

dockerd和registry的通信过程：[Docker Registry HTTP API V2](https://docs.docker.com/registry/spec/api/)

为什么要拉取两种配置文件（这里可以先有个感性的认知，后面会深入说）：
- [manifes](https://github.com/opencontainers/image-spec/blob/master/manifest.md)是针对registry服务端的配置信息
- [image config](https://github.com/opencontainers/image-spec/blob/master/config.md)是针对本地镜像的描述

为什么要有digest：


如果一个镜像的镜像名和tag没有变，但是镜像的内容变了（layer变了），这就会造成相同的镜像名+tag得到了不同的镜像。

digest是对manifest文件的sha256，当镜像的内容变化，即layer变化，相应的layer的sha256变化，以至manifest变化，从而保证了一个digest（不是镜像名+tag）对应一个镜像。

后面我们就知道了一个基础就是：**一个digest 对应一个image Id**

现在就在我们的机器上pull一个镜像：*docker pull ubuntu:18.04*,过程如下：
```shell
# docker pull docker-search.4pd.io/ubuntu:18.04
Trying to pull repository docker-search.4pd.io/ubuntu ...
18.04: Pulling from docker-search.4pd.io/ubuntu
7ddbc47eeb70: Pull complete
c1bbdc448b72: Pull complete
8c3b70e39044: Pull complete
45d437916d57: Pull complete
Digest: sha256:134c7fe821b9d359490cd009ce7ca322453f4f2d018623f849e580a89a685e5d
Status: Downloaded newer image for docker-search.4pd.io/ubuntu:18.04
```

## 二、 docker镜像在本地磁盘上的存储
![image](https://user-images.githubusercontent.com/12036324/70367675-19eca680-18dd-11ea-9121-4f1f6853cdc3.png)
### 1、docker和存储有关信息


```shell
# docker info
Containers: 18
 Running: 15
 Paused: 0
 Stopped: 3
Images: 11
Server Version: 18.09.6
Storage Driver: overlay2
 Backing Filesystem: extfs
 Supports d_type: true
 Native Overlay Diff: true
...
Plugins:
 Volume: local
 Network: bridge host macvlan null overlay
 Log: awslogs fluentd gcplogs gelf journald json-file local logentries splunk syslog
...
Docker Root Dir: /var/lib/docker
```
由上可以看出：
- 使用的是overlay2存储驱动
- docker的根目录是/var/lib/docker
- 后端的文件系统是extfs

### 2、docker的目录结构

```shell
# ll /var/lib/docker
total 60
drwx------  2 root root  4096 Dec  1 12:18 builder
drwx------  4 root root  4096 Dec  1 12:18 buildkit
drwx------  3 root root  4096 Dec  1 12:18 containerd
drwx------ 20 root root  4096 Dec  5 14:18 containers
drwx------  3 root root  4096 Dec  1 12:18 image
drwxr-x---  3 root root  4096 Dec  1 12:18 network
drwx------ 72 root root 12288 Dec  5 14:18 overlay2
drwx------  4 root root  4096 Dec  1 12:18 plugins
drwx------  2 root root  4096 Dec  1 12:18 runtimes
drwx------  2 root root  4096 Dec  1 12:18 swarm
drwx------  2 root root  4096 Dec  4 11:32 tmp
drwx------  2 root root  4096 Dec  1 12:18 trust
drwx------  4 root root  4096 Dec  4 10:08 volumes
```
和镜像存储有关的信息如下：

- overlay2: 镜像和容器的层信息
- image：存储镜像元相关信息

### 3. image目录

```shell
# tree -L 1 image/overlay2/
image/overlay2/
├── distribution
├── imagedb
├── layerdb
└── repositories.json
```
#### 3.1 repositories.json
repositories.json就是存储镜像信息，主要是name和image id的对应，digest和image id的对应。当pull镜像的时候会更新这个文件。

```shell
# cat image/overlay2/repositories.json  | python -m json.tool
{
    "Repositories": {
        "docker.io/ubuntu": {
            "docker.io/ubuntu:18.04": "sha256:775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c",
            "docker.io/ubuntu@sha256:6e9f67fa63b0323e9a1e587fd71c561ba48a034504fb804fd26fd8800039835d": "sha256:775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c"
        }
    }
}
```

#### 3.2 imagedb
image id和digest的联系：
```shell
# docker images --digests
REPOSITORY          TAG                 DIGEST                                                                    IMAGE ID            CREATED             SIZE
docker.io/ubuntu    18.04               sha256:6e9f67fa63b0323e9a1e587fd71c561ba48a034504fb804fd26fd8800039835d   775349758637        5 weeks ago         64.2 MB
```
digest是manifest的sha256:，因为manifest在本地没有，所有我们可以通过registry的结果去获取：
```shell
# curl -H "Accept:application/vnd.docker.distribution.manifest.v2+json" https://your-registry/v2/ubuntu/manifests/18.04
{
   "schemaVersion": 2,
   "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
   "config": {
      "mediaType": "application/vnd.docker.container.image.v1+json",
      "size": 3411,
      "digest": "sha256:775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c"
   },
   "layers": [
      {
         "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
         "size": 26688847,
         "digest": "sha256:7ddbc47eeb70dc7f08e410a6667948b87ff3883024eb41478b44ef9a81bf400c"
      },
      {
         "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
         "size": 35362,
         "digest": "sha256:c1bbdc448b7263673926b8fe2e88491e5083a8b4b06ddfabf311f2fc5f27e2ff"
      },
      {
         "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
         "size": 845,
         "digest": "sha256:8c3b70e3904492c753652606df4726430426f42ea56e06ea924d6fea7ae162a1"
      },
      {
         "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
         "size": 162,
         "digest": "sha256:45d437916d5781043432f2d72608049dcf74ddbd27daa01a25fa63c8f1b9adc4"
      }
   ]
}
```

我们然后在*curl -H "Accept:application/vnd.docker.distribution.manifest.v2+json" https://docker-search.4pd.io/v2/ubuntu/manifests/18.04 | sha256sum*就能得到digest。
查看是否一样：
```shell
# curl -H "Accept:application/vnd.docker.distribution.manifest.v2+json" https://docker-search.4pd.io/v2/ubuntu/manifests/18.04 | sha256sum
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1152  100  1152    0     0   8453      0 --:--:-- --:--:-- --:--:--  8470
134c7fe821b9d359490cd009ce7ca322453f4f2d018623f849e580a89a685e5d  -


# docker images --digests
REPOSITORY                    TAG                 DIGEST                                                                    IMAGE ID            CREATED             SIZE
docker-search.4pd.io/ubuntu   18.04               sha256:134c7fe821b9d359490cd009ce7ca322453f4f2d018623f849e580a89a685e5d   775349758637        5 weeks ago         64.2 MB
```




我们通过sha256 image config就能得到imageid：
```shell
# sha256sum image/overlay2/imagedb/content/sha256/775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c
775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c  image/overlay2/imagedb/content/sha256/775349758637aff77bf85e2ff0597e86e3e859183ef0baba8b3e8fc8d3cba51c
```
这样两个，就和我们上面的对应上了。

#### 3.3 distribution


在看一次当我们pull unbutu:1804镜像的时候出现的信息：
```shell
...
7ddbc47eeb70: Pull complete
c1bbdc448b72: Pull complete
8c3b70e39044: Pull complete
45d437916d57: Pull complete
Digest: sha256:134c7fe821b9d359490cd009ce7ca322453f4f2d018623f849e580a89a685e5d
Status: Downloaded newer image for docker-search.4pd.io/ubuntu:18.04
```
从7ddbc47eeb70开始到45d437916d57的这四行都是layer的digest。
我们再来看看image config里面关于layer存的是什么
```shell
...
    "rootfs": {
        "diff_ids": [
            "sha256:cc967c529ced563b7746b663d98248bc571afdb3c012019d7f54d6c092793b8b",
            "sha256:2c6ac8e5063e35e91ab79dfb7330c6154b82f3a7e4724fb1b4475c0a95dfdd33",
            "sha256:6c01b5a53aac53c66f02ea711295c7586061cbe083b110d54dafbeb6cf7636bf",
            "sha256:e0b3afb09dc386786d49d6443bdfb20bc74d77dcf68e152db7e5bb36b1cca638"
        ],
        "type": "layers"
    }
```

这个时候可能就会困惑，这俩怎么又不一样了呢？？？

在pull镜像的时候显示的是各个layer的digest信息，在image config存的是diffid。要区分这两个，还要先回答为什么manifest的layer的表达和image config的layer的表达中不是一个东西。

当我们去registry上拉layer的时候，拉什么格式的呢，是根据请求中的media type决定的，因为layer存在本地的时候未压缩的，或者说是解压过的。

为了在网络上传输的更加快呢，所有media type一般会指定压缩格式的，比如gzip的，具体有哪些格式，见：[media type](https://docs.docker.com/registry/spec/manifest-v2-2/#media-types)

结合我最开始说的（manifest对应registry服务端的配置，image config针对本地存储端的），其实也就不难理解了。

当docker发现本地不存在某个layer的时候，就会通过manifest里面的digest + mediaType（一般是"application/vnd.docker.image.rootfs.diff.tar.gzip"）去registry拉对应的leyer。

然后在image id存的对应的diff id就是上面拿到的tar.gz包解压为tar包的id。

```shell
# curl -H "Accept:application/vnd.docker.image.rootfs.diff.tar.gzip" https://docker-search.4pd.io/v2/ubuntu/blobs/sha256:7ddbc47eeb70dc7f08e410a667948b87ff3883024eb41478b44ef9a81bf400c -o layer1.tar.gz


# sha256sum layer1.tar.gz
7ddbc47eeb70dc7f08e410a6667948b87ff3883024eb41478b44ef9a81bf400c  layer1.tar.gz

# sha256sum layer1.tar
cc967c529ced563b7746b663d98248bc571afdb3c012019d7f54d6c092793b8b  layer1.tar
```
这就对应起来了。
/var/lib/docker/image/overlay2/distribution下面就是上面layer digest和diff id的互相对应关系：
```shell
# tree -L 2 image/overlay2/distribution/
image/overlay2/distribution/
├── diffid-by-digest  # 通过digest得到diffid
│   └── sha256
└── v2metadata-by-diffid  # 通过diffid得到digest
    └── sha256
```

### 3.4 layerdb

根据这个名字我们就知道这个目录下肯定是和layer有关系，但是又不是直接存储layer具体数据的地方。

```shell
# tree -L 2 image/overlay2/layerdb/
image/overlay2/layerdb/
├── mounts
├── sha256
│   ├── 4fc26b0b0c6903db3b4fe96856034a1bd9411ed963a96c1bc8f03f18ee92ac2a
│   ├── 565879c6effe6a013e0b2e492f182b40049f1c083fc582ef61e49a98dca23f7e
│   ├── b53837dafdd21f67e607ae642ce49d326b0c30b39734b6710c682a50a9f932bf
│   └── cc967c529ced563b7746b663d98248bc571afdb3c012019d7f54d6c092793b8b
└── tmp
```
主要看sha256这个目录（mount目录在后面镜像存储的时候具体说）。
对应着刚才的diff id，我们会发现这个里面其实只有diff id的最底层，也就是cc967c529ced563b7746b663d98248bc571afdb3c012019d7f54d6c092793b8b这个。那这个里面到底是啥意思呢，这个里面是chainid，这个是因为chainid的一层是依赖上一层的，这就导致最后算出来的rootfs是统一的。
公式为（具体可见：[layer-chainid](https://github.com/opencontainers/image-spec/blob/master/config.md#layer-chainid)）：
chaninid(1)  = diffid(1)
chainid(n) = sha256(chain(n-1) diffid(n) )

比如：

```shell
# echo -n "sha256:cc967c529ced563b7746b663d98248bc571afdb3c012019d7f54d6c092793b8b sha256:2c6ac8e5063e35e91ab79dfb7330c6154b82f3a7e4724fb1b4475c0a95dfdd33" | sha256sum
565879c6effe6a013e0b2e492f182b40049f1c083fc582ef61e49a98dca23f7e  -

# echo -n "sha256:565879c6effe6a013e0b2e492f182b40049f1c083fc582ef61e49a98dca23f7e sha256:6c01b5a53aac53c66f02ea711295c7586061cbe083b110d54dafbeb6cf7636bf" | sha256sum
b53837dafdd21f67e607ae642ce49d326b0c30b39734b6710c682a50a9f932bf  -

# echo -n "sha256:b53837dafdd21f67e607ae642ce49d326b0c30b39734b6710c682a50a9f932bf sha256:e0b3afb09dc386786d49d6443bdfb20bc74d77dcf68e152db7e5bb36b1cca638" | sha256sum
4fc26b0b0c6903db3b4fe96856034a1bd9411ed963a96c1bc8f03f18ee92ac2a  -
```
所以经过上面一套计算，我们知道最终的4fc26b0b0c6903db3b4fe96856034a1bd9411ed963a96c1bc8f03f18ee92ac2a是最后的chainid，那我们看看着里面有啥：
```shell
ll image/overlay2/layerdb/sha256/4fc26b0b0c6903db3b4fe96856034a1bd9411ed963a96c1bc8f03f18ee92ac2a/
总用量 20
-rw-r--r-- 1 root root  64 12月  6 23:31 cache-id  # 真正对应的layer数据那个目录
-rw-r--r-- 1 root root  71 12月  6 23:31 diff  # 该层的diffid
-rw-r--r-- 1 root root  71 12月  6 23:31 parent  # 上一层的chainid
-rw-r--r-- 1 root root   1 12月  6 23:31 size  # 该层的大小
-rw-r--r-- 1 root root 324 12月  6 23:31 tar-split.json.gz # tar-split.json.gz，layer压缩包的split文件，通过这个文件可以还原layer的tar包，https://github.com/vbatts/tar-split
```
现在通过这一系列的操作，终于找到了镜像层数据信息

### 4. overlay2目录

上面我们通过chainid知道了真的layer层的数据目录地址，/var/lib/docker/overlay2/就是layer数据存放的目录，比如每个chainid里面cache-id都回应这个目录下面的一个目录。

## 三、 容器在磁盘上的存储

容器的文件系统分为三层:
- r/o层：也就是镜像层
- init层：启动容器时的参数
- r/w层：可读写层

前面我们知道镜像存储在/var/lib/docker/overlay2下面，这里不仅包含了只读（r/o）层，init层和r/w层都在这个里面。
现在我们启动一个容器看看：
```shell
# docker run -ti -d docker-search.4pd.io/ubuntu:18.04 top
88a8630bf2e3292c7abdeede99d1f639f7a155ea1f30e93b691960faa9c0402b
```
运行一个容器会返回一个容器id.
通过这个id，我们能在*/var/lib/docker/image/overlay2/layerdb/mounts*目录下找到该容器的信息：
```shell
# ll image/overlay2/layerdb/mounts/88a8630bf2e3292c7abdeede99d1f639f7a155ea1f30e93b691960faa9c0402b/
总用量 12
-rw-r--r-- 1 root root 69 12月  7 10:07 init-id  # init层的id
-rw-r--r-- 1 root root 64 12月  7 10:07 mount-id # r/w层的id
-rw-r--r-- 1 root root 71 12月  7 10:07 parent   # 基于哪个layer
```

