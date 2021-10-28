package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	"google.golang.org/grpc"
	pb "google.golang.org/grpc/examples/helloworld/helloworld"
)

const (
	address     = "localhost:50051"
	defaultName = "world"
)
func UnixConnect(context.Context, string) (net.Conn, error) {
	unixAddress, err := net.ResolveUnixAddr("unix", "/tmp/a.sock")
	conn, err := net.DialUnix("unix", nil, unixAddress)
	return conn, err
}

func getDial(isTcp bool) (*grpc.ClientConn,error) {
	if isTcp {
		return grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	}
	return grpc.Dial("/tmp/a.sock", grpc.WithInsecure(), grpc.WithBlock(), grpc.WithContextDialer(UnixConnect))
}

func main() {
	conn, err := getDial(false)
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewGreeterClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	reply, err := c.SayHello(ctx, &pb.HelloRequest{Name: defaultName})
	fmt.Println("grpc recv: ", reply.String())
}
