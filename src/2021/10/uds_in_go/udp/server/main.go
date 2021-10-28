package main

import (
	"net"
	"fmt"
	"os"
)


var sockP = "/tmp/runix.sock"
func recvUnixMsg(conn *net.UnixConn) {
	var buf = make([]byte, 2048)

	_, raddr, err := conn.ReadFromUnix(buf)
	if err != nil {
		return
	}
	fmt.Println("udp recv: ", string(buf))
	conn.WriteToUnix(buf, raddr)

}

func main() {
	os.Remove(sockP)
	laddr, err := net.ResolveUnixAddr("unixgram", sockP)
	if err != nil {
		panic(err)
	}

	conn, err := net.ListenUnixgram("unixgram", laddr)
	if err != nil {
		panic(err)
	}
	for {
		recvUnixMsg(conn)
	}
}
