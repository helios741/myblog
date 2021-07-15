package binding

import (
	"log"
	"net/http"
)

type queryBinding struct{}


func (q queryBinding) Name() string {
	return "query"
}

func (q queryBinding) Bind(request *http.Request, obj interface{}) error {
	ok, err := mappingByPtr(obj, httpValues(request.URL.Query()))
	if !ok {
		log.Printf("binding_queryBinding_Bind mapping fail(%+v)!\n", err)
	}
	if err != nil {
		return err
	}
	return validate(obj)
	// TODO 这里优化的优先级比较高 @Helios

}
