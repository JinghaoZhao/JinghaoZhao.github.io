# 今日科技长文：AI 不再只是帮工程师“写芯片”，它开始尝试把芯片设计本身变成一种可搜索、可迭代的计算任务

今天推荐 **Architect Labs 于 2026 年 8 月 27 日发表的《Introducing Redwood: A frontier AI accelerator designed, verified, and deployed from scratch in two weeks by AI》**。这是一篇**免费公开**的官方研究长文，对应的技术论文《Redwood: A Frontier AI Accelerator Designed, Verified, and Deployed from Scratch in 2 Weeks by AI》在 8 月 26 日上传至 arXiv。[阅读 Architect Labs 原文](https://architectlabs.com/blog/redwood) [阅读技术论文](https://arxiv.org/abs/2608.26418) [Architect Labs](https://architectlabs.com/blog/redwood)

我今天选它，不是因为标题里那个很吸睛的“**两周设计一颗 AI 芯片**”，而是因为 Redwood 展示的东西比通常所谓的 AI-assisted EDA 更激进：两个人类架构师只负责写高层 specification，之后 AI 系统同时生成 performance model、RTL、UVM verification、formal proofs、firmware、drivers 和 inference kernels，再不断根据性能、面积、时序和验证反馈重新修改硬件。这意味着 AI 不只是在现有芯片流程的某一步当 Copilot，而是在尝试把 **hardware–software co-design 整体变成一个自动优化闭环**。[Architect Labs](https://architectlabs.com/blog/redwood)

不过先把最重要的限定放在前面：**Redwood 目前还不是一颗已经 tape-out 并由晶圆厂制造出来的 ASIC。** 现在实际运行的是缩小版 Redwood Nano，在 AMD Versal FPGA 上运行 Qwen；与 Nvidia Jetson Orin Nano 的功耗和性能比较，则是把设计投影到 Samsung 8nm 工艺后的估算，而不是实测量产 silicon。Business Insider 为此采访了外部芯片研究人员，他们认可两周设计周期令人印象深刻，但明确指出真正制造出的 silicon 才是最终检验，AI 设计错误一旦进入 tape-out，代价可能以数百万美元计。[Business Insider](https://www.businessinsider.com/architect-labs-ai-redwood-chip-design-2026-8)

因此，这篇文章值得读的正确方式不是“AI 两周已经造出了打败 Nvidia 的芯片”，而是：**如果 Redwood 的自动设计方法最终能够跨过 physical design、tape-out 和 post-silicon validation，它可能改变整个定制 ASIC 行业的经济学。**

## 传统芯片设计最大的矛盾，是模型六个月变一次，而芯片必须提前两三年押注未来

Architect Labs 从一个非常真实的时间尺度冲突出发。

今天一款高端 accelerator 从 architectural definition 到真正 volume silicon，通常需要几年。可 AI workload 的变化远快于这个周期。模型从 dense transformer 转向 MoE，context length 从几万增加到几十万甚至百万，attention implementation、quantization format、batch size 和 inference serving 架构都可能在几个月内改变。[arXiv](https://arxiv.org/abs/2608.26418)

于是芯片团队面临一个很尴尬的问题。

他们实际上不是在为今天的模型设计芯片。

他们是在猜**两年后的模型**。

如果猜得太专用，而两年后 workload 变化，芯片就可能非常低效；如果为了防止猜错加入大量通用性，又会牺牲面积、功耗和性能。

Architect Labs 把这描述为“双重付费”：第一次为不确定性加入不一定需要的 general-purpose capability，第二次则是在真实未来 workload 与当初假设不匹配时继续付出效率成本。[arXiv](https://arxiv.org/abs/2608.26418)

这也是为什么 Nvidia GPU 的通用性如此有价值。

它并不一定是任何单一 workload 理论上的最高效硬件，但软件生态和可编程性允许它在模型快速变化时继续适应。

ASIC 的根本优势则恰好相反：你如果知道 workload 是什么，就可以把没用的东西全部删掉，把数据移动、矩阵计算、memory hierarchy 和控制逻辑围绕一种任务重新排列，从而提高 performance-per-watt。

过去的问题是这种 specialization **太慢、太贵**。

Architect Labs 想解决的实际上不是“让 AI 会写 Verilog”，而是让 specialization 的设计周期接近 software release cycle。

## Redwood 最重要的不同，是它没有沿用“架构师交给 RTL、RTL 再交给验证”的传统流水线

传统芯片开发高度 sequential。

架构师先写规格和 performance model。

RTL 工程师实现设计。

验证团队开始写 testbench。

之后 firmware 和 compiler 团队才能逐步 bring-up。

后面发现一个 architecture assumption 错了，往往意味着前面几个团队大量工作需要重做。[Architect Labs](https://architectlabs.com/blog/redwood)

所以行业很早就知道 hardware–software co-design 是正确答案，但现实里真正做到非常困难。

你理论上当然希望：

“如果把这个 operator 做成专用 datapath，需要多少面积？如果不做，让 compiler 解决会增加多少 cycles？如果增加 SRAM，性能提升值不值得面积？”

问题是每探索一个方案，都需要大量人工把它实现到足够深的层级，才能知道真实结果。

因此 architect 能真正探索的 design space 非常有限。

Architect Labs 采用了完全不同的结构。

两名人类首先定义 design intent。

系统随后不把 architecture 当作已经冻结的 specification，而是把它当作**可以持续修改的变量**。

每一种 architecture candidate 都可以自动生成 RTL、UVM environment、SystemVerilog assertions、formal proofs、firmware 和 kernels，再重新获得 performance、area、timing、power 和 functional feedback。[Architect Labs](https://architectlabs.com/blog/redwood)

所以原本的问题是：

“哪个架构师经验最好，能第一次猜对？”

现在逐渐变成：

**“在固定计算预算里，我们能够实际生成、验证多少个候选架构？”**

这是文章最重要的范式变化。

## 两个人真正保留下来的工作，不是画电路，而是定义“什么叫一颗好芯片”

Architect Labs 对 Redwood 的描述非常明确：两个人类 architects 提供高层 specification，之后 specification 以下没有人工设计 intervention。公司称 Redwood 的 RTL、UVM environments、formal verification artifacts、firmware、drivers 和 compute kernels 都由系统生成。[Architect Labs](https://architectlabs.com/blog/redwood)

但这不等于“芯片工程师彻底消失”。

文章其实明确说，人类专家仍然维护 Architect Labs Platform，也仍然利用 functional、area、performance、timing 和 power feedback 驱动整个 chip program。

所以人的角色发生的变化更像：

过去工程师亲自写大量实现。

现在 architect 描述约束、目标和 trade-off，然后判断优化过程是否朝正确方向走。[Architect Labs](https://architectlabs.com/blog/redwood)

这与最近软件领域正在发生的变化非常相似。

一个强 coding agent 出现以后，高级工程师越来越少花时间亲自写 boilerplate，但更多时间定义系统接口、测试条件和 acceptance criteria。

芯片领域如果发生同样变化，真正稀缺的可能从“会写多少 RTL”迁移到：

**能否写出正确 specification，以及能否定义不会被优化器钻空子的验证体系。**

## Redwood 本身为什么没有试图做第二颗 Nvidia GPU

Redwood 的目标非常窄。

它是给 **single-batch、low-power、ultra-low-latency physical AI inference** 设计的 accelerator。这里所谓 physical AI，可以理解成机器人、边缘设备或其他必须低延迟运行模型的场景，而不是超大数据中心里追求最大 aggregate throughput 的训练集群。[arXiv](https://arxiv.org/abs/2608.26418)

这个选择很合理，因为 single-batch inference 正是 GPU 通用性最容易产生效率损失的地方之一。

数据中心 inference 可以把很多用户请求 batch 在一起，让大型矩阵运算充分占满 GPU。

机器人却不能说：

“我先等另外63台机器人也看到东西，再把视觉请求一起 batch。”

现实世界要求立即响应。

因此 physical AI 更在乎 low latency 和 performance-per-watt，而不是绝对最大 FLOPS。

Redwood 采用 tiled spatial-dataflow architecture。整个芯片由 N×M 个相同 tile 构成，外围是 DMA engines，tile 之间由定制的 credit-based on-chip network 相连，并支持 broadcast、multicast 和 per-link flow control。[Architect Labs](https://architectlabs.com/blog/redwood)

每个 tile 里面有一个 RISC-V control core 和专门面向 transformer inference 的计算引擎。

矩阵部分使用由 INT8 MAC array 构成的 systolic GEMM/GEMV datapath。

之后结果可以直接流入 vector engine，后者负责 SIMD、transpose 和 floating-point activation。

每个 tile 还有 **512KB 本地 memory**。[Architect Labs](https://architectlabs.com/blog/redwood)

这一结构的核心思想其实还是那句 AI hardware 老话：

**尽量不要搬数据。**

如果数据能够留在 local memory，并在矩阵和 vector operations 之间直接流动，就可以避免大量昂贵的 off-chip memory traffic。

## 更有意思的是，AI 系统会决定某个功能到底应该做成硬件，还是留给软件

Softmax 是文章给的一个很好例子。

硬件工程师可以专门给 softmax 做一块固定功能 circuit。

这样可能很快。

但会占面积，而且未来 algorithm 改变以后这部分 hardware 很难重新利用。

Redwood 没有这么做。

系统采用与 FlashAttention-4 相关的 emulation 方法，复用已有 SIMD resources 来完成 softmax，而不是新增专用 hardware。[Architect Labs](https://architectlabs.com/blog/redwood)

这单独看只是一个 architecture decision。

真正值得注意的是 **AI system 在一起做 hardware 和 software 时才能真正比较这种 trade-off**。

如果硬件和 compiler 是两个不同团队，在设计早期你很难知道：

少这一块 hardware 到底会让 kernel 慢多少？

增加一块专用 unit 又会增加多少 area？

最终每个 token 多消耗多少能量？

Architect Labs 的理想状态是让系统同时生成两个方案，再直接测。

因此 hardware–software co-design 不再主要依赖 architecture meeting 里几名资深工程师争论，而逐渐变成一个 empirical search problem。

## Redwood 甚至把一些传统硬件负责的复杂性故意搬回 compiler

每个 Redwood tile 把 control frontend 和 compute backend 分开。

稀疏、零碎的 control logic 在较低 clock domain 运行；真正 kernel 开始以后，部分控制逻辑甚至可以整个关闭，以降低功耗。[Architect Labs](https://architectlabs.com/blog/redwood)

更有意思的是，tile 和 DMA 之间通过明确的 hardware messages 协调。

prefetch、double buffering 和一部分 out-of-order computation 的 scheduling 被放到 software stack，而不是让 mesh 自己做复杂 arbitration。

换句话说，系统主动选择：

**让 hardware 简单一点，让 compiler 聪明一点。**

这不是一个新的理论。

很多 accelerator 都做类似 trade-off。

新的地方在于，如果 compiler 本身也是同一套 AI 系统生成和优化的，那么做这种交换的成本下降了。

以前硬件工程师很担心“把这个复杂度丢给 compiler 以后，软件团队到底搞不搞得定”。

现在硬件和 compiler 都由同一个 optimization loop 改。

## 现在真正运行的 Redwood Nano，其实只是整个 thesis 的第一个物理检查点

Architect Labs 把一个缩小的 **2×2 tile Redwood Nano** 综合到 AMD Versal VPK180 FPGA，频率为 **250MHz**。[Architect Labs](https://architectlabs.com/blog/redwood)

这不是模拟。

它真的可以把 prompt 从 host 送入 FPGA，在硬件上运行 **Qwen3-0.6B**，然后逐 token 把结果流回 host。

公司披露的实测速度约为 **12.1 tokens/s**。[Architect Labs](https://architectlabs.com/blog/redwood)

这件事证明了几个很关键的东西。

RTL 至少能够真正综合。

firmware 能运行。

kernel 能运行。

memory movement 和 host interface 能配合。

完整 transformer model 可以 end-to-end inference。

所以它比“AI 生成了一堆通过 unit tests 的 Verilog”明显多走了一步。

但是必须再次强调：

**FPGA working ≠ ASIC working。**

FPGA 本身已经是制造完成、经过验证、具有成熟 routing 和 physical fabric 的可编程芯片。

AI 现在生成的是映射到这块 FPGA 上的逻辑。

真正制造 Redwood ASIC，还要面对 place-and-route、clock tree、IR drop、signal integrity、DRC、timing closure、yield 和 post-silicon bugs 等大量问题。

Architect Labs 自己也承认，“real silicon is the final ground truth”，并称下一步正在把流程扩展到完整 GDSII 和 TSMC tape-out。[Architect Labs](https://architectlabs.com/blog/redwood)

## 所以“性能超过 Nvidia 3.4 倍”必须非常谨慎地读

Architect Labs 把 Redwood 设计投影到 **Samsung 8nm**，也就是 Jetson Orin Nano 所处的相近工艺级别，然后与实际测量的 Jetson baseline 比较。

公司的预测是：

Redwood 可以达到约 **1.75 倍 decode throughput**，同时功耗降低约 **1.9 倍**，综合即约 **3.4 倍 performance-per-watt**。[arXiv](https://arxiv.org/abs/2608.26418)

它还预计 silicon area efficiency 可以有接近一个数量级改善。

这些数字如果最终 silicon 能达到，当然非常强。

但它们现在仍然属于 **ASIC projection**。

不是一块8nm Redwood 放在实验室里与 Jetson 实机对跑。

因此 Business Insider 采访的 UCF 助理教授 Hao Zheng 把 manufacturing 称为“真正的测试”；UC Santa Cruz 教授 Matthew Guthaus 也指出，AI 在很多 chip-design 子问题上已经很强，但仍可能犯看起来很低级的错误，而 tape-out 前漏掉一个严重 bug 就可能损失数百万美元。[Business Insider](https://www.businessinsider.com/architect-labs-ai-redwood-chip-design-2026-8)

这部分 caveat 是理解整篇材料最重要的地方之一。

真正应该兴奋的是 **design-cycle compression**，而不是现在就把 performance projection 当成最终产品 benchmark。

## 两周这个数字真正厉害之处，其实不是“写完一版”，而是修改以后最多48小时又能重新跑起来

Architect Labs 称，每次 architecture specification 修改以后，整个系统可以在 **48小时内重新生成、重新验证并部署到 FPGA**。[Architect Labs](https://architectlabs.com/blog/redwood)

这是我认为 Redwood 最有价值的数字。

传统 silicon design 一个最痛苦的问题，并不是第一版 RTL 要写多久。

而是 architecture 迭代极其昂贵。

项目走到后面以后，一个看似简单的 architecture change 可能波及 RTL、verification、firmware、compiler、performance model 和 physical implementation。

所以行业里才存在“architecture freeze”。

不是大家喜欢 freeze。

而是继续修改太贵。

如果 AI 真能把 major architectural iteration 从几个月压缩到两天，freeze 的概念本身可能改变。

芯片设计可以更接近软件：

先做。

跑起来。

发现问题。

重写。

再跑。

这才是 Architect Labs 真正想证明的东西。

## 验证可能比生成 RTL 更重要，因为一颗“99.9% 正确”的芯片基本等于不正确

过去两年“AI 写芯片”新闻很多，真正困难的一直不是让模型生成 Verilog。

Verilog 本质还是代码。

LLM 很自然可以学会。

难的是 verification。

软件有 bug，可以上线以后 patch。

ASIC 有 bug，如果它属于 hardware path，最坏情况就是重新 tape-out。

因此芯片设计里 verification 通常占据非常大一部分人力和时间。

Architect Labs 对这部分的 claim 相当激进。

Redwood 所有 UVM testbench、test cases、formal artifacts 和 simulation 都由系统自动产生。每个 block 到 SoC level 都达到至少 **95% code/functional coverage**，使用商业 EDA tools、公司自己的 formal engine，以及 hardware-in-the-loop validation 共同验证。[Architect Labs](https://architectlabs.com/blog/redwood)

公司还称第一版从 simulation 放到 FPGA 的 RTL **没有发现 bug**。

这同样是公司自行报告、尚未得到完整独立验证的结果，不能把它理解成“AI 已经解决 chip verification”。[Architect Labs](https://architectlabs.com/blog/redwood)

但如果自动 verification 真能工作，它的经济意义反而比 RTL generation 大得多。

因为生成设计很便宜以后，整个系统真正的 scaling bottleneck 会变成：

**你能不能证明每一个生成出来的设计都是对的？**

这和最近几天我们连续看到的 agent 趋势其实完全一致：

generation 越来越便宜。

verification 越来越值钱。

## 115 commits/day 透露出的，是机器设计和人类设计最大的速度差并不在“敲代码”

项目峰值一天完成 **115 个 merge commits**。[Architect Labs](https://architectlabs.com/blog/redwood)

当然不能简单拿这个数字与人类工程师 commit 数比较，因为 AI commit 可能很小。

真正重要的是 AI 系统可以同时让大量 agents 运行。

它们生成 architecture candidate。

编译。

跑验证。

失败。

丢掉。

重新修改。

不需要开会。

不需要等另一个团队排期。

不需要因为已经写了三周代码而产生 sunk-cost bias。

Architect Labs 特别介绍了 SIMD engine 的设计搜索。系统可以同时探索不同的 performance、area 和 timing combinations，而且候选设计并不只是改变 bit width 或 register placement，而可能拥有不同 datapath、control path 和 state machine。[Architect Labs](https://architectlabs.com/blog/redwood)

公司由此提出一个很大胆的判断：

过去 microarchitecture search 的边界是**人类设计师能想到多少种设计**。

未来可能逐渐变成：

**你愿意花多少 compute 去搜索。**

这是 Redwood 最值得长期跟踪的 thesis。

## 这里甚至出现了一个非常微弱、但很有意思的“硬件递归改进”闭环

Architect Labs 把 Qwen3 部署到了 Redwood 上。

然后把运行在 Redwood 上的模型作为 API endpoint 暴露给它自己的 chip-design system。

接下来，这个模型被用来寻找 Redwood 下一代设计中的 timing 和 kernel optimizations。[Architect Labs](https://architectlabs.com/blog/redwood)

公司把它称为早期的 **recursive self-improvement**。

这个措辞需要大幅降温。

今天运行在小型 Redwood FPGA 上的 Qwen 并不是那个负责设计整个 Redwood 的最强 AI system。

Architect Labs 自己也明确承认，两者之间仍有 capability mismatch：真正能够进行复杂 frontier hardware design 的 AI 系统，比今天能够部署在 Redwood Nano 上的模型强得多。[Architect Labs](https://architectlabs.com/blog/redwood)

所以现在的 loop 并不是：

Redwood 上的 AI → 从零设计更强 Redwood → 更强 AI → 再设计更强芯片。

远远没有。

现在更准确的情况是：

**AI 帮设计 Redwood → Redwood 跑小模型 → 小模型帮找部分 kernel/timing improvement → 下一代 Redwood。**

但它展示的方向很有意思。

如果未来 AI chip 本身能够运行足够强的 hardware-design agent，就可能出现：

更好的 AI → 设计更高效的 AI hardware → 更便宜的 AI compute → 可以运行更多 AI researchers → 进一步改善 hardware。

Business Insider 采访中，CEO Ebrahim Hussain 也把这个 self-reinforcing loop 作为公司最兴奋的长期可能性之一，不过他明确称目前仍然非常早期。[Business Insider](https://www.businessinsider.com/architect-labs-ai-redwood-chip-design-2026-8)

## “Designless” 才是 Architect Labs 真正想卖给产业的故事

Hussain 用了一个很有野心的类比。

半导体历史上最重要的一次产业重构，是 **fabless**。

过去想做芯片，往往需要自己拥有晶圆厂。

TSMC 等 pure-play foundry 出现以后，公司只需要负责 design，把制造交给 foundry。

于是 Nvidia、Qualcomm、Broadcom 等大量公司可以不拥有先进 fab，也进入高端 semiconductor industry。

Architect Labs 认为下一阶段可能是 **designless**。[Business Insider](https://www.businessinsider.com/architect-labs-ai-redwood-chip-design-2026-8)

当然不是完全“没有设计”。

更准确地说，是企业可能不再需要维持一个传统规模的 RTL、verification、firmware 和 low-level compiler organization，才能拥有自己的 ASIC。

人类保留 architecture intent。

AI 负责大量 implementation。

TSMC 负责制造。

如果这个架构成立，今天只有 Google、Amazon、Meta、Microsoft、OpenAI 这种规模公司才能承受的 custom silicon，理论上可能向更小的 workload owner 下沉。

于是问题从：

“我的 workload 是否足够大，值得花三年和几亿美元做 ASIC？”

变成：

“如果六个月、几千万美元甚至更少就能完成，是否值得给这个 workload 单独造芯片？”

这个 threshold 一旦下降，custom silicon TAM 可能大幅增加。

## 这反而解释了为什么 Architect Labs 的直接目标可能不是 Nvidia，而是 Broadcom 和 Marvell

Architect Labs 六月融资时就把自己的长期竞争位置描述得很清楚：它希望降低定制 ASIC design 的门槛，挑战 Broadcom、Marvell 等提供 custom silicon design services 的公司。公司当时完成了 **2400万美元 seed round**，投资者包括 Kindred Ventures，以及包括 Jeff Dean 在内的产业人士。[Reuters](https://www.reuters.com/business/retail-consumer/architect-labs-raises-24-million-take-broadcom-marvell-custom-chip-business-2026-06-18/)

这与“Redwood 打败 Jetson”其实是两件不同的商业逻辑。

Nvidia 卖的是标准化 merchant accelerator。

Broadcom/Marvell 很大一部分 AI 机会则是帮助 hyperscaler 设计自己的 ASIC。

如果 AI 真能自动完成大量 chip-design labor，那么最先受到 business-model 压力的可能反而是 custom-design engineering economics。

但另一方面，AI 自动设计 ASIC 也可能让 **custom silicon 总量大幅增长**。

于是 Broadcom 或 Marvell 未必一定输。

如果客户设计的芯片数量从今天几十颗提高到未来数百、数千颗，那么 SerDes、networking IP、chiplet、packaging、ASIC implementation 和 silicon manufacturing 的需求可能一起扩大。

真正被压缩的是每一颗 ASIC 所需要的人类工程工时。

## 我的延伸判断：Redwood 如果成立，最重要的不是“AI 会不会替代芯片工程师”，而是芯片第一次可能接近软件的迭代速度

下面是我的判断，不是 Architect Labs 的原文结论。

过去几十年 software 吞掉越来越多产业，有一个非常深的原因：

**软件可以无限修改。**

写错了可以 patch。

今天上线。

明天 A/B test。

下周重构。

一个产品一年可以发布几百次。

Silicon 完全不是这种经济学。

一次 design decision 可能冻结几年。

所以芯片产业长期追求通用平台，让 software 在上面适应 workload；这也是 CPU、GPU 能成为巨大平台的一个根本原因。

如果 AI automation 真能把 silicon iteration cycle 从 years 压到 months，再逐渐到 weeks，那么 specialization 的最核心劣势会开始缩小。

那时未来未必是一颗 GPU 跑所有 AI。

可能变成：

不同 robot。

不同 autonomous vehicle。

不同 inference workload。

不同 model architecture。

甚至不同客户。

都拥有更加专门的 silicon。

**不是因为制造芯片突然变便宜，而是设计芯片突然变便宜。**

这对 Nvidia 是一个长期而非近期的结构性风险。Nvidia 现在最强的护城河仍然远远不只是 RTL 工程能力，而是 CUDA、libraries、networking、rack-scale systems、HBM supply、developer base 和量产执行。Redwood 甚至还没有 tape-out，因此现在谈“AI-designed chips 威胁 Nvidia”显然过早。

但它对 Nvidia moat 有一个值得长期关注的二阶影响。

Nvidia 通用性的价值，部分来自**定制硬件迭代太慢**。

如果未来 workload owner 能每一年甚至每几个月重新生成 ASIC，那么“买一块足够通用、未来几年都能适应”的价值会下降。

与此同时，我反而会更重视不会被 chip-design automation 直接消灭的物理瓶颈：**TSMC 先进制程、CoWoS/先进封装、HBM、EDA signoff、high-speed SerDes、substrate 以及晶圆制造 capacity。** AI 可以在两周内生成一万种 architecture，但不能两周内建一座 fab，也不能凭空增加 HBM output。

所以 Redwood 真正有意思的地方，和最近自动科研领域出现的趋势非常一致：

**AI 正在把原本由稀缺人类专家提供的“搜索和实现”变成 compute。**

以前一家公司能探索多少芯片架构，取决于有多少顶级 architects、RTL engineers 和 verification engineers，以及他们一年能够尝试多少次。

未来那个限制可能逐渐变成：

你有多少 AI research compute？

你的 verifier 有多可靠？

以及最终能够制造多少次真实 silicon 来校准这些模拟？

这也是为什么我认为这篇文章最值得记住的不是“两周”本身，而是另一个转变：

**如果 design 和 verification 真正自动化，芯片架构不再主要是一项必须在 tape-out 前押注正确的手艺，而开始变成一个可以反复搜索的 optimization space。**

今天 Redwood 还停留在 FPGA，因此这个 thesis 尚未得到最终证明。它真正关键的下一次验证，不是公司再发布一个漂亮 benchmark，而是 **TSMC tape-out 后第一批 silicon 回来时，到底有多少东西第一次就工作、实际 perf/W 与预测差多少，以及 AI 能否独立完成 physical-design 和 post-silicon debug 这最后两段最残酷的现实检验。** 如果那一步也走通，所谓“designless semiconductor”才会从一个很聪明的创业故事，真正变成半导体产业需要认真对待的新生产方式。[Architect Labs](https://architectlabs.com/blog/redwood)
