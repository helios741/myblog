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
		lease clientv3.Lease
		leaseId clientv3.LeaseID
		getResp *clientv3.GetResponse
		leaseGrantResp *clientv3.LeaseGrantResponse
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

	// 申请一个租约
	lease = clientv3.NewLease(client)
	if leaseGrantResp, err = lease.Grant(context.TODO(), 10); err != nil {
		fmt.Println(err)
		return
	}
	leaseId = leaseGrantResp.ID

	// 获得kv API子集
	kv = clientv3.NewKV(client)

	if _, err = kv.Put(context.TODO(), "/school/class/students", "h", clientv3.WithLease(leaseId)); err != nil {
		fmt.Println(err)
		return
	}

	for {
		if getResp, err = kv.Get(context.TODO(), "/school/class/students"); err != nil {
			fmt.Println(err)
			return
		}
		if getResp.Count == 0 {
			fmt.Println("kv过期了")
			break
		}
		fmt.Println("还没过期:", getResp.Kvs)
		time.Sleep(2 * time.Second)
	}

}


