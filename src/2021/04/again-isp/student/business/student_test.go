package business_test

import (
	"testing"

	"dip/business"
)

type testStu struct {
}

func (ts *testStu)GetByID(_ int) (*business.StudentUseCase,error)  {
	return &business.StudentUseCase{Id: 32}, nil

}

func TestStudentUseCase_Get(t *testing.T) {
	a := &testStu{}
	stu := business.NewStudentUseCase(a)
	s,_ := stu.Get(43)
	if s.Id == 32 {
		t.Logf("[TestStudentUseCase_Get] success")
		return
	}
	t.Error("[TestStudentUseCase_Get] error")
}