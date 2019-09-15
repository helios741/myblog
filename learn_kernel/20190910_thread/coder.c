#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

#define NUM_OF_TASKS 3
#define MAX_TASK_QUEUE 11

char tasklist[MAX_TASK_QUEUE]="ABCDEFGHIJ";
int head = 0;
int tail = 0;

int quit = 0;

pthread_mutex_t g_task_lock;
pthread_cond_t g_task_cv;

void *coder(void *notused)
{
  pthread_t tid = pthread_self();

  while(!quit){

    pthread_mutex_lock(&g_task_lock);
    while(tail == head){
      if(quit){
        pthread_mutex_unlock(&g_task_lock);
        pthread_exit((void *)0);
      }
      printf("No task now! Thread %u is waiting!\n", (unsigned int)tid);
      pthread_cond_wait(&g_task_cv, &g_task_lock);
      printf("Have task now! Thread %u is grabing the task !\n", (unsigned int)tid);
    }
    char task = tasklist[head++];
    pthread_mutex_unlock(&g_task_lock);
    printf("Thread %u has a task %c now!\n", (unsigned int)tid, task);
    sleep(5);
    printf("Thread %u finish the task %c!\n", (unsigned int)tid, task);
  }

  pthread_exit((void *)0);
}

int main(int argc, char *argv[])
{
  pthread_t threads[NUM_OF_TASKS];
  int rc;
  int t;

  pthread_mutex_init(&g_task_lock, NULL);
  pthread_cond_init(&g_task_cv, NULL);

  for(t=0;t<NUM_OF_TASKS;t++){
    rc = pthread_create(&threads[t], NULL, coder, NULL);
    if (rc){
      printf("ERROR; return code from pthread_create() is %d\n", rc);
      exit(-1);
    }
  }

  sleep(5);

  for(t=1;t<=4;t++){
    pthread_mutex_lock(&g_task_lock);
    tail+=t;
    printf("I am Boss, I assigned %d tasks, I notify all coders!\n", t);
    pthread_cond_broadcast(&g_task_cv);
    pthread_mutex_unlock(&g_task_lock);
    sleep(20);
  }

  pthread_mutex_lock(&g_task_lock);
  quit = 1;
  pthread_cond_broadcast(&g_task_cv);
  pthread_mutex_unlock(&g_task_lock);

  pthread_mutex_destroy(&g_task_lock);
  pthread_cond_destroy(&g_task_cv);
  pthread_exit(NULL);
}

