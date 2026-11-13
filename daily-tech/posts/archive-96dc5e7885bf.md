今天推荐 **Anthropic Science 于 2026 年 9 月 23 日发布的《Claude discovers a novel enzyme system with CRISPR-like repeats》**。文章没有列个人作者，由 Anthropic 新成立的生命科学研究团队发布，**全文免费，无需登录**。[阅读 Anthropic 原文](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system) 正文略短于你通常偏好的 10–20 分钟，大约属于 8–10 分钟级别，但我今天仍然优先选它，因为这是最近两周我看到最值得认真拆的一次 **“AI agent 真正参与科学发现”**案例：不是 Claude 帮研究者润色论文，也不是做蛋白质结构预测，而是近千个 agent 自主探索大规模基因组数据库，提出研究方向，并意外注意到一个此前没有被系统描述的天然分子系统。更重要的是，它背后的预印本同时暴露了一个官方博客没有重点强调的事实——**同样的搜索后来重跑十次，十次都没有再次发现关键结构。** 因而这篇文章真正有价值的地方，不是“Claude 找到了下一个 CRISPR”这种标题，而是让我们第一次比较具体地看到：AI 科学家的能力、随机性、人类验证和真实研究 workflow 会怎样组合在一起。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

以下不是逐段翻译，而是把官方文章、配套预印本和独立报道交叉后，按这项工作的真实逻辑重新整理。尤其要先划清证据边界：**目前发现的是一种带有类 CRISPR 重复序列结构的未知酶系统，功能尚未确定；没有证据证明它能像 CRISPR 一样进行可编程基因编辑，更不能称为“新 CRISPR”。** [alphaXiv](https://www.alphaxiv.org/abs/2609.ai-agents-discover-reverse-transcriptases)

## Anthropic 真正想证明的，不是 Claude 懂多少生物学，而是它能不能自己决定“什么值得研究”

文章先回顾了几个现代生物技术史上的经典发现。限制性内切酶原本只是细菌抵御病毒的天然机制，后来成为重组 DNA 技术的基础；Taq polymerase 来自黄石温泉中的耐热细菌，最终让 PCR 成为现代分子生物学最基础的工具之一；CRISPR 最初也只是研究人员在细菌 DNA 中注意到的一串奇怪重复序列，直到很多年以后，人们才逐渐理解它是一套适应性免疫机制，并把它变成基因编辑工具。Anthropic 想抓住的共同点是：重大生物技术有时并不是从“我要发明某种工具”开始，而是从**有人在海量自然数据中注意到一个反常现象**开始。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

这恰好是一种很适合 agent 的研究工作。现代测序数据库里存在数量巨大、从未被实验室认真研究过的蛋白和基因邻域；真正的瓶颈往往不是没有数据，而是没有足够多的研究人员逐一阅读文献、建立序列模型、比较基因邻接关系，再决定哪些异常值得花昂贵的湿实验资源验证。

Anthropic 因此在 2026 年春天组建了一支生命科学团队，并在湾区建立自己的分子生物学实验室。它的目标不是单独开发一个“生物专用聊天机器人”，而是尝试一种新的研究分工：AI 大规模扫描知识和数据、提出候选解释，人类研究者保留实验设计、判断与湿实验验证。实验室目前只做 BSL-1 和 BSL-2 级别工作，不处理能够感染人的病原体，所有实际实验操作仍由人类研究人员完成。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

这里最值得注意的一点是，Anthropic 想测试的并不是传统机器学习里的 classification accuracy。

它要测试的是：

**一个通用模型能不能拥有某种“科学品味”——在几千个理论上都可能有意思的异常中，自己决定哪个异常值得继续追。**

## Claude 接到的任务看起来很宽泛：去海量基因数据里找一些“有意思”的逆转录酶

研究团队把目标放在 reverse transcriptase，也就是**逆转录酶 RT** 上。普通的信息流是 DNA 转录成 RNA，而 RT 可以反过来把 RNA 复制成 DNA。大家最熟悉的 RT 可能来自逆转录病毒，但过去几年研究人员已经发现，细菌和噬菌体世界中还隐藏着大量不同类型的 RT，其中一些参与抗病毒免疫，还有一些已经衍生出新的生物技术工具。

Anthropic 给 agent 的初始方向，是在一个极其庞大的 metagenomic sequence 数据库中调查 RT 周边是否存在此前没人系统描述过的新型生物系统。配套预印本给出的尺度比官方博客更完整：整个搜索空间来自约 **19 亿个蛋白质 cluster**；完整运行被拆成 **119 个任务、949 个 agent session**，其中很多后续任务是 agent 自己提出的；墙钟时间约 **21.5 小时**，累计消耗约 **2.156 亿 tokens**。[alphaXiv](https://www.alphaxiv.org/abs/2609.ai-agents-discover-reverse-transcriptases)

Agents 最终收集了超过 **20 万个 RT**，从基因邻域关系中提出大约 **3,500 个候选系统**，然后把范围压缩到约二十个最值得人类进一步查看的候选，并为它们生成可以让科学家直接阅读的分析报告。Anthropic 称，如果专家手动做类似规模的 genome mining，通常需要数周甚至数月；这个时间对比目前主要来自公司自身，因此更适合作为 workflow 量级参考，而不是一个经过独立 benchmark 验证的“AI 加速倍数”。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

这套 workflow 本身很值得看。Claude 并不是拿一个固定程序跑完数据库，然后把得分最高的二十项交出来。根据研究团队描述，agent 会先读相关论文，再从公开数据中尝试复现已知结果，以确认自己的方法没有明显跑偏；随后调查尚未被解释的蛋白家族或异常基因邻域，形成候选假设，再对自己的证据进行批判性复查。很多候选就在这一阶段被它自己放弃。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

换句话说，这已经不是简单的“AI 帮科学家搜索论文”。

它开始接管一段研究循环：

**调查 → 发现异常 → 提出解释 → 搜证据 → 反驳自己 → 排序 → 交给实验人员。**

而最有意思的发现，恰恰不是 Claude 按照原始搜索框架机械筛出来的东西。

## 真正的发现来自一个 agent 在“看 DNA”时突然注意到了一段奇怪的重复结构

某个 agent 在调查一组比较异常的噬菌体 RT 时，直接查看了 RT 基因周围的原始 DNA 序列。

它注意到，上游 DNA 并不是普通随机序列，而存在一长串非常规则的串联重复结构。

关键在于，这种排列在视觉和统计结构上都很像 **CRISPR array**。

CRISPR 天然系统中也存在重复序列与 spacer 交替排列的 array；这些序列最后可以产生不同 RNA，从而帮助 Cas 蛋白识别特定外来 DNA。正是这种“RNA 指南库”结构，让 CRISPR 后来能够变成高度可编程的基因编辑工具。

Claude 随后没有停在“这看起来挺奇怪”。

它测量了重复序列数量和间距，检查周围的蛋白编码基因，将其与已知 RT 系统比较，又搜索已有论文，确认没有找到同样结构已经被系统描述的证据，随后才将它作为候选新系统提交给人类研究团队。[TNW](https://thenextweb.com/news/anthropic-claude-enzyme-system-crispr-like-repeats)

研究人员把这个系统称为 **Array-Associated Reverse Transcriptases，ART**。

ART 目前主要出现在大型 bacteriophage，也就是感染细菌的病毒中。其基本结构包括一个 RT、旁边一个功能未知的 partner gene，以及邻近的一串有规律排列的非编码 DNA repeat array。值得特别强调的是：**RT 本身并不是 Claude 新发现的。** 至少其中一个相关噬菌体中的 RT 过去就已经被描述过；此前研究没有把这个 RT、邻近 partner gene 和重复 array 识别为一个可能统一工作的系统。[The Nano AI](https://www.thenanoai.com/article/anthropic-claude-agents-discover-art-enzyme-system-crispr-like)

这让我觉得这个案例比“AI 找到了一个以前数据库里不存在的蛋白”更有意思。

数据其实早就在那里。

甚至核心酶本身也有人见过。

AI 做的是一种更接近人类科学家的事情：

**重新看已有材料，然后注意到别人没有把几个现象连在一起。**

## 湿实验验证确认了“这个结构不是数据库幻觉”，但还远没有证明它是基因编辑工具

Anthropic 随后由人类研究人员在实验室做验证。

配套研究首先在已有的 Staphylococcus 噬菌体感染 RNA 数据中发现，ART 对应的 repeat array 会大量转录。更直接的实验则显示，这一长段 array 并不是简单生成一条巨大的 RNA，而是会形成一组彼此独立的短 RNA。这个现象很重要，因为 CRISPR array 也会被加工成一组独立 RNA，每一个 RNA 可以承担不同序列识别任务。[whataifound.org](https://whataifound.org/finding/2026-09-23-array-associated-reverse-transcriptases)

在一份已经发表的 SA1 噬菌体感染数据中，这些 array RNA 在感染后某些时间点甚至占到相当高比例的噬菌体转录物；这进一步说明它不像无意义的 DNA 重复，而更可能具有真实生物功能。[Laura Martel](https://www.laura-martel.com/blog/anthropic-art-enzyme-discovery)

但现在必须把刹车踩住。

研究人员**还没有证明 ART 的逆转录酶到底在做什么**。

没有证明这些短 RNA 就是 RT 的底物。

没有证明 partner protein 的功能。

没有证明它能够识别指定 DNA。

更没有证明它能像 CRISPR-Cas 那样，让研究人员提供一条 RNA 就针对某个指定序列进行切割、复制或编辑。[BigChange](https://bigchange.ai/blog/claude-crispr-like-enzyme-system-art-evidence)

因此目前最准确的表述并不是：

**“Claude 发现了一个新的 CRISPR。”**

而是：

**“Claude 发现了一套天然的、以前没有被完整识别的 RT + partner protein + RNA-repeat-array 系统，其架构与某些可编程分子系统存在令人感兴趣的相似性。”**

两个表述之间差得非常远。

Anthropic 自己也承认，ART 的主要生物功能仍然未知。Dario Amodei 对外谈到它可能代表一种新的 gene-editing mechanism 时，同样附带了“功能、用途甚至最终科学重要性目前都不清楚”的限定。[GIGAZINE](https://gigazine.net/gsc_news/en/20260924-anthropic-claude-crispr)

CRISPR 先驱 Feng Zhang 看过预印本后的评价也很克制。他认为 RT 旁边出现这种 RNA-repeat array 确实非常有意思，值得进一步研究，但这当然不是独立实验室已经证明它具有 CRISPR 功能。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

## 真正让我认为这篇文章值得今天读的，是官方文章没有突出的一项结果：Claude 后来十次都没有再找到它

如果只读 Anthropic 的博客，很容易形成一个印象：

给 Claude 一个宏观研究目标。

跑 21 小时。

Claude 就发现一种新生物系统。

但预印本做了一项非常重要的 reproducibility test。

研究团队把**相同 campaign 又完整跑了十次**。

结果：

**十次都没有再次发现 ART 的重复 array。**

这并不是因为后面十次完全没有碰到 ART。根据研究报告，绝大多数 rerun 实际上都采样到了相关 genomic locus，其中两次甚至已经把这个 RT lineage 作为进一步研究对象。

可它们没有去读正确位置的那段上游 DNA。

于是关键重复序列就从眼皮底下溜过去了。[Vakker Wire](https://wire.vakker.pro/story/9d0a065afa8f)

这个结果非常有意思，因为研究人员随后又把问题拆开测试。

如果直接把包含 ART repeat 的 DNA 放到模型眼前，让它判断里面有什么，最强的 Claude 模型在至少 **90%** 的测试中都可以认出异常重复结构。

但一旦把模型放回真实 agent 环境，让它自己操作文件、调用工具、决定读哪些区域，成功率在某些设置下会掉到约 **32%**。大约 **39%** 的相关 tool-use 尝试甚至根本没有连续读取至少 200 个核苷酸，因此模型压根没有给自己创造“看见”模式的机会。[Vakker Wire](https://wire.vakker.pro/story/9d0a065afa8f)

这说明失败点未必是：

**模型看见了东西却不够聪明，没认出来。**

而更可能是：

**agent 不知道该去哪里看。**

这和现在 coding agent 的很多失败非常像。

模型可能完全有能力修一个 bug。

但它没打开那份配置文件。

没有运行关键测试。

搜索到一半走错分支。

于是最终失败。

“推理能力”和“长期搜索可靠性”是两种完全不同的能力。

## 所以这项工作证明的不是“AI 已经成为可靠科学家”，反而更像是在证明一种新的科学搜索算法

我认为 Anthropic 官方文章把重点放在“autonomous discovery”没有错，但如果加入十次 rerun 的结果，一个更加准确的理解会是：

现在的科研 agent 很像一种**极高并行度、带有科学直觉但高度随机的搜索过程**。

传统 computational biology pipeline 往往按照研究者预先规定的 feature 工作。

例如：

寻找长度满足某条件的 repeat。

寻找两个经常相邻的基因。

寻找与某一 protein family 相似的 sequence。

这种方法可靠，而且可以重复运行，但它通常只能找到人已经想到要搜索的东西。

Claude 的优势恰恰是行为没有完全固定。

一个 agent 可能突然决定：

“我直接看看原始 DNA。”

然后注意到一个 pipeline 根本没有要求它检测的模式。

这也是它能够产生 serendipity，也就是科学中的“意外发现”的原因。

可同一个优点又变成最大的缺点：

下一次 agent 不一定会做同样的事。

所以未来真正优秀的 scientific-agent system 很可能不能只是“开一只超级聪明 Claude 跑一天”。

更可能是运行很多探索轨迹，让不同 agent 使用不同工具和假设搜索，然后用另一套 critic、ranking 和 reproducibility 系统不断交叉验证。

换句话说，科学 agent 很可能越来越像：

**Monte Carlo search + frontier model + scientific toolchain + human experimental verification。**

ART 的发现正好非常漂亮地展示了这四部分缺一不可。

## Anthropic 的研究流程还有一个容易被忽略的变化：未来科学可能不再缺假设，而开始缺“判断哪些假设值得做实验”

官方文章里有一句我认为比 CRISPR 本身还重要的描述。

Claude 现在可以一次 campaign 产生数百甚至数千个候选 hypothesis 和报告。

于是 Anthropic 的科学家开始研究另一个问题：

**为什么我们觉得其中这个值得做实验，而另外九十九个不值得？**

他们把人类选择结果继续反馈给 Claude，希望模型逐渐学习专家的 scientific taste。[Anthropic](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)

这是一个非常大的范式变化。

传统研究中，好的 hypothesis 通常是稀缺品。

一个博士生可能花几个月读文献，最后才形成几个值得实验的想法。

如果 agent 可以在一天生成 3,500 个理论上有依据的候选，那么 hypothesis 本身突然变成 commodity。

真正变得稀缺的是：

实验台时间。

试剂。

测序容量。

动物实验。

实验人员。

以及最重要的：

**能够判断哪一个假设值得花这些资源的判断力。**

所以 AI for Science 的瓶颈可能会发生一次很像 AI computing 的迁移。

LLM 训练最初缺数据。

后来缺 GPU。

再后来缺电。

科学研究如果被 agent 化，可能从：

**缺想法**

迁移成：

**缺验证 capacity。**

## 这也是为什么我不认为“950 个 agent、2.15 亿 tokens”只是一个炫技数字

下面开始是我的延伸判断，不是 Anthropic 原文结论。

这项工作的另一个潜在商业意义，是它第一次把 **AI inference 直接变成科研资本设备**的感觉做得很具体。

一次 campaign：

约 950 个 agents。

约 2.15 亿 tokens。

二十多个小时。

最后可能产生一个值得湿实验研究的新分子系统。

Anthropic 没有披露这次实验的真实计算成本，因此现在不能合理计算“发现一个 candidate 花了多少钱”，更不能宣称这已经比雇科学家便宜。

但如果这种模式真的能扩展，药企和 biotech 的 AI 使用量会与今天完全不同。

今天一个科学家可能一天向 Claude 问几十次问题。

未来一个科学家可能启动：

**10,000 个 agent-hours 去搜索一个 protein family。**

AI inference 的 consumption unit 就从“一个人问多少问题”，变成了：

**一个研究问题愿意投入多少计算搜索。**

这会把生命科学变成 frontier inference 一个非常大的新 workload，而且它不像普通 consumer chatbot 那样特别价格敏感：如果一次价值数百万美元的药物研发项目多花十万美元 inference 能少走半年弯路，经济模型完全成立。

## 更大的意义不是“AI 替代科学家”，而是科学家的工作可能从寻找答案转向管理搜索空间

我觉得这篇文章真正值得长期记住的，是它呈现出一种很可能成为未来科学标准形态的分工。

AI 最擅长的是广度。

它可以同时读几十万条 sequence。

调查几千个 candidate。

跑几百条互相不同的研究路径。

不会因为第 138 个候选看起来无聊就失去耐心。

人类最有价值的部分则越来越集中到另一边：

定义值得问的问题。

判断证据够不够。

发现实验有没有 confounder。

决定一个异常究竟是真的新现象还是数据 artifact。

设计能够 falsify hypothesis 的实验。

以及最终承担科学结论的责任。

ART 同时展示了这两者。

没有 Claude，那段 DNA 很可能继续躺在数据库里没人把它当成一个系统看。

但只有 Claude，我们现在也依然不知道 ART 到底是什么。

它真正成为科学发现，是因为一个随机搜索轨迹把异常送到了人的面前，然后人类研究者把它带进实验室。

所以我不会把这件事总结成：

**“Claude 成了生物学家。”**

更准确的描述可能是：

**科学家第一次拥有了一支可以在一夜之间派出近千名研究助理、让他们独立探索同一个巨大问题的队伍。**

而十次 rerun 全部 miss ART 又提醒我们：这些研究助理极其聪明，却仍然非常不可靠。

如果这个问题最终能够解决，那么 AI 对科学的最大影响可能不会来自模型知道多少知识，而会来自一个更根本的改变：

过去，一个实验室能探索多少假设，大体受它有多少博士生限制。

未来，这个数字可能首先由**算力、agent architecture，以及实验验证能力**决定。

这正是我认为《Claude discovers a novel enzyme system with CRISPR-like repeats》比“Claude 找到一个类 CRISPR 系统”这个新闻标题本身重要得多的地方：**它让我们第一次比较清楚地看到，真正的 AI 科学自动化可能长什么样——不是机器坐下来灵光一现，而是用海量计算制造成千上万次有方向的偶然发现，然后把最有希望的几个交给现实世界去证明。** [alphaXiv](https://www.alphaxiv.org/abs/2609.ai-agents-discover-reverse-transcriptases)
