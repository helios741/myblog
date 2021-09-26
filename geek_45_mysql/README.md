## 一、 一条SQL的命运

<img src="./1_sql_query_process.png" alt="img" style="zoom: 25%;" />

概述：整体架构是C - S - engine（innoDB）模型

1、 连接器（能不能进）：负责认证
2、 分析器（要干什么）：词法分析，语法分析
3、 优化器（要怎么干）：选索引
4、 执行器（从哪干）：存储引擎的client，每次从存储引擎中拿一条
5、 存储引擎（干）：插件式



## 二、 redolog和binlog的作用

### redolog和binlog分别记录什么？

|          | redolog                            | binlog                                    |
| -------- | ---------------------------------- | ----------------------------------------- |
| 归属     | innoDB引擎                         | mysql server                              |
| 用处     | 单机crash 恢复到最终状态           | 集群备份/恢复                             |
| 大小     | 受限制（一般4G）                   | 无限制（顺序添加，批量写）                |
| 恢复速度 | 快（checkpoint机制）               | 慢(挨个执行binlog中的语句，以row格式为例) |
| 格式     | 物理页（页号、偏移量、修改字节等） | 逻辑（sql语句或者数据）                   |



### checkpoint的作用？

缩短故障恢复时间，checkpoint之前的都是已经提交过的，即没用的了，这也是固定redo log大小的原因。

redolog不够用，就用磁盘。



### checkpoint是怎么移动的？

![MySQL 技术内幕-InnoDB 存储引擎](/Users/helios/Desktop/helios/myblog/geek_45_mysql/2_innodb_memory.png)

当内存中的数据页（data page）落盘之后，checkpoint就能移动了，即这一条事物的日志就没用了。

### 如何故障恢复
只检查checkpoint之后即可，binlog是通过最后一次全量备份+binlog的方式。


### innodb_flush_log_at_trx_commit的作用是什么

![MySQL 技术内幕-InnoDB 存储引擎](/Users/helios/Desktop/helios/myblog/geek_45_mysql/2_innodb_memory.png)

每次事务不过内存buffer，都写redolog。

### 为什么要2PC

<img src="./2_2pc.png" alt="img" style="zoom:25%;" />

- redolog没写成功但是binlog写成功了：也就是逻辑成功了，但是物理没成功。以后备份会多一个事务。
- binlog没写成功但是redolog写成功了：数据恢复回来有，但是以后备份会少一个事务。



## 三、事物的隔离机制

隔离指的是不同事务操作同一个数据的隔离机制，有：

读未提交：没有视图，别的事务中修改了数据在你的事务中能感受到

读已提交：事务开始建立视图，结束时候更新数据，其他事务就能看见了。

可重复读：事务开始前后读到的数据一致的。

串行化：读的时候加读锁，写的时候加写锁。

读未提交和读已提交在某种意义上相当于引用传递，可重复读相当于值传递。



SQL语句开始创建视图和事务开始创建视图有什么区别？

undolog是回滚日志么，是如何记录的？

是不是事务结束之后，回滚日志就能删除了？

1. 事务的概念是什么?
2. mysql的事务隔离级别读未提交, 读已提交, 可重复读, 串行各是什么意思?
3. 读已提交, 可重复读是怎么通过视图构建实现的?
4. 可重复读的使用场景举例? 对账的时候应该很有用?
5. 事务隔离是怎么通过read-view(读视图)实现的?
6. 并发版本控制(MCVV)的概念是什么, 是怎么实现的?
7. 使用长事务的弊病? 为什么使用常事务可能拖垮整个库?
8. 事务的启动方式有哪几种?
9. commit work and chain的语法是做什么用的?
10. 怎么查询各个表中的长事务?
11. 如何避免长事务的出现?

