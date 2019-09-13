[进程：公司接这么多项目，如何管？](https://time.geekbang.org/column/article/90855)

## 用系统调用创建进程

创建*process.c*文件，根据系统调用fork的返回值不同，父子进程就分道扬镳，在子进程里面我们需要通过`execvp`运行一个新的程序。

``` c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>


extern int create_process (char* program, char** arg_list);


int create_process (char* program, char** arg_list)
{
    pid_t child_pid;
    child_pid = fork ();
    if (child_pid != 0)
        return child_pid;
    else {
        execvp (program, arg_list);
        abort ();
    }
}
```
创建*createprocess.c*文件，调用上面的*process.c*文件：

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

extern int create_process (char* program, char** arg_list);

int main ()
{
    char* arg_list[] = {
        "ls",
        "-l",
        "/etc/yum.repos.d/",
        NULL
    };
    create_process ("ls", arg_list);
    return 0;
}
```

## 编译为二进制

在linux中二进制程序又严格的格式，变成为ELF（Executeable and Linkable Format， 可执行与可链接格式）。这个结果根据我们编译结果的不同，分为不同的格式。


下图展示了文本文件编译为二进制格式的过程：

待github



编译这两个程序：

```shell
gcc -c -fPIC process.c
gcc -c -fPIC createprocess.c
```

在编译的过程中，先做预处理（例如将头文件嵌入正文，将定义的宏展开），然后编译最后编译为.o文件。这是ELF的第一种格式可重位文件（Relocatable File）。

格式如下：
待github


- .text：放编译好的二进制可执行代码
- .data：已经初始化好的全局变量
- .rodata：只读数据，例如字符串常量、const 的变量...
- .bss：未初始化全局变量，运行时会置 0
- .symtab：符号表，记录的则是函数和变量
- .strtab：字符串表、字符串常量和变量名


*.o*文件并不是可执行程序而是部分代码片段。
有的 section，例如.rel.text, .rel.data 就与重定位有关。例如这里的 createprocess.o，里面调用了 create_process 函数，但是这个函数在另外一个.o 里面，因而 createprocess.o 里面根本不可能知道被调用函数的位置，所以只好在 rel.text 里面标注，这个函数是需要重定位的。


要想让createprocess.o作为库文件，最简单的方式就是静态链接库.a文件（archives），可以使用ar命令：
```shell
ar cr libstaticprocess.a process.o
```

虽然这里 libstaticprocess.a 里面只有一个.o，但是实际情况可以有多个.o。当有程序要使用这个静态连接库的时候，会将.o 文件提取出来，链接到程序中。

```shell
gcc -o staticcreateprocess createprocess.o -L. -lstaticprocess
```
这个链接的过程，重定位就起作用了，原来 createprocess.o 里面调用了 create_process 函数，但是不能确定位置，现在将 process.o 合并了进来，就知道位置了。

这次形成的就是一个*可执行文件*，是ELF的第二种格式，如下：

待github

运行起来如下：
```shell
# ./staticcreateprocess
# total 40
-rw-r--r--. 1 root root 1572 Oct 24 18:38 CentOS-Base.repo
......
```

静态链接库有个不好的地方就是所有的依赖都变为一个文件了，如果依赖文件更新了还要重新编译一次，很费劲。



ELF的第三种格式*动态链接库*（Shared Libraries）就出现了。动态链接库不仅仅一组对象文件的简单归档，认识多个文件的重新组合，可以被多个程序共享。

```shell
gcc -shared -fPIC -o libdynamicprocess.so process.o
```

当一个动态链接库被链接到一个程序文件中的时候，最后的程序文件并不包括动态链接库中的代码，而仅仅包括对动态链接库的引用，并且不保存动态链接库的全路径，仅仅保存动态链接库的名称。

```shell
gcc -o dynamiccreateprocess createprocess.o -L. -ldynamicprocess
```

当运行这个程序的时候，首先寻找动态链接库，然后加载它。默认情况下，系统在 /lib 和 /usr/lib 文件夹下寻找动态链接库。如果找不到就会报错，我们可以设定 LD_LIBRARY_PATH 环境变量，程序运行时会在此环境变量指定的文件夹下寻找动态链接库。
```shell
# export LD_LIBRARY_PATH=.
# ./dynamiccreateprocess
# total 40
-rw-r--r--. 1 root root 1572 Oct 24 18:38 CentOS-Base.repo
......
```










