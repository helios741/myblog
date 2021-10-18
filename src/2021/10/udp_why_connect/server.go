package main

import (
"log"
"math/rand"
"net"
"time"
)


func main() {
	udpAddr, err := net.ResolveUDPAddr("udp4", "localhost:6060")
	if err != nil {
		log.Fatal(err)
	}


	conn, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		log.Fatal(err)
	}

	for {
		buffer := make([]byte, 4096)
		_, addr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			log.Fatal(err)
		}
		go func(c *net.UDPConn, a *net.UDPAddr) {
			dur := time.Duration(rand.Intn(45) + 15)
			time.Sleep(dur)
			_, err = c.WriteToUDP([]byte("nice to meet you"), a)

			if err != nil {
				log.Println(err)
			}
		}(conn, addr)

	}

}
