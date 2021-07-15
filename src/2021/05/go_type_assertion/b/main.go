package main

import (
	"bytes"
	"fmt"
)

func BytesToBinaryString(bs []byte) string {
	buf := bytes.NewBuffer([]byte{})
	for _, v := range bs {
		buf.WriteString(fmt.Sprintf("%08b", v))
	}
	return buf.String()
}
func main() {
	a := "hello GoCN"
	// 32 71 111 67 78]
	// 00100000
	//110111101000111001000000110111101101100011011000110010000000000
	//01101000011001010110110001101100011011110010000001000111011011110100001101001110
	//1101000011001010110110001101100011011110010000001000111011011110100001101001110
	fmt.Println(BytesToBinaryString([]byte(a)))
}
