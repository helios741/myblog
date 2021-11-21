package main

import (
	"context"
	"log"
	"net"
	"net/http"
	_ "net/http/pprof"
	"runtime/pprof"
)

func main() {
	go func() {
		log.Fatal(http.ListenAndServe(":6060", nil))
	}()

	c, _ := net.Listen("tcp", ":8082")
	log.Fatal(http.Serve(c, &labelHandler{}))
}



type labelHandler struct {
	orig http.Handler
}


func (l *labelHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	labels := pprof.Labels("http-path", r.URL.Path)
	pprof.Do(r.Context(), labels, func(ctx context.Context) {
		switch r.URL.Path {
		case "/foo":
			cpuIntensive()
		case "/bar":
			cpuIntensive2()
		}
	})
}

func cpuIntensive() {

	for i := 0; i < 1e7; i++ {}
}

func cpuIntensive2() {
	for i := 0; i < 1e9; i++ {}
}