package main

import "fmt"

type Hello struct {
    Name string
}

func main() {
    var obj interface{}
    var h *Hello

    obj = h

    fmt.Println(obj==nil)
}
