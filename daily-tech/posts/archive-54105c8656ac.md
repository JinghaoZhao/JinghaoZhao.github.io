可以把 PJM 理解成一个**不拥有电厂、不拥有大部分电网资产、不直接卖电给居民，但负责调度电网、设计批发电力市场、清算巨额电力交易的“电力交易所 + 系统调度员 + 可靠性规划机构”**。它的正式身份是 regional transmission organization，也就是 RTO。PJM 覆盖美国东部和中西部 13 个州以及华盛顿特区，为超过 6700 万人管理高压电网可靠性和批发电力市场。FERC 对 PJM 的批发市场和 tariff 进行监管，而居民最终交的零售电价通常仍由州公用事业监管机构、市政机构或合作社董事会管理。[PJM](https://www.pjm.com/en/about-pjm/who-we-are/)

## PJM 自己的“商业模式”：不是卖电套利，而是按成本收管理费

PJM 本身不是 Constellation、Vistra、Duke、Exelon 那种发电或公用事业公司。它不是靠低价买电、高价卖电来赚钱，也不应该因为容量价格上涨而像电厂那样赚暴利。PJM 和它负责结算的子公司 PJM Settlement 都受 FERC 监管，它们的行政成本主要通过 Open Access Transmission Tariff 中的固定长期费率向成员回收，收费依据是成员在 PJM 系统中的活动量。PJM 自己的说明也强调，如果某些 tariff 费率收入超过实际相关费用，而且既定储备金已经满足要求，超收部分会按规则返还。[PJM Learning Center](https://learn.pjm.com/who-is-pjm/how-does-pjm-make-money.aspx)

所以，PJM 的“商业模式”更接近**成本回收型公共市场基础设施**，不是普通营利性平台。它收的是管理这个巨大市场和电网调度系统的行政费用；真正的大钱，是它清算的批发电力市场、容量市场、辅助服务市场和输电相关成本。这些钱主要在发电商、负荷服务商、输电业主、需求响应资源、储能、电力零售商和最终消费者之间流动，PJM 负责规则、调度、结算和可靠性规划。FERC 官方也把 PJM 的市场概括为 energy、capacity 和 ancillary services 三大类。[Federal Energy Regulatory Commission](https://www.ferc.gov/industries-data/electric/electric-power-markets/pjm)

## PJM 这套系统里有哪些角色

在 PJM 里面，发电商拥有电厂，比如天然气电厂、核电、煤电、风电、太阳能、电池等；输电业主拥有高压线路和变电站；负荷服务实体，也就是 LSE，代表用户购买电力和容量；居民、企业和数据中心最终消耗电力；需求响应资源则通过在紧急时刻减少用电来提供“虚拟发电能力”；储能既可以充电用电，也可以放电供电。PJM 站在中间做调度和清算，不直接拥有这些商业资产。[Federal Energy Regulatory Commission](https://www.ferc.gov/introductory-guide-participation-pjm-processes)

可以把它想成航空系统。航空公司拥有飞机，机场拥有跑道，乘客买票，监管机构制定安全规则，而空管系统负责让所有飞机按安全顺序起降。PJM 更像空管和市场清算系统，而不是飞机或乘客本身。

## 第一层市场：能源市场，买的是“今天实际发出来的电”

PJM 最基础的市场是 energy market，也就是电能市场。这个市场解决的是最直接的问题：明天、今天、此时此刻，到底让哪些电厂发电，发多少电，电从哪里流到哪里，价格是多少。

PJM 的能源市场分为 day-ahead 和 real-time。Day-ahead 市场在前一天根据负荷预测、发电报价、输电约束和备用需求，先做一次财务上有约束力的计划；real-time 市场则根据当天实际负荷、实际电厂状态和实际电网拥堵情况不断重新调度。PJM 的学习材料把它描述为类似股票市场的批发电力市场：发电商卖电，公用事业或电力供应商买电，当供需匹配时市场清算，最后一个需要被调用的资源价格会影响批发电价。[PJM Learning Center](https://learn.pjm.com/who-is-pjm.aspx)

这里有一个非常关键的概念叫 LMP，locational marginal price，也就是节点边际电价。电不是像云服务一样可以随便从任何地方瞬间搬到任何地方，输电线路会拥堵，也会有损耗。因此，同一小时、同一个 PJM 系统里，不同地点的电价可以不同。如果北边电厂便宜但输电线路堵住，南边负荷中心可能需要调用更贵的本地电厂，于是当地 LMP 就会更高。PJM 的能源市场本质上是在物理电网约束下，寻找最低成本、可行、可靠的发电组合。

能源市场回答的是：“现在实际要用多少电，哪台机组最便宜、最可靠地发出来？”

## 第二层市场：辅助服务市场，买的是“系统稳定性”

电网不能只满足平均用电，还必须每一秒保持频率、电压和备用能力。负荷突然增加、某台电厂跳闸、风电突然下降，系统都需要快速响应。因此 PJM 还运营 regulation、reserve 等辅助服务市场。FERC 对 PJM 的概括也把 ancillary services 与 energy、capacity 并列为 PJM 市场组成部分。[Federal Energy Regulatory Commission](https://www.ferc.gov/industries-data/electric/electric-power-markets/pjm)

这部分可以理解成电网的“刹车、方向盘和安全气囊”。能源市场买的是正常开车时的汽油，辅助服务买的是让车不失控的实时调节能力。

## 第三层市场：容量市场，买的不是电，而是“未来能不能顶得住最坏时刻”

你现在看的 SemiAnalysis 文章，核心争议主要不在能源市场，而在 PJM 的 capacity market，也就是容量市场。容量市场买的不是今天真实发出来的一度电，而是未来某个交付年度里，系统最紧张时你是否有能力提供电力或减少负荷。

PJM 的容量市场叫 Reliability Pricing Model，简称 RPM。FERC 的介绍说，PJM 容量市场通常提前三年采购资源，目标是保证长期电网可靠性；主要拍卖叫 Base Residual Auction，后面还会有 incremental auctions 在交付年临近时调整。PJM 自己的学习材料也说，RPM 通过竞争性拍卖，在电力真正需要前大约三年采购足够资源，以满足预测需求。[Federal Energy Regulatory Commission](https://www.ferc.gov/introductory-guide-participation-pjm-processes)

容量市场的逻辑是这样的：如果只靠实时电价，很多电厂可能一年里只在极端天气的几十小时才真正有用。平时电价不高，它们赚不到足够钱维持存在；但一旦这些电厂退役，极端天气时系统就可能不够用。容量市场就是给这些“平时不一定常发电、但关键时刻必须存在”的资源付一笔固定费用。作为交换，它们承诺在未来交付年度里保持可用，在紧急时刻履约。

所以，容量市场回答的是：“三年后极端高峰时，我们有没有足够资源，不至于停电？”

## 一个容量资源怎么从“装机容量”变成“可拍卖容量”

这是理解那篇 SemiAnalysis 文章的关键。

一台 100MW 电厂，不等于 PJM 可以把它当成 100MW 可靠容量。因为它可能故障，可能燃料不足，可能受天气影响，也可能在输电上送不到真正需要的地区。因此 PJM 使用 UCAP，也就是 unforced capacity，来表示打折后的可靠容量。PJM 的术语表把 BRA 定义为提前三年采购 UCAP，以满足 LSE 的可靠性要求。[PJM](https://www.pjm.com/Glossary.aspx?p=1)

对于传统火电，以前常用的思路是基于故障率打折。比如一台 100MW 机组历史上在需要时有 5% forced outage risk，那它的可用容量可能接近 95MW。对于风电、太阳能、电池和其他出力随天气或持续时间变化的资源，问题更复杂，所以 PJM 引入 ELCC，也就是 Effective Load Carrying Capability。PJM 的 ELCC 页面说明，这套机制用于确定不同资源的容量贡献；Manual 18 也已经把 ELCC class ratings 和 accredited UCAP factors 放入容量市场流程。[PJM](https://www.pjm.com/planning/resource-adequacy-planning/effective-load-carrying-capability.aspx)

ELCC 的直觉是：不要问“这个资源名义装机是多少”，而要问“把这个资源加入系统后，在同样可靠性水平下，系统能多承担多少负荷”。一块太阳能在夏天下午可能非常有用，但晚上峰值时贡献很低；一块四小时电池在短时峰值中很有价值，但如果极端天气持续几天，它的可靠性贡献会下降；一台燃气机组平时看似稳定，但如果极寒天气里天然气供应受限，它的可靠性也要被打折。

SemiAnalysis 文章争的就是这一步：**现有热力机组到底应该被 PJM 算成多少可靠容量？**

## BRA 拍卖到底怎么跑

PJM 每年会先做负荷预测，估计未来交付年度的峰值负荷。现在数据中心增长很快，尤其是北弗吉尼亚、俄亥俄、宾州等地区，负荷预测的上修会直接推高未来容量需求。然后 PJM 会根据可靠性标准计算需要多少 reserve margin，也就是不只满足预测峰值，还要多准备一层安全垫。PJM 2025 年年度报告就提到，2027/2028 交付年度维持 14.4% reserve margin，并且容量市场用于反映满足可靠性标准所需资源的边际价值。[PJM Services](https://services.pjm.com/annualreport2025/markets/)

接下来，PJM 会形成一条需求曲线，叫 VRR Curve，也就是 Variable Resource Requirement Curve。它不是简单说“必须买 140GW，多一兆瓦都不要”，而是随着采购量变化给出不同 willingness to pay。系统越缺容量，愿意支付的价格越高；容量越充足，价格越低。

供给侧则是各种资源把自己可提供的 accredited UCAP 拿出来报价。核电、燃气电厂、煤电、风电、太阳能、电池、需求响应都可以在不同规则下参与。PJM 还要考虑 locational deliverability，也就是容量不只要在整个 PJM 区域存在，还要能够通过输电网络送到需要的地区。因此 PJM 会划分一些 Locational Deliverability Areas，某些拥堵区域会有自己的容量价格。PJM 的规划页面也说明，PJM 每年会为 BRA 做负荷可交付性研究，并计算 CETL/CETO 等指标来判断不同地区容量传输能力。[PJM](https://www.pjm.com/planning/analysis)

最后，供给曲线和需求曲线相交，得到清算价格。资源如果中标，就获得容量承诺和容量收入；LSE 则承担容量成本，之后通过批发供电合同和零售电价传导给居民、商业用户和数据中心。

## 容量费怎么流到居民账单

容量市场里，发电厂拿到的是 $/MW-day 的容量收入。比如某个资源中标 100MW，价格是 $300/MW-day，它每天理论上会拿 100 × 300 美元，按交付年度结算。负荷服务实体，也就是供应居民和企业用电的 LSE，需要支付这些容量费用，因为它们代表负荷承担可靠性义务。PJM 的 billing guide 也说明，RPM 相关资源 make-whole 和容量价格相关费用会分配给对应 LDA 里的 LSE。[PJM](https://www.pjm.com/markets-and-operations/billing-settlements-and-credit/guide-to-billing.aspx)

这些 LSE 最终通常会把批发电力成本、容量成本、输电成本和其他费用传给客户。FERC 的介绍也指出，零售公用事业的费率由州监管机构、市政或合作社机构监管。也就是说，PJM 不直接向你家收“容量费”，但 PJM 容量拍卖价格会上游进入 BGE、PECO、Dominion、AEP、PSEG 等区域的供电成本，再变成居民电费的一部分。[Federal Energy Regulatory Commission](https://www.ferc.gov/introductory-guide-participation-pjm-processes)

这就是为什么 SemiAnalysis 说 “ratepayers’ money”。不是说居民直接登录 PJM 交钱，而是 PJM 容量市场清算价格变高以后，最终买单的大概率是电力用户。

## 为什么几个 GW 的模型误差能变成几十亿美元

容量市场最容易误解的一点是：成本不是“多买了几 GW × 每 GW 成本”这么简单。

因为容量市场通常是统一清算价格机制。需求曲线和供给曲线相交后，价格会影响大量已经中标的容量。假设 PJM 一年清算大约 130GW 容量，如果市场价格因为模型假设改变而整体高出 $100/MW-day，那么一年成本大约就是 47.45 亿美元。这个数量级来自简单计算：100 × 130,000 × 365 / 10 亿。

所以，如果一个模型假设让 PJM 认为“可靠资源少了 3GW”或“可靠性需求多了 3GW”，它不只是改变那 3GW 的边际采购，还可能把整个 130GW 以上市场的清算价抬高。PJM 最新几轮容量拍卖已经非常紧，2027/2028 BRA 全系统价格达到 FERC 批准的 $333.44/MW-day cap，并清算 134,478.1MW UCAP；PJM 新闻稿也说 2027/2028 BRA 采购 134,479MW UCAP，价格达到 $333.44/MW-day。[PJM](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf)

当市场处在价格上限附近时，需求或供给的小变化会被放大。你可以把它想成雨天打车：平时多一个乘客少一个乘客不会改变全城价格；但高峰暴雨时，供给已经紧到爆，一个小变化就会触发 surge pricing。

## SemiAnalysis 文章里的“建模错误”具体卡在哪里

文章背景里的关键争议，集中在 PJM 对现有 thermal fleet 的可靠容量认定。

第一处是冬季能力。许多热力发电机，尤其燃气轮机，在冷空气中可能拥有比夏季额定条件更高的出力能力。直觉上，空气更冷、更密，同一台燃机能吸入更多空气，实际最大功率可能比炎热夏天更高。如果 PJM 的容量模型仍然用夏季 capability 或 ICAP 作为某些环节的上限，就可能低估冬季极端时刻 existing thermal fleet 能提供多少电。

这并不是 SemiAnalysis 完全孤立的说法。PJM 委托 E3 评估 ELCC/RRS 方法时，E3 也指出，把 unlimited resources 的可用能力限制在 ICAP 会低估它们在非夏季、尤其寒冷天气下的潜在输出，并建议研究使用 seasonal 或 daily capability ratings。E3 报告还记录过一种 upper-bound sensitivity：如果把冬季 thermal capability 提到 winter ICAP，可能增加约 8,561MW 的冬季 thermal capability，并使冬季 unserved energy 降低约 33%，所需 Installed Reserve Margin 降低约 1.1 个百分点。[PJM](https://www.pjm.com/-/media/DotCom/committees-groups/task-forces/elccstf/2025/20251209/20251209-item-02---pjm-elcc-rrs-model-evaluation---e3-report.pdf)

第二处是 Winter Storm Elliott 后的可靠性假设。2022 年 Elliott 是一次真实的系统压力事件，很多发电资源在极寒中出问题。因此，PJM 把这类风险纳入模型完全合理。但 SemiAnalysis 的批评是，如果后续机组已经进行 weatherization 和运行改进，模型却仍然过度使用 Elliott 时的故障表现，就可能把一次历史灾难中的脆弱性永久写进未来容量需求。

这两点合起来，就会影响“PJM 到底认为现有机组能提供多少可靠 UCAP”。如果现有机组被低估，供给曲线相当于向左移动；如果可靠性需求被高估，需求曲线相当于向右移动。两者都会抬高容量价格。

## PJM 为什么需要容量市场，而不是只让电价涨到足够高

理论上，完全靠能源市场也可以激励发电。系统缺电时实时电价暴涨，电厂赚到足够的钱，自然愿意留下或新建。这叫 energy-only market，ERCOT 更接近这个方向。

PJM 选择容量市场，是因为它希望提前几年保证资源充足，而不是等到停电风险逼近时才让实时价格暴涨。容量市场让电厂提前拿到一部分固定收入，也让系统提前知道三年后大概有哪些资源会留下。FERC 对 PJM RPM 的解释也强调，其目标是提前采购，以确保长期可靠性。[Federal Energy Regulatory Commission](https://www.ferc.gov/introductory-guide-participation-pjm-processes)

问题在于，容量市场是一套行政和模型驱动很强的制度。它需要预测三年后负荷，需要给每类资源打可靠性折扣，需要定义 reserve margin，需要设定需求曲线，需要考虑输电约束。每一个环节都有合理性，但每一个环节也会引入模型风险。

所以，容量市场的优点是提前买保险；缺点是保险金额、保险价格和风险概率都由复杂模型决定。

## 为什么 AI 数据中心让 PJM 问题突然变得尖锐

过去 PJM 的负荷增长相对缓慢，模型即使有偏差，影响可能也没那么剧烈。现在数据中心让未来负荷预测突然上修，容量市场就进入高度敏感区。

如果 Virginia 或 Ohio 报上来大量数据中心 interconnection request，PJM 必须判断这些负荷有多少会真的建成、有多少会延期、有多少是重复排队、有多少需要系统供电、有多少会自备电源。只要预测稍微激进，可靠性需求就会上升。

与此同时，发电侧新增资源并网很慢，老电厂退役又在继续。PJM 2025 年年度报告提到，2026/2027 BRA 采购的容量加上 Fixed Resource Requirement 区域资源后，仍比可靠性要求少 6,517MW，这是 RPM 2007 年创建以来首次未满足可靠性要求，原因是预测需求增长继续超过新增发电资源。[PJM Services](https://services.pjm.com/annualreport2025/markets/)

当需求预测上修、供给新增缓慢、容量价格触顶时，任何关于现有资源可靠性的模型处理都会变得非常值钱。把现有电厂多算 3GW 或少算 3GW，原本只是技术细节；在今天的 PJM，它会变成数十亿美元级的电费问题。

## 这篇文章要补充理解的核心：PJM 不是“错了就赚更多钱”，而是“模型错了会让市场把钱重新分配”

很重要的一点是，不要把这个问题理解成 PJM 自己通过模型错误赚了 120 亿美元。PJM 本身是成本回收型 RTO，不是容量价格上涨的直接利润受益者。受益的是容量市场中收取高价容量费的资源所有者，尤其是已经存在、边际成本没有同步上升、但因为系统短缺而获得更高容量收入的电厂。买单的是 LSE，最终大概率传导给居民和企业用户。

因此，更准确的说法是：如果 SemiAnalysis 的判断成立，那不是 PJM 在商业上“套利”，而是 PJM 的可靠性模型和市场设计可能把一部分消费者资金转移给了容量资源所有者，而且规模很大。

这也是为什么这个问题政治性很强。发电商会说，高容量价格是缺电和可靠性风险的真实信号，需要给新建资源足够激励；消费者代表会说，模型过于保守和市场结构过于陡峭，导致 ratepayers 支付了过高保险费；数据中心会说，它们带来经济增长但也被指责推高电价；州政府则要面对居民账单上涨。

## 放回投资框架：PJM 容量市场本质上是 AI 电力链的“价格放大器”

从投资角度，我会把 PJM 分成两件事看。

第一件事是物理世界的电力供需。AI 数据中心确实需要电，变压器、燃气轮机、输电、变电站和可调度容量确实紧张。这是实体约束。

第二件事是市场规则对这些约束的金融放大。PJM 容量市场会把“未来某个极端小时是否够电”转化成今天的 $/MW-day 容量价格。一旦可靠性模型或负荷预测让系统显示短缺，整个容量价格会跳升，并让现有电厂获得更高现金流。

所以，对 VST、CEG、PJM 区域 IPP、天然气电厂、电力设备链和数据中心运营商来说，PJM 的容量市场不是背景噪音，而是影响现金流、投资回报和居民反弹的重要机制。未来你看 AI 电力链，不能只问“美国缺多少 GW”，还要问：这些 GW 在哪个 RTO？那个 RTO 有没有容量市场？容量 accreditation 怎么算？ELCC 怎么处理？冬季能力有没有被认可？数据中心负荷是否已经进入预测？价格是否撞 cap？新增资源并网需要几年？

一句话总结：**PJM 是一个受监管的电网调度和批发市场平台；它自己不靠电价暴涨赚钱，但它的容量市场会把模型里的几个 GW 差异，放大成发电商、数据中心、公用事业和普通居民之间数十亿美元的利益再分配。**
