package main

func main() {
	var b Stringer = Binary(100)
	switch b.(type) {
	case Stringer:
		b.String()
	case Binary:
		b.String()
	}
}
