from threading import Thread
from time import sleep, time

class Test(Thread):
    def __init__(self, name):
        super().__init__(name=name)

    def start(self):
        print("start")
        sleep(2)
        print("end")

t = Test("helios")
start_time = time()
t.start()
print("test thread name is: {}".format(t.name))
print("main thread end, all time is{}".format(time() - start_time))
