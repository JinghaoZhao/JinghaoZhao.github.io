# 今日科技长文：Google 正在把 AI 算力变成一种新的“金融资产”

今天推荐 Ryan McMorrow 发表在《Financial Times》的 **《Inside Google’s $200bn Wall Street finance machine for Anthropic》**，发布时间为 **2026 年 8 月 3 日**，属于 FT 付费内容。它是过去两周里我认为最值得读的一篇 AI 基建文章，因为重点既不是 Anthropic 的模型能力，也不是 Google Cloud 的传统竞争，而是解释了一个正在悄悄改变 AI 行业的问题：**当训练和运行模型需要数千亿美元硬件与数据中心时，到底是谁出这笔钱、谁承担风险，以及 AI 芯片如何逐渐变成类似飞机、房地产和基础设施一样可以被金融化的资产。** FT 的调查显示，Google 围绕 Anthropic 组织起来的芯片、数据中心和融资合同总规模约 **2000 亿美元**，其中超过 **1500 亿美元**与 TPU 供应有关。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这篇文章值得特别注意还有一个原因：Anthropic 此前已经承诺未来五年向 Google Cloud 采购约 **2000 亿美元**的云和芯片服务，而这一单一客户的承诺可能占 Google 当时披露云业务合同 backlog 的 40% 以上。与此同时，Google 还计划最多向 Anthropic 投资 **400 亿美元**。因此，这不是普通的供应商和客户关系，而是 Google 同时扮演投资者、芯片供应商、云平台、融资组织者和部分信用担保人的复杂生态。[Reuters](https://www.reuters.com/business/anthropic-commits-spending-200-billion-googles-cloud-chips-information-reports-2026-05-05/)

## 问题首先来自一个简单事实：AI 芯片实在太贵了

FT 的叙事从 Google 自研 TPU 开始。Google 与 Broadcom 从 2016 年起共同开发 TPU，这些芯片长期主要供 Google 自己的数据中心使用，但随着 AI 算力需求爆发，Google 开始更积极地向外部客户提供 TPU，希望形成 Nvidia GPU 之外真正有规模的替代体系。Google 并不是一颗颗卖芯片，而是把成千上万颗 TPU 和网络设备连接成大型计算系统，也就是 TPU pods。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

Anthropic 对这些系统的需求已经大到传统采购模式很难承受。FT 报道称，整个融资体系涉及大约 **2000 亿美元合同**，其中约五分之四与芯片相关。这意味着问题已经不再是“一家 AI 公司买服务器”，而接近大型航空公司购买整支飞机机队，甚至国家级基础设施建设的资本规模。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

真正麻烦的地方在于，参与者都愿意参与这场 AI 建设，却没有人愿意独自把几十甚至上百亿美元芯片长期放在自己的资产负债表里。Google 自己已经在进行创纪录的资本开支，不希望进一步承担全部 TPU 融资；Broadcom 可以承接芯片采购，但同样不希望自己变成一家大型设备融资公司。于是，真正的创新开始从半导体工程转向金融工程。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

## Google 把“买 TPU”改造成了类似航空公司租飞机的模式

Morgan Stanley 帮助设计了一个非常关键的结构：设立由外部资本支持的特殊目的融资载体，让这个 SPV 先购买 TPU，再把芯片租赁给 Anthropic。它本质上借鉴了 Boeing 和 GE 等公司过去为航空公司提供飞机、发动机融资的方法，也就是 vendor financing。供应商不要求客户一次性花几十亿美元购买资产，而是通过银行、债券和租赁市场把巨额资本支出摊开。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

2026 年 6 月，第一批大规模交易已经走完这个流程。一个名为 **Compute SPV** 的特殊目的载体支付约 **350 亿美元**，购买大约 **1GW** 的 TPU 计算设备。FT 报道称，这相当于大约 **100 万颗 TPU**。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

350 亿美元并不是 Anthropic 自己拿现金支付。SPV 通过三层债务筹资，而 Apollo 和 Blackstone 是主要资金提供方。Anthropic 随后按租赁协议使用这些 TPU，并逐步支付租金。这样一来，本来应该出现在 Anthropic 或 Google 资产负债表上的巨额硬件投资，被拆分到了私人信贷和外部投资者手中。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

但金融机构愿不愿意借钱，关键仍然取决于一个问题：**如果 Anthropic 有一天付不起租金，价值数百亿美元的二手 TPU 到底值多少钱？**

普通飞机有成熟的二手市场。一家航空公司破产后，出租方可以把 Boeing 737 收回来租给另一家公司。但前沿 AI 芯片没有成熟二手市场，而且硬件迭代速度极快，三四年后的 TPU 到底值多少，很难预测。因此，单纯拿 TPU 当抵押物，投资者不会愿意提供如此低成本的大规模资金。[LinkedIn](https://www.linkedin.com/posts/aditya-vaibhav-pandey_inside-googles-200bn-wall-street-finance-activity-7490324285819994112-C2dY)

## Broadcom 实际上给 TPU 的“二手残值”做了保险

解决办法是所谓 **residual value support**。Broadcom 承诺，如果 Anthropic 停止付款，而 SPV 出售 TPU 后收回的钱又不足以偿还高级债权人，Broadcom会补足部分缺口。第一笔 350 亿美元融资中，大约 **300 亿美元**获得这种残值支持。随着 Anthropic不断支付租金，Broadcom需要承担的潜在风险会逐渐下降。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这个结构非常重要，因为它实际上创造了一个此前并不存在的东西：**TPU 的金融可融资性。**

银行和私人信贷机构不需要准确预测五年后二手 TPU 能卖多少钱，只需要评估 Broadcom 是否有能力履行担保。因此，信用分析的一部分从“这颗芯片未来值多少钱”，变成了“Broadcom 的资产负债表有多可靠”。

而这第一笔 350 亿美元并不是一次性实验。2026 年 4 月，Google 又同意向 Broadcom 提供另外 **3.5GW TPU 硬件**，最终供 Anthropic 使用。Broadcom 的公司披露显示，对应的采购承诺约 **1280 亿美元**，其中约 **552 亿美元**计划在 2027 财年交付，另外约 **729 亿美元**计划在 2028 财年交付。熟悉交易安排的人士告诉 FT，这些承诺几乎全部与上述 3.5GW TPU 采购相关。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

也就是说，350 亿美元 Compute SPV 更像是模板。一旦这个融资模式被证明可以运行，同样的结构就可能继续为之后上千亿美元的 TPU 采购提供资金。

## 芯片有了，但更难的问题是：这些 TPU 放在哪里？

Google 很快遇到第二个瓶颈。筹钱购买 TPU 只是解决了一半问题，数百万颗芯片必须放进已经有电的数据中心，而数据中心建设速度无法单纯靠增加资金来无限加快。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这也是文章最有意思的转折之一。Google 开始发现，美国大量加密货币矿商恰好拥有 AI 行业最缺的资源：**已经拿到电力接入的土地和基础设施。**

比特币矿场过去需要大量廉价电力，因此很多矿商已经提前拿到了输电接入、土地和部分基础设施。AI 数据中心浪潮出现后，这些资产突然变得非常值钱。Google 与这些矿商合作，把原本服务加密货币计算的 powered sites 改造成 TPU 数据中心。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

TeraWulf 是最早的案例之一。公司计划在纽约州北部的园区增加大约 **360MW** 数据中心容量，用于承载 Anthropic 使用的 TPU。Google 对相关租赁支付提供担保，而 Morgan Stanley 随后把项目包装成建设融资，帮助项目在 2025 年 10 月筹集大约 **32 亿美元**。作为提供信用支持的交换条件，Google 获得了价格极低的 warrants，从而拥有获得 TeraWulf 股权的机会。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这种模式随后迅速复制到 Cipher Digital、Hut 8 等原本以加密挖矿业务为主的公司。FT 确认的五个项目合计约 **1.4GW** 电力容量，在 Google 信用担保支持下筹集约 **150 亿美元债务**。熟悉相关安排的人士称，Google 实际已经为 **10 个开发项目、合计约 2.4GW TPU 电力容量**提供不同形式的 backstop。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

Google 因此承担了真正的尾部风险。如果这些租赁全部出问题，它的潜在担保责任可能达到约 **440 亿美元**。但 Google 当前在资产负债表上给这些担保确认的负债只有约 **8.15 亿美元**，反映的是会计上根据违约概率等因素估算的当前价值，而不是最极端情况下的名义敞口。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

Google 还有一个潜在选择：如果 Anthropic 无法继续租赁某些设施，它自己可以接过这些数据中心和 TPU 容量。对于普通金融机构而言，AI 数据中心可能是特殊用途资产；但对于 Google 来说，它本身就是全球最大的算力消费者之一，因此这些资产的回收价值明显更高。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

## 真正成为瓶颈的已经不是钱，而是电

截至 FT 报道时，Google 及合作伙伴仍在寻找足够的数据中心容量，最终需要容纳约 **4.5GW** 已经签约的 TPU 硬件。Google 参与项目的高管告诉 FT，公司现在在这个问题上花了大量时间，而重点就是寻找电力。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这其实揭示了 AI 基建周期的一次重要变化。早期最稀缺的是 Nvidia GPU；随后芯片供给逐渐增加，限制开始转向数据中心；当资本市场又开始帮助解决数据中心融资时，最难快速制造出来的资源进一步向上游移动到**电网连接、变电站和已经拿到 interconnection 的 powered land**。

钱可以买服务器，也可以买土地，但钱不能立即让一个新的几百 MW 输电连接从审批队列里出现。这也是为什么此前做比特币挖矿的公司突然可能拥有非常有价值的战略资产。

## Google 的资产负债表正在直接降低 AI 数据中心成本

Google 的参与还产生了一个非常现实的竞争优势：**融资利率下降。**

Jefferies 的分析显示，到 2026 年春季，由 Google 提供信用支持的数据中心项目，其借款利率中位数约为 **7.1%**；而围绕 Nvidia GPU 建设数据中心的 neocloud 运营商，相应融资成本约为 **9.3%**。两者相差约 **220 个基点**。Jefferies 把这种差距称为 Nvidia 生态部分运营商面临的“结构性资本成本劣势”。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这意味着未来 AI 基础设施竞争不再只是比较哪颗芯片 benchmark 更高。

假设两个数据中心的硬件性能相近，一个项目因为背后有 Alphabet 信用支持而能以 7.1% 借钱，另一个需要支付9.3%，在几十亿美元、甚至几百亿美元项目和多年期限下，融资成本差异最终会变成巨大的 TCO 差异。

因此 Google 与 Nvidia 之间的竞争正在出现一个过去讨论较少的维度：**balance sheet as a competitive weapon。**

Google 不只是提供 TPU。它可以利用自己数万亿美元规模企业的信用，为整个产业链降低资本成本。Broadcom同样可以用自己的资产负债表为芯片残值提供支持。Apollo、Blackstone和其他私人信贷投资者则负责把这些信用最终转换成资金。

## 这套结构真正令人不安的地方，是所有道路最后都通向 Anthropic 的现金流

FT 没有把文章写成对金融创新的单向赞美。整张网络最大的风险其实非常直观：大约 **2000 亿美元合同最终高度依赖 Anthropic 能否持续产生足够现金流，支付芯片和数据中心租金。** [Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

目前 Claude 的需求增长非常快，这也是 Anthropic不断扩充算力的原因。公司除了 Google TPU，还同时使用 Amazon Trainium 和 Nvidia GPU，并且签署了多笔大型算力合同。Reuters 今年 5 月报道，Anthropic 的五年 Google Cloud 和芯片采购承诺约为2000 亿美元；Anthropic 和 OpenAI 的合同合计已经占 AWS、Azure 和 Google Cloud 等大型云厂商约 **2 万亿美元 backlog 的一半以上**。[Reuters](https://www.reuters.com/business/anthropic-commits-spending-200-billion-googles-cloud-chips-information-reports-2026-05-05/)

问题因此并不只是 Anthropic。如果把视角放大，会发现全球 AI 基建投资最终高度集中在少数几个 hyperscaler 和 frontier labs 身上。Jefferies 分析师 Jonathan Petersen 对 FT 的概括很准确：这些企业下面已经建立起一个庞大的产业体系；一旦它们降低投资意愿，整个体系都会随之减速。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

这个风险最近又进一步显现。8 月 5 日，FT 报道银行准备把与 Anthropic 德州 Hubbard 数据中心相关的约 **150 亿美元债务**转售给债券投资者，从而释放银行自身的 AI 融资额度。该数据中心获得 Google 支持，但部分担保只有在项目完工后才完全生效，因此建设阶段债券仍可能面临更高信用风险。[Financial Times](https://www.ft.com/content/c492ce6b-483b-4196-8f2a-9bd1afda92d3)

换句话说，AI 产业已经从“科技公司资本开支”发展到了第二阶段：**整个资本市场正在被拉进来。**

## 这篇文章真正重要的地方

我认为这篇 FT 调查最重要的结论，并不是“Google 给 Anthropic 2000 亿美元”。事实上这不是一张 Google 开给 Anthropic 的2000 亿美元支票，而是由芯片采购、私人信贷、设备租赁、数据中心债务、公司担保和长期算力合同拼接起来的一整套金融结构。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)

它更像是 AI 版的飞机融资或基础设施 project finance：Google 提供技术和信用，Broadcom 承担一部分设备残值风险，Apollo 和 Blackstone 等资金方持有信贷资产，Morgan Stanley 等银行负责结构设计和融资，矿商提供已经拿到电的土地，Anthropic 则通过未来模型收入偿还整套系统的租金。

这意味着 AI 基建投资逻辑正在出现一个很重要的迁移。过去投资者问的是“GPU 够不够”；之后变成“有没有数据中心”；现在可能更应该问“**谁拥有最低的资本成本、谁有可用电力，以及最终是谁的现金流在支撑这些债务？**”

从投资角度看，这是我自己的延伸判断，而不是 FT 的直接结论：Google 的 TPU 战略真正威胁 Nvidia 的地方，未必只是芯片性能。如果 Alphabet 能同时用 Cloud 客户关系、自研芯片、Broadcom供应链和自身 AAA 级别附近的融资能力，把 TPU 整体使用成本压下来，那么它实际上是在用**资本成本补贴算力生态**。相比之下，依赖高息融资购买 Nvidia GPU 的 neocloud，即使硬件性能优秀，也必须获得足够高的租金回报才能覆盖9%左右的资金成本。

而这套体系最大的反转信号也异常清楚。只要 Claude、Gemini、ChatGPT 等前沿 AI 产品的收入增长足以覆盖越来越大的计算账单，金融工程就能继续把未来 AI 收入提前转换成今天的数据中心、TPU 和电力建设。但如果 frontier labs 的收入增长明显低于算力承诺，问题就不再只是一两家 AI startup 的估值下降，而可能沿着 **Anthropic → TPU 租赁 → SPV → private credit → 数据中心债券 → 电力与基础设施开发商**这条链条向外传导。这也是为什么我认为这篇文章比一篇普通的 Google 或 Anthropic 公司分析更值得读：它开始展示这一轮 AI 超级周期背后的**金融操作系统**。[Financial Times](https://www.ft.com/content/549f2e23-5aa2-49c7-9ea6-a9784ab7087c)
