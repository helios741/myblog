package main

import (
	"net/http"
	"strconv"

	"dip/delivery"
	"dip/repository"
	"dip/service"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.GET("/students/:id", func(ctx *gin.Context) {
		stuRepo := repository.NewStudentRepo()
		stuService := service.NewStudentUseCase(stuRepo)
		stuDelivery := delivery.NewStudentDelivery(stuService)
		id, err := strconv.Atoi(ctx.Param("id"))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"msg": err.Error()})
			return
		}
		stu, err := stuDelivery.Get(id)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"msg": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": stu})
	})
	r.Run()
}
