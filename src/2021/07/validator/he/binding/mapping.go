package binding

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"reflect"
	"strconv"
	"strings"
	"time"
)



type mapping struct {
	tag string
	// 如果这里写死是某种类型就很难扩展了，比如data map[string][]string
	structData setter
}


var _ setter = (*httpValues)(nil)

type setter interface {
	setValue(value reflect.Value, field reflect.StructField, tag string, opt setOptions) (bool, error)
}

type httpValues map[string][]string

func (hv httpValues)getTagValue(tagName string) (string, bool) {
	content, ok := hv[tagName]
	if !ok {
		return "", false
	}
	return content[0], true
}

func (hv httpValues) setValue(value reflect.Value, field reflect.StructField, tag string, opt setOptions) (bool, error) {
	tagValue, ok := hv.getTagValue(tag)
	if !ok {
		return false, errors.New("no value for tag: " + tag)
	}

	// TODO 还要判断Slice、Array
	switch value.Kind() {
	case reflect.Int: // 所有number相关。。。
		i, err := strconv.Atoi(tagValue)
		if err != nil {
			return false, err
		}
		if value.CanSet() {
			value.SetInt(int64(i))
			return true, nil
		}
	case reflect.String:
		if value.CanSet() {
			value.SetString(tagValue)
			return true, nil
		}
	case reflect.Struct:
		fmt.Println(value.Interface())
		switch value.Interface().(type) {
		case time.Time:
			if err := setTimeField(tagValue, field, value); err != nil {
				return false, err
			}
		}
		if err := json.Unmarshal([]byte(tagValue), value.Addr().Interface()); err != nil {
			return false, err
		}
		return true, nil
	}
	return false, errors.New("not set for tag: " + tag)
}

func (m *mapping) tryMapping(value reflect.Value, field reflect.StructField) (bool, error) {
	if field.Tag.Get(m.tag) == "-" {
		return  false, nil
	}

	// 如果传递的是引用
	if value.Kind() == reflect.Ptr {
		if value.IsNil() {
			value = reflect.New(value.Type().Elem())
		}
		isSetted, err := m.tryMapping(value.Elem(), field)
		if isSetted && value.CanSet() {
			value.Set(value)
		}
		return isSetted, err
	}

	// 如果是嵌入的其他结构体，如果没有field.Anonymous的话，time.Time类型会失效
	if value.Kind() != reflect.Struct || !field.Anonymous {
		ok, err := m.setValue(value, field)
		if err != nil {
			log.Printf("[tryMapping_!field.Anonymous] error is %+v", err)
			return false, err
		}
		if ok {
			return true, nil
		}
	}

	// 如果是embedded field
	if value.Kind() == reflect.Struct {
		for i := 0; i < value.NumField(); i++ {
			m.tryMapping(value.Field(i), value.Type().Field(i))
		}
	}
	return true, nil
}

func (m *mapping) setValue(value reflect.Value, field reflect.StructField) (bool, error) {

	// 判断有没有tag
	tag := field.Tag.Get(m.tag)

	// 如果tag不存在，就用Field
	if tag == "" {
		tag = field.Name
	}
	if tag == "" {
		return false, errors.New("no form tag by"+ value.Type().Name())
	}
	// TODO 判断有没有默认值

	return m.structData.setValue(value, field, tag, setOptions{})

}

type setOptions struct {
	isDefaultExists bool
	defaultValue    string
}


func mappingByPtr(v interface{}, s setter) (bool ,error) {
	m := mapping{
		tag:        "form",
		structData: s,
	}
	return m.tryMapping(reflect.ValueOf(v), reflect.StructField{Anonymous: true})
}

func setTimeField(val string, structField reflect.StructField, value reflect.Value) error {
	timeFormat := structField.Tag.Get("time_format")
	if timeFormat == "" {
		timeFormat = time.RFC3339
	}

	switch tf := strings.ToLower(timeFormat); tf {
	case "unix", "unixnano":
		tv, err := strconv.ParseInt(val, 10, 64)
		if err != nil {
			return err
		}

		d := time.Duration(1)
		if tf == "unixnano" {
			d = time.Second
		}

		t := time.Unix(tv/int64(d), tv%int64(d))
		value.Set(reflect.ValueOf(t))
		return nil

	}

	if val == "" {
		value.Set(reflect.ValueOf(time.Time{}))
		return nil
	}

	l := time.Local
	if isUTC, _ := strconv.ParseBool(structField.Tag.Get("time_utc")); isUTC {
		l = time.UTC
	}

	if locTag := structField.Tag.Get("time_location"); locTag != "" {
		loc, err := time.LoadLocation(locTag)
		if err != nil {
			return err
		}
		l = loc
	}

	t, err := time.ParseInLocation(timeFormat, val, l)
	if err != nil {
		return err
	}

	value.Set(reflect.ValueOf(t))
	return nil
}