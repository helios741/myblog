package validator

import (
	"bytes"
	"fmt"
	"reflect"
	"strings"
)

const (
	fieldErrMsg = "Error:Field validation for '%s' failed on the '%s' tag， msg: %s"
)

var  _ FieldError = (*fieldError)(nil)
type ValidationErrors []FieldError

func (ve ValidationErrors) Error() string {
	buff := bytes.NewBufferString("")

	for i := 0; i < len(ve); i++ {
		buff.WriteString(ve[i].Error())
		buff.WriteString("\n")
	}

	return strings.TrimSpace(buff.String())
}
type FieldError interface {

	Tag() string

	StructField() string

	Value() interface{}

	Param() string

	Kind() reflect.Kind

	Type() reflect.Type

	Error() string

	Ns() string
}

type fieldError struct {
	tag            string
	param          string
	ext            string
	ns             string
	val            reflect.Value
	typ            reflect.StructField
}

func (fe fieldError) Ns() string {
	return fe.ns
}

func (fe fieldError) Tag() string {
	return fe.tag
}
func (fe fieldError) Msg() string {
	return fe.ext
}


func (fe fieldError) Field() string {
	return fe.typ.Name
}

func (fe fieldError) StructField() string {
	return fe.typ.Name
}

func (fe fieldError) Value() interface{} {
	return fe.val.Interface()
}

func (fe fieldError) Param() string {
	return fe.param
}

func (fe fieldError) Kind() reflect.Kind {
	return fe.val.Kind()
}

func (fe fieldError) Type() reflect.Type {
	return fe.val.Type()
}

func (fe fieldError) Error() string {
	return fmt.Sprintf(fieldErrMsg, fe.Ns() +"_" + fe.Field(), fe.Tag(), fe.Msg())
}

