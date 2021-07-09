package binding

import (
	"log"
	"net/http"
)

type formBinding struct{}

func (fb formBinding) Name() string {
	return "form"
}

func (fb formBinding) Bind(request *http.Request, obj interface{}) error {
	ok, err := mappingByPtr(obj, httpValues(request.PostForm))
	if !ok {
		log.Printf("binding_formBinding_Bind mapping fail(%+v)!\n", err)
	}
	if err != nil {
		return err
	}
	return validate(obj)
	// TODO 这里优化的优先级比较高 @Helios
	//params := make(map[string]interface{})
	//for k, v := range request.PostForm {
	//	params[k] = strings.Join(v, ",")
	//}
	//b, err := json.Marshal(params)
	//if err != nil {
	//	return err
	//}
	//if err := json.Unmarshal(b, &obj); err != nil {
	//	return err
	//}
	//return nil
}



func setValueByForm() {

}