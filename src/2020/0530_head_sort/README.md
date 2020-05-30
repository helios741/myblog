
# 堆和堆排序

堆分为大根堆，和小根堆

大根堆就是父节点比子节点都要大，小根堆就是父节点比子节点都要小。

因为堆肯定是一个完全二叉树（第i层满了，才去放下一层），所以i位置的左子节点就是(2 * i) + 1右子节点是(2 * i) + 2父节点是(i - 1) / 2. 


堆的建立（大根堆为例）：
1. 找到一个非叶子节点开始
2. 找到两个子节点（如果有的话）中最大的一个
3. 如果父节点比两个子节点都要大，那就别玩了，退出
4. 否则用最大的子节点和父节点进行交换
5. 因为一个子树（子节点大的那个）的父节点发生了变化
6. 以比较大的子节点为开始，重新执行第一步

堆的删除（以跟节点为例）：
将最后一个元素删除，覆盖掉根元素，然后在执行一次上面堆的建立的过程


堆的插入：
放在最后一个+1的位置，然后开始和父节点进行比较，如果比父节点大就交换。


堆的排序：
就是每次交换根元素和最后一个位置，然后长度-1，去进行一次堆的建立，


可以看出堆的插入是从下到上的过程，堆的建立和删除都是从上到下的过程。

还可以看出上述的堆的建立是核心。
下面是golang的代码
```golang
package main
import "fmt"
func swap(arr []int, i, j int) {
	t := arr[i]
	arr[i] = arr[j]
	arr[j] = t
}

func adjust(arr []int, st, n int) {

	for l := (2 * st) + 1; l <= n; l = (2 * l) + 1 {
		if l + 1 <= n && arr[l + 1] > arr[l] {
			l++
		}
		if arr[l] > arr[st] {
			swap(arr, l, st)
			st = l
		} else {
			break
		}
	}

}
func hsort(arr []int)[]int  {
	for i := (len(arr) - 1) / 2; i >=0 ; i-- {
		adjust(arr, i, len(arr) - 1)
	}
	for i := 1; i < len(arr); i++ {
		n := len(arr)  - i
		swap(arr, 0, n)
		adjust(arr, 0, n - 1)

	}
	return arr
}

func main() {
	arr := []int{4, 5, 2, 4, 34, 2, 2, 34}

	fmt.Println(arr)
	fmt.Println(hsort(arr))

}
```


