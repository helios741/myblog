total = 0
MAX_N = 300000
def add():
    global total
    for i in range(MAX_N):
        total += 1
        if 0 == total:
            print("add")
def desc():
    global total
    for i in range(MAX_N):
        total -= 1
        if total == 0:
            print("desc")

import threading
thread1 = threading.Thread(target=add)
thread2 = threading.Thread(target=desc)
thread1.start();thread2.start();
thread1.join();thread2.join()
print(total)
