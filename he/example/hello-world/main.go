package main

import (
	"fmt"

	"he"
)

func M1(handler he.HandlerFunc) he.HandlerFunc {
	return func(ctx he.Context) {
		fmt.Println("M1 start")
		handler(ctx)
		fmt.Println("M1 ending")
	}
}

func M2(handler he.HandlerFunc) he.HandlerFunc {
	return func(ctx he.Context) {
		fmt.Println("M2 start")
		handler(ctx)
		fmt.Println("M2 ending")
	}
}

type ReqT struct {
	Name string `form:"name" hebind:"required"`
	Age string `form:"age" hebind:"required"`
	Id int `form:"id" hebind:"required"`
}

func helloHandler(ctx he.Context) {
	var req ReqT
	fmt.Println("------")
	if err := ctx.BindQuery(&req); err != nil {
		panic(err)
	}
	fmt.Println(req.Age, req.Name, req.Id)
	ctx.WriteString("Hello World!")
}

func main() {
	r := he.New()
	r.Use(M1)
	r.GET("/frends/:id/helios", helloHandler)
	r.GET("/frend/:id/helios", helloHandler)
	r.With(M2).GET("/frend/:id", helloHandler)
	panic(r.Run())
}
