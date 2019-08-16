# 第一章习题

[linux review](http://cn.linux.vbird.org/linux_basic/0110whatislinux_4.php)


## 你在你的主机上面安装了一张网络卡，但是开机之后，系统却无法使用，你确定网络卡是好的，那么可能的问题出在哪里？该如何解决？

- 这个网卡是不是能不能用在这个机器上
- 驱动有没有，对不对

## 一个操作系统至少要能够完整的控制整个硬件，请问，操作系统应该要控制硬件的哪些单元？

- 存储单元
- 运算单元


## 我在Windows上面玩的游戏，可不可以拿到Linux去玩？

不可以，就算是CPU的架构都是X86的，但是这个软件也是依赖操作系统的接口的，换了操作系统，软件的代码也要变动。

## Linux本身仅是一个核心与相关的核心工具而已，不过，他已经可以驱动所有的硬件， 所以，可以算是一个很普通的操作系统了。经过其他应用程序的开发之后，被整合成为Linux distribitions。请问众多的distributions之间，有何异同？

linux发行版：内核 + 软件 + 工具 + 可完全安装程序

linux发行版都是有https://www.kernel.org网站所发布，它们使用的软件也都是很知名的软件，例如：
- 网页服务器Apache
- 电子邮件服务器Postfix/sendmail
- 文件服务器samba

它们都遵循一定的标准linux Standard Bash（LSB），以及目录结构（File system Hierarchy Standard）标准规范。

唯一的差别就是：
- 厂商所开发出来的工具
- 套件管理模式

## Unix 是谁写出来的？ GNU 计划是谁发起的？

- 贝尔实验室的ken Thompson
- Richard Mathew stallman(里查德.马修.斯托曼)

## GNU 的全名为何？他主要由那个基金会支持？
GNU Not Unix。
GNU计划的目标是建立一个自由，开放的Unix操作系统。
大白话： 在unix上写软件

是有自由软件基金会（Free Software Foundation， FSF）支持。

还草拟了通用公共许可证（General Public Lincense， GPL）


## 何谓多人 ( Multi-user ) 多任务 ( Multitask )？

有多个用户，能同时跑不同的任务。


## 简单说明 GNU General Public License ( GPL ) 与 Open Source 的精神

GPL比开源的限制多一些。

开源相对于GPL：
- 再发布的授权可以和以前的软件授权不同
- 开源软件的一部分或者全部可以作为其他软件的一部分，且其他软件无需使用与开源软件相同的授权来发布

GPL规定：
- 任何软件只要用了GPL的全部或者部分代码，那么该软件就要使用GPL的授权
- 上一条的原因对于商业公司影响比较大


## 什么是 POSIX ?为何说 Linux 使用 POSIX 对于发展有很好的影响？

- 可移植操作系统接口（Portable Operating System Interface， POSIX）： 规范内核和应用程序之间的接口，这是美国电器与电子工程师学会（IEEE）所发布的一项标准。

因为POSIX标准主要是针对UNIX和一些软件运行时的标准规范，只要根据这个标准设计的软件和内核，理论上可以搭配在一起执行。

linux和unix都用这个标准，这让linux软件与unix上的软件兼容。加上Linux可以让别人随便用，就流通起来了。


## 简单说明 Linux 成功的因素？

开源与兼容




