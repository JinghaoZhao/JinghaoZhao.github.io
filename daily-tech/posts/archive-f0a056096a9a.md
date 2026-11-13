今天推荐 **Isabella Ward 于 2026 年 9 月 19 日在《WIRED》发表的《Mathematicians Feel Threatened by AI. They Can’t Quit It》**。文章目前网页可直接打开，但 WIRED 对部分用户可能采用计量式阅读限制。[阅读 WIRED 原文](https://www.wired.com/story/mathematicians-cant-quit-ai/) 我今天选它，是因为这篇文章讨论的已经不只是“AI 会不会做数学”，而是一个更棘手的问题：**当 AI 真的开始解决人类几十年甚至上百年没有解决的问题时，数学这种最强调原创、证明、归属和人类理解的学科，会不会反而最早遭遇一场制度危机？** 更矛盾的是，最担心这件事的数学家并没有停止使用 AI；他们往往一边怀疑自己的工作会不会被模型吸收，一边继续用 Codex、ChatGPT 或 Claude 写证明、查逻辑、整理论文，因为效率提升已经大到很难退出。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

这篇文章的背景尤其戏剧化。9 月 8 日，OpenAI 宣布，一个尚未公开、能力显著超过 GPT‑6 Astra 的内部模型解决了 **Navier–Stokes existence and smoothness problem**，也就是 Clay Mathematics Institute 七个“千禧年难题”之一。OpenAI 公布的不只是自然语言证明，还给出了 Lean formalization。公司称，用于 Navier–Stokes 的系统大约动用了 **1 万个并发 agents、运行 88 小时、交换 270 万条消息、产生约 1300 亿 output tokens**；Lean 形式化和验证又用了约 17 小时。[OpenAI](https://openai.com/index/navier-stokes-solution/)

但几乎就在同一时间，纽约大学数学教授 **Tristan Buckmaster** 与在 Anthropic 任职的数学家 **Levent Alpöge** 也在沿着高度相关的路线研究 Euler 和 Navier–Stokes blow-up。Buckmaster 随后公开质疑 OpenAI 是否在得知他们接近突破后迅速追赶，以及自己的 Codex 使用数据是否可能间接帮助了 OpenAI。OpenAI 的正式回应是：研究团队和 agents 在 Buckmaster、Alpöge 公开工作前没有看到他们的成果，并且公司调查后确认，Buckmaster 在此前两个月的 Codex prompts “不可能以任何方式影响”这套内部系统，包括通过训练。这个争议目前必须这样并列描述：**Buckmaster 提出了严重的归属和数据来源疑问；OpenAI 明确否认其私人 prompts 对结果产生了影响。** [WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

## 真正让数学家不安的，不只是 AI 抢走一道题，而是“谁贡献了什么”开始变得无法追溯

WIRED 的文章从一个非常反直觉的画面开始。

Buckmaster 是目前公开批评 OpenAI 最尖锐的人之一，但在接受采访时，他仍然在使用 OpenAI 的 Codex。

他用 Codex 整理研究论文，也用它回头分析 OpenAI 那套 agents 可能是怎样从早期思路走到最终证明。他告诉 WIRED，即使你不同意 AI 公司的一些做法，也越来越难完全不用这些模型，因为它们实在太有用；他甚至把这种局面形容为一种缺乏选择的结构。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

这正是文章标题 “They Can’t Quit It” 最重要的意思。

这里不是传统意义上的“技术反对者最后也真香”。

更接近一个经济学问题：

如果一种工具把科研生产率提高到足以改变竞争速度，那么**个人拒绝使用它可能变成职业劣势，即使整个群体都对它有所担忧。**

假设竞争对手可以用 agents 一晚上探索上千条证明路线，你坚持完全手算。

你的选择不仅影响效率。

它可能影响谁先发 paper、谁拿职位、谁拿 grant，以及一个博士生是否还有机会进入某个快速变化的研究方向。

这使 AI adoption 具有典型的 prisoner’s-dilemma 特征：

很多数学家可能希望整个领域慢一点。

但任何一个人单独慢下来，都可能被使用 AI 的同行超过。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

## Navier–Stokes 争议真正尖锐的地方，是 OpenAI 的成功确实受到了一条“有人快解出来了”的传闻触发

OpenAI 自己的官方时间线对此并不隐瞒。

公司称，8 月 28 日开始训练的一版新内部模型在数学 benchmark 上出现明显跃升。9 月 1 日，研究团队听说有两个 Millennium Prize Problems 可能已经被解决，于是启动大规模 agent campaign，同时攻击尚未解决的千禧年问题以及若干较简单的相关问题。[OpenAI](https://openai.com/index/navier-stokes-solution/)

其中一批 agents 先解决了一个无外力条件下的 Euler regularity 问题。

研究团队因此判断 Navier–Stokes 最有希望，把其他问题上的计算资源转过来，并把 Euler 结果交给更多 agents，让不同 agent groups 探索不同方向；随后再用 Codex 汇总各组中最有价值的中间结论，进行所谓 cross-pollination。

到 9 月 5 日，也就是首次启动 agents 约 88 小时后，系统得到 Navier–Stokes 结果。[OpenAI](https://openai.com/index/navier-stokes-solution/)

因此这里存在两个同时为真的事实。

OpenAI 并不是在完全没有外部刺激的情况下随机挑中 Navier–Stokes；公司自己承认，那条“有人可能解决了 Millennium Prize Problem”的传闻促使它启动实验。

但这也并不等于 OpenAI 获得了 Buckmaster 或 Alpöge 的未公开证明。

OpenAI 说它是在听到 rumor 后，从 problem statement 开始用自己的 agents 独立搜索；它随后调查并明确否认 Buckmaster 的 Codex prompts 进入了相关训练流程。[OpenAI](https://openai.com/index/navier-stokes-solution/)

这个区别非常重要。

因为数学界面对的真正问题不只是传统意义上的“抄袭”。

而是：

**如果 AI 系统从数十年的公开数学知识、论文、用户交互和强化学习中形成了一个复杂表示，那么当它重新组合出一个与某位研究者相似的思路时，我们究竟怎样判断知识来源？**

传统论文可以画 citation graph。

模型内部没有那么简单的 provenance graph。

## Andreas Thom 的经历把问题推得更远，因为这次甚至没有 Navier–Stokes 那样的公开冲突

WIRED 采访了德国数学家 **Andreas Thom**。

Thom 在 geometric group theory 研究了大约二十年，而这个领域真正能够熟练掌握相关技术的人非常少。

今年 8 月，OpenAI 表示 Astra 利用这些类型的技术证明了一个长期开放的问题。

Thom 的第一反应一方面是惊讶，另一方面是困惑：

模型究竟从哪里学会了这些非常专门的方法？[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

他特别指出，OpenAI 最初的介绍说相关问题在过去十年几乎没有进展，但实际上他 2019 年的论文和其他研究者已经做过重要工作。Thom 联系 OpenAI 后，公司修改了发布内容。

更敏感的是，Thom 与合作者在 OpenAI 公布结果之前几个月也曾使用 ChatGPT 辅助研究同一问题。

因此他直接询问 OpenAI，这些互动是否进入了训练数据。

OpenAI 研究人员告诉他，没有。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

Thom没有进一步追究。

但他给出了这篇文章中最值得记住的判断之一：

过去科学研究虽然复杂，但原则上可以追踪一条思想链——某个 lemma 来自谁，某个技巧在哪篇论文第一次出现，谁在会议上提出了哪个 conjecture。

AI 可能打断这条链。

并不是因为 AI 一定“偷了”某个人的成果，而是因为几百万篇论文、对话和强化学习轨迹被压缩进模型以后，**人类可能越来越难回答一个新想法究竟从哪些旧想法组合而来。** [WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

这和普通版权争议又不同。

数学事实本身通常并不受版权保护。

但数学共同体真正运行所依赖的并不是事实所有权，而是 **credit**。

谁发现。

谁证明。

谁提出方法。

谁把两种理论连接起来。

这些 attribution 决定职位、声誉、奖项、学生和科研资源。

因此即使 AI 产生的每个定理都“合法”，它仍然可能破坏一套几百年来维持学术共同体运转的激励机制。

## 数学界担心的甚至不是“机器比人聪明”，而是“解题”被误认为数学的全部目的

这个月数学界出现的公开反应非常强烈。

9 月 11 日，一批顶尖数学家发表了 **《A Severe Misalignment of AI in Mathematics》**。声明当前页面列出了包括 Terence Tao、Peter Scholze、Manjul Bhargava、June Huh、Maryna Viazovska 等在内的 **28 位 Fields Medal 得主**；WIRED 文章发表时写的是 25 位，签署名单之后继续扩大。[Math and AI](https://mathandai.org/)

声明的核心并不是：

“AI 不应该做数学。”

反而明确承认 AI 可以显著增强数学研究。

他们真正反对的是把“解决著名开放问题”本身当成模型 benchmark。

声明认为，数学研究最终追求的不是不断增加一张“true/false statement”清单，而是产生概念理解：为什么一个定理是真的，它与什么结构有关，新方法能否变成其他数学家可以掌握的工具，以及这个过程能否培养下一代研究者。[Math and AI](https://mathandai.org/)

一个著名问题之所以重要，不只是因为最终答案没人知道。

它往往像一座灯塔。

人们尝试解决它的几十年里，会发展出新的语言、方法和理论。

最后即使真正解决问题的证明只有几十页，它背后可能已经长出一个完整领域。

所以声明担心，如果 AI 公司把 famous problems 变成 model capability demo，整个激励函数就可能反转：

以前大家通过解决问题来获得**理解**。

现在公司可能把问题当作一个可以被计算资源攻破的 scoreboard。[Math and AI](https://mathandai.org/)

OpenAI 的 Navier–Stokes 项目某种程度上恰好把这种变化具象化。

它不是一个数学家十年专注于一个方向。

而是大约一万个 agents 同时搜索，1300 亿 output tokens，几百万条内部消息，然后在 88 小时内把搜索空间迅速压缩。

这是一种完全不同的知识生产模式。[OpenAI](https://openai.com/index/navier-stokes-solution/)

## 这也解释了为什么“形式化验证”非常重要，但它仍然不能解决数学界真正担心的问题

OpenAI 的结果有一个非常重要的优势：它不仅生成自然语言证明，还把证明形式化到 **Lean**。

这意味着至少在形式系统覆盖的范围内，proof checker 可以机械验证逻辑步骤是否合法，而不是要求人类相信一个几百页、可能夹杂 hallucination 的语言模型输出。[OpenAI](https://openai.com/index/navier-stokes-solution/)

这是 AI mathematics 很可能长期采用的标准模式：

模型负责发现。

formal system 负责验证。

理论上，它解决了“AI 给出的证明太长，人类看不过来”的一部分问题。

但 Leiden Declaration 特别指出，即使 formal proof 正确，也不代表数学研究的所有目标都已经满足。

因为从机器形式语言翻译到人类真正理解的概念之间，仍然存在巨大差距。

一个 Lean checker 可以告诉你：

**这个 inference 合法。**

它却不能自动告诉人类：

**为什么这个证明值得理解。**

其中最重要的新思想是什么。

它能否推广。

是否存在一个三页的 conceptual proof，而不是百万 token 的 brute-force derivation。[莱顿宣言](https://leidendeclaration.ai/)

所以未来数学可能出现一个非常奇怪的新分工：

**机器先证明，人类再理解。**

过去通常是：

人类先理解，然后写出证明。

如果这种顺序真的反过来，数学家的职业角色也会发生根本变化。

## 真正受到最大冲击的，可能不是 Terence Tao，而是现在刚读博士的学生

WIRED 采访 Cornell 数学家 Alex Townsend 时，这一层尤其明显。

Townsend 说，从 8 月开始，周围越来越多数学家开始询问：

应该了解哪些 AI 工具？

怎样订阅能力更强的模型？

他自己的感觉是同时兴奋和焦虑：AI 能让他完成过去完成不了的事情，但这也自然带来一个问题——如果机器越来越能完成数学家的核心活动，人类研究者的角色到底是什么？[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

这个问题对资深教授和研究生并不对称。

一个已经有二十年经验的数学家拥有：

问题选择能力。

领域直觉。

声誉。

学生网络。

历史知识。

他可以把 AI 当成乘数。

一个刚开始 PhD 的学生过去却需要几年时间通过做“还不那么重要的小问题”学习怎样成为研究者。

如果这些 entry-level research problems 第一时间都能被 agent system 打穿，那么训练链本身可能断掉。

数学界过去默认：

学生先学已有证明。

做小问题。

慢慢获得 taste。

最后才开始提出真正重要的问题。

如果机器把中间一大段练习空间自动化，人类未来从哪里获得下一代 Terence Tao？

这也是 Leiden Declaration 特别强调学生和 early-career mathematicians 的原因。它认为 AI 对他们的影响可能不只是就业竞争，还可能改变培养数学判断力的路径本身。[莱顿宣言](https://leidendeclaration.ai/)

## 但最现实的问题仍然是：数学家很难真的集体退出 AI

这就是 WIRED 文章最强的地方。

Andreas Thom 尽管有上述疑虑，仍然继续使用 ChatGPT。

他调整了隐私设置，希望工作内容不被用于训练，然后继续让模型帮助写论文，因为效率确实非常高。

Buckmaster 也继续使用 Codex。

他们并不是不知道风险。

恰恰是最理解风险的人之一。

但生产率提升已经非常具体。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

Thom 对年轻数学家的判断尤其现实。

如果整个领域开始使用 AI，而你坚持不用，你可能逐渐被隔离。

你的论文写得更慢。

探索空间更小。

无法跟上使用 agent 的同行。

因此他认为完全抵制并不可持续。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

截至 9 月 25 日，另一个更早发布、更系统的 **Leiden Declaration on Artificial Intelligence and Mathematics** 已经达到 **4,188 名签署者**，并获得 International Mathematical Union 的 endorsement。它并没有要求禁止 AI，而是要求透明披露工具使用、保留人类作者对正确性的责任、认真追踪 attribution，并尽可能遵守开放科学原则。[莱顿宣言](https://leidendeclaration.ai/)

这种选择其实非常值得注意。

数学界最严肃的一批批评者最终提出的并不是：

**stop using AI。**

而更接近：

**重新定义怎样算负责任地使用 AI。**

这本身就是对“退出不再现实”的承认。

## Navier–Stokes 事件还暴露了另一件事：未来科学发现的竞争单位可能从“一个实验室”变成“多少 agent-hours”

下面开始是我的延伸判断，不是 WIRED 原文的直接结论。

OpenAI 的 Navier–Stokes 数据非常值得从 AI infrastructure 的角度重新看。

大约一万个并发 agents。

1300 亿 output tokens。

88 小时。

随后 17 小时 formal verification。[OpenAI](https://openai.com/index/navier-stokes-solution/)

这里真正改变科研竞争的不是单个模型 IQ。

而是 **parallelism**。

一个数学家可以一天想十条路线。

一个 agent swarm 可以同时探索上万条。

大部分都失败没有关系。

如果其中一条找到结构，另一批 agents 再批判、修补、形式化，研究过程就越来越像大规模 search。

这和我们前一天看到 Anthropic 用近千个 biological agents 去 genome mining，其实指向同一个方向：

**science is becoming an inference workload。**

过去科学计算主要意味着模拟天气、蛋白折叠或求数值解。

未来越来越多 compute 可能花在：

读文献。

生成 hypothesis。

尝试证明。

搜索反例。

写代码。

批判另一个 agent。

形式化结果。

这会创造一种非常不一样的 AI demand。

一个普通 ChatGPT 用户可能每天产生几万 tokens。

一个科研问题可以一次燃烧 **上千亿 tokens**。

因此从算力产业看，我认为 research agents 是目前被低估的 inference TAM 之一。

## 但这同时会制造一种非常严重的资本不对称：数学第一次可能成为需要巨大资本才能参与最前沿竞争的学科

这是我认为 WIRED 这篇文章更深的一层含义。

实验物理一直需要昂贵设备。

生物学需要实验室。

天文学需要望远镜。

但纯数学历史上非常特殊。

理论上一个研究者需要的资本非常少：

纸。

电脑。

图书馆。

时间。

因此一个小大学里的天才和一家 trillion-dollar company 至少在“能不能思考同一道题”这件事上处于相对接近的位置。

Agent swarm 可能改变这一点。

如果解决一个顶级数学问题最有效的方法变成：

一万个 frontier-model agents。

上千亿 output tokens。

大量 inference infrastructure。

formal-verification cluster。

那么研究能力就会开始与资本投入绑定。

Cornell 的 Townsend 在 WIRED 里问的那个问题因此非常关键：

当 trillion-dollar companies 也开始直接参与 mathematical discovery，一个普通人怎样竞争？[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)

这不是说个人数学家会立刻消失。

真正重要的 conceptual breakthroughs 仍可能来自人。

但 frontier exploration 的边际成本已经开始不同。

未来一个教授提出一个非常好的 idea 后，可能面临这样一个现实：

自己花一年研究。

或者一家 AI lab 当晚启动 5,000 个 agents 把附近所有路线都跑一遍。

这会改变科学中的 timing、secrecy 和 collaboration incentives。

过去数学家愿意在 seminar 里公开未完成的 idea，因为共同体信任“idea 到完整证明还有很远”。

如果 agent 能把这个距离从两年缩成两天，研究者就可能越来越不愿分享 work-in-progress。

那反而会损害科学最重要的开放协作机制。

## 从投资角度看，这件事对 OpenAI、Anthropic 或 Google 的价值，远远不是那个 100 万美元 Millennium Prize

OpenAI 已经明确表示不会申请这项证明对应的 Millennium Prize。[OpenAI](https://openai.com/index/navier-stokes-solution/)

而且无论它为这次 agent campaign 实际花了几百万还是更多 compute，与 100 万美元奖金相比都没有直接商业意义。

真正的价值是 capability signal。

如果同一类系统最终能够可靠解决：

数学证明。

芯片设计。

算法优化。

药物靶点。

材料设计。

工程问题。

那么企业购买的就不再只是“聊天模型”。

而是一种可并行扩展的 **R&D labor**。

这会显著提高 frontier-model inference 的潜在愿付价格，因为一个价值数亿美元的研发项目，不会像普通消费者一样在意每百万 tokens 多花几美元。

从这个角度，我认为未来最值钱的 AI benchmark 可能越来越不是 MMLU 或 coding leaderboard，而是：

**每投入一百万美元 compute，能够产生多少真正新知识。**

这会让 formal verification、agent orchestration、scientific data infrastructure，以及能够保存完整 provenance 的 research tooling 都变得更重要。

## 但数学界现在提出的反对意见也提醒我们：科学不是只有“答案产量”这一种生产率

这也是我认为《Mathematicians Feel Threatened by AI. They Can’t Quit It》最值得读的原因。

如果只看 AI 行业，Navier–Stokes 是一个近乎完美的 demo：

一个 90 年开放问题。

一个尚未发布的新模型。

一万个 agents。

88 小时。

Lean 验证。

任务完成。

可从数学家的角度看，故事远没有结束。

谁应该获得 credit？

模型究竟继承了哪些人的 ideas？

谁来把机器证明变成人类能够理解的 mathematics？

如果一个问题被算力打穿，但没有培养出任何新的数学家，这算不算同样成功？

如果学生不再经历寻找证明的失败过程，他们还能不能学会提出好问题？

如果所有人都必须订阅三家 AI lab 才能有竞争力，数学还是原来那种开放的知识共同体吗？

这些问题没有 benchmark。

但它们决定 AI 最终是在**扩大数学能力**，还是只是在扩大数学答案的产量。[Math and AI](https://mathandai.org/)

我认为这篇文章真正记录的是一个比“AI 解出一道名题”更大的转折：**知识工作第一次进入这样一个阶段——专业人士已经足够清楚地看到工具可能威胁自己的职业结构，却又因为工具太强而无法理性地拒绝它。** 这不只是数学的未来。软件工程、法律、科研、设计、金融分析都会面对同一个问题。最难的选择将不再是“用不用 AI”，而是当所有人都不得不用时，如何重新设计 attribution、训练、竞争和责任制度，使生产率提高之后，原本让一个职业值得存在的那些东西没有一起被优化掉。[WIRED](https://www.wired.com/story/mathematicians-cant-quit-ai)
