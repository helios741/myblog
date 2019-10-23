import multiprocessing

class MyProcess(multiprocessing.Process):
    def __init__(self, name):
        super().__init__(name=name)
    def run(self):
        print("child process running")


p = MyProcess("test_process_class")
p.start()
print("child process name is: {}".format(p.name))
print("main end")
