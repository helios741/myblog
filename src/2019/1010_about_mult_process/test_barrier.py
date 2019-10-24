import multiprocessing
import time

def worker(bar, i):
    time.sleep(i)
    print("barrier {}  start".format(i))
    bar.wait()
    print("barrier  {} end".format(i))

bar = multiprocessing.Barrier(2)
multiprocessing.Process(target=worker, args=(bar, 1)).start()
multiprocessing.Process(target=worker, args=(bar, 2)).start()

time.sleep(3)
