import time
from threading import Thread

def count(n):
    for i in range(n):
        n += 0
    print("Done")

start = time.clock()
n = 50000000
t1 = Thread(target=count, args=[n // 2])
t2 = Thread(target=count, args=[n // 2])
t1.start()
t2.start()
t1.join()
t2.join()

end = time.clock()

print(end - start)

