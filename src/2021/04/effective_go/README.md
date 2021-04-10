# GO语言初学八小问

本文会回答在学习golang中常见的一些问题，包括

1、 new和make区别：会给你梳理两者的区别，然后以不需要new收尾

2、 如何实现二维切片：提供两种实现二维切片的方式并给出对比

3、 defer参数求值：会详细说明为什么defer作为延迟函数会提前解析参数

4、 类型断言：着重讲**var _ json.Marshaler = (*RawMessage)(nil)**这个看起来奇怪的东西

5、 select：讲解一些select的注意事项

6、 传值还是传引用：这是一个智者见智的问题，但是还是有一些原则

7、 go和面向对象：会告诉go的duck模型和传统面向对象的区别

8、 接口：通过一个自定义类型排序的例子讲解接口



## 一、new和make的区别

这个问题真心不知道为什么网上会有这么多人讨论，可能是因为effective go里面做了对比了，<del>并且有一些闲着没事干的公司当面试题吧。</del>并且他们都是分配内存的原因吧。其实感觉没啥难理解的，只要记住**new返回的指针make返回的值**以及他们的作用范围即可。

### 1、应用范围

new初始化所有的类型返回的是**引用**而make只能是slice、map以及channel，返回的是**值**。



但是笔者感觉用不上new，你想想除了slice、map以及channel还有哪些用得着初始化的，用new初始化int、float、string这一类基本类型有点脱裤子放屁的感觉，再说这些基本类型是指针用起来还更费劲了。要是struct类型可以通过字面量的方式（下面会举例）。我翻了一下我熟悉的几个开源库，都没有用到new这个关键字。要是slice、map以及channel也能用字面量的方式创建（现在使用之前必须初始化）估计也用不上make了。

我还以为通过new的方式和字面量的方式在性能上有啥区别了，结果做了benchmark也没啥区别：

```go
type MultipleFieldStructure struct {
	a int
	b string
	c float32
	d float64
	e int32
	f bool
	g uint64
	h *string
	i uint16
}
func BenchmarkNew(b *testing.B) {
	for i:=0; i< b.N; i++ {
		_ = new(MultipleFieldStructure)
	}
}

func BenchmarkGao(b *testing.B) {
	for i:=0; i< b.N; i++ {
		_ = &MultipleFieldStructure{}
	}
}

```

输出：

```go
BenchmarkNew
BenchmarkNew-8   	1000000000	         0.589 ns/op
BenchmarkGao
BenchmarkGao-8   	1000000000	         0.558 ns/op
PASS
```

所以我们并不需要new



### 2、用法

 new并不会像c++/java一样申请内存，只会返回这个类型的零值**引用**，下面两种方式是等价的：

```code
func main() {
	type T struct {
		Name string
	}
	a1 := new(T)
	a2 := &T{}
	fmt.Println(*a1 == *a2)
}
```

make返回的是slice、map以及channel的值，也是返回的他们的零值，

下面这个程序完整反映它们二者的区别：

```go
func main() {
	var p *[]int = new([]int)
	var v  []int = make([]int, 10, 100)
	fmt.Println(*p == nil) // true
	fmt.Printf("len is %d, cap is %d \n", len(v), cap(v)) // len is 10, cap is 100
	*p = v
}
```



## 二、golang如何实现二维数组/切片

我们知道slice的长度是可变的，所以我们要根据不同的场景选择不同的二维slice的方式。

如果你的应用场景是中第二维数组可能会变化，那就选择独立分配第二维数组，就像下面这样：

```go
func main() {
	rowSize, columnSize := 5, 6
	picture := make([][]uint8, rowSize)
	for i := range picture {
		picture[i] = make([]uint8, columnSize)
	}
	fmt.Printf("%T %#v \n", picture, picture)
}
```

这样的好处就是每行之间都不会相互影响，带来的后果就是效率低，因为创建了很多slice，如果你的第二维数组不会变，用下面的方式会更高效：

```go
func main() {
	rowSize, columnSize := 5, 6
	picture := make([][]uint8, rowSize)
	pixels := make([]uint8, columnSize*rowSize)
	for i := range picture {
		picture[i], pixels = pixels[:columnSize], pixels[columnSize:]
	}
}
```



## 三、defer参数求值

defer能很大程度上减少人的心智负担，因为能够保证close能够紧挨open函数，这样就算怎么修改函数都不用担心文件没有关闭而造成的泄漏，但是也是一把双刃剑，可能这个函数操作的时间一直持有文件句柄，持有过多连接会造成负载高，并且defer还会影响性能。

先来看个容易困惑初学者的例子：

```go
func a() {
	count := 100
	defer func(c int) {fmt.Println("this is defer:", c)}(count)
	count = 0
	fmt.Println(count)
}
func main() {
	a()
}
```

输出是：

```shell
0
this is defer: 100
```

既然defer是所谓的延迟函数，那么应该输出修改后的0怎么输出100了呢。说白了defer也是类似于语法糖，编译器运行到defer这一行并不会跳过去，也是需要确定栈的大小的，所以就要对参数求值。

解决办法也很简单：

```go
func a() {
	count := 100
	defer func() {fmt.Println("this is defer:", count)}()
	count = 0
	fmt.Println(count)
}
func main() {
	a()
}
```

反正都是在一个函数中，去掉就行了。

在effective go中还用这个特性做了track的功能，比较好玩可以借鉴看一下：

```go

func trace(s string) string {
	fmt.Println("entering:", s)
	return s
}

func un(s string) {
	fmt.Println("leaving:", s)
}

func a() {
	defer un(trace("a"))
	fmt.Println("in a")
}

func b() {
	defer un(trace("b"))
	fmt.Println("in b")
	a()
}

func main() {
	b()
}
```

看着是个不错的功能，但是go暂时没有泛型就先看看吧。



## 四、类型断言

类型断言其实挺简单，主要说一下**var _ json.Marshaler = (*RawMessage)(nil)**这个的含义。如果经常看go的开源项目经常能看见这类语法，这也是减少人心智负担的一种方式，就是告诉你RawMessage这个类型实现了json.Marshaler这个接口。一般是下面这样用的：

```go
type Marshaler interface {
	MarshalJSON() ([]byte, error)
}

type T struct {
	
}

func (t *T) MarshalJSON() ([]byte, error) {
	return []byte{}, nil
}

var _ Marshaler = (*T)(nil)
```

这样在你写代码的时候，当你的T不满足Marshaler接口时在编译阶段会提醒你，甚至编译器也会提醒你。



还有两种类型断言的小姿势，这里一并说了吧。

```go
type Marshaler interface {
	MarshalJSON() ([]byte, error)
}

type T struct {

}

func (t *T) MarshalJSON() ([]byte, error) {
	return []byte{}, nil
}

var _ Marshaler = (*T)(nil)
func main() {
	var val interface{}
	val = new(T)
	if m, ok := val.(Marshaler); !ok {
		fmt.Println("not ok")
	} else {
		fmt.Println("ok", m)
	}
}

```

**val.(Marshaler)**和map一样，第二个参数(ok)可以没有，但是需要不满足就会panic，下面这样：

```go
type Marshaler interface {
	MarshalJSON() ([]byte, error)
}


func main() {
	var val interface{}
	val = ""
	m:= val.(Marshaler)
	fmt.Println(m)
}
```

输出结果：

```shell
panic: interface conversion: string is not main.Marshaler: missing method MarshalJSON

goroutine 1 [running]:
main.main()
        /Users/helios/Desktop/helios/test-go/silly_defer_t/main.go:23 +0x49

```



还有就是通过switch判断是何种类型:

```go
func main() {
	var val interface{}
	val = ""
	switch val.(type) {
	case int:
		fmt.Println("int")
	case string:
		fmt.Println("string")
	}
	fmt.Println("done")
}

```



## 五、select用法

1、 nil channel是永远不会被执行到的

```go
func main() {
	var c chan int
	select {
	case n := <- c:
		fmt.Println("receive: ", n)
	case c <- 34:
		fmt.Println("send: ", 34)
	default:
		fmt.Println("default")
	}
}
```

这个会一直输出default。

2、 所有case的表达式都会被求值

```go
func left() chan int {
	fmt.Println("[left]:")
	return make(chan int)
}
func right(a int) int {
	fmt.Println("[right]:", a)
	return a
}
func main() {
	select {
	case left() <- right(34):
		fmt.Println("send: ", 34)
	case left() <- right(35):
		fmt.Println("send: ", 35)
	case left() <- right(36):
		fmt.Println("send: ", 36)
	default:
		fmt.Println("default")
	}
}
```

输出结果如下：

```shell
[left]:
[right]: 34
[left]:
[right]: 35
[left]:
[right]: 36
default
```

3、 如果同时满足都个case，会随机选择一个

```go
func main() {
	var c  [5]chan int
	for i := 0; i < 5; i++ {
		c[i] = make(chan int)
	}
	for i := 0; i < 5; i++ {
		i := i
		go func() {
			time.Sleep(1 * time.Second)
			c[i] <- i
		}()
	}

	select {
	case n := <- c[0]:
		fmt.Println("receive c[0]: ", n)
	case n := <- c[1]:
		fmt.Println("receive c[1]: ", n)
	case n := <- c[2]:
		fmt.Println("receive c[2]: ", n)
	case n := <- c[3]:
		fmt.Println("receive c[3]: ", n)
	case n := <- c[4]:
		fmt.Println("receive c[4]: ", n)
	}
}
```

多运行几次就发现，出现哪个的都有。

4、如果select没有default，就会阻塞到有一个case满足，要是在运行时候发现没有满足条件的会报错

```go
func main() {
	select {}
}
```

这个会输出

```shell
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [select (no cases)]:

```



## 六、传值还是传引用

关于这个问题讨论的热度不亚于给变量叫什么名字。我们不妨从接收者(receiver)为什么设计为既能是指针或者值，就是告诉开发者设置为指针的时候是能修改该类型内部的值的，为值的时候就不会出现这个问题。这就带来一个问题，如果传递struct太大的话，会占用大量栈内存，如果传递指针的话会影响GC，因为指针共享的数据是在堆上的。

说一下接受者（Receiver）指的是什么

```go
type T struct {}

func (t *T) MarshalJSON() ([]byte, error) {
	return []byte{}, nil
}
```

t就是所谓的接受者（Receiver），虽然我也很不习惯，但我也不知道叫啥好。



其实不想举啥例子了，我把[CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments#receiver-type)上的原则说一下吧：

1. 如果接受者（Receiver）是map、func、chan那么就不要用指针。
2.  如果接受者（Receiver）是slice，对应的方法不会对slice进行充分赋值或者重新分配，那么不要用指针
3.  如果接受者（Receiver）需要被修改，那么必须是指针
4.  如果接受者（Receiver）包含sync.Mutex这类的同步原语，则必须是指针，避免复制
5. 如果接受者（Receiver）是个比较大的结构体，那么传递指针更有效率。但是多大算大，你说的算。
6. 如果接受者（Receiver）是slice、map或者struct，里面的元素包含指针，修改元素包含的指针是会影响外部的，为了读者理解最好使用指针
7. 如果接受者（Receiver）是int、string这些基本类型，不会对他们修改就传递值吧
8. 如果上面都没解决你的疑问，那么就用指针就好了

八条你只要记住最重要的第4条和第8条就行。



这个问题讨论的文章不少：

- [Go Best Practices: Pointer or value receivers?](https://flaviocopes.com/golang-methods-receivers/)
- [Why do T and *T have different method sets?](https://golang.org/doc/faq#different_method_sets)
- [pointers_vs_values](https://golang.org/doc/effective_go#pointers_vs_values)
- [Should I define methods on values or pointers?](https://golang.org/doc/faq#methods_on_values_or_pointers)





## 七、go和面向对象

go和python在编程范式上同属于duck(鸭子)类型，不像C++/java那样典型的面向对象。即只要长得像鸭子、叫起来像鸭子、走路像鸭子...就是鸭子。也不知道为什么程序员为什么这么喜欢鸭子，让我想起debug还有个[小黄鸭调试法](https://zh.wikipedia.org/zh-hans/%E5%B0%8F%E9%BB%84%E9%B8%AD%E8%B0%83%E8%AF%95%E6%B3%95)。不知道你发没发现最近十几年新兴的语言基本都是鸭子类型，就是因为继承太鸡肋了，早就要大佬提倡要通过组合取代继承，这个点以后单独写文章讨论这一点。以前写过[深入理解python中类和对象](https://github.com/helios741/myblog/tree/new/learn_go/src/2020/0315_python_class) 和 [golang实现继承](https://mp.weixin.qq.com/s/Z4fnoildgpzHHkKxKSSfWg)



## 八、接口



个人感觉interface没啥可说的，但是感觉effective这个例子是真的好，还是决定借鉴过来（最后在引用里面有说）：

```go
type Sequence []int

func (s Sequence) Len() int {
	return len(s)
}
func (s Sequence) Less(i, j int) bool {
	return s[i] < s[j]
}
func (s Sequence) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

// Copy returns a copy of the Sequence.
func (s Sequence) Copy() Sequence {
	copy := make(Sequence, 0, len(s))
	return append(copy, s...)
}
func (s Sequence) String() string {
	s = s.Copy()
	sort.Sort(s)
	return fmt.Sprint([]int(s))
}
func main() {
	a := Sequence{1, 3, 4, 2, 0}
	fmt.Println(a)
}
```

只要实现了Len()、Less(i, j int)、Swap(i, j int)就能使用sort.Sort



## 引用



- [Effective go](https://golang.org/doc/effective_go)
- [go CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments)
- [golang faq](https://golang.org/doc/faq)
- [Language Specification](https://golang.org/ref/spec)



