[内核初始化：生意做大了就得成立公司](https://time.geekbang.org/column/article/90109)

内核的启动从入口函数*start_kernel()*开始。在init/main.c文件中，start_kernel相当于内核的main函数，这个函数里面有各种个样的init。

![image](https://user-images.githubusercontent.com/12036324/65810900-57e59400-e1e3-11e9-82cc-a465c2ae4582.png)


## 初始化

### 1. 初始化进程列表
在操作系统里面有个创始进程，他是唯一一个没有经过*fork*或者*kernel_thread*创建的进程。

通过指令*set_task_stack_end_magic(&init_task)*,参数*init_task*是个*task_struct*类型（struct task_struct init_task = INIT_TASK(init_task)）创建，我们称之为0号进程。

0号进程就进程列表的列表头，启动完1号进程和2号进程就没啥作用了。

### 2. 初始化中断trap_init()
这个函数里面设置了很多中断门，用于处理各种中断。比如：*set_system_intr_gate(IA32_SYSCALL_VECROT, entry_INT80_32)*就是一个中断门，系统调用也是通过中断触发的。


### 3. 初始化内存模块mm_init()

无更多内容

### 4. 初始化调度模块sched_init()
无更多内容

### 5. 初始化基于内存的rootfs
vfs_caches_init()会用来初始化基于内存的rootfs。在这个函数里面会调用*mnt_init() -> init_rootfs()*，这里面通过register_filesystem(&root_fs_type)在虚拟文件系统里面注册一种类型，我们定义为*struct file_system_type rootfs_fs_fstype*

为了兼容各式各样的文件系统，我们需要将文件的相关数据结构和操作抽象出来，形成一个抽象层对上层提供统一的接口，这个抽象层就是VFS。

![image](https://user-images.githubusercontent.com/12036324/65810896-5025ef80-e1e3-11e9-99d3-68e9573bffb0.png)

最后*start_kernel()*调用*rest_init*，用来做其他方面的初始化。


## 初始化1号进程

*rest_init()*通过*kernel_thread(kernel_init, NULL, CLONE_FS)*创建所有用户态进程的祖先，也称为1号进程。

x86 提供了分层的权限机制，把区域分成了四个 Ring，越往里权限越高，越往外权限越低。
![image](https://user-images.githubusercontent.com/12036324/65810890-3edce300-e1e3-11e9-812d-e37ec246aa04.png)

Linux很好的使用了这个机制，把能访问关键资源的代码放在了Ring0，称为内核态，普通程序代码放在了Ring3，被称为用户态。


当一个用户态的程序运行到一半，要访问一个核心资源，例如访问网卡发一个网络包，就需要暂停当前的运行，调用系统调用，接下来就轮到内核中的代码运行了。


首先，内核将从系统调用传过来的包，在网卡上排队，轮到的时候就发送。发送完了，系统调用就结束了，返回用户态，让暂停运行的程序接着运行。

暂停的那一刻，要把当时 CPU 的寄存器的值全部暂存到一个地方，这个地方可以放在进程管理系统很容易获取的地方。在后面讨论进程管理数据结构的时候，我们还会详细讲。当系统调用完毕，返回的时候，再从这个地方将寄存器的值恢复回去，就能接着运行了。
![image](https://user-images.githubusercontent.com/12036324/65810888-37b5d500-e1e3-11e9-9cc9-93289f1311ca.png)

这个过程就是这样的：用户态 - 系统调用 - 保存寄存器 - 内核态执行系统调用 - 恢复寄存器 - 返回用户态，然后接着运行。
![image](https://user-images.githubusercontent.com/12036324/65810884-210f7e00-e1e3-11e9-9150-a2130be23c27.png)
## 从内核态到用户态

但是我们在通过*kernel_thread()*创建1号进程的时候我们还在内核态，那么又怎么从内核态到用户态呢。


*kernel_thread*的第一个参数是*kernel_init*，进程会运行这个函数，在*kernel_init*中，会调用*kernel_init_freeable()*，里面又这样的代码：
```c
if (!ramdisk_execute_command)
		ramdisk_execute_command = "/init";
```
先不管 ramdisk 是啥，我们回到 kernel_init 里面。这里面有这样的代码块：
```c
	if (ramdisk_execute_command) {
		ret = run_init_process(ramdisk_execute_command);
......
	}
......
	if (!try_to_run_init_process("/sbin/init") ||
	    !try_to_run_init_process("/etc/init") ||
	    !try_to_run_init_process("/bin/init") ||
	    !try_to_run_init_process("/bin/sh"))
		return 0;

```
这就说明，1 号进程运行的是一个文件。如果我们打开 run_init_process 函数，会发现它调用的是 do_execve。
```c
static int run_init_process(const char *init_filename)
{
	argv_init[0] = init_filename;
	return do_execve(getname_kernel(init_filename),
		(const char __user *const __user *)argv_init,
		(const char __user *const __user *)envp_init);
}
```
execve 是一个系统调用，它的作用是运行一个执行文件。加一个 do_ 的往往是内核系统调用的实现。没错，这就是一个系统调用，它会尝试运行 ramdisk 的“/init”，或者普通文件系统上的“/sbin/init”“/etc/init”“/bin/init”“/bin/sh”。不同版本的 Linux 会选择不同的文件启动，但是只要有一个起来了就可以

而咱们刚才运行 init，是调用 do_execve，正是上面的过程的后半部分，从内核态执行系统调用开始.


do_execve->do_execveat_common->exec_binprm->search_binary_handler，这里面会调用这段内容：

```c
int search_binary_handler(struct linux_binprm *bprm)
{
  ......
  struct linux_binfmt *fmt;
  ......
  retval = fmt->load_binary(bprm);
  ......
}

```
我们要运行这个程序要加载一个ELF文件。定义如下：

```c
static struct linux_binfmt elf_format = {
.module	= THIS_MODULE,
.load_binary	= load_elf_binary,
.load_shlib	= load_elf_library,
.core_dump	= elf_core_dump,
.min_coredump	= ELF_EXEC_PAGESIZE,
};

```
这其实就是先调用 load_elf_binary，最后调用 start_thread。
```c
void
start_thread(struct pt_regs *regs, unsigned long new_ip, unsigned long new_sp)
{
set_user_gs(regs, 0);
regs->fs	= 0;
regs->ds	= __USER_DS;
regs->es	= __USER_DS;
regs->ss	= __USER_DS;
regs->cs	= __USER_CS;
regs->ip	= new_ip;
regs->sp	= new_sp;
regs->flags	= X86_EFLAGS_IF;
force_iret();
}
EXPORT_SYMBOL_GPL(start_thread);
```
这个结构就是在系统调用时，内核中保存用户态的上下文，里面将用户态的CS设置为*_USER_CS*，将用户态的DS设置为*_USER_DS*，以及指令指针寄存器IP，栈指针寄存器SP。这就相当于补上了以前系统调用中，保存寄存器的一个步骤。


最后的 iret 是干什么的呢？它是用于从系统调用中返回。这个时候会恢复寄存器。从哪里恢复呢？按说是从进入系统调用的时候，保存的寄存器里面拿出。好在上面的函数补上了寄存器。CS 和指令指针寄存器 IP 恢复了，指向用户态下一个要执行的语句。DS 和函数栈指针 SP 也被恢复了，指向用户态函数栈的栈顶。所以，下一条指令，就从用户态开始运行了。


## ramdisk的作用

在内核启动的时候会配置下面的这个参数：
```shell
initrd16 /boot/initramfs-3.10.0-862.el7.x86_64.img
```
这是一个基于内存的文件系统。

因为刚才1号进程的init程序是在文件系统上的，文件系统一定是存储设备上的，存储设备是要驱动才能访问的。如果驱动数量有限，可以放在内核里面（启动的时候已经把内核加载到内存中），但是数量太多就不行了。


所以我们搞一个基于内存的文件系统，内存访问是不需要驱动的，这个就是ramdisk，ramdisk是根文件系统。

然后运行ramdisk上的/init。运行之后就已经在用户态了，/init会根据存储系统的类型加载驱动，有了驱动就可以设置真正的根文件系统了。有了真正的根文件系统，ramdisk上的/init会启动文件系统的上的/init。



## 创建2号进程
通过kernel_thread(kthreadd, NULL, CLONE_FS | CLONE_FILES) 又一次使用 kernel_thread 函数创建内核态的祖先进程。


## 总结
内核初始化过程：
- 初始化
- 创建用户态祖先进程
- 创建内核态祖先进程
![image](https://user-images.githubusercontent.com/12036324/65810880-194fd980-e1e3-11e9-86f0-967a87d4eed9.png)

## 总结
这一节，我们看到内核创建了一些进程，这些进程都是放在一个列表中的，请你研读内核代码，看看这个列表是如何实现的。
