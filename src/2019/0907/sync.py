import time

def count(n):
    for i in range(n):
        n += 0
    print("Done")

start = time.clock()
count(50000000)
end = time.clock()

print(end - start)

