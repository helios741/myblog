package main

import (
	"context"
	"fmt"
	"time"

	"go.etcd.io/etcd/clientv3"
	"go.etcd.io/etcd/mvcc/mvccpb"
)
func main() {
	var (
		config clientv3.Config
		client *clientv3.Client
		kv clientv3.KV
		err error
		delResp *clientv3.DeleteResponse
		kvpair *mvccpb.KeyValue
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
	_, err = kv.Put(context.TODO(), "/school/class/students", "helios1")

	if delResp, err = kv.Delete(context.TODO(), "/school/class/students", clientv3.WithPrevKV()); err != nil {
		fmt.Println(err)
		return
	}
	if len(delResp.PrevKvs) != 0 {
		for _, kvpair = range delResp.PrevKvs {
			fmt.Printf("delete key is: %s \n Value: %s \n", string(kvpair.Key), string(kvpair.Value))
		}
	}

}


