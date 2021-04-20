package repository_test

import (
	"testing"

	"dip/repository"
)

func TestStudent_GetByID(t *testing.T) {
	s := repository.NewStudentRepo()
	stu, err := s.GetByID(1001)
	if err != nil {
		t.Errorf("[TestStudent_GetByID] error is %+v", err)
		return
	}
	t.Logf("[TestStudent_GetByID] success student entity is %+v", stu)
}