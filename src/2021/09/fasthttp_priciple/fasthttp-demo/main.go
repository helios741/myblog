package main

import (
	"log"

	"github.com/valyala/fasthttp"
)

func h(ctx *fasthttp.RequestCtx) {
	ctx.String()
}

	func main() {
	log.Fatal(fasthttp.ListenAndServe(":8081", h))
}
