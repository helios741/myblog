# 命令源码文件

源码文件分为下面三种：
- 命令
- 库
- 测试


## 命令源码文件的用途是什么，怎样编写它？

命令源码文件是程序的入口文件，是每个独立运行的程序必须拥有的。我们可以通过构建和安装，生成与其对应的可执行文件，后者一般与命令源码文件的直接父目录同名

## 一个程序

```Go

package main

import (
	"flag"
	"fmt"
)

var name string

func init() {


	flag.StringVar(&name, "name", "helios", "this is usage")
}

func main() {
	flag.Parse()
}
```

运行：`go run test:hello1.go --help`

有如下提示：

```shell
Usage of /var/folders/q2/mwkzk7sx1zq8pgylg52jxpv40000gn/T/go-build108060537/b001/exe/test:hello1:
  -name string
    	this is usage (default "helios")
exit status 2

```

### 我们可以自定义参数的使用说明


```go

package main

import (
	"flag"
	"fmt"
	"os"
)

var name string

func init() {

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage of %s:\n", "question")
		flag.PrintDefaults()
	}



	flag.StringVar(&name, "name", "helios", "this is usage")
}

func main() {
	flag.Parse()
	fmt.Printf("Hello, %s!\n", name)
}
```


### 自定义一个flag

```go
package main

import (
	"flag"
	"fmt"
	// "os"
)

var name string

func init() {

	// flag.CommandLine = flag.NewFlagSet("", flag.ExitOnError)
	flag.CommandLine = flag.NewFlagSet("", flag.PanicOnError)


	flag.CommandLine.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usadddddge of %s:\n", "question")
		flag.PrintDefaults()
	}


	flag.StringVar(&name, "name", "helios", "this is usage")
}

func main() {
	flag.Parse()
	fmt.Printf("Hello, %s!\n", name)
}


```

### 再进一步


```go

package main

import (
	"flag"
	"fmt"
	"os"
)

var name string

func init() {

	var cmdLine = flag.NewFlagSet("question", flag.ExitOnError)


	cmdLine.StringVar(&name, "name", "helios", "this is usage")
	cmdLine.Parse(os.Args[1:])
}

func main() {
	fmt.Printf("Hello, %s!\n", name)
}

```






其中第一行的文件目录是临时目录，如果先`go build`就不会产生了。


## 我们可以让命令源码文件接受哪些类型的参数值？

* int(int|int64|uint|uint64),
* float(float|float64)
* string,
* bool,
* time.duration(时间),
* var(自定义，如FlagSet、Flag、实现Value接口等)




