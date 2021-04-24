package business

type StudentUseCase struct {
	Id int
	Age int
	Sex string
	Name string
	Like string
}

type StudentRepo interface {
	GetByID(id int) (*StudentUseCase, error)
}

type studentUseCase struct {
	repo StudentRepo
}
func (suc *studentUseCase) Get(id int) (*StudentUseCase, error) {
	stu, err := suc.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	// 还会有很多业务逻辑
	return &StudentUseCase{
		Name: stu.Name,
	}, nil
}


func NewStudentUseCase(repo StudentRepo) StudentUserCase {
	return &studentUseCase{repo: repo}
}

type StudentUserCase interface {
	Get(id int) (*StudentUseCase, error)
}