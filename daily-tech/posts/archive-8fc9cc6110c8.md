今天推荐 **Brady Brickner-Wood 于 2026 年 9 月 16 日在《The New Yorker》发表的《My Weekend with an A.I. Agent》**。这是一篇把“agentic AI”从发布会和 benchmark 拉回真实生活的体验型长文，作者连续一个周末使用 Meta 刚推出的个人 AI agent **Muse**，尝试把订餐、购物、二手商品上架、预算管理等琐事交给它处理。《纽约客》页面目前可直接打开，但其数字文章对部分用户可能触发计量式订阅限制。[阅读 New Yorker 原文](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent) 这篇文章尤其值得现在读，因为 Muse 上线后很快冲到美国 App Store 免费榜前列，说明“个人 AI agent”第一次开始从开发者演示进入普通消费者市场。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

我今天没有继续选一篇 GPU、数据中心或 frontier-model 安全文章，是因为这篇文章提出了一个更接近下一阶段 AI 商业化的问题：**当模型终于不只是回答问题，而是真的能点网页、登陆账户、购买东西、发邮件、处理钱和替你完成任务时，消费者究竟愿不愿意把自己的数字生活交给它？** Brickner-Wood 的答案不是简单的“agent 还不够聪明”，而是更有意思的一组矛盾：agent 最有价值的时候，恰恰是你给它最多权限的时候；可权限越多，它对隐私、安全和责任的要求就越接近一个真正的人类助理。与此同时，agent 最擅长自动化的许多事情，本来就是互联网上一代产品曾经承诺已经“极度方便”的事情。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

以下不是原文逐段翻译。我会把文章中的体验、论证和例子重新组织，并用 Meta 官方资料和近期报道区分“作者的判断”“Meta 的产品主张”和已经公开确认的产品事实。

## Muse 真正的新东西不是聊天，而是它获得了一个可以替你行动的“身体”

Brickner-Wood 一开始并不知道该把什么交给 Muse。他自己正同时照顾婴儿、做多份工作、写小说，理论上属于最需要减轻事务负担的人，却发现面对一个“你把任何任务交给我”的 agent 时，第一反应反而是空白。这个细节很重要，因为传统 ChatGPT 式产品天然存在一个清晰交互模式：你有问题，就去问。Agent 的产品逻辑完全不同，它要求用户先把生活中的一部分过程重新理解成“可以外包的 workflow”。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

Muse 故意把这种外包做得很人格化。第一次启动时，它会让用户给 agent 起名字、选择 avatar；Brickner-Wood 最后把自己的 agent 叫作 Harbor，但对那些毛茸茸、拟人化的角色设计明显感到不舒服。他怀疑这种友好视觉语言实际上承担着产品功能：让用户降低戒备，更愿意把个人信息和账户权限交给机器。这个判断是作者自己的解读，而不是 Meta 承认的设计目的。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

Meta 对 Muse 的官方定义则非常直接：它不是一个只提供答案的 chatbot，而是一个能够实际“做事”的个人 agent。Muse 运行在 Meta 云端的一台专用虚拟机里，拥有自己的浏览器，可以连接邮箱、日历、购物、支付、云盘和其他服务；用户可以规定哪些服务可访问，以及它在每项服务里只能读取信息还是也可以执行动作。Meta 还声称，密码和支付凭证保存在隔离存储中，Muse 本身看不到明文凭证；敏感操作如发送邮件和购物会再次请求确认；另有一个与主 agent 隔离的 Sentinel agent 负责审核它准备发往互联网的操作。[Facebook](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)

这套架构意味着 consumer agent 与普通聊天机器人的风险模型已经根本不同。一个聊天模型胡说一句错误餐厅地址，通常只造成信息错误；一个 agent 如果理解错一句话，却已经被授权付款、发邮件或者取消订单，错误就从“语言错误”变成了“现实动作错误”。

## 作者第一次真正让 Muse 干活，是让它订一顿晚饭，结果立刻撞上了 agent 时代最现实的障碍：互联网并不是为机器人设计的

Brickner-Wood 要 Muse 为一家三口预订晚餐，还特别需要儿童高脚椅。Muse 先请求访问他的 OpenTable 账户，再推荐多个餐厅，但推荐质量并不稳定，其中甚至混入了完全不符合作者预期的连锁餐厅。两边经过几轮交流，最终找到一家夫妻俩本来就想去、但使用 Resy 而不是 OpenTable 的餐厅。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

真正执行预约时，系统却卡住了。Muse 尝试登陆 Resy，遇到登陆问题，随后又连续撞上 CAPTCHA 和人机验证；作者明知道自己手动打开网站几分钟就能完成，却为了测试继续让 agent 尝试，最后仍然只能自己订。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这个失败并不是单纯因为 Muse “笨”。它展示的是 agent economy 中一个很基础的基础设施冲突：过去二十年互联网的安全机制，本来就是为了**阻止自动程序像人一样操作网站**。CAPTCHA、防 bot、反欺诈、速率限制、双因素认证全都在把机器挡在门外；现在科技公司却希望部署几十亿个“合法 bot”，替真人操作同一批网站。

这已经不是理论问题。近期一名投资人使用另一款个人 agent Instinct 高频扫描 Resy 抢热门餐厅位置，其账户就因为每小时约 200 次请求而被 Resy 暂停。Resy 的规则禁止未经批准的自动访问，因为平台没有可靠方法区分“替一个真实用户服务的私人 agent”和“黄牛 bot farm”。[Business Insider](https://www.businessinsider.com/resy-suspends-vcs-account-ai-agent-reservation-attempt-2026-9)

所以未来 agent 大规模普及，一个被严重低估的问题会是：**互联网需要重新建立 machine-to-machine permission layer。** 如果每个 agent 都继续像人一样点击网页、破解 UI 和处理 CAPTCHA，这种体系根本无法优雅扩展。

## Muse 最有用的任务，反而不是那些听起来最科幻的事情，而是作者拖了几个月没做的低价值工作

订餐失败以后，Brickner-Wood 开始列自己一直拖延的电脑事务。

他先让 Muse 推荐信用卡。Agent 询问他的消费模式后，建议从 Chase Freedom Unlimited 换成 American Express Gold。文章并没有把这当成特别惊人的“金融智能”，更多是为了展示 agent 可以把搜索、比较和个性化建议串成同一个流程。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

然后效果明显变好。

作者经营一个小型 vintage clothing Depop 店铺，一直想把商品同步到 eBay，却因为太麻烦拖了几个月。他让 Muse 自动复制 listing。过程中仍然不断遇到人机验证，而且 Muse 生成的商品标题非常粗糙，有时只是“Men’s Shirt”“Hat”这种几乎没有搜索价值的名称，但大约一个小时以后，它最终完成了大部分迁移。作者第一次明显感觉到了 agent 的真实价值：不是完成一种人做不到的事情，而是**替他完成一种人完全能做、但一直懒得做的事情。** [The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这个区别非常关键。

很多关于 agent 的生产率模型假设，它主要通过把一个小时的人类工作压缩到五分钟创造价值。但消费者场景可能存在另一种更大的价值来源：它把“永远没有执行的任务”变成“实际完成的任务”。

在经济学上，这不是单纯的效率提升，而是把原本接近零的执行概率提高。

作者的 eBay 店当晚就卖出了一件 15 美元的 T 恤。几天里一共卖掉四件商品。这当然不能证明 Muse 具有正 ROI，但非常具体地说明 agent 的第一个 killer use case 可能不是“成为你的 CEO”，而是清理 backlog。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

## 最有效的一次使用，是把几个月的信用卡账单直接扔给 agent

Brickner-Wood 又上传了几个月的信用卡 statement，让 Muse 为家庭制作预算。

他长期想做预算，却从大学时代开始就一直没有真正坚持下来。Muse 几分钟内整理出电子表格，并给出一些个性化建议，例如减少部分食品支出、检查一笔看起来像重复扣款的交易，并提醒作者现金缓冲比自己感觉的更薄。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这个任务为什么比订餐顺利得多，其实非常能说明当前 agent 的真实能力边界。

预算分析是一个**信息完整、目标明确、环境静态**的问题。所有交易已经存在文件里，不需要和外部网站不断交互，也没有验证码、动态库存或权限冲突。

订餐则是**开放环境任务**。Agent 必须理解用户意图、搜索实时数据、跨多个平台操作、处理认证、面对网站行为变化，而且最终要产生不可逆的现实动作。

所以“模型能不能分析一张表”和“agent 能不能可靠经营一个人的生活”之间，存在巨大的系统工程鸿沟。

文章没有用 benchmark 语言来描述这一点，但整个体验实际上非常清楚地展示了它。

## Muse 的最大产品悖论随后出现：你不给它数据，它就不好用；你把数据都给它，它才真正令人不安

为了保护自己，Brickner-Wood 故意没有把 email 和银行账户直接连接 Muse。

问题是，这也等于主动砍掉了 agent 最有价值的能力。

真正优秀的私人助理必须知道你的航班、日程、财务、购物习惯、家庭成员、联系人和历史邮件。否则你每次仍然需要把所有背景重新解释一遍，agent 就退化回聊天机器人。

Muse 的商业产品正是围绕这种深度上下文设计。Meta 官方表示，它会记住用户在过去对话中提到的信息，在没有明确 prompt 时主动提供建议，还可以从 Instagram 保存内容、朋友饮食限制等历史数据中组合任务。用户可以让系统“忘记”某些信息，也可以选择不让交互用于训练；Meta还表示 Muse VM 中的数据不会直接进入广告系统。[Facebook](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)

但作者并不愿仅凭公司承诺把这种程度的隐私交给 Meta。

他的担忧很大程度来自 Meta 过去在隐私和广告业务上的历史，而不是文章发现 Muse 当前已经滥用数据。这里必须区分清楚。Brickner-Wood 的观点是：**要求用户把几乎整个数字人生集中交给一家广告科技公司，本身就需要极高的信任。**

这并不是一个 agent 能力 benchmark 可以解决的问题。

甚至可以出现一种非常反直觉的竞争局面：

最聪明的 agent 不一定赢。

**最被信任的 agent 可能赢。**

## Meta 对这个问题其实非常清楚，所以 Muse 的安全架构本身已经成为产品卖点

Meta 在官方发布中花了大量篇幅强调 secure VM、隔离 credential storage、Sentinel monitoring、敏感操作确认、audit trail 和用户权限控制。公司甚至计划推出 **Muse Confidential VM**，让整台虚拟机使用只有用户拥有的密钥进行加密，理论上连 Meta 本身也无法访问其中数据。[Facebook](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)

但外部报道说明，这并不是一个已经完全解决的问题。Reuters 在 Muse 上线时报道，Meta 内部测试仍发现过隐私暴露、可靠性和安全方面的问题，产品原计划更早推出，后来为了加强安全而延期；Meta最终认为当前版本已经达到最低发布标准。[Reuters](https://www.reuters.com/business/meta-launches-ai-agent-that-can-access-other-apps-send-emails-make-payments-2026-09-08/)

这段背景其实让 New Yorker 的体验更有意义。

作者的不信任并非纯文化偏见。

个人 agent 的技术难点本身就要求平台承担一种过去消费 App 极少承担的责任：一个普通社交网络即便崩溃半小时通常只是烦人；一个 agent 如果正在帮用户转钱、订机票或发送合同，它的错误可能直接产生经济后果。

## Brickner-Wood 随后把问题从隐私推进到劳动：如果人人都有一个免费助理，那么真正受到冲击的究竟是谁？

文章中间开始从产品体验转向政治经济学。

Muse 的营销逻辑很容易理解：过去只有富人和企业管理者能拥有秘书、助理或行政人员，而 AI 可以把这种支持“民主化”。MIT 教授 John Horton 的观点是，AI agent 不会疲劳，可以每天 24 小时工作，因此无论简单事务还是复杂流程，只要目标是优化，人都可能得到收益。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

Brickner-Wood 并不否认这个好处。他自己确实完成了拖延多月的 eBay 工作和预算。

但他随后问的是分配问题：**当劳动生产率提高以后，谁得到节省下来的价值？**

他借用了马克思关于自动化机器的分析。马克思并不是简单反对机器；他甚至认为，如果劳动者拥有生产资料，提高生产率完全可能释放更多时间去创造、生活和追求兴趣。问题出现在机器及其产生的收益集中在资本所有者手中时：工人的生产率提高之后，企业需要的工人反而可能减少，剩余劳动者也可能对决定自己工作的技术越来越缺乏控制。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

作者引用学者 David Harvey 的类似观点：资本天然欢迎能够提高劳动生产率的技术，因为同样产出需要的人会变少。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这里文章带有明显价值判断。Brickner-Wood 本人对大型科技公司和 AI 持相当批判的立场，因此并不是一篇试图保持“AI 利弊各五成”的产品评测。

但它提出的经济问题是实际存在的：

如果 agent 让一个行政员工完成过去三个人的工作，那么短期看他获得了超级生产率；长期看，企业可能只是发现它以后只需要一个员工。

**个人层面的 augmentation，可以同时成为系统层面的 automation。**

两句话并不矛盾。

## 这也解释了文章标题里那个很微妙的“weekend”：任务都完成了一些，但作者并没有觉得人生真的变好了

周末结束时，Muse 的确产生了一些成果。

eBay 商品卖了几件。

预算做出来了。

作者因此少买了一点高价食品。

他还真的给银行打电话询问所谓重复扣款，最后发现只是自己忘记了眼镜费用分两笔支付。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

但与此同时，他原本订好的晚餐没有去。

推荐的电影没有看。

家庭生活并没有因为“效率优化”而出现什么戏剧性改变。

这里是文章最有文学意味、也是我认为最聪明的部分：Brickner-Wood 并没有说 agent 没用，而是说**agent 的成功标准与生活的成功标准未必相同。**

AI 很容易度量：

完成了几个 task。

省了多少点击。

少花了多少分钟。

完成了多少 backlog。

但“更好的周末”“更好的父亲”“更好的朋友”“读到一本好书”这些目标没有那么容易写成 agent objective function。

他因此认为，真正有意义的认知和情感活动仍然不适合交给机器人。模型可以总结一首歌，却不能替他享受那首歌；可以生成育儿建议，却不能真正承担父亲身份；可以帮忙组织联系人，却不能替代友情本身。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这当然不是一个可以通过 benchmark 验证的技术结论，而是作者对生活价值的判断。

## 全文最值得记住的洞察，是 agent 正在“优化上一代科技已经优化过的东西”

这是文章最终回到的主题，也正是标题副标题所强调的地方。

几十年前，电商已经宣称它解决购物摩擦：

不用去商店。

点击即可买东西。

网上银行则解决银行摩擦：

不用排队。

手机就能转账。

OpenTable 和 Resy 解决订餐摩擦：

不用打电话。

直接选择时间。

Spreadsheet 和金融 App 解决预算摩擦。

这些产品当初每一次都被描述为“过去繁琐的模拟流程终于被数字化”。

现在仅仅十几年以后，我们又开始觉得：

打开 Amazon 太麻烦。

自己填旅行表格太麻烦。

打开银行 App 太麻烦。

在 Resy 点几个按钮也太麻烦。

于是上一代科技公司又建设了一层 agent，替我们操作上一层已经“极度方便”的数字工具。[The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)

这个现象其实非常深。

计算机产业正在从：

**人操作软件**

向：

**AI 操作软件，人只表达目标**

迁移。

如果这个转换真的完成，今天整个互联网的 UI 层都有可能价值下降。

用户不需要知道 Expedia 页面长什么样。

不需要理解 Salesforce 的 menu。

不需要学习银行 App 的 navigation。

甚至不需要知道是哪家 SaaS 完成了任务。

只需要告诉 agent：

“帮我办好。”

Agent 再与后台系统交互。

## 这对软件产业意味着什么，可能比 Muse 本身成不成功重要得多

下面开始是我的延伸判断，不是 Brickner-Wood 的原文结论。

我认为这篇文章真正值得从商业角度思考的是 **UI abstraction**。

过去二十年 SaaS 和 consumer internet 的巨大 moat，一部分来自用户已经学会它的界面。

Excel。

Salesforce。

Amazon。

Booking。

银行 App。

如果 agent 最终成为主要入口，那么这层 moat 会被削弱。

用户以后可能不再说：

“我要打开 Expedia。”

而是：

“帮我找下周去东京最合适的航班。”

也不再说：

“我要登录 Schwab 看一下账户。”

而是：

“告诉我今天有多少现金可以投资。”

真正拥有用户关系的就从 application 转移到 agent。

这也是为什么 Meta 如此在意 Muse，Google 在做 Gemini agent，OpenAI、Anthropic 和其他厂商都在向 personal agent 推进。竞争的最终目标不是再做一个聊天窗口，而是成为**所有其他软件之上的控制平面**。Muse 上线不到两周就冲到美国 App Store 免费榜前列，至少说明消费者愿意尝试这种模式。[Business Insider](https://www.businessinsider.com/meta-muse-personal-ai-agent-top-app-store-charts-2026-9)

但 Brickner-Wood 这篇文章也非常清楚地展示了这个市场今天最大的限制：**capability 已经跑到了 trust 前面。**

Agent 越聪明，想产生真正价值就越需要更多权限。

更多权限又要求更强安全。

更强安全仍然解决不了用户是否愿意把邮件、金融、日程、购物和私人关系都交给同一家公司的问题。

因此 personal-agent 市场最终可能不像今天的 chatbot 市场那样单纯比较 benchmark。它可能更像银行：

模型能力是必要条件。

可靠性、数据隔离、审计记录、身份、责任归属和品牌信任，才决定你敢不敢把真正重要的事情交出去。

从投资角度，我会特别关注这一层的二阶机会。未来 agent 普及并不只利好模型公司，还会制造大量新的基础设施需求：machine identity、fine-grained authorization、credential vault、agent payment、transaction approval、audit log、anti-fraud，以及帮助网站区分“合法代理用户”与恶意 bot 的协议。今天 Resy 与 AI 抢号 bot 的冲突看起来像一件小事，但它实际上暴露了一个互联网级架构问题：**当网络上很大一部分“用户”变成代表真人行动的软件 agent，网站究竟怎样知道该相信谁？** [Business Insider](https://www.businessinsider.com/resy-suspends-vcs-account-ai-agent-reservation-attempt-2026-9)

这篇文章最终没有给 Muse 一个简单的好评或差评。我认为它真正留下的问题反而更加重要：过去互联网通过“把事情搬到线上”消除了物理世界的摩擦；现在 AI agents 又开始消除数字世界本身的摩擦。如果这一趋势继续，未来我们可能越来越少真正“使用软件”，只需要表达意图。

但那时最重要的问题就不再是 **AI 能不能替你点击按钮**。

而是：

**当那个 agent 已经知道你的钱、邮件、行程、购物习惯、工作和家人，并且能够替你行动时，你愿意让谁拥有它？** [The New Yorker](https://www.newyorker.com/culture/infinite-scroll/my-weekend-with-an-ai-agent)
