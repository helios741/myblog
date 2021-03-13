package main

import (
	"os"
	"runtime/trace"
	"sync"
)


func main() {
	f, _ := os.Create("trace_slow.out")
	defer f.Close()
	trace.Start(f)
	defer trace.Stop()

	wg := sync.WaitGroup{}
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func(index int) {
			var m = make(map[int]interface{})
			for j := 0; j < 1000; j++ {
				m[i * 10 + j] = make([]float64, 200)
			}
			wg.Done()
		}(i)
	}
	wg.Wait()
}

