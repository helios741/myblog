package he

import (
	"net/http"

	"he/binding"
)

var _ Context = (*context)(nil)

type Context interface {
	Request() *http.Request
	Writer() http.ResponseWriter
	Bind(v interface{}) error
	BindQuery(v interface{}) error
	BindJson(v interface{}) error
}

type context struct {
	request   *http.Request
	writer    http.ResponseWriter
	params map[string]string
}

func (c context) Bind(v interface{}) error {
	b := binding.Default(c.request.Method,  c.request.Header.Get("Content-Type"))
	return b.Bind(c.request, v)
}

func (c context) BindQuery(v interface{}) error {
	return binding.Query.Bind(c.request, v)
}

func (c context) BindJson(v interface{}) error {
	b := binding.Default(c.request.Method,  binding.MIMEJSON)
	return b.Bind(c.request, v)
}

func (c context) Request() *http.Request {
	return c.request
}

func (c context) Writer() http.ResponseWriter {
	return c.writer
}

