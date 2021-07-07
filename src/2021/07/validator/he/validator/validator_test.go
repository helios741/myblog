package validator

import (
	"fmt"
	"testing"
)
type Address struct {
	Street string `validate:"required"`
	City   string `validate:"required"`
	Planet string `validate:"required"`
	Phone  string `validate:"required"`
}
type User struct {
	FirstName      string     `validate:"required"`
	LastName       string     `validate:"required"`
	Age            uint8      `validate:"gte=0,lte=130"`
	Email          string     `validate:"required,email"`
	FavouriteColor string     `validate:"iscolor"`                // alias for 'hexcolor|rgb|rgba|hsl|hsla'
	Addresses      []*Address `validate:"required,required"` // a person can have a home and cottage...
}
func TestValidate_Struct(t *testing.T) {
	v := New()
	address := &Address{
		Street: "Eavesdown Docks",
		Planet: "Persphone",
		Phone:  "none",
	}
	user := &User{
		FirstName:      "Badger",
		//LastName:       "Smith",
		Age:            135,
		Email:          "Badger.Smith@gmail.com",
		FavouriteColor: "helios",
		Addresses:      []*Address{address},
	}
	v.RegisterValidation("iscolor", isColor)
	if err := v.Struct(user); err != nil {
		t.Error(err)
		return
	}
	t.Log("success")
}

func isColor(fp FieldParam) bool {
	fmt.Println(fp.Field().String())
	return fp.Field().String() == "helios"
}

func TestValidate_Struct1(t *testing.T) {
	v := New()
	user := &User{
		FirstName:      "helios",
		Age:            0,
	}
	if err := v.Struct(user); err != nil {
		t.Error(err)
		return
	}
	t.Log("success")
}