# Go程序是如何跑起来的







本文会从Go程序启动的第一行汇编代码分析到我们代码中写的main函数怎么执行的，并在最后介绍一个如何调试Go代码的工具，能让你清晰的看到这个过程。我把启动的过程整理为了一张图， 并且把重点部分做了标记。可以先看一下有个大致印象，后面我们会一步步分析。

![image-20210826100849346](./image-20210826100849346.png)

注⚠️

rt0_amd64和rt0_go汇编代码在`runtime/asm_amd64.s`文件中；

剩下的函数都在`runtime/proc.go`文件中。

## 初始化全局g0

**plan9汇编小加餐（可略过）✊**

<img src="./image-20210826100522570.png" alt="image-20210826100522570" style="zoom:50%;" />

如果你学过intel x86这类汇编的话，知道简单执行的结构是**指令 目标 源**这样的。

比如**MOV EAX 48**的含义是将48放到EAX寄存器上，但是对于plan9却正好相反，结构是**指令 源 目标**，要想把48放到EAX寄存器上，需要写为**MOVQ $48 AX **。

能够看出2⃣️点不同：

1、 MOV后面必须跟长度

2、 没有EAX、RAX这些指令，都是两个字母的AX

记住这些就够用了

------



```asm
MOVQ	$runtime·g0(SB), DI
LEAQ	(-64*1024+104)(SP), BX // BX = -64*1024 + 104 + SP
MOVQ	BX, g_stackguard0(DI)
MOVQ	BX, g_stackguard1(DI)
MOVQ	BX, (g_stack+stack_lo)(DI) // g.stack.lo = BX = -64*1024 + 104 + SP
MOVQ	SP, (g_stack+stack_hi)(DI) // g.stack.hi =  SP
```

要看懂这段代码就必须先说一下runtime.g结构中关于栈的几个字段。

```go
type stack struct {
	lo uintptr
	hi uintptr
}

type g struct {
	stack       stack   // offset known to runtime/cgo
	stackguard0 uintptr // offset known to liblink
	stackguard1 uintptr // offset known to liblink
  // ...
}
```

- `g.stack`表示的是这个goroutine能够使用的内存范围是[lo, hi)。
- stackguard0：Go栈的边界，也提供给抢占式调度用。
- stackguard1： C栈的边界

知道了这些我们再来回过头看一下汇编代码，g0栈的空间一共是64*1024 - 104字节，也就是将近64M。只有main函数的g0的栈才会这么大，普通的goroutine的栈只有2K，后面我们会看到2K怎么来的。

## 得到m0和g0

**runtime获得当前g小加餐（可忽略，但最好看看）**

<img src="./image-20210826100558977.png" alt="image-20210826100558977" style="zoom:50%;" />

如果你看过Go runtime代码的话就会经常看到getg()，但是看这个函数定义的时候却啥也没有：

```go
func getg() *g
```

这个会在编译的时候根据你的平台从不同的地方拿，这里其实就是从tls(thread local storage)中拿的，getg这个函数我们一会儿会大量见到。

------



```asm
get_tls(BX)
LEAQ	runtime·g0(SB), CX  // CX = runtime·g0
MOVQ	CX, g(BX)           
LEAQ	runtime·m0(SB), AX  // AX = runtime·m0

// save m->g0 = g0
MOVQ	CX, m_g0(AX)       // m0.g0 = g0
// save m0 to g0->m
MOVQ	AX, g_m(CX)       // g0.m = m0
```



这个代码没有什么难理解的，就是绑定m0和g0



## runtime·schedinit

**runtime/proc.go注释小加餐（很少，还是看看吧）**

<img src="./image-20210826101800706.png" alt="image-20210826101800706" style="zoom:50%;" />

  ```go
// The bootstrap sequence is:
//
//	call osinit
//	call schedinit
//	make & queue new G
//	call runtime·mstart
//
  ```

上面是启动Go程序的主要四个步骤。

------



```go
func schedinit() {
	// 来了吧。。。。
	_g_ := getg()

	sched.maxmcount = 10000  // 设置最多启动1w个M

	tracebackinit() // 让一些变量的初始化提前
	mallocinit() // 初始化内存管理相关
	// ... 
	itabsinit()     // 初始化iface的全局映射表

	gcinit()

	procs := ncpu
	if procresize(procs) != nil {
		throw("unknown runnable goroutine during bootstrap")
	}

	// ...
}
```

这里面有一系列初始化操作，比较重要的有对于内存管理的初始化（初始化堆以及m上的mcache）和GC的初始化，这都是和runtime密切相关的。

还就是设置P的数量等于CPU 和核心数。

注⚠️：

如果P的数量远大于能使用的核心数，会导致CPU升高进而导致延迟过高，具体分析例子可以看[为什么Go服务容器化之后延迟变高](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/08/docker_golang_app)





## runtime.main

**plan9汇编如何定义变量小加餐（可忽略）**

<img src="./image-20210826100807761.png" alt="image-20210826100807761" style="zoom:50%;" />

定义结构如下：

```asm
DATA 变量名+偏移量(SB)/变量size, 变量值
GLOBL 变量名, 变量模式，长度
```

就按照我们马上会遇到举个例子：

```asm
DATA	runtime·mainPC+0(SB)/8,$runtime·main(SB)
GLOBL	runtime·mainPC(SB),RODATA,$8
```

这个的含义是定义了**变量名**为runtime·mainPC、**变量值**为runtime·main、**变量长度**是8字节、**模式**是只读（RODATA）的一个变量。

------



```go
// create a new goroutine to start program
MOVQ  $runtime·mainPC(SB), AX   // AX = runtime.main
```

我们先来看一下`runtime·mainPC`这个变量的定义：

```asm
DATA	runtime·mainPC+0(SB)/8,$runtime·main(SB)
GLOBL	runtime·mainPC(SB),RODATA,$8
```

这是形如`runtime·mainPC := runtime·main`一个结构。那么我们就来看一下runtime.main这个函数：

```go
func main() {
	g := getg()

	newm(sysmon, nil, -1) // 后台进程
	
  lockOSThread()
	// 只能是m0才能进入这个函数
	if g.m != &m0 {
		throw("runtime.main not on m0")
	}

	gcenable() // 开启GC
	fn := main_main // Go程序定义的main函数
	fn()
	// ...
}
```

runtime.main主要做了下面几个事情：

1、将sysmon这个函数绑定到一个新的M上，但不执行

2、 runtime.main这个g.m是不是m0

3、 开启GC

4、 执行Go程序main包下面的main函数

我们来分别看一下这几个东西

####  1、 将sysmon这个函数绑定到一个新的M上，但不执行

简简单单的`newm(sysmon, nil, -1)`一行调用其实包含了很多东西。第一我们先说一下sysmon的作用：

- 检查死锁
- netpoll：每10ms从（non-blocking）netpoll中拿可运行的goroutine，插入到全局队列
- retake：从20us到10ms，每次sleep double的时间然后去抢占
  - handoffp：如果P的状态是Syscall：唤醒一个新的M执行这个P的认为，让那个M去执行syscall吧



```go
func sysmon() {
	// 检查死锁
	checkdead()

	idle := 0 
	delay := uint32(0)
	for {
		// delay 处理
		usleep(delay)
		now := nanotime()
		next, _ := timeSleepUntil()
		// ...
		if netpollinited() && lastpoll != 0 && lastpoll+10*1000*1000 < now {
			list := netpoll(0) // non-blocking - returns list of goroutines
			if !list.empty() {
				incidlelocked(-1)
        // 插入全局队列
				injectglist(&list)
				incidlelocked(1)
			}
		}
		// 抢占/剥离正在执行syscall的P
		if retake(now) != 0 {
			idle = 0
		} else {
			idle++
		}
	}
}
```

checkdead()这个我们经常遇到，这个就会检查如果你的所有goroutine都在阻塞那么就判断为死锁，比如：

```go
package main

func main() {
	var ch = make(chan int)
	for i := 0 ;i < 2; i++ {
		go func() {
			ch<- 2
		}()
	}
	ch<- 1
}
```

说完了sysmon，我们在看下`newm(fn func(), _p_ *p, id int64) `这个函数的作用就是创建一个M，fn是启动M会执行的方法（在下面我们能看到），将创建出来的M绑定到_p_上，这个M的id，如果传递非-1代表指定ID。

函数的调用关系如下：

```go
newm -> allocm(创建runtime.m这个结构但是没有创建线程) -> mcommoninit
                                                  -> mp.g0 = malg()
     -> newm1 -> newosproc 创建系统线程
```







#### 2、  runtime.main这个g.m是不是m0

这个其实不是用多说只有一个if判断。提醒一下大家main函数通过lockOSThread()将g0绑死到了m0上，所以这个调度也是不用P的。下面还会有地方能和这里呼应。



####  3、 开启GC

```go
func gcenable() {
	c := make(chan int, 2)
	go bgsweep(c)
	go bgscavenge(c)
	<-c
	<-c
}
```

为什么说这个呢，这也解答了为什么我们启动一个go程序，会多好几个goroutine，在下面的工具演示篇，会演示一下。



#### 4、  执行Go程序main包下面的main函数

不知道你有没有这样的一个疑问🤔️，就是Go怎么知道读mian包下面的main函数呢。我们下面main_main的定义就知道的。

```go
//go:linkname main_main main.main
func main_main()
```

这里是讲mian包下面这个私有的mian函数进行的导出，所以如果你改下这个定义：

```go
//go:linkname main_main1 main.main1
func main_main()
```

它就会读你main包下面的mian1函数了



## runtime.main包装为g

```asm
PUSHQ AX                        
PUSHQ $0      // 这两行主要是给提供参数
CALL  runtime·newproc(SB)   // runtime.newproc(0,runtime.main)
```

`newproc(siz int32, fn *funcval)`是创建一个新的G的过程，两个参数分别是栈大小和对应的执行函数。这个函数比较复杂，先通过一张图来梳理一下：

<img src="./image-20210825085537332.png" alt="image-20210825085537332" style="zoom:50%;" />



```go
func newproc(siz int32, fn *funcval) {
	argp := add(unsafe.Pointer(&fn), sys.PtrSize)
	gp := getg()
	pc := getcallerpc()
	systemstack(func() {
		newproc1(fn, argp, siz, gp, pc)
	})
}
```

就是对newproc1简单包装，在来看下newproc1：

```go
func newproc1(fn *funcval, argp unsafe.Pointer, narg int32, callergp *g, callerpc uintptr) {
	_g_ := getg()

	siz := narg
  // 8字节对齐
	siz = (siz + 7) &^ 7

	_p_ := _g_.m.p.ptr()
	newg := gfget(_p_)
	if newg == nil {
    //  malg(stacksize int32) *g 
		newg = malg(_StackMin) // _StackMin = 2018 所以一个g的栈大小是2K
		casgstatus(newg, _Gidle, _Gdead)
	}

	// ... 将p放到执行队列上
	runqput(_p_, newg, true)

}
```

其实看到这里已经足够了。关于`runtime.gfget`就是先从gfree里面拿一些空间放到这个P上，这是减少重新分配内存。

```go
// Get from gfree list.
// If local list is empty, grab a batch from global list.
func gfget(_p_ *p) *g {
retry:
	if _p_.gFree.empty() && (!sched.gFree.stack.empty() || !sched.gFree.noStack.empty()) {
		// 将全局的gfree放到P上
		for _p_.gFree.n < 32 {
      // 
			sched.gFree.n--
			_p_.gFree.push(gp)
			_p_.gFree.n++
		}
		// ...
		goto retry
	}
	gp := _p_.gFree.pop()
	if gp == nil {
		return nil
	}
	_p_.gFree.n--
	// ...
	return gp
}
```

`runtime.malg`是给一个goroutine分配栈空间：

```go
func malg(stacksize int32) *g {
	newg := new(g)
	if stacksize >= 0 {
		stacksize = round2(_StackSystem + stacksize)
		systemstack(func() {
			newg.stack = stackalloc(uint32(stacksize))
		})
    // ...
	}
	return newg
}
```

如果你有兴趣可以继续看`runtime.stackalloc`这个函数实现就是简单的栈空间赋值。

最后是`runtime.runqput`，其作用就是将G放在执行队列上。用几张图描述一下这个过程（在[[含视频]从一个问题看go scheduler执行流程](https://mp.weixin.qq.com/s/0EM9ZTdJgVbgP3Dwfr51bQ)和[Go scheduler这十年](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/08/go_scheduler_history)都对这个过程做了详细讲述，如果有兴趣可以看一下）：

<img src="./image-20210825125929354.png" alt="image-20210825125929354" style="zoom:50%;" />

<img src="./image-20210825130000673.png" alt="image-20210825130000673" style="zoom:50%;" />

<img src="./image-20210825130123906.png" alt="image-20210825130123906" style="zoom:50%;" />

有了图示的过程，看代码几乎不费力了(注释写的也特别好)：

```go
// runqput tries to put g on the local runnable queue.
// If next is false, runqput adds g to the tail of the runnable queue.
// If next is true, runqput puts g in the _p_.runnext slot.
// If the run queue is full, runnext puts g on the global queue.
// Executed only by the owner P.
func runqput(_p_ *p, gp *g, next bool) {

	if next {
	retryNext:
		oldnext := _p_.runnext
		if !_p_.runnext.cas(oldnext, guintptr(unsafe.Pointer(gp))) {
			goto retryNext
		}
		gp = oldnext.ptr()
	}

retry:
	h := atomic.LoadAcq(&_p_.runqhead) 
	t := _p_.runqtail
	if t-h < uint32(len(_p_.runq)) {
		_p_.runq[t%uint32(len(_p_.runq))].set(gp)
		atomic.StoreRel(&_p_.runqtail, t+1) 
		return
	}
  // 全局队列
	if runqputslow(_p_, gp, h, t) {
		return
	}
	goto retry
}
```

至此我们main包的mian函数已经作为g被放到待调度任务里面了。那么下一步就是开启调度循环能让我们的任务跑起来的。

## runtime·mstart

<img src="./image-20210826102854901.png" alt="image-20210826102854901" style="zoom:50%;" />

最好和上面两个连起来看：

```asm
MOVQ  $runtime·mainPC(SB), AX   
PUSHQ AX
PUSHQ $0      // arg size
CALL  runtime·newproc(SB)
POPQ  AX
POPQ  AX

// start this M
CALL  runtime·mstart(SB)
```

看下runtime.mstart：

```go
func mstart() {
	_g_ := getg()
	// ... 省略cgo相关
	_g_.stackguard0 = _g_.stack.lo + _StackGuard
	_g_.stackguard1 = _g_.stackguard0
	mstart1()
	// ...
}
```

做了一些栈操作然后调用了mstart1，再来看下mstart1函数

```go
func mstart1() {
	_g_ := getg()
	if _g_ != _g_.m.g0 {
		throw("bad runtime·mstart")
	}

	// 初始化m0
	minit()

	// 针对m0做一些特殊处理，主要是信号相关
	if _g_.m == &m0 {
		mstartm0()
	}
	// 执行挂在m上的函数
  // newm(fn func(), _p_ *p, id int64)的fn参数就是挂在m.mstartfn上的
	if fn := _g_.m.mstartfn; fn != nil {
		fn()
	}
	
  // 和前面的M0和G0不用P呼应上了。
	if _g_.m != &m0 {
		acquirep(_g_.m.nextp.ptr())
		_g_.m.nextp = 0
	}
  // 启动调度循环
	schedule()
}
```

`_g_.m.mstartfn`还记得前面在runtime.main的时候通过newm创建了个M，对应的mstartfn就是sysmon，我们也能看出，其实sysmon也是不用绑定P就能执行。

我们可以看出这个函数的主要作用是开启调度循环。

<img src="./image-20210825193756701.png" alt="image-20210825193756701" style="zoom:50%;" />



## 如何调试Go程序

因为图片演示太过枯燥，我通过一个视频来演示一下dlv这个工具的全流程。



有了工具的支撑，看Go程序的启动流程就不言自明了，首先通过`dlv debug hello.o`或`dlv exec ./hello`（这两个的区别是一个跟文件一个跟二进制），然后我们就能通过si(step-instruction)就能看到我们上面讲述的起点。后面通过si/s就能进行调试看到启动的整个全貌了。

![image-20210826184344262](./image-20210826184344262.png)



## 总结

至此，我们就分析完了Go启动的流程，这些东西唬唬人绝对够了，但是里面还充斥着很多细节没有展开说，比如：

1、 一个goroutine执行完了或者被强占了是怎么切换到G0的

2、 内存是如何管理的（本文涉及到内存相关都比较概括，因为内存管理的名词实在太多）

3、 。。。



