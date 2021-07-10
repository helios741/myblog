# Go中如何将map转换为struct



看到下面代码的时候，不知道你会不会有这样一个疑问，**为啥一个字符串就能转为结构体，是有啥黑科技么？**

```go
type FooStruct struct {
  Name string `json:"name"`
}
var obj FooStruct
str := `{"name": "Helios"}`
b := bytes.NewBufferString(str)
decoder := json.NewDecoder()
if err := decoder.Decode(&obj); err != nil {
  panic(err)
}
fmt.Println(obj.Name) // Helios
```

我们今天就从gin的Bind实现来抽丝剥茧的讲述一下这个过程。



## 需求

需求也是由上面的问题引发来的，写一个接口，当我们接受form格式或者query string格式的时候，我们希望定义一个struct剩下交给框架帮我们转为想要的，就像下面这样：

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

<img src="./image-20210709133424854.png" alt="image-20210709133424854" style="zoom:50%;" />

这个BindQuery做了什么神奇事情么，取代了我手动赋值的过程。



## 谁能修改struct的值

如果你看了[Go如何实现对任意struct的校验](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/07/validator)中的**reflect小常识**这小节，那么你对reflect有了初步的理解，就算没看过也没有关系，我这次会把reflect提供的三类功能详细说一遍。

go中reflect提供很多能拿到运行时变量的低层方法，但是你不用怕，所有提供的方法都不会离开下面的三个的范畴，只要你理解下面三种reflect作用范围，剩下的都是围绕他们的细节。

#### 1、 通过类型拿到reflect对象

在go中任意类型都实现了`interface{}`，所以每个类型低层都会有两个对象，即值对象和类型对象（[[译]go 数据结构：interface](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/05/translation_go_data_structures_interface)）。

通过`reflect.ValueOf`和`reflect.TypeOf`能分别拿到值对象和类型对象，如果是struct类型，通过`Field(index)`能够每个属性，再或者我们想拿到每个属性上的tag可以通过`reflect.StructTag.Tag`拿到：

```go
type User struct {
  Name           string     `validate:"required"`
  Age            uint8      `validate:"gt=0"`
}
user := User{
  Name:  "Helios",
  Age:   0,
}
vv := reflect.ValueOf(user)// {Helios 0}
vt := reflect.TypeOf(user)// main.User
for i := 0; i< vv.NumField(); i++ {
  fieldValue := vv.Field(i)
  fieldTyp   := vt.Field(i)
  fmt.Println(fieldValue) // Helios
  fmt.Println(fieldTyp)   //{Name  string validate:"required" 0 [0] false} 
  fmt.Println(fieldTyp.Tag)   //validate:"required" 
  fmt.Println(fieldTyp.Tag.Get("validate")) // required
}
```

目前为止，是不是觉得对于一个变量上所有的东西都能拿到了呢。



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

当你明白了这一点，也就理解了reflect中最难的部分，如果不理解那么也没有关系，可以把代码copy下来多实践几次。也可以看看这篇文章[laws-of-reflection](https://blog.golang.org/laws-of-reflection).





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

我们将上述代码扩展一下就能实现gin的Bind的功能了。我们来一步步手动实现下（[he/binding/query.go](https://github.com/helios741/myblog/blob/new/learn_go/src/2021/07/map-to-struct/he/binding/query.go)）

1、 **如何调用: Bind**

```go
func (q queryBinding) Bind(request *http.Request, obj interface{}) error {
	ok, err := mappingByPtr(obj, httpValues(request.URL.Query()))
	if !ok {
		log.Printf("binding_queryBinding_Bind mapping fail(%+v)!\n", err)
		return errors.New(fmt.Sprintf("queryBinding_Bind fail, error is %+v", err))
	}
	if err != nil {
		return err
	}
	return validate(obj)
}
```

这里httpValues是关键，将`request.URL.Query()`返回的类型转换为**自定义类型httpValues**，以便在上面扩展方法，马上就知道怎么用了。

2、 **如何调用: Bind**

```go
type mapping struct {
	tag string
	// 如果这里写死是某种类型就很难扩展了，比如data map[string][]string
	structData setter
}
func mappingByPtr(v interface{}, s setter) (bool ,error) {
	m := mapping{
		tag:        "form",
		structData: s,
	}
	return m.tryMapping(reflect.ValueOf(v), reflect.StructField{Anonymous: true})
}
```

构造了mapping对象，然后调用其tryMapping方法.

这里的setter是个interface，如下：

```go
type setter interface {
	setValue(value reflect.Value, field reflect.StructField, tag string) (bool, error)
}
```

因为我们不仅是map\[string\][]string需要专为指定struct，可能会是string、map\[string\]string。让一个具体类型实现这个接口，这样对具体类型的操作就不会污染解析目标类型的代码。

3、 **映射: tryMapping**

```go
func (m *mapping) tryMapping(value reflect.Value, field reflect.StructField) (bool, error) {
	if field.Tag.Get(m.tag) == "-" {
		return  false, nil
	}

	// 如果传递的是引用
	if value.Kind() == reflect.Ptr {
		isSetted, err := m.tryMapping(value.Elem(), field)
		if isSetted && value.CanSet() {
			value.Set(value)
		}
		return isSetted, err
	}

	// 设置值
	if value.Kind() != reflect.Struct || !field.Anonymous {
    //time.Time会返回true
    // embedded field会返回false
		ok, err := m.setValue(value, field)
		if err != nil {
			return false, err
		}
		if ok { 
			return true, nil
		}
	}

	// time.Time不会进来，
  // 因为在上个if中已经return，这里只能是embedded field
	if value.Kind() == reflect.Struct {
		for i := 0; i < value.NumField(); i++ {
			m.tryMapping(value.Field(i), value.Type().Field(i))
		}
	}
	return true, nil
}
```

反正就是如果是常规字段就调用setValue去复制，如果是struct就要遍历每个Field。这里需要注意两点：

第一、<del>我不叫喂，我叫楚雨荨</del>go中的time.Time被反射出来属于reflect.Struct类型

第二、如果有embedded field，那么field.Anonymous就会为true，什么是embedded field看下面代码你就知道了：

```go
type User struct {
  Age int `form:"age"`
}
type ReqT struct {
  Name string `form:"name"`
  User // embedded field
}
```



4、 **tag的准备工作: setValue**

```go
func (m *mapping) setValue(value reflect.Value, field reflect.StructField) (bool, error) {
	// 取出tag
	tag := field.Tag.Get(m.tag)

	// 如果tag不存在，就用Field
	if tag == "" {
		tag = field.Name
	}
	if tag == "" {
		return false, errors.New("no form tag by"+ value.Type().Name())
	}
	return m.structData.setValue(value, field, tag)

}
```

做一下取tag的逻辑，也可以有设置默认值的逻辑，我这里没写。

5、 **设置值: setter.setValue**

```go
type httpValues map[string][]string

func (hv httpValues) setValue(value reflect.Value, field reflect.StructField, tag string, opt setOptions) (bool, error) {
	tagValue, ok := hv.getTagValue(tag)
	if !ok {
		return false, errors.New("no value for tag: " + tag)
	}
	// TODO 还要判断Slice、Array
	switch value.Kind() {
	case reflect.Int: 
		i, err := strconv.Atoi(tagValue)
		if err != nil {
			return false, err
		}
		if value.CanSet() {
			value.SetInt(int64(i))
			return true, nil
		}
	case reflect.String:
		if value.CanSet() {
			value.SetString(tagValue)
			return true, nil
		}
	case reflect.Struct:
		switch value.Interface().(type) {
		case time.Time:
			if err := setTimeField(tagValue, field, value); err != nil {
				return false, err
			}
		}
		if err := json.Unmarshal([]byte(tagValue), value.Addr().Interface()); err != nil {
			return false, err
		}
		return true, nil
	}
	return false, errors.New("not set for tag: " + tag)
}
```

虽然代码长但是没什么难度，主要因为类型太多了，switch/case比较多。



## 总结

这个实现了之后，加上[Go如何实现对任意struct的校验](https://github.com/helios741/myblog/tree/new/learn_go/src/2021/07/validator)就能实现gin的Bind的功能了。对于具体的代码你可以参考我这里的简单实现[he/context.go](https://github.com/helios741/myblog/blob/new/learn_go/src/2021/07/map-to-struct/he/context.go)

