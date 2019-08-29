

## 声明
set和dict都是用`{}`表示：
```python
dict={"name": "helios"}
type(dict) #<type 'dict'>

s={1,3,4,3}
type(s) # <type 'set'>

```

## 获得值

字典可以通过`[]`和`get(value, default)`得到：

```python
d = {'name': 'jason', 'age': 20}
d['name'] # jason

d['location']  # error
d.get('location', 'helios') # helios

```

集合不能通过索引去访问，可以通过value in dict/set的方式：

```python
s = {1, 2, 3}
1 in s
True
10 in s
False
```

## 操作

我们一般会对字典进行排序：
```python
d = {'b': 1, 'a': 2, 'c': 10}
d_sorted_by_key = sorted(d.items(), key=lambda x: x[0]) # 根据字典键的升序排序
d_sorted_by_value = sorted(d.items(), key=lambda x: x[1]) # 根据字典值的升序排序 
d_sorted_by_key
[('a', 2), ('b', 1), ('c', 10)]
d_sorted_by_value
[('b', 1), ('a', 2), ('c', 10)]
```

## 好东西

1. 用in关键字检查dict/set中key是否存在
```python
>>> s={"e", "3", 4}
>>> 3 in s
False
>>> 4 in s
True
>>> d={"name": "d"}
>>> 4 in d
False
>>> "name" in d
True
>>>
```
2. 用get(value, defalut)代替[]访问字典中元素
```python
print(d.get("name", "default"))
```
3. 用setdefault为字典中不存在的值设置默认值
```python
data = [
        ("animal", "bear"),
        ("animal", "duck"),
        ("plant", "cactus"),
        ("vehicle", "speed boat"),
        ("vehicle", "school bus")
]

groups = {}
for (key, value) in data:
    groups.setdefault(key, []).append(value)
```
`setdefault`的作用是：
- 如果 key 存在于字典中，那么直接返回对应的值，等效于 get 方法
- 如果 key 不存在字典中，则会用 setdefault 中的第二个参数作为该 key 的值，再返回该值。

4.用 defaultdict 初始化字典对象
```python
from collections import defaultdict

groups = defaultdict(list)
for (key, value) in data:
    groups[key].append(value)
```

5. 用 fromkeys 将set转换成字典
```python
keys = {'a', 'e', 'i', 'o', 'u' }
value = []
d = dict.fromkeys(keys, value)
print(d)

>>>
{'i': [], 'u': [], 'e': [],
 'a': [], 'o': []}
```





## 思考题

1. 下面初始化字典的方式，哪一种更高效?

```python
# Option A
d = {'name': 'jason', 'age': 20, 'gender': 'male'}
# Option B
d = dict({'name': 'jason', 'age': 20, 'gender': 'male'})
```
第一种更加高效，因为调用dict函数等于运行时又增加了一层额外的操作


