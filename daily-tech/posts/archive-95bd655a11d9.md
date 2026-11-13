# 今日科技长文：微软开始把 AI 基建从“军备竞赛”改写成“良率竞赛”——未来真正值钱的不是有多少 GPU，而是每瓦电、每字节内存、每美元能产出多少“有用智能”

今天推荐微软 Azure 硬件系统与基础设施总裁 **Rani Borkar** 于 **2026 年 9 月 1 日**发表的长文 **《The yield imperative: Turning AI infrastructure into useful intelligence》**。文章发布在 Microsoft 官方博客，**全文免费公开**，随后也是她在 SEMICON Taiwan 2026 上阐述的核心框架。[阅读微软原文](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/) [The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

我今天选这篇，是因为它没有再重复“AI 需要更多 GPU、更多电、更多数据中心”这条市场已经非常熟悉的叙事，而是在试图重新定义整个 AI 基础设施行业的核心 KPI。Borkar 借用了半导体产业用了六十多年的一个词：**yield，良率**。传统晶圆厂不会因为买了多少台光刻机、投入多少资本就认为自己成功，真正重要的是一片 wafer 最后能产出多少颗可用芯片；微软认为 AI 基建也应该这样思考。全球正在投入国家级规模的资本、吉瓦级电力、创纪录数量的晶圆和数据中心，但最终真正应该衡量的不是建了多少算力，而是这些资源究竟转换成了多少**可负担、可使用、能够真正完成工作的智能**。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这篇文章尤其值得和最近几天我们讨论的 agent、内存短缺以及 research-time compute 放在一起读。微软给出的一个非常夸张但重要的数据是：一个完整 **agentic task 的 token 使用量可以超过一次普通聊天交互的 3,400 倍**。与此同时，微软自己的全球 AI Diffusion 数据显示，截至 2026 年第一季度，全球约 **17.8% 的劳动年龄人口**使用生成式 AI，也就是说 agent 化真正大规模进入工作场景其实还远没有开始。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

如果这两个数字同时成立，就会出现一个非常现实的问题：

**我们还处在 AI 使用率只有不到五分之一、主要还是聊天的阶段，电力、内存、机架密度已经开始成为瓶颈；如果以后每个人从“问十句话”变成“让 agent 工作两小时”，单纯靠继续堆 GPU 根本不可能无限解决问题。**

这就是微软所谓的 yield imperative。

## 半导体行业过去六十年真正学会的事情，不是“制造更多”，而是让同样的投入浪费得更少

Borkar 从 semiconductor manufacturing 的基本逻辑开始。

一块 wafer 上可能制造几百颗 die。

但真正决定工厂经济性的，不是理论上画了多少颗，而是最后有多少颗通过测试、可以卖给客户。

所以半导体行业长期 obsess 的不是单纯 capacity，而是 yield。

工艺节点进步以后，如果缺陷太多、良率太低，那么最先进的 transistor density 也没有商业意义。

Borkar 的核心比喻是：今天 AI infrastructure 也到了类似阶段。

我们现在非常习惯看各种输入指标。

多少张 GPU。

多少 GW 数据中心。

多少 HBM。

多少亿资本开支。

多少万亿 tokens。

但这些都属于 input 或 intermediate output。

真正的问题应该是：

**最后完成了多少有价值的工作？**

如果一座 1GW 数据中心理论 FLOPS 很高，但 GPU 因为网络拥塞、内存瓶颈、功率限制或调度问题大量空转，那么名义 capacity 并没有真正转化成 intelligence。

反过来，如果系统级优化可以让同样一座数据中心多完成30%的有效 inference，那么从经济意义看，相当于“凭空增加”了相当可观的一部分 capacity。

这就是文章真正想把 AI infrastructure discussion 从 **capacity** 推向 **utilization × efficiency × useful output**。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

## 微软认为，AI 行业现在正在掉进一个“More treadmill”：每次性能进步，都要求投入更多东西

过去几年的产业路线非常直观。

模型变大。

于是芯片变大。

芯片旁边放更多 HBM。

一台服务器的功率上升。

rack density 上升。

需要更多交换机、光模块和 fiber。

然后数据中心本身扩大。

这条路线当然有效。

Borkar并没有否认未来仍然需要继续建设大量 capacity。

问题是，如果**每增加一单位有用输出，需要投入越来越多新增资源**，那么整个产业就像跑在一台只能靠持续加料才能前进的跑步机上。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

现在一些物理约束已经越来越明显。

电力不是想买就有。

先进封装不是无限的。

HBM 不是无限的。

高端交换芯片、光模块和网络也需要供应链扩张。

高功率 rack 又进一步要求液冷、变压器和数据中心配电全部升级。

所以微软认为未来必须同时走两条路线。

一条是 evolutionary：继续把今天已有架构一点一点优化，例如更好的 utilization、更好的 compiler、更高效 networking、更低功耗。

另一条则是 transformational：改变整个 curve，例如新的 system architecture、新材料、新 power delivery，以及重新设计 model 与 hardware 的边界。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

Borkar 用半导体历史里的两个转折做类比。

CPU 单纯继续拉高 clock frequency 最终撞上 power wall，于是产业转向 multicore。

平面 NAND 继续缩小 cell 也逐渐遇到极限，于是 NAND 开始向三维堆叠。

她的意思不是 AI 行业已经明确知道“下一个 multicore”是什么，而是说：

**当一种 scaling 方法越来越贵时，真正的大突破往往来自改变 architecture，而不是继续把旧 architecture 做得更大。**

## 这篇文章最重要的工程观点，是一个瓶颈通常不能在它出现的那一层解决

微软说自己运营超大规模 Azure 基础设施后得到两个经验。

最棘手的 constraint，往往不能只在看起来出问题的那一层解决。

而很多我们以为属于“物理必然”的 trade-off，实际上只是现有 architecture 造成的。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这句话很重要。

例如：

内存不够。

最直觉的答案是买更多 HBM。

网络不够快。

就买更多更快的 switch。

电力不够。

就建更多变电站。

微软认为这种 component-by-component 思维越来越不够。

真正的做法可能是：

模型少用一点 memory。

compiler 改变 data placement。

芯片减少 data movement。

network architecture 降低通信开销。

software scheduler 提高 GPU utilization。

然后整个系统对 HBM 和电力的需求一起下降。

这也是微软为什么不断强调 **co-design**。

不是每一层单独把自己的 benchmark 做到最大，而是整个 stack 一起围绕最终 workload 优化。

## 内存：微软认为现在最容易误解的是，我们把“memory shortage”当成 supply-chain 问题，其实它首先是 system-design 问题

文章对 memory 的讨论尤其值得关注，因为我们最近一直在追踪 HBM、DRAM 和 NAND。

微软的判断很明确：**inference 的一个核心限制正在从纯 compute 转向 memory。** [The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

原因并不只是模型参数量大。

模型权重需要存。

context 需要存。

生成过程中的 KV cache 需要存。

Agent 又进一步让情况恶化。

普通聊天可能是：

用户问一句。

模型答一句。

结束。

Agent 则可能持续几十分钟甚至几小时。

期间不断：

生成内容。

检索资料。

调用工具。

读取工具结果。

重新规划。

保留之前上下文。

访问 persistent memory。

于是 memory horizon 被明显拉长。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这也是为什么“agent token 是聊天的3400倍”并不只是一个 inference FLOPs 问题。

它同时意味着更庞大的状态需要长期保持在靠近 compute 的位置。

## 微软的解决方案并不是“Maia 下一代多装一倍 HBM”，而是让每一层共同降低每 byte 的浪费

Borkar 用 Azure Maia 平台解释了这一点。

首先可以从模型本身下手。

模型 architecture、数据处理和 compression 技术可以降低 KV cache footprint。

然后 software 可以更聪明地管理不同 memory tiers。

Compiler 可以决定哪些数据应该尽可能靠近 compute。

Silicon 则可以优化 data movement。

这些优化分别看可能都不够彻底。

但叠加以后，同样的 memory capacity 就能够服务更多 tokens 和更长 workflow。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这就是她所谓的：

**more intelligence per byte。**

这里的思维和过去 GPU 行业特别不同。

过去很容易把 HBM capacity 看成类似油箱：

32GB 不够就64GB。

64GB不够就128GB。

微软现在更像在问：

每1GB究竟完成多少有价值的 inference？

这会成为未来 AI 系统非常重要的 optimization direction。

## Maia 200 本身就是这种思维的产物：算力并不是设计的唯一中心，数据怎样移动同样重要

微软今年 1 月发布的 Maia 200 给这篇文章提供了比较具体的背景。

Maia 200 使用 TSMC 3nm 工艺，拥有超过 **1,400 亿晶体管**，提供 **216GB HBM3e、约 7TB/s memory bandwidth 和 272MB on-chip SRAM**。芯片支持 FP4 和 FP8 inference，FP4 峰值超过 10 PFLOPS，SoC TDP 约750W。微软宣称，相比其当时 fleet 中最新一代硬件，Maia 200 的 performance-per-dollar 提高约30%。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/01/26/maia-200-the-ai-accelerator-built-for-inference/)

但微软自己特别强调，FLOPS 并不是唯一因素。

如果 tensor core 在等数据，再高 FLOPS 也没有意义。

所以 Maia 200 专门加入针对低精度数据优化的 memory subsystem、DMA engine、片上 SRAM 和数据移动网络，目标就是让 compute 尽量持续吃到数据。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/01/26/maia-200-the-ai-accelerator-built-for-inference/)

这就是 yield framework 在 silicon level 的具体体现：

不是问“芯片理论能算多少”。

而是问：

**实际 inference workload 中，有多少 transistor 和 watts 真正在产生 tokens。**

## 网络：一颗 GPU 再快，如果几千颗 GPU 不能像一台机器一样工作，大量算力仍然会变成 stranded capacity

Borkar 把第二个例子放在 networking。

今天一座 AI cluster 的“智能”并不是某一颗芯片产生的。

是成千上万颗芯片共同工作。

所以 link bandwidth 当然重要。

但真正影响 cluster productivity 的还有：

拥塞。

故障恢复。

workload placement。

软件复杂度。

collective communication。

以及 scale-up 与 scale-out 的边界。

如果网络调度不好，昂贵 accelerator 就可能等数据。

那张 GPU 在账面上仍然属于 capacity。

但实际上那一分钟没有生产 intelligence。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

## Maia 的网络设计因此没有简单复制标准 GPU cluster，而是重新设计 silicon、NIC、transport 和 topology 的边界

Maia 200 使用一种两层 scale-up network，建立在标准 Ethernet 基础上，同时配套自定义 transport layer，并把 NIC 功能更紧密地集成到 silicon。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/01/26/maia-200-the-ai-accelerator-built-for-inference/)

每颗 Maia accelerator 提供约 **2.8TB/s 双向 dedicated scale-up bandwidth**。

集群设计可扩展到 **6,144 个 accelerators**进行高性能 collective operations。

一 tray 内四颗 Maia 使用直接连接，尽量让高带宽通信保持 local；跨 rack 仍使用统一 Maia transport protocol，从而减少额外网络层和 programming differences。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/01/26/maia-200-the-ai-accelerator-built-for-inference/)

微软认为这种架构带来的价值不是单纯 peak bandwidth 更高，而是：

减少不必要的 network hardware。

减少 stranded capacity。

简化 workload placement。

提高 fleet utilization。

最终目标还是那句话：

**让更多 compute 真正在工作。**

## 这里也解释了一个非常重要的投资视角：AI 网络的价值不是“传输数据”，而是避免数十亿美元 GPU 闲置

这部分是我的理解，不是微软原文的直接结论。

过去网络设备经常按本身 BOM 来看。

一颗 switch ASIC多少钱。

一个800G光模块多少钱。

但在 AI cluster 中，它们的经济价值其实越来越应该从 opportunity cost 看。

假设一个10亿美元 GPU cluster 因为通信瓶颈导致10%的 accelerator time 浪费。

那网络优化创造的潜在价值就远远不是“省了多少交换机成本”。

而是：

**释放了大约一亿美元级别的已有 compute productive capacity。**

这也是为什么 AI networking、optical interconnect、CPO 和高性能 Ethernet 的战略地位正在不断提升。

不是因为“网络变成主角”。

而是因为 GPU 足够昂贵以后，任何能提高 GPU utilization 的东西都会被重新定价。

## 电力：微软认为电已经从“数据中心的输入”变成了产品 architecture 的一部分

第三个例子是 power。

传统服务器时代，系统工程师可以相对简单地把 electricity 当作 external resource。

服务器设计好。

再考虑怎么供电。

现在这个思路正在失效。

Borkar指出，AI rack 已经从几十千瓦提高到几百千瓦，而整个数据中心 campus 可以达到 **GW 级规模**。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

所以 power 不再是：

“芯片做好以后插进墙里。”

而是从 grid、变压器、数据中心 distribution、rack 到 silicon 都要一起设计。

她特别提到 solid-state transformers 和 **800V DC** power delivery，希望通过减少多次转换降低配电损耗。与此同时 cooling 也必须在产品设计开始阶段就纳入，而不是服务器完成以后再想办法散热。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

## Cobalt 200 展示了更微观的一层：不要给整颗 CPU 一个统一功率策略，而是精确到每个 core

微软的 Azure Cobalt 200 是一个很好的例子。

Cobalt 200 是 Arm-based cloud CPU，拥有 **132 个 active cores**，使用 TSMC 3nm。

每个 core 都可以单独进行 Dynamic Voltage and Frequency Scaling，也就是 DVFS。[TECHCOMMUNITY.MICROSOFT.COM](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/announcing-cobalt-200-azure%E2%80%99s-next-cloud-native-cpu/4469807)

这意味着不同 CPU cores 不必全部运行在同一个电压和频率状态。

如果某些 workload 很轻，可以降低其 power。

某些 latency-sensitive workload 则维持较高性能。

微软同时加入 software-based per-VM power capping，让 power budget 可以从 VM workload 一直映射到 hardware control。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

最终效果不是：

“单台服务器少用几瓦。”

而是整个数据中心在固定 MW limit 下可以运行更多服务器。

这就是 **more compute per megawatt**。

## 这个逻辑对 AI 数据中心尤其重要，因为未来最硬的资源限制可能不是钱，而是 MW

如果资本是唯一限制，微软、Google、Meta、Amazon 可以继续融资。

但电力不是金融资产。

变电站需要时间。

输电线路需要审批。

发电厂需要建设。

很多地区新 data-center interconnection queue 已经很长。

所以未来一个 hyperscaler 即使拥有资金和 GPU，如果只能拿到1GW电力，那么真正决定 revenue 的问题变成：

**1GW 最后能跑出多少 billable AI workloads？**

这会让 performance-per-watt 从工程 benchmark 逐渐变成公司级经济指标。

所以微软的 yield framework 其实和整个 hyperscaler CapEx debate 高度相关。

市场通常问：

微软今年 CapEx 1000亿美元，到底能不能赚回来？

微软真正想引导投资者问的可能是：

**这些 CapEx 的每一美元能生产多少 token、多少 agent-task、多少客户 value？**

## 微软还有一个很重要的判断：很多我们认为固定的 architecture trade-off，其实可以重新谈判

Borkar 在文章中提出几个非常典型的问题。

系统到底应该优化 peak performance，还是 sustained throughput？

是否可以接受稍微降低 redundancy，换取显著更大的 usable capacity？

是支持更多功能更重要，还是更早把产品交付给客户更重要？[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这些问题的共同点是：

没有一个 universally correct answer。

传统 component company 往往优化自己的 metric。

芯片团队优化芯片。

网络团队优化网络。

power team 优化供电。

model team 优化 benchmark。

但从 hyperscaler 的角度，最终只有一个系统 economics。

如果 GPU 理论性能下降2%，却可以让系统功耗下降10%，从而在同一变电站接入更多 GPU，那么总体 token output 可能反而提高。

如果网络 redundancy 略降，却能把 cluster 部署提前半年，在 AI 模型迭代速度极快的时代，商业价值也可能更高。

所以 **yield-first design** 的本质，是从最终 output 倒推 architecture。

## 这也是为什么微软越来越强调自研 silicon，而不是只做一个 Nvidia GPU 的超大采购商

下面这一层是我的延伸理解。

如果 hyperscaler 只购买 merchant chips，那么优化空间主要发生在：

rack。

network。

software。

scheduler。

但一旦微软拥有 Maia、Cobalt，自身可以修改 silicon architecture，就能把优化范围继续往下延伸。

Model team 可以告诉 silicon team：

我们真正受限的是 KV cache。

不是矩阵算力。

Silicon team 再改变 memory hierarchy。

Networking team 改 communication fabric。

Compiler team 改 placement。

Data-center team 改 power envelope。

最终形成一个 vertically co-designed system。

这和 Google TPU 路线的战略意义非常类似。

自研芯片最重要的不一定是“便宜20%”。

而是**打破传统供应商边界，允许跨层优化**。

## 但这并不意味着 Nvidia 的价值下降，反而说明 Nvidia 自己为什么越来越像一家系统公司

Nvidia 最近几代架构其实也在走同一个方向。

如果只卖一颗 GPU，很难继续维持大幅 performance gains。

所以它逐渐把产品边界扩展到：

GPU。

NVLink。

NVSwitch。

Spectrum-X。

ConnectX。

CPU。

rack-scale systems。

液冷。

CUDA。

推理软件。

本质上也是在跨层解决同一个“useful yield”问题。

所以微软这篇文章真正反映的不是 Microsoft vs Nvidia 哪家路线一定更好。

而是整个行业已经从 **chip competition** 进入 **system competition**。

未来胜负越来越不由单颗 accelerator 的 TOPS/FLOPS 决定。

而由：

**silicon × memory × networking × software × power × cooling × fleet management 的乘积**决定。

## 这一点甚至可以用“乘法良率”理解：每一层只损失10%，最后系统损失可能远超10%

这是我认为 yield 这个比喻最有价值的地方。

假设一个系统拥有几个环节。

GPU utilization 90%。

网络效率90%。

memory efficiency90%。

power allocation efficiency90%。

software scheduling 90%。

如果简单把它们乘起来：

`0.95≈59`。

也就是说，每一层看起来都“只损失10%”，最后系统可能只把约六成 theoretical capacity 转化为真正 output。

反过来，每一层只改善几个百分点，系统级收益可以复利。

这就是 Borkar 所说“每一层都有自己的 yield，而 gains 和 losses 会 compound”的真正含义。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

它也是为什么 hyperscaler 会愿意同时做几十个看起来只有3%、5%、10%的工程优化。

在一个100亿美元级基础设施 fleet 上，5%利用率提升本身就是巨额经济价值。

## 3400 倍 token 消耗，是整篇文章里最值得投资者记住的数字

微软引用自己的 AI Diffusion 数据称，一次 agentic task 可能消耗普通 chat interaction **超过3,400倍 tokens**。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

这个数字不能理解成“以后所有 agent 请求一定都是聊天3400倍”。

不同任务差异会非常大。

但它揭示了 agent economics 的方向。

一次聊天可能是：

一个 prompt。

一个 response。

Agent workflow 则可能包含：

规划。

多轮 reasoning。

搜索。

浏览网页。

读几十份文件。

运行代码。

调用多个工具。

失败以后 retry。

保留长 context。

最后才产生用户看见的 output。

所以真正的 compute consumption 并不与最终答案长度成比例。

用户最后可能只看到一页报告。

后台却跑了几万个甚至几十万个 tokens。

这也是为什么我们不能用“ChatGPT 用户增长速度”简单推算未来 inference demand。

Agent adoption 会显著提高**每个活跃用户的 compute intensity**。

## 但另一方面，3400 倍也说明 agent 如果不能产生明显更高经济价值，就根本无法大规模普及

这是 yield imperative 更容易被忽略的一面。

如果 agent 完成一次工作需要普通 chat 3,400倍 tokens，那么从 infrastructure economics 看，它必须创造足够价值才能 justify 这种资源消耗。

例如：

如果 chat 问答价值几分钱。

一个 agent 消耗3400倍资源，却只能帮你把 email 改漂亮一点。

经济性很差。

但如果 agent 用两小时 autonomously 修复一个原本需要软件工程师一天的 bug，产生几百美元劳动价值，那么即使 inference cost 是10美元或20美元也可能非常划算。

所以未来 agent adoption 真正重要的 benchmark，不是 tokens/task 越少越好。

而是：

**value created / compute consumed。**

这其实就是微软所谓 useful yield 最终真正应该变成的经济指标。

## 从这个角度再看 OpenAI、Anthropic 和微软最近不断提高 agent autonomy，数据中心需求的上限确实会被重新打开

全球 AI diffusion 截至2026年第一季度只有大约 **17.8%** 的 working-age population。美国约31.3%，UAE已经达到70.1%。[The Official Microsoft Blog](https://blogs.microsoft.com/on-the-issues/2026/05/07/the-state-of-global-ai-diffusion-in-2026/)

而微软又强调目前绝大部分使用仍然主要是 chat。

这意味着今天 AI infrastructure demand 发生在一个非常早期的 usage mix 上。

如果未来 penetration 从18%到50%，同时平均使用方式又从 chat 转向 agent：

用户数量增长几倍。

每个用户 compute intensity 又提高几个数量级。

即使算法效率每年持续大幅提升，overall inference demand 仍然可能增长得极快。

所以我并不认为“模型越来越高效”自动意味着数据中心需求见顶。

更合理的情况可能是：

**efficiency improvement 降低单位智能成本 → 更多任务变得经济可行 → demand expansion 吃掉 efficiency gains。**

这仍然是 Jevons paradox。

## 对 Nvidia、MU、CRDO、LITE 等 AI 基建标的而言，这篇文章给出的投资框架比“CapEx 继续涨”更有用

下面全部是我的延伸判断，不是微软文章的直接结论。

如果我们采用 yield framework，就不应该简单认为：

AI需求强 → 所有基础设施组件都一直按同样速度增长。

真正能够长期获取 value 的组件，更可能是那些能显著提高整个系统 effective output 的瓶颈层。

对 GPU 而言，核心价值是 general-purpose intelligence compute。

对 HBM 而言，是减少 compute starvation、支撑更大的 model state 和 agent context。

对 networking 而言，是减少 expensive accelerators idle time。

对 optical interconnect 而言，是让越来越大的 cluster 跨 rack 和跨 pod 仍能高效通信。

对 power equipment 而言，是把有限 MW 最大程度送到 silicon。

对 cooling 而言，是提高 rack density。

所以真正该问的不是：

“这个组件占数据中心 BOM 的多少？”

而是：

**如果没有这个组件，整个系统会损失多少 useful intelligence？**

这会形成非常不同的价值排序。

一个只占系统成本2%的部件，如果失败会让30%的 GPU 闲置，它的 pricing power 可能远高于2%。

## 这也给 Nvidia 的长期估值加了一层更复杂的逻辑：未来市场可能越来越重视 dollars-per-useful-token，而不是 FLOPS

现在 accelerator 发布会仍然喜欢展示：

FP4 FLOPS。

FP8 FLOPS。

HBM bandwidth。

NVLink bandwidth。

但 hyperscaler 真正关心的商业指标会越来越接近：

tokens / watt。

tokens / dollar。

agent tasks / MW。

模型服务 revenue / installed GPU。

Borkar 在文章里反复使用“tokens from every watt and dollar”这类思路，本质就在向这个方向移动。[The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)

所以未来某颗芯片理论算力低10%，如果它在真实 production inference 中 fleet utilization 高30%、memory efficiency更好、network overhead更低，它完全可能拥有更好的 total economics。

这会让 benchmark 竞争越来越从 chip-level 转向 workload-level。

## 对微软本身，这篇文章也透露出 Azure AI 战略正在从“我也有 AI 芯片”升级成“我控制整个生产函数”

Maia 不只是对 Nvidia 的替代。

Cobalt 不只是对 AMD/Intel 的替代。

微软真正想建立的是：

自己可以在 silicon、network、memory、power、software 和模型之间自由调整 trade-offs。

它拥有：

Azure workload telemetry。

数据中心 fleet。

AI customers。

Microsoft 365 distribution。

OpenAI workloads。

自研 Maia accelerator。

Cobalt CPU。

以及 control plane。

所以理论上它比单纯 chip vendor 更清楚：

**哪一个5%的优化真的会产生客户价值。**

这也是 vertical integration 最大的潜在优势。

## 但这篇文章最大的风险是，“useful intelligence”仍然没有一个真正统一的计量单位

微软这篇文章非常聪明，但这里存在一个不能忽略的问题。

晶圆 yield 是容易测的。

一片 wafer 有100颗 die。

95颗通过测试。

yield = 95%。

但 AI 的“useful intelligence”究竟是什么？

Token 数量显然不够。

一个 agent 生成一百万无用 tokens，没有价值。

Benchmark score 也不够。

生产环境的真实价值可能完全不同。

Revenue 也可能太晚。

所以 AI infrastructure 如果真的采用 yield framework，最终必须建立更具体的 workload metrics：

成功完成任务数。

成本 / successful task。

time-to-completion。

human intervention rate。

tokens / dollar。

tokens / watt。

revenue / MW。

甚至 customer labor-hours saved / MW。

这可能成为未来 hyperscaler investor relations 中非常值得跟踪的新指标体系。

## 我认为这篇文章真正改变投资思维的地方，是 AI 基建行业可能正在从“扩产周期”进入“精益制造周期”

过去三年市场最重要的问题是：

谁能拿到 GPU？

谁能拿到 CoWoS？

谁能拿到 HBM？

谁能拿到电？

这很像制造业第一次疯狂扩产。

但当 installed base 越来越巨大以后，第二阶段自然会出现：

**怎样把已经买来的几千亿美元资产用得更狠。**

这就是 yield。

如果微软一年拥有几十亿美元甚至上百亿美元 GPU depreciation，那么 utilization 提高几个百分点就是非常大的利润。

所以我预计未来 hyperscaler 会越来越 obsess：

batching。

KV-cache reuse。

speculative decoding。

model routing。

quantization。

memory disaggregation。

network scheduling。

power-aware scheduling。

custom silicon。

这些听起来没有“再建一个5GW数据中心”刺激。

但可能直接决定 AI cloud 的 gross margin。

这也是为什么未来 AI 基础设施产业不一定会从 high-growth 直接变成 commodity。

它可能从 **capacity race** 进入 **efficiency race**。

## 最后，这篇文章让我觉得最值得记住的并不是“微软又宣传了 Maia”

而是一个更基础的框架变化。

过去我们一直把 AI scaling 写成：

**更多 compute → 更强模型。**

但 agent 时代真实生产函数越来越接近：

**silicon × memory × networking × power × software × model efficiency × utilization → useful intelligence。**

任何一层只有70%效率，都会拖累整个系统。

任何一层改善5%，也可能通过整个 fleet 产生巨大复利。

因此 AI 基建下一阶段最重要的问题，不再只是：

“还能建多少？”

而会越来越变成：

**“已经拥有这些电、GPU、HBM 和光纤以后，每一单位资源最终能够变成多少真正有人愿意付钱的智能？”**

微软把这个概念叫做 **yield imperative**。我认为这是一个非常值得以后长期使用的 AI 基础设施投资框架。

如果 2023—2026 年的关键词是 **capacity**，那么未来几年可能越来越多地转向 **yield**。

因为当 GPU 不再是唯一的瓶颈、电力开始变成硬约束、agent 又让一次任务的 compute consumption 比聊天高出几个数量级以后，整个行业最终会发现：

**下一座数据中心当然重要，但让现有数据中心多产出20%的有用智能，可能和再建一座数据中心一样值钱。** [The Official Microsoft Blog](https://blogs.microsoft.com/blog/2026/09/01/the-yield-imperative-turning-ai-infrastructure-into-useful-intelligence/)
