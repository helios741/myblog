import dis

total = 0

def add():
    global total
    total += 1

def desc():
    global total
    total -= 1
dis.dis(add)
print("-----")
dis.dis(desc)

