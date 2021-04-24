package delivery_test

import (
	"testing"

	"dip/delivery"
	"dip/business"
)

type testService struct {
}

func (ts *testService)  Get(_ int) (*business.Student, error) {
	// 想干啥干啥
	return &business.Student{}, nil
}

func TestStudentDelivery_Get(t *testing.T) {
	s := &testService{}
	stuDelivery := delivery.NewStudentDelivery(s)
	stu, err := stuDelivery.Get(5)
	if err != nil {
		t.Errorf("[TestStudentDelivery_Get] error is %+v", err)
		return
	}
	t.Logf("[TestStudentDelivery_Get] studentRelay is %+v", stu)
}