import multiprocessing
import time

def event_set(e):
    time.sleep(2)
    print("start set")
    e.set()
    e.clear()
    print("end set")

def event_wait(e, i):
    time.sleep(i)
    print("start wait {}".format(i))
    e.wait()
    print("end wait {}".format(i))

eve = multiprocessing.Event()

multiprocessing.Process(target=event_wait, args=(eve, 1)).start()
multiprocessing.Process(target=event_set, args=(eve,)).start()
multiprocessing.Process(target=event_wait, args=(eve, 3)).start()

time.sleep(5)

