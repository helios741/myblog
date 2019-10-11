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
  const char* const short_options = "i:t:m:";
  const struct option long_options[] = {
    { "id", 1, NULL, 'i'},
    { "type", 1, NULL, 't'},
    { "message", 1, NULL, 'm'},
    { NULL, 0, NULL, 0 }
  };
  
  int messagequeueid = -1;
  struct msg_buffer buffer;
  buffer.mtype = -1;
  int len = -1;
  char * message = NULL;
  do {
    next_option = getopt_long (argc, argv, short_options, long_options, NULL);
    switch (next_option)
    {
      case 'i':
        messagequeueid = atoi(optarg);
        break;
      case 't':
        buffer.mtype = atol(optarg);
        break;
      case 'm':
        message = optarg;
        len = strlen(message) + 1;
        if (len > 1024) {
          perror("message too long.");
          exit(1);
        }
        memcpy(buffer.mtext, message, len);
        break;
      default:
        break;
    }
  }while(next_option != -1);


  if(messagequeueid != -1 && buffer.mtype != -1 && len != -1 && message != NULL){
    if(msgsnd(messagequeueid, &buffer, len, IPC_NOWAIT) == -1){
      perror("fail to send message.");
      exit(1);
    }
  } else {
    perror("arguments error");
  }
  
  return 0;
}

