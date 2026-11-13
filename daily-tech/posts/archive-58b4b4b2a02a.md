# 今日科技长文：Nvidia 正在尝试把 GPU 变成一种新的金融资产

今天推荐 Elizabeth Lopatto 于 **2026 年 8 月 19 日**发表于 [The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset) 的 **《Nvidia’s new financial strategy does not compute》**。文章目前可以直接阅读，核心讨论 [Nvidia](https://www.nvidia.com/) 刚刚宣布的一个极其重要、但容易被“5000 亿美元 AI 基建融资”这个标题掩盖的变化：Nvidia 正联合 Apollo、BlackRock、Blackstone、Brookfield、Goldman Sachs 和 KKR，尝试把 **AI compute 本身包装成可以被银行、private credit、保险资金等长期资本持有的独立资产类别**。Nvidia 8 月 10 日的官方公告称，这些独立融资平台长期目标是动员超过 **5000 亿美元第三方资本**。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

我认为这篇尤其值得读，因为 AI 基建现在已经进入一个新阶段：瓶颈正在从“能不能造出更多 GPU”转向“谁能为几万亿美元 GPU、电力和数据中心 CapEx 提供资产负债表”。如果 Nvidia 能让 GPU 像飞机、房地产、光纤甚至按揭贷款一样被证券化、抵押和长期融资，它实际上是在给自己的客户创造购买力。这可能比单纯把下一代 GPU 提速 20% 更能扩大 Nvidia 的 TAM。但 Lopatto 的文章提出了另一面：**如果 GPU 真是一种长期稳定资产，为什么 Nvidia 过去又不断告诉客户旧 GPU 会被下一代迅速淘汰？** [The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## Jensen Huang 现在希望华尔街相信：GPU 不只是设备，而是“生产性资产”

事情从 Nvidia 8 月 10 日的公告开始。公司与 Apollo、BlackRock、Blackstone、Brookfield、Goldman Sachs 和 KKR 签署合作安排，希望建立多个独立的 compute financing platforms。Nvidia 的官方表述非常刻意：这不是 Nvidia 自己拿出 5000 亿美元，而是希望利用自己的技术、生态和一定程度的信用支持，**mobilize 超过 5000 亿美元第三方资本**。[NVIDIA Investor Relations](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Partners-With-Apollo-BlackRock-Blackstone-Brookfield-Goldman-Sachs-and-KKR-to-Establish-AI-Compute-Infrastructure-Financing-Platforms-to-Mobilize-Over-500-Billion-of-Third-Party-Capital/default.aspx)

Jensen Huang 对这件事的描述已经不再停留在“给数据中心融资”。他认为 AI compute 正在成为一种新的 investable asset class，因为这些设备能够产生收入、使用寿命长、具有一定可替代性，而且可以灵活部署。BlackRock CEO Larry Fink 甚至把这个阶段类比成自己上世纪 70 年代刚进入 mortgage-backed securities 市场时看到的金融创新起点。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

Nvidia 第二天专门发表文章解释这个 thesis。黄仁勋认为，过去企业是一个项目一个项目买芯片、建数据中心；未来“AI factories”可以像基础设施一样被长期资本融资。Nvidia 的核心论点可以压缩成一句话：**AI compute 不只是成本，因为客户可以利用它提供 inference、训练和其他 AI 服务，从而持续创造收入。** [NVIDIA Blog](https://blogs.nvidia.com/blog/nvidia-ai-factory-compute/)

但 Lopatto 马上抓住一个很大的逻辑冲突。就在上一轮产品周期里，黄仁勋为了强调 Blackwell 相对于 Hopper 的巨大优势，还曾极力强调旧架构迅速失去经济竞争力。现在为了让银行相信 GPU 可以做长期贷款抵押物，叙事却变成旧 GPU 可以持续产生现金流很多年。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

这两个叙事并不一定完全矛盾。一块旧 GPU 可以同时满足“性能/能效明显不如新品”和“仍然有正的经济价值”。真正关键的问题不是旧 GPU 能不能继续运行，而是：**五年、七年甚至十年后，它产生的租金现金流和二手残值究竟是多少。**

这正是整个新资产类别能否成立的核心。

## Nvidia 为什么突然开始强调 A100 可以用十年

黄仁勋拿 2020 年推出的 A100 举例，称它今天仍然被商业客户积极使用，而且客户还在签多年部署合同，因此它的经济寿命可能向十年延伸。现实市场确实给这个观点提供了一些支持。AI inference 需求增长非常快，老 GPU 的租赁价格没有像传统计算硬件那样持续迅速下降；文章引用行业分析师 Brendan Burke 的观察称，推理芯片供不应求反而逆转了正常的价格下降趋势。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

CoreWeave CEO Michael Intrator 也曾表示，公司已经能够把基于 **2020 年架构**的 GPU 签进延续到 **2029 年**的客户合同。这意味着至少在当前供不应求的环境中，五六年前的 GPU 并没有失去商业价值。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

但这里立刻出现一个会直接影响贷款规模的问题：**折旧到底应该按几年算？**

做空投资者 Michael Burry 曾主张 AI 芯片更合理的折旧周期可能只有两到三年；IBM CEO Arvind Krishna 给出的尺度约为五年；黄仁勋现在则强调某些 Nvidia compute 的经济寿命可能接近十年。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

这不是会计师之间无聊的争论。

假设一家 neocloud 花 10 亿美元买 GPU，然后拿这些 GPU 去抵押借款。如果银行认为三年后这些 GPU 基本没价值，就不可能借给它太多钱，而且贷款 amortization 必须非常快。如果银行相信十年后资产仍然拥有显著残值，就可以提高 loan-to-value、延长期限、降低每年的偿债压力。

CoreWeave 的文件本身就体现了这个机制：随着 GPU 折旧，其可借款能力会下降。于是黄仁勋公开强调十年经济寿命，实际上是在帮助整个 Nvidia 客户生态建立一个对融资更加友好的 collateral valuation framework。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## 所谓“compute asset”，目前很大程度上其实还是 GPU-backed loan

Lopatto 对 Nvidia 语言包装最尖锐的批评就在这里。

真正完整的 AI compute 并不只是 GPU。GPU 必须放进数据中心，需要服务器、网络、冷却、变压器、土地和巨量电力。Nvidia 所说的“AI factory platform”虽然包含 accelerated computing、networking、system software、AI frameworks 和 developer ecosystem，但真正的数据中心房地产和电力基础设施并不是 Nvidia 的核心产品。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

而数据中心房地产本身其实早已经是成熟基础设施资产。文章提到，Blackstone 已经拥有包括在建项目在内约 **1850 亿美元**的数据中心平台，并认为稳定运营的数据中心长期 ownership market 最终可能达到约 **1 万亿美元**。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

Nvidia 真正想金融化的并不是 building，而是里面的计算设备。

因此 Lopatto 认为，把它叫“compute as an asset class”多少有重新包装的成分：实际结构很接近市场已经存在的 **GPU-backed lending**，也就是用 GPU 以及围绕 GPU 产生的合同现金流作为抵押进行融资。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

今年夏天 Broadcom 已经做过一个很有参考价值的版本。Broadcom 与 Apollo、Blackstone 设计了一笔约 **350 亿美元**的融资，涉及约一百万颗芯片；设备放入 SPV，由资本提供方收取利息，而 Broadcom 为其中部分优先级较高的债务提供担保。目的非常直接：帮助客户融资购买 Broadcom 芯片，从而扩大 Broadcom 自己的 AI accelerator 销售。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

从这个角度看，Nvidia 现在不是突然发明了一种全新的金融产品，而是准备把类似机制**工业化并放大几个数量级**。

## 这件事对 Nvidia 最大的价值，是“不降 GPU 标价，却降低客户购买 GPU 的实际成本”

这是整篇文章里我认为投资上最重要的一层。

假设一家 neocloud 要建设价值 50 亿美元的 GPU 集群。如果只能靠自己的 equity，它可能根本筹不到这么多钱；即使筹得到，股权资本成本也非常高。

但如果 Blackstone、Apollo 或保险资金愿意以 GPU 和长期租赁合同为抵押提供大量债务，客户需要投入的 equity 就会大幅下降。

于是客户购买 Nvidia GPU 的经济成本下降了。

Hedgeye 的 Felix Wang 对这种效果概括得很准确：Nvidia 相当于**没有降低 GPU 售价，却让自己的产品变便宜了**。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

这对 Nvidia 特别重要，因为它不仅要和 AMD、Google TPU、Amazon Trainium 等芯片竞争，还要竞争**资本成本**。

如果买 Nvidia B200 可以获得 70% LTV、低利率、七年期 financing，而买某种小厂 accelerator 只能获得 30% LTV、昂贵三年贷款，那么即使后者硬件售价便宜 20%，客户最终可能仍然选择 Nvidia。

换句话说，AI 芯片竞争正在出现一个过去很少讨论的维度：

**financing availability 本身可以成为产品特性。** [The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## GPU 越容易融资，Nvidia 的护城河反而可能越深

这会形成一个很有意思的正反馈。

过去 GPU-backed lenders 已经明显偏好 Nvidia，因为 Nvidia GPU 的二手流动性最高、客户最多、CUDA 生态最大，所以违约后相对容易找到下一个买家。Stanford 的 Vikrant Vig 此前研究 GPU lending 时就指出，大多数此类贷款都以 Nvidia GPU 为抵押。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

于是出现循环。

Nvidia GPU 最容易出租，因此残值最好；残值最好，因此银行愿意提供更好的融资；融资更便宜，因此 neocloud 更愿意购买 Nvidia；装机量继续扩大，又进一步提高 Nvidia GPU 的流动性。

这种护城河和 CUDA 很不一样。

CUDA 是**软件网络效应**。

GPU-backed financing 可能形成的是**资本市场网络效应**。

Lopatto进一步指出，如果 Nvidia 与六家大型金融机构的安排最终落地，这种差异可能进一步扩大。一个刚成立的 CoreWeave、Crusoe 或 Lambda 类 neocloud，选择 Nvidia 时获得的不只是芯片和 CUDA，还可能获得一个已经建立起来的融资生态。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## 华尔街甚至可能反过来要求所有 AI 数据中心越来越像 Nvidia 的标准设计

这里还有一个非常有意思的二阶效应。

银行和保险公司最讨厌抵押物高度定制。

如果一家 neocloud 违约，债权人接管一座高度特殊的数据中心，却发现服务器拓扑、冷却、网络和软件都只能被原客户使用，那么 collateral value 会非常低。

因此贷款人天然希望所有 GPU cluster 尽可能标准化。

Brendan Burke 对文章解释，不同部署方式下，同样 GPU 的实际性能可能差很多，这会让贷款人很难预测未来收入。Nvidia 已经开始向客户提供关于理想部署方式以及预期收入的更详细指导。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

如果未来贷款合同要求使用特定 Nvidia reference architecture、网络拓扑、软件版本甚至冷却设计，金融机构就会在无意间帮助 Nvidia 推动整个 AI 数据中心行业标准化。

理由很简单：标准化意味着如果 A 公司破产，这批设备更容易转给 B 公司继续运营。

而越标准化，Nvidia 整套 rack-scale architecture 的生态优势越大。

Burke 把这个过程形容成一种“赶羊”：大量高度定制的数据中心运营商可能被融资条款逐渐赶向同一套标准。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

所以 Nvidia 不只可能通过 CUDA 控制软件接口，通过 NVLink/NVSwitch 控制系统互联，还可能通过**融资条件间接影响 physical deployment standard**。

这是一个很容易被忽略、但非常强的战略效果。

## 为什么 Nvidia 又特别需要把 BlackRock 和 Apollo 拉进来

因为过去一年市场越来越担心所谓 **circular financing**。

典型例子是 Nvidia 投资一家 neocloud，neocloud 再拿这笔 equity 去借更多钱，然后用借来的钱买 Nvidia GPU。结果 Nvidia 的投资最终部分转化成自己的 revenue。

CoreWeave 是最典型案例之一。Nvidia 不仅投资 CoreWeave，还在其 IPO 遇到困难时提供支持，并承诺购买部分剩余算力。文章指出 Nvidia 甚至签过约 **13 亿美元、四年期**协议，从 CoreWeave 租用装有 Nvidia 自己 GPU 的算力。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

因此批评者会问：到底有多少 Nvidia demand 是真正终端客户产生的，有多少是 Nvidia 自己通过资本循环帮助创造的？

新的结构试图把 Nvidia 从这个循环里移出去。

以前可能是 Nvidia 给 neocloud 1 美元 equity，neocloud 再借5美元，最终买6美元 Nvidia GPU。

现在希望变成 Blackstone、Apollo、KKR 等外部资本直接给 neocloud 那5美元。

Nvidia仍然卖6美元 GPU，但资产负债表承担的直接 financing 少了。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

这就是为什么参与者名单值得看：Apollo、BlackRock、Blackstone、Brookfield、KKR 大量属于 private capital / asset management 世界，只有 Goldman Sachs 是传统意义上的大型银行。

AI 基建正在明显向 **private credit + infrastructure finance** 迁移。

## 但风险并没有消失，只是从 Nvidia 的资产负债表搬到了金融体系

Lopatto 对这套安排最大的质疑就在这里。

如果 Blackstone 借钱给 neocloud 买 Nvidia GPU，表面上的 Nvidia circularity 确实下降了。

但债务最终必须有人持有。

文章引用 Frankfurt School 金融学者 Sascha Steffen 的分析：很多 originate-to-distribute private-credit 产品最终可能进入寿险和 annuity insurer 的 general account。

也就是说，风险可能沿着这条链条移动：

AI lab 或 neocloud 承诺租 compute；SPV 买 GPU；private-credit manager 设计贷款；贷款被包装和分配；最终保险资金持有这些债权。

Nvidia 不再直接承担全部风险，但整个金融系统开始持有越来越多 AI infrastructure credit exposure。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

Steffen 因而认为所谓 circularity 可能没有完全消失，而只是**下沉了一层**。

尤其值得注意的是，一些 private-capital manager 与最终持有这些资产的保险公司本身存在股权或集团关系。这可能削弱最终资产持有人独立审查贷款质量的动力。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## 整个 AI 建设已经迅速从 equity story 变成 debt story

文章给出的一组数据很能说明规模。

截至 7 月底，hyperscalers 以及 Nvidia 等相关公司今年已经发行约 **2250 亿美元债券**。S&P Global 的统计显示，这一板块上半年的 bond issuance 同比接近增长十倍，并可能在全年达到约 **4000 亿美元**。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

与此同时，hyperscalers 已经做出约 **1.5 万亿美元 lease commitments**，其中大约 **1 万亿美元并不直接体现在传统资产负债表负债里**；此外还有约 **1.5 万亿美元**芯片、电力等 purchase commitments。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

因此 AI CapEx 已经不能只通过 Microsoft、Meta、Google 和 Amazon 每季度公布的资本开支理解。

真正的资本结构正在向 SPV、lease、private credit、asset-backed financing、GPU-backed debt 等不同形式扩散。

这也解释了为什么 Apollo 会专门组建团队做 AI infrastructure financing。文章称 Apollo 已经有大约 **60 人**聚焦相关建设融资，而安排 AI deals 正成为新的收入来源。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## 最大的风险最终还是同一个：谁真正给这些 GPU 产生现金流？

这也是所有金融包装都绕不过去的问题。

一块 B200 本身不会产生现金。

它必须有人租。

因此 lender 真正想要的通常并不只是 GPU collateral，还包括这批 GPU 对应的客户合同。

如果 CoreWeave 有 Microsoft 签下的多年租赁协议，银行真正信任的很大一部分其实是 Microsoft 的信用，而不是 GPU。

如果租户是持续亏损、需要不断融资才能履约的 AI lab，贷款风险显然完全不同。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

Lopatto 特别指出，现有 GPU-backed loans 通常并不是“只靠芯片抵押”。设备对应的 contractual cash flow 往往同样重要。

因此 Nvidia 新计划真正需要观察的问题是：未来这些融资能不能真的做到**GPU 本身足以支持大规模贷款**。

如果仍然需要 Microsoft、Google 等 investment-grade counterparty 的长期合同，那么所谓“compute asset class”其实仍然更接近传统 project finance。

如果银行真的愿意只看 GPU 和 Nvidia ecosystem 就借出大量长期资本，那才是新的资产类别真正形成。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

## Nvidia 自己其实也没有完全相信市场会接受 GPU 残值

一个特别重要的细节是 **residual value guarantee，RVG**。

在部分融资安排中，如果 neocloud 最终违约、GPU 二手价值低于某个水平，Nvidia 愿意承担一定比例的 residual-value support。Lopatto 报道，在部分结构中这一比例最高可能达到约 **25%**。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

这非常值得思考。

如果 GPU 真的是像房地产一样稳定的长期资产，为什么还需要制造商自己给残值提供担保？

答案很可能是，金融市场目前还没有完全接受黄仁勋所说的十年 economic life。

Nvidia需要用自己的资产负债表帮助这个新资产类别建立信用。

最近 S&P Global 对 Nvidia 为 SB Energy 俄亥俄 AI infrastructure campus 提供 residual-value guarantee 的分析也很有参考意义。S&P 因此对 Nvidia 做了 debt adjustment，但认为目前对信用指标影响仍然有限，继续维持 Nvidia **AA** issuer rating 和 stable outlook；同时 S&P 明确提醒，AI ecosystem 不断提高的 debt leverage 未来可能增加 Nvidia 业务和财务表现的波动。[S&P Global](https://www.spglobal.com/ratings/en/regulatory/article/-/view/type/HTML/id/3613280)

这说明评级机构已经开始把这些 backstop 当成真正的 contingent financial exposure，而不是单纯商业合作。

## 最危险的变量不是 GPU 会不会坏，而是 AI 需求增长速度有没有金融模型假设得那么快

文章最后把问题拉回 AI 经济学。

GPU 的物理寿命其实不是最大问题。A100 十年以后大概率仍然能运行。

真正的问题是：十年以后，谁愿意以什么价格租它？

如果下一代芯片每美元 inference 性能提高五倍，那么旧 GPU 即使能工作，其经济租金也可能迅速下降。

如果 Google TPU、Amazon Trainium、AMD 或其他 ASIC 大量扩张，Nvidia GPU 的二手流动性也可能下降。

如果 AI inference 需求增长远超芯片性能提升，那么旧 GPU 反而可能持续紧缺。

所以 GPU residual value 实际上是一笔关于未来 **AI demand growth ÷ compute efficiency improvement** 的长期押注。

文章还提出另一个更根本的问题：模型公司究竟能不能产生足够利润来支持整个资本结构？

AI 应用现在当然已经产生巨大价值，但模型和应用层仍然存在大量补贴。Lopatto 的担忧是，如果真正向客户收取覆盖全部 compute cost 的价格，需求是否仍然保持目前的增长速度，并没有完全被证明。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)

她用互联网泡沫做的类比其实比“AI 是不是泡沫”更精确。互联网泡沫的问题不是大家判断互联网没有价值；事实证明互联网价值巨大。真正的问题是投资者**把最终会出现的需求提前了很多年资本化**。

AI 基建完全可能发生类似情况。

最终需要的 compute 可能真的非常巨大，但如果 2032 年才需要的容量在 2027 年就全部建出来，融资仍然可能出问题。

## 我的延伸判断：Nvidia 正在从芯片公司变成 AI 时代的“设备商 + 标准制定者 + 融资平台”

下面是我的判断，不是 The Verge 的原文结论。

我认为这件事对 Nvidia 的长期意义可能比表面看到的 5000 亿美元更大。

Nvidia 最初的护城河是 GPU。后来 CUDA 把护城河扩展到软件。NVLink、NVSwitch、Spectrum-X、DGX 和 GB/VR rack-scale architecture 又把它扩展到整个系统。

现在 Nvidia 正试图再加一层：

**capital stack。**

未来客户购买 Nvidia，不只是因为芯片最快，而可能因为 Nvidia GPU 最容易融资、最容易出租、最容易抵押、二手市场最深、保险公司最愿意持有对应债权。

这非常像飞机市场。航空公司选择 Boeing 或 Airbus 时，不只是比较飞机性能，还会考虑 leasing market、残值、维修生态和全球二手流动性。一种飞机如果全球租赁公司和银行都愿意融资，本身就会变得更容易销售。

如果 Nvidia 能把这种机制建立起来，它会形成一个非常强的金融网络效应：

**Nvidia 装机量越大 → 二手市场越深 → collateral value 越稳定 → financing 越便宜 → 客户越愿意买 Nvidia → 装机量继续扩大。**

但这同时也是我认为 Nvidia 当前最大的新增尾部风险之一。

以前 Nvidia 卖完 GPU，客户能不能盈利主要是客户的问题。

现在 Nvidia 投资客户、购买客户算力、提供 lease backstop、提供 residual-value guarantee，再帮助华尔街把 GPU 贷款卖给保险资金，它实际上越来越主动承担整个 AI capital cycle 的持续运行责任。

因此未来评估 Nvidia，除了 revenue、gross margin、Blackwell/Rubin shipment，我会越来越关注一个过去几乎没人看的指标：

**Nvidia 的 contingent liabilities 和 residual-value guarantees 到底增长多快。**

只要 AI compute 继续供不应求，这些担保看起来几乎没有成本，反而会显著扩大 GPU 销售。

但如果未来某一年 inference price 突然下降、neocloud utilization 下滑、某家大型 AI lab 出现信用问题，GPU resale value 和 customer credit quality 可能同时恶化。

那时市场才会真正发现，“compute as an asset class”究竟是一种类似飞机租赁和基础设施融资的成熟资产类别，还是把 AI 需求增长假设金融化之后形成的一层新杠杆。

所以这篇文章最值得记住的不是“AI 泡沫”三个字，而是一个更具体的问题：**Nvidia 已经不仅在制造 AI boom 所需要的铲子，它开始帮助整个金融体系借钱购买这些铲子。** 这能让 boom 持续得更久，也意味着如果周期最终反转，Nvidia 与整个 AI credit ecosystem 的命运会比过去绑得更紧。[The Verge](https://www.theverge.com/ai-artificial-intelligence/981668/nvidias-goldman-blackrock-gpu-compute-asset)
