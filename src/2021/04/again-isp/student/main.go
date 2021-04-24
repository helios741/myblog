package main

import (
	"dip/business"
	"dip/delivery"
	"dip/repository"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	{
		stuRepo := repository.NewStudentRepo()
		stuService := business.NewStudentUseCase(stuRepo)
		stuDelivery := delivery.NewStudentDelivery(stuService)
		r.GET("/students/:id", stuDelivery.Get)
		r.PUT("/students/:id", stuDelivery.Update)
	}

	r.Run()
}
