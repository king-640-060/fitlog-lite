# FitLog Lite Development Report

本轮：V4.2.1「剩余目标」原型定向还原，2026-10-10。仅修改 Today/Food 两个组件及其必要相邻容器。

## 代码身份与发布

- START_COMMIT：`bc0cbe1225898661414b10ed19b730a5f6f0109a`。开发前及提交前实际 fetch、main/remote 身份核对完成。
- APPLICATION_COMMIT：`0f4c9d10f7202c651993b1dd1ef8c6a527739ddb`。
- Application Actions / Pages：[38031469258](https://github.com/king-640-060/fitlog-lite/actions/runs/38031469258)，success；CI typecheck/test/build/deploy 均通过。
- END_COMMIT：承载本报告的 LATEST-only 提交，避免提交自引用。完整 SHA、最终 Actions 和生产资源/data/offline 回执记录在外部 `artifacts/v421-remaining-reference-2026-10-10/DELIVERY.md` 及最终回复。END 发布后继续核查。
- 正式环境：<https://king-640-060.github.io/fitlog-lite/>。

## 找回并固定真实设计基准

已在既有交付目录 `artifacts/v4-2-2026-10-10/prototype/FitLog_V4_2_Prototype.html` 找到原型，实际校验、运行、切换 Today/Food/主题，并检查实际 DOM、最终 CSS cascade 及355px规则。没有重新要求用户上传，也没有用文字推测代替。

- HTML SHA256：`aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687`，与用户提供值完全一致。
- ZIP SHA256：`7e9b64b701fc38d89d4ee08849bcdd3e238e86f6ffcdc9eb2ec9a10c52174dde`。
- 原始 HTML 原字节保存于 [design/reference/v4.2/FitLog_V4_2_Prototype.html](design/reference/v4.2/FitLog_V4_2_Prototype.html)，没有修改内容。
- [参考说明](design/reference/v4.2/README.md)记录来源、SHA、运行方法和验收边界。AGENTS/UI规范/视觉规范/修复合同明确：后续涉及此设计必须先运行并对照原型，禁止用纯文字网格替代或重复索要相同附件。
- 新增单元和浏览器 SHA256 guard，原型只作为视觉参考；没有将其演示数据、模拟计算或优化器引入生产。

## 实际修改

- `src/ui/remainingNutritionGoals.ts`：同一个纯渲染组件，保留现有 completionGapText/getNutritionCompletionSummary 的四项独立事实。Today恢复四个边框 mini-card、5px营养色点、标题右侧去补齐；Food恢复标题、四个数据格和底部两个等宽边框按钮。紧凑文字仅缩短前缀；完整语义保留在 canonical属性和可访问名称中。无目标/已达标仍可通过原有服务查看解释，不会生成虚假方案或写历史。
- `src/main.ts`：两页复用上述组件；Food剩余卡片移到营养总览之后，成为独立 sibling。原日期捕获、点击处理、补齐算法、预览/确认记录与实时刷新保持。
- `src/styles/nutritionBudget.css`：局部恢复原型背景、边框、圆角、padding、6px格间距、7px双按钮间距与字号/字重层级。局部 gutter恢复剩余卡片宽度，同时保留其他Food卡片的横向 bounds；Today小屏 host恢复原型留白。没有重做其他页面或已完成模块。
- 测试：新增 `tests/browser/remainingPrototype.mjs` / `tests/designReference.test.ts`；更新 `tests/v4Nutrition.test.ts` 的组件与完整状态断言；`tests/browser/v421Consistency.mjs` 从过时透明/同HTML断言改为原型结构及同canonical事实断言，其他回归断言保留；`tests/browser/v4FoodPlanToday.mjs` 仅增加独立 artifact目录配置；同步 `tests/browser/README.md`。
- 文档：更新 `AGENTS.md`、`docs/UI_INTERACTION_SPEC.md`、`docs/INTERACTION_VISUAL_SYSTEM.md`、`docs/UI_QA_MATRIX.md`、`docs/V4_2_1_VISUAL_REPAIR_CONTRACT.md`；新增原始 HTML 和参考 README；本文件记录最终验证。

## 原型与正式版实际视觉对照

同一 Chromium/WebKit、相同视口/系统字体/主题、等价合成实际记录与目标；保留每页原始截图及 DOM/computed-style JSON。原始字体100%对照未改变原型样式；字号放大用临时浏览器等比放大原型固定像素文字，HTML文件始终未变。

实际打开检查了390浅色/深色、320放大字体及发布后截图。`visual-comparison.html`提供33组线上原图对照；`comparison-390-100-light.png`、`comparison-390-100-dark.png`、`comparison-320-200-dark.png`是原图对照页截图，不是修图。完整逐项记录见外部 `VISUAL_REVIEW.md`。

|390px/100%|原型|正式版|结论|
|---|---|---|---|
|Today容器|324×172px|324×176px|宽度一致；44px触摸高度使总高+4px|
|Today四格|146×47px|146×47px|四格边框/营养色点/右侧入口恢复|
|Food独立容器|360×207.265625px|360×208.265625px|宽度一致；按钮触摸高度使总高+1px|
|Food四格|164×49.6875px|164×49.6875px|两列四格一致|
|格间距/容器圆角|6px/16px|6px/16px|一致|
|双按钮间距/圆角|7px/10px|7px/10px|等宽同排，尺寸规则一致|
|浅色容器/小格/边框|#f8f8f2/#fffefa/#e9e8df|同一现有Token|一致|
|主标题/数值字号|13px/12px|13px/12px|层级及对应字重一致|

明确保留差异，不能宣称完全逐像素一致：

- 控件最小44px，原型Today40/Food43px；不降低触摸可访问性。
- 正式版既有整数kcal格式保留；示例原型306.1kcal显示为正式306kcal，实际存储/算法未改变。
- 浅色辅助文字保留现有更高对比度 #697369；原型 #737c73。深色克制渐变复用现有surface Token，端点约一个蓝色通道差异，没有新增调色体系。
- 放大字体保留完整数值/单位换行，不使用原型的省略号裁切。两列四项、全部按钮和状态仍可读、无重叠/溢出。
- 320/375/390/430手机宽度下两个组件宽度与原型一致。844横屏保留现有外层布局：原型Today378/Food414px，正式550/586px；内部组件规则和可用性通过，未改全局页面布局。
- 真实缺失、未设、达标、超额四项状态保留；不能照搬演示版筛掉无目标项的行为。

## Automated Verification

|Gate|结果|
|---|---|
|npm run typecheck|PASS|
|npm test|PASS：846 tests /68 files；原844保留，新增2|
|npm run build|PASS：clean APPLICATION Pages构建；只有既有chunk-size advisory|
|git diff --check|PASS|
|remainingPrototype|Chromium33 + WebKit33，全部PASS；原型SHA、实际DOM/几何/色点/按钮/边框/字体/完整状态/无裁切及真实入口/预览不写入|
|v421Consistency|完整65组合PASS；保留其他六项修复的所有断言；WebKit5 PASS|
|v4FoodPlanToday|完整65组合PASS：连续添加、重复提交、历史日期、严格候选、未知/无可行方案、preview不写入、未来只读、即时跨页事实、任务同步、报告几何；WebKit5 PASS|
|macroNutritionSummary|完整40组合PASS：三宏量/gkg/未知/同日体重/跨页实时一致/大数值/大量食物/历史日期/对比度|
|foodRecovery|完整35组合PASS：餐次、旧记录、恢复/饮水/睡眠操作与布局|
|uiQualityAudit|完整4宽度及既有字号/横屏/弹层/键盘/备份恢复/同步入口/AI mock交互gate PASS|
|PWA升级|真实冻结V7→V11、实际START V11→APPLICATION V11，PASS；保护草稿/图片/待确认提案/其他client/取消/单次reload与离线冷启动|

原有测试保留，没有删除、skip或降低断言来获得通过。本轮执行受影响的上述6个UI套件及PWA/生产资源/数据保护；未宣称重新执行全仓其他未受影响套件。WebKit浮点字体13.200001与13.2px仅以0.001px表示精度比较；布局/状态断言保持。第一次并发生产浏览器出现ERR_NETWORK_IO_SUSPENDED/加载超时；并发质量gate出现Vision mock超时。失败日志保留为attempt1；减少并发后完整默认范围重新执行通过，未修改生产逻辑或验收条件。

## Production Verification

- APPLICATION线上 remainingPrototype33、v421Consistency5、v4FoodPlanToday5 全PASS；截图来自真实生产URL的独立合成上下文。
- Production HTML/build-info/SW/precache与本地clean APPLICATION精确一致；JS/CSS字节与SHA256全部匹配。
- 同一个上一轮既有专用合成生产profile，不清空、不重建、不重播：20stores/25rows及8项配置在START与APPLICATION哈希完全一致。
- Store SHA256：`6448eeaacd97e099ef91416e1db77db3f683113b11662765ad48c8e9dc995799`。
- Config SHA256：`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。
- APPLICATION App/SW均指向0f4c9d1，真实离线冷启动PASS；END之后再次验证身份、资源、同profile数据及离线。

## 数据版本与 Manual Device Verification

Dexie11 / IndexedDB110 /20stores；Backup11 / Restore1–11；GitHub Sync/encrypted envelope1。数据库、备份协议、恢复、同步、AI/Voice配置与算法均未改变，无迁移、清空或历史快照重算。没有读取或清空用户真实浏览器。

实体iPhone Safari、原有主屏幕PWA、真实键盘/SafeArea和个人设备历史连续性：**Pending**。四张此前真机图片是修复前证据，不能当作本轮发布后的设备验收。当前自动化范围没有未解决的功能/视觉结构问题；上文差异明确记录，不用测试绿色替代实际视觉核对。

## ChatGPT Baseline

Application0f4c9d10f7202c651993b1dd1ef8c6a527739ddb；最终main为承载本报告的LATEST-only END。V4.2.1剩余目标已恢复：Today四个边框小卡/色点/标题右侧去补齐，Food独立四格卡/底部两个等宽边框补齐按钮；共享真实事实与原服务。不可改原型SHA aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687，参考在design/reference/v4.2，任何相关后续先运行并对照。其他V4.2.1修复保持。846/68、相关6套件、Chromium/WebKit原型对照、真实PWA升级及生产数据/资源验证通过；物理Safari/原PWA仍Pending。外部证据根：artifacts/v421-remaining-reference-2026-10-10。
