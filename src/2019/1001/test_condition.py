from threading import Thread, Condition
import time

items = []
condition = Condition()


class Producer(Thread):
    
    def produce(self):
        global condition
        global items
        condition.acquire()
        if len(items) == 5:
            print("Producer start wait notify")
            condition.wait()
            print("Producer success wait notify")
        items.append(1)
        print("Producer start notify, len(item):{}".format(len(items)))
        condition.notify()
        condition.release()

    def run(self):
        for i in range(0, 20):
            time.sleep(1)
            self.produce()

class Consumer(Thread):
    def consume(self):
        global condition
        global items
        condition.acquire()
        if len(items) == 0:
            print("Consumer start wait notify")
            condition.wait()
            print("Consumer success wait notify")
        items.pop()

        print("Consumer notify : items to consume are " + str(len(items)))

        condition.notify()
        condition.release()

    def run(self):
        for i in range(20):
            time.sleep(2)
            self.consume()

producer = Producer()
consumer = Consumer()
producer.start()
consumer.start()
producer.join()
consumer.join()
