package delivery

import (
	"net/http"
	"strconv"

	"dip/business"

	"github.com/gin-gonic/gin"
)

type StudentReply struct {
	Name string `json:"name"`
	Sex string `json:"sex"`
}

type studentDelivery struct {
	suc business.StudentUserCase
}

func (sd *studentDelivery) Update(_ *gin.Context) {
	panic("implement me")
}

func (sd *studentDelivery) Get(ctx *gin.Context) {
	id, err := strconv.Atoi(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"msg": err.Error()})
		return
	}
	stu, err := sd.suc.Get(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"msg": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": StudentReply{
		Name: stu.Name,
		Sex: stu.Sex,
	}})
}

type StudentDelivery interface {
	Get(c *gin.Context)
	Update(c *gin.Context)
}

func NewStudentDelivery(suc business.StudentUserCase) StudentDelivery {
	return &studentDelivery{suc: suc}
}