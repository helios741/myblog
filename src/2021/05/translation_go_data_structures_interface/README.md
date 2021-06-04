# [译]go 数据结构：interface

原文链接：[Go Data Structures: Interfaces](https://research.swtch.com/interfaces)

go的interface既能在编译的时候进行静态检查又能在运行时进行动态类型转换，从语言设计角度这是Go最令人兴奋的部分。如果我将go的一部分特性迁移到其他语言，那么一定是interface。

这篇文章是我对“gc”编译器中接口值实现的一些想法。Ian Lance Taylor写过[两篇](https://research.swtch.com/interfaces)gccgo的接口值实现。关于接口值的实现很多种：最大的不同就是这篇文章有图。

在看interface如何实现之前，让我们看看interface的用法。

## 使用

go的interface能让你享受动态语言（如python）[duck typing](https://en.wikipedia.org/wiki/Duck_typing)的同时也能享受编译器带来静态检查的好处。比如下面的两种方式是不会通过编译的：

1、 形参需要带有Read的对象但是你传递int

2、 传递给Read方法错误数量的参数

为了使用interface，首先就需要定义interface类型（以ReadCloser为例）：

```go
type ReadCloser interface {
    Read(b []byte) (n int, err os.Error)
    Close()
}
```

定义一个函数让ReadCloser作为参数类型，这个参数需要调用Read请求数据，请求完了进行关闭（Close）。

```go
func ReadAndClose(r ReadCloser, buf []byte) (n int, err os.Error) {
    for len(buf) > 0 && err == nil {
        var nr int
        nr, err = r.Read(buf)
        n += nr
        buf = buf[nr:]
    }
    r.Close()
    return
}
```

只要正确实现了Read和Close就能调用ReadAndClose。如果传递错误参数不会像python那样在运行时候才报错，go在编译阶段就会报错。

当然interface并不限于静态检查。你能动态的检查一个interface是否实现了某个方法，比如：

```go
type Stringer interface {
    String() string
}

func ToString(any interface{}) string {
    if v, ok := any.(Stringer); ok {
        return v.String()
    }
    switch v := any.(type) {
    case int:
        return strconv.Itoa(v)
    case float:
        return strconv.Ftoa(v, 'g', -1)
    }
    return "???"
}
```

上面代码中any的类型是interface{}，这并不保证它有任意方法，即它可以是任意类型但并不是任意类型。if语句中的“comma ok”语法判断能否将any转换为Stringer的interface。如果可以那么就调用String()方法并返回string。否则进入下面的switch对一些基本类型进行判断。这可以说是[fmt包](https://golang.org/pkg/fmt/)的简单版实现。(代码开头的if也是能放在case里面的，这里为了引起你的注意放在了开头)。

下面是一个简单的例子，一个带输出其二进制的String方法和一个简单的Get方法的uint类型。

```go
type Binary uint64

func (i Binary) String() string {
    return strconv.Uitob64(i.Get(), 2)
}

func (i Binary) Get() uint64 {
    return uint64(i)
}
```

Binary类型能够传递给ToString（使用其String方法进行格式化），尽管程序从来没有说明Binary实现了Stringer。没有必要去显式的声明Stringer，runtime能够主动识别出来，尽管可能Binary的作者都不知道Stringer的存在。



这个例子展示了尽管在编译阶段会检查隐式类型转换，在运行阶段查询一个interface是否满足另一个interface上所有方法的显式转换也是被允许的。“[Effective Go](http://golang.org/doc/effective_go.html#interfaces)”有更多关于interface的细节和例子。



## interface Values

有方法的语言分别两个阵营：

1、 准备好所有方法的静态映射表。比如c++、java

2、 每次调用方法的时候去查找，当然也包含各种缓存。比如Smalltalk及模仿者、javascript以及python

go处在两者之间：既包含方法映射表又是在运行的时候去查找。我不知道go是不是第一个用这项技术的，因为这不是个通用的方法。

Binary类型的值是由两个32位的字组成的64位整数（和[上一篇](https://research.swtch.com/godata)类似, 我们假设使用的是32位机器，内存增长从向右变为向下）。

![img](http://research.swtch.com/gointer1.png)

interface值包含两个字：一个字指向存储在interface中的类型，一个指向值。将*b*赋值给*Stringer*类型的interface将要设置interface的两个字。

![img](http://research.swtch.com/gointer2.png)

interface的第一个字指向所有的interface table，也叫itbale（在源码中叫itab）。itbale包含类型的元信息以及函数指针的列表。注意itable对应的是接口类型不是动态类型。Stringer的itable包含Binary满足Stringer的所有方法，对于我们的示例而言只有一个String，Binary的其他方法比如Get不会出现在itable中。



interface的第二个字指向的是实际的值，在这个例子中就是b的副本。**var s Stringer = b**和**var c uint64 = b**中的s和c都是b的复制而不是指针，这样就算b变化了也不会影响s和c。interface存的值只有一个字，但是内容可能无限大，所以interface的数据字段就是指向栈或堆上的指针。（当值的大小和这个位置大小相匹配的时候会有优化，我们后面说）。

为了检查一个结构满足是否某个interface（比如上面的switch代码），go编译器生成和c语言中 `s.tab->type` 相同效果的代码来获得类型指针，目的是为了和目标类型进行比较。如果匹配，可以通过取消s.data的引用来达到复制（If the types match, the value can be copied by by dereferencing `s.data`.）。



为了能够调用s.String()， go编译器生成和c语言中 `s.tab->fun[0](s.data)`等效的代码：从itable中调用适当的函数，将interface的值数据作为第一个参数传递进去。你能运行文章底部代码得到更多的细节。通常情况下，函数不会知道这个字的含义也不知道这个数据有多大。interface源码中希望itable中的函数指针是按照32位存，所以我们看到fun[0]中是`(*Binary).String`而不是``Binary.String``。



我们的例子中的interface只有一个方法，如果interface有很多方法那么在itable的fun底部包含更多的条目即可。



## 计算itable

现在我们已经知道了itable是什么样子，但它是从哪里来的呢？go拥有动态类型转换这就意味着在编译和链接阶段生成所有可能的itable是不切实际的：有很多interface和具体类型的之间的配对，其中大多数是不需要的。编译器会为每个具体类型（比如Binary、int和`func(map[int]string)`.）生成类型描述结构。在其他元数据中，类型描述结构包含一系列的被具体类型实现的方法。相似的，编译器为每个接口（比如Stringer）生成类型描述结构，它包含方法列表。interface runtime通过在具体类型的方法列表中寻找接口方法列表来计算itable。在itable生成之后runtime会缓存它，所以这个对应关系只需要计算一次。

在上面的例子中，Stringer的方法表中有一个方法，Binary有两个方法。一般来说，interface可能有*ni*个方法具体类型会有*nt*个方法，我们找到interface到具体类型的映射需要*O(ni \* nt)*，但是我们能做的更好。通过将两个方法列表排序同时遍历他们，我们能够在*O(ni + nt)*的时间构建出interface到具体类型的映射。

## 内存优化

上述实现所使用的空间可以通过两种互补的方式进行优化。

首先，如果interface的类型被解析为空（没有方法），itable除了指向原始类型之外没有任何用处。在这种情况下，可以不用itable直接指向原始类型。

![img](http://research.swtch.com/gointer3.png)

接口类型是否有方法是一个静态属性，源代码中的类型要么是`interface{}`要么是`interace{ methods... }`，所以编译器知道程序中知道在什么位置使用什么形式。

第二，如果与接口值相关的值能放在一个字里面，那么就不用引入间接或者堆分配。如果像Binary定义实现了uint32的Binary32，能够将实际值存在interface值的第二字里面。

![img](http://research.swtch.com/gointer4.png)

实际值指向什么取决于类型的大小，编译器会让存在itables表中的函数对传入的参数做正确的事情。如果接收器的小于等于一个字那么就直接用值否则就使用指针。上图展示了：对于Binary来说itable中的方法是`(*Binary).String`而对于Binary32来说itable表中的方法是`inary32.String`。

如果空的interface{}小于等于一个字那么他能利用上述的两个优势。

![img](http://research.swtch.com/gointer5.png)



## 寻找方法的性能

Smalltalk和其他类似的动态语言，在每次调用方法时都会查找方法。为了速度，许多实现通常在指令流本身为每个调用点实现简单的单入口缓存。在多线程程序中，必须小心管理这些缓存因为多线程程序可能位于同一个调用点。尽管避免了数据竞争（race），缓存也会成为内存竞争的来源。

因为Go有静态类型提示来配合动态类型查找，能够将查找从调用点移回到存储在interface中的点。例如，思考下面的代码

```go
1   var any interface{}  // initialized elsewhere
2   s := any.(Stringer)  // dynamic conversion
3   for i := 0; i < 100; i++ {
4       fmt.Println(s.String())
5   }
```

itable在第二行赋值阶段被计算或者从缓存中拿到，在第四行执行的`s.String()`是几个内存获取以及间接调用指令。相比之下，像Smalltalk、javascript、python这些动态语言的实现在执行第四行的时候会进行方法查找，这就导致不必要的工作。前面提到的缓存方式可能比这种方式更加便宜，但是仍然会比调用一条间接指令更昂贵。

当然在写这篇文章的时候我没有任何数据去支撑这个结论，但是在高并发的场景下更少的内存竞争已经是很大的成功了，因为已经将方法查找从紧密的循环中移出来了。当我们讨论架构而不是实现细节的时候，后者（Go实现）仍然有一些常数级别的优化因素。



## 更多信息

interface的runtime代码在[src/runtime/iface.go](https://github.com/golang/go/blob/master/src/runtime/iface.go)。还有很多关于interface的东西没有讲述，我们还没有看到指针接收器的例子和类型描述器（除了interface runtime还支持反射）这些要等后面的文章去讲。

## 代码

代码如下（命名为x.go）：

```go
package main

import (
 "fmt"
 "strconv"
)

type Stringer interface {
 String() string
}

type Binary uint64

func (i Binary) String() string {
 return strconv.Uitob64(i.Get(), 2)
}

func (i Binary) Get() uint64 {
 return uint64(i)
}

func main() {
 b := Binary(200)
 s := Stringer(b)
 fmt.Println(s.String())
}
```

编译输出为：

```asm
0045 (x.go:25) LEAL    s+-24(SP),BX
0046 (x.go:25) MOVL    4(BX),BP
0047 (x.go:25) MOVL    BP,(SP)
0048 (x.go:25) MOVL    (BX),BX
0049 (x.go:25) MOVL    20(BX),BX
0050 (x.go:25) CALL    ,BX
```

`LEAL`将s的地址加载进BX寄存器。下面两行MOVL指令从interface的第二个字获取值并且存储为函数调用的第一个参数。最后两行MOVL指令获取itable并从itable中获取函数指针，然后调用该函数。

```go
// AX =  *"GoCN" 即iface.data
MOVQ  "".w1+80(SP), AX 
// CX = go.itab{io.ReadWriter, writer1} 即iface.tab
MOVQ  "".w1+72(SP), CX   
// SP = go.itab{io.ReadWriter, writer1} 即iface.tab
MOVQ  CX, (SP)    
// SP + 8 = *"GoCN" 即iface.data
MOVQ  AX, 8(SP)     
// output(w1)
CALL  "".output(SB)       
```

