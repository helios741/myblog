import multiprocessing
import time
def foo(p):
    print("current process name is {}".format(multiprocessing.current_process().name))
    time.sleep(1)
    print("this is p: {}".format(p))

p = multiprocessing.Process(target=foo, name="test_process", args=["params"])

p.daemon = True
p.start()
# time.sleep(2)
print("main end")
