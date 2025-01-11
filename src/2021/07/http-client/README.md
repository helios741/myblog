



```go
func (t *Transport) roundTrip(req *Request) (*Response, error) {

	ctx := req.Context()
	origReq := req
	cancelKey := cancelKey{origReq}
	req = setupRewindBody(req)
	
  // 处理自定义协议
	if altRT := t.alternateRoundTripper(req); altRT != nil {
		if resp, err := altRT.RoundTrip(req); err != ErrSkipAltProtocol {
			return resp, err
		}
		// ...
	}
	// ...
	for {
		select {
		case <-ctx.Done():
			req.closeBody()
			return nil, ctx.Err()
		default:
		}


		// ...
		pconn, err := t.getConn(treq, cm)
		if err != nil {
			t.setReqCanceler(cancelKey, nil)
			req.closeBody()
			return nil, err
		}
		// ....
		resp, err = pconn.roundTrip(treq)
    

}

```



```go
func (t *Transport) getConn(treq *transportRequest, cm connectMethod) (pc *persistConn, err error) {
	req := treq.Request
	trace := treq.trace
	ctx := req.Context()

	w := &wantConn{
		cm:         cm,
		key:        cm.key(),
		ctx:        ctx,
		ready:      make(chan struct{}, 1),
		beforeDial: testHookPrePendingDial,
		afterDial:  testHookPostPendingDial,
	}


	// Queue for idle connection.
	if delivered := t.queueForIdleConn(w); delivered {
		pc := w.pc
	
		// set request canceler to some non-nil function so we
		// can detect whether it was cleared between now and when
		// we enter roundTrip
		t.setReqCanceler(treq.cancelKey, func(error) {})
		return pc, nil
	}

	cancelc := make(chan error, 1)
	t.setReqCanceler(treq.cancelKey, func(err error) { cancelc <- err })

	// Queue for permission to dial.
	t.queueForDial(w)

	// Wait for completion or cancellation.
	select {
	case <-w.ready:
		if w.err != nil {
			// If the request has been cancelled, that's probably
			// what caused w.err; if so, prefer to return the
			// cancellation error (see golang.org/issue/16049).
			select {
			case <-req.Cancel:
				return nil, errRequestCanceledConn
			case <-req.Context().Done():
				return nil, req.Context().Err()
			case err := <-cancelc:
				if err == errRequestCanceled {
					err = errRequestCanceledConn
				}
				return nil, err
			default:
				// return below
			}
		}
		return w.pc, w.err
	case <-req.Cancel:
		return nil, errRequestCanceledConn
	case <-req.Context().Done():
		return nil, req.Context().Err()
	case err := <-cancelc:
		if err == errRequestCanceled {
			err = errRequestCanceledConn
		}
		return nil, err
	}
}

```







----------

```go
package main

import (
	"io"
	"log"
	"net/http"
	_ "net/http/pprof"
)


func GetRedirectHost(baseHost string) string {
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},

	}
	res, err := client.Get(baseHost)
	if err != nil {
		return baseHost
	}

	if res.StatusCode != 301 && res.StatusCode != 302 {
		return baseHost
	}
	//defer res.Body.Close()
	return res.Header.Get("Location")
}


func main() {
	helloHandler := func(w http.ResponseWriter, req *http.Request) {
		for i := 0; i < 100; i++ {
			_ = GetRedirectHost("https://paas2-api.rtcqd.com:8443/2020-03-18/Accounts/download/6806126908213653504-2-204390215")
		}

		io.WriteString(w, "Hello, world!\n")
	}

	http.HandleFunc("/helios", helloHandler)
	go func() {
		log.Println(http.ListenAndServe(":6060", nil))
	}()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```

![image-20210723211511302](/Users/helios/Library/Application Support/typora-user-images/image-20210723211511302.png)

每次都是相同的域名，执行一百次多了一个goroutine。



```go
func GetRedirectHost(baseHost string) string {
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},

	}
	res, err := client.Get(baseHost)
	if err != nil {
		return baseHost
	}

	if res.StatusCode != 301 && res.StatusCode != 302 {
		return baseHost
	}
	//defer res.Body.Close()
	return res.Header.Get("Location")
}



func main() {
	helloHandler := func(w http.ResponseWriter, req *http.Request) {
		for i := 0; i < 100; i++ {
			u := GetRedirectHost("https://paas2-api.rtcqd.com:8443/2020-03-18/Accounts/download/6806126908213653504-2-204390215")
			GetRedirectHost(u)
		}

		io.WriteString(w, "Hello, world!\n")
	}

	http.HandleFunc("/helios", helloHandler)
	go func() {
		log.Println(http.ListenAndServe(":6060", nil))
	}()
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

![image-20210723211702828](/Users/helios/Library/Application Support/typora-user-images/image-20210723211702828.png)



不同的域名交替访问就多了201个goroutine。



```go
func GetRedirectHost(baseHost string) string {
	client := &http.Client{}
	res, err := client.Get(baseHost)
	if err != nil {
		return baseHost
	}

	if res.StatusCode != 301 && res.StatusCode != 302 {
		return baseHost
	}

	return res.Header.Get("Location")
}


func main() {
	helloHandler := func(w http.ResponseWriter, req *http.Request) {
		for i := 0; i < 100; i++ {
			_ = GetRedirectHost("https://paas2-api.rtcqd.com:8443/2020-03-18/Accounts/download/6806126908213653504-2-204390215")

		}

		io.WriteString(w, "Hello, world!\n")
	}

	http.HandleFunc("/helios", helloHandler)
	go func() {
		log.Println(http.ListenAndServe(":6060", nil))
	}()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```

![image-20210723211907412](/Users/helios/Library/Application Support/typora-user-images/image-20210723211907412.png)

还是206个goroutine，是符合直觉的。



```go
func GetRedirectHost(baseHost string) string {
	client := &http.Client{
		//CheckRedirect: func(req *http.Request, via []*http.Request) error {
		//	return http.ErrUseLastResponse
		//},

	}
	res, err := client.Get(baseHost)
	if err != nil {
		return baseHost
	}

	if res.StatusCode != 301 && res.StatusCode != 302 {
		return baseHost
	}
	//defer res.Body.Close()
	return res.Header.Get("Location")
}



func main() {
	helloHandler := func(w http.ResponseWriter, req *http.Request) {
		for i := 0; i < 100; i++ {
			u := GetRedirectHost("https://paas2-api.rtcqd.com:8443/2020-03-18/Accounts/download/6806126908213653504-2-204390215")

			GetRedirectHost(u)
		}

		io.WriteString(w, "Hello, world!\n")
	}

	http.HandleFunc("/helios", helloHandler)
	go func() {
		log.Println(http.ListenAndServe(":6060", nil))
	}()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```

![image-20210723212123896](/Users/helios/Library/Application Support/typora-user-images/image-20210723212123896.png)



下面的输出406个goroutine也是符合直觉的，那么问题就在问题就在为什么用重定向的重复搞一个url却只是增长一个呢？这个原因是因为http/2的服务会有流的cache。





