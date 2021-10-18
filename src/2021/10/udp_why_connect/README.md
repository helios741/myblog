# 为什么UDP需要建连



最近在用Go程序写udp服务的时候，有一次服务端忘记启动了，直接启动的客户端发现如下错误：

```shell
2021/10/17 11:54:59 read udp 127.0.0.1:53913->127.0.0.1:6060: recvfrom: connection refused
```

我的内心还是尴尬的，因为这和课本上讲的不一样。

TODO 加图

udp不是无连接的么，为什么还会出现`connection refused`呢

本文会按照先解密在分析的思路来讲解这个问题。



注⚠️：

1、 强烈推荐看这边文章(https://ops.tips/blog/udp-client-and-server-in-go/)。从UDP的使用到各个函数的原理分析都很细致。

2、 本文的所有代码在原文同级目录均有



## 结论

说结论之前需要我们先看C语言实现UDP的client和server的代码：

server.c

```c

```



容错

效率



## UDP原理

![Lightbox](./udpfuncdiag.png)

图from：https://www.geeksforgeeks.org/udp-server-client-implementation-c/



一些特点：

1、Unlike [`net.ListenTCP`](https://pkg.go.dev/net#ListenTCP), which returns a `net.Listener`, the [`net.ListenUDP`](https://pkg.go.dev/net#ListenUDP) function directly returns a `net.Conn`, implemented by `net.UDPConn`. 

2、read/readfrom、write/writeto

3、  In Golang, there is no way to turn a non-connected UDPConn into a connected `net.UDPConn` without going through the `syscall` interface. Therefore, only `WriteTo` can write data through a connection opened by `net.ListenUDP`.







## Go的标准UDP程序



server.go

```go
func main() {
	udpAddr, err := net.ResolveUDPAddr("udp4", "localhost:6000")
	if err != nil {
		log.Fatal(err)
	}


	conn, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		log.Fatal(err)
	}

	for {
		buffer := make([]byte, 4096)
		n, addr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			log.Fatal(err)
		}

		message := buffer[:n]
		_, err = conn.WriteToUDP(message, addr)

		if err != nil {
			log.Println(err)
		}
	}

}
```



client.go

```go
func main() {
	RemoteAddr, _ := net.ResolveUDPAddr("udp", "localhost:6060")

	conn, err := net.DialUDP("udp", nil, RemoteAddr)
	if err != nil {
		log.Fatal("dial", err)
	}
	defer conn.Close()
	_, err = conn.Write([]byte("hello"))
	if err != nil {
		log.Fatal("write:", err)
	}

	buffer := make([]byte, 4096)
	_, _, err = conn.ReadFromUDP(buffer)
	if err != nil {
		log.Fatal("read:", err)
	}

	fmt.Println(string(buffer))
}
```









## 建连的消耗



对比一下几组数据：

| 建连方式                    | 耗时   | 代码                                   |
| --------------------------- | ------ | -------------------------------------- |
| udp over loopback           | 14 µs  | net.DialUDP("udp", nil, RemoteAddr)    |
| udp over unix domain socket | 55 µs  | net.DialUnix("unixgram", laddr, raddr) |
| tcp over loopback           | 119 µs | net.Dial("tcp", ":8089")               |
| tcp over unix domain socket | 37 µs  | net.Dial("unix", "/tmp/a.sock")        |



https://colobu.com/2016/10/19/Go-UDP-Programming/



## 总结