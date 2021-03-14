package main

import (
"fmt"
)

type Pet struct {
	name string
}

type Dog struct {
	Pet
	Breed string
}

func (p *Pet) Play() {
	fmt.Println(p.Speak())
}

func (p *Pet) Speak() string {
	return fmt.Sprintf("【Pet】my name is %v", p.name)
}

func (p *Pet) Name() string {
	return p.name
}

func (d *Dog) Speak() string {
	return fmt.Sprintf("【Dog】%v and I am a %v", d.Pet.Speak(), d.Breed)
}

func Playy(p *Pet) {
	p.Play()
}