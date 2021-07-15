package binding

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
)

type queryBinding struct{
	ExtraParams map[string]string
}


func (q queryBinding) Name() string {
	return "query"
}

func (q queryBinding) mergeParams(params url.Values) httpValues {
	for k, v := range q.ExtraParams {
		params[k] = []string{v}
	}
	return httpValues(params)
}

func (q queryBinding) Bind(request *http.Request, obj interface{}) error {
	ok, err := mappingByPtr(obj, q.mergeParams(request.URL.Query()))
	if !ok {
		log.Printf("binding_queryBinding_Bind mapping fail(%+v)!\n", err)
		return errors.New(fmt.Sprintf("queryBinding_Bind fail, error is %+v", err))
	}
	if err != nil {
		return err
	}
	return validate(obj)
}
