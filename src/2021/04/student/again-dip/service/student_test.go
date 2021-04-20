package service_test

import (
	"testing"

	"dip/service"
)

type testStu struct {

}

func (ts *testStu)GetByID(_ int) (*service.Student,error)  {
	return &service.Student{Id: 32}, nil

}

func TestStudentUseCase_Get(t *testing.T) {
	a := &testStu{}
	stu := service.NewStudentUseCase(a)
	s,_ := stu.Get(43)
	if s.Id == 32 {

	}
}