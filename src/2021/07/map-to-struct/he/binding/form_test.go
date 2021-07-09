package binding

import (
	"fmt"
	"reflect"
	"strconv"
	"testing"
)

func mapping1(ptr interface{}, m  map[string]string) error {
	value := reflect.ValueOf(ptr).Elem()
	typ   := value.Type()
	fmt.Println(reflect.ValueOf(ptr).IsNil())
	for i := 0; i < value.NumField(); i++ {
		fieldValue := value.Field(i)
		fieldTyp := typ.Field(i)
		tag := fieldTyp.Tag.Get("form")
		fmt.Println("is an embedded field:", fieldTyp.Anonymous, fieldValue.Kind())
		switch fieldValue.Kind() {
		case reflect.Int:
			i, err := strconv.Atoi(m[tag])
			if err != nil {
				return err
			}
			if fieldValue.CanSet() {
				fieldValue.SetInt(int64(i))
			}
		case reflect.String:
			if fieldValue.CanSet() {
				fieldValue.SetString(m[tag])
			}
		}
	}
	return nil
}

func TestMapToStruct(t *testing.T) {
	type TT struct {
		Sex string `form:"sex"`
	}
	type User struct {
		Name           string     `form:"name"`
		Age            int      `form:"age"`
		TT
	}

	//fs := map[string][]string{"age": []string{"3"}, "name": []string{"dsdsd"}}
	fs := map[string]string{"age": "3", "name": "dsdsd", "sex": "man"}
	var user User
	if err := mapping1(&user, fs); err != nil {
		t.Error(err)
		return
	}
	t.Log(user.Sex)
}
