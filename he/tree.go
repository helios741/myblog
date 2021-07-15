package he

import (
	"errors"
	"strings"
)

var (
	ErrNotMath = errors.New("not match url")
)
type nType int
const (
	ntStatic nType = iota
	ntParam
	ntCatchAll
	ntCount
)

type prefix string


func (p prefix) longestPrefix(pf prefix) prefix {
	for i := 0; i < len(p); i++ {
		if p[i] == pf[i] {
			continue
		}
		return p[:i]
	}
	return p
}

func (p prefix) hasParamNT() bool {
	return p.paramIndex() >= 0
}

func (p prefix) paramIndex() int {
	return strings.Index(string(p), ":")
}

func (p prefix) curBlock() prefix {
	pf := p
	if p[0] == '/' {
		pf = p[1:]
	}
	for i, c := range pf {
		if c == '/' {
			return pf[:i]
		}
	}
	return pf
}

func (p prefix) isLastBlock() bool {
	if p[0] == '/' {
		return strings.Index(string(p[1:]), "/") == -1
	}
	return strings.Index(string(p), "/") == -1
}

func (p prefix) paramEnd() int {
	for i := p.paramIndex(); i < len(p); i++ {
		if p[i] == byte('/') {
			return i
		}
	}
	return len(p)
}

func (p prefix) onlyStatic() bool {
	return !p.hasParamNT()
}

type node struct {
	nType   nType
	prefix  prefix
	child   [ntCount][]*node
	handler map[string]HandlerFunc
}

func (n *node)isLeaf() bool {
	for _, ch := range n.child {
		if len(ch) > 0 {
			return false
		}
	}
	return true
}

// 找到节点之后，怎么和XX对应起来

type Node interface {

}

// /frends/{id}/{helios}

func (n *node) appendChild(pf prefix, method string, handler HandlerFunc) {
	if len(pf) == 0 {
		n.handler = map[string]HandlerFunc{method: handler}
		return
	}
	// TODO 已经存在就要panic
	c := &node{
		nType:  ntStatic,
		prefix: pf,
	}

	if pf.paramIndex() == 0 {
		c.prefix = pf[:pf.paramEnd()]
		c.nType = ntParam
		n.child[ntParam] = append(c.child[ntParam], c)
	} else if pf.hasParamNT() {
		c.prefix = pf[:pf.paramIndex()]
		n.child[ntStatic] = append(n.child[ntStatic], c)
	} else {
		n.child[ntStatic] = append(n.child[ntStatic], c)
	}
	// TODO 可能还有catchall的

	c.appendChild(pf[len(c.prefix):], method, handler)
}

// 找到和给定字符串最有最长前缀的那个节点
func (n *node) findCommonPrefixNode(pf prefix) (*node, prefix, prefix) {
	curNode := n
	commonPrefix := n.prefix.longestPrefix(pf)
	longCommonPrefix  := commonPrefix

	for len(commonPrefix) == len(curNode.prefix) && len(commonPrefix) != len(pf) {
		hasChild := false
		for _, cnode := range curNode.child[ntStatic] {
			if cnode.prefix[0] == pf[0] {
				curNode = cnode
				hasChild = true
				break
			}
		}
		// TODO 要是有下面这样好像处理不了？
		// /friends/:id/classes
		// /friends/:friendID/classes
		// TODO 这里要加上判断:id,要不然会重复加
		if !hasChild && pf.hasParamNT() {
			for _, cnode := range curNode.child[ntParam] {
				hasChild = true
				childLongCommonPrefix := prefix("")
				curNode, commonPrefix, childLongCommonPrefix = cnode.findCommonPrefixNode(pf)
				longCommonPrefix += childLongCommonPrefix
			}
			if hasChild {
				continue
			}
		}
		if !hasChild {
			break
		}
		commonPrefix = curNode.prefix.longestPrefix(pf)
		pf = pf[len(commonPrefix):]
		longCommonPrefix += commonPrefix
	}
	return curNode, commonPrefix, longCommonPrefix
}

func (n *node) cleanChild() {
	for i := range n.child {
		n.child[i] = nil
	}
}

func (n *node) findCommonPrefixNode1(pf prefix) (*node, prefix, prefix) {
	curNode := n
	commonPrefix := n.prefix.longestPrefix(pf)
	longCommonPrefix  := commonPrefix

	// TODO 这里面我们假定每个ntParam类型的prefix都是一样的
	for len(commonPrefix) != len(curNode.prefix) {
		hasChild := false
		for _, cnode := range curNode.child[ntStatic] {
			if cnode.prefix[0] == pf[0] {
				hasChild = true
				curNode = cnode
			}
		}
		if !hasChild && pf.hasParamNT(){
			for _, cnode := range curNode.child[ntParam] {
				if cnode.prefix == pf[:len(cnode.prefix)] {
					hasChild = true
					curNode = cnode
				}
			}
		}

		if !hasChild {
			break
		}
		commonPrefix = curNode.prefix.longestPrefix(pf)
		longCommonPrefix += commonPrefix
	}
	return curNode, commonPrefix, longCommonPrefix

}
func (n *node) insert(pf prefix, method string, handler HandlerFunc) {
	// 找到匹配度最高的结点、两个节点的共同前缀(从当前节点开始算)、最长前缀(从根结点开始算)
	nn, childPrefix, longCommonPrefix := n.findCommonPrefixNode(pf)
	// friends/:id  friends/:id/classes
	// nn                  = :id这个节点
	// childPrefix         = :id
	// longCommonPrefix    = friends/:id
	if nn.prefix == childPrefix{
		nn.appendChild(pf[len(longCommonPrefix):], method, handler)
		return
	}
	oldChild := nn.child
	nn.cleanChild()
	nn.appendChild(pf[len(longCommonPrefix):], method, handler)
	nn.child[ntStatic] = append(nn.child[ntStatic], &node{
		nType:   ntStatic,
		prefix:  nn.prefix[len(childPrefix):],
		child:   oldChild,
		handler: shallowCopyMap(nn.handler), // <-
	})
	nn.prefix = childPrefix
	if _, ok := nn.handler[method]; ok {
		nn.handler[method] = nil
	}
}
func shallowCopyMap(m map[string]HandlerFunc) map[string]HandlerFunc {
	nm := make(map[string]HandlerFunc)
	for k, v := range m {
		nm[k] = v
	}
	return nm
}

func (n *node) find(pf prefix, method string) (map[string]string, HandlerFunc, error) {
	if n == nil {
		return nil, nil, ErrNotMath
	}

	// 静态的优先级比较高
	for _, c := range n.child[ntStatic] {
		if c.prefix[0] != pf[0] {
			continue
		}
		if (len(c.prefix) == len(pf) && c.handler[method] == nil) || len(c.prefix) > len(pf) {
			return nil, nil, ErrNotMath
		} else if len(c.prefix) == len(pf) {
			return nil, c.handler[method], nil
		}
		params, handler, err := c.find(pf[len(c.prefix):], method)
		if err == nil {
			return params, handler, nil
		}
	}
	// 如果静态优先级不行，那就搞params的
	for _, c := range n.child[ntParam] {
		if pf.isLastBlock() && c.handler[method] == nil {
			return nil, nil, ErrNotMath
		} else if  pf.isLastBlock() {
			return map[string]string{string(c.prefix[1:]): string(pf)}, c.handler[method], nil
		}
		params, handler, err := c.find(pf[len(pf.curBlock()):], method)
		if err == nil {
			if params == nil {
				params = make(map[string]string)
			}
			params[string(c.prefix[1:])] = string(pf.curBlock())
			return params,  handler, nil
		}
	}

	// 可能还有通配符
	return nil, nil, ErrNotMath
}