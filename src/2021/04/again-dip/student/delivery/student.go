package delivery

import "dip/service"

type StudentReply struct {
	Name string `json:"name"`
	Sex string `json:"sex"`
}

type studentDelivery struct {
	suc service.StudentUserCase
}

func (sd *studentDelivery) Get(id int) (*StudentReply, error) {
	stu, err := sd.suc.Get(id)
	if err != nil {
		return nil, err
	}
	return &StudentReply{
		Name: stu.Name,
		Sex: stu.Sex,
	}, nil
}

type StudentDelivery interface {
	Get(id int)(*StudentReply, error)
}

func NewStudentDelivery(suc service.StudentUserCase) StudentDelivery {
	return &studentDelivery{suc: suc}
}