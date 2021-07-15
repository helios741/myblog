package main

import (
	"fmt"
	"strconv"
)

type Stringer interface {
	String() string
}

type Binary uint64

func (i Binary) String() string {
	return strconv.FormatUint(i.Get(), 3)
}

func (i Binary) Get() uint64 {
	return uint64(i)
}


func main() {
	var b interface{} = Binary(100)
	if s, ok := b.(Stringer); ok {
		fmt.Println(s.String())
	}
}
// go tool compile -S -N -l not_nil.go >main.s1 2>&1