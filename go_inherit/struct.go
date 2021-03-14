package main

import "fmt"

type Animal struct {
	name string
}

func (a *Animal)eat(n string) {
	fmt.Println("Animal eat" + n)
}
func (a *Animal)sleep() {
	fmt.Println("Animal sleep")
}

type Cat struct {
	Animal
	age int
}

func (c Cat) eat()  {
	fmt.Println("Cat eat")
}
func (c Cat) say() {
	fmt.Println("i am a cat")
}
