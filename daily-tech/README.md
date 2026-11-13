# 每日科技长文 · Publishing Contract

站点：https://zhaojinghao.com/daily-tech/ （公开的 GitHub Pages）；永久链接为 `?post=ARTICLE_ID`。

## 数据

正文存放在 `posts/*.md`，索引在 `manifest.json`。每条索引有 `id`、`title`、`source_title`、`source_date`、`source_url`、`tags`、`status`、`file`、`delivery_date`、`sequence`。
`source_date` 是英文原文发表日期，不等于 ChatGPT 推送日期。无法核实推送日期时保持 `delivery_date=null`。`status=full` 仅用于完整中文历史消息已入库的文章；尚未取得完整历史消息的条目用 `pending` 且 `file=null`。

历史正文另有可选 `html_file`，保存从原对话恢复的段落、表格、公式和链接。阅读器优先读取该 HTML，没有此字段时直接渲染 `file` 中的 Markdown，因此每日新增文章只需写 Markdown。更新清单时保留已有记录的所有字段，包括 `html_file`、`reading_minutes`、`source_link_note` 等；不要把旧记录重建成较少字段的版本。每次成功发布时将顶层 `updated_at` 更新为实际发布日期。

前端是无需构建的 `index.html`、`style.css` 和 `app.js`，支持搜索、月份及主题筛选、文章目录、字号调整和深色阅读。

## 每日自动更新

每天搜索两周内的一篇高质量科技或 AI 文章，按用户既有规则撰写完整的中文长文解读。保留关键事实、数字、来源、限定条件和独立分析，使用自然段落与小标题，不使用编号列点。遵守版权限制，不能为受保护文章提供逐句复刻或替代全文的紧密改写。

读取最新 GitHub 清单，依据英文来源链接和标题去重，先创建新的 `posts/YYYY-MM-DD-slug.md`，正文使用真正的 Markdown URL 链接，不使用 ChatGPT 动态引用标签。成功写入正文后，再使用索引最新 blob SHA 更新 `manifest.json`，新条目设 `status=full`、`kind=daily`（可选）、`delivery_date=美国太平洋时间当日`、`sequence=max+1`。始终保留旧条目；发生冲突先读取再合并；重试不得重复发表。

通过 GitHub 回读核查文件和清单，并尽量验证 GitHub Pages 已部署，再仅把中文标题与永久链接发给用户，聊天不再贴全文。发布未成功时诚实报告故障，不得声称已经更新。

## 历史归档与隐私

原始历史消息必须逐字保存，不能用重新生成的摘要冒充原文。无法恢复的聊天引用和交互图表在页面中应标明。缺少全文时保留 `pending`。

2026-11-12 之前已恢复的 84 篇内容包含 75 篇每日长文、6 篇早期推荐和 3 篇延伸阅读。7 篇消息没有可独立核实的发送日期，保持为空，不用原文发表日期代替。

只发布被授权的科技长文。不要公开投资账户、邮件、家庭、健康、私人路径等数据。只修改 `daily-tech/` 目录；不要触碰个人主页、根 `CNAME` 或其他项目。`noindex` 不是访问控制。

