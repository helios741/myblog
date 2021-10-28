package main
import (
	"fmt"
	"io"
	"log"
	"net"
	"os"
)

var sockP = "/tmp/unix.sock"

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
		go func(c net.Conn) {
			for {
				buf := make([]byte, 20)
				_, err := c.Read(buf)
				if err != nil && err != io.EOF {
					c.Close()
					break
				}
				if err == io.EOF {
					break
				}
				fmt.Println("recv: ", string(buf))
				c.Write([]byte("hello client"))
			}
			c.Close()
		}(conn)

	}
}
