# 今日科技长文：机器人正在出现自己的“GPT-3 时刻”

今天推荐 Will Knight 8 月 19 日发表于《WIRED》的 **《I Saw the Future of AI in a Robot That Can Learn on the Spot》**。文章写的是一家叫 Generalist AI 的机器人创业公司，核心看点不是某台 humanoid 又完成了一个预先排练好的 demo，而是它们最新的 **GEN-1.5** 模型开始表现出一种过去主要属于语言模型的能力：看一段只有几秒钟的示范，就尝试完成一个此前没有专门训练过的新物理任务。WIRED 属于版权媒体内容，因此下面不是逐句翻译，而是按照文章和 Generalist 同日发布的一手技术材料，做高颗粒度中文重写。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

这篇很值得读，因为 embodied AI 过去最大的瓶颈之一，并不是“机器人能不能做某件事”，而是**每学会一件新事到底需要多少数据和训练**。如果每换一个零件、一个桌面、一种袋子，都要重新采几百甚至几千条轨迹、再 finetune 模型，那么机器人永远很难像 ChatGPT 那样成为通用平台。GEN-1.5 最值得注意的地方，正是它开始尝试把这种适配过程从“重新训练模型”压缩到“给模型看一下”。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## WIRED 现场看到的，已经不太像传统机器人 demo

Will Knight 去了 Generalist AI 在马萨诸塞州 Cambridge 的办公室。他看到的机器人并不特别科幻，主要是机械臂在做叠杯子、把积木放进碗里之类的简单任务。但让他吃惊的是，这些机械臂并不是针对每一个任务提前专门训练，而是在看过一段很短的示范视频之后直接尝试执行。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

其中一个例子是把积木扫进碗里。示范里，人使用刷子和簸箕完成任务。测试时研究人员把刷子拿走，机器人没有简单停住，也没有坚持寻找不存在的刷子，而是把簸箕本身当成刷子使用，把积木扫进碗里。这个行为的价值不在于“机器人会用簸箕”，而在于它似乎抓住了示范背后的目标——需要用一个平面工具推动物体——而不是机械复制演示中的精确动作。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

另一个现场演示更加接近人类式适应。机器人先看人打开一个钱包或小包、然后把里面的钞票取出来。实际测试时，它面对的是一个不同类型的包。机器人能够解开拉链，然后尝试拿钱；当用右侧夹爪不容易抓到时，它自己换成左侧夹爪寻找更好的抓取角度。现场工程师甚至表示，这种具体换手动作此前没有见过。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

Generalist CEO Pete Florence 给 WIRED 的类比非常直接：这让他想到 **GPT-3 刚出现时的感觉**。GPT-3 最大的震撼并不是它在某一个 NLP benchmark 上更高，而是第一次让很多人意识到，可以给一个大模型几个例子或者简单 prompt，它就可能直接尝试一个训练时没有单独为它设计的新任务。Florence认为机器人现在正在接近类似阶段。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

## Generalist 把这种方法直接叫做“physical prompting”

Generalist 同日公开的 GEN-1.5 技术文章把这个概念说得更加明确。它们称这种方式为 **physical prompting**。对于语言模型，prompt 是文字、代码或者图片；对于机器人，这里的 prompt 是一小段完整的 sensorimotor sequence，也就是机器人看到的视觉和传感器信息，加上示范者执行的动作轨迹。[Generalist AI](https://generalistai.com/blog/gen-1.5)

GEN-1.5 可以把一段大约 **3 到 12 秒**的单次 demonstration 放入 context window，然后直接执行任务，不进行 gradient update，也不需要传统意义上的 fine-tuning。模型拥有约 **30 秒的视频记忆窗口**，同时接收其他传感器、语言以及机器人自身状态信息，并输出 **100Hz 的动作轨迹**。[Generalist AI](https://generalistai.com/blog/gen-1.5)

也就是说，从模型接口角度看，研究人员正在尝试让机器人做到一件非常像我们今天使用 LLM 的事情：不给它写一个新的训练任务，不重训 policy，而是把“例子”塞进 context，它立即根据例子行动。[Generalist AI](https://generalistai.com/blog/gen-1.5)

Generalist 自己明确把这与 GPT-3 的 one-shot/few-shot learning 联系起来。GPT-3 当年的突破之一，是模型在没有为具体任务重新训练的情况下，仅凭 context 中的一两个例子就能获得一定能力。机器人领域几十年来也一直希望做到类似的 learning from demonstration，但过去通常受到物体类型、任务类别、摄像机角度或特定机器人硬件等条件限制。Generalist 声称 GEN-1.5 展现出的区别，是这种能力开始横跨更多类型的实际操作任务。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## 现在成功率只有 59%，所以离“通用机器人”还远

这里必须把 hype 压下来。

Generalist 对十个不同任务进行 one-shot in-context 测试时，平均成功率约为 **59%，标准差约 10%**。这些任务包括处理拉链、打开罐子、从钱包里拿钱等，而且整体仍然属于相对短时、简单的 manipulation task。59% 对一个真正商业部署的机器人显然远远不够。工厂或家庭机器人不能有四成概率把任务搞砸。[Generalist AI](https://generalistai.com/blog/gen-1.5)

WIRED 也明确指出，Generalist 自己承认目前可靠性仍然不足。真正工业化部署通常希望达到接近 **99% 甚至更高**的任务成功率，而且今天的结果还不能证明同样的方法能够顺利推广到任意复杂、长时间、多阶段的现实任务。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

但真正值得看的不是 59% 本身，而是**获得这 59% 所需要的增量训练成本接近零**。机器人只看了几秒钟例子，然后直接开始干活。

如果传统 robotics 的经济模型是“新任务 → 收集大量 task-specific data → 训练几小时/几天 → 部署”，而新模型逐渐变成“新任务 → 给我演示十秒钟 → 我先试一下”，即使第一次只有 59% 成功率，系统架构和商业部署方式都会发生巨大变化。这个推论是我基于 Generalist 结果作出的延伸。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## 更重要的是，它再训练几步之后进步得非常快

GEN-1.5 并不是只能选择“零训练”或者“大规模 fine-tuning”两个极端。

Generalist还测试了一种超轻量适配方式：给模型大约 **5 分钟数据、约 50 次 demonstrations**，然后只做 **10 个 gradient steps**，十类任务的平均成功率可以从 one-shot 的约 59% 提高到 **83%，标准差约 9%**。公司表示，在某些任务中，仅靠 context 中的一次示范甚至能超过在相同数据上进行 1–5 个 gradient steps 的结果。[Generalist AI](https://generalistai.com/blog/gen-1.5)

传统机器人模型为了学习一个新任务，往往需要数以万计甚至更多 gradient steps。GEN-1.5 暗示的路线则更像 foundation model：大量昂贵工作提前放进 pretraining，然后下游新任务只需要极少量数据和计算完成适配。[Generalist AI](https://generalistai.com/blog/gen-1.5)

Generalist 团队甚至认为，与其把这种做法称为普通 fine-tuning，不如更接近 **test-time training**：模型已经拥有大量物理世界先验，用户给少量新经验，只需要很少更新就能把能力重新组合到具体任务上。[Generalist AI](https://generalistai.com/blog/gen-1.5)

如果这条 scaling law 能继续保持，它对机器人经济性的意义可能比机械臂成本下降还大。真正昂贵的不只是机器人硬件，而是每到一个新工厂、遇到一批新 SKU，就需要一群工程师重新写程序、采数据、调参和验证。如果这个 integration cost 大幅下降，机器人可部署市场才可能真正扩大。这是我的延伸判断。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## Generalist 认为关键不是互联网视频，而是真实“触摸世界”的数据

Generalist 的路线和“拿一个 VLM 接在机器人上”不完全一样。

公司表示 GEN-1.5 是从头训练的 embodied foundation model，而不是直接拿某个开源语言模型作为主体。Generalist过去两年一直建设自己的 physical interaction data engine，希望像语言模型摄取互联网文本一样，让机器人模型摄取大量真实世界操作经验。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

为此，公司制作了一种低成本手持 gripper。工作人员戴着或者拿着这种类似机器人夹爪的设备完成真实任务，设备上的摄像头和传感器同时记录视觉与动作。这么做的好处，是人不需要真的坐在昂贵机器人前遥操作，每套数据采集设备成本和扩张难度都更低。WIRED 现场看到成箱的这类 grippers，准备发送给墨西哥以及其他地区的数据采集人员。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

Generalist 对具体数据配方相当保密，但其他近期报道显示，公司已经把这种硬件大规模分发，用来积累真实物理互动数据。它的基本 thesis 是：机器人领域缺少类似互联网文本那种规模的数据，所以需要人为建立“physical data internet”。[Business Insider](https://www.businessinsider.com/robotics-tech-ai-startups-investors-funding-2026-8)

这也解释了为什么 Generalist 认为机器人目前和早期 LLM 很像。语言模型的 generalized intelligence 并不是来自工程师把所有任务逐项编码进去，而是大规模预训练之后出现迁移能力。Generalist希望证明，**physical intelligence 也有类似 scaling behavior**。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## GEN-1.5 已经连续预训练八个月，而且团队说曲线还没停

Generalist透露，GEN-1.5 的初始预训练已经持续超过 **8 个月**。团队原本没有计划让同一个模型一直训练这么久，但随着数据和 compute 增加，held-out validation 上的 next-action prediction error 持续改善，因此他们没有停止。[Generalist AI](https://generalistai.com/blog/gen-1.5)

这个过程中出现了一个很有意思的渐变。最开始，新任务可能仍然需要几百次 gradient update；之后变成几十次；再后来模型可以只用一分钟左右的数据、一个 gradient step 就获得一些新技能。研究人员随后自然产生了下一个问题：既然只需要一步训练，那能不能连这一步都不要，直接在 context 里学？结果就是现在展示的 one-shot physical prompting。[Generalist AI](https://generalistai.com/blog/gen-1.5)

更有意思的是，公司声称自己**没有专门为了让模型产生 in-context learning 而设计训练机制**。它没有增加专门的 meta-learning objective，也没有额外奖励模型学会快速适配。团队认为这种能力可能只是从大规模连续 physical interaction pretraining 中自己出现。[Generalist AI](https://generalistai.com/blog/gen-1.5)

这点如果以后能被独立验证，会非常重要，因为它意味着机器人可能真的存在与 LLM 类似的 emergent capability：达到一定数据和模型规模后，模型不是简单“记住更多动作”，而开始形成可以在 context 中重新组合的物理先验。现在还太早，不能说这一点已经被证明。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## 它甚至开始表现出“组合技能”

GEN-1.5 的 physical prompt 不一定只能放一个示范。

Generalist做过这样的实验：context 里分别放两个完全独立的动作示范，中间没有人为制作过渡动作，然后要求模型完成组合任务。模型能够先完成第一个动作，再自行生成两个任务之间需要的重新定位、重新抓取以及错误恢复动作，然后继续第二个任务。[Generalist AI](https://generalistai.com/blog/gen-1.5)

这和机器人传统的 skill library 思路有明显区别。传统系统可能需要工程师明确写出“完成 A 后移动到位置 X，再执行 B”的 state machine；foundation model 路线则希望模型自己理解两个 demonstrated skills 之间如何衔接。[Generalist AI](https://generalistai.com/blog/gen-1.5)

它还展示了几种更反直觉的 transfer。例如某些情况下，人可以直接用自己的双手在机器人摄像头前示范，机器人随后用机械夹爪复现；另一些实验则把 simulation 里的 demonstration 作为 physical prompt 给真实机器人，即便其 pretraining 没有包含 simulation data，模型仍然能够做一定程度的 sim-to-real transfer。[Generalist AI](https://generalistai.com/blog/gen-1.5)

这些实验都还是早期 demonstration，不能等同成熟可靠产品。但它们指向同一个方向：Generalist试图让“动作示范”成为一种通用编程接口。

## 最像小孩的一点不是模仿，而是 improvisation

WIRED 作者反复把机器人表现与幼儿联系起来，并不是因为机器人真的拥有儿童认知，而是因为它表现出一种非常基础的 physical improvisation。

人类小孩看到一个物体，会非常自然地尝试拿、推、倒、翻、用其他物体碰它。我们并不会为每一种组合重新学习物理规则。机器人长期缺少这种能力：训练时杯子在左边，测试时移到右边；光线变了；工具换了；物体摩擦力不同，policy 就可能崩掉。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

GEN-1.5 的一些案例开始表现出“目标保持不变，但轨迹可以完全重建”。例如原工具不存在时换工具，原手抓不到时换另一只手。这并不证明它拥有真正的 world model，但至少说明 policy 不再完全绑定于 demonstration 的像素级或轨迹级复制。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

Generalist 团队自己也说，这些 improvisation 并没有被专门训练出来。模型似乎从大量 physical interaction data 中形成了某种足够通用的策略表示，使其能够面对部分训练分布之外变化。[Generalist AI](https://generalistai.com/blog/gen-1.5)

## 外部机器人研究者为什么比较认真看待 Generalist

WIRED 采访了几位独立机器人学者。

Georgia Tech 的 Danfei Xu 认为 Generalist 在目前追求 general robot model 的公司中比较突出，一方面是它们投入了大量资源采集高质量数据，另一方面团队本身机器人背景非常强。他认为公司不仅执行力强，而且做的研究具有真正技术含量，并称其展示出来的东西看起来明显朝真实商业部署方向设计。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

Stanford 机器人学者 Karen Liu 则特别指出 Generalist 的数据策略：尽量大规模采集 physical interaction data，同时不要把这些数据过度绑定到某一台特定机器人。她认为，目前最强的一些实验结果至少说明这套赌注可能正在奏效。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

但两种评价都不意味着“通用机器人问题已经解决”。59% 成功率本身就是最大的提醒。真正部署到工厂时，长尾 edge cases、失败恢复、安全性、速度、载荷和经济成本都会远比几分钟 demo 困难。[WIRED](https://www.wired.com/story/generalist-ai-robots-learn-like-clever-toddlers)

## 我认为这篇真正重要的地方，是机器人“编程接口”可能正在改变

下面是我的延伸判断，不是 WIRED 或 Generalist 的直接结论。

过去工业机器人的核心商业模式，本质上是 **hardware + integration**。机器臂本身可以非常可靠，但要让它去拧某种螺丝、抓某个零件、操作某条产线，通常要有人大量设计治具、路径、视觉规则和控制逻辑。因此，机器人市场的真正瓶颈长期不是“全球有没有足够多机械臂”，而是“每一个新 workload 的部署成本是不是值得”。

Foundation model 路线正在试图把这个接口改成 **demonstration**。

如果未来给机器人看几次操作，它就能够达到 80%；再跑十分钟自动数据采集和轻量 training，就达到 95%；通过真实运营不断收集 failure cases，再把它提高到 99.9%，那么部署机器人的经济结构会与现在完全不同。机器人不再是一套需要重新 programming 的 automation equipment，而开始接近一种可以“教”的通用计算平台。

这也是为什么我认为 GEN-1.5 的 **59%** 比某个机器人 demo 宣称“这个任务做到 99.9%”更值得关注。后者可能意味着工程师已经把一个固定任务解决得很好；前者虽然可靠性很差，却可能代表一种更重要的能力：**面对一个以前没训练过的任务，它居然已经知道从哪里开始。**

从投资角度看，这也让我更倾向于把 embodied AI 的长期竞争重点放在 **data engine + foundation model + deployment feedback loop**，而不仅是 humanoid hardware。Figure、Tesla、Apptronik、Physical Intelligence、Skild、Generalist 等路线最后当然都需要硬件，但如果机器人硬件逐步标准化，能够在真实环境中最快采集高质量 interaction data、把失败重新变成训练数据、再通过模型规模产生迁移能力的公司，可能会拥有更深的 flywheel。

而 GEN-1.5 今天仍然没有证明“ChatGPT moment 已经到来”。它只在相对简单的短时 manipulation tasks 中做到一次示范约 59% 成功率，距离家庭里一个什么都能干的机器人非常遥远。真正值得跟踪的指标，不是下一次又能做多少酷炫 demo，而是未来半年到一年，随着 pretraining 继续扩大，**one-shot success rate 是否持续按照可预测 scaling law 上升，以及这种能力能否从十秒钟动作扩展到几分钟甚至几十分钟的长周期任务。** 如果这两点成立，那才可能真正说明 robotics 开始进入类似 LLM 从 GPT-2 走向 GPT-3 的阶段。[Generalist AI](https://generalistai.com/blog/gen-1.5)
