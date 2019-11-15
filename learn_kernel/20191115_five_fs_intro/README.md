
[文件系统：项目成果要归档，我们就需要档案库](https://time.geekbang.org/column/article/97876)


## 文件系统的功能规划

1. 文件系统要有严格的组织形式，使得文件以块为单位进行存储。
2. 文件系统要有索引区，用来方便查找一个文件分成的多个块都存放在什么位置
![image](https://user-images.githubusercontent.com/12036324/68914481-ae119500-0799-11ea-9822-1c6d99d581b3.png)
3. 文件系统应该有缓存
4. 文件应该用目录组织起来，方便查询和管理
5. 内核在内存里面维护一套数据结构，来保存哪些文件被哪些进程打开和使用了

## 文件系统相关的命令行

- *fdisk -l*：查看格式化和没有格式化的分区
- *mkfs.ext4*：进行格式化
- *fdisk /dev/vda*：把硬盘进行分区
- *mount /dev/vda1 目录*：挂载
- *umount 目录*：卸载


## 文件系统的相关系统调用

### 一、使用系统调用操作文件

```c

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>


int main(int argc, char *argv[])
{


  int fd = -1;
  int ret = 1;
  int buffer = 1024;
  int num = 0;


  if((fd=open("./test", O_RDWR|O_CREAT|O_TRUNC))==-1)
  {
    printf("Open Error\n");
    exit(1);
  }


  ret = write(fd, &buffer, sizeof(int));
  if( ret < 0)
  {
    printf("write Error\n");
    exit(1);
  }
  printf("write %d byte(s)\n",ret);


  lseek(fd, 0L, SEEK_SET);
  ret= read(fd, &num, sizeof(int));
  if(ret==-1)
  {
    printf("read Error\n");
    exit(1);
  }
  printf("read %d byte(s)，the number is %d\n", ret, num);


  close(fd);


  return 0;
}
```

在进程中，我们会为这个打开的文件分配一个文件描述符fd。


文件描述符就是用来区分一个进程打开的多个文件。它的作用域就是当前进程，当出了这个进程就没有意义了。
open函数中有下面的几个flag：
- O_RDWR： 以读写的方式打开
- O_CREAT：文件不存在的时候创建一个文件
- O_TRUNC：打开文件后，将文件的长度截断为0

write用户写入数据，这个函数有下面三个函数：
- 文件描述符：
- 要写入的数据存放的位置
- 希望写入的字节数

lseek用户重新定位读写的位置，有下面的三个参数：
- 文件描述符
- 重新定位的位置
- SEEK_SET：表示起始位置的文件头，第二个参数和第三个参数合起来表示读写位置设置为从头文件开始0的位置，也即从头开始读写。

read用于读取数据，有三个参数：
- 文件描述符
- 读取来的数据存到指定的空间
- 希望读取的字节数

最终close关闭一个文件。


下面的三个函数可以返回与打开的文件描述符相关的文件状态信息。这个信息将会写到类型为struct stat的buf结构中：
```c

int stat(const char *pathname, struct stat *statbuf);
int fstat(int fd, struct stat *statbuf);
int lstat(const char *pathname, struct stat *statbuf);


struct stat {
  dev_t     st_dev;         /* ID of device containing file */
  ino_t     st_ino;         /* Inode number */
  mode_t    st_mode;        /* File type and mode */
  nlink_t   st_nlink;       /* Number of hard links */
  uid_t     st_uid;         /* User ID of owner */
  gid_t     st_gid;         /* Group ID of owner */
  dev_t     st_rdev;        /* Device ID (if special file) */
  off_t     st_size;        /* Total size, in bytes */
  blksize_t st_blksize;     /* Block size for filesystem I/O */
  blkcnt_t  st_blocks;      /* Number of 512B blocks allocated */
  struct timespec st_atim;  /* Time of last access */
  struct timespec st_mtim;  /* Time of last modification */
  struct timespec st_ctim;  /* Time of last status change */
};
```
函数 stat 和 lstat 返回的是通过文件名查到的状态信息。这两个方法区别在于，stat 没有处理符号链接（软链接）的能力。如果一个文件是符号链接，stat 会直接返回它所指向的文件的属性，而 lstat 返回的就是这个符号链接的内容，fstat 则是通过文件描述符获取文件对应的属性。


通过系统调用列出一个目录下面的文件以及文件的属性：
```c

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <dirent.h>


int main(int argc, char *argv[])
{
  struct stat sb;
  DIR *dirp;
  struct dirent *direntp;
  char filename[128];
  if ((dirp = opendir("/root")) == NULL) {
    printf("Open Directory Error%s\n");
    exit(1);
  }
  while ((direntp = readdir(dirp)) != NULL){
    sprintf(filename, "/root/%s", direntp->d_name);
    if (lstat(filename, &sb) == -1)
    {
      printf("lstat Error%s\n");
      exit(1);
    }


    printf("name : %s, mode : %d, size : %d, user id : %d\n", direntp->d_name, sb.st_mode, sb.st_size, sb.st_uid);


  }
  closedir(dirp);


  return 0
}
```

- opendir打开一个目录名所对应的DIR函数流，并返回指向DIR目录流的指针。流定位在DIR目录的第一个条目。
- readdir从DIR目录流中读取一个项目，返回一个指针，指向dirent的结构体，且流的自动指向下一条目录。如果已经到流的最后一个目录则返回NULL
- closedir()关闭参数dir所指的目录流



## 总结

![image](https://user-images.githubusercontent.com/12036324/68915704-21b5a100-079e-11ea-8ed8-48682b39e8a8.png)

- 文件系统上，需要维护文件的严格的格式，要通过mkfs.ext4命令来格式化为严格格式
- 每一个硬盘上保存的文件都有一个索引，来维护这个文件上的数据块都保存在哪里
- 文件通过目录的方式组织起来，方便用户使用
- 为了能够更快的读取文件，内存里会分配一块空间作为缓存，让一些数据放在缓存里
- 在内核态，要有一整套的数据结构来表示打开的文件
- 在用户态，每个打开的文件都有一个文件描述符，可以通过各种文件相关的系统调用操作这个文件描述符
