# 可以直接复制发送给 Codex 的消息

请执行我上传的《FitLog Lite｜设置营养目标 + 模板 Sheet v0.2 已批准开发包》。用户已明确批准 `prototype/FitLog_Nutrition_Goal_Template_Sheet_Interactive_Prototype_v0.2.html`（SHA256：`e7fc5caf20eeac58151ee656cf22905bee6df1524e9c0964f946d0baa3c012d4`），不要替换为 v0.1。

从最新 origin/main 开始，先阅读 AGENTS.md、CHAT_CODEX_WORKFLOW.md、本包的设计锁、营养模板目标合同、Sheet/键盘合同及验收矩阵。

产品目标：①点击饮食「设置／编辑目标」直接看到已有可用模板+「新建模板」，手动作为次级入口；②未启用模板要单独确认启用日期与原模板影响，再选择日方案，预览并明确应用当天目标；③新建模板/添加日方案在稳定原生 Sheet 中完成，键盘展示/关闭、保存日方案返回后仍保持恰当高度与保存按钮可达；④真实数据只允许一个有效模板，不改已保存其它日期目标和健康事实。

复用现有 nutritionStrategyService/targetService、管理工作区及 Sheet 生命周期；不得仿照演示状态重新存档，不动 DB13/22表、Backup14/Restore1–14/Sync1、营养周期报告和模板范围级联删除。此任务不包含此前未正式批准的趋势说明文字清理。

必须双引擎测试窄屏、短屏、200%字体、键盘收放、父子页返回、异常/取消/并发/数据保护并提交实际几何测量、截图、回归与 CI。正常提交并发布 Application/END，按既有流程出十项回执。真机 iPhone/原安装 PWA/VoiceOver/真实 Safe Area 和个人历史数据验收如未实测就标 Pending。完工停止开发，等待 ChatGPT 独立审查。
