今天推荐 **Everlyn、Dylan Patel 和 Patrick Schaabi 于 2026 年 9 月 25 日在 SemiAnalysis 发表的《The Chinese AI Infrastructure Boom: Introducing the SemiAnalysis China Datacenter Model》**。这篇文章的完整租户级深挖属于付费内容，但 SemiAnalysis 放出了非常长的公开预览，已经覆盖中国数据中心市场规模、历史结构、“东数西算”、建设速度、成本和 hyperscaler 需求模式，单是公开部分就足够作为一篇 15 分钟左右的深读。[阅读 SemiAnalysis 原文](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom) 我今天选它，是因为它纠正了一个在美国 AI 基建讨论里非常普遍的盲区：外界经常同时相信“中国有巨大的数据中心规模”和“中国数据中心大量空置”，却很少解释这两句话怎么可能同时成立。SemiAnalysis 用逐栋建筑追踪的方式给出了一个相当有说服力的答案：**中国不是缺数据中心，而是大量旧数据中心根本不是 AI 数据中心；与此同时，真正适合高密度 GPU/国产 accelerator 的新型 wholesale 容量正在以极快速度建设，而且其中最大的客户甚至不是上市公司，而是 ByteDance。** [SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

由于后半部分的 ByteDance、Alibaba、Tencent、Baidu 和 Huawei 逐家公司深挖在付费墙之后，下面不会试图通过其他材料“拼回”付费正文。我会非常细致地重构公开部分的完整论证，并用中国官方政策资料、Alibaba、Tencent、Baidu、GDS 和 VNET 最新财务披露核验最重要的数据。这反而能把文章最值得理解的基础框架讲得更清楚。

## 中国的数据中心规模可能比许多海外投资者想象的大得多，但“24GW”绝不能直接理解成 24GW AI GPU

SemiAnalysis 新建立的 China Datacenter Model 逐栋追踪了 **1,000 多个数据中心、60 多家运营商**。其结论是，截至 2026 年，中国已经交付的数据中心容量超过 **24GW**。按照 SemiAnalysis 同一口径的全球模型，美国在 2026 年底约有 56GW，除中国之外的亚太约 15GW，欧洲、中东和非洲约 14GW，拉美约 2GW。因此按这套 building-level 方法，中国已经明显是全球第二大单一数据中心市场，而且比整个 EMEA 或除中国之外的亚洲都大。模型之外还有大约 **20GW 有明确时间表的 pipeline**，以及约 **30GW 已宣布但尚未进入明确交付周期的项目**。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

但这里最容易犯的错误，就是把 24GW 直接当成“24GW AI compute”。

SemiAnalysis 恰恰认为，中国数据中心市场最大的结构性特点，是**大量存量容量来自完全不同的技术时代**。很多早期机房是低密度 retail racks，过去服务网站、游戏、CDN 和传统企业托管，约九成设施曾运行在低于 2kW 的机柜密度。今天一台 AI server 对机柜功率、供电、散热和网络的要求已经高几个数量级，很多老楼即使还有大量空机柜，也很难经济地升级成 H20、Ascend 或其他高密度 AI 集群。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

所以中国出现了一个表面矛盾、实际上非常合理的现象：

**全国数据中心总体空置率看起来很高，但 AI-ready 容量仍然紧张。**

这和房地产里“某城市有很多空办公室，但最好的 A 级写字楼仍然满租”非常像。供给不是同质商品。

SemiAnalysis 用一家大型 colocation 运营商的历史利用率展示这种分裂：整体利用率在 2010 年前后还处于 70% 中段，随着过度建设逐渐跌到 2022 年左右的 50% 中段；但 2023 年以后 wholesale 与 retail 开始明显分叉，新型 wholesale 建筑在 AI 需求驱动下重新升到 70% 以上，而老 retail racks 仍然在约 60% 左右徘徊。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这也是为什么看到“中国数据中心空置率 40%–50%”以后，不能直接推导出“中国 AI 算力建设过剩”。

你必须先问：

空的是哪一种机房？

一柜允许多少 kW？

能不能液冷？

电力系统能不能持续支持大规模 accelerator？

网络拓扑能不能支持 AI cluster？

如果答案是不行，那么那部分所谓“空余容量”对 frontier AI 基本没有供给意义。

## 中国数据中心最初根本不是 hyperscaler 行业，而是一门电信运营商的房地产生意

美国数据中心行业很早就被 AWS、Microsoft、Google 和大型 colocation 推向 hyperscale。一座 campus 为一个或几个巨型客户服务、规模达到数百 MW，在美国并不新鲜。

中国的历史完全不同。

在 2015 年以前，China Mobile、China Telecom 和 China Unicom 三大国有运营商合计占中国数据中心市场约 **60%–70%**，而 GDS、VNET 等第三方运营商各自不到 5%。政府、国企和强监管行业天然倾向采购国有运营商服务，运营商又同时拥有网络牌照和传输资源，因此在早期 IDC 市场有非常强的结构优势。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

当时的数据中心更接近“电信机房加带宽”。

运营商在北京、上海、珠三角等人口和互联网流量中心建设小型机房，把若干机柜连同带宽一起租给网站、网络游戏和 CDN 客户。第三方 IDC 很多时候甚至只是运营商空间与网络资源的转售商。

今天仍然存在的大量低利用率资产，正是这一时期的遗产。

它们不是“AI boom 建错了”。

很多是在 AI 出现十几年以前，按照另一个技术栈建设的。

这一区别对于判断中国有没有数据中心泡沫极其重要。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

## 真正的第一次过度建设发生在云计算战争，而不是生成式 AI

2015 年以后，中国进入云计算抢地盘阶段。

Alibaba 和 Tencent 都把公有云看成 winner-take-all 市场，于是开始激进投入。SemiAnalysis统计，Alibaba Cloud 在 2015–2019 年收入复合增速大约达到 **110%**，但背后伴随的是猛烈价格战和持续 EBITA 亏损。短短一年里，一些核心产品经历 **17 次降价，累计价格下降超过 50%**。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

GDS、VNET、Chindata 等第三方数据中心平台跟着扩张；很多 retail developer 也相信公有云需求会不断外溢，因此继续在城市附近建设较小的数据中心。

这轮扩张在 2022 年突然结束。

监管变化、宏观经济放缓和国有云份额提升共同作用，使 Alibaba Cloud 的增长率从 2021 年约 50%，降到 2022 年约 23%，之后一度接近停滞。Tencent 同样从追求收入规模转向所谓“健康增长”，并在 2022 年中期把资本开支预算大幅削减，Alibaba随后也压缩投入。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

于是前几年按照高速增长假设建设的 capacity 开始暴露出来。

SemiAnalysis称，中国不含电费的主要 IDC 市场租金一度从大约 **80 美元/kW/月**下降近一半。GDS 管理层今年 8 月还认为，行业可能需要另外约 18 个月才能完全消化这一轮价格重置。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

也就是说，今天中国 IDC “历史空置率高”的新闻，很大一部分是在描述**上一轮云计算周期留下来的供给**。

而不是当前 AI wholesale capacity 的真实供需。

## “东数西算”最初甚至赶上了行业最差的时候，所以早期看起来很像一个过度建设项目

非常有意思的是，中国在云计算需求刚开始急刹车的时候，正好全面启动了“东数西算”。

2022 年 2 月，国家发改委等部门正式批准在京津冀、长三角、粤港澳大湾区、成渝、内蒙古、贵州、甘肃和宁夏建设 **8 个国家算力枢纽节点、10 个国家数据中心集群**。官方目标就是把一部分对时延要求较低的数据处理，从土地、电力和能耗指标紧张的东部地区引向资源更丰富的中西部。[国家发展和改革委员会](https://www.ndrc.gov.cn/xxgk/jd/jd/202202/t20220217_1315795_ext.html)

问题是，2022–2023 年恰好又是互联网平台削减 capex 的时期。

于是大量西部机房建起来以后暂时没有足够客户。

这就形成了后来媒体非常常见的“西部建了很多空壳数据中心”叙事。

这个批评并非完全没有事实基础。官方自己在 2024 年披露，十大国家数据中心集群安装了超过 **146 万标准机架**，整体利用率约 **62.72%**，也就是说当时并不是满负荷。[中国网英文站](https://english.scio.gov.cn/pressroom/2024-08/13/content_117363927_3.htm)

但 SemiAnalysis 的核心观点是：AI 出现以后，这批基础设施突然遇到了一个与原始云时代完全不同的 workload。

传统 cloud、gaming、e-commerce 非常关心离用户的网络时延，因此开发商即便在东部拿不到能耗指标，也很难把大量 workload 搬去几千公里外。

AI training 则完全不同。

一次 training job 可以运行数天甚至数周。

它不在乎用户与 GPU 相距 2 毫秒还是 20 毫秒。

它首先在乎的是：

有没有几十或几百 MW 连续电力，以及每度电多少钱。

于是“东数西算”原本最难卖出去的资源突然和 AI 训练的物理需求高度匹配。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

## 真正推动机房往西走的，不是行政命令本身，而是一套非常具体的能耗配额机制

SemiAnalysis 这一段是整篇文章我认为最有价值的地方之一，因为它解释政策究竟怎样从文件变成真实资本开支。

在中国，数据中心拿到土地以后，需要向地方发改系统申请能耗审查。SemiAnalysis称，对年综合能耗超过一万吨标准煤、约对应 10MW 以上的项目，这一步事实上成为规模上限；没有通过审查，就不能合法开工。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

“东数西算”出现以后，发放能耗额度的政府部门同时又负责落实国家算力枢纽政策，于是一个非常有效的 transmission mechanism 出现了：

东部非指定区域越来越难拿增量能耗指标。

指定 hub 则更容易拿土地、电力、税收和审批。

这比单纯发布一份“鼓励西迁”的政策强得多，因为它直接决定项目能不能通电。

广东是 SemiAnalysis 用来说明这一点的典型。

广东一度停止给普通数据中心新增能耗额度，随后把主要增量集中到粤港澳大湾区“东数西算”节点韶关。国家发改委当年的官方批复也明确要求韶关承接广州、深圳的实时性算力需求，并把更适合迁移的计算向外转移。[国家发展和改革委员会](https://www.ndrc.gov.cn/xwdt/ztzl/ygadwqjs1/202203/t20220319_1319604_ext.html)

2023 年甚至出现一个非常戏剧性的案例。广东能源监管部门检查腾讯在清远的两个自建 campus 后发现，其中一个实际投入运行规模约为批复的 **13.9 倍**，另一个约为 **13 倍**，均被认定存在“批小建大”，并要求整改，供电规模原则上不能超过节能审查额度。[数据科技](https://www.dtdata.cn/news/show/1135.html)

SemiAnalysis由此认为，即便像 Tencent 这种超级平台，也越来越难绕开新的算力地理布局。

之后腾讯的增量建设更多进入韶关。

但文章特别强调，这不能只归因于行政压力，因为两个技术经济条件也发生了变化。

## 光纤把“西部太远”这个问题削弱了，而 AI 又让低电价的权重突然变大

韶关以前的劣势是离深圳和广州太远。

近几年当地投资约 **40 亿元人民币**建设高速网络，形成 13 条 400G 全光通道。SemiAnalysis给出的测量数据显示，韶关到广州单程时延约 **1.3ms**，到深圳约 **1.66ms**，到香港不到 3ms；当地还规划了深圳—广州—韶关空芯光纤路径，希望从 2027 年开始再把延迟降低约 30%。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

到了这个水平，一台韶关服务器对绝大多数 workload 来说已经可以非常接近“深圳服务器”。

但训练 workload 连这一点都不是特别在意。

它更在意电。

于是内蒙古变成 SemiAnalysis认为中国 AI 数据中心最重要的新区域之一。

文章把内蒙古比作东南亚的 Johor，也就是新加坡 hyperscaler 数据中心向外扩张后形成的巨大 AI 基建带。内蒙古拥有大规模可再生能源、土地，而且西部由独立于国家电网和南方电网的蒙西电网服务，拥有自己的电力交易与定价机制。SemiAnalysis称当地数据中心电价大致只有一线城市的一半。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

更重要的是，内蒙古的土地允许 developer 建造非常大的 greenfield campus。

在北京、上海、深圳周围，拿到几十公顷连续土地已经困难。

在西部，规划单位可以直接变成平方公里。

这非常适合未来 100MW、500MW 甚至 GW 级 AI clusters。

## 但“东数西算”也不是中央规划一张地图以后，每个节点就自动成功

SemiAnalysis 的数据其实给国家规划叙事加了一个很市场化的修正。

政策决定了大部分新增建设必须往哪些大区域流动，但 hyperscaler 最终仍然根据电价、网络和地理位置在这些区域之间做选择。

贵州贵安从很早开始就被定位为存储中心。冷数据不在乎距离，因此这里适合做大规模 storage，Apple 的中国 iCloud 基础设施就是著名 anchor tenant，Huawei 和 Tencent 也有自建 cluster。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

成都和重庆虽然也属于国家算力枢纽，却没有在这一轮 AI demand 中像内蒙古一样成为最大赢家。SemiAnalysis认为主要原因是电价和电网灵活性不如内蒙古。

与此同时，一个非常有意思的反例是山西。

山西并不在十大“东数西算”集群里面，但依靠便宜、丰富的煤电、离北京较近，以及 hyperscaler 很早就在当地落脚的 first-mover advantage，已经吸引 ByteDance、Baidu 和 JD 合计接近 **2GW** 的自建与租赁承诺。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

所以政策决定大方向。

**电子和地理条件仍然决定具体赢家。**

这是文章对中国式产业政策非常细腻的一点理解。

## 中国和美国 AI 数据中心最根本的区别，可能不是谁愿意花更多钱，而是谁被什么东西卡住

SemiAnalysis用一句非常有效的概括：

**美国现在主要是 power-gated，中国更多是 chip-gated。**

美国 hyperscaler 最大的现实困难越来越是电力。

utility interconnection queue 很长。

变压器和 switchgear 交期很长。

地方审批可能持续一年以上。

于是公司开始自己建燃气轮机、behind-the-meter power，甚至研究核电。

中国的情况并不是“电完全没有限制”，前面讲的能耗 quota 本身就说明资源仍需配置。但从全国层面看，发电、输电、建设劳动力和政府审批更容易被同时调动，大型数据中心被地方政府视为产业项目，因而设施本身通常不是最难获取的环节。

中国真正难以快速增加的是先进 accelerator。

这与美国出口限制直接相关。

所以两个国家面对的是近乎相反的问题：

美国往往是 **GPU 可以买，插头不够**。

中国则更接近 **机房和电可以建，最先进 GPU 不够**。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这个差别对理解未来 AI competition 极其重要，因为它意味着两边每增加一单位 compute 所需要解决的问题完全不同。

## 中国建一座 100MW AI 数据中心到底能有多快？SemiAnalysis 的答案是：常态已经压到大约一年

SemiAnalysis称，中国一座典型 **100MW 数据中心**的交付周期，已经从 cloud era 的约 18 个月压缩到 AI 时代约 **12 个月**，最先进项目甚至更快。

作为对照，它此前研究美国高度模块化的数据中心时发现，即使施工本身进入理想状态，也通常需要 12–18 个月，而且此前往往还有 **12–13 个月无法完全重叠的 permitting**。中国普通项目施工前审批更多在 3–6 个月，而指定“东数西算”区域甚至可以更快。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这并不是因为中国工人在工地上简单“干得更快”。

文章把真正原因放在 construction process。

首先，开发商会 **speculatively build**。

由于 ByteDance 等 hyperscaler 的招标开始要求 T+6 months 交付，IDC developer 不可能等订单签了才动工。于是大家会自己承担风险，提前建土建和 shell，真正的招标竞争发生时，各方比的是谁的半成品已经最接近 ready。

SemiAnalysis举例称，GDS 在 2025 年初拿到一个 **152MW AI mega-order** 时，客户要求六个月内交付，最后确实做到了。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这相当于把房地产开发模式变成库存模式。

以前是：

签客户 → 建楼。

现在越来越像：

先建半座楼 → 等客户 → 六个月交钥匙。

速度提高了，但开发商承担的 speculative capital risk 也明显增加。

## 西部大块土地又允许数据中心从“楼”退化成一个越来越像工业厂房的东西

东部城市周边因为土地昂贵，传统数据中心经常使用多层混凝土结构。

到内蒙古等 greenfield site 以后，完全没有必要再往上堆。

开发商越来越多使用低层、大跨度 steel hall。

钢结构在工厂制造的同时，现场可以做基础。

完成以后直接卡车运来，用吊机安装。

绝大部分混凝土只存在于地基，因此不需要每盖一层都等待混凝土达到强度。

SemiAnalysis展示的 VNET 乌兰察布项目，从裸地基到完整建筑基本可以在一个夏季到冬季之间完成。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

更极端的是 Tencent 的 T-Block。

大量电力、冷却与 IT infrastructure 都在工厂做成模块，到了现场以后再组合。某些设计里，“数据中心建筑”本身甚至已经退化成一块平整土地和一个简单钢壳。

Alibaba 的 CUBE 5.0 则把这种 manufacturing logic 进一步标准化。SemiAnalysis引用 Alibaba 的“100-day datacenter”流程：约 30 天工厂生产及现场准备、50 天现场安装、20 天 commissioning，从完成 shell 到服务器进场约一百天；如果从 ground-breaking 开始算，整个项目大约可以压到 **7–9 个月**。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这本质上是把数据中心从 construction product 变成 manufacturing product。

越多东西在工厂标准化生产，现场关键路径就越短。

## 但一个非常反直觉的地方是：中国反而没有把“全模块化集装箱机房”做到全国普及

如果模块越多越快，为什么不把所有数据中心都变成 Tencent T-Block？

SemiAnalysis给了两个很有中国特色的答案。

首先，西方 modularization 最大的经济价值之一，是绕开昂贵而稀缺的 electrician、pipefitter、HVAC technician 等 skilled trades。

中国现场施工劳动力更便宜、数量也更多，因此用钢结构加预制 MEP 已经能非常快。

把最后一部分也变成 container，并不能再节省特别多工期。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

第二个原因更加有意思：**银行抵押物价值。**

中国第三方 IDC developer 经常把数据中心资产抵押给银行获取贷款。

一栋设计寿命二十年的真正建筑，银行容易估值，也有较清晰的 residual value。

如果现场只是一排可以搬走的 container，在抵押估值里反而更差。

所以对于“借银行的钱建楼，再租给 ByteDance”的 colocation developer 来说，建一栋真正的楼有融资价值。

这说明数据中心 architecture 不只是工程问题。

**资本结构本身会反过来决定物理建筑长什么样。** [SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

## 整个中国 AI 数据中心 boom 最值得关注的人，其实不是 Alibaba，而是 ByteDance

SemiAnalysis估算，ByteDance 单独占据了中国已经交付数据中心容量的大约 **五分之一**，而且几乎全部是租赁容量。

这不是 ByteDance 自己公开披露的数据，因为公司仍然是私有企业，因此必须明确把它视为 SemiAnalysis building-level model 的估算，而不是审计财报数字。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

如果估算大体正确，它的意义非常大。

ByteDance 已经不是“中国某个大型 IDC 客户”。

它事实上是整个 wholesale colocation 行业最重要的价格和订单制定者之一。

SemiAnalysis称，ByteDance 和 Alibaba 每年都会释放 **GW 级别**的数据中心租赁需求，而 ByteDance 的需求最大，因此其 tender calendar 在很大程度上决定中国 wholesale operator 的 order book。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这种情况与美国不太一样。

美国最大的 hyperscaler——AWS、Google、Microsoft、Meta——都有详细季度披露。

中国最大的实际数据中心租户却没有 10-K。

这也解释了为什么此前海外机构对中国 AI infrastructure 的估计可以相差 **15 倍**：很多最重要的数据根本不在上市公司披露里。

## GDS 和 VNET 的财报甚至只能看见这个市场的一小部分

GDS 与 VNET 是美国上市市场最容易研究的两家中国 IDC landlord，因此很多投资者会下意识把它们当成中国整体数据中心市场的 proxy。

SemiAnalysis认为这是严重误导。

两家公司 2026 年上半年合计获得约 **1.3GW wholesale orders**，但按其模型，它们在 2024–2026 年至今获得的 ByteDance 与 Alibaba订单只占两家公司总需求的大约三分之一。换句话说，大量订单流向未在美国上市的国内运营商、地方平台和其他 infrastructure owners。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

VNET 的公开财报确实能够验证 AI wholesale demand 已经非常强。到 2026 年 6 月底，它的 wholesale in-service capacity 已达到 **1,007MW，同比增长 49.4%**；客户实际使用容量达到 744MW；仅二季度就从一个大型云客户拿到 **345MW** 新订单，上半年累计 wholesale order wins 达到 **862MW**。成熟 wholesale capacity 的利用率甚至达到 92.5%。[VNET Group, Inc.](https://ir.vnet.com/news-releases/news-release-details/vnet-reports-unaudited-second-quarter-2026-financial-results)

GDS 的二季度数据也显示类似方向。公司 committed 和 pre-committed area 同比增长 18.2%，整体 in-service utilization 达到 **79.2%**，管理层明确说今年订单承诺可能创历史纪录，而且主要由 AI demand 驱动。[GDS Holdings Ltd](https://investors.gds-services.com/zh-hant/node/12756)

所以“空置中国机房”与“GDS/VNET AI order boom”不是互相矛盾的两个故事。

它们描述的是两个不同 asset class。

## Alibaba、Tencent 和 Baidu 已经用现金流证明，这轮不是地产开发商单方面赌需求

SemiAnalysis 把真正的 inflection point 放在 2026 年第二季度。

Alibaba、Tencent 和 Baidu 三家公司合计 capex 大约 **200 亿美元，同比翻倍以上**，而且三家首次同时出现负自由现金流。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这个数字用公司自己的数据基本可以核对。

Alibaba June quarter capex 达到 **676.78 亿元人民币，约 99.75 亿美元，同比增长 75%**，公司明确说主要原因之一就是 AI infrastructure 和 compute capacity；该季度自由现金流流出 **446.7 亿元人民币**。[纳斯达克](https://www.nasdaq.com/press-release/alibaba-group-announces-june-quarter-2026-results-2026-08-20)

Tencent 二季度 capex 达到 **528 亿元人民币，同比增长 176%**。公司同时报告 **138 亿元人民币负自由现金流**，并明确表示其中存在大量与 Hunyuan 模型、WorkBuddy、CodeBuddy、微信 AI 以及云计算需求相关的 compute procurement prepayments。[雅虎财经](https://finance.yahoo.com/technology/ai/articles/tencent-announces-2026-second-quarter-102900627.html)

Baidu 二季度资本开支约 **113.9 亿元人民币**，自由现金流流出约 **79.5 亿元人民币**；与此同时，其 AI Cloud Infra 收入同比增长 50%，其中 GPU Cloud 收入同比增长 **283%**。[Baidu Inc](https://ir.baidu.com/news-releases/news-release-details/baidu-announces-second-quarter-2026-results)

也就是说，这轮数据中心需求不是 developer 在没有客户的情况下单纯盖楼。

最大的互联网公司自己也正在把现金流迅速转换成算力。

SemiAnalysis进一步估计，如果把没有公开 capex 数据的 ByteDance 算进去，ByteDance、Alibaba、Tencent、Baidu 四家的合计投入大约从 **2024 年的 350 亿美元**升至 **2025 年超过 500 亿美元**，2026 年正在朝 **1,000 亿美元**规模运行。后一个数字属于 SemiAnalysis 模型估算，尤其 ByteDance 部分无法像上市公司一样直接核验，因此不应把它当成财报事实。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

## 中国互联网本身已经接近成熟，AI 因而不只是新产品，而是这些公司的下一条资本开支曲线

文章把这轮 infrastructure boom 放进一个更大的商业背景。

中国互联网用户渗透率已经接近 80%，每年新增比例只剩约 1.5%。传统互联网增长引擎普遍进入个位数。

WeChat 2025 年 MAU 只增长约 2%。

Baidu 2025 年收入下降，其中在线广告下滑更明显。

Alibaba 最近一个季度 customer-management revenue 又同比下降。

Kuaishou 日活增长也只剩几个百分点。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

与此同时，中国云厂商还有一个美国 hyperscaler 没那么严重的问题：**可服务市场主要仍然在国内。**

AWS、Azure、Google Cloud 的收入有非常大比例来自美国以外。

Alibaba Cloud 已经是中国云厂商里最国际化的一家，但 SemiAnalysis估计其海外收入仍只有约 20%；运营商云则几乎完全是中国市场。

文章把这称作 addressable GDP 的差距。

因此对于 Alibaba、Tencent、Baidu、ByteDance 来说，AI 的战略意义不只是“不要错过下一项技术”。

传统消费互联网增长已经显著减速，AI可能是少数还能支撑下一轮两位数资本投入与收入增长的足够大市场。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

Alibaba 最新数据其实已经给这个 thesis 提供了早期支持：June quarter 的 AI Cloud and Compute Services 收入同比增长 **45%**，达到约 71 亿美元；公司称 AI-related revenue 已连续十二个季度保持三位数增长。[阿里巴巴集团](https://home.alibabagroup.com/en-US/document-2027233133950140416)

## 中国 hyperscaler 并没有统一选择“自己建”或“全部租”，而是形成了三套资本结构混合

SemiAnalysis区分了 leasing、self-build 和一种中国市场很常见的 **BOT-like hybrid structure**。

ByteDance目前最偏 leasing，因此是第三方 IDC 最大客户，但已经明显增加自己的 campus。

Alibaba、Tencent 和 Baidu 对战略核心设施更倾向自建，剩余需求再向外租。

Huawei因为自己的业务和供应链结构，倾向自己建设更多。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

最有意思的是中间形态。

在一些项目里，hyperscaler 拥有土地和 civil shell，但 colocation partner 负责出资、拥有并运营机械与电力系统，也就是 M&E layer，然后通过 **8–10 年服务合同**回收资本。

这样 hyperscaler 获得土地和项目控制权，却不用把所有基础设施 capex 都放在自己的资产负债表。

IDC partner 则得到长期合同，而不是承担完全开放的 merchant demand risk。

SemiAnalysis称 Alibaba、Tencent、Baidu 都在使用类似结构，Alibaba甚至会在同一个 cluster 里同时混用 self-build、BOT 和 wholesale lease。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这一点其实和美国最近大量出现的 AI 数据中心 SPV、JV 和 leaseback 有同一种经济逻辑：

**AI infrastructure 规模已经大到，即使最有钱的科技公司也开始把“谁拥有机房”与“谁使用算力”拆开。**

## 还有一个容易被忽略的外溢：这些中国 hyperscaler 不只在中国扩算力

SemiAnalysis预计，中国 hyperscaler 在中国大陆以外租赁的数据中心容量，会从 2026 年到 2029 年大约翻倍，接近 **4GW**。

而且这仍然低估实际海外 compute，因为这一统计不包括它们从 Oracle 等西方云厂商直接租用的大量 GPU。[SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)

这意味着在美国出口管制下，“中国 AI compute”不能简单理解为“中国境内安装了多少 accelerator”。

企业可以在新加坡、马来西亚、中东甚至西方 cloud 使用算力。

所以未来分析美中 AI infrastructure 时至少要同时看三个层次：

国内自建。

海外物理数据中心。

海外租赁 cloud compute。

只看中国海关 GPU进口数据会越来越不完整。

## 我的理解：这篇文章真正改变的是“中美 AI 基建差距应该怎么量”

下面是我的判断，不是 SemiAnalysis 的原文结论。

过去比较中美 AI 算力时，我认为市场过度依赖两个指标：

Nvidia高端 GPU 数量。

hyperscaler capex。

这两个指标当然仍然极其重要，但 SemiAnalysis 的数据让我觉得，还必须增加一个维度：

**把 accelerator 转化成可运行 MW 的速度和成本。**

美国在最先进 GPU、HBM、networking 和 frontier model 上仍然拥有明显优势。

但今天美国买到一批 Rubin 之后，可能需要等待：

utility interconnect。

substation。

transformer。

switchgear。

当地 permit。

甚至新 gas turbine。

中国的情况则接近反面。

国家电网建设能力、设备供应链、施工劳动力、土地审批和 factory-prefab ecosystem 使数据中心本体可以非常快完成。

真正卡住它的是 accelerator supply。

这意味着两国未来几年实际上在解两道不同的工程题。

美国必须把**能源系统的建设速度提高到半导体速度**。

中国必须把**半导体供应提高到基础设施速度**。

谁先解决自己的短板，可能比单纯比较谁今年多建了 5GW 更重要。

## 对投资而言，我认为这篇文章最值得重估的是 VNET/GDS、中国 hyperscaler，以及全球 AI infrastructure 供应链的区域差异

SemiAnalysis 的公开部分对 **VNET 和 GDS** 是明显利好的需求信号，却不是无条件 bullish。

利好来自 wholesale 需求非常真实，而且已经进入 GW 级；VNET 的成熟 wholesale capacity 利用率超过 90%，AI客户订单很强，GDS也预计今年签约创纪录。[VNET Group, Inc.](https://ir.vnet.com/news-releases/news-release-details/vnet-reports-unaudited-second-quarter-2026-financial-results)

风险则来自文章同时揭示的三个结构。

第一，中国 wholesale competition 极其激烈，租金已经经历过一次非常明显的 reset。

第二，ByteDance 等几个 hyperscaler 的需求占比异常大，因此 tenant concentration 很高。

第三，建设速度太快本身就意味着 supply response 很快。如果一个市场从发现需求到新增 100MW capacity 只需要一年，长期租金上涨空间天然不像美国那种 power-constrained market 那么容易维持。

所以我不会简单把“AI需求暴涨”翻译成“中国 IDC 租金必然暴涨”。

更可能是：

**量暴涨，单价竞争仍然激烈。**

这对 landlord 的资本回报和 hyperscaler 的算力成本是完全不同的结果。

对 Alibaba、Tencent 和 Baidu，这篇文章的意义则是另一面：2026 年资本开支已经真正进入美国 hyperscaler 式强度。Alibaba 一季度花近 100 亿美元 capex、Tencent单季超过 500 亿人民币，都说明中国大型互联网公司已经接受一个现实——未来增长必须先把自由现金流变成 compute。[纳斯达克](https://www.nasdaq.com/press-release/alibaba-group-announces-june-quarter-2026-results-2026-08-20)

短期这会压低 FCF。

长期能不能产生回报，则取决于 AI Cloud、广告、消费 AI、agent 和企业服务能不能把这些服务器变成收入。

这和两年前分析美国 MSFT、GOOGL、META 时的问题已经越来越相似。

## 更深一层，这篇文章其实说明“中国 AI 基建空置”这个叙事已经需要彻底拆成两句话

中国确实存在大量空的数据中心。

同时，中国也正在出现非常强的 AI 数据中心容量需求。

这两句话都是真的。

错误发生在把“data center”当成一种同质商品。

旧时代留下的 2kW retail rack，与为数万块 accelerator 服务的液冷 high-density wholesale hall，在经济意义上已经几乎不是同一类资产。

所以我认为这篇文章最值得保留的框架不是那个最吸睛的 **24GW**，而是：

**AI 正在对整个数据中心存量进行一次技术性的重新定价。**

有些旧容量即使免费也没有多少 AI价值。

有些位于内蒙古、过去被认为偏远的 capacity，却因为电便宜、光纤变快、土地充足和 AI training 对 latency 不敏感，突然变成最稀缺的生产资料。

这与美国现在发生的事情其实形成了非常漂亮的镜像。美国最珍贵的东西越来越不是一块 GPU，而是能够让那块 GPU 连续吃到电的一座 campus；中国最容易建设的是 campus，最珍贵的则是能够真正塞进去的先进 accelerator。

如果要从《The Chinese AI Infrastructure Boom》只记住一句话，我不会选择“中国有 24GW 数据中心”，而会选择一个更结构性的判断：

**美国的 AI factory 扩张正在被电网限制，中国的 AI factory 扩张正在被芯片限制。**

未来几年中美 AI 基建竞争的关键，很可能不是谁更愿意花钱，因为两边现在都已经愿意花极其惊人的钱；真正决定差距的是，**谁能够更快把自己最稀缺的那一层供应链解除约束。** [SemiAnalysis](https://newsletter.semianalysis.com/p/the-chinese-ai-infrastructure-boom)
