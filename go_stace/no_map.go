package main

import (
	"os"
	"runtime/trace"
	"sync"
)


func main() {
	//
	f, _ := os.Create("trace_no_map.out")
	defer f.Close()
	trace.Start(f)
	defer trace.Stop()

	wg := sync.WaitGroup{}
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func(index int) {
			var m = make(map[int]int)
			for j := 0; j < 1000; j++ {
				m[j] = j
			}
			wg.Done()
		}(i)
	}
	wg.Wait()
}

