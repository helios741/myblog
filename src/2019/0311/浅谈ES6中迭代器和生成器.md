*****************************

[文章首发](https://github.com/helios741/myblog/issues/35)

*****************************


本文已经默认你已经知道`generator`是什么以及`for...of`和数据类型`map`怎么用了。

## 前ES6的时代怎么遍历

先来一道思考题：

通过下面的变量
1. 寻找xiaohong(假设名称唯一)是否喜欢basketball
2. 所有同学的名字

```javascript

const students = {
    xiaohong: {
        age: '22',
        fav: ['sleep', 'basketball'],
        teachers: {
            english: 'daming',
            chinense: 'helios',
            math: ['helios2', 'helios3']
        }
    },
    xiaoming: {
        age: '22',
        fav: ['sleep', 'basketball', 'football'],
        teachers: {
            english: 'daming',
            chinense: 'helios',
            math: ['helios2', 'helios3']
        }
    },
}

```

对于第一个问题来说，我们可以使用各种循环语句：
**for/while**

```javascript

for (let i =0 ;i < students[xiaoming].fav.length; i++) {
  if (students[xiaoming].fav[i] === 'basketball') console.log(true)
}


let i = 0;
while(i++ < students[xiaoming].fav.length) {
  if (students[xiaoming].fav[i] === 'basketball') console.log(true)
}

```

**for...of**

```javascript

for (let item of students[xiaoming].fav ) {
  if (item === 'basketball') console.log(true)
}

```

那么对于第二个问题来说，因为`for/while`是不能遍历对象的，所以行不通，但是**对象有一个专属的遍历方法**
`for...in`

我们来看一下怎么通过**for...in**来遍历：

```javascript

for (let stu in students) {
   console.log(stu)
}

```

你可能会想了，通过`for...in`去遍历数组会怎样呢？
我们看一下通过`for...in`去遍历：

```javascript
for (let item in students[xiaoming].fav) {
   console.log(item)
  // 或者去判断
}

```

哎呀，通过`for...in`不也照样能实现数组的遍历么，那为什么不归结到数组的遍历里面去呢！
这里面还有一些细节需要去了解（这也是上面的“对象有一个专属的遍历方法”为什么加粗），我们通过一段代码去解释：


```javascript

const num = [5, 6, 7]
for (let i in  num) {console.log(i + 1)}

// 01
// 11
// 21

```

这是因为`for-in` 是为普通对象({key: value})设计的，所以只能遍历到字符串类型的键。

还有下面这个虽然不常用，但是也是不得不说的：

```javascript

const arr = [5, 6, 7]
arr.foo = function() {}
for (let i in arr) {
    console.log(i)
}

// 5
// 6
// 7
// foo !!!

```

`foo`属于arr上面的方法，被遍历出来是说的过去的。

那么用`for...of`我们来看看会怎么样

```javascript

for (let stu of students){}
// Uncaught TypeError: students is not iterable

```

**is not iterable**，这个`iterable`是神马东西，我们接下来下面一步步的看。

## 先从可迭代（iterable）和迭代器（iterator）说起

*iterable*是ES6对iteration（迭代/遍历）引入的接口。

如果一个对象被视为iterable（可迭代）那么它一定有一个`Symbol.iterator`属性，这个属性返回一个iterator（迭代器）方法，这个方法返回一个规定的对象（这个后面会说）。也就是说`iterable`是`iterator`的工厂，`iterable`能够创建`iterator`。`iterator`是用于遍历数据结构中元素的指针。

### 两者之间的关系

Axel Rauschmaye大神的图简直不能再清晰了。
![image](https://user-images.githubusercontent.com/12036324/54081241-3e125b80-433c-11e9-9db7-a33fe9cb9e64.png)

*数据消费者*： javascript本身提供的消费语句结构，例如for...of循环和spread operator (...) 
*数据源*： 数据消费者能够通过不同的源（Array，string）得到供数据消费者消费的值；

让*数据消费者*支持所有的*数据源*这是不可以行的，因为还可能增加新的*数据消费者*和*数据源*。因此ES6引入了`Iterable`接口**数据源去实现，数据消费者去使用**


### 可迭代协议（iterable protocol）和迭代器协议（iterator protocol）


#### 可迭代协议（iterable protocol）

*可迭代协议（iterable protocol）* 是允许js对象能够自定义自己的迭代行为。

简单的说只要对象有`Symbol.iterator`这个属性就是可迭代的，我们可以通过重写（一些对象实现了iterable，比如Array，string）/添加（对于没有实现iterable的对象比如object，可以添加这个属性，使之变为可迭代的）该熟悉使之变为可迭代的。

当一个对象需要被迭代（for...of 或者 spread operator ）的时候，他的`Symbol.iterator`函数被调用并且无参数，然后返回一个迭代器。

#### 迭代器协议（iterator protocol）

*迭代器*协议定义了一种标准的方式来产生一个有限或无限序列的值。

当一个对象被认为是一个迭代器的时候，它会至少实现`next()`方法，`next()`方法返回两个属性`value`(d迭代器返回的值)和`done`（迭代时候已经结束）。

还有几个可选的方法可以被实现，具体请看：[sec-iterator-interface](https://www.ecma-international.org/ecma-262/6.0/#sec-iterator-interface)

#### *iterable协议*，*iterator协议*还有*next*之间的关系

![image](https://user-images.githubusercontent.com/12036324/54080684-74e27480-4330-11e9-9e03-166dc26e92dc.png)
<center>来源于网络</center>



## 然后谈谈ES6中的for...of说起

再文章的最开始我们已经说了再前ES6的时候，如何去遍历。
现在我们说说ES6新增的`for...of`的作用。

### for...in

在前面也已经说了，在ES6之前遍历object的时候用`for...in`循环，`for...in`会遍历对象上所有可枚举的值（包括原型(prototype)上的属性），比如下面这样：

```javascript
function foo() {
    this.name = 'helios'
}

foo.prototype.sayName = function() {
    return this.name;
}
var o = new foo();
for (var i in o) {
    console.log(i)
}
// name
// sayName
```

如果我们只想遍历对象自身的属性，可以使用`hasOwnProperty`，如下：

```javasacript

function foo() {
    this.name = 'helios'
}

foo.prototype.sayName = function() {
    return this.name;
}
var o = new foo();
for (var i in o) {
    if (!o.hasOwnProperty(i)) continue;
    console.log(i)
}
```

如果我们不想让一个对象的属性，在`for...in`中不被遍历出来，可是使用`Object.defineProperty`来定义对象上的属性是否可别枚举（更多的属性请看：[Object.defineProperty()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)），具体如下面代码：

```javascript
var obj = {name: 'helios'}

Object.defineProperty(obj, 'age', {
    enumerable: false
})

for (var i in obj) {
    console.log(i)
}

```

在这一小节的最后我们来说说`for...in`中的in操作符的含义：

`prop in obj`：
- 含义： 判断prop是否在obj中
- prop：对象的key属性的类型（string / Symbol）
- 返回值： boolean

我们来看一组例子：

```javascript
var o = {
    name: 'heliso'
}
console.log('name' in o) // true
console.log(Symbol.iterator in o) // false
console.log('toString' in o)  // true

```


这个操作符虽然也适用于数组，但是尽量还是不要用在数组中，因为会比较奇怪,如下代码：

```javascript
var arr = [6, 7,8]

console.log(7 in arr)  // false
console.log(1 in arr)  // true
console.log('length' in arr)  // true

```

主要是前两个比较奇怪对不对，因为对于数组`prop`代表的是数组的索引而为其存在的值。
按照这样的思路，正在看的读者你能思考一下`in`操作符在字符串中是怎么的模式么？


### for...of能遍历的集合

只要是实现了`Interable`接口的数据类型都能被遍历。

javascript内部实现的有：
- Array
- String
- Map
- Set
- arguments
- DOM data structures

并不是所有的iterable内容都来源于数据结构，也能通过在运行中计算出来，例如所有ES6的主要数据结构有三个方法能够返回iterable对象。

- entries() 返回一个可遍历的entries
- keys() 返回一个可遍历的 entries 的keys。
- values() 返回一个可遍历的 entries 的values。

### 如果for...of不能遍历怎么办

那就数据结构（数据源）去实现iterable就可以了。

用通俗的话说就是，你如果要遍历一个对象的话，有一下几个步骤：

1. 对象如果没实现`Symbol.iterator`那就去实现
2. 对象的`Symbol.iterator`函数要返回一个`iterator`
3.  `iterator`返回一个对象，对象中至少要包含一个next方法来获取
4. next方法返回两个值`value`和`done`

## 现在说说怎么使object变为可迭代的

上面我们已经铺垫了这么多了，我们说了javascript中object是不能被迭代了，因为没有实现`iterable`，现在让我们来实践一下让object变的可迭代。

### 第一步： 先尝试着使用for...of遍历object

下面这样写肯定是不行的

```javascript

const obj = {
    name: 'helios',
    age: 23
}

for (let it of obj) {
    console.log(it)
}
// TypeError: obj is not iterable
```

### 第二步： 让object实现iterable接口

```javascript

const obj = {
    name: 'helios',
    age: 23,
    [Symbol.iterator]: function() {
        let age = 23;
        const iterator = {
            next() {
                return {
                    value: age,
                    done: age++ > 24
                }
            }
        }
        return iterator
    }
}

```

如果`iterable`和`iterable`是一个对象的话，上面的代码可以简化为：

```javascript

function iterOver() {
    let age = 23;
    const iterable = {
        [Symbol.iterator]() {return this},
        next() {
            return {
                value: age,
                done: age++ > 24
            }
        }
    }

    return iterable
}

for (let i of iterOver()) {
    console.log(i)
}
```


## 现在生成器（generator）可以出场了

我们如果每次想把一个不能迭代的对象变为可迭代的对象，在实现`Symbol.iterator`的时候，每次都要写返回一个对象，对象里面有对应的next方法，next方法必须返回valua和done两个值。

这样写的话每次都会很繁，好在ES6提供了generator（生成器）能生成迭代器，我们来看简化后的代码：

```javascript

const obj = {
    name: 'helios',
    age: 23,
    [Symbol.iterator]: function* () {
        while (this.age <= 24) yield this.age++
    }
}

for (let it of obj) {
    console.log(it)
}

```


## 让object可迭代真的有意义么

知乎的这个回答是很有水平的了：[为什么es6里的object不可迭代？](https://www.zhihu.com/question/50619539)

在stackoverflow中也有很高质量的回答：[Why are Objects not Iterable in JavaScript?](https://stackoverflow.com/questions/29886552/why-are-objects-not-iterable-in-javascript)

在上面的回答中从技术方面说了为什么Object不能迭代（没有实现iterable），还说了以什么样的方式去遍历Object是个难题，所以把如何迭代的方式去留给了开发者。

但是还是要思考的一个问题就是：**我们真有必要去迭代对象字面量么？**

想一下我们要迭代对象字面量的什么呢？是`keys`还是`values`亦或者是`entries `，这三种方式在ES6提供的新的数据类型map里面都有呀，完全是可以代替object的。在这里不说`object`和`map`的区别，只是说说在ES6以后我们想把两个事物关联起来的时候，不一定要非得是用`对象字面量`了，`map`支持的更好一下。

对于什么时候用对象字面量（object）什么时候使用map我们可以做一下总结：

- 对象字面量（object）应该是静态的，也就是说我们应该已经知道了里面有多少个，和对象的属性有什么

- 使用对象字面量（object）的一般场景有：
  + 不需要去遍历对象字面量（object）的所有属性的时候
  + 我们知道了里面有多少个属性和对象的属性是什么的时候
  + 需要去`JSON.stringify`和`JSON.parse`时候
- 其他的情况用map，其他的情况包括：
  + key不是字符串或者symbol的时候
  + 需要去遍历的时候
  + 要得到长度的时候
  + 遍历的时候对顺序有要求的（对象字面量（object）可能不是按照你写的顺序）

也并不说是`map`就肯定比对象字面量（object）好，`map`也有如下的缺点：

- 不能使用对象解构
- 不能`JSON.stringify`/`JSON.parse`


## 参考

- [25.1.1.1 The Iterable Interface](https://www.ecma-international.org/ecma-262/6.0/#sec-iterable-interface)
- [Maps vs Objects in ES6, When to use?](https://stackoverflow.com/questions/32600157/maps-vs-objects-in-es6-when-to-use)
- [Iterables and iterators in ECMAScript 6](http://2ality.com/2015/02/es6-iteration.html)
- [【翻译】Iterables and iterators in ECMAScript 6](http://www.voidcn.com/article/p-fzsecwem-boz.html)
- [Maps vs Objects in ES6, When to use?](https://stackoverflow.com/questions/32600157/maps-vs-objects-in-es6-when-to-use)
- [迭代协议](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols)
- [ES6 你可能不知道的事 - 进阶篇](http://taobaofed.org/blog/2016/11/03/es6-advanced/)
- [深入浅出 ES6（二）：迭代器和 for-of 循环](https://infoq.cn/article/es6-in-depth-iterators-and-the-for-of-loop)
- [深入浅出 ES6（三）：生成器 Generators](https://infoq.cn/article/es6-in-depth-generators)
- [Javascript ES6 Iterators建议指南（含实例）](https://www.zcfy.cc/article/a-simple-guide-to-es6-iterators-in-javascript-with-examples)
