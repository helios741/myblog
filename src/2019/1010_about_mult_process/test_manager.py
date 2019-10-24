import multiprocessing
import time
def worker(d, k, v):
    time.sleep(1)
    d[k] = v
    print("key = {}, value = {}".format(k, v))


mgr = multiprocessing.Manager()
dict = mgr.dict()

[multiprocessing.Process(target=worker, args=(dict, i, i*2)).start() for i in range(10)]

time.sleep(2)

print(dict)
