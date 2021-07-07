package binding

import (
	"encoding/json"
	"net/http"
	"strings"
)

type formBinding struct{}

func (fb formBinding) Name() string {
	return "form"
}

func (fb formBinding) Bind(request *http.Request, obj interface{}) error {
	// TODO 这里优化的优先级比较高 @Helios
	params := make(map[string]interface{})
	for k, v := range request.PostForm {
		params[k] = strings.Join(v, ",")
	}
	b, err := json.Marshal(params)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &obj); err != nil {
		return err
	}
	return nil
}
