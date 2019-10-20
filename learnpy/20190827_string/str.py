import time

start_time = time.time()
s=''
for n in range(0, 100000000):
    s += str(n)
end_time = time.time()

print end_time - start_time

start_time = time.time()
l = []
for n in range(0, 100000000):
    l.append(str(n))
s = ' '.join(l)
end_time = time.time()

print end_time - start_time
