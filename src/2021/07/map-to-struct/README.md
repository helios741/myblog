# 在go中如何将map转换为struct



当你看到下面一段的代码的时候，不知道你会不会和我有一样的疑问，**为啥一个字符串就能转为结构体，是有啥黑科技么？**

```go
	type FooStruct struct {
		Name string `json:"name"`
	}
	var obj FooStruct
	str := `{"name": "Helios"}`
	decoder := json.NewDecoder(bytes.NewBufferString(str))
	if err := decoder.Decode(&obj); err != nil {
		panic(err)
	}
	fmt.Println(obj.Name) // Helios
```

下面就抽丝剥茧。。。。



## 需求

需求也是由上面的问题引发来的，写一个接口，当我们接受form格式或者query string格式的时候，我们希望定义一个struct剩下交给框架帮我们转为我们想要的，就像下面这样：

```go
// 通过localhost:8087/?name=helios&age=23访问
type ReqT struct {
  Name string `form:"name"`
  Age string `form:"age"`
}
var req ReqT
if err := ctx.BindQuery(&req); err != nil {
  panic(err)
}
fmt.Println(req.Age)  // 23
fmt.Println(req.Name) // Helios
```

那么这个BindQuery做了什么神奇事情么？？



## reflect能修改是struct的值么

如果你看了[Go如何实现对任意struct的校验](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/07/validator)中的**reflect小常识**这小节，那么你对reflect有了初步的理解，就算没看过也没有关系，我这次会把reflect提供的三类功能详细说一遍：

吹一遍

#### 1、 通过类型拿到reflect对象

在go中任意类型都实现了`interface{}`，所以每个类型低层都会有两个对象，即值对象和类型对象。

通过`reflect.ValueOf`和`reflect.TypeOf`能分别拿到值对象和类型对象，如果是struct类型，通过`Field(index)`能能够。。。。。。。。



#### 2、 通过reflect对象专为能处理的interface{}

既然能够将任意变量转换为reflect对象，自然也能转回来，即调用`.Interface()`

```go
vv := reflect.ValueOf(user)
for i := 0; i< vv.NumField(); i++ {
  fmt.Println(vv.Field(i).Interface()) // Helios
}
```

在内部也提供了直接输出基础类型，比如：

```go
type User struct {
  Name           string
  Age            uint8
  Money          float32
}
user := User{
  Name:  "Helios",
  Age:   2,
  Money: 3.4,
}
vv := reflect.ValueOf(user)
fmt.Println(vv.Field(0).String()) // Helios
fmt.Println(vv.Field(1).Uint())// 2
fmt.Println(vv.Field(1).Interface().(uint8)) // 2
fmt.Println(vv.Field(2).Float()) // 3.4000000953674316
```

这里要说的一点，reflect为了提供的API简单，对于所有的无符号整数类型在set和get上只提供了一个API，也就是说无论你的值是uint8、uint32或者uint等等都返回的uint64，剩下的交给使用者去转。当然这条规则也适合有符号整数以及浮点数。

#### 3、 修改对象的值

文眼出现了。当我们看完需求就能意识看，肯定有某种力量能修改struct上的值。

先来猜猜下面的代码会输出什么：

```go
var x float64 = 3.4
v := reflect.ValueOf(x)
v.SetFloat(7.1) 
fmt.Println(x)
```

我们下意识的会猜输出7.1，先告诉你不是，我们再来看段代码输出什么：

```go
foo := func(inter float64) {
  inter = 4.3
}
var outer = 9.9
foo(outer)
fmt.Println(outer)
```

这个输出4.3而不输出9.9已经成为共识了，但是上面`SetFloat`代码会panic(`panic: reflect: reflect.flag.mustBeAssignable using unaddressable value`)，这个其实也能理解，直接panic让人一下子就能意识到错误。<del>但是这种运行时的东西，谁能猜透呢，所以要做好recover</del>

那么下面的代码是不是就对了?

```go
var x float64 = 3.4
v := reflect.ValueOf(&x) // x -> &x
v.SetFloat(7.1)
fmt.Println(x)
```

依然和刚才一样的panic。???那为什么下面的代码：

```go
foo := func(inter *float64) {
  tmp := 4.3
  inter = &tmp
}
var outer = 9.9
foo(&outer)
fmt.Println(outer) // 9.9
```

能符合常理的输出呢？这就是**可设置性**比**比可寻址**更加严格的一部分。

```
var x float64 = 3.4
v := reflect.ValueOf(&x)
fmt.Println(v.CanSet()) // false
```

我们把v理解为存在&x的变量，&v是什么，是个地址呀，肯定不能修改呀。那么什么能修改呢，准确的说法是**地址执行的内容**，我们通过`.Ele()`拿到地址的内容(*v)，然后看一下可设置性。

```go
var x float64 = 3.4
v := reflect.ValueOf(&x).Elem()
fmt.Println(v.CanSet()) // true
v.SetFloat(8.7)
fmt.Println(x) // 8.7
```

现在的输出就能理解了。所以要通过reflect设置一个变量的值，要满足**是可寻址的**和**修改地址指向的内容**这两点。







## 实现

我们知道了通过reflect能修改struct的值，那么实现就变得简单了。

```go
type ReqT struct {
  Name string `form:"name"`
  Age int `form:"age"`
}
var req ReqT
v := reflect.ValueOf(&req).Elem()
v.Field(0).SetString("Helios")
v.Field(1).SetInt(25)
fmt.Println(req)
```





## 总结

这个实现了之后，加上[Go如何实现对任意struct的校验](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/07/validator)就能实现gin的Bind的功能了。确实在he中也实现了。