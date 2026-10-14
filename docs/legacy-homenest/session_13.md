按最新指令继续：目标文档更新为 session_10.md 与 session_11.md（表明远端已被 session 11 推进）。先刷新工作区并验证状态。
工作区已被重置——仓库目录不存在。按指令执行全新 clone。
Clone 完成（`6a7fc4f`，比我的 session-10 提交多一个 "update session log"）。`.env` 不存在（新 clone）。让我验证 .env/db 契约和最新提交内容。
`6a7fc4f` 仅新增 `docs/session_11.md`。`.env` 需按契约重建。先读 session_11.md 与更新后的 remediation-plan。
`docs/session_11.md` 是我 session-10 工作的原始转录（与 session_6/9 模式一致）。远端仅新增该转录。建立任务清单并重建环境。
文档套件与 7a67fc1 逐字一致（仅新增转录）——此前完整审查结论全部沿用。现在安装依赖并复现基线门禁。
typecheck ✓ 95/95 unit ✓。现在 build（prebuild 重新生成 SEO 工件——同时在全新 clone 中验证 SEO 工作流）。
构建成功，且重新生成的 SEO 工件与已提交版本**逐字节一致**（生成器确定性验证通过）。现在运行完整 E2E。
**全新 clone 基线完全绿：typecheck ✓ · 95/95 unit ✓ · build 506 KB ✓ · 182/182 E2E ✓**。现在进行强制的参考站 live re-sweep。
**Sweep-11：参考站无漂移（连续第三次）**——所有菜单 pins 与 SEO 姿态保持。现在对照 sweep 克隆站。
Preview 已被 E2E 收尾。重启后继续。
**克隆站菜单契约全部验证通过**（dialog 语义、行 pins 精确匹配、初始焦点搜索 pill、7×Tab 陷阱循环、Escape 还原）。最后验证 served SEO 工件与 PDP head。
克隆站 SEO head 与 served 工件全部验证通过。**Sweep-11 总结论：双侧无漂移、无差距**。现在捕获会话截图。
菜单截图完美（与 session-10 状态逐像素一致）。清理进程，写会话文档。
现在创建 docs/session_12.md 会话记录并更新 README 文档列表。
现在追加 worklog Task 13。
文档就位。运行最终预推送门禁，然后提交并推送。
提交完成（`3d40509`）。工作区重置也清除了 paramiko shim——需按 Appendix A 重新部署。
paramiko 5.0.0 就绪。部署 Appendix A 的 paramiko shim 到仓库外。
Shim 就绪，密钥指纹匹配。Dry-run 后正式推送。
## 会话 12 完成 — 已推送至 `main @ 3d40509` ✅

**工作区重建：** 环境已重置，因此重新执行了克隆操作 → `6a7fc4f`；`git diff` 证明文档套件与 session-10 的推送在字节上完全一致（远程仅增加了 session-11 的转录）。重新创建了带有固定的 `DATABASE_URL` 的 `.env`。

**原始克隆验证：** 完整网关重现 — 类型检查 ✓ · 95/95 单元测试 ✓ · 506 KB 构建 ✓ · **182/182 E2E** ✓。SEO 确定性已验证：重新构建生成了与字节完全一致的已提交 robots.txt/sitemap.xml（36 个 URL）。

**扫描：** 参考站**连续第三次未发生漂移** — 所有移动端菜单固定项均保持不变；克隆站的对话框契约、焦点捕获、Escape 键还原和服务的 PDP JSON-LD 均已实时重新验证。未发现缺陷，无需代码更改。

**文档：** 补救计划 §14，`session_12.md` 记录，README 会话行，3 张经验证的捕获图，工作日志任务 13。SSH 包装器推送已由包装器验证；密钥已粉碎。

**后续建议：** 审查 `docs/session_12.md` 和补救计划 §14；剩余候选任务 — 服务器端身份验证工作流、`aria-live` 组合框公告、ESLint 扁平化配置、可选的 PWA 清单。
