
[第五章、首次登陆与在线求助 man page](http://cn.linux.vbird.org/linux_basic/0160startlinux_7.php)

## 简单查询一下，Physical console, Virtual console, Terminal的说明是什么



## 请问如果我以文本模式登陆Linux主机时，我有几个终端机接口可以使用？如何切换各个不同的终端机接口？
5个，tty2～tty
如果没有x window的话tty1～tty6都是


## 在Linux系统中，/VBird与/vbird是否为相同的文件？


不是。linux区分大小写


## 我想要在今天的 1:30 让系统自己关机，要怎么做？

shutdown -h 1:30


## 如果我 Linux 的 X Window 突然发生问题而挂掉，但 Linux 本身还是好好的，那么我可以按下哪三个按键来让 X window 重新启动？

Alt + Ctrl + Backspace

## 我想要知道 2010 年 5 月 2 日是星期几？该怎么做？

cal 2 5 2010

## 使用 man date 然后找出显示目前的日期与时间的参数，成为类似：2009/10/16-20:03

date +%Y/%m/%d-%H:%M

## 以 X-Window 为默认的登陆方式，那请问如何进入 Virtual console 呢？

ctrl + Alt + F2 ～ F6

## 简单说明在 bash shell 的环境下， [tab] 按键的用途？

- 能补全命令
- 能补全文件名

## 如何强制中断一个程序的进行？(利用按键，非利用 kill 命令)

ctrl + c

## Linux 提供相当多的在线查询，称为 man page，请问，我如何知道系统上有多少关于 passwd 的说明？又可以使用其他的程序来取代 man 的这个功能吗？
man -f  passwd
info

## man page 显示的内容的文件是放置在哪些目录中？
/usr/share/man/

## 请问这一串命令『 foo1 -foo2 foo3 foo4 』中，各代表什么意义？

命令为foo1
制定了一个option -foo2 这个option的实参是foo3

给foo1传递给参数是foo4


## 当我输入 man date 时，在我的终端机却出现一些乱码，请问可能的原因为何？如何修正？

linux支持多国语系，可以通过locale查看。
把里面对应的环境变量改了就行，比如LANG=zh_CN.UTF-8
LANG只与输出信息有关，若要修改其他不同信息，要同步更新： export LC_ALL=zh_CN.UTF-8


## 我输入这个命令『ls -al /vbird』，系统回复我这个结果：『ls: /vbird: No such file or directory』 请问发生了什么事？』

没有这个目录呀

## 我想知道目前系统有多少命令是以 bz 为开头的，可以怎么作？
bz + 两个tab


## 承上题，在出现的许多命令中，请问 bzip2 是干嘛用的？

压缩的


## 在终端机里面登陆后，看到的提示字符 $ 与 # 有何不同？平时操作应该使用哪一个？

$表示一般账户，#表示root账户


## 我使用dmtsai这个账号登陆系统了，请问我能不能使用reboot来重新启动？ 若不能，请说明原因，若可以，请说明命令如何下达？

只有root用户才能reboot，su - root切换到root账号
