我将开始 Session 10 的工作。首先建立任务清单，然后刷新工作区并核实 remote 状态。
本地工作区已被重置（只剩 `bb2f9cb Initial commit`）。执行 pull 恢复到最新状态。
工作区几乎是空的（只有 upload/download 和一个孤立的 initial commit）。先读取上传的文件了解完整任务上下文，再决定 clone 策略。
上传文件是 coding agent 操作规范，已内化。现在工作区被重置且无 remote —— 按任务书指示执行整体重新 clone。
Clone 成功（2832 个文件）。将仓库内容移至工作区根目录。
根目录已有环境自带的 skills/ 目录，需将仓库的 skills/ 合并进去。
工作树现已与 origin/main 一致（仅剩环境自有的未跟踪目录，不入 commit）。核实 remote 最新状态与 Session 10 文档。
Remote 已包含 Session 4–10 全部成果（`05c00fb` 为 session-10 提交）。Session 10 已由前一线程完成，本轮将基于其遗留项继续迭代。现在精读关键文档。
Session 10 已完整执行（H-63..H-66 pin 强化 + 零漂移普查）。现在读 worklog 尾部与核心治理文档。
Worklog 已掌握。现在读五份治理文档完成对齐。
SKILL v1.5.0 已掌握（27 条 trap + 双普查仪轨）。现在验证环境与数据库状态。
环境是冷的（sandbox 重置）：`.env` 为绝对路径需改回 schema-relative、缺 node_modules 与 db。逐步重建。
db:setup 可能已成功，失败的是我的内联 eval（cjs 不支持顶层 await）。改用脚本文件验证种子。
DB 规范确认（4/12/2/4）。运行基线门禁链。
基线门禁与 session-10 台账精确一致（typecheck ✓ lint ✓ 113/113 unit ✓）。后台启动构建，同时派出 Explore 代理审计 session-10 提交。
构建 + assemble 成功。现在审计 session-10 提交（`05c00fb`）—— 先看其 footprint。
Session-10 footprint 符合声明（2 spec + 4 docs，零生产代码）。派出 Explore 代理做全量 diff 审计。
审计完成：**Session-10 全部 8 项声明实锤**，仅 6 项 NIT（第 1 项有未来咬合力：H-63 exact-list pin 只覆盖首卡，数字尺码/斜杠尺码/One Size 产品从未走过该 pin 路径）。现在进入实时参考站巡检。先检查浏览器环境与 :3100 端口。
浏览器与工具就绪。按 AGENTS.md 启动 production standalone（绝对路径 DATABASE_URL 指向 canonical db）。
Standalone :3100 健康。开始实时参考站巡检 —— 完整双普查仪轨（高度普查 + 字体族普查 × 双视口）。先测参考站桌面端。
eval 返回空 —— 先验证 eval 语法再用单次调用完成普查。
eval 可用但视口是 1280（env 未生效）。用 agent-browser 命令显式设置视口。
视口生效，参考站桌面 pageH = **11079** —— 与台账逐字节相等。执行完整分段普查 + 字体族普查（单次 eval）。
参考站桌面端**零漂移**（11079 / 分段 810/70/835/706/835/835/3549/835/835/746/470 / footer 444 / h3×36 全 Cormorant）。现在测克隆侧桌面端。
服务进程被 sandbox 回收（已知怪癖）。用 nohup+double-fork 方式重启。
后台进程被 sandbox 立即回收。使用 background-terminals skill（专为长驻进程设计）。
bg_* 工具未暴露给我。改用更稳健的方案：**Playwright 驱动的巡检脚本**（与 E2E 同引擎，server 子进程在单次 bash 调用内启动、测量、自毁，免疫 sandbox 回收）。先看现有截图基线。
20 张截图基线齐备。编写 Playwright 巡检脚本（单进程内：起服 → 双端双视口全量普查 → 自毁）。
模板字符串闭合有误。修复 `pinnedSurfaces` 与 `drawerCensus` 的括号。
发现真正问题：模板字符串缺闭合反引号，且抽屉 gap 计算误用 x（应为 y）。修复。
找到了：`JSON.parse(page.evaluate(...))` 需要两个右括号，当前只有一个。修复两处。
第 87 行无 JSON.parse 包裹只需单括号；第 109 行需要双括号。修正第 87 行。
Playwright 版本需要 chromium-1248（fresh-sandbox 已知怪癖）。安装浏览器。
**全量 sweep 完成 —— 参考站零新漂移**（round 6）：
- 桌面：ref 11079 逐字节 = 台账；克隆 11085（已知舍入 ≤2px/段）
- 移动：ref 11257；克隆 11264；deals 3174 vs 3171（session-9 已钉残差）
- **移动抽屉：panel/nav 类逐字符一致**，5 项 x=32/w=256/h=20，gaps [20,20,20,20] —— Tailwind v4 pin 完好
- 尺码芯片规格两侧逐项相等；字体族普查 100% Cormorant（h4 Montserrat ×3）
- 克隆 console 干净（仅 ref 自身 401）

结合审计 NIT 制定 session-11 修复计划。先看测试与布局文件结构。
7 种尺码词汇表确认（数字/斜杠/One Size/XXL 从未被 exact-list pin 覆盖）。查看 spec 惯例（logged-out opt-out 模式）后写修复计划。
惯例齐备。现在写 session-11 修复计划到 docs/。
计划中有一处需核实：两个 mobile-skip 用例的真实身份。查证后再修订计划。
两个 skip 是视口条件钉（<1024px 跳过），无法也不应“泛化”到移动端 —— 修正计划中的错误表述。
计划就绪。开始 TDD 执行。先读 product.spec.ts 全文与 home.spec.ts 的 H-63 块。
H-63 块已理解。查 PDP 相关产品区结构以确定 census 的稳定选择器（相关产品卡也渲染尺寸芯片）。
结构清楚了。现在实施 spec 变更（H-67/68/69 + A-1/A-2 RED 基线）。先看 cart-checkout.spec.ts 注释处与 brand-marquee 类名。
现在应用全部 spec 变更。
现在在 product.spec.ts 中的 H-67 census：
现在创建 accessibility.spec.ts（A-1 + A-2，预期先 RED）：
修正：`test.use` 不能在 test 体内调用。重构为嵌套 describe。
spec 变更完成。先 typecheck，再运行受影响 specs 验证 RED 基线（预期：H-67/68/69 绿、A-1/A-2 红）。
RED 基线符合预期（A-1/A-2 ×2 红，H-67 census 绿）。实现 A-1 与 A-2。
A-2:在 globals.css 末尾追加 reduced-motion 媒体查询。
A-1/A-2 已实现。重建并运行受影响 specs（预期全绿）。
A-1 全绿，A-2 仍红。查看失败详情。
机制已生效 —— 计算样式把 0.01ms 序列化为 `1e-05s`。修正断言。
6 个通过但预期 4 个 —— 检查 spec 是否有重复用例。
6 passed = 2 setup + 4 accessibility（CLI 过滤时 setup 项目伴跑）。现在 H-67 咬合力演示：mutate PDP 渲染路径 → 重建 → 预期 RED。
**RED 在双项目实锤**（census 立即捕获缺失尺码：5 vs 4）。回滚 mutation 并重建验证 GREEN。
Mutation 已回滚，census GREEN。运行完整门禁链（typecheck/lint/unit + 全量 E2E ×2）。
双次全量 E2E：**132 passed + 2 skipped**，算术精确吻合（66 unique ×2 − 2 视口跳过 + 2 setup）。门禁全绿。现在刷新截图 —— 先探测现有 PNG 的几何以复现捕获方式。
截图均为视口尺寸（1440×900 / 390×844）。扩展 sweep 脚本加入截图阶段，并在生产变更后复测克隆 census（证明 A-1/A-2 静息零影响）。
生产变更后 census 与变更前完全一致（A-1/A-2 静息零影响的直接证据）。比对截图与 HEAD 版本。
全部存在差异 —— 包括测量值字节相等的参考截图。这表明是浏览器构建版本差异 (1200 vs 1248) 而非页面变更。进行像素级 diff 以进行验证。
像素差异巨大（91%）—— 需目视检查。可能是轮播自动播放到了不同 slide。
旧截图是滚动到 sale 网格的取景（含尺码芯片），非页顶。查旧 deals 截图取景以理解其确定性。
查 ref 截图差异的本质（参考站内容 vs 浏览器构建 vs 取景）。
差异根因找到了：**轮播 slide 状态**（旧 ref 捕获在 02/03，我的在 01/03）—— 是捕获时序差异，非漂移、非浏览器构建。census 数字才是记录在案的 parity 证据。检查优先级最高的抽屉截图后收尾。
抽屉截图完美（320px 面板、5 项、遮罩正确）。验证变更后移动端完整分段，然后更新计划中的截图证据表述。
变更后 census 与台账逐字节一致。更新计划中截图证据表述（诚实记录 byte-compare n/a 的根因）。
计划定稿。现在对齐文档计数 —— 找出所有需要更新的位置。
更新四份文档的计数与 §8 无障碍状态。
PAD 主体已更新。在 coverage map 中补充 accessibility spec，然后更新 SKILL.md。
接下来是 SKILL.md — frontmatter, §2, §8, §11:
检查残留的旧计数引用，然后写 worklog。
残留引用仅在 worklog 历史条目中（不可改写）。写入 session-11 worklog 条目。
Worklog 已追加。执行 §11 预提交检查并审查变更清单。
检查通过（space-y 仅存在于 trap 注释中）。提交到 main。
提交 `f93033b` 完成（22 files，+586/−22）。现在按 wrapper 用法文档部署 SSH key 并推送。
Wrapper 用法明确。检查 paramiko shim 是否在 sandbox 重置中幸存。
paramiko 5.0.0 就绪。创建 shim（按前几轮经验 shebang 用 /usr/bin/python3.13）。
Key 校验通过（ed25519）。执行 dry-run 推送。
Dry-run 确认 fast-forward `82c0ce6..f93033b`。执行真实推送。
推送成功并远程验证（`main @ f93033b == local HEAD`），key 已焚毁。最终状态核查。
## Session 11 完成并已推送 ✅

**起点**：工作区再次被重置 —— 重新 clone 至 `82c0ce6`，冷重建环境（`.env` 恢复 `file:../db/custom.db` 契约、db 4/12/2/4、chromium v1248）。

**审计**：session-10 提交 8 项声明全部实锤；唯一有咬合力的发现 —— H-63 尺码钉只覆盖 7 种词汇表中的 1 种。

**巡检**：round-6 双普查 × 双视口 **零漂移**（参考站 11079/11257 逐字节 = 台账）；移动抽屉类逐字符一致、gaps [20,20,20,20] —— Tailwind v4 pin 完好。

**TDD**：H-67 全目录 PDP 尺码普查（mutation 演示真实 RED→GREEN）+ H-68/69；**A-1 skip-to-content + A-2 prefers-reduced-motion 两条遗留路线落地**（RED 先行，生产变更后 census 逐字节不变 —— 静息零影响实测证明）。

**终态**：113/113 unit、E2E **132+2 双次连测** ✓，`f93033b` 推送并远程验证，key 已焚毁。

**建议下一步**：下轮保持双普查仪轨；截图捕获脚本已入库（`scripts/parity-sweep-session11.cjs --shots`），未来可复现字节比对；剩余积压仅商业侧（真实 PSP、nonce CSP）。
