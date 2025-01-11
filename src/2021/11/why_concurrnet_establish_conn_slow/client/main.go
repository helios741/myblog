package main

import (
	"fmt"
	"net"
	"sync"
	"time"
)

var mu sync.Mutex
var connPool []net.Conn

func main() {
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			t1 := time.Now()
			conn, err := getConn()
			//fmt.Printf("[%d]conn duration: %+v \n", i,time.Since(connStart))
			if err != nil {
				panic(err)
			}
			//writeStart := time.Now()
			if _, err := conn.Write([]byte("hello, helios")); err != nil {
				panic(err)
			}
			//fmt.Printf("[%d]write time: %+v \n",i,  time.Since(writeStart))
			//readStart := time.Now()
			var buf = make([]byte, 1024)
			if _, err = conn.Read(buf); err != nil {
				panic(err)
			}
			addConn(conn)
			//fmt.Printf("[%d] read duration: %+v \n", i, time.Since(readStart))
			fmt.Println(time.Since(t1))
		}()


		}
	wg.Wait()
	fmt.Println("conn count: ", len(connPool))
}


func getConn() (net.Conn, error){
	mu.Lock()
	defer mu.Unlock()
	l := len(connPool)
	if l == 0 {
		conn, err := net.Dial( "tcp", ":8887")
		return conn, err
	}

	result := connPool[l-1]
	connPool = connPool[0: l-1]
	return result, nil
}


func addConn(c net.Conn) {
	mu.Lock()
	defer mu.Unlock()
	connPool = append(connPool, c)
}


func init() {
	for i := 0; i < 50; i++ {
		conn, err := net.Dial( "tcp", ":8887")
		if err !=nil {
			panic(err)
		}
		connPool = append(connPool, conn)
	}
}