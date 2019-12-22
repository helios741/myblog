

## 如何配置主从节点的配置和同步

### 1、 通过XtraBackup将master节点的数据备份到执行目录

注：
```shell
XtraBackup 是业界主要使用的开源 MySQL 备份和恢复工具。
```

这一步会自动在目标目录生成一个备份文件，叫：*xtrabackup_binlog_info*。这个文件一般会包含如下两个信息：
```shell
$ cat xtrabackup_binlog_info
TheMaster-bin.000001     481
```
这两个信息会在配置salve中用到

### 2、 配置slave节点

slave节点在第一次启动之前，需要先把master节点的备份数据，连同配置信息文件，一起拷贝到自己的目录（/var/lib/mysql）下。然后执行下面的SQL：
```shell
CHANGE MASTER TO
MASTER_HOST='$masterip',
MASTER_USER='xxx',
MASTER_PASSWORD='xxx',
MASTER_LOG_FILE='TheMaster-bin.000001',
MASTER_LOG_POS=481;
```
- MASTER_LOG_FILE: 备份对应的二进制日志文件的名称
- MASTER_LOG_POS: 备份对应的二进制日志文件开始的位置（偏移量）
也就是上一步中*xtrabackup_binlog_info*文件的内容。

### 3、 启动slave

执行下面的SQL：
```shell
START SLAVE;
```
SLAVE 启动之后，它会使用备份信息文件中的二进制文件和偏移量与主节点进行数据同步。

### 4、向集群中添加更多的slave节点
新添加的slave节点的备份数据，来自于已经存在的slave节点。


我们需要将slave节点的数据备份到指定的目录。而这个操作会自动生成另一种备份信息，叫*xtrabackup_slave_info*。同样这个文件也包含*MASTER_LOG_FILE*和*MASTER_LOG_POS*两个字段。

然后，我们就可以执行跟前面一样的“CHANGE MASTER TO”和“START SLAVE” 指令，来 初始化并启动这个新的 Slave 节点了。


## 需要翻过的三座大山


### 1、 master节点和slave节点需要不同的配置文件

把主从节点的配置文件都放在config-map里面，然后根据pod的序号（决定了主从身份）挂载不同的配置文件。
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql
  labels:
    app: mysql
data:
master.cnf: |
# 主节点 MySQL 的配置文件 [mysqld]
log-bin
slave.cnf: |
# 从节点 MySQL 的配置文件 [mysqld] super-read-only
```
- master.cnf: 开启log-bin，使用二进制日志文件的方式进行主从复制，这是主节点的标准涉及
- slave.cnf: 开启super-read-only，用户只读

创建两个service给StatefulSet 以及用户使用：
```shell
apiVersion: v1
kind: Service
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  ports:
  - name: mysql
    port: 3306
  clusterIP: None
  selector:
    app: mysql
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-read
  labels:
    app: mysql
spec:
  ports:
  - name: mysql
    port: 3306
  selector:
app: mysql
```
不同就在与第一个service的*clusterIP: None*，是给StatefulSet用的。
第二个是给调用方使用的。

- 用户的所有读请求，必须访问第二个service
- 写请求必须访问*mysql-0*这个DNS记录

### 2、 master节点和slave节点需要能够传输备份信息文件

对于一个pod是主节点还是从节点，在一个statefulSet中要分情况讨论。

#### 2.1、 从 ConfigMap 中，获取 MySQL 的 Pod 对应的配置文件。

我们需要进行一个初始化操作，根据节点的角色是 Master 还是 Slave 节点，为 Pod 分 配对应的配置文件。此外，MySQL 还要求集群里的每个节点都有一个唯一的 ID 文件，名叫 server-id.cnf。

```shell
      - name: init-mysql
        image: mysql:5.7
        command:
        - bash
        - "-c"
        - |
          set -ex
          # 从 Pod 的序号，生成 server-id
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo [mysqld] > /mnt/conf.d/server-id.cnf
          # Add an offset to avoid reserved server-id=0 value.
          echo server-id=$((100 + $ordinal)) >> /mnt/conf.d/server-id.cnf
          # Copy appropriate conf.d files from config-map to emptyDir.
          if [[ $ordinal -eq 0 ]]; then
            cp /mnt/config-map/master.cnf /mnt/conf.d/
          else
            cp /mnt/config-map/slave.cnf /mnt/conf.d/
          fi
        volumeMounts:
        - name: conf
          mountPath: /mnt/conf.d
        - name: config-map
          mountPath: /mnt/config-map
```

#### 2.2、 在 Slave Pod 启动前，从 Master 或者其他 Slave Pod 里拷贝数据库数据到自己的目录下

```yaml
      - name: clone-mysql
        image: gcr.io/google-samples/xtrabackup:1.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # Skip the clone if data already exists.
          [[ -d /var/lib/mysql/mysql ]] && exit 0
          # Skip the clone on master (ordinal index 0).
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          [[ $ordinal -eq 0 ]] && exit 0
          # Clone data from previous peer.
          ncat --recv-only mysql-$(($ordinal-1)).mysql 3307 | xbstream -x -C /var/lib/mysql
          # Prepare the backup.
          xtrabackup --prepare --target-dir=/var/lib/mysql
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
          subPath: mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
```
- 当初始化所需的数据 (/var/lib/mysql/mysql 目录)已经存在，或者当前 Pod 是 Master 节点的时候，不需要做拷 贝操作。
- clone-mysql 会使用 Linux 自带的 ncat 指令，向 DNS 记录为“mysql-< 当前序号减 一 >.mysql”的 Pod，也就是当前 Pod 的前一个 Pod，发起数据传输请求，并且直接用 xbstream 指令将收到的备份数据保存在 /var/lib/mysql 目录下。
- 容器里的 /var/lib/mysql 目录，实际上正是一个名为 data 的 PVC， 即:我们在前面声明的持久化存储。
- xtrabackup --prepare: 让拷贝来的数据进入一致性状态，这样，这些数据才能被用作数据恢复


### 3、 在Slave第一次启动之前，需要执行一些SQL操作



