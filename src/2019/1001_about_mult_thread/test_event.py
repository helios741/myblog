import time
from threading import Thread, Event
import random

items = []
event = Event()

class Consumer(Thread):
    def __init__(self, items, event):
        Thread.__init__(self)
        self.items = items
        self.event = event

    def run(self):
        while True:
            time.sleep(2)
            self.event.wait()
            item = self.items.pop()
            print("Consumer notify : current item is {}, list is {}".format(item, self.items))


class Producer(Thread):
    def __init__(self, items, event):
        Thread.__init__(self)
        self.items = items
        self.event = event
    
    def run(self):
        for i in range(100):
            time.sleep(2)
            item = random.randint(0, 256)
            self.items.append(item)
            print("Producer notify : current item is {}, list is {}".format(item, self.items))

            print("Producer start set")
            self.event.set()
            print("Producer start clear")
            self.event.clear()

t1 = Producer(items, event)
t2 = Consumer(items, event)
t1.start()
t2.start()
t1.join()
t2.join()

print("main thread ending")


