
[系统调用：公司成立好了就要开始接项目](https://time.geekbang.org/column/article/90394)


## glibc对系统调用的封装
glibc是对系统调用的封装，封装为更加友好的接口。
以glibc如何调用到内核的open为例，我们会在用户态进程里面调用glibc的open函数，定义如下：
```c
int open(const char *pathname, int flags, mode_t mode)
```
在glibc的源码中，有个*syscalls.list*，里面列着所有glibc的函数对应的系统调用，就像下面这个样子：
```c
# File name Caller  Syscall name    Args    Strong name Weak names
open		-	open		Ci:siv	__libc_open __open open
```
另外glibc还有个make-syscall.sh的脚本，可以根据上面的配置文件，对于每一个封装好的系统调用生成一个文件。这个文件里面定义了一些宏，例如#define SYSCALL_NAME open。

glibc还有一个文件syscall-template.S，使用上面这个宏，定义了系统调用的方式：
```s
T_PSEUDO (SYSCALL_SYMBOL, SYSCALL_NAME, SYSCALL_NARGS)
    ret
T_PSEUDO_END (SYSCALL_SYMBOL)

#define T_PSEUDO(SYMBOL, NAME, N)		PSEUDO (SYMBOL, NAME, N)
```
这里PSEUDO也是一个宏，定义如下：
```S
#define PSEUDO(name, syscall_name, args)                      \
  .text;                                      \
  ENTRY (name)                                    \
    DO_CALL (syscall_name, args);                         \
    cmpl $-4095, %eax;                               \
    jae SYSCALL_ERROR_LABEL
```
对于任何一个系统调用，都会调用DO_CALL，但是32位和64位的定义还是不一样的。


## 32位系统调用过程
我们先来看 32 位的情况（i386 目录下的 sysdep.h 文件）。
```S
/* Linux takes system call arguments in registers:
	syscall number	%eax	     call-clobbered
	arg 1		%ebx	     call-saved
	arg 2		%ecx	     call-clobbered
	arg 3		%edx	     call-clobbered
	arg 4		%esi	     call-saved
	arg 5		%edi	     call-saved
	arg 6		%ebp	     call-saved
......
*/
#define DO_CALL(syscall_name, args)                           \
    PUSHARGS_##args                               \
    DOARGS_##args                                 \
    movl $SYS_ify (syscall_name), %eax;                          \
    ENTER_KERNEL                                  \
    POPARGS_##args
```
这里将请求参数放在寄存器里面，根据系统调用名称得到系统调用号，放在寄存器eax里面，然后执行ENTER_KERNEL。
```S
# define ENTER_KERNEL int $0x80
```
ENTER_KERNEL是一个中断，*int $0x80*就是触发一个软中断，通过他就可以陷入（trap）内核。
在内核启动的时候，有个trap_init()启动有下面的代码：
```c
set_system_intr_gate(IA32_SYSCALL_VECTOR, entry_INT80_32);
```
这是一个软中断陷入门。当接收到一个系统调用的时候，entry_INT80_32就被调用了。
```S
ENTRY(entry_INT80_32)
        ASM_CLAC
        pushl   %eax                    /* pt_regs->orig_ax */
        SAVE_ALL pt_regs_ax=$-ENOSYS    /* save rest */
        movl    %esp, %eax
        call    do_syscall_32_irqs_on
.Lsyscall_32_done:
......
.Lirq_return:
	INTERRUPT_RETURN
```
通过push和SAVE_ALL将当前用户态的寄存器保存在pt_reg结构里面。
进入内核之前保存所有寄存器，然后调用do_syscall_32_irqs_on，实现如下：
```c
static __always_inline void do_syscall_32_irqs_on(struct pt_regs *regs)
{
	struct thread_info *ti = current_thread_info();
	unsigned int nr = (unsigned int)regs->orig_ax;
......
	if (likely(nr < IA32_NR_syscalls)) {
		regs->ax = ia32_sys_call_table[nr](
			(unsigned int)regs->bx, (unsigned int)regs->cx,
			(unsigned int)regs->dx, (unsigned int)regs->si,
			(unsigned int)regs->di, (unsigned int)regs->bp);
	}
	syscall_return_slowpath(regs);
}
```
在这里，我们看到，将系统调用号从 eax 里面取出来，然后根据系统调用号，在系统调用表中找到相应的函数进行调用，并将寄存器中保存的参数取出来，作为函数参数。如果仔细比对，就能发现，这些参数所对应的寄存器，和 Linux 的注释是一样的。

根据宏定义#define ia32_sys_call_table sys_call_table，系统调用就是放在这个表里面的。

当系统调用结束之后，在 entry_INT80_32 之后，紧接着调用的是 INTERRUPT_RETURN，我们能够找到它的定义，也就是 iret。
```c
#define INTERRUPT_RETURN                iret
```
iret指令将原来的用户态保存的现场恢复回来，包含代码段，指令指针寄存器。这时候用户态进程恢复执行，

下图是32位系统调用的执行过程

![image](https://user-images.githubusercontent.com/12036324/65825345-7f526480-e2a8-11e9-9783-513e542243e4.png)

## 64位系统调用过程
我们再来看 64 位的情况（x86_64 下的 sysdep.h 文件）。
```c
/* The Linux/x86-64 kernel expects the system call parameters in
   registers according to the following table:
    syscall number	rax
    arg 1		rdi
    arg 2		rsi
    arg 3		rdx
    arg 4		r10
    arg 5		r8
    arg 6		r9
......
*/
#define DO_CALL(syscall_name, args)					      \
  lea SYS_ify (syscall_name), %rax;					      \
  syscall
```
在64位中真正进行调用的就不是中断了，而是改为了syscall指令。

syscall指令还使用了特殊的寄存器，叫特殊模块寄存器（Model Specific Registers， MSR）。这种寄存器是CPU为了完成某些特殊功能为目的的寄存器，其中就有系统调用。

在系统初始化的时候，trap_init除了初始化上面的中断模式，这里面还会调用cpu_init->syscall_init，这里面有下面的代码：
```c
wrmsrl(MSR_LSTAR, (unsigned long)entry_SYSCALL_64);
```
*rdmsr*和*wrmsr*是用来读写特殊模块寄存器。MSR_LSTAR就是这样一个特殊的寄存器，当syscall指令调用的时候，会从这个寄存器里面拿出函数地址来调用，也就是调用entry_SYSCALL_64。

在 arch/x86/entry/entry_64.S 中定义了 entry_SYSCALL_64。


```c
ENTRY(entry_SYSCALL_64)
        /* Construct struct pt_regs on stack */
        pushq   $__USER_DS                      /* pt_regs->ss */
        pushq   PER_CPU_VAR(rsp_scratch)        /* pt_regs->sp */
        pushq   %r11                            /* pt_regs->flags */
        pushq   $__USER_CS                      /* pt_regs->cs */
        pushq   %rcx                            /* pt_regs->ip */
        pushq   %rax                            /* pt_regs->orig_ax */
        pushq   %rdi                            /* pt_regs->di */
        pushq   %rsi                            /* pt_regs->si */
        pushq   %rdx                            /* pt_regs->dx */
        pushq   %rcx                            /* pt_regs->cx */
        pushq   $-ENOSYS                        /* pt_regs->ax */
        pushq   %r8                             /* pt_regs->r8 */
        pushq   %r9                             /* pt_regs->r9 */
        pushq   %r10                            /* pt_regs->r10 */
        pushq   %r11                            /* pt_regs->r11 */
        sub     $(6*8), %rsp                    /* pt_regs->bp, bx, r12-15 not saved */
        movq    PER_CPU_VAR(current_task), %r11
        testl   $_TIF_WORK_SYSCALL_ENTRY|_TIF_ALLWORK_MASK, TASK_TI_flags(%r11)
        jnz     entry_SYSCALL64_slow_path
......
entry_SYSCALL64_slow_path:
        /* IRQs are off. */
        SAVE_EXTRA_REGS
        movq    %rsp, %rdi
        call    do_syscall_64           /* returns with IRQs disabled */
return_from_SYSCALL_64:
	RESTORE_EXTRA_REGS
	TRACE_IRQS_IRETQ
	movq	RCX(%rsp), %rcx
	movq	RIP(%rsp), %r11
    movq	R11(%rsp), %r11
......
syscall_return_via_sysret:
	/* rcx and r11 are already restored (see code above) */
	RESTORE_C_REGS_EXCEPT_RCX_R11
	movq	RSP(%rsp), %rsp
	USERGS_SYSRET64
```
这里先保存了很多寄存器到 pt_regs 结构里面，例如用户态的代码段、数据段、保存参数的寄存器，然后调用 entry_SYSCALL64_slow_pat->do_syscall_64。

```c
__visible void do_syscall_64(struct pt_regs *regs)
{
        struct thread_info *ti = current_thread_info();
        unsigned long nr = regs->orig_ax;
......
        if (likely((nr & __SYSCALL_MASK) < NR_syscalls)) {
                regs->ax = sys_call_table[nr & __SYSCALL_MASK](
                        regs->di, regs->si, regs->dx,
                        regs->r10, regs->r8, regs->r9);
        }
        syscall_return_slowpath(regs);
}
```
在 do_syscall_64 里面，从 rax 里面拿出系统调用号，然后根据系统调用号，在系统调用表 sys_call_table 中找到相应的函数进行调用，并将寄存器中保存的参数取出来，作为函数参数。如果仔细比对，你就能发现，这些参数所对应的寄存器，和 Linux 的注释又是一样的。


所以，无论是 32 位，还是 64 位，都会到系统调用表 sys_call_table 这里来。

在研究系统调用表之前，我们看 64 位的系统调用返回的时候，执行的是 USERGS_SYSRET64。定义如下：
```c
#define USERGS_SYSRET64				\
	swapgs;					\
	sysretq;
```
这里，返回用户态的指令变成了 sysretq。

![image](https://user-images.githubusercontent.com/12036324/65825342-75c8fc80-e2a8-11e9-9f7a-5697890e512c.png)
## 系统调用表

下面是说sys_call_table是怎么形成的。

32位系统调用表定义在*arch/x86/entry/syscalls/syscall_32.tbl*。例如open是下面定义的：
```c
5	i386	open			sys_open  compat_sys_open
```
64 位的系统调用定义在另一个文件 arch/x86/entry/syscalls/syscall_64.tbl 里。例如 open 是这样定义的：
```c
2	common	open			sys_open
```
- 第一列是系统调用号（我们可以看出32位和64还是不一样的）
- 第三列是系统调用的名字
- 第四列是系统调用在内核的实现函数（都以sys_开头）

系统调用在内核中的实现函数要有一个声明。声明往往在 include/linux/syscalls.h 文件中。例如 sys_open 是这样声明的：
```c
asmlinkage long sys_open(const char __user *filename,
                                int flags, umode_t mode);
```
真正的实现这个系统调用，一般在一个.c 文件里面，例如 sys_open 的实现在 fs/open.c 里面，但是你会发现样子很奇怪。
```c
SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
        if (force_o_largefile())
                flags |= O_LARGEFILE;
        return do_sys_open(AT_FDCWD, filename, flags, mode);
}
```
SYSCALL_DEFINE3 是一个宏系统调用最多六个参数，根据参数的数目选择宏。具体是这样定义的：
```c
#define SYSCALL_DEFINE1(name, ...) SYSCALL_DEFINEx(1, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE2(name, ...) SYSCALL_DEFINEx(2, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE3(name, ...) SYSCALL_DEFINEx(3, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE4(name, ...) SYSCALL_DEFINEx(4, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE5(name, ...) SYSCALL_DEFINEx(5, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE6(name, ...) SYSCALL_DEFINEx(6, _##name, __VA_ARGS__)


#define SYSCALL_DEFINEx(x, sname, ...)                          \
        SYSCALL_METADATA(sname, x, __VA_ARGS__)                 \
        __SYSCALL_DEFINEx(x, sname, __VA_ARGS__)


#define __PROTECT(...) asmlinkage_protect(__VA_ARGS__)
#define __SYSCALL_DEFINEx(x, name, ...)                                 \
        asmlinkage long sys##name(__MAP(x,__SC_DECL,__VA_ARGS__))       \
                __attribute__((alias(__stringify(SyS##name))));         \
        static inline long SYSC##name(__MAP(x,__SC_DECL,__VA_ARGS__));  \
        asmlinkage long SyS##name(__MAP(x,__SC_LONG,__VA_ARGS__));      \
        asmlinkage long SyS##name(__MAP(x,__SC_LONG,__VA_ARGS__))       \
        {                                                               \
                long ret = SYSC##name(__MAP(x,__SC_CAST,__VA_ARGS__));  \
                __MAP(x,__SC_TEST,__VA_ARGS__);                         \
                __PROTECT(x, ret,__MAP(x,__SC_ARGS,__VA_ARGS__));       \
                return ret;                                             \
        }                                                               \
        static inline long SYSC##name(__MAP(x,__SC_DECL,__VA_ARGS__)
```
我们把宏展开之后，实现如下：
```c
asmlinkage long sys_open(const char __user * filename, int flags, int mode)
{
 long ret;


 if (force_o_largefile())
  flags |= O_LARGEFILE;


 ret = do_sys_open(AT_FDCWD, filename, flags, mode);
 asmlinkage_protect(3, ret, filename, flags, mode);
 return ret;
```
声明和实现都好了。接下来，在编译的过程中，需要根据 syscall_32.tbl 和 syscall_64.tbl 生成自己的 unistd_32.h 和 unistd_64.h。生成方式在 arch/x86/entry/syscalls/Makefile 中。

这里面会用到两个脚本：
- arch/x86/entry/syscalls/syscallhdr.sh: 会在文件中生成#define __NR_open
- arch/x86/entry/syscalls/syscalltbl.sh: 会在文件中生成__SYSCALL__(__NR_open, sys_open)
unistd_32.h 和 unistd_64.h 是对应的系统调用号和系统调用实现函数之间的对应关系。


在文件 arch/x86/entry/syscall_32.c，定义了这样一个表，里面 include 了这个头文件，从而所有的 sys_ 系统调用都在这个表里面了。
```c
__visible const sys_call_ptr_t ia32_sys_call_table[__NR_syscall_compat_max+1] = {
        /*
         * Smells like a compiler bug -- it doesn't work
         * when the & below is removed.
         */
        [0 ... __NR_syscall_compat_max] = &sys_ni_syscall,
#include <asm/syscalls_32.h>
};
```
同理，在文件 arch/x86/entry/syscall_64.c，定义了这样一个表，里面 include 了这个头文件，这样所有的 sys_ 系统调用就都在这个表里面了。
```c
/* System call table for x86-64. */
asmlinkage const sys_call_ptr_t sys_call_table[__NR_syscall_max+1] = {
	/*
	 * Smells like a compiler bug -- it doesn't work
	 * when the & below is removed.
	 */
	[0 ... __NR_syscall_max] = &sys_ni_syscall,
#include <asm/syscalls_64.h>
};
```

## 总结
![image](https://user-images.githubusercontent.com/12036324/65825297-ec192f00-e2a7-11e9-8e2c-5113c601c98d.png)

## 问题
请你根据这一节的分析，看一下与 open 这个系统调用相关的文件都有哪些，在每个文件里面都做了什么？如果你要自己实现一个系统调用，能不能照着 open 来一个呢？
