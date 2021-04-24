package repository

import (
	"fmt"

	"github.com/pkg/errors"

	"dip/business"
)

var _ business.StudentRepo = (*student)(nil)

type student struct {
}


func (s *student) GetByID(id int) (*business.StudentUseCase, error) {
	return mockStudent(id)
}

func NewStudentRepo() business.StudentRepo {
	return &student{}
}

var SqlNotFound = errors.New("NOT FOUND RECORD")

func mockStudent(id int) (*business.StudentUseCase, error) {
	if id == 1001 {
		return nil, errors.Wrap(SqlNotFound, fmt.Sprintf("sql err for mockStudent"))
	} else if id == 1002 {
		return nil, errors.New("this is sql error")
	}
	stu := business.StudentUseCase{
		Id: id,
		Name: "Helios",
		Like: "dsdsd",
		Age: 23,
	}
	return &stu, nil
}