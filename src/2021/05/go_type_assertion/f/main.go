package main

import (
	"fmt"
	"net/http"
)

func main() {
	baseHost := "https://paas2-api.rtcqd.com:8443/2020-03-18/Accounts/download/6806061657413701632-2-993984948"
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	res, err := client.Get(baseHost)
	if err != nil {
		panic(err)
	}
	if res.StatusCode != 301 {
		fmt.Println(baseHost)
	}
	fmt.Println(res.Header.Get("Location"))
}
