from queue import Queue

from time import sleep, time
import threading


def consumer(q):
    while True:
        item = q.get()
        print("consumer {} start".format(item))
        sleep(2)
        print("consumer {} end".format(item))


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
consumer_thread_1 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_2 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_3 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_4 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_5 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_6 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_9 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_7 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_8 = threading.Thread(target=consumer, args=(share_q, ))
consumer_thread_10 = threading.Thread(target=consumer, args=(share_q, ))

start_time = time()

provider_thread.start()
consumer_thread_1.start()
consumer_thread_2.start()
consumer_thread_3.start()
consumer_thread_4.start()
consumer_thread_5.start()
consumer_thread_6.start()
consumer_thread_7.start()
consumer_thread_8.start()
consumer_thread_9.start()
consumer_thread_10.start()
provider_thread.join()
consumer_thread_1.join()
consumer_thread_2.join()
consumer_thread_3.join()
consumer_thread_4.join()
consumer_thread_5.join()
consumer_thread_6.join()
consumer_thread_7.join()
consumer_thread_8.join()
consumer_thread_9.join()
consumer_thread_10.join()
print ("last time: {}".format(time()-start_time))



