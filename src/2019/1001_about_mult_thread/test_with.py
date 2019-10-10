import threading

def thread_with(stat):
    with stat:
        print("have with , stat is: {}".format(stat))

def thread_no_with(stat):
    stat.acquire()
    try:
        print("no with, stat is: {}".format(stat))
    finally:
        stat.release()

 
lock = threading.Lock()
rlock = threading.RLock()
cond = threading.Condition()
mutex = threading.Semaphore(1)
list = [lock, rlock, cond, mutex]

for stat in list:
    t1 = threading.Thread(target=thread_with, args=(stat, ))
    t2 = threading.Thread(target=thread_no_with, args=(stat, ))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
