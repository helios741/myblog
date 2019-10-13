[进程数据结构（下）：项目多了就需要项目管理系统](https://time.geekbang.org/column/article/93014)

如何将用户态和内核态串起来，就要用下面两个变量：
```c
struct thread_info		thread_info;
void  *stack;
```

## 用户态函数栈

### 32位

![image](https://user-images.githubusercontent.com/12036324/64964475-b9496100-d8cd-11e9-843c-c676e7a5a675.png)

- ESP（Extend Stack Pointer）是栈顶指针寄存器（出入栈会调整这个）
- EBP（Extend Base Pointer）栈基地址寄存器，指向当前栈帧的最底部

A调用B的时候

A的栈帧包含：
1. A的局部变量
2. 调用B的参数
3. 返回A的地址，这个地址也入栈
B的栈帧包含：
1. A的栈底位置（EBP），要通过这个指针获取A传递过来的参数
2. B的局部变量

B返回的时候：
1. 返回值保存在EAX寄存器里面
2. 从栈中返回地址
3. 将指针跳转回去
4. 参数也从栈中弹出
5. 继续执行A


### 64位

![image](https://user-images.githubusercontent.com/12036324/64964490-bd757e80-d8cd-11e9-9206-c2404f5d1f44.png)

64位OS寄存器的数目比较多，模式有点不一样。
- rax：用于保存函数调用的结果。
- rsp：栈顶指针寄存器
- rbp：栈基地址寄存器


改变比较多的是参数传递。rdi、rsi、rdx、rcx、r8、r9 这 6 个寄存器，用于传递存储函数调用时的 6 个参数。如果超过 6 的时候，还是需要放到栈里面。


以上的栈操作，都是在进程的内存空间中进行的。


## 内核态函数栈

linux给每个task都分配的函数栈，32位定义在`arch/x86/include/asm/page_32_types.h`,是这样定义的：一个PAGE_SIZE是4K。

```c
#define THREAD_SIZE_ORDER	1
#define THREAD_SIZE		(PAGE_SIZE << THREAD_SIZE_ORDER)
```

64位定义在`arch/x86/include/asm/page_64_types.h`上，要求在PAGE_SIZE的基础上左移两位，并且要求起始地址必须是8192的整数倍。
```c
#ifdef CONFIG_KASAN
#define KASAN_STACK_ORDER 1
#else
#define KASAN_STACK_ORDER 0
#endif


#define THREAD_SIZE_ORDER	(2 + KASAN_STACK_ORDER)
#define THREAD_SIZE  (PAGE_SIZE << THREAD_SIZE_ORDER)
```

内核栈如下图：


![image](https://user-images.githubusercontent.com/12036324/64964496-c23a3280-d8cd-11e9-90a7-b7361f479615.png)
内核栈分为三部分：
- 这段空间的最低位置是一个*thread_info*的结构，这个结构是task_struct的补充（因为task_struct结构庞大通用，不同体系就要保存不同的东西）
- 内核代码中有个union，吧thread_info和stack放在一起，在`include/linux/sched.h`文件中就有：
```c
union thread_union {
#ifndef CONFIG_THREAD_INFO_IN_TASK
	struct thread_info thread_info;
#endif
	unsigned long stack[THREAD_SIZE/sizeof(long)];
};
```
- 在内核栈的最高地址端，存放的是pt_regs定义如下（32位和64位不一样）：
```c
#ifdef __i386__
struct pt_regs {
	unsigned long bx;
	unsigned long cx;
	unsigned long dx;
	unsigned long si;
	unsigned long di;
	unsigned long bp;
	unsigned long ax;
	unsigned long ds;
	unsigned long es;
	unsigned long fs;
	unsigned long gs;
	unsigned long orig_ax;
	unsigned long ip;
	unsigned long cs;
	unsigned long flags;
	unsigned long sp;
	unsigned long ss;
};
#else
struct pt_regs {
	unsigned long r15;
	unsigned long r14;
	unsigned long r13;
	unsigned long r12;
	unsigned long bp;
	unsigned long bx;
	unsigned long r11;
	unsigned long r10;
	unsigned long r9;
	unsigned long r8;
	unsigned long ax;
	unsigned long cx;
	unsigned long dx;
	unsigned long si;
	unsigned long di;
	unsigned long orig_ax;
	unsigned long ip;
	unsigned long cs;
	unsigned long flags;
	unsigned long sp;
	unsigned long ss;
/* top of stack page */
};
#endif
```

当通过系统调用从用户态到内核态的时候，做的第一件事就是将用户态运行的CPU上下文保存起来，其中主要是保存在这个结构的寄存器变量里。这样从内核态返回的时候，才能让进程在刚才的地方继续运行。


## 通过task_struct找内核栈

如果知道task_struct的stack指针就能通过下面的函数找到这个线程内核栈：
```c
static inline void *task_stack_page(const struct task_struct *task)
{
	return task->stack;
}
```

从task_struct如何找到pt_regs呢，可以通过下面的函数：
```c
/*
 * TOP_OF_KERNEL_STACK_PADDING reserves 8 bytes on top of the ring0 stack.
 * This is necessary to guarantee that the entire "struct pt_regs"
 * is accessible even if the CPU haven't stored the SS/ESP registers
 * on the stack (interrupt gate does not save these registers
 * when switching to the same priv ring).
 * Therefore beware: accessing the ss/esp fields of the
 * "struct pt_regs" is possible, but they may contain the
 * completely wrong values.
 */
#define task_pt_regs(task) \
({									\
	unsigned long __ptr = (unsigned long)task_stack_page(task);	\
	__ptr += THREAD_SIZE - TOP_OF_KERNEL_STACK_PADDING;		\
	((struct pt_regs *)__ptr) - 1;					\
})
```
1. 从task_struct找到内核的栈的开始位置
2. 加上THREAD_SIZE就到了最后的位置
3. 转换为struct pt_regs
4. 再减一，就相当于少了一个pt_regs的位置，就得到了这个结构的首地址

这里面有一个 TOP_OF_KERNEL_STACK_PADDING，这个的定义如下：
```c
#ifdef CONFIG_X86_32
# ifdef CONFIG_VM86
#  define TOP_OF_KERNEL_STACK_PADDING 16
# else
#  define TOP_OF_KERNEL_STACK_PADDING 8
# endif
#else
# define TOP_OF_KERNEL_STACK_PADDING 0
#endif
```
也就是说，在32位机器上是8，其他地方是0，因为压栈pt_regs有两种情况（CPU通过ring来区分权限，从而Linux可以分为用户态和内核态）：
- 用户态 -> 内核态涉及到权限的变化：会压栈SS，ESP寄存器，这两个寄存器共占用8byte
- 用户态 -> 内核态不涉及到权限的变化：如果没有压栈就会报错，所以把这8个byte预留在这里保证安全

注：
64位变为了定长就修改了这个问题。


## 通过内核栈找到task_struct


## 32位

看thread_info这个结构：
```c
struct thread_info {
	struct task_struct	*task;		/* main task structure */
	__u32			flags;		/* low level flags */
	__u32			status;		/* thread synchronous flags */
	__u32			cpu;		/* current CPU */
	mm_segment_t		addr_limit;
	unsigned int		sig_on_uaccess_error:1;
	unsigned int		uaccess_err:1;	/* uaccess failed */
};
```
这里面有个成员变量task指向task_struct，所以我们通常需要current_thread_info() -> task 来获取task_struct：

```c
static inline struct thread_info *current_thread_info(void)
{
	return (struct thread_info *)(current_top_of_stack() - THREAD_SIZE);
}
```

thread_info的位置就是内核栈的最高位置，减去THREAD_SIZE就到了thread_info的其实地址。

## 64位

就变为下面这一个flags了：
```c
struct thread_info {
        unsigned long           flags;          /* low level flags */
};
```

在 include/linux/thread_info.h 中定义了 current_thread_info。
```c
#include <asm/current.h>
#define current_thread_info() ((struct thread_info *)current)
#endif
```
那 current 又是什么呢？在 arch/x86/include/asm/current.h 中定义了。

```c
struct task_struct;


DECLARE_PER_CPU(struct task_struct *, current_task);


static __always_inline struct task_struct *get_current(void)
{
	return this_cpu_read_stable(current_task);
}


#define current get_current
```
现在我们发现，每个CPU的task_struct不通过thread_info获取了，而是直接放在Per CPU变量里面了。


要使用 Per CPU 变量，首先要声明这个变量，在 arch/x86/include/asm/current.h 中有：
```c
DECLARE_PER_CPU(struct task_struct *, current_task);
```
然后是定义这个变量，在 arch/x86/kernel/cpu/common.c 中有：
```c
DEFINE_PER_CPU(struct task_struct *, current_task) = &init_task;
```
也就是说系统初始化的时候，current_task都是指向的init_task。



当某个 CPU 上的进程进行切换的时候，current_task 被修改为将要切换到的目标进程。例如，进程切换函数 __switch_to 就会改变 current_task。

```c
__visible __notrace_funcgraph struct task_struct *
__switch_to(struct task_struct *prev_p, struct task_struct *next_p)
{
......
this_cpu_write(current_task, next_p);
......
return prev_p;
}
```
当要获取当前的运行中的 task_struct 的时候，就需要调用 this_cpu_read_stable 进行读取。

```c
#define this_cpu_read_stable(var)       percpu_stable_op("mov", var)
```


## 总结

下图左边是32为，右边是64位：

![image](https://user-images.githubusercontent.com/12036324/64964559-e39b1e80-d8cd-11e9-83a6-e3d0c0a76f43.png)


- 在用户态，应用程序进行了至少一次函数调用。32 位和 64 的传递参数的方式稍有不同，32 位的就是用函数栈，64 位的前 6 个参数用寄存器，其他的用函数栈。
- 在内核态，32 位和 64 位都使用内核栈，格式也稍有不同，主要集中在 pt_regs 结构上。
- 在内核态，32 位和 64 位的内核栈和 task_struct 的关联关系不同。32 位主要靠 thread_info，64 位主要靠 Per-CPU 变量。



## 问题

这一节讲函数调用的时候，我们讲了函数栈的工作模式。请你写一个程序，然后编译为汇编语言，打开看一下，函数栈是如何起作用的。
