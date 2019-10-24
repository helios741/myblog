import multiprocessing
import time

def worker(sema, i):
    sema.acquire()
    print(multiprocessing.current_process().name + " acquire")
    time.sleep(i)
    print(multiprocessing.current_process().name + " release")
    sema.release()


s = multiprocessing.Semaphore(2)
[multiprocessing.Process(target=worker, args=(s, i * 1.5)).start() for i in range(5)]


time.sleep(10)
