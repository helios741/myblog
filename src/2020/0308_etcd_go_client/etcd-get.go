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
		kv clientv3.KV
		err error
		getResp *clientv3.GetResponse

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

	// 实例化一个用于操作ETCD的KV
	kv = clientv3.NewKV(client)
	if getResp, err = kv.Get(context.TODO(), "/school/class/students"); err != nil {
		fmt.Println(err)
		return
	}
	// 输出本次的Revision
	fmt.Printf("Key is s %s \n Value is %s \n", getResp.Kvs[0].Key, getResp.Kvs[0].Value)

}


