
[传送门](https://time.geekbang.org/column/article/70476)

## 笔记

内核中通过jiffies记录了开机以来的中断数。
每发生一次中断，jiffies加一。
中断发生的时间是根据内核中的节拍率（HZ）来确定了，比如下面显示的HZ=1000，就是一秒触发1000次中断。

```shell

$ grep 'CONFIG_HZ=' /boot/config-$(uname -r)
CONFIG_HZ=1000
```

因为是内核选项，用户态没有办法访问，内核提供了用户空间节拍率 USER_HZ，固定为100。这样，用户空间程序并不需要关心内核中 HZ 被设置成了多少，因为它看到的总是固定值 USER_HZ。


## 精彩留言

centos 7只显示二进制
“
我的系统是centos7，上次实战用 perf top -g -p pid没有看到函数名称，只能看到一堆十六进制的东西，然后老师给了解决方法，我转述下：
分析：当没有看到函数名称，只看到了十六进制符号，下面有Failed to open /usr/lib/x86_64-linux-gnu/libxml2.so.2.9.4, continuing without symbols 这说明perf无法找到待分析进程所依赖的库。这里只显示了一个，但其实依赖的库还有很多。这个问题其实是在分析Docker容器应用时经常会碰到的一个问题，因为容器应用所依赖的库都在镜像里面。

老师给了两个解决思路：
（1）在容器外面构建相同路径的依赖库。这种方法不推荐，一是因为找出这些依赖比较麻烦，更重要的是构建这些路径会污染虚拟机的环境。
（2）在容器外面把分析纪录保存下来，到容器里面再去查看结果，这样库和符号的路径就都是对的了。

操作：
（1）在Centos系统上运行 perf record -g -p <pid>，执行一会儿（比如15秒）按ctrl+c停止
（2）把生成的 perf.data（这个文件生成在执行命令的当前目录下，当然也可以通过查找它的路径 find | grep perf.data或 find / -name perf.data）文件拷贝到容器里面分析:
docker cp perf.data phpfpm:/tmp
docker exec -i -t phpfpm bash
$ cd /tmp/
$ apt-get update && apt-get install -y linux-perf linux-tools procps
$ perf_4.9 report

注意：最后运行的工具名字是容器内部安装的版本 perf_4.9，而不是 perf 命令，这是因为 perf 会去跟内核的版本进行匹配，但镜像里面安装的perf版本有可能跟虚拟机的内核版本不一致。
注意：上面的问题只是在centos系统中有问题，ubuntu上没有这个问题
”
