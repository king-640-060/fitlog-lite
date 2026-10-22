# 测试、证据和发布要求

1. 本地：新增单元测试覆盖 solver 的子集限制、多食物份量安全边界、混合完整/缺失营养、历史快照、无目标/全达标、超脂肪、确定性；新增 UI/双浏览器实测 320/375/390/430、深浅、200% 、短屏、keyboard viewport 模拟；最终候选全部重新运行，早期失败保留。
2. 浏览器：在本地 Chromium + WebKit 按矩阵逐动作收集 scrollTop（点击前、事件后、下一帧）、focus、dialog rect、20px 指示器、已选态 aria、FoodLogs 差额及每步 22 表 hash；截图含中途列表/预览/取消状态。
3. 旧数据：在隔离合成档案保存和重开后复核 22 表与配置、Backup14/Restore1–14/Sync1、历史目标和周期报告，不碰真实用户数据。
4. 代码：尽量复用既有 `completeNutrition`, `nutritionCompletionSourceSignature`, `applyNutritionCompletionPlan` / `nutritionGoalPicker`，不重做数据库模型；更新 `AGENTS.md`, `docs/UI_INTERACTION_SPEC.md`, `docs/UI_QA_MATRIX.md`, `LATEST_DEV_REPORT.md` 和专属合同/QA。
5. Git 与发布：符合 `docs/CHAT_CODEX_WORKFLOW.md`，先 START 基线，再 Application 提交/非强制推送/CI/Pages、生产资源/App/SW/离线验证，再 END 仅开发报告提交及第二次 CI/发布身份复核；必须说明实际仓库 SHA、job URL。
6. 最终回执**十项**：完成状态、逐文件清单、A/B 实现、Git START/Application/END、单元&浏览器命令含早期失败、实际视觉&滚动测量、保存数据/合成档案保留、文档、CI/Pages/离线、真实设备 Pending。完成后停止开发，等待 ChatGPT 独立验收。

当前冻结原型 QA：Chromium 5 种视口/主题 PASS；WebKit、真实 iPhone/键盘、生产 App 均未验证；此为开发前设计证据，不能冒充开发完成或正式发布。
