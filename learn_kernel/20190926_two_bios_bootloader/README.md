[从BIOS到bootloader：创业伊始，有活儿老板自己上](https://time.geekbang.org/column/article/89739)


x86平台分为两种模式：
- 实模式：寻址为1M，每个段最多64k
- 保护模式：对于32位OS，能够寻址位4G


## BIOS时期

当计算机加电之后，会读取主板上ROM（只读的，上面固化了初始化程序）中程序，这些程序就是BIOS（Basic Input Output System）。

如果你自己安装过操作系统，刚启动的时候，按某个组合键，显示器会弹出一个蓝色的界面。能够调整启动顺序的系统，就是我说的 BIOS，然后我们就可以先执行它。

![image](https://user-images.githubusercontent.com/12036324/65738489-9f511f00-e114-11e9-8e1a-ee328aaaf668.png)

下图是1M的内存地址空间。

![image](https://user-images.githubusercontent.com/12036324/65738468-8ba5b880-e114-11e9-9719-e4292f91e67b.png)

在 x86 系统中，将 1M 空间最上面的 0xF0000 到 0xFFFFF 这 64K 映射给 ROM，也就是说，到这部分地址访问的时候，会访问 ROM。


### 0. 重置
当电脑刚加电的时候，会做一些重置的工作，将 CS 设置为 0xFFFF，将 IP 设置为 0x0000，所以第一条指令就会指向 0xFFFF0，正是在 ROM 的范围内。在这里，有一个 JMP 命令会跳到 ROM 中做初始化工作的代码，于是，BIOS 开始进行初始化的工作。

### 1. 检查硬件

BIOS检查硬件是否ok

### 2. 初始化中断

建立中断向量表和中断服务程序，因为要是使用键盘和鼠标，都是通过中断进程的

### 3. 显示
内存空间映射显存的空间，在显示器上显示一些字符

![image](https://user-images.githubusercontent.com/12036324/65738508-b98afd00-e114-11e9-9a24-261959cf603a.png)


## bootloader时期

在BIOS的界面上，你会看到一个启动盘的选项。启动盘在第一个扇区，占512字节，而且以0xAA55结束。这是一个约定，当满足这个条件的时候，这说明就是一个启动盘，在512字节以内的就会启动相关的代码。


这些代码是谁放在这里的呢？在 Linux 里面有一个工具，叫Grub2，全称 Grand Unified Bootloader Version 2。顾名思义，就是搞系统启动的。

### grub2的使用

你可以通过 grub2-mkconfig -o /boot/grub2/grub.cfg 来配置系统启动的选项。你可以看到里面有类似这样的配置。

```shell
menuentry 'CentOS Linux (3.10.0-862.el7.x86_64) 7 (Core)' --class centos --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-3.10.0-862.el7.x86_64-advanced-b1aceb95-6b9e-464a-a589-bed66220ebee' {
	load_video
	set gfxpayload=keep
	insmod gzio
	insmod part_msdos
	insmod ext2
	set root='hd0,msdos1'
	if [ x$feature_platform_search_hint = xy ]; then
	  search --no-floppy --fs-uuid --set=root --hint='hd0,msdos1'  b1aceb95-6b9e-464a-a589-bed66220ebee
	else
	  search --no-floppy --fs-uuid --set=root b1aceb95-6b9e-464a-a589-bed66220ebee
	fi
	linux16 /boot/vmlinuz-3.10.0-862.el7.x86_64 root=UUID=b1aceb95-6b9e-464a-a589-bed66220ebee ro console=tty0 console=ttyS0,115200 crashkernel=auto net.ifnames=0 biosdevname=0 rhgb quiet
	initrd16 /boot/initramfs-3.10.0-862.el7.x86_64.img
}
```
这里面的选项会在系统启动的时候，成为一个列表，让你选择从哪个系统启动。最终显示出来的结果就是下面这张图。至于上面选项的具体意思，我们后面再说。

![image](https://user-images.githubusercontent.com/12036324/65738525-c9a2dc80-e114-11e9-974f-ef50475e7bff.png)

使用 grub2-install /dev/sda，可以将启动程序安装到相应的位置。

### grub2启动流程

grub2安装的第一个重要的就是boot.img，它由boot.S编译而成，一共512字节，正式安装打启动盘的第一个扇区。这个扇区通常被称为MBR（master Boot Record，主引导扇区）。


BIOS完成任务后，会将boot.img从硬盘加载到内存的0x7c00来运行。

由于512字节有限，boot.img做不了太多的事情，它能做的最重要的就是在加载grub2的另外一个镜像core.img。


core.img 由 lzma_decompress.img、diskboot.img、kernel.img 和一系列的模块组成，功能比较丰富，能做很多事情。

![image](https://user-images.githubusercontent.com/12036324/65738438-69139f80-e114-11e9-9b1e-cc44f41041ab.png)

- boot.img 先加载的是 core.img 的第一个扇区。如果从硬盘启动的话，这个扇区里面是 diskboot.img，对应的代码是 diskboot.S。
boot.img将控制权交给diskboot.img后，diskboot.img就是将其他部分加载进来，分别是lzma_decompress.img（解压缩程序）和kernel.img（grub2的内核不是linux的内核），最后是各个模块对应的img。

- lzma_decompress.img 对应的代码是 startup_raw.S，本来 kernel.img 是压缩过的，现在执行的时候，需要解压缩。

这个时候我们遇到的程序都是很小的，在实模式下完全可以，但随着我们加载的东西越来越大，实模式的1M就不行了。所以在真正解压缩之前，lzma_decompress.img就是调用*real_to_prot*切换到保护模式，这样就有更多的寻址空间


## 从实模式切换到保护模式

保护模式做的东西大多数与内存有关。

- 启动分段：在内存中建立段描述表，将寄存器里面的段寄存器变为段选择子，指向某个段描述符，这样就能实现不同进程的切换了。
- 启动分页：能够管理的内存变大了，就需要将内存分为相等大小的块
- 打开Gate A20: 启动21往上的地址线（DATA32 call real_to_prot）
- 对压缩过的grub的kernel.img进行解压缩，然后跳转到kernel.img开始运行
kernel.img 对应的代码是 startup.S 以及一堆 c 文件，在 startup.S 中会调用 grub_main，这是 grub kernel 的主函数。

在这个函数里面，grub_load_config() 开始解析，我们上面写的那个 grub.cfg 文件里的配置信息。


如果是正常启动，grub_main最后会调用grub_command_execute (“normal”, 0, 0)，最终会调用 grub_normal_execute() 函数。

在这个函数里面，grub_show_menu()会显示出让你选择的那个操作系统列表。

启动某个操作系统后，就开始调用grub_menu_execute_entry()，开始解析并执行你选择的那一项。

比如里面的linux16命令，表示装载指定的内核文件，并传递内核启动参数。于是通过grub_cmd_linux()函数会被调用，它首先会读取linux内核镜像头部的一些数据结构，放在内存中的数据结构中来，进行检查。如果检查通过则会读取整个linux内核镜像到内存。


如果配置文件里面还有initd命令，用于为即将启动的内核传递init ramdisk路径。于是grub_cmd_initd()函数会被调用，将initramfs加载到内存中。

当这些事情做完，grub_command_execute (“boot”, 0, 0) 才开始真正地启动内核。


## 总结
![image](https://user-images.githubusercontent.com/12036324/65738426-62852800-e114-11e9-9b11-913593429e40.png)

## 问题

grub2 是一个非常牛的 Linux 启动管理器，请你研究一下 grub2 的命令和配置，并试试通过它启动 Ubuntu 和 centOS 两个操作系统。
