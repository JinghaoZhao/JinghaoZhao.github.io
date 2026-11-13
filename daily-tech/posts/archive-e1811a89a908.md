# 今日科技长文：AI 对就业最早的冲击，可能不是“大规模裁员”，而是先把职业阶梯最下面几级抽掉

今天推荐 Casey Newton 于 **2026 年 8 月 27 日**发表于 Platformer 的深度访谈 **《How AI agents “radicalized” a top Meta exec into quitting her job》**，采访对象是 Clara Shih。文章目前**免费公开阅读**。Shih 的经历很有代表性：她早年在 Google、Salesforce 工作，创业经营 Hearsay Systems 十年，后来回到 Salesforce 负责 Service Cloud，2023 年成为 Salesforce AI CEO 并参与推出 Agentforce，之后又到 Meta 负责 Business AI。她今年春天离开 Meta、转而成立 New Work Foundation，原因并不是她突然变成了 AI 怀疑论者，而是她亲眼看到 agent 把过去需要一整组产品、研究和工程人员完成的流程压缩成一两个人，于是开始主动撤掉自己团队里的 entry-level 招聘岗位。[阅读 Platformer 原文](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/) [Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

我今天选这篇，是因为它提供了一个比“AI 会不会导致失业”更细、更有操作价值的框架。Shih 并没有预测所有岗位会一起消失；她真正担心的是，**企业内部大量“给另一个人准备材料”的中间岗位，以及需要先做几年基础工作才能成长起来的 junior roles，会先被 agent 压缩。** 这与 Stanford Digital Economy Lab 今年 8 月 12 日刚更新的 ADP 薪资数据形成了很强的呼应：研究没有发现全经济范围的大规模 AI 替代，但在 AI 暴露度最高的职业中，22–25 岁年轻人的就业相对于低暴露职业已经出现约 **19% 的缺口**，而更有经验的员工没有出现同样幅度的差异。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/)

## 真正改变 Shih 想法的，不是一个 benchmark，而是 Meta 的一条真实产品流程突然“塌缩”了

Shih 回忆，去年秋天她还在 Meta 负责 Business AI 时，团队仍然沿用非常典型的大公司产品开发流程。

一个新产品想法出现以后，通常先做用户研究，包括 survey 和 interview；然后设计师做 mockup；产品经理把想法整理成 PRD；之后交给前端工程师、后端工程师和机器学习工程师分别实现。

这套流程的重点不是其中任何一步特别复杂，而是需要很多不同技能的人连续 handoff。

Agent 出现以后，他们发现这整条链可以突然缩短。

一两个人可以坐在一个房间里先讨论产品想法，用 vibe coding 快速生成 prototype，再同时找真实用户和 simulated users 测试；只有当方向基本验证以后，才需要一个更小的团队把原型真正工程化进入 production。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

Shih 说，真正冲击她的不是“AI 会写代码”本身，而是看到原来需要 user researcher、designer、PM 和三类 engineer 共同参与的整个过程被压缩以后，她马上开始想同样的方法还能放到哪里。

答案很快扩展到 marketing、distribution、privacy policy 等工作。

过去一个跨部门业务过程可能需要十个步骤、十天时间；现在 agent 先完成大部分中间工作，人类专家只在最后 review，很多流程可以在几分钟尺度得到初步结果。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这个经验最终让她产生了一个很实际、也很不舒服的行为变化：

**她开始撤掉 entry-level job postings。**

不是因为 Meta 当时已经拥有一个能完全替代 junior 员工的超级智能，而是因为在必须快速交付结果的组织环境里，她发现“自己 + AI”比“自己 + 多个 junior handoff”更快。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这件事很重要，因为 AI 对劳动力市场的影响未必先表现为“公司宣布裁掉一万人，因为 AI”。

它完全可能首先表现成：

过去需要招三个 junior，现在只招一个。

过去 analyst 离职以后会补 headcount，现在不补。

过去一个 senior manager 会向下面分任务，现在直接把任务交给 agent。

这些变化在 headline layoff 数据里非常难看见，但几年以后会直接改变职业人口结构。

## Shih 用 David Autor 的研究框架，把 AI 对工作的影响分成三种完全不同的机制

她反对一种非常粗糙的讨论方式：问“这个职业会不会被 AI 替代”。

因为一个职业本质上是很多不同任务的组合，真正重要的是 AI 自动化的是哪些任务，以及这些任务占整个岗位价值的比例。她借用了 MIT 经济学家 David Autor 一类 task-based labor economics 的思路来解释三种可能结果。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

第一种情况最直接：AI 自动化了岗位中很大比例的核心任务。

翻译和 customer service 是她举出的例子。

在这种情况下，并不需要100%的岗位消失才算 disruption。只要需求减少到足以让工资、晋升机会和长期职业吸引力明显下降，这个职业就已经发生实质替代。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

第二种情况则是 AI 乐观派最希望看到的 augmentation。

AI 只自动化比较机械、重复的部分，人类因此把更多时间转向更高价值任务。例如软件工程师不再自己写大量 boilerplate 和 test cases，而把时间用于 architecture、需求判断和复杂设计。

如果 productivity 提高又同时刺激需求增长，就可能出现 Jevons paradox：每单位软件开发成本下降，市场反而想要更多软件，于是工程师总需求没有下降，甚至上升。

Shih 认为 software engineering 很可能仍然接近这种情况，radiology 等领域也可能出现类似结果。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

真正最容易被忽略的是第三种情况。

AI 没有减少职位数量，甚至让行业创造了**更多岗位**，但它自动化了原本让专家稀缺的那部分技能，于是进入行业的门槛突然下降，大量新的劳动供给涌入，最终工资和岗位质量下降。

Shih 用出租车司机举例。

过去在陌生大城市成为出租车司机，本身需要非常强的地理知识。GPS 导航把这种专业知识商品化，再叠加 Uber 等 rideshare 平台降低进入门槛，于是大量新司机可以进入市场。

乘车价格下降以后，需求确实扩大了；但需求不可能无限增长。当乘车需求最终趋于饱和，而司机供给还继续增加时，结果就可能是“工作数量更多，但这个职业不再是好工作”。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这个框架对于 AI 特别有用，因为它提醒我们：

**“AI 没有减少就业人数”并不等于 AI 没有伤害某个职业。**

工资、议价能力、进入壁垒和职业质量可能先恶化。

## 她对自己亲手参与开发的 Agentforce，有一个非常值得注意的反思

Shih 曾负责 Salesforce AI，并参与 Agentforce 的推出。

Marc Benioff 此前曾公开称，AI 使 Salesforce customer support 人员从大约 9,000 人降到约 5,000 人。Newton 因此直接问她：当时开发这些产品时，有没有意识到它最终可能减少客服岗位？[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

Shih 的回答很坦率。

她说这个可能性当然存在于大家脑后，但当时团队主要处于技术兴奋之中。她自己相信的是那种最乐观的 augmentation narrative：AI 会自动完成机械工作，让客服人员腾出时间处理复杂问题、客户关系和更高阶任务。

现在回头看，她认为这种情况“有一点发生了”，但**主要并没有发生**。

换句话说，原本预期的路径是：

AI 做简单 ticket → 人去做复杂工作。

真实发生的情况更接近：

AI 做简单 ticket → 公司发现需要的人变少了。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这其实揭示了很多 AI productivity 讨论里一个经常被忽略的问题。

技术上存在“让人类升级去做更复杂工作的可能性”，并不意味着企业一定会采取那条路线。

如果企业面对成本和竞争压力，更直接的经济选择可能就是减少 headcount。

## Stanford 最新数据为什么让 Shih 的担忧不再只是个人感觉

Shih 特别提到，宏观环境当然也会影响年轻人就业，包括高利率、科技行业前几年过度招聘以及周期性因素，因此不能简单把所有 entry-level weakness 都归到 AI。

但 Stanford Digital Economy Lab 使用 ADP 数百万美国员工的行政薪资数据进行的最新更新，为 AI 作为独立变量提供了更强证据。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/)

研究截至 2026 年 6 月的数据首先给出一个非常重要的反面结论：**目前没有证据显示 AI 已经造成整个美国经济范围的普遍就业崩塌。**

这是不能跳过的限定。

如果只看 aggregate employment，最暴露和最不暴露 AI 的职业之间差异仍然相对有限。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/news/canariesaug26/)

但把数据按年龄拆开以后，情况明显不同。

在22–25岁 early-career workers 中，AI exposure 最高的两组职业自 ChatGPT 推出以后出现明显下降，而低暴露职业仍然增长。随着年龄上升，这个差异越来越小，到资深员工群体基本消失。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/?ref=platformer.news)

Stanford 最新修订给出的 headline estimate 是：在高度 AI 暴露职业里，22–25岁年轻人的就业水平已经比“如果他们与低暴露职业年轻人保持同样就业趋势”低约 **19%**。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/)

而且这个差距从2025年第一次观察到以后仍然在继续扩大。

软件开发就是一个非常典型的案例。Stanford 的 dashboard 显示，young software developers 就业明显下降，而年龄较大的开发者群体反而继续扩张。Customer service 也出现类似结构。反过来，home health aide 这种需要大量面对面关系和物理劳动、AI exposure 较低的职业，年轻人的就业反而增长得更快。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/?ref=platformer.news)

这不证明 AI 是所有变化的唯一原因，但它与 Shih 的机制高度一致：

**企业没有首先淘汰“最贵的 senior”，反而先减少那些本来负责基础执行、资料准备和学习性任务的 junior。**

## 更关键的是：Stanford 发现“AI 使用很多”还不够，真正危险的是 automation ratio

Stanford 还把 ADP 的就业变化与 Anthropic Economic Index 联系起来，区分一个职业中的 AI 使用到底更多属于 augmentation，还是 automation。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/?ref=platformer.news)

augmentation 指的是人和模型协作。

automation 则更接近用户把整个任务完整交给 AI。

结果非常值得注意。

在年轻员工中，一个职业的 **automation ratio 越高，就业表现越差或增长越弱**。

但 augmentation ratio 并没有出现同样清晰的单调关系。[Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/?ref=platformer.news)

这其实给“AI exposure”这个经常被滥用的概念加上了一个很重要的维度。

两个职业都可能大量使用 AI。

一个职业里，员工每天用 Copilot 帮自己更快工作。

另一个职业里，公司直接让 agent 把原来某个员工的整个流程跑完。

前者有可能提高劳动需求。

后者才更容易直接减少 headcount。

因此以后判断哪些 SaaS、BPO、white-collar occupations 最危险，单纯问“AI 能不能完成这里的任务”已经不够。

更重要的问题是：

**实际生产环境里，人究竟仍然拥有 workflow，还是 workflow 已经交给 agent，人只负责 exception handling？**

## Shih 认为企业最危险的一类岗位，是“给别人准备 artifact 的人”

这是整篇访谈我认为最有价值的职业分类。

Shih 估计，大约 **五分之一的公司岗位**，本质工作是为公司里的另一个人准备某种 artifact。

她举的例子包括准备 brief、制作 slide deck、为销售人员准备 order form 等。这个“五分之一”是 Shih 自己的预测和经验判断，并不是已经被统计研究验证的精确比例。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这些岗位有一个共同特点：

最终对外负责的人并不是他们。

例如 salesperson 最终面对客户。

recruiter 最终面对候选人。

senior lawyer 最终面对监管机构。

而中间可能存在大量 analyst、associate、coordinator 和 operations roles，负责把信息加工成供前线负责人使用的材料。

过去这种组织结构合理，是因为 senior 人的时间最贵。

所以你让 junior 收集资料、做模型、写初稿、准备 slide，再让 senior review。

Agent 改变了这个经济学。

如果 senior 本人可以直接告诉 AI：

把过去三个季度销售数据拉出来。

整理客户背景。

生成 deck。

指出风险。

再给我一版谈判方案。

而整个过程只需要几分钟，那么协调一个 junior 员工、解释任务、等待几个小时甚至几天，再 review 的管理成本可能反而更高。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

因此 AI 最先压缩的未必是最终“负责决策”的岗位。

它可能先压缩**围绕决策者存在的组织层。**

这和很多人想象“AI 会先替代 CEO 还是 programmer”完全不同。

## 这会带来一个非常严重的人才管道悖论：如果 junior 消失，未来 senior 从哪里来？

Shih 没有把这个问题完全理论化，但她在访谈里指出了一项核心矛盾。

真正有效地使用 AI，需要两种能力。

首先，你得拥有足够的 domain knowledge，能够给模型提供正确 context。

其次，你得知道什么输出是好的、什么是错的，并能 critique 和 refine 结果。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

这意味着 senior employee 通常非常适合使用 agent。

因为他已经知道什么叫好工作。

但一个刚毕业的人恰恰没有这些经验。

如果 junior 只把任务交给 Claude，然后原样把 Claude 的回答传给老板，他几乎没有创造价值。

问题在于：

**这些 senior 的判断力最初又是怎么来的？**

通常正是多年完成那些“AI 最容易自动化”的基础工作积累出来的。

律师通过审合同学会哪些条款危险。

分析师通过自己建模型学会数字之间的关系。

程序员通过修 bug 学会系统怎么坏。

医生通过处理大量常规病例形成 clinical intuition。

如果组织发现 AI 可以直接承担这些 apprenticeship tasks，从短期 P&L 来看，减少 junior 招聘非常合理。

但十年后就可能发现缺少真正经历过完整学习过程的 senior talent pipeline。

这很像把公司内部的“学校”拆掉，只保留毕业生。

## Shih 对软件工程师反而极度乐观，甚至预测工程师会“吃掉”法律、营销和会计的一部分工作

这也是访谈最反常识的一段。

因为 coding 是目前 AI 进步最快的领域之一，很多人自然认为 software engineer 会最先受到冲击。

Shih 反而认为 software engineers 可能比今天最乐观的预测还要更多。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她的理由不是“AI 不会写代码”。

恰恰相反，是因为代码会越来越由 AI 写。

她认为计算机科学训练真正有价值的东西，会从 syntax 和 implementation 迁移到另一套思维：算法化思考、模块化、把复杂流程拆成可重复系统，以及定义输入输出。

这正是未来设计 multi-agent systems 所需要的能力。

你需要决定 agent A 做什么。

什么时候调用 agent B。

它们共享哪些 context。

怎样检查输出。

哪个步骤需要 human approval。

怎样建立 eval。

怎样让失败自动回滚。

这些本质上是 system design。

所以她提出了一个很大胆的 hot take：

未来很多现在被称为 legal、marketing、accounting 的工作，可能逐渐被拥有工程思维的人接管。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

不是软件工程师突然获得律师资格，而是大量原本属于这些部门的**信息处理 workflow**会越来越像编排软件系统。

这其实暗示了一个职业边界的变化。

过去知识工作的组织结构按照学科划分。

未来可能越来越按照：

**谁能定义、运行和验证 agent workflow** 来划分。

## 这与“所有公司只招超级明星”之间存在一个明显矛盾

Newton 在访谈中把两个相反观点摆在一起。

Wabi 创始人 Eugenia Kuyda 此前告诉他，公司现在更偏向只招聘所谓“star athletes”，因为 AI 可以极大放大最优秀员工的产出，一个极强的人配 agent 可能抵过去整个团队。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

AWS CEO Matt Garman 则表达过完全相反的观点：因为 AI 就不招 junior，是非常愚蠢的，因为组织仍然必须培养未来人才。

两边其实都可能正确。

从单个 manager 的短期最优解看，当然应该招聘已经非常优秀、能够独立判断 AI 输出的人。

但如果所有公司都这么做，整个经济就出现一个 collective-action problem：

每家公司都想雇已经训练好的人。

却没有公司愿意支付训练这些人的成本。

过去 junior salaries、低效率和 mentorship 时间，本质上就是企业承担的一部分 human-capital formation 成本。

AI 可能让这个成本突然显得非常容易削减。

## 这也是为什么 Shih 辞职以后没有去再做一个 AI SaaS，而是开始做年轻人的职业基础设施

她今年春天离开 Meta，但仍保留 senior advisor 身份，并创办 New Work Foundation，以及面向年轻人的 Dear CC。

这些项目目前全部免费。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

其中 Field Report 希望告诉学生不同专业和职业的 AI exposure。

Game Plan 则把找工作失败的人匹配给同龄人和 mentor。

Shih 解释说，她观察到一个很强的心理问题。

很多 Gen Z 毕业生完全按照社会告诉他们的路径走：上大学、选看起来有前景的专业、实习、毕业。

但进入市场以后发现那些本来应该存在的 entry-level jobs 明显更难获得。

部分人还有 student debt。

他们很容易把这个结果理解成个人失败，而不是劳动力市场正在经历结构变化。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

Dear CC 自己的调查发现，失业到大约第六个月时，一些年轻人的 self-worth 和 identity 开始明显受到影响。

因此 Shih 刻意不把 mentoring 本身自动化。

这是一个很有意思的选择：一个刚刚因为 agent 能力太强而离开 Meta 的人，建立新机构以后反而明确说——这里不要用 AI mentor 替代真人。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她认为求职者真正缺乏的很多时候不是又一份 AI-generated advice，而是人与人的 accountability、motivation、trust 和 social connection。

这也说明 AI substitution 的边界并不完全由技术能力决定。

有些事情即使 AI 可以“完成任务”，人仍然可能更愿意由真人承担。

## 她为什么不同意 Andrew Yang：UBI 可能解决收入，却不能自动解决“工作消失以后人为什么起床”

New Work Foundation 的 founding advisor 之一是 Andrew Yang，因此 Newton 自然问到 UBI。

Shih 明确表示，她不认为 UBI 单独就能解决这个问题。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她当然承认收入是第一层。

一个人首先必须有 living wage。

但她认为工作还长期提供另外三种东西：autonomy、mastery 和 purpose。

过去几百年的现代社会中，人们的大量身份认同、成长和社会参与都是围绕职业建立的。

因此即使 AI productivity 足够高，社会能够给每个人一张支票，也不能假设所有问题自动消失。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她举了家乡 Arlington Heights 一个已经运行多年的社区项目。

当地把退休人士和其他志愿者与八九十岁的老人连接起来，陪他们去看医生、牙医或者买东西。

从纯经济效率看，这些任务完全可以 DoorDash、Instacart 或雇佣护理人员完成。

但项目真正创造的价值是关系、社区和 purpose。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

因此她认为，如果未来 AI 真释放出大量人类时间，政策也许应该思考 national service 或 local service 之类的机制。

学校、养老院和社区里仍然存在大量没有被满足的人类需求。

问题未必是“世界没有事情值得人做”，而可能是**市场不再愿意为这些事情支付足够工资。**

## 对大学生而言，她最不建议做的事情反而是“去找一个最不容易被 AI 替代的专业”

访谈最后，Newton 问了一个非常现实的问题。

如果一个大学二年级学生本来准备以后读 law school，但现在看到法律行业 AI exposure 很高，应该怎么办？

Shih 的回答核心并不是让他马上换专业。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她首先认为应该真正找到愿意深入学习的领域。

原因不是浪漫主义，而是未来浅层知识越来越容易商品化。如果某个人只是“知道一点法律”“知道一点营销”，模型很容易达到同样水平；真正 deep domain expertise 的相对价值反而可能上升。

与此同时，她认为学生必须学习真正的 agent skills，而不是“会用 ChatGPT”。

她区分得很明确。

未来需要理解 context 怎样组织、tool calls 怎样运行、agent 怎样编排，以及怎样建立 eval 来判断结果。

最好的学习方式不是上一个“AI literacy”课程，而是自己真正 ship 一个东西。

例如学法律的人可以做一个帮助用户申诉 parking ticket 的 agent。

是否成功的标准也不是老师打分，而是有没有一个与你无关的人真的愿意使用它。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

她最后强调的是 people skills 和社会网络。

未来几年职业路径可能不再是“找到一份工作，然后十年稳定升级”。

更可能是不断变化、不断重新组合。

因此个人不仅需要 financial safety net，也需要由朋友、导师和同行组成的 social safety net。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)

## 我认为这篇文章真正改变了一个很重要的判断：AI 的就业冲击应该看“组织图”，而不只是看职业名称

下面是我的延伸判断，不是 Platformer 或 Clara Shih 的直接结论。

过去我们判断 AI 对就业的影响，经常把职业放进一个表格：

程序员，70% 可自动化。

律师，50%。

客服，80%。

医生，20%。

我越来越觉得这种方式容易误导。

Shih 的 Meta 经历展示的真正变化，不是“产品经理这个职业被自动化了67%”，而是**过去围绕一个产品构建的一整条组织链被重新设计了。**

真正的问题应该是：

过去完成一个 business outcome 需要几个人？

这些人之间有多少 handoff？

哪些岗位最终拥有 decision rights 和 external accountability？

哪些岗位主要负责把信息从 A 变成 B 再交给另一个人？

当 agent 可以直接连接 A 和最终决策者时，中间哪些组织层还需要存在？

从这个角度看，我认为 AI 最早压缩的很可能是 **organizational middleware**。

人类公司过去需要大量 analyst、coordinator、associate、PM、operations 等角色，很大一部分原因是人的 context window 很小，信息传递昂贵，所以需要靠层级和 specialization 管理复杂度。

Agent 的 context、tool use 和 memory 如果持续提高，相当于降低了企业内部的信息交易成本。

这有点像 Coase 的经典公司理论：公司边界取决于内部协调成本与市场交易成本之间的比较。

AI 可能不是简单减少某项劳动，而是在降低**组织内部的 coordination cost**。

如果这个 thesis 成立，未来大公司的 org chart 本身会变薄。

## 投资上真正需要关注的，也不是“AI 会不会让失业率升高”，而是 wage share 和企业利润怎样重新分配

从市场角度，我认为这篇文章与 Stanford 的 19% young-worker gap 放在一起看，比单纯预测 unemployment rate 更有价值。

如果最早变化发生在 hiring 而不是 layoffs，那么宏观失业率可能很长时间都看起来正常。

资深员工继续工作。

经济继续增长。

AI CapEx 很强。

企业利润甚至提升。

但每一届毕业生进入 white-collar occupations 的入口逐渐缩窄。

这可能产生一种非常奇怪的经济状态：

**GDP 很好，利润率很好，股票很好，但年轻知识工作者的收入和职业预期明显恶化。**

企业层面则可能出现 operating leverage。过去 SaaS、金融、咨询、广告、保险等知识密集型企业收入增长需要同步增加大量员工；agent 如果真的压缩“准备 artifact”和内部 handoff 的岗位，revenue per employee 可以显著提高，工资成本占收入的比例下降。

这对拥有强 distribution、customer relationship 和 proprietary workflow 的 incumbent 企业可能是巨大好处。

但与此同时，它也会削弱一批原本依靠“出售白领工时”赚钱的商业模式，包括部分 BPO、consulting、outsourcing 以及低端专业服务。

因此未来值得跟踪的指标，不只是公司说“我们的员工使用了多少 Copilot”，而是更硬的数字：

**营收增长与 headcount 增长是不是开始长期脱钩，尤其 entry-level hiring 是否持续下降。**

我认为这篇文章最值得记住的一句话，不是 Shih 那个吸睛的“一家公司五分之一岗位可能受挑战”。

更重要的是她自己真实做过的那个决定：

**“我把 entry-level job postings 撤掉了。”**

AI 对劳动力市场真正的第一波冲击，很可能不会以“机器人抢走一亿份工作”的形式到来，而是每个 manager 都独立做一个看起来完全合理的小决定：这次不招 analyst 了，我先让 agent 做。

单独看，每一次都很小。

但如果数百万名 manager 同时这么做，职业阶梯的最底下几级就可能在没有任何一场“大裁员”的情况下慢慢消失。[Platformer](https://www.platformer.news/clara-shih-new-work-dear-cc-interview-meta-salesforce/)
