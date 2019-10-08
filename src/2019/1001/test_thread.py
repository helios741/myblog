from threading import Thread
from time import sleep, time
def test():
    print("start")
    sleep(2)
    print("end")

t = Thread(target=test)
#t.setDaemon(True)
start_time = time()
t.start()
t.join()

print("main thread end, all time is{}".format(time() - start_time))

