package main

import (
	"os"
	"runtime/trace"
)


func main() {
	f, _ := os.Create("trace_no_map.out")
	defer f.Close()
	trace.Start(f)
	defer trace.Stop()
	var ch = make(chan struct{})
	for i := 0; i < 200; i++ {
		go func(index int) {
			var m = make(map[int]int)
			for j := 0; j < 1000; j++ {
				m[j] = j
			}
			if index == 199 {
				ch <- struct{}{}
			}
		}(i)
	}
	<- ch
}

