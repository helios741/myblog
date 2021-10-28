package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
)

var SockPath = "/tmp/a.sock"


type Ser struct {}

func (s Ser) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	rw.Write([]byte("hello client"))

}
func main() {
	fmt.Println("Unix HTTP server")
	os.Remove(SockPath)
	server := http.Server{
		Handler: Ser{},
	}
	unixListener, err := net.Listen("unix", SockPath)
	if err != nil {
		panic(err)
	}
	server.Serve(unixListener)
}