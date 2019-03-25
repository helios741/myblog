## 泛型

### 1. 泛型的目的和介绍

泛型的目的有两个：*提供有意义的约束*和*加强类型安全*。

我们现在这一小结谈一谈*提供有意义的约束*，第二个问题我们在最后在说。

先上一段js的代码：

```javascript

const arr1 = []
arr1.push(true)
arr.push(3)

for (let item of arr1) {
  console.log(item)
  console.log(item.toFixed(2))
}// Uncaught TypeError: item.toFixed is not a function

```
已经为boolean是没有`toFixed`方法的，所以就会报错的。

当我们使用TS指定类型的时候，代码会是下面这个样子：

```javascript

const arr1: number[] = []
arr1.push(true) // Argument of type 'true' is not assignable to parameter of type 'number'.
arr.push(3)
```

这样在编译阶段就会报错，并不会等到运行时。

再来一段代码：让我们手动实现一下数组的`reverse`方法（这个方法在数组的原型上有）：

```javascript
function reverseArr(arr: number[]): number[] {

  const ret: number[] = [];
  for (let i = arr.length - 1; i >= 0; i--)
    ret.push(arr[i])

  return ret
}

const arr = reverseArr([1, 4, 6])

arr[0] = true // Type 'true' is not assignable to type 'number'.
```

同刚才说的，数组中的每个元素也都是只能是number类型的。那如果有一天我们想要字符串数组的反转，还得把number改为string？（这里得场景也可以用重载实现，因为这里主要介绍泛型，就不多说了），使用泛型得方式如下：

```javascript
function reverseArr<T>(arr: T[]): T[] {

  const ret: T[] = [];
  for (let i = arr.length - 1; i >= 0; i--)
    ret.push(arr[i])

  return ret
}

const arr1: number[] = reverseArr([1, 4, 6])
const arr2 = reverseArr<string>(['1', '4', '6']) // arr2: string[]
const arr3 = reverseArr(['1', '4', '6']) //   arr3: string[]
const arr4 = reverseArr([1, '4', '6']) //  arr4: (string | number)[]
arr3.push(4) // Argument of type '4' is not assignable to parameter of type 'string'.
arr4.push(1)
arr4.push('d')
```

这就体现出泛型的好处了，能指定类型。
`arr1`没有指定类型，TS是能推断（关于类型推断的东西，在后面会说）出来的；
`arr2`是通过`<string>`指定了类型；
`arr3`同`arr1`也是通过推断出来的；
`arr4`因为传递的参数`number`和`string`都有，所以就推断为`string | number)`


###  2. 泛型interface和泛型class

在上一小节我们介绍的时候简单介绍了泛型变量（声明`function reverseArr<T>(arr: T[]): T[] `的时候）。
那如果我们要把这个函数赋值给一个变量的时候，这个变量怎么指定类型呢？请看下面：

```javascript
const tmp: <T>(parms: T[]) => T[]  = reverseArr;

```

这样可能略显不清晰，当然也可以把`<T>(parms: T[]) => T[]`这部分声明为alias。我们也可以通过interface去声明，如下：

```javascript
interface IReverse {
  <T>(parms: T[]): T[]
}

const tmp: IReverse  = reverseArr;
```
当然我们还可以提前把`reverseArr`需要的类型传递了，如下：

```javascript
interface IReverse<T> {
  (parms: T[]): T[]
}

const tmp: IReverse<string>  = reverseArr;
```
上面的就属于泛型接口了。

对于泛型类也是同样的道理，直接如下：

```javascript
class Animals<T, U> {

  name: T;
  getMouseAndLegTotal: (m: U, l: U) => U;
}

const ani = new Animals<string, number>();  // 也可以把这里的number改为string，在实现的对应修改即可

ani.name = 'Dog'
ani.getMouseAndLegTotal = function (m: number, l: number) {
  return m + l
}
```

###  3. 泛型约束

虽然泛型解决了我们代码复用以及对类型的约束，但是我们有时候会觉得泛型有点*设计过度*了呢，比如我们下面这个函数：

```javascript
function gao<T>(param: T): T {
  console.log(param.name); // Property 'name' does not exist on type 'T'
  return param
}
gao({name: 'helios'})
gao({name: 'helios2', age: 23})
```
我们已经保证了，每次传入的参数肯定含有name这个属性，但是我们在gao这个函数中缺不能用。所以我们能*进一步的进行约束*，先看代码：

```javascript
interface IHaveName {
  name: string
}

function gao<T extends IHaveName>(param: T): T {
  param.name = 'helios'
  return param
}

gao({name: 'helios'})
gao({name: 'helios2', age: 23})
gao({ age: 23 }) 
//Argument of type '{ age: number; }' is not assignable to parameter of type 'IHaveName'.
// Object literal may only specify known properties, and 'age' does not exist in type 'IHaveName'.

```
`<T extends IHaveName>`这个的含义是：` IHaveName`必须是传入的类型的子集，也就是说T中必须包含` IHaveName`中的所有类型，如果不包含就会报上面代码块中`gao({ age: 23 }) `的错误。


在泛型中还能使用*类*类型，这里官网上的例子就很好了，我就直接粘过来了：

```javascript
class BeeKeeper {
    hasMask: boolean;
}

class ZooKeeper {
    nametag: string;
}

class Animal {
    numLegs: number;
}

class Bee extends Animal {
    keeper: BeeKeeper;
}

class Lion extends Animal {
    keeper: ZooKeeper;
}

function createInstance<A extends Animal>(c: new () => A): A {
    return new c();
}

createInstance(Lion).keeper.nametag;  // typechecks!
createInstance(Bee).keeper.hasMask;   // typechecks!

```

## 类型推断

Typescript能够根据自己规则去推断（没有声明类型的）变量的类型。

### 1. 类型推断的使用

基本的类型推断是很容易理解的：
比如：

```javascript

const fa = 8; // number
const str = ''// string

function add(a: number, b: number) {
  // function add(a: number, b: number): number
  return a + b
}

const adder: (a: number, b: number) => number = function (a, b) {
  // function (a, b) a,b就不用写类型了
  return a + b
}

```

 以上都是符合正常的逻辑，这里还有提一下在`tsconfig`中的`noImplicitAny `参数，如果这个参数不指定的话（默认值为false）如果遇到推断不出来的类型会设置为any；如果指定这个参数的话，如果ts推断不出来会报错，如下代码：

```javascript
function add2(a, b) { // 压根推断不出来
  return a + b
}

```

### 2. 介绍一下conditional type（有条件类型）

条件表达式和编程语言中三目运算符很像，形如：`T extends U ? X : Y`。
`T extends U `表示如果U是T的子集那么返回类型X如果不是返回类型Y。
看下面几个例子：

```javascript
interface IName {
  name: string
}

type typeName1<T> = T extends string ? string : object; 
type typeName2<T> = T extends IName ? IName : object; 

type typeNameA = typeName1<string> // string
type typeNameB = typeName1<number>// object
type typeNameC = typeName2<number>// object
type typeNameD = typeName2<{name: '32', age: 3}> // IName

```
条件类型的还能处理联合类型，有条件类型会分别处理联合类型中的每个类型，如下：

```javascript
type typeName1<T> = T extends string ? string : object; 
type typeNameE = typeName1<string | boolean> //  string | object
```


### 3. 谈一谈infer

我们有时候想知道一个函数定义（一个实际函数）的参数类型或者返回值，如下：

```javascript
// 函数
function getP(param1: string, param2: boolean) {
  return true
}
// 函数定义（别名）
type Func = (param: IParams) => boolean

```

如果我们想知道他们函数参数的类型怎么办呢？现在*infer*就可以登场了。

*infer*表示一个在conditional type中国待推断的类型（可以是extends后面，也可以在条件类型为true的分支中），可能语言比较枯燥，直接上代码吧：

```javascript
type GetReturnParam<T> = T extends (...param: infer U) => any ? U : never

type ret1 = GetReturnParam<Func> // [IParams]
type ret2 = GetReturnParam<typeof getP> //  [string, boolean]
```

`infer U`就代表去推断参数param的类型。如果是在true去返回这个类型。

那如果我们想要得到函数（函数定义的返回值）怎么办呢，上代码：

```javascript
type GetReturnType<T> = T extends (...param: any) => infer U ? U : never

type ret3 = GetReturnType<Func> // boolean
type ret4 = GetReturnType<typeof getP> //  boolean
```

只要把`infer`的位置换一下就可以了。
反正记住了**infer U放在哪就代表去推断哪里的类型**

在ts2.8中已经把*`ReturnType<T>`获取函数返回值类型。*集成进来了。

### 4[选看]. contravariant(抗变) 和 covariant（协变）


## 参考

- [协变与逆变](https://jkchao.github.io/typescript-book-chinese/tips/covarianceAndContravariance.html#%E4%B8%80%E4%B8%AA%E6%9C%89%E8%B6%A3%E7%9A%84%E9%97%AE%E9%A2%98)
- []