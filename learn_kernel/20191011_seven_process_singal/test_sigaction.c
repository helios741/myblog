#include<stdio.h>
#include<unistd.h>
#include<signal.h>
#include<errno.h>

static void sig_usr(int signum)
{
    if (signum == SIGUSR1)
    {
        printf("SIGUSR1 recv \n");
    }
    else if (signum == SIGUSR2)
    {
        printf("SIGUSR2 recv \n");
    }
    else
    {
        printf("singal %d recv", signum);
    }

}


int main(void)
{
    char buf[512];
    int n;
    struct sigaction sa_usr;
    sa_usr.sa_flags  = 0;
    sa_usr.sa_handler = sig_usr;

    sigaction(SIGUSR1, &sa_usr, NULL);
    sigaction(SIGUSR2, &sa_usr, NULL);
    printf("my pid is %d \n", getpid());


    while(1)
    {
        n = read(STDIN_FILENO, buf, 511);
        if (n == -1)
        {
            if (errno == EINTR)
            {
                printf("read is interrupted by signal\n");
            }

        }
        else
        {
            buf[n] = '\0';
            printf("%d bytes read: %s\n", n, buf);
        }
    }

    return 0;

}
