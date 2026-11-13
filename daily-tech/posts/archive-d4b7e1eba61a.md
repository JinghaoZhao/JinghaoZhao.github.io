# 今日科技长文：AI 最重要的下一步，可能不是“模型更聪明”，而是把整个智能生产流水线都变成模拟世界

今天推荐 Latent Space / AINews 于 **2026 年 8 月 22 日**发表的长文 **《10% worse, 100x cheaper, 10000x faster: Why Simulation is taking over》**。文章属于 **Latent Space 付费内容**，作者团队运营的 Latent Space 是目前较有影响力的 AI Engineering 技术媒体之一，订阅者接近 20 万。原文提出了一个我认为非常值得单独建立 mental model 的判断：从 2022 年开始，制造 AI 所需要的每一层“人类输入”，都在逐步被 AI 自己生成的模拟版本取代。最早被替换的是评分者，随后是训练数据、老师、课程设计、研究员、强化学习环境，甚至连真实用户本身都开始能够被模拟。[阅读 Latent Space 原文](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x) [Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

文章标题里的 **“10% worse, 100x cheaper, 10000x faster”并不是一个严谨适用于所有场景的统一 benchmark**，而是作者用来概括模拟经济学的比喻：一个 synthetic replacement 即使暂时不如真人，但只要便宜两个数量级、速度快几个数量级，就可以运行真人根本无法承担的实验次数。真正决定它是否能够取代真人的关键，也不是生成质量什么时候达到100%，而是**什么时候出现足够可靠的 verification mechanism，让你可以从海量廉价模拟里识别出正确结果**。这是整篇文章最重要的观点。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

## AI 发展正在出现一个非常奇怪的递归：训练 AI 所需要的人，正在一个接一个变成 AI

传统理解中，训练一个模型大概需要这样一套人类生产链。人类写数据，人类决定什么是好答案，人类设计 curriculum，人类做实验，人类搭建测试环境，最后再找真人用户测试产品。

Latent Space 的观察是，这条链并没有某一天突然“全自动化”，而是过去几年一层一层翻转。每一层最开始都有同样的反对意见：synthetic data 会导致 model collapse，AI judge 会偏袒 AI 输出，自动生成的 RL 环境会有漏洞，模拟消费者和真人肯定不一样。

这些质疑往往完全正确。

问题在于，synthetic version 不需要在第一天就比真人好。只要它**足够接近真人，同时成本和速度具有数量级优势**，工程师就会寻找一种办法过滤错误，然后把剩下的规模优势吃掉。

文章把这一过程追溯到 2022 年。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

## 第一个被模拟的其实不是训练数据，而是“老师打分”

今天大家看到 RLHF，已经觉得 reward model 很普通，但作者提醒，这其实是第一次非常重要的“人类从智能生产流水线退出”。

InstructGPT 的方式，是先让真人比较一批模型答案，告诉系统哪个更好，然后用这些人类 preference 训练一个 reward model。接下来真正大规模训练 policy 时，已经不需要真人每次都回来评分，模型直接优化另一个模型给出的 reward。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

换句话说，人类只提供了一小批“如何判断”的示范，之后那个判断行为本身就被软件复制了。

Anthropic 后来的 Constitutional AI 又往前走了一步。系统按照一套原则，让 AI 自己批评自己的回答，再根据 AI feedback 改进，也就是 RLAIF。与此同时，LLM-as-a-judge 逐渐进入 benchmark 和产品评估，MT-Bench、AlpacaEval 等工作证明，在很多开放式语言任务上，用模型比较两个模型的答案已经足够实用。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

这里第一次出现了后来不断重复的模式。

不是“AI 完全和真人一样会评价答案”以后，人类评审才消失。

而是当 **AI judge × 大规模 × 便宜** 的组合，经过 agreement test 和人工抽查之后已经足够可靠，系统就开始把绝大部分评价工作交给模型。

这会成为后面所有 synthetic substitution 的模板。

## 接下来被替换的是大家原本以为最不可替代的东西：人类写下来的训练数据

第二次翻转发生在数据层。

Microsoft 2023 年的 Phi 工作非常有代表性。phi-1 只有约 **13 亿参数**，训练只用了 8 张 A100、约四天，其中训练集包含经过筛选的约 60 亿 token 网页数据以及用 GPT-3.5 合成的大约 10 亿 token 教科书和练习。即便体量很小，它在 HumanEval 上达到 50.6% pass@1，在 MBPP 上达到 55.5%。原论文的重点并不是证明“小模型超过所有大模型”，而是证明高质量、人工设计感很强的 synthetic curriculum 可以让单位训练计算产生明显更高价值。[arXiv](https://arxiv.org/abs/2306.11644)

苹果的 WRAP 又把这个思路推得更远：既然网页本身质量参差不齐，不一定非要把原网页原封不动塞给模型，可以先让另一个模型重写、整理，再训练下游模型。Latent Space 把这个方向概括为 synthetic data 从辅助材料逐渐变成工业化的数据生产管道，并指出到 2025 年，强模型生成的 reasoning traces 已经成为 pretraining 或 mid-training 的常见组成部分。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

于是一个过去看似非常牢固的假设开始松动：LLM 最终必须吃“人写的互联网”。

实际上，模型越来越多在吃**其他模型加工、解释、重组甚至完全生成的互联网**。

这并不意味着真人数据失去价值。恰恰相反，优质真人数据越来越像 seed、ground truth 或校准集，而不再承担全部 scale。

## 再下一步，老师也变成了模型

Alpaca 是另一个历史节点。

Stanford 当时使用强模型生成 instruction-response pairs，再对较小模型做成本极低的 fine-tuning。Latent Space 特别提到其训练成本只有大约 **600 美元**，但模型已经能够复制相当大一部分强模型表现。随后 Vicuna 用真实共享对话做类似工作，Microsoft Orca 则进一步让 teacher 不只是给出答案，而是提供更丰富的解释和 reasoning signal。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

后来 distillation 不再只是“抄老师作业”。

更成熟的方法会让 student 在自己实际会访问到的状态分布中学习，从而缓解训练和推理分布不一致的问题。到 DeepSeek-R1 发布时，同时发布一系列 distilled models 已经不再让行业觉得奇怪：一个巨大模型负责昂贵地产生 reasoning capability，再把能力压进更小模型，几乎已经成为标准产业模式。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

这里最值得注意的是经济意义。

如果 frontier model 的一次训练创造了一种新的推理方法，那种能力并不只能存在于这一个模型里。它可以成为“教师资本”，继续生产更多便宜 student models。

所以计算资源开始产生第二层复利：不仅第一次训练结果值钱，**它还可以继续制造其他模型的训练数据。**

## 真正开始闭环，是 AI 不仅回答题，而且开始决定“下一道题应该是什么”

前面几层仍然可以理解成：人类设计整个学习过程，模型只是帮忙生产输入。

curriculum synthesis 改变了这一点。

Self-Instruct 很早就证明模型可以自己生成 instruction；STaR 让模型通过自己产生 reasoning traces，筛出成功答案，再把这些推理拿回去训练自己。后来 Self-Rewarding Language Models、SPIN 等工作进一步把 generation、evaluation 和 improvement 连起来。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

Latent Space 对这一阶段的概括很准确：过去 ML researcher 很重要的一种“taste”，就是决定下一轮模型究竟应该练什么。

哪些例子太简单？

模型在哪类任务上失败？

下一批数据应该增加数学，还是 coding，还是 tool use？

现在模型开始自己回答这些问题。

这就与传统 synthetic data 有本质差别。传统 synthetic data 是人说“请给我100万道数学题”，模型负责生产。

闭环 curriculum 则是模型先分析自己哪里不会，再决定应该生成什么题来补弱点，之后又自己检查学习效果。

一旦这个反馈回路稳定，AI improvement 就开始具备递归特征。

## 然后连“研究员”也开始进入这条循环

文章把 2026 年视为 AI researcher 真正开始从 demo 走向 load-bearing 的阶段。

DeepMind 的 AlphaEvolve 在 2025 年已经展示过让模型结合 evolutionary search 去寻找新的算法；Sakana 的 AI Scientist 则试图自动完成提出研究问题、运行实验和撰写论文的完整流程。

但 Latent Space 认为 Andrej Karpathy 今年 3 月发布的 **autoresearch** 特别具有象征意义，因为它把这个概念简化到了几乎任何人一眼就能理解的程度。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

Karpathy 给 agent 一个真实但非常小的 LLM training codebase。Agent 唯一可以修改的是 train.py，每次实验固定跑 **5 分钟**，然后比较 validation bits-per-byte。如果指标改善就保留修改，没有改善就回退，再尝试下一种改变。

因为每轮只有五分钟，一小时大约可以跑12次，睡一觉大约能跑100次实验。[GitHub](https://github.com/karpathy/autoresearch)

Latent Space 引用 Karpathy 后续更长运行的结果：大约 **700 次实验**里最终留下20项改善，把达到类似 GPT-2 水平所需时间从 **2.02 小时降低到1.80小时**。这里最重要的不是10%左右的改善幅度，而是这些 code changes 是研究员睡觉时由 agent 自动找到的。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

过去一名 researcher 的瓶颈很大程度来自 human clock。

人可以想到一个 hypothesis，改代码，等结果，再读日志，然后重新思考。

Agent 则可以始终保持 loop 运行。

因此 autoresearch 真正改变的不是“AI 有没有产生诺贝尔奖级发现”，而是把最普通、最耗时间的大量 ML experimentation 从人工节奏切换到了 machine-time。

这是下一步 scaling 的基础。

## 但当 AI researcher 可以无限做实验以后，新的瓶颈马上出现：你到哪里找那么多“实验世界”？

这正是文章认为 2026 年真正重要的新方向。

强化学习 agent 需要环境。

要训练 coding agent，你需要真实 repo、bug、terminal、测试系统。

要训练企业 agent，你需要 CRM、邮件、数据库、审批流程以及各种隐藏状态。

如果每一个环境都让人类工程师手工搭建，模型即使一秒钟能做一千次 rollout，也没有一千个高质量工作环境让它练习。

于是 environment 本身必须 synthetic。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

文章用 Z.ai GLM-5.3 的训练管道作为近期案例。

Z.ai 的做法不是让员工手工写大量固定题，而是让 research agents 从真实工作模式中提取任务，再把它们转成长期、多步骤、带隐藏状态的 executable environments。

然后另一个 judge agent 先尝试任务，检查它是否真的可解。

verifier 也由模型生成，而且设计时避免直接看到 reference solution，以降低作弊风险；之后还要通过 oracle、no-op 和 intentionally unsolved state 等测试，确保 verifier 不会把错误行为误判成成功。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

所以这里其实出现了一个非常奇怪的结构：

agent 生成训练场。

另一个 agent 检查训练场有没有问题。

agent 在训练场里完成任务。

另一个 verifier 再给奖励。

最后模型利用这些 synthetic trajectories 更新自己。

Latent Space 用一句很形象的概括：**gym、referee 和 scoreboard 全都开始由模型扮演。** [Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

## 而且今天最稀缺的东西可能已经不是 benchmark，而是“足够真实、又能自动判分的环境”

这会重新解释最近 coding agents 为什么发展得特别快。

代码世界天然适合自动训练，因为它有一种其他行业非常缺乏的东西：**verification is cheap**。

代码编译不编译，可以自动判断。

unit tests 过不过，可以自动判断。

repo 修改以后 benchmark 有没有改善，也可以自动测。

因此 model 可以在很少人类监督的情况下跑几十万次 trial-and-error。

相比之下，“这份董事会战略建议到底好不好”就很难给出 binary verifier。

“这个心理咨询建议会不会在三个月后帮助患者”更难。

“这项新药组合究竟是否提高 survival”则必须经过真实生物实验。

所以，文章真正提出的 scaling law 不是单纯“synthetic data 越来越多”，而是：

**一个领域越容易验证正确答案，AI 就越容易把那个领域的训练循环彻底自动化。** [Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

这是一个比 benchmark score 更重要的产业框架。

## 最反直觉的一步：连“真实消费者”现在也有人尝试模拟

如果 AI 已经可以模拟老师、环境和研究员，那么机器智能生产链里还剩下一个非常基础的人类角色：

**用户。**

产品公司为什么需要 focus groups、user interviews、A/B tests？

因为公司不知道真实人会怎样反应。

如果真人也可以被足够准确地模拟，一部分产品研究同样可以转成 inference workload。

Latent Space 把这个方向追溯到 Joon Sung Park 等人的 Generative Agents，随后特别提到一项模拟 **1,000 名真实个体**的研究。研究者先与每个人进行约两小时访谈，再建立基于这些材料的 agent replica。论文设计了一种很有意思的校准方式：不能要求数字人100%预测本人，因为真人自己隔两周重新回答同一个 survey，也不会100%给出相同答案；研究因此比较 agent 与真人自身 test-retest consistency 的差距。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

Latent Space 给出的概括是，数字双胞胎能够达到真人两周后“复现自己”能力的大约 **85%**。这个结果不是说 AI 已经可以完美复制某个人，而是说明真人本身就是有噪声、不稳定的，因此评价 human simulation 时不能拿 deterministic ground truth 当标准。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

文章随后谈到 Simile。这里有一个很有意思的问题：普通 frontier model 其实未必是好的 consumer simulator。

为什么？

因为 frontier model 被训练得过于理性、合作、清晰。

真实消费者不是这样。

人会冲动。

会忘记自己昨天说的话。

会因为页面按钮颜色改变而做不同选择。

会价格敏感，也会品牌忠诚。

甚至会做明显不符合经济学理性的事。

Simile 因此反过来训练模型恢复人类的 bias、inconsistency 和 causal texture，使用 interviews、transaction records 和注册过的 randomized controlled trials 作为校准材料。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

Shopify 的 SimGym 已经开始尝试模拟 shopper trajectories，腾讯也研究过超大规模 persona simulation。Latent Space 因此提出一个很有冲击力的判断：**focus group、user study，甚至某些 A/B test，正在从“招真人做研究”变成“跑一批 inference”。** [Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

## 如果这一点成立，市场研究的成本结构可能发生巨大变化

这里可以举一个非常直观的例子。

今天一家消费公司准备改 checkout 页面，可能先找几十个人做 interview，然后做 usability test，再把两个版本真正上线，等待几十万用户流量积累出 statistical significance。

这个过程可能需要几周。

如果未来可以先生成10万名经过历史真实交易数据校准的 simulated shoppers，让他们全部走一遍 checkout，10分钟内就能淘汰99个明显不好的设计，再把最后两个候选拿去做真人 A/B test。

即使 simulation 只有真人的90%准确率，也可能极其有价值。

因为它不是要取代最后那次真实实验。

它要做的是**把100个需要昂贵真实测试的假设，先缩小成两个。**

这正是文章标题“10% worse, 100x cheaper, 10000x faster”真正应该理解的方式。

不是 synthetic reality 永远不需要现实。

而是现实从“每一次实验都必须调用”变成了“只在最后几个关键节点调用”。

## 于是整个 AI 自动化最后撞上了一堵墙：物理世界

到了文章最后，作者认为还没有真正被 synthetic replacement 吃掉的一层，是 physical experiment。

Poolside 最近战略调整时提出一个很有意思的区分：有些问题是 **intelligence-bound**，有些问题是 **experiment-bound**。

写软件主要接近前者。

即使今天写不好代码，再给AI更强 reasoning、更长 context、更好的环境和更多 compute，理论上大部分问题都可以靠思考解决。

癌症则不是。

即使把十万名最聪明研究人员突然放进一个房间，他们也不能只靠思考确定一种新药是否安全有效。

药必须合成。

细胞必须培养。

动物必须实验。

最终还需要病人参加临床试验。

现实世界必须给你 feedback。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

这就是为什么 Poolside 认为长期真正稀缺的东西可能是 experimental loop，而不是 intelligence 本身。

如果 AI cognition 最终变得非常廉价，那么能拥有机器人实验室、自动化 chemistry、生物样本、仪器和独家实验数据的组织，会拥有一个模型无法凭空生成的稀缺输入。

## AI for Science 的核心故事于是也可以换一种方式理解

CZ Biohub 正在做 Human Cell Atlas 等项目，希望把真实细胞状态越来越完整地编码进所谓 virtual cell。

一旦 virtual cell 足够好，很多过去必须在湿实验室做的 candidate screening 就可以先在 silico 运行。

Latent Space 提到的数量级是：某些 in-silico 工作流相比 in-vivo 实验可以达到大约 **1000 倍成本和速度优势**。Chai、Xaira、Lila 等公司正在不同环节建设这种 AI-for-science stack。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

但 virtual cell 永远存在一个 fundamental problem：

它是世界的模型，不是世界本身。

如果模型不知道某种 biological interaction，那么它可能极其自信地模拟一个根本不存在的结果。

所以更现实的架构不是“关闭所有实验室，全靠AI做药”。

而是一个越来越极端的漏斗：

AI 在 simulation 中生成百万 hypothesis。

筛成一万。

再筛成一百。

最后把少量最值得验证的 hypothesis 送进 physical experiment。

实验结果再回来更新 simulator。

然后下一轮继续。

如果这个 loop 比竞争对手快10倍，即使大家使用完全一样的 frontier model，最终 scientific progress 仍然可能差巨大。

## 这也解释了整篇文章最重要的一句话：synthetic frontier 的推进，不取决于 generation，而取决于 verification

这一点值得单独理解。

过去三年，人们不断担心 synthetic data 导致“AI吃自己尾巴”。

这个风险是真实的。如果模型生成错误答案，再拿错误答案训练自己，确实可能把错误不断放大。

但实际发生的事情是，每当行业找到一个便宜的 verifier，synthetic data 就突然从危险变成资产。

Phi 的 synthetic textbooks 能工作，是因为数据经过严格 filtering。

LLM judges 能工作，是因为有人测 judge-human agreement。

coding RL 能 work，是因为存在 unit test 和 compiler。

数学 reasoning 可以做 RLVR，是因为答案或 proof 可以验证。

Z.ai synthetic environments 需要 oracle/no-op checks。

模拟真人需要真实调查与 RCT calibration。

virtual biology 最终仍要回 wet lab。[Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)

所以模型生成能力越来越便宜之后，**ground truth 反而越来越贵。**

这和今天市场最关注的“谁拥有最多 GPU”是完全不同的稀缺性框架。

## 我的延伸判断：未来最值钱的数据不一定是“训练数据”，而可能是可以判定 AI 对错的数据

下面是我的判断，不是 Latent Space 原文的直接结论。

如果这篇文章的框架成立，我认为未来数据 moat 会发生一个非常有意思的迁移。

过去大家问：“哪家公司拥有最多 proprietary data？”

未来更应该问：

**哪家公司拥有最好的 proprietary verifier？**

GitHub 很有价值，不只是因为有代码，而是代码可以 build、test、run。

Stripe 有价值，不只是因为有支付文本，而是最终能看到 payment success、fraud、chargeback。

药企有价值，不只是拥有论文，而是拥有 compounds、assays、patient outcome。

工业企业有价值，不只是积累设备日志，而是知道机器最终有没有坏、良率有没有提升、产品到底合不合格。

这些 outcome data 可以让 AI 在 synthetic world 中跑百万次以后重新锚定 reality。

这意味着未来真正有护城河的企业，可能不是拥有最大文档库的人，而是拥有**高频、廉价、可信的现实反馈回路**的人。

从投资角度，这也让我更加重视 AI for science、机器人、工业自动化和自动实验室背后的基础设施。过去很容易认为，当模型越来越聪明以后，所有价值都会集中到 foundation-model labs。但如果 intelligence 本身持续 commoditize，最稀缺的资源可能逐渐转移到模型无法凭空制造的部分：机器人能真正操作的实验室、药物 assay、工厂产线、真实消费者行为以及物理世界传感器反馈。

所以这篇文章最值得记住的不是那个夸张的“10% worse、100x cheaper、10000x faster”。

真正重要的是另一个判断：

**AI 的下一阶段 scaling，可能越来越不取决于模型还能生成多少东西，而取决于我们能用多低的成本告诉模型：“这一次，你到底对不对。”**

过去几年，模型陆续学会了写答案、给答案打分、给自己出题、设计实验、搭建虚拟训练场，甚至模拟接受实验的人。每当 verification 成本下降一层，人类就从流水线里的那一层退出来。最后剩下的，正是那些必须真正碰一下现实世界才能知道答案的事情。

如果这个框架是对的，那么 AI 十年里最重要的基础设施之一，可能不是又一个聊天机器人，甚至不只是更多 GPU，而是**越来越快的 reality-feedback machine：让 AI 在模拟世界里尝试一万次，然后用最少、最昂贵的真实世界实验，把它重新校准。** [Latent.space](https://www.latent.space/p/ainews-10-worse-100x-cheaper-10000x)
