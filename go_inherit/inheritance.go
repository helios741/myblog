package main

type TokenIn interface {
	Type()   string
	Lexeme() string
	IntegerConstantIn() string
}



type Match struct {
	toktype string
	lexeme  string
}


type IntegerConstantIn struct {
	TokenIn
	value uint64
}
func (m *Match) Type() string {
	return m.toktype
}
func (m *Match) IntegerConstantIn() string {
	return "IntegerConstantIn"
}
func (m *Match) Lexeme() string {
	return m.lexeme
}


func (i *IntegerConstantIn) Value() uint64 {
	return i.value
}