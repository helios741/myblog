package main

import (
	"fmt"
	"unsafe"
)
type tflag uint8
type nameOff int32
type typeOff int32
type T struct {
	size       uintptr
	ptrdata    uintptr // size of memory prefix holding all pointers
	hash       uint32
	tflag      tflag
	align      uint8
	fieldAlign uint8
	kind       uint8
	// function for comparing objects of this type
	// (ptr to object A, ptr to object B) -> ==?
	equal func(unsafe.Pointer, unsafe.Pointer) bool
	// gcdata stores the GC type data for the garbage collector.
	// If the KindGCProg bit is set in kind, gcdata is a GC program.
	// Otherwise it is a ptrmask bitmap. See mbitmap.go for details.
	gcdata    *byte
	str       nameOff
	ptrToThis typeOff
}

func foo(unsafe.Pointer, unsafe.Pointer) bool {
	return true
}
type name struct {
	bytes *byte
}
type imethod struct {
	name nameOff
	ityp typeOff
}

type interfacetype struct {
	mhdr    []imethod
}

func main() {
	a := interfacetype{}
	fmt.Println(unsafe.Sizeof(a))
	//var a = T{
	//	size:       0,
	//	ptrdata:    0,
	//	hash:       0,
	//	tflag:      0,
	//	align:      0,
	//	fieldAlign: 0,
	//	kind:       0,
	//	equal:      foo,
	//	gcdata:     nil,
	//	str:        0,
	//	ptrToThis:  0,
	//}
	//fmt.Println("size: ", unsafe.Sizeof(a.size))
	//fmt.Println("ptrdata: ", unsafe.Sizeof(a.ptrdata))
	//fmt.Println("hash: ", unsafe.Sizeof(a.hash))
	//fmt.Println("tflag: ", unsafe.Sizeof(a.tflag))
	//fmt.Println("align: ", unsafe.Sizeof(a.align))
	//fmt.Println("fieldAlign: ", unsafe.Sizeof(a.fieldAlign))
	//fmt.Println("equal: ", unsafe.Sizeof(a.equal))
	//fmt.Println("gcdata: ", unsafe.Sizeof(a.gcdata))
	//fmt.Println("str: ", unsafe.Sizeof(a.str))
	//fmt.Println("ptrToThis: ", unsafe.Sizeof(a.ptrToThis))

}
