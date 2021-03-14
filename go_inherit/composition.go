package main

type TokenType uint16

const (
	KEYWORD TokenType = iota
	IDENTIFIER
	LBRACKET
	RBRACKET
	INT
)

type Token struct {
	Type   TokenType
	Lexeme string
}

type IntegerConstant struct {
	Token *Token
	Value uint64
}

