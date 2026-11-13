# 今日科技长文：OpenAI 第一颗自研芯片，真正威胁 Nvidia 的不只是性能，而是 CUDA 护城河可能被 AI 自己削弱

今天推荐 SemiAnalysis / InferenceX 于 **2026 年 8 月 25 日**发表的 **《OpenAI Jalapeño: Better Than Nvidia Blackwell》**，作者包括 Bryan Shan、Myron Xie、Jordan Nanos、Wega Chu、Clara Ee 和 Dylan Patel，官方标注约 **23 分钟阅读**。文章主体可以在 InferenceX 免费阅读，最后关于 Nvidia、AMD、Cerebras 的部分竞争分析转入 SemiAnalysis 付费订阅。[阅读 InferenceX 原文](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia) [InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

我今天选它，是因为这是 Jalapeño 六月亮相后第一次出现真正有分量的第三方技术拆解和实机 benchmark。SemiAnalysis 团队受邀进入 OpenAI 实验室，现场确认芯片和 InferenceX 运行结果。最令人意外的并不是“一颗 ASIC 在某个模型上比 Nvidia 快”，而是 **OpenAI 第一代芯片已经同时做到很高的低延迟性能和每瓦吞吐，而且把 DeepSeek R1、Kimi K2.5 等并非为 OpenAI 芯片设计的模型迅速跑起来。** 如果这种开发速度能够延续，过去“自研芯片的软件生态永远追不上 CUDA”这个最强反驳，就需要重新审视。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

## Jalapeño 最反直觉的地方：它不是只给 OpenAI 模型做的“窄 ASIC”

SemiAnalysis 首先纠正了一个常见理解。Jalapeño 确实只面向 **LLM inference**，不负责训练，但这不意味着它只针对 GPT 或 OpenAI 某一个固定模型架构做硬编码。团队现场看到了它运行 GPT‑OSS 120B、DeepSeek R1 670B 和 Kimi K2.5 1T；OpenAI 甚至让 Codex 把 Doom 移植上去作为展示。SemiAnalysis 因此更愿意把它看成一颗“通用 LLM inference ASIC”，而不是某种只能跑一代 GPT 的固定功能芯片。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

这点很重要，因为 AI ASIC 一直存在一个两难：做得越专用，理论效率越高，但模型架构变化后越容易报废；做得越通用，又越来越接近 GPU。OpenAI 的目标看起来是选择中间路线——放弃训练、图形渲染等大量 GPU 通用功能，但在 LLM inference 内部尽可能兼容不同 attention、MoE、batch size 和模型规模。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

更令人意外的是开发速度。SemiAnalysis称 OpenAI 从 2024 年中开始组建相关团队，到完整制造设计 tape-out 大约 16 个月；OpenAI 所说的“九个月”则指更窄的核心设计到 design completion 周期。CoWoS 级别设计在 **2025 年 11 月 tape-out**，而现在距离实际芯片回来只有大约三个月，软件就已经达到相当成熟的性能水平。对于一颗第一代高端 ASIC，这个节奏非常快。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

## Benchmark 数字确实非常强，但“Jalapeño 已经打败 Nvidia”还说早了

OpenAI 在 InferenceX 上用统一的 **8k input / 1k output** workload 测试，并把重点放在两个指标：每千瓦能够完成多少推理工作，以及用户实际等待多久。

在 GPT‑OSS 120B 上，Jalapeño 相对 GB200 达到约 **1.9 倍峰值吞吐/功耗**，end-to-end latency 约为对手的 **1/1.7**。在 DeepSeek R1 670B 上，相对 GB300 的峰值 perf/W 约高 **1.7 倍**，端到端延迟低约 **3.6 倍**；单用户最低 token 间隔约 **1.43ms**，相当于约 **700 token/s/user**。Kimi K2.5 1T 上则约有 **1.5 倍 perf/W** 和 **3.4 倍更低端到端延迟**。[OpenAI](https://openai.com/index/jalapeno-first-results/)

最值得注意的是，这些 Jalapeño 结果还是 **single-token prediction**，没有依赖 multi-token prediction / speculative decoding；被比较的部分 Nvidia 最优配置已经在使用 MTP。SemiAnalysis估计，如果 Jalapeño 后续也成熟地加入 speculative decoding，它的成本和延迟曲线还有进一步改善空间。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

不过文章自己非常认真地给这些数字降温。首先，测试数据由 OpenAI 提供，SemiAnalysis 在实验室现场验证了运行，但并不是自己从零部署并跑完所有 benchmark。其次，这次主要是单轮 8k/1k workload，还没有跑 SemiAnalysis 新发布的 AgentX；真实 agent 工作流会出现一百万 token 级上下文、多轮交互、prefix cache、KV-cache management、sub-agent 和动态路由，这些可能暴露出新的瓶颈。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

更关键的是，SemiAnalysis明确说，**拿 Jalapeño 和 Blackwell 比其实对 Nvidia 有些不公平。** Jalapeño 使用 HBM4，真正同代竞争者应该是 Vera Rubin，而 Rubin 已经开始进入客户早期部署。SemiAnalysis自己的估算显示 Rubin 相对 GB200 在 inference perf/MW 上已经有巨大提升；因此真正应该观察的是 Jalapeño 与成熟 Rubin 软件栈在 2027 年的比较，而不是用 2026 年的新 ASIC 去击败上一代 Blackwell 就宣布 Nvidia 输了。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

这也是我觉得这篇研究可信度比较高的地方：标题很刺激，但正文并没有把 benchmark 当成“Nvidia killer”宣传。

## 为什么它能同时做到高吞吐和低延迟：OpenAI 不想让数据不停搬家

Jalapeño 的核心设计，是把 LLM inference 当成一个完整请求来优化，而不是只追求芯片理论 FLOPS。

一次现代 LLM 请求至少经历非常不同的硬件阶段。Prefill 要把用户输入一次性处理掉，计算密集；decode 每次只生成少量 token，更容易受到内存带宽限制；MoE 又会引入大量跨芯片通信。如果再使用 speculative decoding，还会出现一个很小、追求极低延迟的 draft workload，以及大模型批量验证 draft token 的 workload。[ServeTheHome](https://www.servethehome.com/openai-jalapeno-asic-at-hot-chips-2026/)

业界一个自然方案是 **prefill/decode disaggregation**：让擅长矩阵计算的机器专门做 prefill，让高内存带宽设备专门做 decode。理论上每种机器都能针对一个任务高度优化。

OpenAI 选择的思路却更接近：**尽量不要搬 KV cache，而是在同一颗芯片里动态改变哪些资源被激活。**

原因是实际生产流量一直在变。早上可能输入长、输出短；coding agent 可能读几十万 token 再输出大量代码；另一些 workload cache-hit rate 很高。为固定 input/output 比例建立异构硬件池，某一时刻可能很高效，下一时刻就出现一部分设备闲置，而 HBM、网络和芯片即使闲置仍然耗电。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

所以 Jalapeño 试图把 compute、memory 和 network 做成比较平衡的整体，并尽可能让模型状态留在本地。对于 OpenAI 来说，“少搬一次数据”有时比“多加一点 FLOPS”更有价值。

## 芯片本身的规格已经完全是旗舰级别，而不是廉价内部 ASIC

Jalapeño 单 package 额定 **700W TDP**，OpenAI称测试 workload 中持续实际功耗不超过约 550W。每颗芯片提供 **216GiB HBM4** 和约 **15.4TB/s 内存带宽**，MXFP4 矩阵计算峰值约 **13.4 PFLOP/s**。作为对照，GB300 package TDP 在用于 benchmark 的计算中按 1,400W 处理。[DCD](https://www.datacenterdynamics.com/en/news/openai-details-jalape%C3%B1o-ai-chip-with-700w-tdp/)

15.4TB/s 尤其值得看。LLM decode 的一个根本问题，是每生成 token 都需要搬大量权重和 KV cache，因此很多时候瓶颈根本不是 Tensor Core 算不动，而是数据到不了计算单元。Jalapeño 使用 HBM4，SemiAnalysis估计其 pin speed 达到约 10Gbps，因此内存带宽/瓦非常突出。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

它的矩阵引擎使用 MXFP 数字格式和 weight-stationary systolic array，从思想上与 TPU 有相似之处，但支持更小的矩阵维度。SemiAnalysis认为这样能减少大型 systolic array 常见的性能悬崖：如果矩阵尺寸与硬件 tile 对不齐，传统大型阵列可能需要大量 padding，硬件明明理论 FLOPS 很高，真实利用率却突然下降。Jalapeño希望在更杂乱的模型 shape 上也维持较稳定效率。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

## 真正的大设计不是“一颗芯片”，而是 2,048 颗芯片像一台机器工作

OpenAI 的目标从一开始就是 rack-scale system。

一个本地 Jalapeño domain 包含 **128 颗 ASIC**。DCD 根据 Hot Chips 演讲给出的数字称，这套 128-chip system 约有 1.7 exaflops 4-bit compute 和 27.5TB HBM4。再向外，16 个这样的 rack 可以连接成 **2,048-chip scale-up domain**。[DCD](https://www.datacenterdynamics.com/en/news/openai-details-jalape%C3%B1o-ai-chip-with-700w-tdp/)

网络分成两层。每颗 XPU 在本地 128-chip domain 中拥有约 **600GB/s** scale-up bandwidth，在跨 16 rack 的 global domain 中约为 **200GB/s**。Broadcom 的 Tomahawk 6 switch、铜背板、1.6T optical transceiver 和光交换系统一起组成整个 fabric。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

为什么要做到 2,048 颗芯片的统一 domain？因为模型仍然在变大。SemiAnalysis认为，scale-up networking 在整个系统成本中只占大约一成，因此多花一些钱建立更大的统一 fabric，可以保留未来运行 **10–20 万亿参数模型**或 **200万–400万 token context** 的可选性。这里的模型规模是 SemiAnalysis 对未来 workload 的设想，不是 OpenAI 已经宣布正在运行这样的模型。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

这其实与 Nvidia NVL72 的路线属于同一个大趋势：单颗 accelerator 越来越不是有意义的竞争单位，真正的产品已经变成“一个 rack，甚至多个 rack 看起来像一台巨大计算机”。

## 更重要的创新可能在软件：OpenAI 正让 AI 自己解决“没有 CUDA”的问题

一般自研 ASIC 最容易死在这里。

芯片设计出来只是第一步。真正要跑一个新模型，需要 attention、GEMM、MoE routing、collective communication、quantization、KV cache 等大量 optimized kernel。Nvidia之所以强，不只是 GPU，而是 CUDA 已经积累二十年，开发者、compiler、library 和各种模型实现都直接可以用。

Jalapeño 从零开始，没有这个财富。

OpenAI 的解决办法非常激进：**让 frontier coding models 自动承担过去需要大批底层性能工程师完成的软件移植。**

Jalapeño 使用 OpenAI 自己的 kernel language **Gluon**。它建立在 Triton 思想之上，但向程序员暴露更底层的 layout、通信和硬件映射。OpenAI内部 serving engine 叫 **Teacup**。部分 kernel 代码仍然非常底层，单个 kernel 可以达到约 3,000 行，早期大量依赖人工调优；但随着内部 Codex 能力提高，优化过程越来越多交给模型。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

一个非常能说明问题的例子来自 DeepSeek。OpenAI原本甚至没有 Jalapeño 的 MLA kernel，因为内部模型并不需要这套实现。为了跑 InferenceX DeepSeek benchmark，团队让 Codex 自己生成相关实现；OpenAI称，在选定的 attention 和 MoE block 上，AI 优化后的实现比已有人工专家版本快 **1.5–1.8 倍**。这里必须注意，这不是整个 DeepSeek 快1.8倍，而只是被选中的 kernel/block。[OpenAI](https://openai.com/index/jalapeno-first-results/)

SemiAnalysis还观察到，在不到两周里，Jalapeño 某些 interactivity 区间的吞吐提升超过一倍；大约八天里，软件又从 TP8 扩展到 TP32，并完成大模型 rack-scale 运行。这种 software bring-up 速度，是文章真正认为有可能威胁 CUDA moat 的地方。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

过去 CUDA 护城河的一部分建立在一个现实假设上：**“为新硬件重新写所有高性能软件实在太贵了。”**

如果 coding agent 把这个成本压低一个数量级，ASIC 的经济性就会变化。

## 更深的一层：AI 不只在给芯片写软件，它已经开始设计芯片本身

Jalapeño 还是一个很有意思的递归案例：今天运行在 Nvidia GPU 上的 AI，正在帮助设计未来可能替代部分 Nvidia workload 的 ASIC。

OpenAI 在 Hot Chips 介绍说，模型参与了 implementation exploration、verification 和 arithmetic circuit 优化。部分硬件模块采用 AI 辅助设计后，PPA——performance、power、area——相对人工 baseline 有明显提升；ServeTheHome记录的演示案例里，一个 BF16 multiply 单元相关优化达到约 **56% 的 PPA 改善**，同时 matrix unit area 又缩小约10%。这些是特定模块结果，并不能外推成整颗芯片提升56%。[ServeTheHome](https://www.servethehome.com/openai-jalapeno-asic-at-hot-chips-2026/)

但战略意义很清楚。芯片设计过去有两个极高门槛：设计 silicon 很贵，写软件也很贵。AI coding和AI-assisted EDA如果同时降低这两种成本，未来每个拥有巨大固定 workload 的 hyperscaler 或 frontier lab，都更容易证明自研 ASIC 的投资回报。

这对 Broadcom 恰恰是好消息。OpenAI负责定义 architecture 和 workload，Broadcom提供 physical implementation、networking 和 silicon execution，Celestica负责 board、rack 和系统工业化。它说明“客户自研 ASIC”并不等于“所有半导体供应商都被去中介化”，而可能意味着价值从 merchant GPU 转向 ASIC design services、HBM、先进封装、网络和系统制造。[OpenAI](https://openai.com/index/openai-broadcom-jalapeno-inference-chip/)

## 但现在讨论 Nvidia 被替代，仍然太早

Jalapeño 当前还是 engineering silicon。OpenAI表示会在 **2026 年底开始有限部署**；SemiAnalysis掌握的供应链信息则显示，真正逐步放量主要在 **2027 年**，而且多数产量更偏向2027年底。OpenAI下一阶段的近期目标大约是把部署推到 **100MW**，届时最大的困难已经不只是芯片或 kernel，而会变成制造良率、机房安装、监控、可靠性、维修和数据中心运营。[InferenceX](https://inferencex.semianalysis.com/blog/openai-jalapeno-better-than-nvidia)

而 Nvidia 最大的优势正是在这里。它卖的不是一颗 GPU，而是一套经过全球几万家客户验证的供应链、rack、network、library、运维经验和支持系统。第一代 Jalapeño 在实验室 benchmark 很漂亮，不代表 OpenAI 可以马上把几百 MW 的芯片可靠地跑在生产环境。

OpenAI自己也没有宣布“抛弃 Nvidia”。公司明确表示仍将大规模部署 Nvidia 以及其他合作伙伴的 accelerator，用于训练和 inference；Jalapeño目前也**不计划对外销售**，主要服务 OpenAI 自己的 workload。[Axios](https://www.axios.com/2026/08/25/openai-says-its-jalapeno-chip-offers-spicy-performance)

所以这更像是 Nvidia 最大客户之一开始建立自己的 **internal marginal supplier**。它不需要替代90%的 Nvidia采购才有意义。只要它能承担20%、30%甚至部分最稳定、最大规模的 inference workload，就能提高 OpenAI 对 Nvidia 的议价能力，并把 Nvidia 原本赚取的一部分 silicon margin 留在自己体系里。

## 我认为这篇文章最重要的投资含义

下面是我的判断，不是 SemiAnalysis 的原文结论。

Jalapeño 对 Nvidia 最大的风险，短期不是“OpenAI明年少买多少GPU”，而是 **merchant silicon 的护城河可能正在被 AI 软件能力重新定价**。

过去 Nvidia 可以合理地说：Google TPU 有十多年软件积累，你不能因为设计出一颗理论上漂亮的 ASIC，就认为自己能运行快速变化的 frontier models。Jalapeño 展示的真正新变量是，OpenAI 可以让强 coding agents 在几天或几周内替新模型写 kernel、调 layout、优化 communication。如果模型能力继续提升，自研芯片的软件成熟周期可能从“几年”缩短到“几个月”。

这反而让我更加看好 **Broadcom、HBM、先进封装和高速网络**这类“无论谁赢 accelerator 都要用”的层级。如果 OpenAI、Google、Meta、Amazon 继续提高自研 ASIC 占比，Nvidia 在部分 hyperscaler inference 中可能丢失份额，但整个 ASIC 生态会需要更多 HBM4、CoWoS级封装、SerDes、Tomahawk级交换芯片、光模块和 rack integration。Broadcom既帮助 Google TPU，也帮助 OpenAI Jalapeño，这就是为什么它在“去 Nvidia 化”过程中反而可能成为非常重要的赢家。[Broadcom Inc.](https://investors.broadcom.com/news-releases/news-release-details/openai-and-broadcom-unveil-llm-optimized-intelligence-processor)

而我认为文章更深的意义，是它展示了一个 AI 产业非常特殊的正反馈：**模型越强 → 越能帮助设计和编程更高效的芯片 → 芯片让推理更便宜、更快 → 可以运行更多模型和 agents → 又产生更强的软件与设计能力。** 如果这种循环真的成立，未来 AI 基础设施竞争最重要的单位可能不再是“谁拥有最好的芯片”，而是**谁拥有模型、compiler、芯片、网络、数据中心和真实 workload 之间最快的闭环**。Jalapeño真正值得关注的地方，正是 OpenAI第一次证明自己已经开始建立这个闭环。[OpenAI](https://openai.com/index/the-full-stack-behind-abundant-intelligence/)
