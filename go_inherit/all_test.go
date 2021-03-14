package main

import (
	"testing"
)

func TestCompositon(t *testing.T) {
	ic := IntegerConstant{Token: &Token{Type: 23, Lexeme: "lexeme"}, Value: 2333}
	t.Logf("token lexeme is %s, inter contstant is: %d", ic.Token.Lexeme, ic.Value)
}

func TestInheritanceInterface(t *testing.T) {
	icin := IntegerConstantIn{&Match{"KEYWORD", "wizard"}, 4343}
	t.Logf("Type is: %s, Lexeme is: %d, icin value: %s, IntegerConstantIn: %s", icin.Lexeme(), icin.Value(), icin.Type(), icin.IntegerConstantIn())

}

func TestInheritanceStruct(t *testing.T) {
	a := Animal{
		name: "kity",
	}
	c := Cat{Animal: a, age: 23}
	c.eat()
	c.say()

}

func TestOverridding(t *testing.T) {
	// 反直觉
	d := Dog{Pet: Pet{name: "spot"}, Breed: "pointer"}
	d.Play()
}

func TestStuptying(t *testing.T) {
	p := &Pet{name: "helios"}
	Playy(p)
	// error: Cannot use 'd' (type *Dog) as type *Pet
	//d := &Dog{Pet: Pet{name: "spot"}, Breed: "pointer"}
	//Playy(d)
}

func TestStuptyingInc(t *testing.T) {
	s := &Son{&Man{age: 34}, "helios"}
	PlayIn(s)
}