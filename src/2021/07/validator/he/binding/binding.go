package binding

import "net/http"

// Content-Type MIME of the most common data formats.
const (
	MIMEJSON              = "application/json"
	MIMEHTML              = "text/html"
	MIMEXML               = "application/xml"
	MIMEXML2              = "text/xml"
	MIMEPlain             = "text/plain"
	MIMEPOSTForm          = "application/x-www-form-urlencoded"
	MIMEMultipartPOSTForm = "multipart/form-data"
	MIMEPROTOBUF          = "application/x-protobuf"
	MIMEMSGPACK           = "application/x-msgpack"
	MIMEMSGPACK2          = "application/msgpack"
	MIMEYAML              = "application/x-yaml"
)

type Binding interface {
	Name() string
	Bind(*http.Request, interface{}) error
}

var (
	JSON          = jsonBinding{}
	Form          = formBinding{}
	Query         = queryBinding{}
)


func Default(method, contentType string) Binding {
	if method == http.MethodGet {
		return Form
	}
	switch contentType {
	case MIMEJSON:
		return JSON
	default: // case MIMEPOSTForm:
		return Form
	}
}
