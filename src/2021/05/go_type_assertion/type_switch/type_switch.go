package main

import "strconv"

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

func foo(a interface{}) {
	switch a.(type) {
	case Stringer:

	}
}

func main() {
	var b Stringer = Binary(100)
	switch b.(type) {
	case Stringer:
		b.String()
	case Binary:
		b.String()
	}
}

// go tool compile -S -N -l type_switch.go >main.s2 2>&1
