package main

import "fmt"

type node struct {
	v string
	// 表示子节点的数量，也可以用26个元素的数组实现
	child map[uint8]*node
}
// he h
func longestPrefix(p, pf string) string {
	for i := 0; i < len(p); i++ {
		if i >= len(pf) {
			return p[:i]
		}
		if p[i] == pf[i] {
			continue
		}
		return p[:i]
	}
	return p
}


func (n *node) findCommonPrefixNode(pf string) (*node, string) {
	newPf := longestPrefix(n.v,pf)
	nn := n
	for len(newPf) == len(nn.v) && len(newPf) != len(pf) {
		hasChild := false
		for index, cnode := range nn.child {
			if index == pf[0] {
				nn = cnode
				hasChild = true
				break
			}
		}
		if !hasChild {
			break
		}
		newPf = longestPrefix(nn.v, pf)
		pf = pf[len(newPf):]
	}
	return nn, newPf
}

func (n *node)appendChild(path string) {
	if len(path) < 1 {
		return
	}
	n.child[path[0]] = &node{
		v:       path,
		child: make(map[uint8]*node),
	}
}

func (parent *node)insert(path string) {
	nn, commonPrefix := parent.findCommonPrefixNode(path)
	// 代表不用分裂节点，直接插入即可
	if nn.v == commonPrefix {
		nn.appendChild(path[len(commonPrefix):])
		return
	}
	// 为了下沉，保存孩子节点
	oldChild := nn.child
	// 清空这个节点的孩子节点
	nn.child = make(map[uint8]*node)
	// 开始分裂
	nn.appendChild(path[len(commonPrefix):])
	newPath := nn.v[len(commonPrefix):]
	nn.child[newPath[0]] = &node{
		v:       newPath,
		child:   oldChild,
	}
	nn.v = commonPrefix
}

func (n *node)find(path string) bool {
	if n == nil {
		return false
	}
	if path == "" {
		return true
	}

	for index, c := range n.child {
		if index != path[0] {
			continue
		}
		// 如果前缀不一样， 返回false
		commonPrefix := longestPrefix(c.v, path)
		if commonPrefix == c.v {
			return c.find(path[len(c.v):])
		}
		if path == commonPrefix {
			return true
		}
		return false
	}
	return false
}

func main() {
	rt := &node{child: make(map[uint8]*node)}
	rt.insert("hello")
	rt.insert("hehe")
	rt.insert("hive")
	rt.insert("helios")
	fmt.Println(rt.find("how"))
	fmt.Println(rt.find("heh"))
}
