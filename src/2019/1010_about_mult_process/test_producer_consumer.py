import multiprocessing
import random
import time


class Provider(multiprocessing.Process):
    def __init__(self, queue):
        multiprocessing.Process.__init__(self)
        self.queue = queue

    def run(self):
        for i in range(10):
            self.queue.put(i)
            print("Provider: item {} append to queue".format(i, self.name))
            time.sleep(1)
            print("Provider size of {}".format(self.queue))


class Consumer(multiprocessing.Process):
    def __init__(self, queue):
        multiprocessing.Process.__init__(self)
        self.queue = queue

    def run(self):
        while True:
            if self.queue.empty():
                print("this queue is empty")
                break
            else:
                time.sleep(2)
                item = self.queue.get()
                print("Consumer item {} popped from by {}".format(item, self.name))
                time.sleep(1)


queue = multiprocessing.Queue()
p = Provider(queue)
v = Consumer(queue)
p.start()
v.start()
p.join()
v.join()
