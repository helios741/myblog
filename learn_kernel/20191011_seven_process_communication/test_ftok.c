#include <stdio.h>
#include <stdlib.h>
#include <sys/msg.h>


int main() {
  int messagequeueid;
  key_t key;


  if((key = ftok("/root/messagequeue/messagequeuekey", 1024)) < 0)
  {
      perror("ftok error");
      exit(1);
  }


  printf("Message Queue key: %d.\n", key);


  if ((messagequeueid = msgget(key, IPC_CREAT|0777)) == -1)
  {
      perror("msgget error");
      exit(1);
  }


  printf("Message queue id: %d.\n", messagequeueid);
}

