package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"time"
)

var (
	rSockP = "/tmp/runix.sock"
	lSockP = "/tmp/lunix.sock"
)


func main() {
	os.Remove(lSockP)
	raddr, err := net.ResolveUnixAddr("unixgram", rSockP)
	if err != nil {
		panic(err)
	}

	laddr, err := net.ResolveUnixAddr("unixgram", lSockP)
	if err != nil {
		panic(err)
	}
	conn, err := net.DialUnix("unixgram", laddr, raddr)
	conn.SetDeadline(time.Now().Add(time.Second))
	if err != nil {
		log.Fatal("[DialUnix] error: ", err)
		return
	}
	if _, err = conn.Write([]byte("hello udp server")); err != nil {
		log.Fatal("[Write] error: ", err)
		return
	}

	var buf = make([]byte, 2048)
	_, err = conn.Read(buf)
	if err != nil {
		log.Fatal("[Read] error: ", err)
		return
	}

	fmt.Println("udp client recv:", string(buf))
}


