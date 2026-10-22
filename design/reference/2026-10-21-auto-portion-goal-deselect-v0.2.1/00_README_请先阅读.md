# FitLog Lite — 指定食物自动推荐克数 + 营养模板取消选中（最终批准 v0.2.1）

**状态：已获用户交互批准，可交 Codex 开发；尚未实施。**

## 唯一最终原型

`prototype/FINAL_APPROVED_FitLog_AutoPortion_Goal_Deselect_v0.2.1.html` 是唯一的最终视觉/交互基准。

- v0.2 设计逻辑已经由用户接受；其后用户指出右侧选中小圆点过小，并要求稍微放大且直接打包。v0.2.1 仅作这个视觉修正：**20px 圆形指示器；选中时内部圆点 +「已选中」文字**。
- `reference/Previous_Combined_v0.2.html`、`reference/Previous_AutoPortion_v0.1.html` 只证明迭代来源，**不可以取代 v0.2.1**。
- 演示的日期、两种营养模板、食物及结果是模拟数据；原型不是生产算法代码，严禁直接复制假数据/假存储。

## 本轮两项独立功能

1. **指定食物 → 自动建议克数**：已选食物来自真实 Food 库，按所选日期的已保存目标与当天真实饮食记录计算建议量；不强制用户先填写“实际克数”。选择列表保持当前滚动位置，单独进入结果预览，用户可修改建议量；仅实际吃下并明确确认后才写 FoodLog。
2. **营养模板 → 点击选中／再次点击取消**：这只是一轮「设置当日目标」的**界面暂存选择状态**，不等于生效中的 NutritionStrategyPhase、也不等于已保存 NutritionTarget。没有当日目标，即使存在生效阶段，也**不得显示伪“已选中”**。点击、取消选中绝不写数据库；进入下一步后，启用/日方案/应用目标仍使用已有确认流程。

## 严禁顺手扩大范围

不改营养目标原始数值定义，不自动补建被用户删除的当日目标；不增加模板“结束阶段／修改历史开始日期”功能，不删除模板或任何健康事实；不改计划、趋势、报告、周期排程、备份/恢复/同步格式、数据库 schema。

请依次读：`01_CODEX_EXECUTION_INSTRUCTION.md` → `02_DESIGN_LOCK.md` → `03_PORTION_RECOMMENDATION_CONTRACT.md` → `04_GOAL_SELECTION_STATE_CONTRACT.md` → `05_SCROLL_FOCUS_SHEET_CONTRACT.md` → `06_DATA_PRESERVATION_CONTRACT.md` → `07_ACCEPTANCE_MATRIX.md` → `08_TEST_RELEASE_REPORT_CONTRACT.md` → `09_CODEX_FORWARD_MESSAGE.md` → `10_SOURCE_MAP.md`。

所有原型和归档清单见 `FILES.json` 和 `SHA256SUMS.txt`。最终包 SHA256 请以消息和计算结果为准。该 ZIP 包不包含正式仓库源码；Codex 要从 `king-640-060/fitlog-lite` 获取当前 main。
