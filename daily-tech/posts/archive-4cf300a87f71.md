今天推荐 **Lauren Goode 于 2026 年 9 月 9 日在《WIRED》发表的《A Stealth Startup Thinks It Just Hacked the Memory Shortage》**。文章目前页面可以直接阅读全文，不过 WIRED 对部分用户可能采用计量式访问；篇幅大约属于 10 分钟左右的技术商业深读。[阅读 WIRED 原文](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

我今天选它，是因为过去两年 AI 基建的瓶颈一直在迁移：GPU 不够以后缺 HBM，HBM 扩产以后又遇到晶圆厂、先进工艺、封装和资本开支约束。这篇文章介绍的 **Kepler Computing** 试图从一个非常不同的方向解决问题：不是再建一座价值两三百亿美元、依赖最先进光刻的新 memory fab，而是利用 **3D 结构、铁电材料和成熟制程，把现有 fab 改造成能够生产高密度 AI memory 的工厂**。如果它真的能够规模化，这不是又一家“做 HBM 的 startup”，而是在挑战整个半导体产业几十年来依赖“缩小晶体管 → 建更先进 fab → 买更贵光刻设备”获得密度提升的基本经济学。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

但这篇文章最值得读的地方同样在于它没有把 Kepler 当成已经成功的革命。公司目前只处理过约 **2,000 片 wafer**，第一批 HBM 样品要到今年晚些时候才计划送出，真正量产预计 2027 年从新加坡开始，美国生产目标则是 2028 年。GlobalFoundries 高管自己也明确承认，最难的一关仍然是能不能把实验室里成立的物理机制，在数千甚至数百万颗器件上稳定复制。换句话说，这是一篇很典型的“**技术逻辑非常诱人，但 manufacturing risk 仍然决定一切**”的半导体文章。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

由于原文受版权保护，下面不是逐句翻译，而是把报道中的技术细节、人物判断和商业逻辑重新组织，并用美国商务部和 Kepler 自己的公开资料补充必要背景。

## Kepler 想解决的不是“HBM 不够快”，而是今天制造 HBM 的扩产方式本身太慢

Kepler 2018 年成立于 San Jose，创始团队来自物理、计算机科学和半导体工艺领域，公司在 stealth mode 里待了七年多才公开。它已经累计融资 **4.68 亿美元**，投资方包括 GlobalFoundries、Intel Capital、AMD Ventures、Baillie Gifford 和 Bill Gates 的 Gates Frontier Fund；GlobalFoundries 本身投了约 **5,000 万美元**，同时也是制造合作伙伴。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

公司之所以现在出来，是因为 AI 把 memory 从过去相对周期性的 commodity business，突然推到了计算系统最重要的战略位置之一。

HBM，也就是 High Bandwidth Memory，本质上仍然属于 DRAM，但不是把一颗传统 DRAM 芯片摆在 GPU 旁边，而是把多层 DRAM die 垂直堆起来，通过高密度互连让数据以极高带宽进入 accelerator。这样做的价值很直接：现代 AI 计算很多时候不是算术单元不够，而是 GPU 等数据。参数、KV cache、中间 activation 如果搬不过来，再多 tensor core 也只能空转。

这就是为什么今天 Nvidia、AMD 甚至各类 custom ASIC 的性能路线都越来越受到 HBM capacity 和 bandwidth 约束。

问题在于传统解决方法非常资本密集。

当 SK Hynix、Micron 或 Samsung 发现未来几年 HBM 需求巨大，它们通常只能继续扩 DRAM 晶圆产能、升级制程、建设先进封装线。新的 semiconductor fab 从规划、洁净室、设备安装、工艺 qualification 到真正稳定量产，动辄数年，资本开支又可能达到数百亿美元。

目前市场确实仍然很紧。SK Group 董事长今年 6 月公开说，公司计划未来五年把 wafer capacity 翻倍，但他同时认为 memory 供给紧张可能一直延续到 **2030 年**；SK Hynix 当时在全球 HBM 市场份额约为 58%。这说明即使龙头愿意砸巨额资本，物理产能本身也不可能像云服务器一样几个月扩一倍。[Reuters](https://www.reuters.com/world/asia-pacific/sk-hynix-plans-double-wafer-capacity-next-five-years-group-chairman-says-2026-06-02/)

Kepler 的出发点因此是：

**能不能不要等新 fab？**

## 它真正挑战的是一个半导体产业非常根深蒂固的假设：高密度一定要靠更小的平面晶体管

过去几十年，提升单位面积存储量最直观的方法一直是缩小 feature size。

从 28nm 到 14nm。

再到 7nm、5nm、3nm。

晶体管越小，同一片 wafer 可以塞更多器件。

但到了先进节点以后，缩小开始越来越依赖 EUV，也就是 Extreme Ultraviolet Lithography。设备极其昂贵，fab 本身也必须重新设计和建设，因此每一代 scaling 的资本成本越来越高。

Kepler 的核心主张是：**密度不一定非要主要从 x-y 平面继续缩。**

公司想把一部分 scaling 转向 z 轴，也就是 3D。

它宣称自己的新 memory architecture 结合三维堆叠和新型材料，可以在成熟工艺上获得原本需要非常先进 lithography 才能获得的密度，从而绕开 EUV。Kepler 自己甚至把公司理念直接写成了“leadership chips without EUV”。[Kepler](https://keplercompute.com/)

WIRED 报道中，Kepler 更大胆地声称，其 SRAM 技术能够做到类似 2nm 或 3nm 芯片的密度，但不需要真正用 2nm/3nm EUV 工艺制造。

这里必须非常谨慎地理解：

这目前仍然是 **Kepler 的技术主张**，不是一项已经被大量量产产品独立证明的行业事实。

如果最后 yield 不够，或者材料在多年运行里 reliability 不行，那么“等效 2nm 密度”没有商业意义。

但它提出的路线本身非常有意思，因为它把一个资本问题变成了一个材料和结构问题。

## HBM 和 SRAM，Kepler 实际上是在同时攻击 AI memory hierarchy 的两个极端

理解 Kepler 为什么同时谈 HBM 和 SRAM，需要先把 AI 芯片里的 memory hierarchy 稍微拆一下。

SRAM 是 GPU、CPU、XPU die 内部使用的高速 cache。

它非常快。

延迟很低。

能耗也非常好。

但面积极其昂贵，所以不可能塞几百 GB。

HBM 则容量大得多，可以放在 accelerator 附近提供巨量带宽，但数据仍需要跨 chip 或 package 搬运，因此每 bit 能耗远高于 die 内 SRAM。

Kepler 想做的事情，某种程度上就是缩小两者之间的差距。

对 HBM，它采用新的 3D manufacturing 方法，在同一 footprint 里增加可堆叠的 memory，并尽可能让 compute 更靠近 memory，以降低搬数据的能耗。

它长期提出的目标非常激进：让 HBM 一类的大容量 memory 在 **bandwidth-per-watt 上接近 SRAM**，同时仍然拥有远高于 SRAM 的 capacity。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

如果真能做到，这个价值远比“HBM 便宜 20%”更大。

因为今天 AI 系统功耗中，搬数据本身已经占掉非常显著的一部分。

一个 AI accelerator 每次把参数从远端 memory 搬到 compute unit，都在花能量。

模型越大，KV cache 越大，agent session 越长，memory traffic 越重。

因此未来 inference 的一个核心指标很可能不是 FLOPS/W，而是：

**每搬一个 byte 到算力单元，需要多少 joules。**

这就是 Kepler 把自己定位成 “AI’s new memory” 而不是普通 DRAM startup 的原因。[Kepler](https://keplercompute.com/)

## 但我认为文章里真正更有技术含量的部分其实是 SRAM，因为这里涉及一种新的铁电材料

Kepler 在 SRAM 方向的核心工具叫 **ferroelectrics，铁电材料**。

普通 SRAM 之所以快，是因为它本质上用晶体管构成 latch 来保持 0 和 1，但代价是每个 bit 需要多个 transistor，所以面积不小。

铁电材料则利用材料本身不同的极化状态表示数据。一个很重要的特性是，它们可以在相对低的 voltage 下完成 read/write，因此理论上可以显著降低能耗并提高 storage density。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

Kepler CTO Sasi Manipatruni 告诉 WIRED，团队前后试了 **35 个 composite material iterations**，才找到他们认为可以进入 scaling 的材料体系。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

这里有一个容易忽略的细节：

Kepler 并不是突然在 2026 年才想起 ferroelectric memory。

公司早在 2021 年提交、2022 年获批的专利，就描述了 **stacked ferroelectric non-planar capacitors**，包括把多个 capacitor 垂直堆叠在一个 bit-cell 中，从而提高 storage density 的结构。也就是说，现在公开的“3D + ferroelectric”路线至少有数年研发历史，并不是 AI boom 后拼出来的一份 pitch deck。[StorageNewsletter](https://www.storagenewsletter.com/2022/10/04/kepler-computing-assigned-patent/)

这并不能证明技术一定能量产，但至少说明它属于真正的 semiconductor process research，而不是纯融资故事。

## Kepler 最吸引投资人的商业模式其实不是“我的 memory 比别人快”，而是“我能把已经存在的 fab 重新利用起来”

WIRED 报道里最让我觉得值得记住的数字不是 bandwidth，也不是参数。

而是 **8 个月 vs 24 个月**。

Kepler 声称，它与 GlobalFoundries 的早期合作中，可以大约 8 个月把现有 fab 改造成适合自己下一代 memory 工艺的产线；传统类似 fab 转换通常可能需要约 24 个月。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

目前它主要在 GlobalFoundries 新加坡工厂进行测试，也使用 Vermont 的设施。Kepler 所谓的 “mini fab” 与 **28nm GlobalFoundries process** 配合工作。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

这里的经济意义非常大。

全球并不缺 fab。

全球真正稀缺的是：

**能够高利润生产 AI 需要的先进 memory 的 fab。**

世界上有大量成熟节点工厂仍然生产 MCU、汽车芯片、射频、电源管理和其他产品。如果一种新 memory technology 真能在这类成熟基础设施上获得足够高的 density 和 energy efficiency，产业就不必每增加一单位 AI memory demand，都同步增加一单位最先进 fab capacity。

Kepler CEO Debo Olaosebikan 的赌注，本质上是：

为了适配新材料和新工艺花一笔 retooling cost，

远远好过花 **200 亿至 400 亿美元**重新造一座全新 fab，再塞进去数亿美元一台的最先进设备。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

这和过去几年芯片行业最流行的路线其实正好相反。

过去的默认答案是：

**需求更多 → 建更多 leading-edge capacity。**

Kepler 想变成：

**需求更多 → 让旧 capacity 变得更有价值。**

## 这也是美国政府为什么愿意给它最高 2.45 亿美元支持，而且目标不是普通 startup subsidy

今年 7 月 29 日，美国商务部通过 CHIPS Research and Development Office 与七家公司签署总额最高 **8.74 亿美元**的意向安排，其中 Kepler 单独获得最高 **2.45 亿美元**拟议支持，用于在美国开发“利用创新 3D 和铁电技术的新型高性能 AI memory”。[NIST](https://www.nist.gov/news-events/news/2026/07/department-commerce-announces-letters-intent-7-companies-874-million)

这里必须强调两个限定。

首先，**这不是已经到账的 2.45 亿美元 grant**。

美国商务部明确写的是 letter of intent，仍需要进一步 diligence 和审批以后才会成为 final award。[NIST](https://www.nist.gov/news-events/news/2026/07/department-commerce-announces-letters-intent-7-companies-874-million)

其次，这轮政策已经不再只是过去 CHIPS Act 那种“补贴多造几个 fab”。

同一批项目中，美国还资助 co-packaged optics、先进封装、超低损耗 dielectric、新型 substrate 和 thermodynamic compute。Kepler 只是其中 memory 那一层。政策逻辑明显开始从“美国需要制造 capacity”转向：

**美国需要下一代 compute supply chain 的关键技术。** [NIST](https://www.nist.gov/news-events/news/2026/07/department-commerce-announces-letters-intent-7-companies-874-million)

美国政府甚至要求，在最终获得这批 R&D incentive 的企业中持有少数、非控制性 equity stake。

这意味着政策越来越像产业投资，而不只是传统补助。[NIST](https://www.nist.gov/news-events/news/2026/07/department-commerce-announces-letters-intent-7-companies-874-million)

## 但 Kepler 现在离“解决全球 HBM 短缺”还非常远，真正最大的风险只有一个词：yield

文章后半段非常重要，因为半导体 startup 最大的问题几乎永远不是：

“做过一颗好芯片吗？”

而是：

**“能不能把一百万颗都做好？”**

截至报道时，Kepler 的技术大约只处理过 **2,000 片 wafers**。

公司计划今年晚些时候送出首批 HBM samples。

明年在新加坡增加 production。

美国生产目标放在 2028 年。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

GlobalFoundries CMOS 业务高级副总裁 Ed Kaste 的判断非常准确。他认为 fundamental breakthroughs 已经发生，接下来的问题是能不能在：

thousands of wafers，

millions of devices

上持续得到好结果。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

半导体行业最残酷的地方就在这里。

一个器件实验室里做到 99% 成功率，听起来很好。

但如果一颗 memory chip 里有数十亿个 bit，而良率问题在整个 die、stack 或 wafer 上累积，最后可销售比例可能完全不可接受。

这就是为什么 semiconductor manufacturing 很少被 startup 靠一个漂亮 prototype 快速颠覆。

物理定律可以在一天证明。

**manufacturing learning curve 要用 wafer 一片一片磨出来。**

## Kepler 的新材料甚至给传统 fab 带来一个很现实的麻烦：里面有铁

WIRED 文章里一个非常好的细节是，GlobalFoundries 没有回避材料污染问题。

Kepler 的 composite material 包含 **iron**。

对于半导体 fab 来说，铁不是一个无害的新元素，而是非常麻烦的 contaminant。

它如果进入普通 silicon process flow，可能影响其他产品，因此不能简单把含铁工艺设备推进一条正在量产大量其他芯片的产线。

Kaste 表示，解决办法必须是：

使用 dedicated equipment，

或者把材料彻底 encapsulate，

保证它在整个 production flow 里不会逸出。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

这一点其实直接击中了 Kepler 商业模型最敏感的位置。

公司的核心 pitch 是：

“不要新建 fab，改现有 fab 就行。”

但如果最后发现新材料需要大量独立设备、洁净区和 contamination control，那么 retrofit 的资本优势就会被削弱。

不一定消失。

但真实成本必须等量产以后才知道。

## 还有一个更深的问题：新型 memory 最大的挑战往往不是 density，而是耐久性和 reliability

WIRED 没有过多展开这一层，但从整个 ferroelectric memory 技术史来看，它非常重要。

一种 memory 如果要进入 AI server，不只是要：

快。

容量大。

省电。

它还必须经得起数年持续 read/write。

温度变化不能改变数据。

不同 wafer、不同 die 的 switching behavior 不能漂移太大。

error rate 必须足够低。

而 ferroelectric memory 历史上一个长期问题就是 fatigue，也就是材料经历大量 polarization switching 后，性能可能逐步退化。

一些近期对 Kepler 技术的分析也指出，真正决定它能否商业化的核心问题，不是 prototype density，而是 repeated switching、uniformity、yield 和 long-term reliability。[XenoSpectrum](https://xenospectrum.com/en/kepler-ferroelectric-ai-memory/)

所以这里有一个很重要的判断标准：

**第一批 sample 成功，不等于 thesis 被证明。**

真正值得关注的是客户 qualification 以后公布的 endurance、yield、bandwidth、power 和 volume shipment。

## 为什么这件事现在尤其重要：AI 正把整个 memory 产业从“周期股”变成算力供应链战略资产

过去 memory 行业非常典型：

价格涨。

大家扩产。

两年后供给过剩。

价格暴跌。

再减产。

因此 DRAM/NAND 龙头一直被当成高度周期公司。

AI 正在改变这个结构。

HBM 不只是普通 DRAM 多堆几层。

它需要更复杂的 TSV、die stacking、thermal management、testing 和先进封装。

制造商为了追逐 HBM 的高利润，又会把传统 DRAM capacity 转走，结果反而让普通 memory 价格也上涨。

S&P Global 今年就观察到，memory 厂商把资源向 HBM 倾斜后，传统 DRAM 本身也出现供给偏紧，2026 年市场预期 Samsung、SK Hynix、Micron 的传统 DRAM 每 bit 收入都大幅提高。[S&P Global](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/01/ai-memory-boom-squeezes-legacy-dram-supply-pushing-prices-higher)

所以 HBM shortage 不是只影响 Nvidia。

它会通过 wafer allocation 传导到：

server RAM，

PC，

手机，

企业 IT，

甚至消费电子。

这就是为什么如果 Kepler 真能用成熟 fab 新增一类高性能 memory capacity，它解决的可能不只是 AI accelerator 的一个零部件问题，而是释放整个 DRAM supply chain 的压力。

## 但投资上，我现在不会把它理解成“SK Hynix 和 Micron 要被颠覆”

下面是我的判断，不是 WIRED 原文结论。

Kepler 是一家私营公司，目前没有直接公开市场标的。

而且从投资角度看，现在最容易犯的错误，就是看到：

“28nm 做出 2nm density”

“HBM 不需要 EUV”

“新 memory 革命”

然后马上推导：

SK Hynix / Micron / Samsung 的 moat 消失。

距离这个结论至少还隔着三个最难的东西：

**yield、qualification、volume。**

SK Hynix 今天真正的优势不只是 DRAM cell 能工作。

而是它能：

一年生产数百万片 wafer。

筛出 known-good dies。

稳定堆成 HBM。

与 Nvidia package 一起完成验证。

保证大量客户连续运行。

下一代再无缝升级。

这种 manufacturing know-how 本身就是极大的 moat。

所以即使 Kepler 的器件物理完全成立，我认为最可能的早期商业结果也不是把 SK Hynix 替掉，而是先打开一个新 memory tier，或者让一部分 mature fab 参与 AI memory supply。

## 如果它成功，真正最值得看的上市公司反而可能是 GlobalFoundries

这是我认为这篇文章比较有意思的二阶投资角度。

GlobalFoundries 长期最大的问题，是它 2018 年退出 7nm 以后，不再参与 TSMC、Samsung 那种最先进逻辑节点竞赛。

市场因此经常把它理解成 mature-node foundry：

汽车。

IoT。

RF。

工业芯片。

这使它没有直接吃到 Nvidia/AI leading-edge compute 最大一波红利。

Kepler 的逻辑如果成立，恰恰可能把 GFS 的弱点变成资产。

因为它的 thesis 就是：

**28nm fab 不一定只能做低价值 28nm 产品。**

通过材料、3D integration 和新的 device architecture，可以让成熟 manufacturing infrastructure 生产高价值 AI components。

GlobalFoundries 不只是 Kepler 投资者，也是实际 manufacturing partner，而且已经在新加坡和 Vermont 帮它跑 process。[WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)

这仍然距离 GFS earnings materiality 很远，但如果未来一两年 Kepler 真正进入 volume，GFS 可能是少数能从这个新 architecture 直接获得制造收入的公开市场公司之一。

## 对 ASML 则完全不应该简单理解成“EUV 被绕开，因此 bearish”

Kepler 自己确实不断强调“不依赖 EUV”。

但 AI semiconductor 的真实需求增长太大，而且先进 logic、DRAM、foundry 和其他芯片仍然继续向 leading-edge nodes 前进。

一种 memory technology 即使成功，也更可能减少**某一部分 memory density scaling 对 EUV 的边际依赖**，而不是让整个 semiconductor industry 从 EUV 倒退。

甚至可能出现 Jevons-paradox 式结果：

memory 更便宜 → AI server 更容易扩 → accelerator 数量更多 → leading-edge logic 和其他先进制程需求反而增加。

所以我不会把这篇报道理解成 ASML disruption story。

## 更深的一层：Kepler 真正代表的是“AI 半导体 scaling 从 lithography scaling 变成 architecture + materials scaling”

这可能是这篇文章最值得记住的意义。

过去几十年半导体行业最重要的创新轴非常清晰：

**把 transistor 做小。**

现在这个轴越来越贵。

因此产业开始同时向其他方向找性能：

chiplet。

CoWoS。

3D stacking。

CXL。

co-packaged optics。

HBM。

backside power。

新材料。

Kepler 是这个趋势特别纯粹的一个例子。

它不是说：

“我有更先进的光刻。”

而是：

**“我能不能少依赖光刻？”**

这是一种非常不同的技术哲学。

如果 AI 时代真正的瓶颈逐渐从 arithmetic 转向 memory movement，那么未来几年最重要的芯片创新很可能越来越少来自“GPU tensor core 又快了多少”，越来越多来自：

数据放在哪里，

离 compute 多近，

怎么搬，

每搬一 bit 花多少能量，

以及能不能利用已经存在的 fabs 制造出来。

所以我认为《A Stealth Startup Thinks It Just Hacked the Memory Shortage》真正值得跟踪的，不是今天就判断 Kepler 会不会成为下一家 Micron，而是它提出了一个更大的问题：

**当先进 fab 的资本成本已经高到几十亿美元乃至几百亿美元时，下一轮 AI scaling 是否还必须继续把“更先进”与“更小节点”画上等号？**

如果 Kepler 最终失败，它很可能败在 semiconductor manufacturing 最传统的那些地方：污染、良率、可靠性和规模化。

但如果它成功，这件事的意义也会远超“多了一家 HBM 供应商”。

它会证明一个可能非常重要的新方向：

**AI 的下一代 memory，不一定需要由下一代 fab 来制造。** [WIRED](https://www.wired.com/story/a-new-dollar400-million-startup-wants-to-fix-the-ai-memory-bottleneck/)
