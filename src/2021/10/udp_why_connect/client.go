package main

import (
	"log"
	"net"
)


func main() {

	RemoteAddr, _ := net.ResolveUDPAddr("udp", "localhost:6060")
	conn, err := net.DialUDP("udp", nil, RemoteAddr)
	if err != nil {
		log.Fatal(err)
	}
	_, err = conn.Write([]byte("hello"))
	if err != nil {
		log.Fatal("write:", err)
	}

	buffer := make([]byte, 4096)
	_, _, err = conn.ReadFromUDP(buffer)
	if err != nil {
		log.Fatal("read:", err)
	}


}



