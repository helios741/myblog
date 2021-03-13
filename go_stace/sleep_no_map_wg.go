package main

import (
	"os"
	"runtime/trace"
	"time"
)


func main() {
	f, _ := os.Create("sleep_no_map_wg.out")
	defer f.Close()
	trace.Start(f)
	defer trace.Stop()
	for i := 0; i < 200; i++ {
		go func(index int) {
			var m = make(map[int]int)
			for j := 0; j < 1000; j++ {
				m[j] = j
			}
		}(i)
	}
	time.Sleep(3 * time.Second)
}

