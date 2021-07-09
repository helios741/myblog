package binding

import "he/validator"

type defaultValidator struct {
	validate validator.Validator
}

const CustomTag = "hebind"
var Validator = &defaultValidator{}

func validate(s interface{}) error {
	if Validator.validate == nil {
		Validator.validate = validator.New()
		Validator.validate.SetTagName(CustomTag)
	}
	err := Validator.validate.Struct(s)
	if err, ok := err.(validator.ValidationErrors); ok && len(err) == 0 {
		return nil
	}

	return err
}