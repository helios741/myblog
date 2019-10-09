import threading

total = 0
MAX_N = 300000
lock = threading.Lock()

def add():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        total += 1
        lock.release()
def desc():
    global total
    global lock
    for i in range(MAX_N):
        lock.acquire()
        total -= 1
        lock.release()

thread1 = threading.Thread(target=add)
thread2 = threading.Thread(target=desc)
thread1.start();thread2.start();
thread1.join();thread2.join()
print(total)
