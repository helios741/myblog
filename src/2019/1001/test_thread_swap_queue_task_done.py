from queue import Queue

from time import sleep, time
import threading


def consumer(q):
    while True:
        item = q.get()
        print("consumer {} start".format(item))
        sleep(2)
        print("consumer {} end".format(item))
        q.task_done()


def provider(q):
    print("provider start")
    sleep(3)
    for i in range(20):
        q.put(i)
    print("provider end")
#    while True:
#        print("provider start")
#        sleep(3)
#        for i in range(20):
#            q.put(i)
#        print("provider end")

share_q = Queue(maxsize = 100)
provider_thread = threading.Thread(target=provider, args=(share_q, ))
provider_thread.start()
provider_thread.join()
for i in range(10):
    consumer_thread = threading.Thread(target=consumer, args=(share_q, ))
    consumer_thread.start()
start_time = time()

share_q.join()

print ("last time: {}".format(time()-start_time))



