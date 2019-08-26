# list tuple

- 列表：可变数组
- 元组：不可变数组

## 不同点

- 存储方式

```python
l = [1, 2, 3]
l.__sizeof__()
64
tup = (1, 2, 3)
tup.__sizeof__()
48
```
因为列表是动态的，所以它需要
+ 存储额外的指针来指向对应的元素（本例子中是int，占用8 byte）；
+ 需要8byte去存储已经分配长度的大小




列表的会有过度分配（over-allocate）
```python
 = []
l.__sizeof__() // 空列表的存储空间为40字节
40
l.append(1)
l.__sizeof__()
72 // 加入了元素1之后，列表为其分配了可以存储4个元素的空间 (72 - 40)/8 = 4 l.append(2)
l.__sizeof__()
72 // 由于之前分配了空间，所以加入元素2，列表空间不变
l.append(3)
l.__sizeof__()
72 // 同上
l.append(4)
l.__sizeof__()
72 // 同上
l.append(5)
l.__sizeof__()
104 // 加入元素5之后，列表的空间不足，所以又额外分配了可以存储4个元素的空间
```


为了减小每次增加/删减操作时空间分配的 开销，Python每次分配空间时都会额外多分配一些，这样的机制(over-allocating)保证了其操作的高效 性:增加/删除的时间复杂度均为O(1)。


- 性能

元组的性能会好一点

```python
python3 -m timeit 'x=(1,2,3,4,5,6)'
20000000 loops, best of 5: 9.97 nsec per loop
python3 -m timeit 'x=[1,2,3,4,5,6]'
5000000 loops, best of 5: 50.1 nsec per
```


## 共同点

- 都支持负索引

```python
l = [1, 2, 3, 4]
l[-1]
4
tup = (1, 2, 3, 4)
tup[-1]
4
```
- 都支持切片操作

```python
list = [1, 2, 3, 4]
l1=l[1:3] # 返回列表中索引从1到2的子列表 [2, 3]
print type(l1) # <type 'list'>
tup = (1, 2, 3, 4)
tup1=tup[1:3] # 返回元组中索引从1到2的子元组 (2, 3)
print type(tup1) # <type 'tuple'>
```

- 都可以随意嵌套

```python
l = [[1, 2, 3], [4, 5]] # 列表的每一个元素也是一个列表
tup = ((1, 2, 3), (4, 5, 6)) # 元组的每一个元素也是一元组
```



## 问题

下面那种方式效率高

```python
# 创建空列表
# option A
empty_list = list()
# option B
empty_list = []
```


区别主要在于list()是一个function call，Python的function call会创建stack，并且进行一系列参数检查的 操作，比较expensive，反观[]是一个内置的C函数，可以直接被调用，因此效率高
