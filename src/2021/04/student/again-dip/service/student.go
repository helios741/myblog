package service

type Student struct {
	Id int
	Age int
	Sex string
	Name string
	Like string
}

type StudentRepo interface {
	GetByID(id int) (*Student, error)
}

type studentUseCase struct {
	repo StudentRepo
}
func (suc *studentUseCase) Get(id int) (*Student, error) {
	stu, err := suc.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	// 还会有很多业务逻辑
	return &Student{
		Name: stu.Name,
	}, nil
}


func NewStudentUseCase(repo StudentRepo) StudentUserCase {
	return &studentUseCase{repo: repo}
}

type StudentUserCase interface {
	Get(id int) (*Student, error)
}