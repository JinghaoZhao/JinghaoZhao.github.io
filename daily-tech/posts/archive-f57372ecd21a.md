# 今日科技长文：AI 电力短缺，可能有一部分根本不是“缺电”，而是模型把现有电力算少了

今天推荐 SemiAnalysis 能源团队 Robert Boswall、Reyk Knuhtsen、Jeremie Eliahou Ontiveros、Oliver Kennon 与 Dylan Patel 于 **2026 年 8 月 16 日**发表的长篇研究 **《$12B of US ratepayers’ money wasted on a modeling mistake and PJM wants to do it again》**。文章属于 SemiAnalysis 订阅研究，部分内容公开。它不是一篇泛泛讨论“AI 数据中心让电网吃紧”的文章，而是团队用了大约半年时间，反向重建美国最大电力市场 PJM 的核心可靠性模型，然后提出一个非常具体、也很有争议的结论：**PJM 可能系统性低估了现有发电机组在冬季真正能够提供的可靠容量，进而把供需缺口算得过大，并使 2025/26、2026/27 两个容量拍卖周期多付了大约 120 亿美元。** [SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)

这篇特别值得今天读，是因为 AI 数据中心投资最近越来越被简化成一句话：“美国缺电，所以一切能发电的资产都值钱。”SemiAnalysis 提出的反例是，**电力短缺当然是真问题，但“系统模型如何定义一兆瓦可靠容量”本身也会创造或放大短缺。** 对数据中心、电力设备、天然气电厂乃至美国居民电价来说，这不是技术细节，而直接决定数十亿美元如何分配。

## PJM 到底是什么，为什么它算错一点就能影响几百亿美元

PJM Interconnection 是美国最大的区域电网运营机构之一，覆盖 13 个州和华盛顿特区，服务超过 **6700 万人**。它不仅负责实时电力市场，还运营一个非常重要的 **capacity market，也就是容量市场**。容量市场买的不是当天发出来的一度电，而是“未来系统最紧张的时候，你有没有能力提供电”。[PJM Inside Lines](https://insidelines.pjm.com/pjm-auction-procures-134479-mw-of-generation-resources/)

可以把它理解成电网提前购买保险。

假设 PJM 预计几年后夏季或冬季极端天气下最高需要 150GW，它不会只准备150GW，而是还要留出安全余量，因为有些电厂会故障、有些风电和太阳能当时可能出力不足。于是 PJM 建模计算一个可靠容量需求，然后举行年度 Base Residual Auction，让发电厂和 demand response 资源提交报价。

中标电厂即使当时没有真正发电，也会因为“保证需要时可以用”获得容量费。

因此，一旦模型认为可靠资源少了几个 GW，PJM 的需求曲线就会向右移动，需要买更多保险。

普通市场里多买 2% 商品，成本可能也只增加几个百分点。但 PJM 现在的问题是供应曲线非常紧，一点点额外需求可能直接把拍卖清算价格推到上限。因此，**几 GW 的建模误差不一定造成几 GW 对应的线性成本，而可能让几乎整个市场里的已存在发电厂都获得更高容量价格。**

这正是 SemiAnalysis 所说的 120 亿美元为什么可能出现。

## 事情的起点是 2024 年：PJM 换了一套更先进的可靠性模型

过去 PJM 主要使用一种叫 **EFORd（Equivalent Demand Forced Outage Rate）** 的方法。简单讲，就是估计不同类型电厂在系统需要它们时有多大概率故障，然后从装机容量里打折。

后来随着风电、太阳能、电池和天然气在不同季节表现越来越复杂，单纯用一个固定 outage rate 不够了，于是 PJM 转向更加复杂的 **ELCC（Effective Load Carrying Capability）** 框架。[PJM](https://www.pjm.com/planning/resource-adequacy-planning/effective-load-carrying-capability.aspx)

ELCC 的思想本身很合理。太阳能的一兆瓦铭牌容量显然不能被当成一兆瓦全天可靠容量；电池持续时间有限；天然气机组在极端天气也可能因为燃料供应或设备问题失效。因此，要通过大量小时级天气、负荷和机组可用率模拟，计算每类资产究竟给整个电网贡献多少“可靠性”。

SemiAnalysis 并不是批评 PJM 使用概率模型。

他们的指控反而是：**模型变得复杂以后，一些看似保守的输入假设产生了巨大的经济后果。**

为了验证这个问题，他们按照 PJM 发布的 Manual，把 Reserve Requirement Study 的逻辑重新写成代码，然后使用 PJM 自己公开的天气、需求和发电数据；对于 PJM 没有发布的部分，则主要使用美国 EIA 等公开代理数据。团队称，重建后的模型能够相当接近过去四次 PJM 官方拍卖的输出。[SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)

所以这篇研究的核心并不是“我们觉得 PJM 算错了”，而是他们试图重构整个计算过程，然后问：**如果改变两个物理上比较重要的假设，可靠容量会变化多少？**

## 最大的问题之一非常朴素：天气冷的时候，很多热力发电设备反而更能发电

这里是整篇最反直觉、也最容易理解的一点。

燃气轮机等热力发电机组的输出能力并不是全年固定的。空气越冷，空气密度通常越高，燃气轮机可以吸入更多质量的空气，因此在较冷环境下往往能够产生比夏季额定条件更高的功率。

换句话说，**同一台燃气轮机在炎热的 95°F 夏天下午和寒冷冬夜，最大可用输出不是同一个数字。**

但 SemiAnalysis 认为，PJM 当前可靠性模型在一些关键环节仍然使用基于夏季 capability 的上限，因此没有完全认可冬季由于冷空气产生的额外发电能力。

这并不是只有 SemiAnalysis 自己这么说。PJM 委托 E3 对 ELCC/RRS 方法进行评估时，E3 也专门指出，当前模型把 unlimited resources 的可用能力限制在 ICAP，会低估它们在非夏季、尤其寒冷天气下的潜在输出，并建议研究使用**季节性或者每日 capability rating**。[PJM](https://www.pjm.com/-/media/DotCom/committees-groups/task-forces/elccstf/2025/20251209/20251209-item-02---pjm-elcc-rrs-model-evaluation---e3-report.pdf)

PJM 自己过去也做过 sensitivity。

E3 报告记录，PJM 曾测试将冬季最大热力发电能力提高到所谓 “winter ICAP”。在一个用于观察理论上限的情景中，仅仅加入这种季节能力变化，就产生了大约 **8,561MW，也就是8.56GW 的额外冬季 thermal capability**。模型里的冬季 unserved energy 下降约 **33%**，所需 Installed Reserve Margin 降低约 **1.1 个百分点**。[PJM](https://www.pjm.com/-/media/DotCom/committees-groups/task-forces/elccstf/2025/20251209/20251209-item-02---pjm-elcc-rrs-model-evaluation---e3-report.pdf)

需要非常注意这里的限定：8.56GW 是一种 **upper-bound sensitivity**，并不是说 PJM 可以直接把8.56GW 全部当成无条件新增可靠容量。输电约束、区域 deliverability 等仍然需要验证。

但它至少说明一个重要事实：**冬季 capability 的处理不是几个百分点的小参数，而可能涉及多个 GW。**

## 第二个问题来自 Storm Elliott：PJM 可能把过去那场灾难重复计算进未来

2022 年圣诞节期间 Winter Storm Elliott 给美国东部电网造成严重冲击。极端低温下，大量发电设备无法正常运行，天然气供应也出现问题，PJM 一度进入紧急状态。

这场事件对之后的可靠性模型产生了非常大的影响，因为统计模型会自然认为：“我们已经观察到极寒天气下大量 thermal fleet 同时出问题，所以以后也应该假设这种风险。”

这个方向本身完全合理。

但问题是 Elliott 之后，很多机组做了 winterization、运行程序改进和设备升级。

SemiAnalysis 的论点是，PJM 的模型仍然过度依赖过去故障表现，却没有充分认可这些后续改善，因此一定程度上把 2022 年的系统脆弱性永久写进了未来容量需求。

他们分别模拟冬季 cold-air capability uplift 和 Elliott 后 weatherization 的影响。

对于 **2026/27** 拍卖，SemiAnalysis 估算，单独考虑 cold-air uplift 可以减少大约 **1.5GW**所需容量；仅仅给 post-Elliott weatherization 部分信用，在他们的一个保守情景中可以贡献约 **2.5GW**。因为两者存在重叠，不能简单相加，综合效果约 **3.1GW**。[SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)

因此，他们最终认为 PJM 对现有 reliable fleet 的低估数量级大致在 **4GW 左右**，具体数字随拍卖年度变化。

这就是标题里的“modeling mistake”。

## 四个 GW 听起来不大，为什么能变成 120 亿美元？

这是整篇最值得理解的电力市场机制。

假设 PJM 真正需要150GW，但模型计算成154GW。

直觉可能是：多买4GW而已，如果建设成本每GW几十亿美元，影响也就是若干十亿美元。

然而容量市场不是 PJM 自己去盖四座发电厂，而是通过一条需求曲线和一条供应报价曲线清算。

所有成功清算的容量通常都会受到最终市场 clearing price 影响。

当供应很多的时候，需求曲线左右移动几个GW，价格变化可能很小。

但当供应极端紧张时，需求曲线稍微往右移动，就可能跨过供应曲线上非常陡的一段，导致整个市场清算价大幅上升。

SemiAnalysis 重建过去拍卖的供需曲线，然后把其认为更准确的可靠性要求代入。

他们得到的结果非常夸张。

对于 **2025/26 delivery year**，更准确的建模理论上只会让 PJM 少采购约 **14MW，也就是0.014GW**，几乎可以忽略不计，但因为需求曲线位置改变，团队估算容量采购总成本可以减少约 **67 亿美元**。[SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)

听起来非常奇怪：怎么可能只少买14MW却省67亿美元？

原因就是 auction clearing mechanics。真正省下来的不是那14MW本身，而是需求曲线变化后，**大量本来就会中标的电厂拿到的统一容量价格下降了。**

对于 **2026/27**，SemiAnalysis估算改进模型可以减少约 **0.8GW**采购，同时节省约 **49 亿美元**。

两个年度合计，他们的 central estimate 约 **115.7亿美元**，文中通常概括成约120亿美元；根据参数敏感性，估算区间约为 **80亿至145亿美元**。[SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)

这不是一个已经由 PJM 或监管机构确认的“确切损失数字”，而是 **SemiAnalysis 根据自己重建模型得到的反事实估计**。这点必须区分清楚。

但至少 PJM 官方数据证实，近年容量市场价格确实发生了非常剧烈变化。例如 2026/27 auction 的全系统价格达到 **$329.17/MW-day**；2027/28 达到 **$333.44/MW-day**，并触及当时 FERC 批准的价格上限。[PJM Services](https://services.pjm.com/annualreport2025/markets/)

因此争论不是“容量价格有没有暴涨”，而是**其中究竟多少来自真实电力短缺，多少来自模型和市场设计。**

## 接下来的两次拍卖反而说明：美国确实也真的缺电

如果 SemiAnalysis 的文章只停在“PJM 算错了，所以根本没有电力短缺”，那反而会很可疑。

他们得到的结果实际上更复杂。

对于后面的 **2027/28 和 2028/29** 两次拍卖，即使把他们认为的模型错误修掉，拍卖价格仍然不会明显下降。

原因是供应已经紧张到另一种程度。

PJM 官方公布的 2027/28 拍卖最终采购134,479MW UCAP，加上 FRR 资源后总容量约145,777MW，但仍然比可靠性要求少大约 **6.6GW**。全系统价格触及 **$333.44/MW-day** 的行政上限。[PJM Inside Lines](https://insidelines.pjm.com/pjm-auction-procures-134479-mw-of-generation-resources/)

2028/29 的情况也类似。PJM 后续宣布，最新容量拍卖仍然出现大约 **6,831MW** 的缺口，并因此计划启动一个额外的 **Reliability Backstop Procurement**。[PJM Inside Lines](https://insidelines.pjm.com/pjm-reliability-backstop-proposal-outlines-steps-to-secure-new-supply-and-maintain-reliability/)

SemiAnalysis 的模型认为，如果修正他们指出的可靠容量问题，这个6.8GW缺口可能降到大约 **3GW**。

这非常关键。

他们没有说短缺消失。

而是说：

**真实短缺可能是3GW左右，但官方模型告诉市场的是接近7GW。**

这两者对于政策判断完全不同。

如果缺口真有7GW，你可能愿意以非常激进的价格签十几年新电厂合同。

如果真正缺口只有3GW，同样的紧急采购规模就可能产生大量过剩和不必要成本。

## 而 PJM 现在恰好准备做一轮非常昂贵的“紧急采购”

这就是 SemiAnalysis 为什么标题里写 “PJM wants to do it again”。

PJM 今年 7 月提出 **Reliability Backstop Procurement，RBP**，计划针对最新容量缺口额外采购资源。

PJM 官方文件显示，目前目标基于 **6,831MW** 短缺，而且合同期限最高可以达到 **15 年**；PJM 给出的 maximum willingness to pay 是按容量加权平均最高约 **$555/MW-day**。[PJM Inside Lines](https://insidelines.pjm.com/pjm-reliability-backstop-proposal-outlines-steps-to-secure-new-supply-and-maintain-reliability/)

这已经不是一年的临时保险。

如果按十几年期限签下大量新发电资产，就是长期把成本锁进居民和企业电费。

SemiAnalysis担心的核心是：**如果6.8GW这个缺口本身被可靠性模型高估，那么根据这个数字设计15年紧急合同，可能把一个建模偏差永久资本化。**

而且这种采购还有一个更微妙的问题。

通常新建电厂需要有长期购电协议、数据中心客户或市场价格预期，开发商承担项目需求风险。

RBP 则可能让 PJM ratepayers 承担更大一部分风险。

SemiAnalysis认为，如果以后数据中心增长没有完全兑现，或者已有机组真实可靠能力本来就更高，消费者仍可能为这些提前签下的长期容量付款。

这就是文章所说的 “ratepayers’ risk”。

## AI 数据中心在这里扮演了一个非常矛盾的角色

文章虽然是电网研究，但背后真正推动整个问题急剧恶化的变量之一，就是 AI 数据中心。

PJM 的负荷预测过去几年突然大幅提高，其中相当一部分来自 Virginia、Ohio、Pennsylvania 等地区的数据中心增长。

这使市场形成一个非常典型的反馈：

AI 公司和数据中心开发商宣布几 GW 甚至十几 GW 的新项目。

PJM 把其中一部分纳入未来负荷预测。

模型看到需求快速增长，同时又认为现有电厂可靠容量不足。

可靠性要求提高。

容量拍卖价格暴涨。

居民电费上涨。

政府和 PJM 担心政治压力以及可靠性风险，于是开始寻找快速建设新燃气电厂的办法。

而 SemiAnalysis 的问题是：**这条链条里，前两项本身已经包含很大的预测不确定性，如果再叠加对现有供给偏保守的建模，就会把一个真实问题放大成更严重的问题。**

这一点特别值得 AI 投资者注意。

我们经常把 hyperscaler 宣布的“10GW pipeline”当作电力需求的确定事实。

但数据中心项目存在很大的重复申报、排队、项目延期和最终取消概率。

如果电网一边把未来需求预测得很激进，一边对现有供给能力又非常保守，那么系统天然会得出“必须马上建设大量新发电”的答案。

这并不意味着答案一定错。

它意味着**预测误差本身具有明显的单向成本。**

## SemiAnalysis 对 PJM 更深的批评，其实不是一个参数，而是整个容量市场结构

文章最终把问题从 cold-air adjustment 扩展到 PJM 的制度设计。

他们认为 PJM 的 capacity market 具有一种“反增长”属性：一方面，需要通过容量价格鼓励新建电厂；另一方面，新电厂进入 PJM interconnection queue 的时间非常长，所以价格信号真正出现时，新 supply 根本来不及响应。

PJM 自己的 stakeholder 材料也体现了这个时序问题。

2027/28 的容量拍卖直到 **2025 年12月17日**才清算，而对应 delivery year 是2027年至2028年。PJM内部意见文件指出，对于大型发电项目而言，真正决定是否投资、订购设备的时间可能早在2023年；也就是说，高容量价格这个“请建设新供给”的市场信号，可能比实际投资决策点晚两年甚至三年。[PJM](https://www.pjm.com/-/media/DotCom/committees-groups/committees/mrc/2025/20251219-special/2027-2028-base-residual-auction-pjm-stakeholder-feedback-survey-responses-without-attribution-final.pdf)

这会形成一个荒诞循环。

缺电以后价格暴涨。

价格暴涨本来应该引来新电厂。

但新电厂想并网需要排很久。

所以在价格真正变高时，能够提供新 supply 的资产非常有限。

有限 supply 又使下一轮 auction 继续撞上价格上限。

然后监管者为了避免价格继续暴涨，加 cap。

但 cap 又削弱了新建电厂的长期价格信号。

最后，只能再推出一个行政式的 emergency procurement，用十几年合同直接拉项目进来。

SemiAnalysis认为，这说明真正需要改革的不是某一次 auction，而是整个资源充足性、并网和长期投资协调机制。

## 这篇文章最容易被误读的地方：它并没有证明“AI 电力危机是假的”

这一点我觉得尤其需要强调。

SemiAnalysis 的结论不是美国有大量隐藏电力，所以 AI 数据中心随便建都没问题。

PJM 官方最新拍卖即使考虑潜在 seasonal capability 改进，供给约束仍然非常真实。发电站退役、天然气供应、电网传输、变压器、interconnection queue 和快速增长的负荷都是真正瓶颈。PJM 自己也明确表示，价格上限只能控制价格波动，无法解决基本的供需失衡；真正解决方法仍然是增加资源或者减缓需求增长。[PJM Inside Lines](https://insidelines.pjm.com/the-capacity-auction-is-coming-heres-what-were-doing-now/)

SemiAnalysis真正提出的是另一个更细的判断：

**当系统已经非常紧的时候，一个只有几个百分点的建模误差，经济成本会被市场结构极度放大。**

4GW 对一个150GW级别的系统看起来只是几个百分点。

但在一个供应曲线接近垂直、auction price 已经撞 cap 的市场里，这几个百分点足以决定居民多付几十亿美元、政府是否启动紧急采购，以及新燃气电厂要不要签15年合同。

## 我的投资解读：AI 电力链下一阶段不能只看“GW 缺口”，要看这个 GW 是怎么计算出来的

下面是我的延伸判断，不是 SemiAnalysis 的原文结论。

过去一年 AI 电力投资非常容易形成一个简单逻辑：数据中心需求从几十 GW 增加到几百 GW，而发电建设需要很多年，所以天然气轮机、电力设备、储能、核电和独立电力生产商都长期供不应求。

大方向我仍然认为成立。

但这篇研究提醒一个很重要的风险：**“需要新增多少 GW”并不是一个纯物理数字，而是模型、规则和监管选择共同产生的数字。**

对于 VST、CEG、GEV、ETN、PWR、天然气 turbine chain 等电力相关投资，未来我会更加区分两类需求。

一类是物理需求，例如一个已经建成并有客户的500MW数据中心确实需要500MW电力，这很难被会计或模型消失。

另一类则是 **capacity adequacy demand**：系统为了保证极端天气可靠性，要额外采购多少备份容量。这个数字对ELCC、冬季 capability、load forecast、retirement assumption 和 reserve margin 方法都高度敏感。

后者同样会给发电企业带来真金白银，却带有更高政策风险。

如果未来 PJM 接受类似 E3 建议，把 winter capability 更精细地纳入模型，或者降低部分负荷预测，某些看起来非常巨大的容量短缺可能迅速缩小，而不是必须通过建设同等数量的新电厂来解决。E3 已经明确把 seasonal/daily capability ratings 列为潜在改进方向。[PJM](https://www.pjm.com/-/media/DotCom/committees-groups/task-forces/elccstf/2025/20251209/20251209-item-02---pjm-elcc-rrs-model-evaluation---e3-report.pdf)

更值得注意的是数据中心本身的选址逻辑。如果 PJM 因容量市场和行政结构造成电价持续高于其他区域，那么 hyperscalers 并不会无限承受这个成本。新增 AI workload 可以向 ERCOT、MISO、Southeast，甚至自备电源更多的园区移动。因此对数据中心而言，**可靠电力不仅是“有没有”的问题，还包括当地市场设计会让一兆瓦电最终贵到什么程度。**

这也是为什么我觉得这篇文章非常值得今天读。现在 AI 基建研究已经从“Nvidia 能生产多少 GPU”一路走到了“美国有多少发电厂”，但下一层可能更加难：**不是美国总共有多少 GW，而是电网的软件模型和市场规则认为这些 GW 中有多少真正算数。**

如果 SemiAnalysis 的核心估算大体成立，那么 AI 电力时代一个非常反直觉的事实是：美国下一批最便宜的“新电源”，可能有一部分根本不是新建电厂，而是**把已经存在的电厂更准确地算进去。** [SemiAnalysis](https://newsletter.semianalysis.com/p/12b-of-us-ratepayers-money-wasted)
