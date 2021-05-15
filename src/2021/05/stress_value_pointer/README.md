# 使用值还是指针



## 值和指针的区别

我在[GO语言初学八小问](https://mp.weixin.qq.com/s/brhd_jyIdIuoxkOVJyIwAA)中已经提到了指针和值的区别，以及如何取舍：

1. 如果接受者（Receiver）是map、func、chan那么就不要用指针。
2. 如果接受者（Receiver）是slice，对应的方法不会对slice进行充分赋值或者重新分配，那么不要用指针
3. 如果接受者（Receiver）需要被修改，那么必须是指针
4. 如果接受者（Receiver）包含sync.Mutex这类的同步原语，则必须是指针，避免复制
5. 如果接受者（Receiver）是个比较大的结构体，那么传递指针更有效率。但是多大算大，你说的算。
6. 如果接受者（Receiver）是slice、map或者struct，里面的元素包含指针，修改元素包含的指针是会影响外部的，为了读者理解最好使用指针
7. 如果接受者（Receiver）是int、string这些基本类型，不会对他们修改就传递值吧
8. 如果上面都没解决你的疑问，那么就用指针就好了

八条你只要记住最重要的第4条和第8条就行。

## 如何选择

现在就要从*知道*转换为*如何用*的步骤了。





### 结构体不同大小下的benchmark

![image-20210515134249222](/Users/helios/Library/Application Support/typora-user-images/image-20210515134249222.png)





因为上面都是循环一次不利于抓pprof，我们循环10w次然后抓下pprof：

#### 执行调用图



值作为receiver的：

![image-20210515140331442](/Users/helios/Library/Application Support/typora-user-images/image-20210515140331442.png)

指针作为receiver的：

![image-20210515140407350](/Users/helios/Library/Application Support/typora-user-images/image-20210515140407350.png)

这是时候值传递的每次copy就会耗费大量的时间了，而指针却几乎没有。



#### 函数执行时间占比

值传递：

![image-20210515140658058](/Users/helios/Library/Application Support/typora-user-images/image-20210515140658058.png)

指针传递：

![image-20210515140716795](/Users/helios/Library/Application Support/typora-user-images/image-20210515140716795.png)

值传递不仅上面的duffcopy时间过长，在mstart的时间的占比也比指针传递高不少，mstart指的是系统线程的执行时间，因为要copy所以系统线程执行的时间长也就正常了。

#### 火焰图

值传递

![image-20210515142451065](/Users/helios/Library/Application Support/typora-user-images/image-20210515142451065.png)

指针传递

![image-20210515142508242](/Users/helios/Library/Application Support/typora-user-images/image-20210515142508242.png)

值传递真正执行的时间只占总时间的68%而指针传递占总时间的87.5%这样的结果就不言自明了



### 频繁创建值/指针

这个基本不用压测，

值传递：

![image-20210515143227901](/Users/helios/Library/Application Support/typora-user-images/image-20210515143227901.png)

指针传递：

![image-20210515143441232](/Users/helios/Library/Application Support/typora-user-images/image-20210515143441232.png)





## 总结



