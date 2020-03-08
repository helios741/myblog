package main

import (
	"context"
	"fmt"
	"time"

	"go.etcd.io/etcd/clientv3"
)
func main() {
	var (
		config clientv3.Config
		client *clientv3.Client
		err error
		kv clientv3.KV
		putOp clientv3.Op
		getOp clientv3.Op
		opResp clientv3.OpResponse
	)
	// 客户端配置
	config = clientv3.Config{
		Endpoints: []string{"172.27.143.50:2379"},
		DialTimeout: 5 * time.Second,
	}
	// 建立连接
	if client, err = clientv3.New(config); err != nil {
		fmt.Println(err)
		return
	}
	kv = clientv3.NewKV(client)

	putOp = clientv3.OpPut("/school/class/students", "helios")

	if opResp, err = kv.Do(context.TODO(), putOp); err != nil {
		panic(err)
	}
	fmt.Println("写入Revision:", opResp.Put().Header.Revision)

	getOp = clientv3.OpGet("/school/class/students")

	if opResp, err = kv.Do(context.TODO(), getOp); err != nil {
		panic(err)
	}
	fmt.Println("数据Revision:", opResp.Get().Kvs[0].ModRevision)
	fmt.Println("数据value:", string(opResp.Get().Kvs[0].Value))
}


