# FitLog Lite｜设置营养目标 → 选择模板／新建模板 + 稳定 Sheet v0.2

**状态**：用户已批准的唯一交互原型 v0.2；批准时间按 2026-10-20 记录。**本压缩包是开发交付材料，不是实现、不是 CI PASS 或已发布证明。**

**唯一批准原型**：`prototype/FitLog_Nutrition_Goal_Template_Sheet_Interactive_Prototype_v0.2.html`；SHA256 `e7fc5caf20eeac58151ee656cf22905bee6df1524e9c0964f946d0baa3c012d4`。禁止用旧 v0.1 覆盖 v0.2 的启用互斥与返程弹层行为。原型是假数据/模拟键盘，不可复制本地状态与保存逻辑进入业务代码。

**基础 Git**：编写时 `main=fa312427115db55311d9b2d380f0b87d7ac930d9`；执行时以 `git fetch` 得到的**最新 main** 为实际起点，不能强制回退。相关源码定位见 `08_CURRENT_CODE_SOURCE_MAP.md`。

**此批包含**：设置目标入口改造；可见的已有模板清单/新建/手动目标；模板启用、日方案选择和当日目标确认的连续流程；“新建模板／添加日方案”同一稳定 Sheet 的键盘/滚动/返回问题修正。**此批不包含**此前讨论但未在本原型审批中的体重／睡眠／饮水趋势底部说明删减，也不包含饮水 Sheet、报告、模板删除或新运动营养计算。

优先按顺序阅读：
1. `01_CODEX_EXECUTION_INSTRUCTION.md`：实际执行及交付。
2. `02_APPROVED_DESIGN_LOCK.md`：冻结的用户可见交互。
3. `03_NUTRITION_TEMPLATE_GOAL_CONTRACT.md`：模板/目标/阶段的事实一致性。
4. `04_SHEET_KEYBOARD_VIEWPORT_CONTRACT.md`：实机症状与几何修复。
5. `05_ACCEPTANCE_MATRIX.md`：通过条件与 Pending。
6. `06_DATA_QA_RELEASE_SAFETY.md`：数据保护、回归、提交与发布。
7. `08_CURRENT_CODE_SOURCE_MAP.md`：现有路径与根因。
8. `07_FORWARD_TO_CODEX.md`：转发指令简版。

此外附 7 张**成功状态**的参考截图和原型浏览器 QA JSON。旧测试工具生成的 `ERROR_*.png` 属于早期测试脚本错误断言，**未纳入批准交付证据**；不得将其误称为产品缺陷或最终失败。浏览器原型验证为 5 组 Chromium 测试；不能伪称真机 Safari PASS。
