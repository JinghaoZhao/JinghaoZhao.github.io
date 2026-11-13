今天推荐 **Ryan McMorrow、Michelle Chan 和 Michael Taffe 于 2026 年 9 月 20 日在《Financial Times》发表的《Big Tech uses guarantees to keep $300bn of AI exposure off balance sheets》**。这是付费文章，FT 需要订阅才能阅读全文；[阅读 FT 原文](https://www.ft.com/content/7f11afae-c4e3-4054-a65b-873f3647f563)。我今天选它，是因为过去两年大家一直盯着 GPU 出货、数据中心 GW 数量和 hyperscaler capex，却很少认真看**这些资产究竟是谁掏钱、债务记在谁的账上、AI 泡沫如果反转又是谁承担残值风险**。FT 的核心发现是，过去约一年里，大型科技公司已经为 AI 数据中心和芯片融资提供了最高约 **3,000 亿美元的各种担保与信用支持**，但其中很大部分并不是这些公司的传统资产负债表债务，而是通过 SPV、租赁、backstop 和 residual-value guarantee 等结构存在。报道作者确认为 Ryan McMorrow、Michelle Chan 和 Michael Taffe。[黑峰金融集团](https://blacksummitfg.com/geopolitics-and-the-day-after-31/)

这里先强调一个很重要的限定：这并不是“科技公司偷偷藏了 3,000 亿美元债务”。这些安排通常有公开披露，而且 headline 中的 **exposure** 也不等于今天已经欠下并必须偿还的 debt。很多金额只是最大潜在责任，只有租户违约、租约不续、数据中心或 GPU 的转售价值跌到约定水平以下等条件出现时，才会真正转化成现金损失。真正值得关注的是另一件事：**AI 基建风险正在从企业资产负债表上的直接债务，迁移到财报脚注中的长期租约、VIE、信用衍生品和残值担保。** [证监会](https://www.sec.gov/Archives/edgar/data/1326801/000162828026050705/meta-20260630.htm)

由于原文受版权保护，下面不会按 FT 的段落逐句替换，而是沿着报道提出的问题，用公司最新 SEC 文件和评级机构材料把这套融资机器拆开。这实际上比单纯重述文章更有用，因为几笔最夸张的数字现在已经能从 Meta、Alphabet、Broadcom 和 Nvidia 自己的文件中直接核对。

## 为什么 AI 数据中心突然需要一种新的金融工程

AI 基建早期的资本流向很简单。微软、Meta、Google 或 Amazon 需要更多算力，就花自己的现金建设数据中心、买服务器和 GPU，支出进入 capex，资产进入 property and equipment，融资需要时再由母公司发行债券。问题是，当单个 campus 从几十亿美元扩大到数百亿美元，甚至规划到数 GW 电力规模，这种方式开始大量占用公司现金流和债务容量。

因此现在出现了另一种结构。一个单独设立的 SPV 或合资公司拥有数据中心，基础设施基金、保险公司、private credit 或债券投资者提供资金；科技公司自己可能只持有少数股权，同时承诺未来租用数据中心。如果仅靠租约还不足以让债权人愿意提供极低成本的资金，科技公司再加上一层 credit support：如果未来租约终止，而资产只能以低于某个约定价值出售，公司负责补足一部分差额。[KBRA](https://www.kbra.com/publications/RPXWSDPR/kbra-releases-research-ai-credit-ai-compute-infrastructure-cross-sector-credit-considerations-for-gpu-tpu-and-accelerator-intensive-assets?format=web)

这就是 **residual value guarantee，残值担保**。它并不等于“Meta 借了 280 亿美元”，而更像 Meta 告诉债权人：“你们可以借钱给这个独立项目；如果十几年以后我不再租，而整个设施的市场价值不够高，我会在合同规定范围内替你们补一部分残值缺口。”

对债权人而言，这使一个原本高度依赖单一 AI 租户的项目，突然获得了接近大型科技公司信用质量的保护。FT 报道称，这类项目的融资成本有时只比担保公司的自身公司债高约 100–150 个基点，因此科技公司可以用自己的信用，而不是直接用自己的资本，撬动几十亿美元甚至上百亿美元的外部资金。[Dealroom](https://dealroom.co/news/other-1ouosib-big-tech-uses-guarantees-to-keep-300bn-of-ai-exposure-off-balance-sheets/)

经济上的好处显而易见：同样一张大型科技公司的资产负债表，可以同时支持更多数据中心建设。真正的问题是，**资本离开了资产负债表，风险有没有真的离开？**

答案是：没有，只是风险形态变了。

## Meta 的 Hyperion，是理解这套模式最好的样本

Meta 与 Blue Owl 的 Hyperion 数据中心合资项目，把整个结构展示得非常清楚。Blue Owl 管理的基金拥有 JV 的 80%，Meta 只保留 20%；双方最初预计为数据中心建筑以及长期电力、冷却和网络基础设施投入大约 **270 亿美元**。Meta 把土地和在建工程贡献给 JV，Blue Owl 提供资本，项目再通过债券市场融资，Meta 最终租回整个 campus。[AtMeta](https://investor.atmeta.com/investor-news/press-release-details/2025/Meta-Announces-Joint-Venture-with-Funds-Managed-by-Blue-Owl-Capital-to-Develop-Hyperion-Data-Center/)

关键在租约结构。Meta 并没有简单签一个不可撤销二十年的传统租约，而是获得较短初始期限以及继续续租的选择权，使公司在 AI 架构发生巨大变化时保留灵活性。但给 Meta 的 optionality，意味着投资人必须承担一个风险：几年以后 Meta 如果不续租，这座为 Meta 特别设计的数据中心值多少钱？

于是 Meta 又提供了一项持续最初十六年的 residual-value guarantee。其最新 SEC 文件显示，Hyperion 的 RVG threshold 总额大约 **280 亿美元**，并随着时间下降。如果 Meta 决定终止或不续租，而当时数据中心公平价值低于约定阈值，Meta 最多需要补偿两者之间的差额。公司截至最近披露时认为触发付款“不太可能”，因此并没有把这 280 亿美元作为传统负债计入资产负债表。[证监会](https://www.sec.gov/Archives/edgar/data/1326801/000162828026050705/meta-20260630.htm)

这最后一句尤其关键。

**最大合同风险约 280 亿美元，不等于会计负债 280 亿美元。**

会计要估计真正需要付款的概率和当前公允价值。如果管理层认为 Meta 会持续租用，或者即使 Meta 退出，设施仍然可以找到其他用户，那么预期损失可能很小，于是账面 liability 也可以很小甚至为零。

在正常情况下，这完全合理。

如果这座数据中心十年以后依然供不应求，Meta 自己仍然需要它，RVG 就只是一份从来不会触发的保险。

真正危险的是一种高度相关的 downside scenario：Meta 不再需要如此多容量，很可能恰恰意味着整个 AI 数据中心市场都出现过剩；这时想找其他租户更困难，资产价格也可能正在下降，于是保证残值的合同反而最容易变成真实负债。

因此 RVG 有一个金融上很重要的特点：

**它可能在最坏的时候变得最值钱——对债权人最值钱，对担保者最昂贵。**

## Meta 已经把 Hyperion 从一次性交易变成了模板

今年 7 月，Meta 又与 BlackRock 为德州 El Paso 数据中心设计了几乎同样的结构。BlackRock 管理的基金持有 80%，Meta 持有 20%；项目总开发成本约 **140 亿美元**，其中约 **125 亿美元**计划通过债务融资。Meta 将租用全部 campus，初始租期仍然只有四年，但可以多次续约，总使用期最长达到二十年。[AtMeta](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Announces-New-Strategic-Venture-with-BlackRock-to-Develop-Data-Center-in-El-Paso/default.aspx)

为了让外部资本愿意接受这种短初始租期，Meta再次提供 residual-value guarantee。这次 RVG threshold 大约 **130 亿美元**，同样会随时间下降；在前十六年满足特定条件时，如果资产公平价值低于保证水平，Meta负责补差价。[AtMeta](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Announces-New-Strategic-Venture-with-BlackRock-to-Develop-Data-Center-in-El-Paso/default.aspx)

这说明 Hyperion 已经不是一个奇怪的孤立融资技巧。

Meta 正在建立一种新的 AI infrastructure capital model：

Meta 提供需求。

Meta 提供技术和建设能力。

外部资金拥有绝大部分资产。

Meta 保留较低直接所有权。

然后用自身信用保证项目尾部风险。

这样它可以比完全用 corporate balance sheet 建设更快地扩展 AI infrastructure，同时保留更多现金、债务空间和战略灵活性。

从公司财务角度，它其实是在把 Meta 的**信用评级本身变成生产资料**。

## Alphabet 的披露甚至更能说明传统资产负债表已经开始看不全 AI 风险

Alphabet 的数字非常值得认真看。

2025 年底，公司为数据中心相关支付义务提供的 credit-derivative notional 大约是 **169.4 亿美元**。到 2026 年 6 月 30 日，只过了半年，这个数字已经升到 **437.85 亿美元**。[证监会](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm)

但资产负债表里对应的 credit-derivative liability 只有 **8.15 亿美元**。

换句话说，最大潜在信用暴露是 437.85 亿美元，而当前按公允价值估计的实际负债只有不到 2%。这并不意味着 Alphabet 在“作弊”；它反映的只是两种完全不同的量：一个是最坏情况下的 notional，另一个是今天市场条件和违约概率下的预期价值。[证监会](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm)

Alphabet还披露，截至 6 月底另有 **76 亿美元**金融担保，以及已经签署但尚待数据中心提供商最终确定条款的额外 **241 亿美元未来 backstops**。如果把这些都只看成公司传统 debt，你会完全错过它们。[证监会](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm)

而且这只是融资支持的一部分。Alphabet 同期披露的 material purchase commitments and other contractual obligations 已经达到 **8,110 亿美元**，其中大量与技术基础设施、长期供应、内容以及能源协议有关。另一项披露显示，固定或保证的长期 contractual commitments 为 **7,070 亿美元**，绝大部分是长期供应协议。[证监会](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm)

这并不代表 Google “欠了八千亿美元”。

但它告诉投资者一个非常重要的事实：

**AI 扩张的资本承诺正在越来越多地发生在传统净债务指标之外。**

## Broadcom 的结构更有意思，因为它把芯片供应商变成了金融担保人

Broadcom 最新 10-Q 披露，公司安排一个金融合作伙伴购买基于 Broadcom 定制 AI accelerator 的整套 AI racks，然后将这些机器通过五年期租赁提供给一个客户。FT 将这个客户识别为 Anthropic；Broadcom 的 SEC 文件本身没有在这一段直接点名客户。[金融时报](https://www.ft.com/content/7f11afae-c4e3-4054-a65b-873f3647f563)

为了让融资方愿意买这些 racks，Broadcom 对租赁义务提供 backstop。

在客户违约的情况下，Broadcom 的潜在责任不是全部 lease balance，而是大致等于未偿租赁 backstop 的 **85% 与当时这些 AI racks 出售价值之间的差额**。公司还可以选择接手租约、按约定条件把 racks 转售给供应商，或者另外寻找买家，以减少损失。[证监会](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/R17.htm)

如果全部 AI racks 都完成部署，Broadcom 的最大未折现潜在 backstop liability 大约是 **290 亿美元**。

但 Broadcom 同时说，目前这一 backstop 的 fair value **并不重大**，而且截至披露时没有支付过任何款项。[证监会](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/avgo-20260802.htm)

更值得注意的是，同一套安排里，该客户在满足条件并需要资金时，还可能向 Broadcom发行总本金最高 **420 亿美元的可转换本票**，资金只能用于履行相关租约义务；截至 8 月 2 日尚未发行任何这类票据。[证监会](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/R17.htm)

这已经不再是过去那个非常纯粹的半导体商业模式：

Broadcom 设计芯片。

客户买芯片。

Broadcom确认收入。

交易结束。

现在更像：

Broadcom 设计芯片。

金融机构出钱买设备。

客户租设备。

Broadcom为客户的部分信用风险和设备残值提供支持。

必要时甚至可能进一步向客户提供融资工具。

**芯片供应商开始参与制造芯片需求的金融条件。**

## Nvidia 把这种逻辑推到了完全不同的规模：1050 亿美元

整篇 FT 报道中最值得警惕也最容易误解的数字，是 Nvidia 的 **1,050 亿美元**。

8 月 17 日，Nvidia 正式向 SEC 提交 8-K，披露与 SoftBank 旗下 SB Energy 的合作。SB Energy 正在俄亥俄 Pike County 建设 PORTS Technology Campus，OpenAI 将成为租户，而 Nvidia 为第一阶段约 **4.25GW IT load** 的租赁安排提供 residual-value guarantees。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)

这不是媒体估算。Nvidia 自己的 SEC 文件明确写道：针对第一阶段协议，Nvidia 的累计 payment obligation **上限为 1,050 亿美元**。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)

但理解这个数字时必须把合同细节全部带上，否则会严重误导。

担保并不是今天立即生效的 1,050 亿美元债务。各阶段要等建筑完成并达到 ready-for-service 条件以后才开始生效，首批预计从 2028 年起；OpenAI 正常支付租金后，Nvidia 的风险会下降。担保只覆盖定义好的租赁和电力付款部分，而不是整个项目的所有成本。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)

真正触发 Nvidia付款的核心情况，是 OpenAI 因破产导致 lease default，或者没有按租约支付款项。

发生这种情况以后，Nvidia可以选择自己接管租约，也可以要求房东重新出租、出售设施，或者采取其他处置方式；Nvidia负责的是约定最低价值与最终回收价值之间的缺口。OpenAI又承诺，如果 Nvidia 因担保实际付钱，要向 Nvidia 偿还并赔偿这些金额。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)

因此 1,050 亿美元不是 Nvidia 对 OpenAI“无条件送出的信用额度”。

但这里有一个明显的经济现实：如果 OpenAI已经破产或严重违约，那时 OpenAI对 Nvidia 的 indemnity 本身值多少钱，就会成为另一个信用风险问题。

## Nvidia 为什么愿意承担这种风险？因为担保买来的并不只是利息收入，而是 GPU 需求

Nvidia 这笔交易有一个非常关键的附带条件：PORTS campus 的相关容量将部署 **Nvidia full-stack DSX AI factory platform**，只有有限例外。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)

这一下就让整个交易逻辑变得非常清楚。

Nvidia 用信用能力帮助数据中心获得便宜融资。

融资让 SB Energy 更容易建成几 GW 数据中心。

数据中心存在以后，OpenAI才能部署更多 compute。

而里面部署的主要又是 Nvidia infrastructure。

所以对 Nvidia 来说，这实际上是一种新型 **vendor financing**。

公司不是简单等待客户自己筹到一百亿美元然后购买 GPU，而是开始主动解决客户最大的几个瓶颈：

土地。

电力。

建筑。

资本。

Nvidia 最新 10-Q 甚至直接承认这些要素已经是影响 GPU 销售的重要约束；截至 7 月 26 日，公司自身 supply and capacity commitments 已经从前一个季度的 1,190 亿美元增加到 **2,790 亿美元**。[证监会](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm)

因此 Nvidia 今天真正卖的已经不只是 GPU。

它越来越像是在帮助客户把**电、土地、资本和 GPU 打包成一个可融资的 AI factory**。

## 评级机构并没有真的假装 1050 亿美元不存在

这一点非常重要，因为“off balance sheet”很容易让人联想到 2000 年代的一些财务丑闻。

现实更加细腻。

S&P 在 Nvidia 宣布俄亥俄项目后仍维持其 **AA 信用评级**，但并没有简单忽略 1,050 亿美元担保。S&P按照自己估计的 stressed property recovery value，把担保的一部分视为 debt-like adjustment。其估算是，相关 debt adjustment 在 2028 年约为 **42 亿美元**，到 2031 年峰值达到约 **377 亿美元**，随后再按计划下降。[Investing.com UK](https://uk.investing.com/news/stock-market-news/sp-affirms-nvidia-rating-at-aa-on-ohio-campus-guarantee-93CH-4837467)

也就是说，S&P 的分析逻辑是：

不能把 1,050 亿美元全部当成 Nvidia debt，因为数据中心不是价值为零。

但也不能因为会计上没有把全部金额记入负债，就假设风险为零。

真正要估算的是：

**担保值 − stressed collateral recovery。**

这可能是投资者理解所有这些结构时最重要的一条原则。

## 数据中心还有残值，GPU 的残值问题则更加危险

KBRA今年专门研究 AI compute financing 时指出，真正重要的不是 GPU 五年以后“还能不能开机”，而是它五年以后还有没有足够高的 **economic value**。[KBRA](https://www.kbra.com/publications/KNzgvHxx/kbra-releases-research-ai-compute-financings-evaluating-re-leasing-risk-for-gpus-and-tpus?format=web)

这两个概念差别巨大。

一块 2026 年 GPU 在 2031 年大概率依然可以运行。

但如果到时新的 Rubin 后继架构每瓦性能高五倍、HBM 大很多、interconnect 完全不同，那么旧 GPU 也许技术寿命还有五年，经济寿命却已经结束。

AI hardware financing 因此比传统房地产贷款多了一层独特风险。

一个普通 warehouse 十年以后可能仍然是 warehouse。

一个 2026 年 AI rack 十年以后，可能在 inference cost 上完全无法竞争。

于是 lender 在做五年或十年 financing 时，并不是只问：

设备是否还能使用？

而是必须问：

还有谁愿意租？

用什么价格租？

电费占 token cost 的多少？

换代需要更换 rack 还是整个 cooling/power architecture？

这正是 KBRA 认为 AI compute residual value 特别难评估的原因。[KBRA](https://www.kbra.com/publications/RPXWSDPR/kbra-releases-research-ai-credit-ai-compute-infrastructure-cross-sector-credit-considerations-for-gpu-tpu-and-accelerator-intensive-assets?format=web)

## 这解释了为什么 FT 的 3000 亿美元不能简单加起来当成“下一场次贷”

FT 对公开交易的梳理得出，大型科技公司过去一年左右为 AI infrastructure 提供的 guarantee / credit support 最高约 **3,000 亿美元**；报道还援引 Morgan Stanley 的更广义统计，称若把不同类型的 off-balance-sheet commitments 和 credit support 一起计算，七家大型 hyperscaler 和芯片公司的数字超过 **3.1 万亿美元**。[Dealroom](https://dealroom.co/news/other-1ouosib-big-tech-uses-guarantees-to-keep-300bn-of-ai-exposure-off-balance-sheets/)

但这两个数字都不能直接理解成“市场已经借了这么多危险债务”。

其中混合了不同性质、不同期限和不同触发条件的合同。

有的是租赁 residual guarantee。

有的是 credit derivative。

有的是客户 lease backstop。

有的是购买承诺。

有的是能源 take-or-pay。

有的是只有未来特定条件满足才生效的支持。

把它们简单全部算成 corporate debt 会严重夸大风险。

但反过来，只看 balance-sheet debt 又会严重低估整个 AI build-out 的经济承诺。

因此 FT 文章真正应该改变投资者的，是**分析单位**。

未来研究 hyperscaler 时，只看 capex、net cash 和 free cash flow 已经不够了。

你还要读 Note 里的：

guarantees。

credit derivatives。

VIEs。

uncommenced leases。

purchase commitments。

backstops。

residual-value guarantees。

因为越来越大比例的 AI factory 正藏在这些项目里，而不是传统 PP&E 行里。

## 这套结构在牛市里极其有效，在熊市里却可能具有明显的顺周期性

只要 AI compute 需求一直大于供应，这套模式几乎是完美金融工程。

数据中心建好以后很抢手。

OpenAI、Anthropic、Meta 或 Google持续需要容量。

GPU转售价值很高。

租户续约。

担保从来不会触发。

外部投资人赚稳定基础设施收益。

科技公司则不用一次花掉全部 capex。

这可以明显提高 AI 基建扩张速度。

问题是，这几项变量不是彼此独立的。

如果 AI 应用的收入增长突然明显低于预期，首先发生的可能是企业削减 compute 采购。

compute 租赁价格下降。

Neocloud revenue 减弱。

新数据中心 occupancy 下降。

旧 GPU residual value 下跌。

融资机构开始提高利率。

与此同时，作为租户的 AI 公司信用风险也会增加。

也就是说：

**tenant default risk、GPU residual-value risk 和 data-center vacancy risk 很可能在同一宏观状态下同时恶化。**

这正是 guarantee 最值得担心的地方。

平时看起来 liability 几乎为零。

一旦出现问题，却可能几个条件一起变化。

金融工程把风险向未来移动了，却没有让系统风险消失。

## 对 Nvidia 来说，这代表一次非常重要的商业模式变化

下面开始是我的延伸判断，而不是 FT 的原文结论。

我认为投资者目前对 Nvidia最大的低估，不是少算了 Rubin 销量，而是没有充分意识到 Nvidia 正在从**设备供应商变成 AI 资本形成体系的一部分**。

传统 Nvidia 的质量非常高：

客户自己融资。

客户自己建设数据中心。

Nvidia卖 GPU。

收到钱。

风险主要是 inventory 和 cyclicality。

现在 Nvidia 开始：

投资 AI 公司。

签 cloud commitments。

提供 residual-value guarantees。

帮助获取土地和电力。

帮助 data-center developer 获得 financing。

再确保设施使用 Nvidia stack。

这会极大增强 Nvidia 的 ecosystem moat，因为竞争者不仅需要做出同样快的芯片，还要复制 Nvidia 的 software、networking、customer relationships，以及越来越重要的**balance-sheet capacity**。

但同时，它也改变 Nvidia 的风险特征。

如果这种模式持续扩大，公司以后不再完全是“无资产风险地卖 GPU”。

它会越来越多承担 customers、AI-cloud operators 和 AI infrastructure 的尾部风险。

这一点不会马上破坏 Nvidia 的高利润模型，但如果未来几年的 guarantee 和 financing commitments继续以今天的速度增长，我会开始把 **adjusted credit exposure / FCF** 当成 NVDA 必须跟踪的新指标。

## 对 Broadcom、Meta 和 Alphabet，读财报的方法也需要改变

对于 AVGO，这个 290 亿美元 AI-rack backstop 特别值得关注，因为 Broadcom 过去的投资逻辑通常集中在 custom accelerator revenue 和 VMware cash flow。现在它已经证明，为了让一个超大型 AI 客户部署 custom silicon，Broadcom愿意把自己的信用能力一起投入交易。

这实际上是一种非常 bullish、同时也增加尾部风险的信号。

Bullish 的部分在于：客户需求大到需要创新融资才能买下这么多硬件。

风险部分则在于：Broadcom未来的 AI revenue 越依赖这些融资结构，客户集中度与信用风险就越不能只从 revenue concentration 看。

对于 META 和 GOOGL，我反而不会把 off-balance financing 本身理解成明显 bearish。

这些公司现金流巨大、信用极强，而 infrastructure fund 的资本成本正在接受它们的 credit support。让 BlackRock、Blue Owl、PIMCO 等资金参与建设，可能是非常合理的资本配置。

真正需要比较的是：

它们通过 SPV 节省了多少资本成本与财务灵活性，

换来了多少 contingent liability。

只要前者远大于后者，这就是好的金融工程。

## 更深的意义：AI boom 已经从“科技投资周期”升级成了一个完整的信用周期

我认为这篇 FT 报道最重要的意义，是它告诉我们 AI 基建已经跨过了一个阶段。

最初 AI boom 的主要资金来源是科技公司自己的 free cash flow。

于是投资者只需要问：

Microsoft今年 capex 多少？

Meta一年买多少 GPU？

Google现金流够不够？

现在规模已经大到，单靠 Big Tech 的现金流和传统公司债已经不够高效了。

资本市场开始把 AI compute 证券化。

基础设施基金拥有数据中心。

SPV发行债券。

Private credit购买贷款。

芯片供应商提供 backstop。

hyperscaler签租约。

评级机构计算 collateral recovery。

保险公司、养老基金和债券投资者开始间接持有 AI compute risk。

这意味着 AI 已经不是一个单纯的科技股资本开支周期，而正在形成一个真正的**信用生态系统**。

这既是 AI boom 成熟的标志，也是必须开始更认真看风险的标志。

从投资角度，我不会因为这篇文章立即减持 Nvidia、Broadcom、Meta 或 Alphabet。恰恰相反，这种融资能力说明市场仍然愿意以非常低的资本成本支持 AI infrastructure，而且这些公司的信用强度本身正在成为竞争优势。但我会改变观察方式：以后不能只问“今年 capex 是多少”，而要问 **公司为整个 AI ecosystem 承诺了多少信用、什么条件下会触发、担保资产的真实残值是多少，以及 stress case 下谁最终承担损失**。

如果几年后 AI demand 持续爆发，这些 guarantee 可能永远只是脚注，甚至会被证明是 AI 时代极其聪明的资本配置；但如果 AI infrastructure 真正出现一次严重过剩周期，那么今天这些脚注可能会突然变成最重要的财务报表项目。

这也是我认为《Big Tech uses guarantees to keep $300bn of AI exposure off balance sheets》比又一篇“AI capex 达到多少万亿美元”的文章更值得读的地方：**下一阶段真正需要理解的不只是 AI 有多少算力，而是谁在为这些算力融资，以及当它们不再值今天预期的价格时，谁最终必须付钱。** [金融时报](https://www.ft.com/content/7f11afae-c4e3-4054-a65b-873f3647f563)
