# 重构的个人blog

## 后端

### 语言

node.js
<hr />

#### 采用理由

- 能够简单的支持高并发量，因为是基于V8引擎的，采用事件驱动，异步编程
- 因为服务器是使用最低配置的linux，资源匮乏，nodejs的非阻塞IO这是就表现出高性能和出众的负载能力
- 因为是blog系统，所以主要是数据的存取，没有太多的计算
- 虽然对PHP和java也算熟悉但是还是觉得javascript用起来爽

nodejs这个单线程机制既是好处也是坏处，因为单线程的话占用的服务器的资源会比较少。但是也是因为单线程程序中的一个部分挂掉了而且如果服务器是多核的话只用一个核也，对资源利用不当，整个应用也就挂掉了。当然也可以社区官方的`cluster`模块，开启多个实例充分利用CPU多核的优势。

### 框架

koa2
<hr />

待选择的框架在`express`和`koa`之间进行选择，上次的博客就是使用的`express`感觉还是不错的，`koa`的作者其实就是`express`的原班人马，`express`主要还是基于回调的，`koa1.x`主要是基于ES6中的`generator`，而`koa2`使用的是`async/await`。剩下的就是基本语法的差别的了，基本什么性能的问题了。

- 关于有关的区别可以看[这篇文章](https://yq.aliyun.com/articles/3062)还有[Koa 还是 Express](https://cnodejs.org/topic/55815f28395a0c1812f18257)对基本区别解释的不错。

### 数据库

mongodb
<hr />
- mongodb是文档性数据库，mySQL是关系型数据库，mongodb操作简单方便
- mongodb是每一个数据就是一个json对象，不用像MySQL那么样有严格的格式要求
- mongodb是和存放复杂的数据结构，比如说数组
- 使用nodejs操作起来比较方便

缺点:
- mongodb占用的空间特别大，当记录变化的时候会产生一些数据碎片

这篇文章以后还得看看[MySQL与MongoDB的区别](http://www.cnblogs.com/caihuafeng/p/5494336.html)

### 后台界面

使用react+react-router+ant-design暂时不确定会不会使用react-redux
<hr />

因为react也算是刚入门，知道react中有服务器渲染，至今还没有接触到。

## 前端

### 框架

使用react？vue？还是不用框架？
现在还没有决定好了，觉得如果是简单的前端页面不必使用繁重的前端框架，即使最小的才20+K，现在还是在筹划当中，还没有决定要不要使用了。

### 界面

- 界面的css就花点时间自己写就好了，现在前端基本都很少写css了，但是css还是属于前端的一大范围还是要熟悉的。
- 界面不用做的太花里胡哨，要的是简约而不简单
- 还是要遵循下面的规范：
	+ 左边：
		+ 上面是用户头像和信息
		+ 下面是文章的了列表什么的
	+ 右边：
		+ 最近的发表的n篇文章

## 前后端

目前准备采用react的服务器渲染

参考文章：
- [教你如何搭建一个超完美的React.js服务端渲染开发环境](http://react-china.org/t/react-js/10144)
- [服务器渲染小demo](https://github.com/chenxsan/react-server-render)
### 好处

1. SEC，让搜索引擎更容易读取页面的内容 sd
2. 首屏的渲染速度更快，无需等待js文件的下载执行过程
3. 更易于维护，前后端共享一部分代码

test
test
