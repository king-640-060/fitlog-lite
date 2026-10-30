# FitLog Lite 日历手势回归修复 · Codex 正式交接包

**状态：用户已确认原型，允许进入正式开发。**

任务：修复 `进度 → 日历` 的误横向拖动与纵横手势争夺；保持顶部「趋势／日历／报告」可跟手横向切换，以及 v0.9 / Progress Layout v2 已修复的布局、功能和数据合同。

仓库：`https://github.com/king-640-060/fitlog-lite`
打包时远程 `main`：`11c058ac6014842a9098443b7b8f304ad6d2d467`（**仅供定位，执行前必须 fresh fetch 核实**）。

## 阅读顺序

1. `01_CODEX_正式开发指令.md` — 必须执行的完整任务书（按 ChatGPT × Codex V2 的十二项结构）。
2. `02_逐项验收矩阵.md` — 每个可验证场景和通过判定。
3. `prototype/FitLog_Lite_Calendar_Gesture_Prototype_v1_APPROVED.html` — **唯一批准的本轮日历手势原型**。
4. `prototype/calendar_v1_preview.png` — 静态参照，不能代替真实交互测试。
5. `evidence/USER_calendar_unintended_drag_recording.mp4` — 用户提供的现网问题录屏，仅用于内部复现；不要将录像公开发布到仓库。
6. `SHA256SUMS.txt` — 全部包内交付文件哈希。

## 原型冻结声明

- 原型名称：`FitLog_Lite_Calendar_Gesture_Prototype_v1.html`，本包副本仅为命名添加 `_APPROVED`，**字节完全不变**。
- 原型 SHA256：`4207d932fcfe90d2d4e41d119f3eb28f6f767d0e2f63c83a59804ef94c5df177`。
- 用户已回复「没问题」，随后要求「给我压缩包」，本次不再重复要求批准。
- 原型中的日期、食物标记、趋势及报告数值均为**演示数据**，不得复制进生产业务，也不得读取/修改用户 IndexedDB。

## 范围和边界

- 本轮只授权日历手势的最小必要修复及相关测试、文档、正常 Git/CI/发布流程。
- **不是**第二轮 v0.9 三层报告导航改造；不得因此重构独立 localDeck、图表、报告、训练或饮食。
- 交付前不能把自动化 WebKit 模拟说成真实 iPhone 验证。

## 交付回执

按 `01_CODEX_正式开发指令.md` 的第 12 项提交十项回执；要明确最终 Application/END SHA、CI 链接、现场失败和复验、Pages/App/SW、截图对照、数据保持和 Pending。
