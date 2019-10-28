

python为了解决打开一个资源忘记释放（比如打开文件，连接数据库操作）而引发的问题，引入了上下文管理器，能够帮助自动分配和释放资源，其中最典型的就是with语句。


## 上下文管理器的实现

### 基于类的实现

可以参考同级别的`with.py`文件。

注：
当我们用类来创建上下文管理器时，必须保证这个类包括方法”__enter__()”和方 法“__exit__()”。其中，方法“__enter__()”返回需要被管理的资源，方法“__exit__()”里通常会 存在一些释放、清理资源的操作，比如这个例子中的关闭文件等等。


当我们使用with语句执行上下文管理器的时候，比如下面的代码：
```python
with FileManager('test.txt', 'w') as f:
    f.write('hello world')
```
会依次发生下面几步：
1. 方法“__init__()”被调用，程序初始化对象FileManager，使得文件名(name)是"test.txt"，文 件模式(mode)是'w';
2. 方法“__enter__()”被调用，文件“test.txt”以写入的模式被打开，并且返回FileManager对象赋予 变量f;
3. 字符串“hello world”被写入文件“test.txt”;
4. 方法“__exit__(exc_type, exc_val, exc_tb)”被调用，负责关闭之前打开的文件流。

注：
“exc_type, exc_val, exc_tb”，分别表示 exception_type、exception_value和traceback

结果：

```shell
calling __init__ method
calling __enter__ method
ready to write to file
calling __exit__ meth
```

一旦有异常抛出，异常的类型、值等具体信息，都会通过参数传 入“__exit__()”函数中，你可以自行定义相关的操作对异常进行处理，而处理完异常后，也别忘了加 上“return True”这条语句，否则仍然会抛出异常。如同级目录的`with_exp.py`:

***
这里，我们在with语句中手动抛出了异常“exception raised”，你可以看到，“__exit__()”方法中异 常，被顺利捕捉并进行了处理。不过需要注意的是，如果方法“__exit__()”没有返回True，异常仍然会 被抛出。因此，如果你确定异常已经被处理了，请在“__exit__()”的最后，加上“return True”这条语句。
***


### 基于生成器的上下文管理器

可能基于类的上下文管理器写起来太废弃，可以参考同级目录的`with_gen.py`，这样就不用定义“__enter__()”和“__exit__()”方法了，但请务必加上装饰器@contextmanager。


### 两种方式的对比：
- 基于类的上下文管理器更加flexible，适用于大型的系统开发;
- 而基于生成器的上下文管理器更加方便、简洁，适用于中小型程序

无论你使用哪一种，请不用忘记在方法“__exit__()”或者是finally block中释放资源，这一点尤其重要。




