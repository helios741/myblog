#include <stdio.h>
#include <stdlib.h>
#include <sys/msg.h>
#include <getopt.h>
#include <string.h>


struct msg_buffer {
    long mtype;
    char mtext[1024];
};


int main(int argc, char *argv[]) {
  int next_option;
  const char* const short_options = "i:t:";
  const struct option long_options[] = {
    { "id", 1, NULL, 'i'},
    { "type", 1, NULL, 't'},
    { NULL, 0, NULL, 0 }
  };
  
  int messagequeueid = -1;
  struct msg_buffer buffer;
  long type = -1;
  do {
    next_option = getopt_long (argc, argv, short_options, long_options, NULL);
    switch (next_option)
    {
      case 'i':
        messagequeueid = atoi(optarg);
        break;
      case 't':
        type = atol(optarg);
        break;
      default:
        break;
    }
  }while(next_option != -1);


  if(messagequeueid != -1 && type != -1){
    if(msgrcv(messagequeueid, &buffer, 1024, type, IPC_NOWAIT) == -1){
      perror("fail to recv message.");
      exit(1);
    }
    printf("received message type : %d, text: %s.", buffer.mtype, buffer.mtext);
  } else {
    perror("arguments error");
  }
  
  return 0;
}

