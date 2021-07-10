package binding

import (
	"fmt"
	"reflect"
	"testing"
	"time"
)

func TestMappingPtr(t *testing.T) {
	type User struct {
		Name           string     `form:"name"`
		Age            int        `form:"age"`
		Sex time.Time `form:"sex"`
	}
	fs := map[string][]string{"age": {"3"}, "name": {"dsdsd"}, "sex": {"2019-01-20T16:02:58Z"}}
	var user User
	if ok, err := mappingByPtr(&user, httpValues(fs)); err != nil {
		t.Error(err)
		t.Error(ok)
		return
	}
	t.Log(user)

}

func TestSettable2(t *testing.T) {
	type User struct {
		Age int `form:"age"`
	}
	type ReqT struct {
		Name string `form:"name"`
		User
	}
	var req ReqT
	v := reflect.ValueOf(&req).Elem()
	v.Field(0).SetString("Helios")
	v.Field(1).SetInt(25)
	fmt.Println(req)
}

func TestSettable1(t *testing.T) {
	var x float64 = 3.4
	v := reflect.ValueOf(&x).Elem()
	fmt.Println(v.CanSet()) // true
	v.SetFloat(8.7)
	fmt.Println(x) // 8.7
}
func TestAdressable(t *testing.T) {
	foo := func(inter *float64) {
		tmp := 4.3
		a := inter
		a = &tmp
		fmt.Println(a)
	}
	var outer = 9.9
	foo(&outer)
	fmt.Println(outer)
}


func TestSettable(t *testing.T) {
	//var a = 4
	//_ = &a
	//_ = &5
	var x float64 = 3.4
	var y *float64 = &x
	v := reflect.ValueOf(y)
	v.Elem().SetFloat(7.6)
	fmt.Println(*y)
}

func TestTimeReflect(t *testing.T) {
	type ReqT struct {
		Tim time.Time
	}
	r := ReqT{}
	vv := reflect.ValueOf(r)
	//vt := reflect.TypeOf(r)
	t.Log(vv.NumField(), vv.Kind())
}
