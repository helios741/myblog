import time
import multiprocessing

gend=1

def count(n, t):
    start = time.clock()
    for i in range(n * t):
        n += 0
    end = time.clock()
    print(end - start)
    global gend
    gend = time.clock()
    print("Done")

n = 5000000
pool = multiprocessing.Pool(processes = 3)
gstart=time.clock()
for i in xrange(1, 4):
    pool.apply_async(count, (n, i))
pool.close()
pool.join()
print("all run time: {0}".format(gend - gstart))
