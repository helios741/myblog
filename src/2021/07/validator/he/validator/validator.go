package validator

import (
	"fmt"
	"reflect"
	"strings"
)

type Validator interface {
	RegisterValidation(tagName string, p Func)
	SetTagName (tagName string)
	Struct(s interface{}) error
}

type validate struct {
	tagName            string
	splitStr           string
	errs               ValidationErrors
	builtInValidations map[string]Func
}

const (
	defaultTagName = "validate"
	defaultSplit = ","
)

type Func func(v FieldParam) bool

type field struct {
	parent string
	name  string    // Age Name
	value reflect.Value
	typ   reflect.StructField
	tags  []*tag
}

type tag struct {
	tagName              string   // gte    required
	param                string   // 34     ""
	fn                   Func     // func   func
	hasParam             bool     // true    bool
}

func New() Validator{
	v := &validate{tagName: defaultTagName, splitStr: defaultSplit}
	// 把required这类内置的tag注册进来
	v.builtInValidations = make(map[string]Func)
	for tag, handler := range buildInValidators {
		v.builtInValidations[tag] = handler
	}
	return v
}


// 给某个tag添加自定义方法
func (v *validate) RegisterValidation(tagName string, fn Func) {
	v.builtInValidations[tagName] = fn
}

func (v *validate) parseTag(tagStr string ) (tags []*tag){
	if len(tagStr) < 1 {
		return nil
	}
	tagItems := strings.Split(tagStr, v.splitStr)

	for _, item := range tagItems {
		t := &tag{
			tagName:  item,
			param:    "",
			fn:       v.builtInValidations[item],
			hasParam: false,
		}
		if strings.Contains(item, "=") {
			t.hasParam = true
			param := strings.Split(item, "=")
			t.param = param[1]
			t.tagName = param[0]
			t.fn = v.builtInValidations[t.tagName]
		}
		tags = append(tags, t)
	}

	return tags
}

func (v *validate) SetTagName (tagName string) {
	v.tagName = tagName
}
func (v *validate) Struct(s interface{}) error {
	v.validateStruct(s)
	return v.errs
}

func (v *validate) validateStruct(s interface{}) {
	val := reflect.ValueOf(s)
	typ := reflect.TypeOf(s)
	if val.Kind() == reflect.Ptr && !val.IsNil() {
		val = val.Elem()
		typ = val.Type()
	}
	// 遍历整个struct得到Field
	for i := 0; i < val.NumField(); i++ {
		fieldValue := val.Field(i)
		fieldType := typ.Field(i)
		tag := fieldType.Tag.Get(v.tagName)
		v.validateFiled(&field{
			parent: typ.Name(),
			name:  fieldType.Name,
			value: fieldValue,
			typ:   fieldType,
			tags:  v.parseTag(tag), //  得到每个Field的所有tag
		})
	}
}

func (v *validate) validateFiled(fd *field)  {
	fp := &fieldParams{
		fieldValue: fd.value,
		param: "",
	}
	if fd.value.Kind() == reflect.Ptr {
		fd.value = fd.value.Elem()
	}
	if fd.value.Kind() == reflect.Struct {
		v.validateStruct(fd.value.Interface())
	}
	for _, t := range fd.tags {
		if t.hasParam {
			fp.param = t.param
		}
		fe := &fieldError{
			ns:    fd.parent,
			tag:   t.tagName,
			param: "",
			val:   fd.value,
			typ:   fd.typ,
		}
		if t.fn == nil {
			fe.ext = "not register method for " + t.tagName
			v.errs = append(v.errs, fe)
			return
		}
		if ok := t.fn(fp); !ok {
			v.errs = append(v.errs, fe)
			return
		}
	}
	if fd.value.Kind() == reflect.Array || fd.value.Kind() == reflect.Slice {
		for i := 0; i < fd.value.Len(); i++ {
			childFieldValue := fd.value.Index(i)
			f := &field{
				name:  fmt.Sprintf("%s_%d", childFieldValue.String(), i),
				value: childFieldValue,
				typ:   fd.typ,
			}
			v.validateFiled(f)
		}
	}
}
