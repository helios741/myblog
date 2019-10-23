import multiprocessing

def square(data):
    return data * data

inputs = list(range(7))

pool = multiprocessing.Pool(processes=3)
outputs = pool.map(square, inputs)
pool.close()
pool.join()

print(outputs)
