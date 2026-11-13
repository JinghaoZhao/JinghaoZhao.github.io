# 今日科技长文：Nvidia 的真正护城河，可能正在从“芯片性能”转向“软件把 GPU 变成任何一种芯片”

今天推荐 SemiAnalysis / InferenceX 在 **2026 年 8 月 10 日**发布的 **《Ultra-High Interactivity on NVIDIA GPUs? TileRT on InferenceX》**，官方标注阅读时间 **18 分钟**，目前可以免费阅读。文章研究的是一个看似很底层、实际上可能影响未来 AI 芯片竞争格局的问题：当 Cerebras、Groq、SambaNova 这类专用推理芯片以“超低延迟”为卖点时，Nvidia GPU 能不能仅靠软件改变自己的执行方式，把这个硬件弱点补回来？SemiAnalysis 的测试答案是：至少在特定模型和 batch size 1 的极低延迟场景下，**TileRT 已经让一台普通 8×B200 服务器做到接近 500 token/s/user，并明显超过传统 GPU inference stack。** [InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

我认为这篇尤其值得读，因为市场长期用一个很简单的框架理解推理芯片：GPU 通用、吞吐量大，但延迟不是最优；Groq、Cerebras 等专用架构虽然用途窄，却能做到极高单用户生成速度。TileRT 提出的可能性是，**这个边界并没有想象中那么硬。** 如果标准 Nvidia GPU 可以通过编译器和 persistent kernel 获得一部分 dataflow architecture 的特性，那么专用 inference ASIC 面对的竞争对手就不再只是“普通 CUDA GPU”，而是一个可以不断通过软件改变自身工作方式的庞大 Nvidia 装机基础。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

## 为什么今天的 AI 推理会突然如此在意“一个用户到底能有多快”

SemiAnalysis 首先区分了两个经常被混在一起的指标。一个是 **throughput**，也就是一块 GPU 每秒总共能吐出多少 token；另一个是 **interactivity**，也就是单个用户实际看到模型以多快速度生成答案。批量处理更多用户通常能提高 GPU 利用率和总吞吐量，但每个人都必须等待其他请求共同执行，因此单用户速度往往下降。反过来，如果一次只服务一个用户，体验会非常快，却可能浪费大量硬件能力。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

文章用公共交通来解释这个区别。传统大批量 inference 像公共汽车，可以用同一趟车运输很多人，因此每位乘客成本很低，但需要等站、等其他人；超低延迟 inference 更像赛车，乘客少，却能马上出发。SemiAnalysis 的一个测试点里，把单用户生成速度从约 25 tok/s 提高到约 260 tok/s，代价是每 GPU 总吞吐量从大约 5,900 tok/s 降到约 200 tok/s，也就是为了获得大约十倍的用户速度，牺牲了接近三十倍的总吞吐。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

过去这种“赛车模式”更多是一种边缘需求，但 agent 和实时语音正在改变经济性。对于普通聊天，50 tok/s 和 200 tok/s 的区别可能并不决定产品成败；但如果 AI agent 正在连续调用工具、执行代码、读取结果再发起下一步，那么每一次 inference 延迟都会串联累积。实时双向语音则更加明显，人类能够立刻感觉到几百毫秒的停顿。因此，OpenAI 等前沿实验室开始愿意为极高 interactivity 支付溢价，也给 Cerebras、Groq 等专门为低延迟优化的架构创造了市场。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

这里有一个很值得投资者理解的变化：未来 inference 市场可能不会只有“每百万 token 最便宜”这一个定价维度，还会出现类似云计算的服务等级分层。同一个模型可能存在普通版、快速版和极低延迟 premium tier，而后者即使单 token 成本更高，也可能因为用户愿意付费而获得更高毛利。这个商业判断是 SemiAnalysis 对 fast mode 市场趋势的概括。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

## B200 理论上其实应该快得离谱，问题不是 HBM 带宽不够

文章接下来提出一个很反直觉的问题。Nvidia B200 并不是因为“内存带宽太差”才无法做到几百甚至上千 token/s。

一台 8×B200 HGX 服务器理论总 HBM 带宽约 **64 TB/s**。SemiAnalysis 以 GLM-5 的 NVFP4 推理为例，每生成一个 token，只需要大约 21GB 的活跃参数数据流量。如果简单按照 HBM bandwidth 做 roofline 计算，batch size 1 情况下理论上可以达到大约 **3,047 token/s/user**，而且还没计算 speculative decoding 带来的额外加速。现实表现却离这个数字非常远。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

真正的问题是 **latency overhead**。

传统 GPU inference 会把整个模型拆成大量 kernel。CPU 不断发起 kernel，GPU执行，然后同步，再进入下一个 kernel。处理大 batch 时，每个 kernel 做的工作很多，启动和同步开销占比很小；但当目标变成每个 token 几毫秒甚至亚毫秒时，kernel launch、同步和中间数据搬运本身就会变成瓶颈。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

这也解释了一个很重要的硬件趋势。GPU 每一代的 HBM bandwidth 可以提高两三倍，但 SemiAnalysis 指出 memory latency 并没有出现类似改善。因此如果软件仍然按照过去的方式不断启动小 kernel、反复同步和访问 HBM，单纯堆更大的 bandwidth 并不能等比例改善超低延迟 inference。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

## TileRT 做的事情，本质上是“不再把 kernel 当成基本执行单位”

TileRT 的核心思路听起来简单，工程实现却非常激进：与其让 GPU 不断启动数千个 kernel，它提前把整个 decode graph 静态编译成一个长期驻留在 GPU 上的 **persistent Engine Kernel**。host 只需要启动一次，此后的 decode 生命周期都尽量留在 GPU 内部运行。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

这和 CUDA Graph 不是一回事。CUDA Graph 可以提前记录多个 kernel 的调用关系，然后减少 host 每次重新调度它们的开销；但底层仍然是一串彼此独立的 kernels，每次跨越 kernel boundary 时仍然存在设备端状态切换和同步成本。TileRT 更彻底：它试图直接取消这些边界，让整个模型像一条持续运行的流水线。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

TileRT 还把计算切成更细的 tile-level tasks。不同 warp group 不再完全做相同工作，而可以分别承担数据加载、矩阵计算和通信，并把原本顺序执行的“加载—等待—计算—等待”尽量重叠起来。中间结果可以更多停留在 register、shared memory 和 L2，而不是每一步都写回 HBM。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

甚至 GPU 之间也开始分工。以 GLM-5.1 的 attention layer 为例，TileRT 可以让 GPU 0 专门执行 sparse indexing、Top-K 选择和 routing，其余 GPU 执行 MLA、GEMM、attention 和 AllReduce，而不是要求所有 GPU 用完全相同的 tensor-parallel 程序同步推进。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

所以从架构思想上看，TileRT 正在让传统 SIMT GPU 在软件层面表现得更像一台 dataflow machine。

## 实测提升大到不能只当成“小优化”

在 SemiAnalysis 的 GLM-5 测试里，TileRT 在一台 **8×B200** 服务器上表现出了非常夸张的单用户速度。

在 8k input / 1k output 场景下，TileRT 达到约 **340 token/s/user**。此前数据集中最高的传统实现大约是 GB300 NVL72 的 181.4 tok/s/user，因此 TileRT 大约快 **1.9 倍**。如果只比较相同 FP8 精度，优势约为 **3 倍**。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

输入缩短到 1k、输出仍为 1k 时，TileRT FP8 达到约 **494.2 token/s/user**。这大约是此前最佳传统方案 256.3 tok/s/user 的 1.9 倍，也大约是最佳传统 FP8 结果的 **3.6 倍**。更特别的是，TileRT 当时还没有 FP4 支持，却已经能够超过部分使用 FP4 的传统 serving stack。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

端到端延迟的差距也非常明显。SemiAnalysis 的结果显示，TileRT 最大优势不在 TTFT，而是在连续 decode 阶段；一个测试中的 decode tail 约 **3.01 秒**，最佳 NVFP4+MTP 对手约 6.54 秒，而 AMD MI355X 对应结果约 18.18 秒。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

但文章非常强调，这绝不能简单翻译成“B200 + TileRT 全面击败 GB300”。TileRT目前主要测试的是 batch size 1，它牺牲 aggregate throughput 换取极端的单用户性能。在 8k/1k 的一个比较点里，传统 GB300 配置仍可达到约 240 tok/s/GPU 的总吞吐，同时提供约154 tok/s/user；TileRT 只有约160.4 tok/s/GPU，却把用户速度推到340 tok/s。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

SemiAnalysis 因而把它戏称为不只是赛车，而是**只能坐一个乘客的私人火箭**。

## 真正聪明的地方，是它没有试图把 vLLM 淘汰

TileRT 最重要的系统设计可能不是 persistent kernel 本身，而是它并没有要求云厂商把现有推理栈推倒重来。

LLM inference 可以拆成 prefill 和 decode。Prefill 一次处理整段输入，计算密度很高，更需要总吞吐；decode 则一个 token 一个 token 连续生成，更依赖 memory access 和低延迟。TileRT 专攻后者。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

在实际部署里，vLLM 仍然可以负责 prefill、scheduler、prefix caching、API 和普通用户的 decode；只有真正要求极低延迟的请求才通过 router 被送到 TileRT。TileRT 官方 GitHub 已经提供这种共享 prefill、两种 decode pool 并存的配置，使用 MultiConnector 和 NIXL/Mooncake 等组件转移 KV cache。[GitHub](https://github.com/tile-ai/tilert)

因此一家 AI 云厂商不需要做“全用 TileRT还是全用 vLLM”的选择。它可以让 95% 普通请求继续追求最低成本，把愿意为速度支付溢价的那部分请求动态送入 TileRT。

这也是为什么这套架构在商业上可能比单纯的 benchmark 数字更重要。

## Cerebras 和 Groq 面临的新问题：客户到底需要一台“速度机器”，还是一个“速度档位”？

Groq、Cerebras 和 SambaNova 很早就发现了传统 GPU 超低延迟执行的问题，只是它们选择在硬件层面解决。Groq 依靠高度确定性的编译调度和 SRAM，Cerebras 使用 wafer-scale processor，把大量计算和 SRAM 放在一整块晶圆级芯片上；SambaNova 也利用 dataflow-style 架构减少动态调度与不必要的数据搬运。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

TileRT 借鉴了其中若干思想，却继续运行在 Nvidia GPU 上。它不可能真正消除 GPU 的物理限制；例如软件可以让 GPU 更接近 HBM roofline，却无法把 HBM 变成片上 SRAM，也无法凭空提高物理 memory bandwidth。因此对于部分模型和追求绝对最高 token/s 的场景，专用芯片仍然有真正的硬件优势。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

但 SemiAnalysis 认为，专用芯片面临另一个商业弱点：**fungibility。**

如果一个云厂商购买大量 Groq 或 Cerebras 设备，它实际上提前下注未来需要多少“超高速 inference”。如果实际 premium traffic 比预期少，这些专用硬件很难瞬间变回适合其他 workload 的通用 GPU。

GPU 集群则完全不同。今天可以用来做 prefill，明天可以跑普通 high-throughput decode，流量高峰时又能把部分 B200 切给 TileRT。需求比例变化可以通过软件重新配置，而不用重新采购、上架和布线一批专用机器。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

文章因此提出了一个很强的观点：很多客户真正需要的可能并不是购买一台专门的“速度机器”，而是在原有 GPU fleet 上增加一个**speed tier**。

Xiaomi 已经给出了真实商业案例。其 MiMo-V2.5-Pro-UltraSpeed 产品明确使用 TileRT 的 persistent-kernel 系统优化，且官方价格明显高于普通版；这说明至少已有厂商愿意把“同一个模型、更高生成速度”作为独立付费产品销售。[MiMo](https://mimo.mi.com/)

## 但 TileRT 目前最大的弱点也非常明显：它一点都不通用

如果故事到这里结束，很容易得出“Cerebras/Groq 危险了”的过度结论。SemiAnalysis 后半篇恰恰强调 TileRT 最大的问题。

截至文章发布时，它公开支持的模型非常少，主要是 GLM-5/5.1 和 DeepSeek-V3.2；Xiaomi 的实现属于合作优化。官方安装环境甚至对 GPU、CUDA、PyTorch 等软件版本有非常严格的 pinning，例如当前公开版本针对 8×B200 环境。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

原因恰恰来自它速度快的方式。TileRT 要提前决定 tile shape、pipeline depth、register/shared-memory/L2 的数据驻留方式、warp 分工、通信融合方式，以及不同 GPU 的特殊角色。如果模型换了一种 attention mechanism 或 routing strategy，大量 schedule 就可能需要重新设计。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

所以 TileRT 在某种意义上也继承了专用 ASIC 的弱点：极高性能来自高度特化，而高度特化带来较慢的软件适配速度。

AI coding agents 可以帮助在已有模板上自动调优，但 SemiAnalysis认为真正新的 execution transformation 目前仍然需要专家判断。[InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)

## 为什么这篇文章对 Nvidia 的投资逻辑很重要

下面是我的延伸判断，不是 SemiAnalysis 的原文结论。

Nvidia 长期最可怕的竞争优势可能并不是“每一代 GPU 永远在所有指标上都是最快芯片”。事实上，从 TPU、Trainium 到 Cerebras、Groq，已经有很多架构能在某些 workload 上做得比 GPU 更好。

真正难打败的，是 **GPU 的可重构经济价值**。

同样一批 B200，客户可以买来训练、做 batch inference、做高并发 serving；现在通过类似 TileRT 的软件，又开始能够从同一批硬件中切出 ultra-low-latency inference。专用 ASIC 必须证明自己的硬件优势大到足以抵消采购另一套硬件、建设另一套软件生态以及未来需求预测错误的风险。

如果 TileRT 这条路线最终扩展到更多主流模型和更大的 batch size，那么 Cerebras、Groq 等厂商并不会消失，但它们需要争夺的 TAM 可能被压缩到真正要求**极致速度而非仅仅“足够快”**的部分。Nvidia 则可以通过 CUDA/vLLM/TileRT 等软件层不断侵入原本属于专用芯片的细分市场。

而我认为更深的一层，是未来 AI inference 的价值捕获可能越来越从“芯片 FLOPS”转向 **serving architecture**。Prefill 和 decode 分离、不同 SLA 请求动态路由、KV-cache 搬运和复用、premium speed tier、agent workload 的长上下文缓存，都在决定同一块 GPU 最终能产生多少收入。硬件当然仍然重要，但两家公司拥有完全相同的 B200 集群，最终推理成本和产品体验可能因为软件 stack 不同而出现巨大差距。TileRT 这篇文章最值得记住的因此不是“494 tok/s”这个数字，而是它展示了一个正在发生的变化：**AI 算力时代，软件优化可能继续把已经安装好的硬件重新变成一种新的产品。** [InferenceX](https://inferencex.semianalysis.com/blog/ultra-high-interactivity-on-nvidia)
