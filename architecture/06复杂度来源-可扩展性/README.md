
## 思考题：你在具体代码中使用过哪些可扩展的技术？最终的效果如何？

- 在出包管理和出包过程的对接的时候，中间多一层专门去应对变化。
- 把一些模块做成可插拔的，只要实现对应的方法啥的就能用


## 总结

可扩展性的两个设计原则：
1. 封装变化层和稳定层
2. 提炼抽象层和实现层


如何设计扩展性好的架构：
1. 从业务维度：对业务深入理解，对业务的发展方向进行预判，也就是不能完全不考虑可扩展性
2. 从技术维度：可以用上面的两个原则
