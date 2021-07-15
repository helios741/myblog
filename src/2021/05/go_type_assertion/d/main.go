package main

import "fmt"

func main()  {
	var obj interface{}
	type Hello struct {
		Name string
	}
	var hel *Hello
	obj = hel
	fmt.Println(obj == nil)
}
//1、 eface和iface的顺序调整一下，讲完eface再说iface
//2、 将"interface的用法"改为"那么iface结构呢"
//3、 在开始说一下go的环境
//4、 第5之前加一张PPT过渡下，说明接下来要说的是interface的数据结构，同理第8之前加一张说明接下来要说interface的用法
// 5、
