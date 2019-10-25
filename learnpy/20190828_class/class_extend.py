class Base():
    BASE_NAME="helios"
    def __init__(self):
        print("base init")
        self.age="23"
    def get_context_length(self):
        raise Exception('get_context_length not implemented')

class Sub1(Base):
    def __init__(self):
        print("sub1 init")
        Base.__init__(self)
        self.age="sub1"
    def get_context_length(self):
        return "sub1"

class Sub2(Base):
    def __init__(self):
        print("sub2 init")
        Base.__init__(self)
        self.age="sub2"
    def get_context_length(self):
        return "sub2"

class SubSon(Sub1, Sub2):
    def __init__(self):
        print("sub son init")
        Sub1.__init__(self)
        Sub2.__init__(self)
        print("sub son done")

ins = SubSon()
print(ins.get_context_length())
