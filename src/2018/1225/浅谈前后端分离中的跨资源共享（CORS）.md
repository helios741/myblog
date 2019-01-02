***
[首发地址](https://github.com/helios741/myblog/issues/30)

****


## 简介

当下无论大厂小厂的前后端开发模式都是前后端分离。以前遇到通过jsonp解决跨域的方式也渐渐的淡出的工程中（不了解jsonp的可以看[JSONP跨域请求+简答实现百度搜索](https://blog.csdn.net/woshinannan741/article/details/53957672)）。当前端请求一个接口的时候就会引起跨域，但是当下的前端构建工具都有相应的解决方案，比如*webpack*中*web-dev-server*这个插件，就能很简单的启一个本地的服务，然后发请求的时候通过启的本地服务去发送请求，这样就解决跨域问题的**一部分**了。这种情况下客户端代码和正常非跨域请求一摸一样，不用做任何改变。

上面说的方法只是解决了一部分，还有一部分我想大家可能或多或少的会遇到过，就是在登录场景的时候。服务端的*response*里面有*set-cookie*这个字段，在客户端中设置cookie，cookie里面可能包含着的*seesionID*表示的当前登录的用户/当前的登录状态（对这方面不理解的可以看[通过cookie和session让http协议变得有状态](https://blog.csdn.net/woshinannan741/article/details/72597969)）。当用户已经登录并且访问其他页面的时候，服务端会通过cookie中的信息去校验用户登录状态，如果请求中没有携带身份信息或者身份信息过期（服务端返回401/403）就会跳转到登录界面。这种情况如果在前后端联调的时候比较麻烦，因为上面方法解决的跨域是不会携带cookie的。目前有两种方法去解决这个：

1. 在登录之后拿到session/token每个请求都默认加上这个值（写死在代理中）
2. 在请求中增加withCredentials，服务端要设置对应的几个响应头，但是对服务端改动比较多。

综上： CORS的主要任务都落在服务端，但是如果为了联调服务端的开发代码和生产代码有区别，他们肯定是会不搞的。

## 背景

今天组里的实习生在使用*Axios*去验证登录的时候遇到了跨域的问题（前端是vue， 后端是Spring boot）。
一般的请求通过前端设置代理，服务端设置`Access-Control-Allow-origin:\* `就可以了，但是登录时候响应头里面要去set cookie就遇到了问题，结果由于对CORS跨域理解的不是很深刻，对预检请求不是很了解，就在axios的issues里面去搜，通过[Axios doesn't send cookies with POST and data](https://github.com/axios/axios/issues/876#issuecomment-300811444)定位到了问题，原来他后端写的拦截器里面自动把OPTIONS这个请求给过滤掉了，没有让走到后面的流程。

## 什么是CORS

CORS的出现是为了解决由于[浏览器的同源策略](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)带来的请求跨域问题。

“跨资源共享（Cross-Origin Resource Sharing(CORS)）是通过HTTP Response header来告诉浏览器，让运行在一个origin（domain）上的web应用被允许访问来自不同源服务器上指定的资源的一种机制。”

简单来说： CORS就是通过设置请求的响应头（能通过开发人员控制的基本都是服务端的响应头，客户端的也会有对应的请求头，但一般不会是开发人员去控制的，后面会仔细说）去控制是否允许某个origin的某个/些请求跨域。

## CORS的功能

CORS标准新增了一组HTTP首部字段，允许服务端声明哪些源站通过浏览器有权访问哪些资源。对于能对服务器产生副作用的HTTP非简单请求（non-simple request）（特别是除了GET请求以外的请求），浏览器必须首先发送一个方法为*OPTIONS*的一个预检请求（preflight request）来获取服务器是否允许该请求跨域。服务器得到确认之后，才发起真正的HTTP请求。在预检请求中，服务端也可以通知客户端是否要携带`Credentials`.


## CORS的三种请求

### 简单请求

某些请求是不会触发预检查请求的，这些请求被成为简单请求（simple request）。
如果一个请求满足下列的所有条件就可以被称为简单请求：

1. 使用下列的方法之一：
- GET
- HEAD
- POST

2. 除了浏览器自动设置的头，只能设置Fetch 规范允许设置的“[CORS安全请求头](https://fetch.spec.whatwg.org/#cors-safelisted-request-header)”
- Accept
- Accept-Language
- Content-Language
- Content-Type(需要注意额外的限制)
- [DPR](https://httpwg.org/http-extensions/client-hints.html#dpr)
- Downlink
- [Save-Data](https://httpwg.org/http-extensions/client-hints.html#save-data)
- [Viewport-Width](https://httpwg.org/http-extensions/client-hints.html#viewport-width)
- [width](https://httpwg.org/http-extensions/client-hints.html#width)

3. Content-Type的值只限于下面几个（注意没有*application/json*，现在post的请求经常使用这个，所以当发post请求的时候会触发预检请求不要意外）：
- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/plain`
4. 请求中的任意*XMLHttpRequestUpload*对象均没有注册任何时间监听器。*XMLHttpRequestUpload*对象可以使用*[XMLHttpRequest.upload](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload) *属性访问。
5. 请求中没有使用[ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)对象

### 预检请求

不满足上面定义的简单请求，都会发送预检请求。

比如浏览器要发送一个POST请求，*content-Type*为*application/json*，新增一个request header为X-TEST

预检请求的步骤：
1. 发送一个method为*OPTIONS*的请求，这个请求的目的是
  + 向服务器请求是否支持实际请求发送的方法（是否支持post方法）
  + 向服务器请求是否支持实际请求新增的header或者不满足简单请求的header
2. 如果服务器接受并正确返回就发送实际的post，并且能带上相应的header

### 携带credentials的请求

对于跨域（发生CORS）的请求默认是不会带上凭证信息（credentials）的，如果要发送凭证信息（credentials）就需要设置对应的标识位。

请求：
- 请求中要设置*withCredentials*为true。

响应：
- Access-Control-Allow-Credentials： true
- Access-Control-Allow-Origin的值不再是通配符*，应该是单一的origin。

HTTP规范规定`Access-Control-Allow-Origin`不能是通配符*并且只能是单一的`origin`。这是因为如果能设置多个的话，证明该服务器就能接受多个域名下面的cookie，这是很危险的。

## CORS中的请求头和响应头

### 响应头

#### Access-Control-Allow-Origin

`Access-Control-Allow-Origin: <origin> | * `

origin参数的值制定了允许访问服务器资源的外域URI。对于不需要携带身份凭证的请求，服务器可以指定这个字段的值为通配符*，表示允许来自所有域的请求。

#### Access-Control-Expose-Headers
该头信息服务器把允许浏览器访问的头放入白名单，例如：

`Access-Control-Expose-Headers: X-My-Custom-Header, X-Another-Custom-Header`
在跨域访问的时候，XHR对象的getResponseHeader()只能拿到一些最基本的响应头。

#### Access-Control-Max-Age

指定了预检请求（preflight）请求的结果能被缓存多久（秒为单位）。

#### Access-Control-Allow-Credentials

当浏览器的credentials设置为true时，是否允许浏览器读取response的内容

#### Access-Control-Allow-Methods

作为预检请求的响应头，指明了实际请求所允许的HTTP方法。

#### Access-Control-Allow-Headers

用于预检请求的响应。其指明了实际请求中允许携带的首部字段。
以逗号分割。

### 请求头

这些字段一般无需手动设置。

#### Origin

预检请求或实际请求的源站。

不包含任何路径，只是服务器的名称。（不管是否为跨域，这个字段都被发送。）

#### Access-Control-Request-Method

用于预检请求。其作用是，将实际请求所使用的 HTTP 方法告诉服务器。



## 参考

- [浏览器的同源策略](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)
- [Cross-Origin Resource Sharing (CORS) for MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [HTTP访问控制（CORS）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Access_control_CORS)
- [Cross-Origin Resource Sharing for W3C](https://www.w3.org/TR/cors)