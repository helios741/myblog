
## 如果你来设计一个整点限量秒杀系统，包括登录、抢购、支付（依赖支付宝）等功能，你会如何设计接口级的故障应对手段？

可以等到接近秒杀的时候，把非核心业务进行降级（比如修改用户信息，退货等）保证登录的可用性。

抢购功能选择排队，因为有可能有用户抢到了可能不要了。


支付调用支付宝可能会因为慢拖垮系统，可以采用熔断机制。


## 总结

- 降级
    + 系统后门降级：提供一个特殊的URL，成本低，但是操作复杂，要一个个去改
    + 独立降级系统：将降级操作独立到一个单独的系统中，可以实现复杂的权限管理、批量操作等功能 ![](./dljj.png)
- 熔断
- 限流
    + 基于请求限流
    + 基于资源限流
- 排队
