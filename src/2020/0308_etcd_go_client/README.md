

# ETCD golang ClientV3的基本使用


## 零、搭建单机的ETCD

为了演示，在Linux机器上搭建一个不通过SSL认证的单机ETCD，安装部署步骤如下：
在github上的[relese界面](https://github.com/etcd-io/etcd/releases)找到对应的包，下载到机器上：
```shell
ETCD_VER=v3.4.4

GITHUB_URL=https://github.com/etcd-io/etcd/releases/download
DOWNLOAD_URL=${GITHUB_URL}

rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd-download-test && mkdir -p /tmp/etcd-download-test

curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd-download-test --strip-components=1
rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz

/tmp/etcd-download-test/etcd --version
/tmp/etcd-download-test/etcdctl version
```
通过后台运行部署起来：
```shell
nohup ./etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://0.0.0.0:2379 &
```
不要使用默认的监听地址，因为默认的监听的是localhost，通过外部无法访问。

## 一、etcdctl的基本使用

```shell
# 查看etcd的版本
./etcdctl version

# 新增一条数据
./etcdctl put "/school/class/name" "helios"

# 获取一条数据
[root@dajiahao03 etcd]# ./etcdctl get "/school/class/name"
/school/class/name
helios

# 得到一组数据
[root@dajiahao03 etcd]# ./etcdctl get "/school/class/" --prefix
/school/class/name
helios1
/school/class/name1
helios

# 得到所有的key
[root@dajiahao03 etcd]# ./etcdctl --prefix --keys-only=true get /
/school/class/name

/school/class/name1

# watch的功能，这个功能要开两个终端哟
# 第一个终端：
./etcdctl watch "/school/class" --prefix
# 第二个终端
[root@dajiahao03 etcd]# ./etcdctl put "/school/class/name2" "helios2"
OK
# 第一个终端的变化
[root@dajiahao03 etcd]# ./etcdctl watch "/school/class" --prefix
PUT
/school/class/name2
helios2

# 删除一条数据
[root@dajiahao03 etcd]# ./etcdctl del "/school/class/name2"
1


# 查看集群状态（如果单机的可以不用指定ENDPOINTS，如果是集群的话，通过逗号的形式加到ENDPOINTS后面）
[root@dajiahao03 etcd]# export ENDPOINTS="172.27.143.50:2379"
[root@dajiahao03 etcd]# ./etcdctl --write-out=table --endpoints=$ENDPOINTS endpoint status
+--------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|      ENDPOINT      |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+--------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| 172.27.143.50:2379 | 8e9e05c52164694d |   3.4.4 |   20 kB |      true |      false |         3 |         13 |                 13 |        |
+--------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+

# 查看集群成员
[root@dajiahao03 etcd]# ./etcdctl --write-out=table --endpoints=$ENDPOINTS member list
+------------------+---------+---------+-----------------------+---------------------+------------+
|        ID        | STATUS  |  NAME   |      PEER ADDRS       |    CLIENT ADDRS     | IS LEARNER |
+------------------+---------+---------+-----------------------+---------------------+------------+
| 8e9e05c52164694d | started | default | http://localhost:2380 | http://0.0.0.0:2379 |      false |
+------------------+---------+---------+-----------------------+---------------------+------------+

# 删除集群成员
MEMBER_ID=8e9e05c52164694d
etcdctl --endpoints=$ENDPOINTS member remove ${MEMBER_ID}

# 添加成员
NEW_ETCD_NAME="new_etcd"
NEW_ETCD_HOST="172.27.140.172"
./etcdctl --endpoints=$ENDPOINTS member add ${NEW_ETCD_NAME} --peer-urls=http://${NEW_ETCD_HOST}:2380


# 磁盘碎片整理
[root@dajiahao03 etcd]# ./etcdctl --endpoints=$ENDPOINTS defrag
Finished defragmenting etcd member[172.27.143.50:2379]


# 备份当前的ETD集群
[root@dajiahao03 etcd]# ./etcdctl snapshot save snapshot.db
{"level":"info","ts":1583651900.406544,"caller":"snapshot/v3_snapshot.go:110","msg":"created temporary db file","path":"snapshot.db.part"}
{"level":"info","ts":1583651900.4077375,"caller":"snapshot/v3_snapshot.go:121","msg":"fetching snapshot","endpoint":"127.0.0.1:2379"}
{"level":"info","ts":1583651900.4105544,"caller":"snapshot/v3_snapshot.go:134","msg":"fetched snapshot","endpoint":"127.0.0.1:2379","took":0.003921237}
{"level":"info","ts":1583651900.410609,"caller":"snapshot/v3_snapshot.go:143","msg":"saved","path":"snapshot.db"}
Snapshot saved at snapshot.db
[root@dajiahao03 etcd]# ll snapshot.db
-rw------- 1 root root 20512 3月   8 15:18 snapshot.db

# 查看snapshot状态
[root@dajiahao03 etcd]# ./etcdctl snapshot status snapshot.db
21c0c96e, 8, 11, 20 kB

# 从备份中恢复集群
[root@dajiahao03 etcd]# ./etcdctl snapshot save snapshot.db
{"level":"info","ts":1583652044.0606484,"caller":"snapshot/v3_snapshot.go:110","msg":"created temporary db file","path":"snapshot.db.part"}
{"level":"info","ts":1583652044.0613058,"caller":"snapshot/v3_snapshot.go:121","msg":"fetching snapshot","endpoint":"127.0.0.1:2379"}
{"level":"info","ts":1583652044.0659368,"caller":"snapshot/v3_snapshot.go:134","msg":"fetched snapshot","endpoint":"127.0.0.1:2379","took":0.005182366}
{"level":"info","ts":1583652044.0660565,"caller":"snapshot/v3_snapshot.go:143","msg":"saved","path":"snapshot.db"}
Snapshot saved at snapshot.db


# 切换leader
# 先看状态
etcdctl endpoint --cluster=true status  -w table
# move-leader
./etcdctl move-leader d6414a7c7c550d29
```



## 二、使用etcd client可能会出现的问题

通过`go get go.etcd.io/etcd/clientv3`，如果觉得慢活着出现问题，可以手动的把[etcd项目](https://github.com/etcd-io/etcd)手动clone到指定目录先：
```shell
mkfir -p ${GOPATH}/src/go.etcd.io
git clone git@github.com:etcd-io/etcd.git ${GOPATH}/src/go.etcd.io
```

在build的时候出现下图的问题的话，可以参考这个[博客](https://www.jianshu.com/p/5f6415bf25be)，但是我尝试了，好想不管用，如果不管用可以看我后面的终极方法。
![](go-get-err.png)

经过了上述的还是不行，因为我的go版本是13.X，我就干脆降到12.X，就work了。
步骤如下（国内镜像地址：http://mirrors.ustc.edu.cn/golang/）：
```shell
# 找到匹配的版本的go包（我的是mac的）
wget http://mirrors.ustc.edu.cn/golang/go1.12.4.darwin-amd64.tar.gz
tar -C /usr/local/bin -xzf /home/yourname/Downloads/go1.12.4.linux-amd64.tar.gz
# 修改bashrc重的PATH（我用的是zsh）
vim ~/.zshrc
export PATH=$PATH:/usr/local/bin/go/bin
```

## 三、etcdctl的基本使用


## 四、etcd ClientV3的使用

### 4.1 连接ETCD


### 4.2 获取和写入数据到ETCD


### 4.3 删除ETCD里面的数据


### 4.4 对租约的操作


### 4.5 watch功能

