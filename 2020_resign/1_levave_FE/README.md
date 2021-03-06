## 再见前端，你好kubernetes

伴随着2019年二月二十八的架构调整，我被划分到了“北京团队2”这个team，当时的TL给我画了一张前端规划的大饼，然后到了这组就搞什么运维部署。我当时真的是十分不自信不仅是对自己不自信也是对前端这个行业不自信，所有人都说前端门槛低，没有技术含量，不懂业务。这些起初我还是有点犹豫的，但是这些点在我身上都得到了验证，我可能觉得转到这个组也是个机会。


### 初出茅庐

起初我都不知道登陆到虚拟机上，还是当时和我关系不错的实习生交给我的了，当时我感觉又恐慌又有精神，因为我知道一件百分制的东西，从0分做到59分是很容易的，59分的水平已经足够忽悠其他的门外汉了。我当时早晨八点起床，洗漱吃饭之后八点半学习到十点多，然后中午十二点六分从工位出发去楼下买711，十二点不到四十吃完看《鸟哥的Linux私房菜》看到一点多睡午觉，当时还是做了很多[笔记](https://github.com/helios741/myblog/tree/new/learn_go/niaoge_linux_basic)。然后晚上工作到九点多就开始继续学习内核相关的东西，看的是极客时间上的《趣谈linux》但是也是做了很多[笔记](https://github.com/helios741/myblog/tree/new/learn_go/learn_kernel)，看这个课的时候，也不知道是这个作者功力深厚比较深入还是他讲的不好，我总是听的云里雾里，后来看到留言区大家都这样就好受了许多（人真的是个复杂的东西，一件事情本身没有变化竟然会因为外界影响自己）。但是睡觉之前还顺便把《深入浅出计算机组成原理》音频放在耳边，顺便复习一下计算机的基础。当然还有详细的学习k8s，是通过张磊的《深入剖析kubernetes》也是做了[笔记](https://github.com/helios741/myblog/tree/new/learn_go/learn_k8s)同时也学习阿里云和CNCF主办的k8s课程，但是犹豫讲师的质量参差不齐，最终没有看完，但是张磊的那个课程一件看完两三遍了。


当时还利用github的project的功能给自己定了个[project](https://github.com/helios741/plan/projects?query=is%3Aclosed)呢，。当时坚持了半年多。
这么一套组合拳下来，一个季度左右的时间，我就对工作中常用的命令以及一些简单原理有了大概的了解。


### 迅速补短

因为这个组做的事情比较杂，而且都是我不熟悉的，熟悉完了Linux周边的，开始熟悉工作中用到的编程语言。

首当其冲的就是shell 编程，因为shell的语法和其他的高级语言有些不同，没有那么严格，也没有什么最佳实践的属于那种一个人一个风格的那种，容易学。刚入门是看了一下慕课网上的360一哥们儿的视频学的，说实话有点过于小白了。


然后是python，虽然我的毕业设计是用python写的吧，但是就是属于那种照猫画虎的水平，没有真正的深入了解。python是看的极客时间上的python专栏《Python核心技术与实战》学的，也做了一些[笔记](https://github.com/helios741/myblog/tree/new/learn_go/learnpy)，后来绝对写笔记太浪费时间了，就没搞了。现在看来也算是个正确的选择吧，毕竟刚开始不用浪费这么多时间，后来又根据慕课网上《Python3高级核心技术97讲》深入学历下python，这个时候对python算了是有了一点感觉，也写了[深入理解python中类和对象](https://github.com/helios741/myblog/tree/new/learn_go/src/2020/0315_python_class)和[浅谈python中的多线程编程](https://github.com/helios741/myblog/tree/new/learn_go/src/2019/1001_about_mult_thread)文章。但是在面试中还是被python问住过，比如python的metaclass，python的字符编码的东西。


最后是golang，想接触云原生golang是绕不过去的语言，但是这个语言真的是太初期了，高级语言的功能都没有。当然这门语言也是出自于google，很有可能是Google在云计算上失去了地位，想让互联网进入到云原生的利器。毕竟所有云原生的东西都是要编程的，编程就要用golang的。学习golang是通过学习《Go语言核心36讲》，虽然这个门课程订阅人数多，但是我觉得讲的不咋样，第一个是文章都是文字没有图，一点也不形象，后续作者不充上了，但是音频没有跟上。第二就是这个音频的转述者，真的比机器人还机械化了。知道现在对于golang还是属于只会看，能写但是写不好的水平，在面试的时候更是经常被问住了。


### 渐入佳境

起因是2020年初公司要升级k8s，我从开始调研到最后自动化上全程是我负责的。我在这个过程中也收获了许多，比如怎么给社区提issue、了解了k8s源码的结构。这时候我感觉我们组全程没帮上啥忙，leader还净捣乱了，瞎提意见，不会还装作很会的样子。


我开始发现这一行，还真的值得深入，很能接触到计算机的原理，毕竟我对这一块很感兴趣，也不想天天和浏览器打交道。这也是我来这个组一年多，第一次觉得这是在做一个项目。现在也终于有了在这个行业留下午的信心。




### 未来可期

2019年底来了一个对给予k8s上层搞应用比较熟悉的人，我看了很多他写的文档，发现他对k8s本身并不是很熟悉但是对扩展k8s很熟悉。我就开始预谋和他搞一些东西，和他聊了几次，也就是被他忽悠了几次，和现在的leader说，也同意了部分的人力去和他一起搞。


我开始接触了各种扩展k8s能力的框架和技术，我开始恢复了对这个方向的激情，毕竟在搞完k8s升级之后我就开始迷茫了一下子。当时我就是两个组的人了，但是大多时间我都在做自己喜欢的事情，现在leader给我安排活我就是睁一只眼闭一只眼。因为感觉到了能有足够的成长的空间，所以十点多到住的地方，洗漱之后继续学习。周末总会抽出一天的时间。


我选择在这个时候离开，虽然有点惋惜但还学会了如何在这个方向上深耕。简而言之就是，在社区中找到自己喜欢的项目去投入时间，去量化投入，比如每天晚上两个小时、三周一篇文章等。如果这个项目能运用到工作的项目会更好。想起我年初的时候立的成为kubernetes contributer的flag，其实如果具体落实到每天一个小时源码也不是不能实现的。

### 我的反思

我开始见识到了扩展k8s的能力能做到的很多事情，也和这个厉害同事在交流中进步。这个同事已经工作了十几年了，和他聊天中最受触动的一段话就是，“我从毕业就是一直想找个大牛，然后跟着大牛混就行了，工作了一些年发现这个大牛一直没有找到，后来发现社区各种大牛都有，社区是个正常和学习的好地方”。这句话对我触动比较大，我也是想毕业跟这个大牛混，可想从毕业就被mentor弄到了其他和他不相关的组了。


这个时候想起了我实习时候的leader，他的职业战绩可以用辉煌来形容了，本科毕业去百度四年左右，搞到了T7，肯定是有股票了2013年左右的时候百度正值巅峰。然后又跳槽去360带技术团队，2015年左右接触到了比特币几块钱一个买了几万个比特币，然后也赶上360上市，血赚一波，最后去了同城艺龙，也上市了又血赚了一波，然后来了我们公司两年左右的时间离职去创业当CTO了。



毕业两年多，我的几个同学也是混的风生水起，其中有一个就是表达能力特别强，而且是不给自己设边界，什么活都能搞。他看中的是业务价值，目标是对业务产生价值。还有一个同学在校期间就特别厉害，表达能力强而且水平也特别强，现在在大厂都开始带小弟了。但是我和他接触的比较少，能学到的东西还是少了一些。


现在也有点看开了，这种经历和能力都是不能复制的。现在环境给你的是森林，你却要是的是海洋，这样有点不切实际。


我的这两年可是说是探索的两年，探索自己的兴趣，探索自己在职业上的发展。从前端转为k8是相关，中间也犹豫迷茫了好长一段时间，好在调整过来了。现在也和一个好朋友在搞同一个方向，也算是同一个大方向下的不同小方向吧，都属于基础架构大类的。以前和好朋友一起搞一个[技术周报](https://github.com/cloudWeekly/weekly_text)督促学习，但是同行的那个货一次没提交，坚持了几次就无疾而终了。


## 总结

目前接触devops/运维相关也有17个月的时间了，从一个小白变为了现在的小白白，也靠这段时间学到的东西找到了一份相关的工作。也找准了自己未来的发展方向。




对于现在的我来说，或许离开前端是个比较好的选择，毕竟刚毕业技术成长是比较重要的，前后端更加偏向于业务了，属于利用技术解决问题的层级了。


你好kubernetes，再见前端。

