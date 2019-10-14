#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(int argc, char *argv[])
{
  int fds[2];
  if (pipe(fds) == -1)
    perror("pipe error");

  pid_t pid;
  pid = fork();
  if (pid == -1)
    perror("fork error");

  if (pid == 0){
    close(fds[0]);
    char msg[] = "hello world";
    write(fds[1], msg, strlen(msg) + 1);
    close(fds[1]);
    exit(0);
  } else {
    close(fds[1]);
    char msg[128];
    read(fds[0], msg, 128);
    close(fds[0]);
    printf("message : %s\n", msg);
    return 0;
  }
}

