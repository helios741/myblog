package main

import (
	"fmt"
	"io"
	"runtime/pprof"
	"runtime/trace"
)

type S struct {
	c byte[]
}

func (s S)Write(p []byte) (n int, err error) {
	fmt.Println(string(p))
	return n, err
}

func main()  {
	var s S
	if err := trace.Start(s); err != nil {
		panic(err)
	}
	pprof.StartCPUProfile()
	trace

}
