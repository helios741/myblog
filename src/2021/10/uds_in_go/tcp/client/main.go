package main

import (
	"fmt"
	"log"
	"net"
)
var sockP = "/tmp/unix.sock"

func main() {
	conn, err := net.Dial("unix", sockP)
	if err != nil {
		panic(err)
	}
	if _, err := conn.Write([]byte("hello server")); err != nil {
		log.Print(err)
		return
	}
	var buf = make([]byte, 1024)
	if _, err := conn.Read(buf); err != nil {
		panic(err)
	}
	fmt.Println("client recv: ", string(buf))
}

