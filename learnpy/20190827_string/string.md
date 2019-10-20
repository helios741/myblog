
## 字符串操作

python中的string也是不可变的，只能重新创建一个字符串。


但是对于`str += s`还是例外的，因为python对其进行了优化，python2.5之后这样会扩展内存而不是新建内存。


- string.strip(str)，表示去掉首尾的str字符串; 
- string.lstrip(str)，表示只去掉开头的str字符串;
- string.rstrip(str)，表示只去掉尾部的str字符串。

```python
s = ' my name is jason '
s.strip()
'my name is jason'
```

## 字符串的格式化

```python
# now
print('no data available for person with id: {}, name: {}'.format(id, name))
# pre
print('no data available for person with id: %s, name: %s' % (id, name))
```

## 思考题

在新版本的Python(2.5+)中，下面的两个字符串拼接操作，你觉得哪个更优 呢?
```python
s=''
for n in range(0, 100000):
s += str(n)
```

```
l = []
for n in range(0, 100000):
    l.append(str(n))
s = ' '.join(l)
```


经过测试好像感觉没啥区别，待验证



