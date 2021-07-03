package router

import (
	"fmt"
	"net/http"
)

var _ Router = (*router)(nil)

type router struct {
	rt *node
}

func (rout *router) handle(p prefix, method string,handler http.HandlerFunc ) {
	rout.rt.insert(p, method, handler)
	fmt.Println("dsds")
}

func (rout *router) GET(path string, handler http.HandlerFunc) {
	rout.handle(prefix(path), "GET", handler)
}

type Router interface {
	GET(path string, handler http.HandlerFunc)
	ServeHTTP(w http.ResponseWriter, r *http.Request)
}

func New() Router{
	return &router{rt: &node{}}
}


func (rout *router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.URL)
	params, handler,  err := rout.rt.find(prefix(r.URL.String()), r.Method)
	if err != nil {
		panic(err)
	}
	fmt.Println(params)
	handler.ServeHTTP(w, r)
}