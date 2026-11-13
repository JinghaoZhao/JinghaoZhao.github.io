# 今日科技长文：Claude 用 11 天把费马大定理变成了机器可以逐步检查的证明——真正被压缩的不是“发现数学”的时间，而是“验证数学”的时间

今天推荐 Anthropic 于 **2026 年 9 月 4 日**发布的长文 **《Formalizing Fermat’s Last Theorem》**。这是 Anthropic Science 的官方研究文章，**全文免费公开**，并且完整 Lean 证明代码已经放到公开 GitHub 仓库中，可以由其他人独立重新检查。[阅读 Anthropic 原文](https://www.anthropic.com/research/formalizing-fermats-last-theorem) [查看完整证明仓库](https://github.com/anthropics/fermats-last-theorem)

我今天选它，是因为标题很容易被误读成“Claude 11 天重新解决了困扰人类 350 年的费马大定理”，但真正发生的事情其实更有长期意义。Claude **没有发现新的费马大定理证明**，它主要沿着 Wiles、Taylor–Wiles，以及 Darmon、Diamond、Taylor 后来整理出的证明路线，把已经被数学界接受的人类数学翻译成 Lean proof assistant 能从底层逻辑逐步验证的形式。真正的新纪录是：一个过去被预计需要数学家团队花费数年完成的 formalization project，被几十个 Claude agents 在大约 11 天里推进到端到端完成。最终产物约有 **1300 万行 Lean 代码，构造了约 30,300 个中间定理，其中约 29,500 个进入最终证明**，规模超过 Mathlib 本身五倍。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这篇文章真正改变我的判断，是因为它展示了 AI for Science 中另一条可能比“AI 直接发现一个新定理”更快产业化的路径：**先让证明的 verification 成本接近机器成本。** 当 AI 自己未来可以在一天里产生几百甚至几千个数学论证时，真正的瓶颈很可能不再是“有没有人提出 conjecture”，而是“谁能确认这些证明到底是真的”。这次费马大定理项目，就是一个非常大的 verification stress test。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

## 先把最容易误解的一件事说清楚：Wiles 仍然是那个证明费马大定理的人

费马大定理说，对于任意整数 `n>2`，不存在正整数 `a,b,c` 满足 `an+bn=cn`。

Pierre de Fermat 大约在 1637 年写下这句话，并声称自己有一个“极其美妙的证明”，只是书页边缘太窄写不下。此后数学家寻找证明超过三个半世纪。Andrew Wiles 在 1993 年第一次公开宣布证明，但同行审查几个月后发现一个关键缺口；他又花了大约一年，与 Richard Taylor 合作修补，最终在 1995 年正式发表正确证明。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

所以 Anthropic 这次没有重新经历 350 年的 discovery。

Claude 已经知道数学界后来形成的证明结构。

它做的是另一件极其繁重的工作：

把数学家写给数学家看的证明，转换成**计算机可以从逻辑公理开始逐步骤核验的证明对象**。

这两个任务差别非常大。

人类数学论文会大量使用类似“显然”“由标准结果可知”“按照同样方法”“直接计算得到”这样的跳跃。专业数学家能够依靠几十年的共同知识补上这些省略。

Lean 不行。

Lean 不接受“显然”。

每一个对象必须定义。

每一个类型必须正确。

每一次使用旧定理，都必须精确满足定理的前提。

甚至数学家认为完全不值得写的一些转换步骤，也必须被机器明确证明。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

所以 formalization 并不是把一篇129页论文机械翻译成另一种语言。

它更像把一栋建筑的蓝图转换成一份包含**每颗螺丝、每个连接点、每条承重关系**的完整工程模型。

## 为什么数学家其实早就想做这件事，但做了很多年仍然没有完成

2000 年代以后，proof assistant 越来越成熟。Lean、Coq/Rocq、Isabelle 等系统都试图把数学证明变成机器可验证对象。

Jan Bergstra 很早就提出，Wiles 的费马大定理证明应该被形式化。

但真正困难的是，Wiles 的证明不是孤立的。

它依赖现代数论里一个庞大的技术体系，包括椭圆曲线、模形式、Galois representations、Hecke algebras、变形理论以及 Taylor–Wiles 方法等大量对象。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

如果 Lean 的数学库里没有某个定义，你首先要形式化定义。

如果定义有了但没有某个定理，就要证明那个定理。

然后才能继续往下一层走。

因此 formalizing mathematics 具有一个非常明显的基础设施问题：

**你不是只证明眼前那个 theorem，还必须补齐它脚下缺失的整片数学地基。**

Imperial College London 的 Kevin Buzzard 从 2024 年开始推动社区正式进行 FLT formalization。Anthropic 指出，仅项目早期阶段用来描述应该完成什么的 blueprint 就有 **86 页**，而整个工作此前普遍被认为需要多年。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这也是为什么 11 天这个数字真正令人吃惊。

不是因为 Claude 用11天想出了 Wiles 花几年才想到的数学。

而是因为它用机器速度吃掉了原本需要大量专家劳动力完成的**形式化工程量**。

## Anthropic 一开始其实失败了，而且失败原因非常像大型软件工程团队

Tianyi Peng 最初只是想看看 Claude 能不能在 FLT formalization 上取得一些进展。

第一轮实验并没有成功。

Claude agents 开始阶段能够分别解决一些数学子问题，但项目扩大以后，很快失去对整个工程状态的把握。不同 agents 不清楚哪些 theorem 已经证明、哪些正在被别人做、哪些依赖关系已经改变，也很难长期维持有效协作。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这里很值得注意。

失败原因并不是：

“Claude 不懂数学。”

更接近：

**Claude 不会管理一个拥有数万任务、数百万依赖关系的长期工程项目。**

这与 coding agents 最近遇到的问题高度相似。

一个 agent 写500行代码很容易。

让几十个 agents 连续两周维护一个不断变化的大型 repository，问题马上变成 project state、dependency management、memory 和 coordination。

Anthropic 这次真正的突破之一因此不是模型本身，而是一个叫 **Prove2Me** 的外部 scaffolding system。[数字对象标识符](https://doi.org/10.48550/arXiv.2608.28433)

## Prove2Me 最关键的作用，是把一个巨大数学证明变成一张可以分工的 dependency graph

Prove2Me 把整个 formalization 表示成一个 directed acyclic graph，也就是 DAG。

图里的每个节点是一条需要证明的 theorem。

节点之间的边表示依赖关系。

如果 theorem C 必须使用 theorem A 和 B，那么图上就会明确表示这种关系。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这样 agent 不需要把整个1300万行工程装进自己的 context window。

一个新的 agent 只需要询问系统：

哪些前置定理已经完成？

哪些节点现在可以开始？

哪些任务正在由其他 agent 处理？

我的结果会解锁后面的哪些 theorem？

这其实类似现代软件工程中的 issue tracker + build graph + package manager。

AI 的有限 context 不再负责存储整个项目状态。

**外部软件替模型记住状态。**

这是最近 agent systems 反复出现的架构模式。

模型本身只负责局部 reasoning。

长期记忆、任务状态、权限和依赖关系由 deterministic infrastructure 管理。

因此真正强大的 AI system 往往不是“给模型更长 context”，而是：

**让模型不需要记住不应该由模型记住的东西。**

## Prove2Me 还解决了一个非常实际的问题：1300万行 Lean 不可能每改一处就全部重新编译

Lean proof 本身也是软件。

如果所有 theorem 和 proof 都塞在巨大文件里，一个 agent 修改其中一个小步骤，就可能触发庞大的重新编译和验证。

Prove2Me 因此把 theorem statement 与具体 proof 分开存储，并单独管理它们之间的 dependency。这样局部工作就可以局部检查，而不必每次让整个项目从头跑一遍。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

同时，系统给每个 theorem 节点保存自然语言描述。

原因很简单。

Lean statement 对机器来说非常精确，但如果 agent 想问：

“有没有一个已经证明的结果可以处理这种 Jacobian？”

纯粹搜索 Lean syntax 并不方便。

自然语言 metadata 让 agent 可以语义搜索已有结果，然后复用。

这也是为什么我会把 Prove2Me 看成这篇文章真正重要的第二主角。

Claude 提供 intelligence。

Prove2Me 把 intelligence 变成可以长期协作的 engineering organization。

## 最终运行方式更像一个几十人的 AI 数学研究团队，而不是“一只 Claude 思考了11天”

成功版本使用几十个 Claude agents 并行工作。

一些负责定义数学对象。

一些负责证明基础 lemma。

另一些基于已经完成的 lemma 攻击更高层 theorem。

当低层节点证明完成以后，dependency graph 自动解锁更高层任务。

整个系统最终不断向 FLT root node 收敛。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

人类的数学干预反而非常有限。

Peng 偶尔给出类似“Jacobian as a scheme sounds high priority”“尽快推进 Mazur theorem”这样的高层方向，但并没有逐条告诉模型具体证明应该怎样写。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这点特别值得区分。

人类仍然提供了证明路线、已有数学文献、Mathlib、Lean 以及整个项目 scaffolding。

所以不能说 AI “没有依赖人类数学”。

但在真正大量 formal proof construction 上，人工参与程度已经明显下降。

Anthropic 使用的是内部 general-purpose research model，能力大致相当于 Claude Fable 5.1，整个过程消耗约 **60 亿个 output tokens**。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这里的60亿 token 也很值得记住。

1300万行证明听起来巨大，但本质上它开始被重新定价成一种 **inference compute workload**。

过去：

大量 mathematician-years。

现在：

大量 agent tokens + verification compute。

这正是自动科研经济学正在出现的转变。

## Claude 最终并不是简单把 Wiles 原论文从第一页翻译到最后一页

最终证明沿用的是 Frey–Serre–Ribet–Wiles–Taylor-Wiles 的经典逻辑，并主要跟随 Henri Darmon、Fred Diamond 和 Richard Taylor 提供的简化 exposition，而不是逐句 formalize Wiles 原始论文。[Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

粗略理解，整个现代证明的核心逻辑是把一个看起来属于整数方程的问题，转换成另外两个数学世界之间的冲突。

如果假设存在一个违反费马大定理的整数解，可以据此构造一种特殊的椭圆曲线，也就是所谓 Frey curve。

Serre 进一步提出，这种曲线应该具有非常特殊、甚至“不可能”的 modularity 性质。

Ribet 后来证明，如果费马大定理存在反例，对应 Frey curve 就会与某类 modularity 结果冲突。

于是问题发生一个极其重要的转换：

你不再直接试图证明“所有 `a,b,c,n` 都不可能”。

而是证明足够大类别的椭圆曲线必须 modular。

Wiles 最终成功证明的就是这个更深的结构性结果中的关键部分。

然后 contradiction 闭合，FLT 随之成立。

Anthropic 的 formalization 必须把这条跨越大量现代数学领域的桥真正铺成 Lean 能检查的逻辑链。[GitHub](https://github.com/anthropics/fermats-last-theorem)

所以 Kevin Buzzard 特别强调，真正令人印象深刻的并不是最终那一行“Fermat’s Last Theorem”，而是系统中间自动 formalize 了代数、几何、调和分析和数论等大量结构，并且这些 artifact 已经足够稳定，可以继续作为其他正式数学工作的地基。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

## 为什么1300万行反而说明 AI 现在并不“优雅”

Anthropic 自己特别提醒，不能把1300万行理解成证明本身数学上就必须这么长。

Mathlib 是由大量数学家长期维护、精炼和 review 的高质量库。

Claude 生成的 artifact 明显更加冗长。

Anthropic 承认，它之所以达到 Mathlib 五倍体量，一部分原因就是 AI-generated formalization 并没有追求人类喜欢的简洁和美感。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这其实揭示了一个很有意思的 AI 优势。

人类数学家很在乎 elegance。

如果两种方法都能证明一个 theorem，数学家通常喜欢更简洁、概念更统一的那个。

机器首先在乎：

**能不能通过 kernel。**

所以它完全可以用一种非常“暴力”的方法，多证明成千上万个局部 lemma，只要最后全部逻辑成立。

这与 AI coding 很像。

AI 第一次生成的 production system 未必优雅。

但如果生成成本接近零，而 verifier 非常严格，那么先生成一个巨大但正确的系统，再逐步压缩重构，可能比让人类从第一天就追求 elegance 更经济。

## “Lean 检查通过”到底意味着多强的正确性保证？

这里是整件事情最需要弄清楚的地方。

Anthropic 并不是简单运行一套自己写的 test，然后宣布“通过”。

最终 repository 公开给出了 theorem statement：

对于自然数 `n≥3` 和正自然数 `a,b,c`，证明 `an+bn≠cn`。[GitHub](https://github.com/anthropics/fermats-last-theorem)

证明首先由 Lean 4.33.1 的 kernel 从头检查。

整个 repository 一共有 **60,475 个 modules**。

Lean kernel 检查每一条 declaration，并确认最终 theorem 只依赖 Lean 的三个标准公理：`propext`、`Classical.choice` 和 Quot.sound。[GitHub](https://github.com/anthropics/fermats-last-theorem)

repository 还明确禁止利用 sorry、人为新增 axiom、`native_decide`、unsafe code 等捷径“假装”证明。

也就是说，不能写一句类似：

“这里先假设这个关键 lemma 是对的。”

然后跳过去。

如果存在这种漏洞，final build 会失败。[GitHub](https://github.com/anthropics/fermats-last-theorem)

## Anthropic 又用了第二套工具确认“你证明的真的是费马大定理，不是一个偷偷改过定义的版本”

formal verification 有一种经典风险。

模型可能形式上证明了某个 theorem，但 theorem statement 本身被写错了。

例如你真正想证明：

所有 `n>2`。

模型却悄悄证明：

某个特定 `n`。

Lean 仍然会说 proof 完全正确。

因为 proof assistant 只负责回答：

“你给我的 statement 是否由这些 axioms 推出来？”

它不会替人判断：

“这是不是你原本想证明的那个数学命题？”

因此 Anthropic 使用 leanprover/comparator 把 Claude 最终 statement 与 Mathlib 已经存在的标准 Fermat’s Last Theorem statement 做比对，确认涉及的常量、定义和 theorem semantics 一致。[GitHub](https://github.com/anthropics/fermats-last-theorem)

这一步其实与软件安全中的 specification verification 很像。

证明程序符合 specification 不够。

你还需要确认：

**specification 本身写对了。**

## 更进一步，整个证明又被第二个独立 Lean kernel 重放了一遍

为了减少“Lean 自己 kernel 有 bug”这种单点风险，Anthropic 又使用了 **nanoda**。

这是另一套用 Rust 编写、与 Lean 主 kernel 独立实现的 checker。

Nanoda 最终检查了 **1,052,234 个 declarations，没有报错**。[GitHub](https://github.com/anthropics/fermats-last-theorem)

团队为了让它在如此巨大 proof 上运行得更实际，对 nanoda 做了四处小修改，其中三处属于性能优化、一处用于显示进度；repository 明确说明，这些修改没有增加、删除或放松任何 typing rule。[GitHub](https://github.com/anthropics/fermats-last-theorem)

所以今天对这份 proof 的信任链并不是：

“Anthropic 说 Claude 做对了。”

而是：

公开 theorem statement。

公开1300万行 proof artifact。

Lean kernel 检查。

独立 comparator 检查。

另一个独立 kernel 再重放。

任何人理论上都可以重新运行。

这就是 formal proof 与普通 LLM-generated mathematics 最大的区别。

**你不需要相信 Claude。**

这恰恰是这项工作的意义。

## 一个非常深的悖论出现了：AI 生成的证明可能越来越没人能读完，但我们反而可以更确定它是对的

传统数学的信任来自人。

论文发表。

referee 阅读。

同行讨论。

越来越多人理解。

最终成为共识。

但数学越来越复杂以后，这个系统早就存在 scalability problem。

Anthropic 在文章中回顾了几个很有代表性的案例。

Thomas Hales 1998 年证明 Kepler conjecture 后，12名 referees 审了四年，最后仍然只能给出大约“99% 确信”的结论。Hales 后来组织20人团队做 Flyspeck formalization，才最终获得机器级确认。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

Perelman 2002 年解决 Poincaré conjecture 后，数学界又花大约四年，并写出三套各约300页的解释，才真正形成广泛确认。

Harald Helfgott 2013 年证明 weak Goldbach conjecture，Anthropic 指出相关完整审查至今仍未彻底结束。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

所以数学其实早就有一个隐藏的问题：

**发现 theorem 的速度，正在逐渐超过人类 community 验证 theorem 的速度。**

如果 AI 再把 discovery throughput 提高100倍，这个问题会爆炸。

## 因此 Anthropic 真正提出的未来，是“论文给人看，formal proof 给机器看”

Anthropic 并不认为 future mathematics 应该变成1300万行 Lean，人类从此不再理解证明。

相反，它明确说 formal proof 不应该替代 human-readable exposition。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

最合理的结构可能是双轨制。

人类论文负责回答：

这个 theorem 为什么重要？

核心 idea 是什么？

证明为什么有趣？

它和已有数学之间有什么关系？

formal artifact 负责回答另一件事情：

**逻辑链是否真的闭合？**

未来一个重要数学结果可能同时发布两份东西。

一篇50页人类能读懂的论文。

外加一个模型生成、可能几百万行、但 Lean 可以完全检查的证明。

人类不需要逐行读 Lean。

就像今天程序员不会手动检查 CPU 执行的每一条 machine instruction。

我们信任的是 verifier。

## Claude 写 Lean 可能不只是帮助“检查答案”，反而可能帮助它自己发现新数学

Anthropic 文章里还有一个容易被大标题掩盖的重要观察。

团队发现，让 Claude 在做新数学研究的同时进行 formalization，似乎会改善模型本身的 reasoning。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

原因很容易理解。

如果模型只写自然语言数学，它很容易形成一个看起来非常漂亮但某一步其实有漏洞的 argument。

Lean 会立刻拒绝。

于是 formal proof assistant 本身就像数学 agent 的 unit test。

Claude 可以提出一个 conjecture。

尝试把其中一部分写成 Lean。

失败。

发现假设不够强。

修改 theorem。

再试。

这与程序员写代码以后跑 tests 完全类似。

Anthropic甚至把这种过程类比成科学家用 numerical simulation 检查自己的 hypothesis。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这可能比 FLT formalization 本身更重要。

因为它意味着 formal verification 不只是一个**结果审核工具**。

它也可能成为 AI mathematical reasoning 的 **training environment / feedback mechanism**。

## 一个很重要的成本信号：不一定需要 Anthropic 内部的大型研究集群才能做这种事情

FLT 项目本身用了大约60亿 output tokens，因此显然不是普通个人随便跑一下午的任务。

但 Anthropic随后做了一个更小的实验。

研究人员只使用 **三个普通 Claude Max 个人订阅**，让 agents 通过 Prove2Me 协作 formalize Hardy–Littlewood circle method 的一些应用。

它们最终只用 **3 天**完成了 Vinogradov’s Three Primes Theorem 的 formalization。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这其实是一个非常强的 democratization signal。

如果 major-theorem formalization 从：

顶级 proof-assistant 专家团队 + 数年，

下降到：

几份消费级 AI 订阅 + 几天，

那么 mathematics 的 formalization rate 可能突然提高几个数量级。

真正的瓶颈就会从“谁有足够多 Lean experts”，变成：

**谁愿意把 existing mathematics 提交给 AI formalization pipeline。**

## 我认为这篇文章真正重要的地方，不是费马大定理，而是“知识验证”的边际成本可能开始暴跌

下面是我的延伸判断，不是 Anthropic 原文的直接结论。

我们过去主要把 AI 看成一个 **knowledge generator**。

写文章。

写代码。

生成图片。

提出 hypothesis。

设计蛋白。

生成 mathematical proof。

但随着 generation 越来越便宜，一个更根本的问题正在浮现：

**谁验证？**

如果一个 AI research system 一天可以生成1000个数学 conjectures，人类数学家一天只能认真检查一个，那么“AI 会不会有更多 idea”根本不是主要限制。

最稀缺的是可信 feedback。

而数学恰好是非常特殊的领域：

它拥有一个极便宜、极严格，而且几乎没有主观性的 verifier。

Lean kernel 不在乎 proof 是 Wiles 写的、Claude 写的还是匿名高中生写的。

只问：

**从这些 axioms 出发，这个 conclusion 是否真的成立？**

这使数学可能成为 automated science 最早出现极端 acceleration 的领域之一。

## 这和过去一周我们追踪的 AI researcher、自动实验、自动芯片设计其实是同一个故事

最近这些结果表面上毫不相关。

Claude 自动做 alignment research。

AI 自己运行 hardware-design experiments。

自动实验室让模型控制真实仪器。

现在 Claude 又 formalize FLT。

但下面存在完全相同的生产函数变化：

**generation 变便宜以后，verification 决定 automation 能走多远。**

代码特别容易被 AI 自动化，因为有 compiler 和 unit test。

数学特别适合，因为有 proof assistant。

芯片更难，因为 simulation 和 formal verification 最后还必须面对真实 silicon。

生物更难，因为最终 verifier 是湿实验、动物或临床。

现实世界越难提供快速、可信反馈，AI acceleration 越慢。

所以我越来越认为，预测哪个行业会最早被 agent 大规模改变，不能只问：

“LLM 对这个领域懂多少？”

更应该问：

**“如果 AI 一小时产生一万个答案，我们能不能一小时判断哪几个答案是真的？”**

## 这对“AI 会不会真正做科学”也给出了一个比 benchmark 更实用的判断标准

今天争论 AI science 时，经常问：

模型有没有真正 originality？

能不能独立产生 Nobel-level discovery？

我认为短期更值得看的指标不是这个。

更应该观察的是：

**一个完整 research loop 中，有多少人类步骤已经可以被机器替换，而且剩余 verification 成本是多少。**

FLT 这次已经展示一个相当完整的局部闭环：

已有数学文献 → AI 拆解任务 → 多 agent 并行 → Lean 反馈 → 修改 proof → DAG 更新 → 下一层 theorem → kernel verification。

真正稀缺的人类投入越来越向两端移动。

一端是 deciding what matters，也就是选择研究问题和理解意义。

另一端是 specification，也就是确保我们验证的是正确问题。

中间大量 formal construction 开始可以变成 compute。

如果这个趋势继续，我甚至认为数学论文未来可能出现一种非常有意思的变化：

“Proof omitted for space” 这种传统写法会越来越没有理由存在。

不一定要把完整 proof 放进正文。

但应该附上一个 machine-checkable artifact。

因为当生成 formal proof 的成本降到足够低以后：

**“你为什么没有形式化？”反而会变成新的问题。**

## 对 AI 产业的意义，是一种此前很少被计入的 inference demand：知识本身开始需要机器审核

这件事情也有一个不太直观的 AI infrastructure 含义。

FLT project 消耗约 **60亿 output tokens**。[anthropic.com](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

这些 token 没有服务任何聊天用户。

也没有生成广告文案。

它们全部用于：

定义 theorem。

尝试 proof。

失败。

修改。

重新编译。

协调 agents。

继续证明。

换句话说，这属于一种新的 compute category：

**verification-time / research-time inference。**

如果未来数学、软件、芯片、法律甚至部分科学研究都采用类似模式，那么 AI compute demand 不只是“人问多少次 ChatGPT”。

一个研究人员提交一个问题以后，后台可能启动几十个 agents，产生几十亿 tokens，然后调用大量 deterministic verifier，再返回一个最终 artifact。

这和传统 search query 或 chatbot message 的经济学完全不同。

一个用户的一次“研究请求”，背后可能相当于几千小时数字劳动力。

## 最后，我认为这篇文章真正值得记住的是一个非常反直觉的变化：AI 可能让数学变得更难“读”，却更容易“相信”

13 million lines obviously不是人类数学阅读的理想未来。

没有人会坐下来逐行看完。

AI formalization 初期也一定会产生大量重复、低质量、难维护的 proof artifact。

所以这并不是“Claude 已经比数学家更会写数学”。

真正的变化是另一件事：

过去数学的可信度最终依赖有限数量的人类专家花几个月甚至几年检查。

未来 proof 可以大到没有一个人真正从头读完，却仍然因为一个极小、公开、可重复验证的 kernel 而获得比人工审稿更强的逻辑确定性。[GitHub](https://github.com/anthropics/fermats-last-theorem)

这会让 AI-generated mathematics 出现一个很有意思的分工。

**AI 可以负责规模。**

一次生成几万 theorem。

**Lean 负责真伪。**

逐条检查逻辑。

**人负责意义。**

判断哪些 theorem 值得理解，哪些 proof 揭示了真正的新结构，哪些只是机器制造出来的冗长正确答案。

如果这种分工成立，那么 Claude 这次 formalize Fermat’s Last Theorem 的意义，就并不是终于“证明了一个350年前的问题”。

那个问题30多年前已经解决了。

真正的新事情是：

**我们第一次看见一个现代数学最复杂、最经典的证明之一，被转换成了一种 AI 可以大规模生产、机器可以完全验证、人类不必逐行信任的知识 artifact。**

对未来 AI science 来说，这可能比“Claude 又解出一道奥数题”重要得多。因为一旦 AI 开始比人类更快地产生研究结果，科学真正最缺的东西不会是更多答案，而是一个可以低成本回答这句话的系统：

**“证明给我看，而且让我不需要相信你。”** [Anthropic](https://www.anthropic.com/research/formalizing-fermats-last-theorem)
