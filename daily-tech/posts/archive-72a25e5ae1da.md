# 今日科技长文：Waymo 为什么要自己造芯片——Robotaxi 正在从“AI 软件问题”变成“整车计算机问题”

今天推荐 Waymo 工程副总裁 Satish Jeyachandran 与 Compute Lead Daniel Rosenband 于 **2026 年 8 月 20 日**发表的官方工程长文 **《A look under our trunk: what’s in our compute》**。文章在 Waymo 官网**免费公开**。它不算传统媒体调查，而是一篇很值得读的一手技术文章：Waymo 第一次比较系统地解释，第六代 Waymo Driver 背后到底需要什么样的车载计算架构，并首次公开一颗自研 **5nm sensor-fusion ASIC**。几天后，Rosenband 又在 Hot Chips 2026 做了题为 **“Compute in Motion: Challenges of Autonomous Driving”** 的 keynote，Waymo 团队随后专门介绍这颗 sensor-fusion processor，因此这篇文章实际上是 Waymo 第一次公开展示自己已经走到“自研自动驾驶 silicon”阶段。[阅读 Waymo 原文](https://waymo.com/blog/2026/08/look-under-our-trunk/) [Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

我今天选它，是因为它纠正了一个很常见的自动驾驶理解：市场经常把 Waymo 和 Tesla 的竞争简化成“LiDAR vs camera”或者“谁的 AI 模型更强”，但 Waymo 这篇文章展示的是一个更深的竞争层级。真正做到没有安全员的 Level 4 robotaxi，需要把 **传感器、模型、芯片、车载网络、散热、冗余、电池效率和整车空间一起设计**。当一个 robotaxi fleet 每周已经跑到几十万单后，每辆车多几百瓦功耗、多几千美元计算硬件、或者 perception latency 多几毫秒，都会直接变成规模经济和安全性的差距。Waymo 已经从“用现成 GPU 跑自动驾驶软件”，走向类似 Google TPU 的思路：**把固定、高价值、高规模的 AI workload 直接固化进自己的 ASIC。** [Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

## Waymo 认为自动驾驶计算和普通 AI 最大的区别，是你没有机会等云端回答

文章从一个非常基础、但容易被忽视的事实出发：Waymo Driver 的整个驾驶决策链必须在车内完成。

一辆车看到前方行人以后，不可能把几十个摄像头、LiDAR 和 radar 的原始数据传回 Google 数据中心，等待 GPU cluster 推理，再把“刹车”指令发回来。网络延迟、断网和云端故障都不可接受。因此 Waymo 把车载 compute 称为整个 Driver 的“大脑”，其任务是把原始 sensor data 在毫秒级内转化成真实 steering、braking 和 acceleration。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

Waymo 因而提出一个比普通 benchmark TOPS 更有意义的指标：**pixels-to-actuation latency**。

也就是从传感器第一次捕捉到现实世界变化，到车辆真正执行动作，中间总共用了多久。期间不仅包括一个神经网络 forward pass，还包括 sensor ingest、去噪、fusion、perception、prediction、planning、系统通信以及最终 actuator command。

Waymo 称过去八年车载原始 compute capability 已经扩大约 **20 倍**，但它强调真正目标不是追求峰值 TOPS，而是尽可能压缩整个链路的 tail latency。因为自动驾驶面对的不是平均 workload，而是某一个最危险时刻能不能及时做完所有计算。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

这和数据中心 AI 有一个非常有意思的区别。ChatGPT 偶尔从两秒变三秒，用户可能只是觉得慢；robotaxi 如果 perception pipeline 在关键情况下多拖几十毫秒，车辆已经继续向前移动了一段距离。因此，Waymo 优化的是一种极端 **real-time edge AI**。

## 自动驾驶计算机还必须满足数据中心几乎不存在的两个要求：抗造和双重冗余

Waymo 把车载计算系统设计要求概括为三个核心约束：responsive、ruggedized 和 redundant。真正值得看的反而是后两项。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

一台数据中心服务器生活在温度、湿度和供电高度受控的机房里。Waymo 车载计算机却要每天承受震动、坑洼、冲击，同时经历 Phoenix 夏天和美国中西部冬季。硬件既不能因为高温降频，也不能因为长期机械应力提高故障率。

因此 Waymo 把计算系统直接与车辆自己的 **liquid cooling** 体系结合，在寒冷和酷热环境里都尽量保持稳定性能。它还非常在意体积和噪音，因为塞进后备箱里的计算机如果需要服务器级风扇和巨大散热器，就会直接侵占乘客空间和电池续航。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

更关键的是 redundancy。传统高级驾驶辅助系统出了故障，理论上还可以要求驾驶员接管；真正的 Waymo robotaxi 没有这个 fallback。

所以 Waymo 设计了两个相互独立的 compute engine。正常情况下两套系统并行运行；如果其中一套出现硬件故障，另一套可以继续承担驾驶任务。Waymo 很明确地说，因为没有人类可以接管，冗余不是附加功能，而是从系统最底层就必须存在。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

这一点其实解释了为什么 Waymo hardware 很难简单拿来和 Tesla FSD computer 比“TOPS/$”。对于 Level 4 无人运营，真正成本函数不是单纯 AI 算力，而是：

**算力 × 可靠性 × 冗余 × 功耗 × 热管理 × 汽车寿命。**

## Waymo 没有做“一颗万能芯片”，而是选择 heterogeneous compute

很有意思的是，Waymo 并没有把路线描述成“我们以后全用自研芯片，不需要 Nvidia 或 AMD”。

恰恰相反，它认为自动驾驶 workload 类型差异非常大，所以最合理的是 heterogeneous architecture。ML inference、sensor processing、CPU orchestration、data movement、logging 和其他系统任务对硬件的需求完全不同。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

因此 Waymo 继续使用 CPU、GPU 和各种 accelerator，只把最值得专用化的部分逐渐搬到 custom silicon。官方公开列出的合作伙伴依然包括 **AMD、Nvidia、Micron、Samsung、SanDisk、Socionext 和 TSMC**。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

这其实是一种很成熟的 silicon strategy。不是为了“自研”而自研，而是先问哪个 workload 已经足够固定、规模足够大、又足够影响功耗和 latency，使 ASIC 的高昂开发成本值得。

这次 Waymo 选择的答案是：**sensor ingest + sensor fusion 前端。**

## 新公布的 5nm ASIC，专门站在传感器和核心 AI“大脑”之间

Waymo 首次公开的这颗 **5nm ASIC**，不是整辆车唯一的 AI processor，而是专门处理来自 camera、LiDAR 和 radar 的海量原始输入。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

第六代系统可以同时实时处理 **13 个高分辨率摄像头**的数据。除此之外还有 LiDAR 和 radar。原始 sensor stream 首先进入这颗专用芯片，进行预处理、信息提取和融合，然后才把更加适合机器学习模型消费的数据送入后续 core ML system。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

Waymo 特别提到一个例子：**temporal denoising**。

夜间摄像头或者 LiDAR 里经常会出现噪声。单看一帧，一个亮点可能是真实物体，也可能只是噪声；如果把前后多个时间帧放在一起比较，就可以判断什么是持续存在的真实 signal，什么只是瞬间 artifact。Waymo 把这类处理直接做进专用硬件，希望在夜间和低光场景中提高 perception quality，同时减少后续 ML pipeline 不必要的数据负担。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

芯片随后运行 sensor-fusion neural networks，把来自不同 modality 的信息融合成统一环境表示。Waymo强调，这颗芯片既支持 sparse convolution 一类模型，也考虑到了更密集的 transformer workload，说明它并不是为了某一个固定神经网络硬编码，而是希望保留算法继续升级的空间。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

这一点很重要，因为 ASIC 最大风险就是软件变化太快。自动驾驶 perception model 每几年都会变化，如果 silicon 只能运行今天的模型，芯片还没摊销完就会过时。Waymo显然是在专用效率和模型可编程性之间找一个中间点。

## Waymo 公开的“1000+ TOPS”其实很容易被误读

Waymo 称这些自研 ASIC 总计可以提供超过 **1,000 TOPS 的 ML performance**，专门用于 front-end sensor processing 和 ML model。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

但这个数字绝不能直接拿去说“Waymo 芯片比 Tesla AI4 或 Nvidia Thor 快多少倍”。

原因是它们承担的任务并不一样。Waymo 这颗 ASIC 主要站在 perception pipeline 前端；Tesla 或 Nvidia 的车载 SoC 往往承担更完整的 perception、planning 甚至 cockpit workload。不同 TOPS 数字还可能使用 INT8、INT4 或其他精度计算，因此单纯比较峰值数字基本没有意义。

Hot Chips 之后整理出的公开资料进一步显示，Waymo 的具体 chip-level 设计比“1000 TOPS”这个营销数字更有意思：相关资料显示单颗 sensor-fusion processor 的功耗控制在非常低的汽车级范围内，而整个系统通过多颗 accelerator 并行承担不同 sensor workload。[AI2Work](https://ai2.work/blog/inside-waymo-s-custom-5nm-chip-1-000-tops-of-edge-compute-per-car)

Waymo自己也明确强调，它最关注的不是 peak TOPS，而是 **achieved performance in low-batch workloads**。这与数据中心 inference 很像：芯片标称10倍 FLOPS，如果实际模型因为 memory、kernel launch 或 data movement 只能利用20%，最终性能仍然可能不好。

汽车反而几乎永远属于低 batch。你不能把今天路口看到的行人攒够 64 个场景以后一起 batch inference。因此很多数据中心 GPU 用来提高 throughput 的优化，在汽车里没有同样价值。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

## 自研 ASIC 其实说明 Waymo 的 workload 已经“稳定”到了一定程度

这里是我认为文章最有意思、但 Waymo 没有直接展开的一层。

早期自动驾驶公司通常喜欢 FPGA，因为算法一直变化。FPGA 可以重新编程，工程师今天改变 sensor pipeline，明天还能重新配置硬件逻辑。

但 FPGA 的代价是功耗高、面积效率差、编程复杂，而且很难达到专用 ASIC 的 performance-per-watt。

一家公司什么时候才愿意花巨额 NRE、等待几年 tape-out 自己做 ASIC？

通常是在它认为 workload 已经足够成熟的时候。

Waymo强调这代计算架构建立在超过 **2 亿英里完全无人驾驶经验**之上。换句话说，公司已经拥有足够多真实驾驶数据，知道 perception pipeline 中哪些操作会长期存在、哪些东西值得直接固化到 silicon。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

因此这颗芯片本身也是 Waymo 技术成熟度的一个侧面信号：它已经不再只是在研究“自动驾驶到底该怎么做”，而开始针对**规模化运营一个已知 workload**做工业优化。

## 为什么 robotaxi 最终一定会进入 ASIC 经济学

假设 robotaxi 只有几百辆，那么自研芯片通常很不划算。ASIC tape-out、verification、software stack 和汽车认证都非常贵，直接买 Nvidia hardware 更简单。

但当 fleet 从几千辆向几万辆、几十万辆扩张时，数学开始反转。

假设专用 ASIC 每辆车可以少几千美元硬件，又减少几百瓦功耗，同时降低 cooling、battery 和维修成本。对一百万辆车而言，这就是数十亿美元级别。

Robotaxi 还有一个普通乘用车没有的特征：**utilization 极高。**

私人汽车一天可能只开一两个小时；robotaxi 可以长时间运营。因此同样100W功耗差异，全年电费、冷却和电池循环成本都会被放大。

所以 Waymo、Tesla 这类真正希望运营百万级自动驾驶 fleet 的公司，最终产生自研 silicon 动机并不奇怪。这与 Google TPU、Amazon Trainium、Meta MTIA 的逻辑实际上非常接近：只要 workload 规模足够大而且足够稳定，merchant silicon 的通用性溢价就开始显得昂贵。

## 真正值得关注的是：Waymo 正在变成一家“垂直整合 AI 系统公司”

Waymo 文章里反复出现一个词：**co-design**。

它不是先买摄像头，再买 GPU，然后让软件团队想办法在上面运行。Waymo强调 sensor、silicon、algorithms、thermal system 和 vehicle architecture 是一起设计的。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)

例如提高摄像头分辨率并不是“换一个更好 sensor”这么简单。分辨率提高后，sensor bandwidth 上升，memory traffic 增加，ASIC 必须处理更多数据，网络和 cooling 也跟着变化。如果芯片团队提前知道 perception algorithm 真正需要哪些特征，就可以直接在 sensor front-end 做压缩、denoising 或 quantization，从而避免把大量无价值 raw data 搬来搬去。

这正是 AI 系统现在越来越明显的趋势：**data movement 往往比 arithmetic 更贵。**

过去最容易宣传的是“我们的芯片有多少 TOPS”；真正成熟以后，公司开始优化的是“这一个 bit 能不能根本不要移动”。

## 我认为这对 Waymo、Tesla 和 Nvidia 的竞争格局有一个很重要的启示

下面是我的延伸判断，不是 Waymo 原文结论。

Waymo 自研芯片并不意味着 Nvidia 很快失去汽车市场。Waymo 本身仍公开把 Nvidia列为计算合作伙伴，而且它采用的是异构系统。更现实的趋势是：**规模最大的自动驾驶运营商会逐渐把最稳定、最昂贵、最影响功耗的 workload 收回自研，而把变化快或者更通用的部分继续交给 merchant silicon。**

这与 hyperscaler 数据中心正在发生的事情高度相似。Google 不会停止买 Nvidia，但有 TPU；Amazon 不会停止买 Nvidia，但有 Trainium；OpenAI 也开始做 Jalapeño。现在 Waymo 在车辆端也做同样的事。

因此 Nvidia 汽车业务真正需要回答的问题，可能不是“Thor 性能够不够”，而是它能不能让**没有 Waymo/Tesla 规模的汽车厂商**获得接近自研 silicon 的系统效率。绝大多数 OEM 没有能力自己养芯片团队、自动驾驶团队和软件生态，所以 Nvidia DRIVE 的 TAM 仍然很大；但最成功、fleet 最大的 autonomous operators 恰恰也是最有经济动机脱离通用平台的一批客户。

我认为这篇文章更深的意义，则是 robotaxi 竞争正在进入从“AI 能不能开车”到“谁能最低成本、最高可靠性地运营一百万辆无人车”的阶段。模型能力当然仍然重要，但真正达到规模以后，决定单位经济性的会越来越多是很无聊的东西：功耗、散热、芯片成本、故障率、维修、后备箱空间和 milliseconds of latency。

这恰恰是技术产业一个很典型的成熟过程：**当最神奇的功能开始工作以后，下一轮竞争往往不是让它更神奇，而是把它变得便宜、可靠，并且能生产一百万份。** Waymo 开始自研车载 ASIC，就是这个转折正在发生的一个很清晰信号。[Waymo](https://waymo.com/blog/2026/08/look-under-our-trunk/)
