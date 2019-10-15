#include <stdio.h>
#include <stdlib.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/sem.h>
#include <string.h>

#define MAX_NUM 128

struct shm_data {
  int data[MAX_NUM];
  int datalength;
};

union semun {
  int val; 
  struct semid_ds *buf; 
  unsigned short int *array; 
  struct seminfo *__buf; 
}; 

int get_shmid(){
  int shmid;
  key_t key;
  
  if((key = ftok("/root/sharememory/sharememorykey", 1024)) < 0){
      perror("ftok error");
          return -1;
  }
  
  shmid = shmget(key, sizeof(struct shm_data), IPC_CREAT|0777);
  return shmid;
}

int get_semaphoreid(){
  int semid;
  key_t key;
  
  if((key = ftok("/root/sharememory/semaphorekey", 1024)) < 0){
      perror("ftok error");
          return -1;
  }
  
  semid = semget(key, 1, IPC_CREAT|0777);
  return semid;
}

int semaphore_init (int semid) {
  union semun argument; 
  unsigned short values[1]; 
  values[0] = 1; 
  argument.array = values; 
  return semctl (semid, 0, SETALL, argument); 
}

int semaphore_p (int semid) {
  struct sembuf operations[1]; 
  operations[0].sem_num = 0; 
  operations[0].sem_op = -1; 
  operations[0].sem_flg = SEM_UNDO; 
  return semop (semid, operations, 1); 
}

int semaphore_v (int semid) {
  struct sembuf operations[1]; 
  operations[0].sem_num = 0; 
  operations[0].sem_op = 1; 
  operations[0].sem_flg = SEM_UNDO; 
  return semop (semid, operations, 1); 
} 

