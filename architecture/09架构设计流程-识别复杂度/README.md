
## 思考题：尝试用排查法分析一下你参与过或者研究过的系统的复杂度，然后与你以前的理解对比一下，看看是否有什么新发现？


## 总结

架构设计由需求所驱动，本质目的是为了解决软件系统的复杂性；为此，我们在进行架构设计时，需要以理解需求为前提，首要进行系统复杂性的分析。具体做法是：
1. 构建复杂度的来源清单:高性能、可用性、扩展性、安全、低成本、规模等
2. 结合需求、技术、团队、资源等对上述复杂度逐一分析是否需要？是否关键？
    + “高性能”主要从软件系统未来的TPS、响应时间、服务器资源利用率等客观指标，也可以从用户的主观感受方面去考虑。
    + “可用性”主要从服务不中断等质量属性，符合行业政策、国家法规等方面去考虑。
    + “扩展性”则主要从功能需求的未来变更幅度等方面去考虑。
3. 按照上述的分析结论，得到复杂度按照优先级的排序清单，越是排在前面的复杂度，就越关键，就越优先解决。

注：
随着所处的业务阶段不同、外部的技术条件和环境的不同，得到的复杂度问题的优先级排序就会有所不同
