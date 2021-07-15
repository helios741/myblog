package main

import (
	"io"
)
//go:noinline
func output(w io.ReadWriter) (n int, err error) {
	_, _ = w.Read([]byte("hello GoCN"))
	return w.Write([]byte("hello GoCN"))
}

type writer1 struct {
	id string
}
//go:noinline
func (w writer1) Write(p []byte) (n int, err error) {
	return 1, nil
}
//go:noinline
func (w writer1) Read(p []byte) (n int, err error) {
	return 1, nil
}
type writer2 struct {
}
//go:noinline
func (w writer2) Write(p []byte) (n int, err error) {
	return 1, nil
}
//go:noinline
func (w writer2) Read(p []byte) (n int, err error) {
	return 1, nil
}

func main() {
	var w1 io.ReadWriter = writer1{id: "GoCN"}
	var w2 io.ReadWriter = writer2{}
	_, _ = output(w1)
	_, _ = output(w2)
}