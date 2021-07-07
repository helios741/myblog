package binding

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type queryBinding struct{}


func (q queryBinding) Name() string {
	return "query"
}

func (q queryBinding) Bind(request *http.Request, obj interface{}) error {
	// TODO 这里优化的优先级比较高 @Helios
	//m := request.URL.Query()
	params := make(map[string]interface{})
	// TODO 这样以后只能是string了呀，必须抄gin优化一下
	for k, v := range request.URL.Query() {
		params[k] = strings.Join(v, ",")
	}
	b, err := json.Marshal(params)
	fmt.Println("formBinding_bind", string(b))
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &obj); err != nil {
		return err
	}

	return validate(obj)

}
