

## 重点
- 有五个目录不可与根目录放在不同的partition，分别为/etc, /bin, /lib, /dev, /sbin五个。
- FHS订定出来的四种目录特色为：shareable, unshareable, static, variable等四类；
- FHS所定义的三层主目录为：/, /var, /usr三层而已；

## 早期的 Unix 系统文件名最多允许 14 个字符，而新的 Unix 与 Linux 系统中，文件名最多可以容许几个字符？

单一文件或者目录的最大容许文件名为255字节，就一个ASCII英文占用一个字节来说，则大约可达255个字符长度，中文减半。

## 我需要将一个文件的权限改为 -rwxr-xr-- 请问该如何下达指令？
chmod 754 xxx
## 若我需要更改一个文件的拥有者与群组，该用什么指令？
- chgrp更改用户组
- chown更改用户

## 请问底下的目录与主要放置什么数据：/etc/, /etc/init.d, /boot, /usr/bin, /bin, /usr/sbin, /sbin, /dev, /var/log

centos7做了以下link：
- /bin -> /usr/bin
- /sbin -> /usr/sbin
- /lib  -> /usr/lib
- /lib64 -> /usr/lib64
- /var/lock -> /run/lock
- /var/run -> /run

- /etc/ ：系统几乎所有的配置
- /etc/init.d：centos7之前的各种服务的启停脚本
- /boot：放置启动会用到的文件，包括内核文件以及启动选项与启动所需要的配置文件。
- /usr/bin（/bin）：用户能够使用的命令
- /usr/sbin(/sbin)：非系统正常运行所需要的命令，比如某些网络服务器的服务命令
- /dev：设备和接口设备都是以文件的方式存放在这个目录
- /var/log：日志放置色目录（特别重要）


## FHS是什么，有什么用处

文件系统等级系统（Filesystem Hierarchy Standard）


目的：让用户可以了解到已安装软件通常放在哪个目录下，也就是说FHS规定某个目录应该放什么数据。

事实上，FHS针对目录树架构仅定义出三层目录下应该放什么数据，分别是：
- /（root， 根目录）：与启动系统有关
- /usr（unix software resource）：与软件安装/执行有关
- /var（variable）：与系统运行过程有关



