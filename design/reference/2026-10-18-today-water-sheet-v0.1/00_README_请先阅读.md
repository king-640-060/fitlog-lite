# FitLog Lite · 今日饮水底部 Sheet 交付包（用户批准）

**状态：已确认原型，待 Codex 实现。** 创建：2026-10-18。唯一批准视觉和交互基准为 `prototype/FitLog_Today_Water_Bottom_Sheet_Interactive_Prototype_v0.1.html`，SHA256：`b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`。用户已明确选择「方案一」，亲自确认 v0.1 原型通过，不需要重做原型或重新选方案。

本包不是代码补丁，也没有更改仓库、CI、Pages、IndexedDB 或任何个人业务数据。原型中展示的数字和水量记录均是独立演示值，不得复制到正式 App。

## 冻结的产品结论

- **今日首页**：与「记录体重」「记录训练」「开始睡眠」同级的 **「记录饮水」右侧普通次级按钮，无箭头**；不要为塞下箭头而压缩文字或填充，也不再在首页卡片下方展开快捷按钮。首页数据区保持紧凑，颜色/字重/尺寸/形状与同级按钮一致。
- **点击入口**：从手机屏幕底部弹出紧凑的饮水记录 Sheet；含两个等权 +500 ml／+1000 ml、次级「自定义饮水量」，参考值修改和历史记录仍可到达。记录成功自动关闭，今日累计实时更新并显示可撤销操作。
- **真实业务**：继续使用现存 `addWater`、`WaterLog`、精确撤销、历史、参考值，现有进度页饮水 Sheet 优先复用；不要照搬演示数据、演示 JS 或开发另一个保存体系。
- **不动**：三张趋势图高度/日期轴、两份报告、营养模板及日期区间级联删除、Plan/Tasks、数据库22表、Backup14／Restore1–14／Sync1／envelope1、既有其他体验和数据事实。

## 执行阅读顺序

1. `01_CODEX_EXECUTION_INSTRUCTION.md`（正式12节交付指令）
2. `02_APPROVED_DESIGN_LOCK.md`（设计与交互锁）
3. `03_INTEGRATION_AND_DATA_CONTRACT.md`（真实业务集成/数据/撤销）
4. `04_ACCEPTANCE_MATRIX.md`（逐条验收）
5. `05_QA_RELEASE_SAFETY.md`（测试/发布/真机边界）
6. `06_EVIDENCE_AND_SCOPE.md`（已知证据/基线事实）
7. `prototype/` HTML 打开实际操作；`preview/` 截图作参考；`evidence/` 只包含 ChatGPT 已有原型模拟检查记录。
8. `07_FORWARD_TO_CODEX.md` 可直接复制转交。`SHA256SUMS.txt` 验证包内内容，`FILES.json` 验证文件清单。

## GitHub 基线说明

编写本包时通过连接核对 `king-640-060/fitlog-lite` 远程 main = `120cb0624d0efa06b7ff7ce638e7d02104d4d62c`（上轮「今日饮水按钮颜色统一」 END）。**开始开发时 Codex 必须重新 `fetch`，以实时 main 为准；不假设它永远等于这个 SHA。** 项目规范：`AGENTS.md`、`LATEST_DEV_REPORT.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`docs/UI_INTERACTION_SPEC.md`，数据与发布合同按仓库现行版本执行。

**用户授权本包对应开发、测试与正常发布；不要把 ChatGPT 原型验收、Codex 自动化、真机人工验收混为一谈。**
