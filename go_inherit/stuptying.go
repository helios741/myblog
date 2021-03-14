package main

import "fmt"

type BaseIn interface {
	play()
	speak() string
}

type Son struct {
	BaseIn
	name string
}

type Man struct {
	age int
}

func (m *Man) play() {
	fmt.Println(m.speak())
}

func (m *Man) speak() string {
	return fmt.Sprintf("[man] speak age: %d", m.age)
}


func PlayIn(b BaseIn) {
	b.play()
}