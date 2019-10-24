import multiprocessing
import time

def worker(d, lock):
    with lock:
        v = d.get("k", 0)
        d["k"] = v + 1

lock = multiprocessing.Lock()
mgr = multiprocessing.Manager()
dict = mgr.dict()

[multiprocessing.Process(target=worker, args=(dict, lock, )).start() for i in range(10)]

time.sleep(2)

print(dict)
