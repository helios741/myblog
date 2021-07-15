package binding

import (
	"encoding/json"
	"errors"
	"net/http"
)

type jsonBinding struct{}

func (j jsonBinding) Name() string {
	return "json"
}

func (j jsonBinding) Bind(request *http.Request, obj interface{}) error {
	if request == nil || request.Body == nil {
		return errors.New("invalid request")
	}
	decoder := json.NewDecoder(request.Body)
	decoder.UseNumber()
	if err := decoder.Decode(obj); err != nil {
		return err
	}
	return nil
}

