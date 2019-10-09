import threading
import time


class Consumer(threading.Thread):
    def __init__(self, v, sem):
        super().__init__()
        self.sem = sem
        self.value = v

    def run(self):
        time.sleep(2)
        print("-------{}-----".format(self.value))
        self.sem.release()

class Producer(threading.Thread):
    def __init__(self, sem):
        super().__init__()
        self.sem = sem
    def run(self):
        for i in range(20):
            self.sem.acquire()
            t = Consumer(i, self.sem)
            t.start()

sem = threading.Semaphore(3)
producer = Producer(sem)
producer.start()

