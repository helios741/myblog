import os
print("not fork")
pid = os.fork()
print("already fork")

if pid == 0:
    print("my is child process id is: {}, father is: {}".format(os.getpid(), os.getppid()))
else:
    print("my is father, pid is :{}".format(pid))
