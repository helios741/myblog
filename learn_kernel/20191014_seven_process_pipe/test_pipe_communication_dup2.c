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
    dup2(fds[1], STDOUT_FILENO);
    close(fds[1]);
    close(fds[0]);
    execlp("ps", "ps", "-ef", NULL);
  } else {
    dup2(fds[0], STDIN_FILENO);
    close(fds[0]);
    close(fds[1]);
    execlp("grep", "grep", "systemd", NULL);
  }
  
  return 0;
}

