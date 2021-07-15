package he

import (
	"net/http"
)

var _ Router = (*router)(nil)

type HandlerFunc func(Context)
type router struct {
	rt *node
	mws []func(HandlerFunc) HandlerFunc
}

func (rout *router) Run(addr ...string) error {
	if len(addr) == 0 {
		return http.ListenAndServe(":8087", rout)
	}
	return http.ListenAndServe(addr[0], rout)
}

func (rout *router) With(handlers ...func(HandlerFunc) HandlerFunc) Router {
	// TODO 这样的话，就和顺序有关了，如果在这一行后面use，那就不管用了。算了，完成再完美吧。
	mws := append(rout.mws, handlers...)
	return &router{
		rt:  rout.rt,
		mws: mws,
	}
}

func (rout *router) Use(mws ...func(HandlerFunc) HandlerFunc) {
	// TODO 要字段让这个东西必须在前面
	rout.mws = append(rout.mws, mws...)
}

func (rout *router) handle(p prefix, method string, handler HandlerFunc) {
	p = prefix(formatURLPath(string(p)))
	for i := len(rout.mws) - 1; i >=0 ; i-- {
		handler = rout.mws[i](handler)
	}
	rout.rt.insert(p, method, handler)
}

func (rout *router) GET(path string, handler HandlerFunc) {
	rout.handle(prefix(path), "GET", handler)
}

// TODO 先用一个测试着，等跑通了在加
type Router interface {
	GET(path string, handler HandlerFunc)
	// TODO Use必须放在最前面，否则panic
	Use(mws ...func(HandlerFunc)HandlerFunc)
	ServeHTTP(w http.ResponseWriter, r *http.Request)
	With(...func(HandlerFunc) HandlerFunc) Router
	Run(addr ...string) error
}

func New() Router {
	return &router{rt: &node{}}
}

func formatURLPath(u string) string {
	var (
		result string
		preChar int32
	)
	for _, c := range u {
		if c == '/' && preChar == '/' {
			continue
		}
		result += string(c)
		preChar = c
	}
	if result[len(result) - 1] =='/' {
		return result[:len(result) - 1]
	}
	if result[0] != '/' {
		return "/" + result
	}
	return result
}


func (rout *router) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	params, handler, err := rout.rt.find(prefix(formatURLPath(r.URL.Path)), r.Method)
	if err != nil {
		panic(err)
	}
	//handler.ServeHTTP(w, r)
	//trueHandle := handlers[0]
	//for i := len(rout.mws) - 1; i >=0; i-- {
	//	handler = rout.mws[i](handler)
	//}
	c := &context{request: r, writer: w, params: params}
	handler(c)
}