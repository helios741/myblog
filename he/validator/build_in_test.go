package validator

import (
	"reflect"
	"testing"
)

func TestHasValue(t *testing.T) {
	user := User{
		FirstName:      "Badger",
		LastName:       "Smith",
		Age:            135,
		Email:          "Badger.Smith@gmail.com",
		FavouriteColor: "#000-",
	}
	vv := reflect.ValueOf(user)
	t.Log(vv.String())
	for i := 0; i < vv.NumField(); i++ {
		v := vv.Field(i)
		t.Log(v.Type(), v.Kind(), v.String())
	}
}
