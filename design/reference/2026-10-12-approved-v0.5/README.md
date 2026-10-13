# FitLog Lite · Codex 联合开发交付包 — v0.5（2026-10-12）

**用途**：将 ChatGPT 已确认的联合可交互原型与正式开发规范一次性交给 Codex，供其实施生产代码。仓库：`king-640-060/fitlog-lite`。

## 请 Codex 首先执行

1. 解压整个 ZIP 至可读取目录（不要直接把 ZIP 内的 HTML 当成已落库的代码）。
2. 阅读根目录 **`CODEX_TASK.md`**、`ACCEPTANCE_MATRIX.md` 和 `DESIGN_LOCK.md`。
3. 执行 `sha256sum -c SHA256SUMS.txt`，核对所有文件字节；若某项不匹配，停止并报告。
4. 启动本地静态 HTTP server，在浏览器中实际运行 `prototype/FitLog_Joint_Interactive_Prototype_v0.5.html`，操作本任务涉及的场景（手机尺寸 + 深浅色）；不要只浏览截图或复制演示 JavaScript。
5. 进入 GitHub 项目仓库，**实际读取最新** `AGENTS.md`、`LATEST_DEV_REPORT.md`、`docs/CHAT_CODEX_WORKFLOW.md` 及相关业务合同；重新检查本地和远程 Git 状态。
6. 按 `CODEX_TASK.md` 分阶段开发，逐条核验 `ACCEPTANCE_MATRIX.md`，按项目现有 CI / 部署合同交付。

## 唯一权威视觉原型

`prototype/FitLog_Joint_Interactive_Prototype_v0.5.html`

SHA256：`c7024903b4e6a3e628119403c1d31284c0f6e3c9bdd422bf766234df759494f2`

它是用户最终批准的 v0.5。**不要采用早期 v0.2–v0.4 的日历头样式**；preview 仅辅助定位，不覆盖 v0.5 的视觉与交互规格。文件完全本地运行，演示数据不接入生产 IndexedDB。

## 包含内容

- `CODEX_TASK.md`：完整实施、数据兼容、测试、发布及回执指令。
- `ACCEPTANCE_MATRIX.md`：每项需求与必须提交的验证证据。
- `DESIGN_LOCK.md`：已确认设计细节、对照顺序、不可擅改边界。
- `prototype/`：批准的可点击 HTML，原字节保留。
- `previews/`：相关模块截图（部分截图来自旧版模块局部阶段，**只能辅助理解这些局部模块**，绝不能覆盖最终 HTML）。
- `issue_references/`：用户提供的原始日历/习惯弹窗问题截图。
- `SHA256SUMS.txt`：包内文件的 SHA256 完整性清单。

## 已上线、不得重复开发

2026-10-11 的联合交付 A–D（特殊饮食入口、模板动作空态、日历十类与精确删除、营养周期排程）已经在 `main` 落地。**本次只做其后的新需求与修复**，不是重做 A–D，也不得倒退十类日历或数据保护合同。

## 启动消息（解压并上传给 Codex 后粘贴）

> 请把附件视为本轮正式开发交付包。先完整阅读根目录 CODEX_TASK.md、DESIGN_LOCK.md 和 ACCEPTANCE_MATRIX.md，核对 SHA256；运行已确认的 v0.5 HTML 交互原型，再按仓库 AGENTS.md 及 docs/CHAT_CODEX_WORKFLOW.md 分阶段完成本轮开发、测试、提交/推送与允许范围内的发布，最后按十项交付回执返回实际证据。不得重做已上线的上一轮功能，不得将演示数据接入生产。发现重大未定业务规则时先说明并等待确认。
