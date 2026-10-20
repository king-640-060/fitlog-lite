# v0.2 本地实际执行证据

这里为Application提交前冻结证据，不能当作未来发布或真机验收。[QA逐项状态](../../../docs/NUTRITION_GOAL_TEMPLATE_V02_QA.md)、[合同](../../../docs/NUTRITION_GOAL_TEMPLATE_V02.md)、[原包](../../reference/2026-10-20-nutrition-goal-sheet-v0.2/00_README_请先阅读.md)。

- geometry-receipt.json / geometry.csv：最终Chromium/WebKit共40显示上下文、每步真实矩形/滚动/焦点与同dialog身份。
- safe-area-rotation-e.json：另4组，34px真实CSS占位和实际viewport旋转；仍为模拟。
- baseline-receipt.json：本轮START同流程复现820→408遗留style.height。
- water-regression-e.json：未改饮水、完整64组回归。
- regression-results.json：44条原有完整命令最终通过，allAttempts仅列最终E批次。所有早期失败/中断/复测的原始log/JSON、截图与CI结果在最终外部交付证据。
- source-data-scope.json：既有294文件逐字节核对，只允许4个已有产品文件变化，新增picker单列；所有冻结fixtures及旧批准基准不变。
- source-hashes.json / browser-hashes.json：最终源与61个浏览器脚本map。
- preservation-baseline.json：同一专用合成生产profile不reset/reseed，22表及8配置hash/离线基线；APP/END阶段由最终回执另证。
- unit/typecheck/build/PWA：真实日志；公开文本规范化本机路径，并去掉行末空白及多余末尾空行，原始外部日志不改。

依既有UI QA规范，普通运行截图保留在本聊天外部交付目录，不再提交截图二进制；批准包原始preview图片作为不可变输入完整归档。实体iPhone、原PWA、VoiceOver、真实键盘/Safe Area与个人数据连续性Pending。
