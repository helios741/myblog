# 深入剖析go的类型断言



## 常见用法



### 一、扩展行为



### 二、分类错误



### 三、保持兼容性



## 原理

### 示例代码

类型断言demo代码：

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
	return strconv.FormatUint(i.Get(), 3)
}

func (i Binary) Get() uint64 {
	return uint64(i)
}

func main() {
	var b Stringer = Binary(100)
	if s, ok := b.(Stringer); ok {
		fmt.Println(s.String())
	}
}
```

从上面代码可以看出，我们得出下面三个信息

1、 定义了这包含一个方法（`String() string`）的interface取名为 Stringer。

2、 定义了Binary类型，包含` String() string `和`Get() uint64`两个方法

3、 因为golang duck typing机制，Binary默认实现了Stringer

在main函数中断言Binary是否实现了Stringer。

### Binary初始化

分析`var b Stringer = Binary(100)`这句

```assembly
LEAQ  go.itab."".Binary,"".Stringer(SB), AX     // AX = go.itab{inter: Stringer, _type: Binary}
MOVQ  AX, "".b+88(SP)                           // SP + 88 = AX
LEAQ  ""..stmp_0(SB), AX                        // AX = 100
MOVQ  AX, "".b+96(SP)                           // SP + 96 = 100
```

### ![image-20210531120303086](/Users/helios/Library/Application Support/typora-user-images/image-20210531120303086.png)

### 类型断言的发生原理

分析`s, ok := b.(Stringer)`这句，这句分为三部分，第一部分为断言之前的参数准备，第二部分是断言的实现，第三部分是断言之后



#### 断言之前的准备



```assembly
XORPS X0, X0
MOVUPS  X0, ""..autotmp_3+136(SP)      // reset SP + 136
MOVQ  "".b+96(SP), AX                   // AX = SP + 96 = 100
MOVQ  "".b+88(SP), CX                   // CX = SP + 88 = *itab
LEAQ  type."".Stringer(SB), DX          // DX = _type(Stringer)
MOVQ  DX, (SP)                          // SP = DX = _type(Stringer)
MOVQ  CX, 8(SP)                         // SP + 8 = CX = *itab
MOVQ  AX, 16(SP)                        // SP + 16 = AX = 100
CALL  runtime.assertI2I2(SB)            // assertI2I2(SP, SP+8 ～ SP+16)
```

![image-20210531134015804](/Users/helios/Library/Application Support/typora-user-images/image-20210531134015804.png)

可以看到我们在栈顶放了三个字数据：

1、第一个字是*interfacetype对应的是`type."".Stringer(SB)`，

2、第二个字是*itab，里面存的是我们在上一步初始化Binary时候的itab

3、 第三个字是100这个值

#### 断言的实现



这个步骤是为调用 runtime.assertI2I2准备参数，来看下这个函数的实现：

```go
func assertI2I2(inter *interfacetype, i iface) (r iface, b bool) {
	tab := i.tab
	if tab == nil {
		return
	}
	if tab.inter != inter {
		tab = getitab(inter, tab._type, true)
		if tab == nil {
			return
		}
	}
	r.tab = tab
	r.data = i.data
	b = true
	return
}
```

这个函数比较简单，就是判断inter和iface.tab.inter是否是一个，如果相同则返回true并返回新的iface对象。 runtime.assertI2I2返回的对象的会放在SP+24、SP+32、SP+40中，SP+24～SP+32一共16个字节代表的是iface对象（SP+24表示*itab，SP+32表示data），SP+40表示bool值，所以只占用1字节。

![image-20210531114920771](/Users/helios/Library/Application Support/typora-user-images/image-20210531114920771.png)

iface结构是这样的。

#### 断言之后



```assembly
MOVBLZX 40(SP), AX                // AX = bool?
MOVQ  24(SP), CX                  // CX = iface.itab
MOVQ  32(SP), DX                  // DX = iface.data
MOVQ  CX, ""..autotmp_3+136(SP)   // SP + 136 = CX = iface.itab
MOVQ  DX, ""..autotmp_3+144(SP)   // SP + 144 = DX = iface.data=100
MOVB  AL, ""..autotmp_4+55(SP)    // SP + 55 = AL = bool?
MOVQ  ""..autotmp_3+144(SP), AX   // AX = SP + 144 = iface.data
MOVQ  ""..autotmp_3+136(SP), CX   // CX = SP + 136 = iface.itab=100
MOVQ  CX, "".s+72(SP)             // SP + 72 = iface.itab
MOVQ  AX, "".s+80(SP)             // SP + 80 = iface.data=100
MOVBLZX ""..autotmp_4+55(SP), AX  // AX = SP + 55 = bool?
MOVB  AL, "".ok+54(SP)            // ok = SP + 54 = AL = bool?
CMPB  "".ok+54(SP), $0            // ok == 0?
JNE 200
JMP 392
JMP 376
NOP
```

![image-20210531135849796](/Users/helios/Library/Application Support/typora-user-images/image-20210531135849796.png)



如果ok为true的话，就跳转到200这个地址，如果是false的话，就跳转到392，我们来分别看看那200、392、376这几行分别是什么：

```assembly
0x00c8 00200 (not_nil.go:25)	MOVQ	"".s+72(SP), AX
0x0188 00392 (not_nil.go:24)	JMP	376
0x0178 00376 (<unknown line number>)	MOVQ	176(SP), BP
0x0180 00384 (<unknown line number>)	ADDQ	$184, SP
0x0187 00391 (<unknown line number>)	RET
```

简单来说就是如果ok为true就跳转到第25行（200地址位置），如果为false就会结束掉程序（RET）。







## 总结

