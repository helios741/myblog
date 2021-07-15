

## 整体demo

叫he是因为和chi进行互补。

```go
package main

import (
	"fmt"

	"he"
)
// 中间件1
func M1(handler he.HandlerFunc) he.HandlerFunc {
	return func(ctx he.Context) {
		fmt.Println("M1 start")
		handler(ctx)
		fmt.Println("M1 ending")
	}
}
// 中间件2
func M2(handler he.HandlerFunc) he.HandlerFunc {
	return func(ctx he.Context) {
		fmt.Println("M2 start")
		handler(ctx)
		fmt.Println("M2 ending")
	}
}

type ReqT struct {
	Name string `form:"name" hebind:"required"`
	Age string `form:"age" hebind:"required"`
	Id int `form:"id" hebind:"required"`
}
// 处理函数
func helloHandler(ctx he.Context) {
	var req ReqT
	fmt.Println("------")
	if err := ctx.BindQuery(&req); err != nil {
		panic(err)
	}
	fmt.Println(req.Age, req.Name, req.Id)
	ctx.WriteString("Hello World!")
}

func main() {
	r := he.New()
	r.Use(M1) // 定义全局中间件
	r.GET("/frends/:id/helios", helloHandler)
	r.GET("/frend/:id/helios", helloHandler)
	r.With(M2).GET("/frend/:id", helloHandler)// 有一个函数专属中间件
	panic(r.Run())
}

```

[example地址](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/example)



## context

搞context主要是为了给回调函数传递参数以及提供一些内部方法比较方便，原生的函数(`type HandlerFunc func(ResponseWriter, *Request)`)比较难扩展参数，实现如下：

```go
type Context interface {
	WriteString(str string) (int, error)
	Bind(v interface{}) error
	BindQuery(v interface{}) error
	BindJson(v interface{}) error
}

type context struct {
	request   *http.Request
	writer    http.ResponseWriter
	params map[string]string
}
```

就是两个功能：

1、 给回调函数传递参数

2、 让http参数（可能是json、form、xml类型）转换为自定义的struct

[he/context.go](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/context.go)



## router的功能

通过radix tree实现了path的添加和查找功能，具体细节可以看：[radix tree有哪些用途](https://mp.weixin.qq.com/s/3bKRVdPl-1_NKXARqLvJIw)

实现了radix tree之后router就是在其之上的封装，我们对使用者暴露这几个方法：

```go
type Router interface {
	GET(path string, handler HandlerFunc)
	Use(mws ...func(HandlerFunc)HandlerFunc)
	ServeHTTP(w http.ResponseWriter, r *http.Request)
	With(...func(HandlerFunc) HandlerFunc) Router
	Run(addr ...string) error
}

func New() Router {
	return &router{rt: &node{}}
}

type HandlerFunc func(Context)
type router struct {
	rt *node
	mws []func(HandlerFunc) HandlerFunc
}
```

具体如何使用，在上面的demo已经说明过了。具体代码在[he/router.go](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/router.go)，[he/tree_test.go](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/tree_test.go)



## http binding功能

这个大量借鉴<del>抄</del>了gin的实现，主要是将http的form格式或者query string格式转换为自定义的strut，这个也有开源实现[mitchellh/mapstructure](https://github.com/mitchellh/mapstructure)但是不是太负责就是自己实现了。具体设计可以看[Go中如何将map转换为struct](https://mp.weixin.qq.com/s/w1Frhg_rlF5jtjAtlVJHmg)

来接着context提供的方法来看Bind和BindQuery：

```go
func (c context) Bind(v interface{}) error {
	b := binding.Default(c.request.Method,  c.request.Header.Get("Content-Type"))
	return b.Bind(c.request, v)
}
func (c context) BindQuery(v interface{}) error {
	binding.Query.ExtraParams = c.params
	return binding.Query.Bind(c.request, v)
}
```

每个参数类型都有实现下面的接口：

```go
type Binding interface {
	Name() string
	Bind(*http.Request, interface{}) error
}
```

以query为例：

```go
ype queryBinding struct{
	ExtraParams map[string]string
}


func (q queryBinding) Name() string {
	return "query"
}

func (q queryBinding) mergeParams(params url.Values) httpValues {
	for k, v := range q.ExtraParams {
		params[k] = []string{v}
	}
	return httpValues(params)
}

func (q queryBinding) Bind(request *http.Request, obj interface{}) error {
	ok, err := mappingByPtr(obj, q.mergeParams(request.URL.Query()))
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

关于mappingByPtr的函数可以继续看[Go中如何将map转换为struct](https://mp.weixin.qq.com/s/w1Frhg_rlF5jtjAtlVJHmg)

[he/binding](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/binding)

最后的validate的函数马上出现。

## validator功能

这个主要借鉴的[go-playground/*validator*](https://github.com/go-playground/validator)，具体设计思路可以看[Go如何实现对任意struct的校验](https://mp.weixin.qq.com/s/VVVyb_9LkJTVD6lbeCyGvg).

主要是对外提供Validator这个interface上的方法：

```go
type Validator interface {
	RegisterValidation(tagName string, p Func)
	SetTagName (tagName string)
	Struct(s interface{}) error
}

type validate struct {
	tagName            string
	splitStr           string
	errs               ValidationErrors
	builtInValidations map[string]Func
}
func New() Validator{
	v := &validate{tagName: defaultTagName, splitStr: defaultSplit}
	// 把required这类内置的tag注册进来
	v.builtInValidations = make(map[string]Func)
	for tag, handler := range buildInValidators {
		v.builtInValidations[tag] = handler
	}
	return v
}
```



所有的功能都在下面这个单测([he/validator/validator_test.go](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/validator/validator_test.go))里面了：

```go
type Address struct {
	Street string `validate:"required"`
	City   string `validate:"required"`
	Planet string `validate:"required"`
	Phone  string `validate:"required"`
}
type User struct {
	FirstName      string     `validate:"required"`
	LastName       string     `validate:"required"`
	Age            uint8      `validate:"gte=0,lte=130"`
	Email          string     `validate:"required,email"`
	FavouriteColor string     `validate:"iscolor"`                // alias for 'hexcolor|rgb|rgba|hsl|hsla'
	Addresses      []*Address `validate:"required,required"` // a person can have a home and cottage...
}
func TestValidate_Struct(t *testing.T) {
	v := New()
	address := &Address{
		Street: "Eavesdown Docks",
		Planet: "Persphone",
		Phone:  "none",
		City: "BJ",
	}
	user := &User{
		FirstName:      "Helios",
		LastName:       "Helios",
		Age:            123,
		Email:          "Helios@gmail.com",
		FavouriteColor: "helios",
		Addresses:      []*Address{address},
	}
	v.RegisterValidation("iscolor", isColor)
	if err := v.Struct(user); err != nil {
		t.Error(err)
		return
	}
	t.Log("success")
}

func isColor(fp FieldParam) bool {
	fmt.Println(fp.Field().String())
	return fp.Field().String() == "helios"
}
```

[he/validator](https://golearn.coding.net/p/class-5/d/homework/git/tree/feature%2Fhelios/lesson8/group8/helios/he/validator)

## 待完成

<del>功能越写越多</del>

context TODO

- [ ] 实现更多的bind
- [ ] 支持获取文件

router的功能：

- [ ] 支持分组
- [ ] Use只能在首部，不能注册完函数再USE
- [ ] 提供POST、JSON等方法注册
- [ ] 支持catchall
- [ ] 将每个mtParam节点设置为一个，比如:id和:idl分别属于两个节点，没有从属关系
- [ ] 没有做benchmark

Httpbinding功能：

- [ ] 支持更多的类型
- [ ] 将switch/case中缺少的东西补回来
- [ ] tag支持默认值

validator功能：

- [ ] 支持slice、array