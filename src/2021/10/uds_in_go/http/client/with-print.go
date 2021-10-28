package main

import (
	"context"
	"fmt"
	"sort"
	"net"
	"net/http"
	"time"
)


func main() {

	fmt.Println("Unix HTTP client")

	httpc := http.Client{
		Transport: &http.Transport{
			DialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
				return net.Dial("unix", SockPath)
			},
		},
	}
	stratTime := time.Now()
	for i := 0; i <1000; i++ {
		pre := time.Now()
		var response *http.Response
		var err error
		response, err = httpc.Get("http://unix" + "adsdsdsds")

		if err != nil {
			panic(err)
		}
		_ = response.Body
		//fmt.Println(time.Now().Sub(pre))
		pre = addLatency(pre)
	}
	printLatency(0, stratTime)
}


type lsT []time.Duration

func (l lsT) Len() int {
	return len(l)
}

func (l lsT) Less(i, j int) bool {
	return l[i] < l[j]
}

func (l lsT) Swap(i, j int) {
	l[i], l[j] = l[j], l[i]
}

var latencys lsT



func addLatency(pre time.Time, t... time.Time) time.Time {
	now := time.Now()
	var t2 time.Time
	if len(t) > 0 {
		t2 = t[0]
	} else {
		t2 = now
	}

	latencys = append(latencys, t2.Sub(pre))
	return t2
}
// 1000 * 99 / 100 = 99
func pXX(n int) time.Duration{
	pos := len(latencys) * n / 100
	return latencys[pos]
}
func printLatency(NumPings int, t1 time.Time) {
	var tmp int64
	for _, v := range latencys {
		tmp += v.Nanoseconds()
	}
	var elapsed = time.Duration(tmp)
	sort.Sort(&latencys)
	fmt.Println("一共发包:", len(latencys))//Microseconds
	fmt.Printf("压测耗时：%d ms \n",time.Now().Sub(t1).Milliseconds())
	fmt.Printf("平均延迟: %d µs \n", elapsed.Microseconds() / int64(len(latencys)))
	fmt.Printf("p99延迟: %d µs \n", pXX(99).Microseconds())
	fmt.Printf("p90延迟: %d µs \n", pXX(90).Microseconds())
	fmt.Printf("p50延迟: %d µs \n", pXX(50).Microseconds())
	fmt.Printf("最高耗时：%d µs \n", latencys[len(latencys) - 1].Microseconds())
	fmt.Printf("最低耗时：%d µs \n", latencys[0].Microseconds())
	latencys = latencys[0:0]
}