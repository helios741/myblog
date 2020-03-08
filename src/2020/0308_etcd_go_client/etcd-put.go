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
		putResp *clientv3.PutResponse

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
	if putResp, err = kv.Put(context.TODO(), "/school/class/students", "helios0", clientv3.WithPrevKV()); err != nil {
		fmt.Println(err)
		return
	}
	// 输出本次的Revision
	fmt.Println(putResp.Header.Revision)
	if putResp.PrevKv != nil {
		fmt.Printf("prev Value: %s \n CreateRevision : %d \n ModRevision: %d \n Version: %d \n",
			string(putResp.PrevKv.Value), putResp.PrevKv.CreateRevision, putResp.PrevKv.ModRevision, putResp.PrevKv.Version)
	}
}


