package repository

import (
	"fmt"

	"github.com/pkg/errors"

	"dip/service"
)

type student struct {

}

func (s *student) GetByID(id int) (*service.Student, error) {
	return mockStudent(id)
}

func NewStudentRepo() service.StudentRepo {
	return &student{}
}

var SqlNotFound = errors.New("NOT FOUND RECORD")

func mockStudent(id int) (*service.Student, error) {
	if id == 1001 {
		return nil, errors.Wrap(SqlNotFound, fmt.Sprintf("sql err for mockStudent"))
	} else if id == 1002 {
		return nil, errors.New("this is sql error")
	}
	stu := service.Student{
		Id: id,
		Name: "Helios",
		Like: "dsdsd",
		Age: 23,
	}
	return &stu, nil
}