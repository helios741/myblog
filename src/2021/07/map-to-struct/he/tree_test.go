package he

import (
	"fmt"
	"testing"
)

func TestTree(t *testing.T) {
	tr := &node{}

	hIndex := HandlerFunc(func(c Context) {})
	hFavicon := HandlerFunc(func(c Context) {})
	tr.insert("/", "GET",  hIndex)
	tr.insert("/favicon.ico","GET",  hFavicon)
	tr.insert("/friends","GET",  hIndex)
	tr.insert("/friends/:id","GET",  hIndex)
	tr.insert("/friends/:id/classes","GET",  hIndex)
	tr.insert("/friends/:id/classes/:classID","GET",  hIndex)

	tests := []struct {
		prefix prefix
		method string
		params map[string]string
		fail bool
	}{
		//{"/", "GET", nil, false},
		//{"/favicon.ico", "GET", nil, false},
		//{"/aaa", "GET", nil, true},
		{"/friends", "GET", nil, false},
		{"/friends/3434", "GET", nil, false},
		{"/friends/3434/classes", "GET", nil, false},
		{"/friends/3434/classes/dsdsdd", "GET", nil, false},
	}
	for _, test := range tests {
		_, handler, err := tr.find(test.prefix, test.method)
		if test.fail && err != nil {
			continue
		}
		if err != nil {
			t.Errorf("[TestTree_find] method: %s, path: %s error: %+v", test.method, test.prefix, err)
			return
		}
		if handler != nil {
			t.Logf("success for method: %s, path: %s, handler is %+v", test.method,test.prefix, handler)
		}
	}

}


func TestMap(t *testing.T) {
	a := map[string]string{"name": "aaa"}
	b := a
	a["name"] = "aaaa"
	fmt.Println(b)
}