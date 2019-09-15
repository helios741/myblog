#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

#define NUM_OF_TASKS 5

int money_of_tom = 100;
int money_of_jerry = 100;
// 第一次运行去掉下面这行
pthread_mutex_t g_money_lock;

void *transfer(void *notused)
{
  pthread_t tid = pthread_self();
  printf("Thread %u is transfering money!\n", (unsigned int)tid);
  // 第一次运行去掉下面这行
  pthread_mutex_lock(&g_money_lock);
  sleep(rand()%10);
  money_of_tom+=10;
  sleep(rand()%10);
  money_of_jerry-=10;
  // 第一次运行去掉下面这行
  pthread_mutex_unlock(&g_money_lock);
  printf("Thread %u finish transfering money!\n", (unsigned int)tid);
  pthread_exit((void *)0);
}

int main(int argc, char *argv[])
{
  pthread_t threads[NUM_OF_TASKS];
  int rc;
  int t;
  // 第一次运行去掉下面这行
  pthread_mutex_init(&g_money_lock, NULL);

  for(t=0;t<NUM_OF_TASKS;t++){
    rc = pthread_create(&threads[t], NULL, transfer, NULL);
    if (rc){
      printf("ERROR; return code from pthread_create() is %d\n", rc);
      exit(-1);
    }
  }
  
  for(t=0;t<100;t++){
    // 第一次运行去掉下面这行
    pthread_mutex_lock(&g_money_lock);
    printf("money_of_tom + money_of_jerry = %d\n", money_of_tom + money_of_jerry);
    // 第一次运行去掉下面这行
    pthread_mutex_unlock(&g_money_lock);
  }
  // 第一次运行去掉下面这行
  pthread_mutex_destroy(&g_money_lock);
  pthread_exit(NULL);
}

