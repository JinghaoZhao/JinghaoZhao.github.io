今天推荐 **Indranil Ghosh 于 2026 年 9 月 21 日在 *Rest of World* 发表的《Nvidia’s free AI model could push the UAE closer to the U.S.》**。文章全文免费公开，原文本身大约是 8–10 分钟阅读，略短于你偏好的 10–20 分钟，但信息密度很高。[阅读 Rest of World 原文](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/) 我今天选它，是因为这篇文章把三个最近越来越重要、却经常被分开讨论的话题连在了一起：**主权 AI、开放模型，以及 Nvidia 正在从“卖 GPU”向“控制整个 AI 技术栈”延伸。** 它提出的核心问题非常漂亮：阿联酋已经花巨资拥有自己的 AI 机器，但很多“智能”仍然需要从美国模型公司租用；如果 Nvidia 把足够强的开放模型也免费送给这些国家，那么“拥有算力但租用智能”的结构可能被改写，而 Nvidia 自己反而可能因此获得更深的生态控制。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

下面不是原文逐句翻译，也不会一一对应原文段落；我会把文章中的报道重新组织，并用 Nvidia、美国商务部、Hugging Face 和阿联酋 TII 的一手材料补足其中最关键的技术和战略背景。

## 阿联酋现在最尴尬的地方，是“机器属于自己，智能却未必属于自己”

阿联酋过去几年投入 AI 的思路非常明确：先获得尽可能大的算力基础设施，再用这些算力建立本国 AI 能力。G42 正在阿布扎比建设 Stargate UAE，官方宣布的总体 UAE–U.S. AI Campus 规模达到 **5GW**，其中 Stargate 本身规划为 **1GW compute cluster**，第一阶段约 200MW，使用 Nvidia Grace Blackwell GB300 系统。Rest of World 此前报道，这一大型项目的首阶段最终可能涉及约 **40 万枚 Nvidia 芯片**。[G42](https://www.g42.ai/resources/news/global-tech-alliance-launches-stargate-uae)

但硬件本地化并不等于智能本地化。大量运行在这些 GPU 上的最强模型仍然来自美国企业，而且通常通过 API 或受限商业服务获得。模型提供商决定模型能做什么、哪些功能开放、价格是多少，甚至理论上可以改变服务条件。

因此文章用了一个非常准确的概括：**UAE owns the machines but rents the intelligence。**

阿联酋其实很早就意识到了这一点。政府研究机构 Technology Innovation Institute，也就是 TII，2023 年就推出 Falcon，希望拥有一套不依赖 OpenAI、Google 或中国模型公司的基础模型。到了今年，Falcon H1 在 Counterpoint Research 的主权 AI 模型指数中排名第一；TII 今年还推出了专门面向阿拉伯语的 Falcon-H1 Arabic，并声称其在 Open Arabic LLM Leaderboard 上领先。这里后一个性能结论来自 TII 自身，因此最好理解为厂商与榜单层面的评价，而不是“全球绝对最佳”的最终判断。[Counterpoint Research](https://counterpointresearch.com/en/insights/middle-east-leads-sovereign-ai-llm-race-in-h1-2026)

所以从表面看，阿联酋的终极目标似乎很简单：

GPU 自己买。

数据中心自己建。

模型自己训练。

数据自己保存。

整个 stack 尽量自己掌握。

但文章真正有意思的地方，就是告诉你：**在 frontier AI 时代，完整实现这四件事可能既不经济，也没有必要。**

## 阿联酋内部其实已经出现了两种完全不同的“主权 AI”哲学

TII 的立场更接近传统意义上的技术自主。

TII 首席研究员 Hakim Hacid 对 Rest of World 表示，如果一个国家想真正保留 AI 视角的多样性以及完整技术主权，就需要一套本土建立的 foundation。真正的价值不只是最终拥有某个模型 checkpoint，而是掌握训练模型的技术、人才和整个研发过程。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

这是一种“我必须知道发动机怎么造”的主权观。

G42 的思路明显更加务实。

它并不一定认为 UAE 必须从随机初始化开始，重新训练一个全球 frontier foundation model 才算拥有主权。G42 CEO Peng Xiao 支持开放 frontier models，认为 open models 和 closed models 可以共存，但主权控制、安全和可信性必须从系统设计之初就存在。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

文章采访的 Middle East Institute 研究员 Mohammed Soliman 把这种区别解释得尤其清楚。他认为 AI sovereignty 从来不一定意味着“基础模型必须完全从零自己发明”；真正重要的是有没有模型权重，能否使用自己的数据 fine-tune，以及最关键的——**能不能在自己的基础设施上自行 serving，而不需要把用户请求发送到外国公司的 API。** [Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

这个定义变化非常重要。

因为它把“主权模型”的门槛从几十亿美元甚至上百亿美元级别的 frontier pretraining，降低到了：

拿到一个足够强的开放 base model。

本地训练。

本地保存 weights。

本地 inference。

本地控制数据和 deployment。

如果这个定义成立，世界上绝大多数国家其实根本不需要自己做 GPT-6 或 Claude 的完整 pretraining。

它们真正需要的是一个**足够好的、没有远程 kill switch 的 foundation**。

而这正好解释为什么 Nvidia 突然对开放模型如此积极。

## Nvidia 正在做一件表面上很反常的事情：花巨额资金做模型，然后免费送出去

过去 Nvidia 商业模式非常容易理解。

OpenAI 训练更大的模型。

Google 训练更大的模型。

Anthropic 训练更大的模型。

所有人买更多 Nvidia GPU。

因此最理想的状态似乎应该是：Nvidia 不碰模型，让模型公司互相竞争，然后自己卖“铲子”。

但 2026 年 Nvidia 明显开始往模型层移动。

3 月 16 日，它正式成立 **Nemotron Coalition**，成员包括 Mistral、Thinking Machines、Perplexity、Cursor、LangChain、Reflection AI、Sarvam 和 Black Forest Labs。Nvidia 官方说得非常明确：联盟会共同开发 frontier-level 开放基础模型，第一个项目由 Nvidia 与 Mistral 联合开发，并将成为未来 **Nemotron 4** 系列的基础。[NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-launches-nemotron-coalition-of-leading-global-ai-labs-to-advance-open-frontier-models)

8 月又发生了更大的动作。

根据 Bloomberg、华尔街日报等媒体获得的信息，Nvidia 同意向 coding-model startup **Poolside 支付约 60 亿美元**，获得其 Model Factory 的非独占许可，并另外投资约 10 亿美元、按约 120 亿美元 pre-money valuation 入股；超过 100 名 Poolside 员工将转入 Nvidia，参与 Nemotron 相关项目。由于 Nvidia 与 Poolside 并未完整公开全部交易细节，这些金额应理解为多家媒体基于内部文件和知情人士的报道，而不是 Nvidia 的正式公告。[Yahoo 财经](https://finance.yahoo.com/technology/ai/articles/nvidia-pay-poolside-6-billion-181448803.html)

Model Factory 比买一个现成模型更有意思。

Nvidia 买到的不是单纯某个 checkpoint，而是 Poolside 用来**持续制造、训练和优化模型的研发系统**。

换句话说，Nvidia 并不是只想发布一次 Nemotron。

它正在建设自己的 **model factory**。

## 但 Nvidia 真正的大动作其实是这个月收购 Hugging Face

9 月 3 日，Nvidia 正式宣布以 **12,930,300,000 美元，也就是约 129.3 亿美元**收购 Hugging Face。这个数字来自 Nvidia 自己的公告，因此不是市场传闻。[NVIDIA Blog](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)

这笔交易的战略意义，可能比 Poolside 更大。

Hugging Face 目前拥有超过 **1,800 万开发者、300 多万个模型、50 万个 dataset、100 万个应用，并有超过 20 万家公司使用平台**。它已经成为开放模型世界事实上的 distribution layer。[NVIDIA Blog](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)

Nvidia 同时承诺，Hugging Face 会继续保持开放。

开发者可以继续选择任何模型。

任何 framework。

任何 cloud。

任何 inference provider。

甚至并不要求使用 Nvidia hardware。[NVIDIA Blog](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)

所以如果把最近几个月的动作连起来看，Nvidia 的战略非常清楚：

它已经拥有 GPU。

拥有 CUDA。

拥有 NVLink 和 networking。

拥有 DGX Cloud。

现在又开始拥有 model-building capability。

再拥有开放模型最大的 distribution hub。

于是它可以把 AI stack 从硅片一直连接到最终模型。

## 为什么 Nvidia 愿意把最昂贵的“智能”免费给别人？因为模型不是它真正想收费的地方

这里是我认为文章最重要的一层商业逻辑。

Hugging Face 自己今年夏天的数据已经给出了非常直接的解释。

2026 年开放模型生态里，**发布新模型最多的两个机构不是传统 AI lab，而恰恰是 Nvidia 和 AMD**。两家公司今年都发布了超过 200 个模型 repository。Hugging Face 的总结非常直白：hardware companies 已经意识到，开放模型是卖硬件的一种方法——如果一个模型已经针对你的 GPU 做好优化，而且任何人都可以免费下载，它就是最清楚的 hardware demo。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

这意味着 Nvidia 的经济模型与 OpenAI 根本不同。

OpenAI 必须想办法：

**让 token 有价格。**

Nvidia 可以反过来：

**让 token 越便宜越好，只要它消耗更多 Nvidia compute。**

对于 Nvidia 来说，模型本身可以接近零毛利。

只要它让企业觉得：

“我想运行 Nemotron。”

然后下一句话变成：

“最好用 Rubin。”

商业循环就成立。

这和 Android 的战略很像。

Google 并不靠 Android license 本身赚钱；Android 的意义是确保移动互联网最终运行在 Google 能够参与并获益的生态上。

Nvidia 现在似乎也越来越愿意把 intelligence layer 商品化，以保护自己真正稀缺的 **compute layer**。

## 中国开放模型的崛起，实际上是 Nvidia 被迫加速做这件事的重要原因

Hugging Face 今年夏天的数据非常值得看。

2026 年前七个月，中国实验室几乎每个月发布的最大开放模型都比美国实验室大。中国模型的规模上限大约在 **7540 亿到 2.78 万亿参数**之间；美国模型在七个月中的五个月都没有超过 1300 亿参数，少数例外包括 Nvidia 的 Nemotron 3 Ultra 等。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

但更重要的不是参数规模，而是生态。

Qwen 今年已经变成 Hugging Face 最大的 foundation ecosystem 之一。

截至报告统计期，Qwen-based models 出现了 **151,448 个 derivative repositories**。

这相当于 Meta 整体 footprint 的约 **2.6 倍**，也相当于 Llama repositories 的约 **4.7 倍**。

Qwen 生态每一天大约增加 **180–210 个**新的 derivative models。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

更惊人的数字来自 downloads。

今年前七个月，在有明确参数规模标记的 repository 中，Qwen 系列累计约 **20.45 亿次下载**；如果把全部 repository 都算进去，则约 **20.61 亿次**。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

这里一定要注意 Hugging Face 自己给出的限定：

downloads 不是实际企业市场份额。

它不计算 API usage。

不计算私有部署。

也不计算其他 distribution channel。

所以“20 亿下载”不能等同于“20 亿模型部署”。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

但生态方向非常明确。

很多开发者在决定：

“我要拿哪个 base model fine-tune？”

答案开始越来越频繁地变成 Qwen。

这对于 Nvidia 来说其实是一个长期风险。

硬件层虽然仍然是 Nvidia。

但如果模型层、tooling、fine-tuning recipes 和 developer mindshare 全部围绕中国模型发展，Nvidia 就只能占据产业链的一个层级。

Nemotron 的目标明显是避免这种情况。

## 所以 Nemotron 4 的真正竞争对手，不只是 GPT 或 Claude，而是 Qwen

关于下一代 Nemotron，已确认和未确认的信息需要分开。

Nvidia 已正式确认 Nemotron 4 系列存在，而且其开放基础模型由 Nemotron Coalition 联合建设。[NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-launches-nemotron-coalition-of-leading-global-ai-labs-to-advance-open-frontier-models)

而 Reuters 今年 8 月援引 *The Information* 的报道说，Nemotron 4 最大版本预计至少达到 **1 万亿参数**，并可能在今年晚些时候推出。这部分参数规模和发布时间仍属于媒体报道，而不是 Nvidia 已正式发布的最终产品规格。[Reuters](https://www.reuters.com/business/nvidia-is-developing-nemotron-4-open-source-models-information-reports-2026-08-11/)

Rest of World 的判断是，新模型很明显会首先瞄准那些已经拥有大量 Nvidia hardware 的国家和机构。

阿联酋几乎是最理想的 customer。

它已经买了 GPU。

已经建了数据中心。

又明确不希望所有 intelligence 永远来自远端美国 API。

这时 Nvidia 可以告诉 UAE：

不用自己花几年时间从零训练 frontier foundation。

也不用改用中国 Qwen 或 MiniMax。

**我直接给你一个开放的 frontier base model。**

你自己 fine-tune。

你自己部署。

数据不用离开 Abu Dhabi。

模型也不用向 Nvidia API 付每 token 费用。

这对一个 sovereign-AI 国家非常有吸引力。

## 这里也出现了一个很有意思的悖论：开放模型反而可能制造更深的战略依赖

表面上看，open weights 应该减少 lock-in。

事实上在模型这一层确实如此。

如果 weights 在你手里，Nvidia 无法像 SaaS 服务那样突然：

提高 API 价格。

限制使用场景。

关闭账户。

改变审查规则。

所以从 UAE 的角度，这显然比长期调用一个美国闭源 API 更主权。

但再往下看，整个 stack 可能变成：

Nemotron 模型。

CUDA kernels。

Nvidia GPU。

NVLink。

Nvidia networking。

Nvidia inference stack。

甚至 Hugging Face distribution。

这样一来，**model lock-in 下降，platform lock-in 反而可能上升。**

这就是为什么 Middle East Institute 的 Mohammed Soliman 在文章里认为 Nvidia 已经占据 chips，现在又开始建设“生产模型的工厂”。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

这类 lock-in 和传统闭源软件不同。

用户并没有被禁止离开。

而是因为整个 stack 每一层都一起优化，离开的经济成本越来越高。

## 美国政府实际上也正在主动让阿联酋更容易进入这个生态

这一点是文章非常重要的地缘政治背景。

美国商务部在今年 7 月发布最终规则，把 UAE 从 Country Groups D:3 和 D:4 移除，并加入 **Country Group A:5**。对 UAE 政府和获得批准的商业实体，美国提供了更优惠的出口管制待遇，包括在特定条件下免许可获得部分先进 computing items。规则从 **2026 年 7 月 10 日**起生效。[Federal Register](https://www.federalregister.gov/documents/2026/07/14/2026-14132/enhanced-favorable-treatment-for-the-united-arab-emirates-under-the-export-administration)

商务部在文件中还直接引用 2025 年签署的 U.S.–UAE AI Cooperation framework，并明确说新规则是为了帮助受信任 UAE entities 更安全地获得先进计算技术。[Federal Register](https://www.federalregister.gov/documents/2026/07/14/2026-14132/enhanced-favorable-treatment-for-the-united-arab-emirates-under-the-export-administration)

也就是说，美国的政策不是单纯：

“允许 UAE 买更多 GPU。”

而是正在逐渐把 UAE 纳入一个更完整的美国 AI technology sphere。

这有明确条件。

G42 此前为了获得美国先进芯片访问权，已经出售或退出了部分中国科技资产，并降低与中国企业的技术关系。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

因此 Nvidia 如果再把开放模型这一层填上，美国技术生态就会从：

芯片。

网络。

云。

开始延伸到：

模型。

这正是文章标题所说 “push the UAE closer to the U.S.” 的真正含义。

不是 UAE 突然政治上“选美国”。

而是技术 stack 一层一层朝美国体系倾斜。

## 但沙特恰好说明：这种 lock-in 远远没有完成

Saudi Arabia 是文章非常好的 counterexample。

沙特同样购买大量 Nvidia GPU。

但它最新推出的阿拉伯语模型 humain-m3，却是在中国 MiniMax 模型基础上开发。

也就是说：

硬件来自美国。

模型来自中国。

本地政府负责 deployment。

这正是 Carnegie Endowment 的 Sam Winter-Levy 所说的：目前并不存在真正的 full-stack lock-in。海湾国家拥有非常强的动机去 hedging，只要技术允许，它们会继续在美国和中国之间组合采购。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

这和我们前几天读到的 Global South “mixed stack”趋势完全吻合。

国家并不会天然认为：

“既然我买 Nvidia，模型也必须买美国。”

它会分别优化每一层。

GPU 哪个最好，就用哪个。

模型哪个便宜，就用哪个。

网络哪个可靠，就用哪个。

数据尽量自己留。

这意味着 Nvidia 推 Nemotron 的战略本质上是在试图让：

**Nvidia hardware → Nvidia model**

变成更自然的默认组合。

## 但 TII 并没有准备因此放弃 Falcon

这也是文章结尾最重要的平衡。

TII 的态度不是拒绝外部模型。

它的观点更像：

foundation 必须有自己的。

但如果世界上出现更好的技术，也可以拿来使用。

Hakim Hacid 对文章说得非常清楚：

**“Sovereignty does not mean isolation.”**

也就是说，TII 可以继续训练 Falcon，同时：

借鉴 Nemotron。

利用 Qwen。

使用开源工具。

甚至把其他模型作为 teacher 或 component。

只要它仍然保有自己核心 foundation、技术人才和控制权。[Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)

这其实让我觉得 UAE 的路线比“必须所有东西国产”更现实。

真正的技术主权并不一定意味着：

100% 自给自足。

而可能意味着：

**任何一个外国供应商都无法单方面让你的系统停止工作。**

这两个定义差别非常大。

## Nvidia 收购 Hugging Face 以后，这场竞争真正争夺的可能已经不是“哪个模型最好”，而是“哪个模型成为默认底座”

这是我认为文章之外最重要的延伸。

Hugging Face 的数据特别说明了一件事：

模型性能排名和生态地位并不是一回事。

2026 年下载量前 25 的 model repositories 与 likes 排名前 25 的 repository，只有**一个**重合。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

这说明最受关注的新模型，不一定是生产环境最常用的模型。

真正形成 moat 的是：

大量 fine-tunes。

quantized versions。

工具支持。

部署教程。

serving optimization。

下游 derivative models。

这也是 Qwen 的优势。

Qwen 并不是靠一次 launch 赢。

它通过不断覆盖从很小到极大的不同参数规模，让开发者几乎无论做手机、PC、本地 server 还是数据中心，都可以继续留在同一家族。Hugging Face认为这种持续发布、规模覆盖和宽松 license 共同形成了正反馈。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

所以 Nvidia 的 Nemotron 真正想赢的可能不是 benchmark leaderboard。

而是变成：

**“不知道用什么 base model 时，就先用 Nemotron。”**

一旦达到这个位置，模型 itself 是否收费反而没那么重要。

## 从投资角度看，这篇文章对 Nvidia 最重要的含义，是它正在主动商品化自己上方的一层

下面是我的判断，不是 Rest of World 的原文结论。

商业史里非常强的一种策略，就是把与你真正利润池相邻的产品变成 commodity。

Microsoft 早年希望 PC 便宜，从而扩大 Windows 市场。

Google 希望浏览器免费，从而保护 Web 和搜索。

AWS 希望很多基础软件变成 open source，因为最终客户会买 compute。

Nvidia 今天可能越来越接近类似策略：

**让模型变便宜甚至免费，保护 GPU。**

如果 frontier open models 最终的价格接近零，那么独立模型公司的 API margin 会受到压力。

但 Nvidia 不一定在乎。

一个 1 万亿参数 Nemotron 即使免费，运行一次 inference 仍然需要：

GPU。

HBM。

network。

electricity。

server infrastructure。

这些恰恰是 Nvidia 赚钱的地方。

从这个角度看，Nvidia 最危险的竞争对手并不一定是 AMD。

真正的长期风险之一可能是：

**一个非常强、非常流行的中国开放模型生态，与非 Nvidia hardware 逐渐形成共同优化。**

Hugging Face 已经观察到这一趋势的反向版本：中国开放模型正在越来越多针对中国国产 accelerator 优化。[Hugging Face](https://huggingface.co/blog/state-of-open-models-summer-2026)

如果这种趋势发展成熟，“模型生态”和“硬件生态”可能逐渐绑定。

所以 Nemotron 绝不是 Nvidia 的副业。

它其实是在保护 CUDA 的下一代 moat。

## 但这也制造了 Nvidia 未来最值得观察的一个风险：它会不会越来越像一个需要被监管的平台公司

收购 Hugging Face 以后，Nvidia 同时处在：

模型 distribution。

GPU hardware。

training software。

inference software。

networking。

cloud。

甚至 model development。

这种 vertical integration 的战略优势巨大。

但监管问题也会越来越明显。

尤其 Poolside 这种“非独占 licensing + 大规模 hiring + minority investment”的交易结构，很容易被监管者视为事实上获得关键技术和团队、却避免传统 acquisition review 的 quasi-merger。

另一方面，Nvidia 收购 Hugging Face 后已经主动承诺：

平台仍然开放。

不要求 Nvidia hardware。

不限制其他模型和云服务。[NVIDIA Blog](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)

这句话未来会非常重要。

如果 Hugging Face 真的长期保持中立，它会成为 Nvidia 一个极强的生态资产。

如果开发者开始觉得搜索、推荐、benchmark、deployment integration 明显偏向 Nvidia 模型或硬件，那么这个平台最值钱的东西——**开发者信任**——反而可能被损害。

## 更深的意义：AI 主权正在从“谁训练了模型”，转向“谁拥有关闭它的权力”

我觉得《Nvidia’s free AI model could push the UAE closer to the U.S.》真正值得记住的，是它重新定义了 sovereign AI。

第一阶段的主权 AI 叙事很简单：

每个国家都要有自己的大模型。

但现实越来越说明，这个定义成本太高，也没有必要。

更实际的问题是：

权重是不是在你手里。

数据是不是在本国。

inference 是不是自己运行。

模型有没有远端 kill switch。

别人能不能突然涨价。

出口管制会不会让下一批 GPU 断供。

开发人才是否掌握模型如何训练和修改。

从这个角度看，主权不是一个 0 或 1 的状态。

它是一系列 dependency 的组合。

而 Nvidia 正在尝试提供一种非常诱人的答案：

**硬件我卖给你，foundation model 我免费给你，你的数据自己保留，你也可以自己 fine-tune。**

对于 UAE、沙特、印度、欧洲甚至很多企业来说，这比“永远调用美国闭源 API”明显更自主。

可与此同时，它也可能让 Nvidia 从一个 GPU supplier，变成国家 AI infrastructure 的事实标准。

所以这篇文章最终让我觉得，Nvidia 最近最值得关注的战略变化，并不是 Rubin 又快了多少，也不是下季度 Data Center revenue 会到多少。

而是它开始意识到：

**未来 AI stack 最值钱的位置，可能不是每一层都收费，而是控制哪一层成为免费的公共基础。**

中国目前通过 Qwen、DeepSeek、MiniMax 等开放模型试图把 **intelligence** 变成 commodity，然后在云、应用和生态里获取价值。

Nvidia 正在用 Nemotron 做非常类似、甚至更加激进的事情：

**把 intelligence 本身免费送出去，然后确保世界需要更多 compute。**

如果这个战略成功，未来“哪国拥有自己的 AI”这个问题，答案可能不再取决于国旗印在哪个模型上，而取决于更实际的一句话：

**当模型真正运行时，谁控制 weights、谁控制机器，以及谁可以决定它明天还能不能继续运行。** [Rest of World](https://restofworld.org/2026/nvidia-open-source-ai-models-uae/)
