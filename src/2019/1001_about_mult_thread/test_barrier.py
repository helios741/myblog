import threading

def work(barrier):
    print('n_waitting = {}'.format(barrier.n_waiting))
    try:
        bid = barrier.wait()
        print("this bid is: {}".format(bid))
    except threading.BrokenBarrierError as err:
        print("threading.BrokenBarrierError err is : {}".format(err))

barrier = threading.Barrier(3)

for i in range(3):
    t = threading.Thread(target=work, args=(barrier,))
    t.start()
