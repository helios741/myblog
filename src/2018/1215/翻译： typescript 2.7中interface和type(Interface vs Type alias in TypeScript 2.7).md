原文： [Interface vs Type alias in TypeScript 2.7](https://medium.com/@martin_hotell/interface-vs-type-alias-in-typescript-2-7-2a8f1777af4c)

译者注：
- type alias翻译为类型别名
- interface 不做翻译


![image](https://user-images.githubusercontent.com/12036324/49731482-7317ff00-fcb6-11e8-84f9-85fa55cb491b.png)

经常有人在网上，在工作中，甚至在滑板公园询问我，在Typescript中定义编译时类型的*类型别名*和*interface*有什么区别。


我以前做的第一件事就是让他们去看Typescript的手册。。。


不幸的是在大多数时候，他们不能找到他们想要找到的东西（[隐藏在“高级类型”部分](http://www.typescriptlang.org/docs/handbook/advanced-types.html#interfaces-vs-type-aliases)）。即使你能找到它，这个信息描述的是过时的（描述的行为指针对Typescript@2.0.x版本）。


好消息各位！你不必在看了，这篇文章是关于何时使用*interface*或*类型别名*的最新描述和风格指南。

## 官方的文档说：

```
"类型别名 可以和interface关键字一样，然而他们有一些细微的差别。"
```

**这是对的**

### 有什么不同呢

#### 第一个不同
```
*interface*能够创建一个新的类型，*类型别名*不能创建一个新的类型

--例如：错误信息不能使用*类型别名*

```

_*这是不对的！（自从Typescript 2.1开始）*_

我们分别通过*类型别名*和*interface*定义编译时类型*Point*，并且实现使用*interface*和*类型别名*的类型参数实现两种`getRectangleSquare`。

![image](https://user-images.githubusercontent.com/12036324/49732639-436af600-fcba-11e8-9137-ffd25681f0fe.png)
<p align="center">类型别名 和 interface 声明的Point</p>

![image](https://user-images.githubusercontent.com/12036324/49732744-89c05500-fcba-11e8-9e87-40a4fb80afda.png)
<p align="center"> 使用类型别名和interface定义getRectangleArea函数的参数</p>

![image](https://user-images.githubusercontent.com/12036324/49733011-6649da00-fcbb-11e8-9f7b-5d85d7d77db3.png)
<p align="center">类型别名 和 interface声明的有相同的错误</p>

两个相同的错误如下：

```
// TS Error: 
// Interface:
Argument of type '{ x: number; }' is not assignable to parameter of type 'PointInterface'. Property 'y' is missing in type '{ x: number; }'.
// Type alias:
Argument of type '{ x: number; }' is not assignable to parameter of type 'PointType'. Property 'y' is missing in type '{ x: number; }'.
```


#### 第二个不同

```
"第二个更加重要的重要的区别是类型别名不能被继承或者实现"

```


**这个同样也是错的**


我们能够通过一个*interface*继承*类型别名*:

![image](https://user-images.githubusercontent.com/12036324/49733040-7792e680-fcbb-11e8-8b7f-1711319cccc8.png)

<p align="center">interface 继承类型别名</p>


或者我们使用类型别名来实现类：
![image](https://user-images.githubusercontent.com/12036324/49733068-8c6f7a00-fcbb-11e8-8c65-1e288229243c.png)
<p align="center">类实现类型别名。</p>



或者一个类能够实现继承了*类型别名*的*interface*
![image](https://user-images.githubusercontent.com/12036324/49733262-fc7e0000-fcbb-11e8-8d9d-2f9df362c192.png)
<p align="center">ThreeDimension 继承了PointType。PointType是类型别名声明的。</p>


我们也能通过组合*类型别名*和*interface*去实现类。
![image](https://user-images.githubusercontent.com/12036324/49733384-423ac880-fcbc-11e8-85d1-9f65570df9fe.png)
<p align="center">class 实现了interface和类型别名</p>

#### 第三个不同

```
"3. 类型别名 不能继承/实现 其他的类型别名"
```

**当然这个也是错误的**

+ 嗯，这个是部分正确的，但是这个表述具有误导性。

*类型别名*能通过交叉类型运算符**&**扩展*interface*或者任意有效的Typescript类型（它类似字典或者javascript对象，非原始类型）。

![image](https://user-images.githubusercontent.com/12036324/49733836-88dcf280-fcbd-11e8-838a-12b9be331055.png)
<p align="center">类实现了具有交叉类型的*类型别名*</p>

我们也能利用映射类型实现*interface*和*类型别名*的各种类型转换。

让我们通过*Partial*映射类型把*Shape*和*Perimeter*变为可选的。
![image](https://user-images.githubusercontent.com/12036324/49734683-102b6580-fcc0-11e8-856e-5bc18c637a1d.png)
<p align="center">类实现了通过交叉运算符和类型映射定义的*类型别名*。`perimeter()`和`area()`是可选的以至于我们没必要在类中去实现他们。</p>

**弱类型检测也正常工作**

![image](https://user-images.githubusercontent.com/12036324/49734878-a3fd3180-fcc0-11e8-927c-f4ed65f83f6e.png)
<p align="center">弱类型检测按期望的一样工作。</p>

## 类型别名 和 interface的混合类型

你可能偶尔想要定义一个可以充当一个具有额外属性对象或函数的对象。

我们这里讨论的是定义函数（可执行对象），和该函数的静态属性。

**当与第三方库进行交互时，可以看到这种模式，这充分描述了类型的“全貌”**


混合类型的定义和实现。

它和*类型别名*一样工作！


通过类型别名定义混合类型。

但是有一个非常微妙的不同。你将要在IDE中得到具体的类型信息去代替*Counter*类型。

![image](https://user-images.githubusercontent.com/12036324/49735694-ea539000-fcc2-11e8-846e-31827a775c24.png)
<p align="center">使用类型别名和混合类型的interface的区别。</p>

通常一个好的实践，是将我们的混合定义分为两个部分：

- 可调用对象（函数）类型别名


- 静态属性对象描述

![image](https://user-images.githubusercontent.com/12036324/49736041-fc81fe00-fcc3-11e8-9749-991f752a69b9.png)

- 和最终的*Counte*类型

![image](https://user-images.githubusercontent.com/12036324/49736060-0b68b080-fcc4-11e8-8b54-5b60d583dddf.png)


## 所以类型别名和interface有什么区别呢？


### 1. 不能使用通过类型别名定义联合类型去实现类

这将要在编译的时候触发一个错误：

![image](https://user-images.githubusercontent.com/12036324/49913580-fdd04800-fec8-11e8-8765-dd8ac3541a82.png)
<p align="center">第一点不同——联合运算符定义的类型不能被实现</p>


```
这完全有道理！一个图纸不能实现两个结构类型中的一个，所以在这方面没有什么好惊讶的。
```



类型别名联合使用用于定义对象是有意义并且有效的。所以下面会在编译时报一个错误，因为对象必须去定义`perimeter()`和`area()`两个中的一个。

![image](https://user-images.githubusercontent.com/12036324/49914192-530d5900-fecb-11e8-9da0-abf4e8b20c7b.png)
<p align="center">联合类型——正确的使用对象字面量</p>


### 2. 不同通过类型别名定义的联合运算符继承interface


![image](https://user-images.githubusercontent.com/12036324/49914967-5bb35e80-fece-11e8-9e57-8ce13086f6ba.png)
<p align="center">第二个不同——联合定义类型不能被`interface`继承</p>

同样，这个类的实现相似， `interface`是一个“静态”图纸——它不能实现两个结构中的一个，所以它不能被联合类型合并继承。


### 3. 类型别名关键字不能声明合并

interface有声明合并，但是类型别名没有。

什么是声明合并？

你能定义多次相同的interface，这些定义将要合并为一个。

![image](https://user-images.githubusercontent.com/12036324/49916035-eea2c780-fed3-11e8-8e77-4ff5db8d9817.png)
<p align="center">声明合并</p>

这种方式对于类型别名就不成立，因为类型别名是独一无二的实体（对于全局和模块域）。

![image](https://user-images.githubusercontent.com/12036324/49916096-2d388200-fed4-11e8-8978-a1f6471df168.png)
<p align="center">第三个不同——类型别名不支持声明合并。</p>

当我们为没有使用Typescript创作的库写第三方环境定义的时候，通过interface的声明合并是非常重要的，如果一些定义没有的话，使用者可以选择性的扩展它。

如果我们的库是使用Typescript写的，并且自动生成环境定义则同样使用。

这是唯一的用例，你应该总是使用interface而不是类型别名。


## 我应该如何使用React的Props和State？

一般的，你要使用的一致就可以（无论使用类型别名还是interface），就我个人而言，我还是推荐使用*类型别名*：

- 书写起来更短`type Props = {}`
- 你的用法是统一的（你不用为了类型交叉而*interface*和*类型别名*混用）

``` typescript
// BAD
interface Props extends OwnProps, InjectedProps, StoreProps {}
type OwnProps = {...}
type StoreProps = {...}
// GOOD
type Props = OwnProps & InjectedProps & StoreProps
type OwnProps = {...}
type StoreProps = {...}


```

- 你组件公开的*props/state*不能被动态替换（译者注：因为原文作者这里说的
*monkey patched*翻译为动态替换 [what-is-monkey-patching](https://stackoverflow.com/questions/5626193/what-is-monkey-patching)），就这个原因，你组件的使用者就不能利用interface的声明合并。对于扩展应该有像HOC这样明确的模式。


## 总结

在这遍文章中我们学到了在*Typescript 2.7*中*interface*和*类型别名*的不同。

有了这个，我们得出在特定的场景中应该如何去定义编译类型的结论。

让我们来回顾一下：

- *类型别名* 能像*interface*一样，但是他们有三个重要的区别（联合类型，声明合并）
- 使用适合你或者你团队的东西，但是要保持一致
- 当你写个库或者定义第三方环境类型的时候，在公开的API中总是使用*interface*
- 在你的React组件的state/props中考虑使用*类型别名*



