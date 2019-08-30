

## 重点
- 有五个目录不可与根目录放在不同的partition，分别为/etc, /bin, /lib, /dev, /sbin五个。
- FHS订定出来的四种目录特色为：shareable, unshareable, static, variable等四类；
- FHS所定义的三层主目录为：/, /var, /usr三层而已；

## 早期的 Unix 系统文件名最多允许 14 个字符，而新的 Unix 与 Linux 系统中，文件名最多可以容许几个字符？

## 我需要将一个文件的权限改为 -rwxr-xr-- 请问该如何下达指令？
chmod 754 xxx
## 若我需要更改一个文件的拥有者与群组，该用什么指令？
- chgrp更改用户组
- chown更改用户

## 请问底下的目录与主要放置什么数据：/etc/, /etc/init.d, /boot, /usr/bin, /bin, /usr/sbin, /sbin, /dev, /var/log

- /etc/ : 

## FHS是什么，有什么用处

文件系统等级系统（Filesystem Hierarchy Standard）


目的：让用户可以了解到已安装软件通常放在哪个目录下，也就是说FHS规定某个目录应该放什么数据。

事实上，FHS针对目录树架构仅定义出三层目录下应该放什么数据，分别是：
- /（root， 根目录）：与启动系统有关
- /usr（unix software resource）：与软件安装/执行有关
- /var（variable）：与系统运行过程有关



