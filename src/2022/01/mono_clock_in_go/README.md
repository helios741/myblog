

# Go是如何使用逻辑时钟的？



最近帮同事排查问题，怀疑了下Go语言的时间间隔的计算，遂把这个过程的收获总结下来。希望看到本文你能知道编程语言为什么要提供逻辑时钟、Go语言如何实现的以及Go语言做了什么取舍。





## 编程语言为什么需要逻辑时钟

逻辑时钟原本是分布式中解决因果一致性的概念，但是这种方法也被借鉴到编程语言中。TODO 有点生硬



当我们计算时间间隔的时候，比如相差多少ms或者多少s，一般是下面这样：

```go
start := time.Now()
... operation that takes 20 milliseconds ...
end := time.Now()
elapsed := end.Sub(start)
```

但是如果再end的之前start之后机器时间改变了，就会导致计算出的时间不准确甚至可能出现负值，可能导致机器时间改变的原因有：

- 闰秒
- 本地时间慢/快了，从NTP同步时钟回调
- 切换时区

那我们就需要一个单增时间，这个时间一般是距离进程启动时间的纳秒数。两次相减就是中间浪费的纳秒数量，其他语言都提供了对应的API，比如：

- java的[`System.nanoTime()`](http://docs.oracle.com/javase/6/docs/api/java/lang/System.html#nanoTime())
- C# 的 [`System.Diagnostics.Stopwatch`](https://msdn.microsoft.com/en-us/library/system.diagnostics.stopwatch.aspx)
- JavaScript 有 [`performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- C++11 以上有 [`std::chrono::steady_clock`](http://en.cppreference.com/w/cpp/chrono/steady_clock)

**逻辑时钟处理的是时间间隔，物理时钟处理的是时间**。就和高中路程和位移的关系差不多。



## Go如何实现的逻辑时钟

### Time的结构

我们先来看看Time结构：

```go
type Time struct {
	wall uint64
	ext  int64

	loc *Location
}

```

第三个参数很好理解是时区，主要看前两个参数。wall字段分为三个部分：

1、 第一位：是否有单调时钟（如果是time.Now生成的肯定有逻辑时钟属性，如果是通过字符串之类的转换过来的就没有，一会我们会继续看）

2、 中间33位：

- 如果单调时钟标识为0，那么这33位都是0，ext字段是距离Jan 1 year 1的**秒数**；
- 如果单调时钟的标识位为1，那么这33位是距离Jan 1 year 1885的秒数，ext是自从程序启动的**纳秒数**

3、 最后30位：精确到的纳秒



### time.Now是如何实现的



结构看完了，我们在看看喜闻乐见的time.Now:

```go
var startNano int64 = runtimeNano() - 1

func Now() Time {
	sec, nsec, mono := now()
	mono -= startNano
	sec += unixToInternal - minWall
	if uint64(sec)>>33 != 0 {
		return Time{uint64(nsec), sec + minWall, Local}
	}
	return Time{hasMonotonic | uint64(sec)<<nsecShift | uint64(nsec), mono, Local}
}
```

如果理解Time结果，这个方法比较简单，大致就是通过now获取物理时钟和逻辑时钟然后进行组装Time对象，下面我们来一行行的看。

runtime/timestub.go now -> time_now()

```go
func time_now() (sec int64, nsec int32, mono int64) {
	sec, nsec = walltime()
	return sec, nsec, nanotime()
}
```

我们可以通过dlv找到walltime()和nanotime()的实现，都是在runtime/sys_linux_amd64.s中的汇编代码，walltime和nanotime的大致逻辑就是先通过runtime·vdsoClockgettimeSym拿物理时间，如果拿不到再通过runtime·vdsoGettimeofdaySym拿。

- runtime·vdsoClockgettimeSym对应的系统调用时gettimeofday
- runtime·vdsoGettimeofdaySym对应的系统调用是clock_gettime

这两个系统调用有什么区别呢？先看gettimeofday：

```go
struct timeval {
  time_t      tv_sec;     /* seconds */
  suseconds_t tv_usec;    /* microseconds */
};
struct timezone {
  int tz_minuteswest;     /* minutes west of Greenwich */
  int tz_dsttime;         /* type of DST correction */
};

int gettimeofday(struct timeval *restrict tv,
                 struct timezone *restrict tz);

```

再来看看clock_gettime：

 ```c
struct timespec {
  time_t   tv_sec;        /* seconds */
  long     tv_nsec;       /* nanoseconds */
};
int clock_gettime(clockid_t clockid, struct timespec *tp);
 ```

clockid_t能指定物理时间（CLOCK_REALTIME）和逻辑实现（CLOCK_MONOTONIC），当然还有其他类型，具体可以参考[clock_gettime](https://man7.org/linux/man-pages/man2/clock_gettime.2.html)。



### time.Unix是如何实现的

time.Parse通过一系列的操作调用的time.Date(),比如下面两个转换为时间的例子：

```go
func main() {
	t := time.Date(2022, 1, 18, 10, 24, 23, 23, nil)
	fmt.Println(t)
	st, err := time.Parse("2006-01-02 15:04:05", "2006-01-02 15:04:05")
	if err != nil {
		panic(err)
	}
	fmt.Println(st)
}
```

除了这两个还有time.Unix能转换为Time类型，简单起见我们只分析time.Unix，看看如何让Time逻辑时钟字段为空：

```go
func Unix(sec int64, nsec int64) Time {
	if nsec < 0 || nsec >= 1e9 {
		n := nsec / 1e9
		sec += n
		nsec -= n * 1e9
		if nsec < 0 {
			nsec += 1e9
			sec--
		}
	}
	return unixTime(sec, int32(nsec))
}

func unixTime(sec int64, nsec int32) Time {
	return Time{uint64(nsec), sec + unixToInternal, Local}
}

```

其实结果显而易见了，将int32的nsec转换为uint64之后收尾肯定是0，unixToInternal是Jan 1 year 1的秒数，这也是符合我们刚介绍time.Time字段的认知的。



### time.Sub是如何实现的

先来看看如何使用：

```go
func main() {

	t1 := time.Date(2022, 1, 18, 10, 24, 23, 23, nil)
	t2 := time.Now()
	fmt.Println(t2.Sub(t1))
}
```

再看实现：

```go
func (t Time) Sub(u Time) Duration {
  // 如果两个类型都包含逻辑时钟标识位
	if t.wall&u.wall&hasMonotonic != 0 {
    // 那么就用逻辑时钟进行计算
		te := t.ext
		ue := u.ext
		d := Duration(te - ue)
		if d < 0 && te > ue {
			return maxDuration 
		}
		if d > 0 && te < ue {
			return minDuration 
		}
		return d
	}
  // 否则就用物理时钟
	d := Duration(t.sec()-u.sec())*Second + Duration(t.nsec()-u.nsec())
	switch {
	case u.Add(d).Equal(t):
		return d // d is correct
	case t.Before(u):
		return minDuration // t - u is negative out of range
	default:
		return maxDuration // t - u is positive out of range
	}
}
```





### == 能比较时间么

在做==比较的时候是用的逻辑时间还是物理时间呢，比如下面的两个例子：

```go
func main() {

11:	t1 := time.Now()
12:	t2 := time.Now()
13:	a := t1 == t2
14:	fmt.Println(a)
}
```



我们通过汇编看一下==调用的什么函数：

go tool compile -S main.go | grep main.go:1 | grep -v PCDATA

```asm
(main.go:10) CALL  time.Now(SB)
(main.go:10) MOVQ  (SP), AX
(main.go:10) MOVQ  AX, ""..autotmp_29+72(SP)

(main.go:10) MOVQ  16(SP), CX     # CX = t1.ext
(main.go:10) MOVQ  CX, ""..autotmp_30+80(SP)

(main.go:10) MOVQ  8(SP), DX      # DX = t1.wall
(main.go:10) MOVQ  DX, ""..autotmp_31+64(SP)


(main.go:11) CALL  time.Now(SB)
(main.go:11) MOVQ  16(SP), AX    # AX = t2.ext
(main.go:11) MOVQ  8(SP), CX     # CX = t2.wall
(main.go:11) MOVQ  ""..autotmp_29+72(SP), DX
(main.go:11) CMPQ  (SP), DX

(main.go:12) JNE 218
(main.go:12) MOVQ  ""..autotmp_31+64(SP), DX # DX = t1.wall
(main.go:12) CMPQ  DX, CX  # t1.wall == t2.wall ?
(main.go:12) JNE 218
(main.go:12) MOVQ  ""..autotmp_30+80(SP), CX // CX = t1.ext
(main.go:12) CMPQ  CX, AX # t1.ext == t2.ext?
(main.go:12) SETEQ AL

```

看个大概就行，主要看后面注释，先判断wall字段然后判断ext字段。







### Go的实现和原生的实现相比，性能怎么样

通过上文我们看到time.Now()分别调用了两个系统函数（不是系统调用哟），相比于其他语言的提供两个方法在性能上做了一些舍弃，我们通过bench一下C代码和Go代码看看差距。

执行1e7次clock_gettime：

```c
int main( int argc, char **argv ){
    struct timespec start, finish, tmp;
    clock_gettime( CLOCK_MONOTONIC, &start );
    int NUM_TRIALS = 1e7;
		for (int i = 0; i < NUM_TRIALS; i++) {
        clock_gettime( CLOCK_MONOTONIC, &tmp );
    }
    clock_gettime( CLOCK_MONOTONIC, &finish );
    printf( "%f\n", ((double) (finish.tv_nsec - start.tv_nsec))/((double) 100000) );
    return 0;
}
```

3550ms

执行1e7次gettimeofday: 

```c
int main()
{
    struct timespec start, finish;
    int NUM_TRIALS = 1e7;
    struct timeval tv;
    clock_gettime( CLOCK_MONOTONIC, &start );
    for (int i = 0; i < NUM_TRIALS; i++) {
        gettimeofday(&tv, NULL);
    }
    clock_gettime( CLOCK_MONOTONIC, &finish );
    printf( "%f\n", ((double) (finish.tv_nsec - start.tv_nsec))/((double) 100000) );
    return 0;
}
```

3641ms

最后再来看看Go语言执行1e7次time.Now: 

```go
func main() {
	t1 := time.Now()
	for i := 0; i < 1e7; i++ {
		_ = time.Now()
	}
	t2 := time.Now()
	fmt.Println(t2.Sub(t1).Nanoseconds() / 1e5)

}
```

7942ms。慢了整整两倍，是符合认知的。



TODO说说VSDO。

## 再谈Go语言的设计

我们能看出Go语言再设计的时候尽可能的为开发者着想，但是在性能上就要做出让步。今天讲的逻辑时钟嵌入标准库中让开发者少理解一个概念，因为逻辑时钟和物理时钟在大多数是时候是一样的，经验少的开发者很难区分开，如果出现问题也是很难定位的。

除此之外还有将初学者难以理解的epoll变为同步，让开发者写起来不用关系异步的存在，对于延迟比较高的场景就很难满足了，但是Go充分暴露了相关的系统函数，让开发者灵活开发。



Go团队好像在某些方面“不爱用”成熟的技术，比如依赖管理并没有太多参考比较成熟的java、泛型也是重新来过、汇编更是用的资料少到可怜的plan9（应该是和rob pike是plan9的发明者有关）、编译也没有用更加成熟的slvm....这样做的好处就是没有历史包袱，能吸各家之所长，但是坏处就是开发者可能会踩坑，使用者可能“延迟满足”。



## 总结

时间在分布式领域是个老大难的问题，很多数据库分布式因为时间难以同步的问题，事务的实现都比较拉胯，直到Jeff Dean带着他的Spanner走来，通过TODO将机器时间的差值降低到了平均4ms以内。

在spanner之前也出现了很多解决时间不同步的方案，最早的就是逻辑时钟（也叫单调时钟），后面还演化了向量时钟。