package main

import (
	"io"
	"log"
	"net"
)

func main() {
	l, err := net.Listen("tcp", ":8887")
	if err != nil {
		panic(err)
	}

	for {
		conn,err := l.Accept()
		if err != nil {
			panic(err)
		}
		go func(c net.Conn) {
			//runtime.LockOSThread()
			for {
				buf := make([]byte, 1024)
				n, err := c.Read(buf)

				if err != nil && err != io.EOF {
					log.Printf("[conn_read] err: %+v \n", err)
					break
				}
				if err == io.EOF {
					break
				}
				content := string(buf)[:n]

				c.Write([]byte(content))
			}
			err := c.Close()
			if err != nil {
				log.Printf("close error: %+v \n", err)
			}
		}(conn)


	}
}

