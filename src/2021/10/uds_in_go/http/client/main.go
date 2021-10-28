package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
)

var SockPath = "/tmp/a.sock"



func main() {

	fmt.Println("Unix HTTP client")
	httpc := http.Client{
		Transport: &http.Transport{
			DialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
				return net.Dial("unix", SockPath)
			},
		},
	}
	response, err := httpc.Get("http://unix" + "adsdsdsds")
	if err != nil {
		panic(err)
	}
	var buf = make([]byte, 1024)
	response.Body.Read(buf)
	fmt.Println("client resv: ", string(buf))
}