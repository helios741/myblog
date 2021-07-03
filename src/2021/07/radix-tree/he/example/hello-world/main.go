package main

import (
	"io"
	"net/http"

	"he/router"
)

func main() {
	r := router.New()
	helloHandler := func(w http.ResponseWriter, req *http.Request) {
		io.WriteString(w, "Hello, world!\n")
	}
	r.GET("/frends/:id/helios", helloHandler)
	r.GET("/frend/:id/helios", helloHandler)
	r.GET("/frend/:id", helloHandler)
	err := http.ListenAndServe(":8087", r)
	panic(err)
}
