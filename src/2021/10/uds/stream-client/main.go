package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net"
	"strconv"
	"sync"
	"time"

	"go.uber.org/atomic"
)

var sockP = "/Users/helios/Desktop/helios/test-go/uds/client/unix.sock"

func main() {
	conn, err := net.Dial("unix", sockP)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()
	if _, err := conn.Write([]byte("Hello Server")); err != nil {
		log.Fatal(err)
	}
	var buf bytes.Buffer

	if _, err := io.Copy(&buf, conn) ; err != nil {
		log.Fatal(err)
	}
	fmt.Println(buf.String())
	//fmt.Println("response: ", buf.String(), i, buf.String()[:len(i)] == i )
}
