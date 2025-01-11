package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"os"
)

var sockP = "/Users/helios/Desktop/helios/test-go/uds/client/unix.sock"
func main() {
	os.Remove(sockP)
	l, err := net.Listen("unix", sockP)
	if err != nil {
		log.Fatal(err)
	}
	defer l.Close()
	for {
		conn, err := l.Accept()
		fmt.Println("local addr: ", conn.LocalAddr().String())
		if err != nil {
			log.Fatal(err)
		}
		buf := make([]byte, 4096)
		n, err := conn.Read(buf)
		if err != nil && err != io.EOF {
			panic(err)
		}
		if err == io.EOF {
			fmt.Println("n:", n)
		}
		conn.Write([]byte("hello client"))
		conn.Close()
	}
}

