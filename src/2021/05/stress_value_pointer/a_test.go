```
package main_test

import (
 "fmt"
 "os"
 "runtime"
 "runtime/trace"
 "testing"
)

func init() {
 //a := BlackCopy{}
 //fmt.Println(unsafe.Sizeof(a))
 runtime.GOMAXPROCS(4)
}
const TOTAL = 500
type BlackCopy struct {
 a [TOTAL]float64
}

func (bc BlackCopy)foo1() {
 for i :=0; i<TOTAL;i++ {
  bc.a[i] = 1.3
 }
}
func (bc *BlackCopy)foo2() {
 for i :=0; i<TOTAL;i++ {
  bc.a[i] = 1.3
 }
}

func BenchmarkCopy(b *testing.B) {
 f, _ := os.Create("copy.out")
 defer f.Close()
 //f1, _ := os.Create("copy-mem.pprof")
 //pprof.WriteHeapProfile(f1)
 trace.Start(f)
 defer trace.Stop()
 //f2, _ := os.Create("copy-cpu.pprof")
 //pprof.StartCPUProfile(f2)
 //defer pprof.StopCPUProfile()
 //var a = BlackCopy{}
 var a BlackCopy
 //fmt.Println(unsafe.Sizeof(a))
 for i := 0; i < b.N; i++ {
  for j:=0;j<1;j++{
   a = BlackCopy{}
   a.foo1()
  }
 }
 fmt.Sprintln(a)
}

func BenchmarkPointer(b *testing.B) {
 f, _ := os.Create("pointer.out")
 defer f.Close()
 //f1, _ := os.Create("pointer-mem.pprof")
 //pprof.WriteHeapProfile(f1)
 trace.Start(f)
 defer trace.Stop()
 //f2, _ := os.Create("pointer-cpu.pprof")
 //pprof.StartCPUProfile(f2)
 //defer pprof.StopCPUProfile()
 //var a = &BlackCopy{}
 var a *BlackCopy
 //fmt.Println(unsafe.Sizeof(a))
 for i := 0; i < b.N; i++ {
  for j:=0;j<1;j++{
   a = &BlackCopy{}
   a.foo2()
  }
 }
 fmt.Sprintln(a)
}

type T struct {
}
func (t T)foo(){}
func foo(t T){}

func (t *T)foo1(){}
func foo1(t *T){}
```