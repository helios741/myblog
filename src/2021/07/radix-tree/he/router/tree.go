package router

import (
	"errors"
	"net/http"
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
	nType nType
	prefix prefix
	child [ntCount][]*node
	handler map[string]http.HandlerFunc
}

func (n *node)isLeaf() bool {
	for _, ch := range n.child {
		if len(ch) > 0 {
			return false
		}
	}
	return true
}

func nt(path string) nType {
	if path[0] == ':' {
		return ntStatic
	}
	return ntParam

}

// 找到节点之后，怎么和XX对应起来

type Node interface {

}

// /frends/{id}/{helios}

func (n *node) appendChild(pf prefix, method string, handler http.HandlerFunc) {
	if len(pf) == 0 {
		n.handler = map[string]http.HandlerFunc{method: handler}
		return
	}
	// TODO 已经存在就要panic
	c := &node{
		nType:   ntStatic,
		prefix:  pf,
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

func (n *node) findCommonPrefixNode(pf prefix) (*node, prefix) {
	newPf := n.prefix.longestPrefix(pf)
	nn := n
	for len(newPf) == len(n.prefix) && len(newPf) != len(pf) {
		hasChild := false
		for _, cnode := range nn.child[ntStatic] {
			if cnode.prefix[0] == pf[0] {
				nn = cnode
				hasChild = true
				break
			}
		}
		if !hasChild {
			break
		}
		newPf = nn.prefix.longestPrefix(pf)
	}
	return nn, newPf
}

func (n *node) cleanChild() {
	for i := range n.child {
		n.child[i] = nil
	}
}

// 进来的一定是ntStatic类型
func (n *node) insert(pf prefix, method string, handler http.HandlerFunc) {
	nn, newPf := n.findCommonPrefixNode(pf)
	if nn.prefix == newPf {
		nn.appendChild(pf[len(newPf):], method, handler)
		return
	}
	oldChild := nn.child
	nn.cleanChild()
	nn.appendChild(pf[len(newPf):], method, handler)
	nn.child[ntStatic] = append(nn.child[ntStatic], &node{
		nType:   ntStatic,
		prefix:  nn.prefix[len(newPf):],
		child:   oldChild,
		handler: nn.handler,
	})
	nn.prefix = newPf
	if _, ok := nn.handler[method]; ok {
		nn.handler[method] = nil
	}
}


func (n *node) find(pf prefix, method string) (map[string]string, http.HandlerFunc, error) {
	if n == nil {
		return nil, nil, ErrNotMath
	}
	//if !strings.HasPrefix(string(pf), string(n.prefix)) {
	//	return nil, nil, ErrNotMath
	//}
	// 静态的优先级比较高
	for _, c := range n.child[ntStatic] {
		if c.prefix[0] != pf[0] {
			continue
		}
		if len(c.prefix) == len(pf) && c.handler[method] == nil{
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