import multiprocessing

def worker(dict, key, item):
    dict[key] = item
    print("key = {}; value = {}; ".format(key, item))

mgr = multiprocessing.Manager()
d = mgr.dict()
jobs = [multiprocessing.Process(target=worker, args=(d, i, i * 2)) for i in range(10)]

for j in jobs:
    j.start()
for j in jobs:
    j.join()

print("all dict is {}".format(d))
