# FitLog Lite Development Report — 营养目标与模板 Sheet v0.2

日期：2026-10-20。唯一v0.2原型已由用户批准；正式实现、完整必要回归、Application CI和Pages实测完成。本文件是通过这些检查后单独提交的END报告；END自身SHA、CI及线上身份在提交后核验，由最终十项回执提供。不能预写未来成功。新聊天应fresh fetch远程main核对最终身份。

## Git与批准基准

- START：`fa312427115db55311d9b2d380f0b87d7ac930d9`，干净main、fetch/ff-only同步，提交前再次核对，未覆盖他人修改。
- Application：[`b27601c872807fa329c200e3bd45ef7994918805`](https://github.com/king-640-060/fitlog-lite/commit/b27601c872807fa329c200e3bd45ef7994918805)，正常非强推main。
- [Application CI / Pages](https://github.com/king-640-060/fitlog-lite/actions/runs/39428782678)：success；typecheck、1088单测、生产build、Pages deploy实际通过。[正式站点](https://king-640-060.github.io/fitlog-lite/)。
- [批准包](design/reference/2026-10-20-nutrition-goal-sheet-v0.2/00_README_请先阅读.md)：20原成员逐字节保留；19条SHA、18条FILES与ZIP CRC/尺寸一致。唯一v0.2 HTML SHA256 `e7fc5caf20eeac58151ee656cf22905bee6df1524e9c0964f946d0baa3c012d4`，ZIP计算SHA256 `2bdc73613bd9144444cdca2bbe6a24c5df75daff298d41ee20647b54518ebb5e`；外部没有另给ZIP摘要，未冒称外部一致。390浅深实际运行批准原型，不回退v0.1、不移植假数据/保存逻辑。

## 实现与范围

产品仅5文件：新`nutritionGoalPicker.ts`、`nutritionStrategies.ts`、`nutritionStrategies.css`、`nutritionStrategyService.ts`和`main.ts`。目标入口始终先真实模板列表与新建，手动为次级；显示选定日期实际阶段和已有目标来源/四项值，归档/缺方案解释禁用。未启用模板须独立确认阶段，再选真实日方案，单独比较已保存/将应用后明确应用日期目标。

新建模板/日方案复用原管理workspace同一dialog/header/body、原服务和真实数值。日方案Save只写内存草稿，模板Save只写模板/方案并回选择器，不自动启用/生成目标。管理器保存/启用后返回也只读刷新真实列表和有效状态。手动0值、编辑、显式删除保留，另加事务内陈旧目标核对和busy防重。

编辑器局部释放冻结style.height，键盘关闭、子页保存返回恢复large高度。常规Save为所属固定footer；极短视口依实际高度将同一footer移入原body滚动，完整输入框和Save可达，不创建第二滚动区。复用已有fitlog-viewport-change生命周期，不改共享viewport/motion/Sheet控制器。Back/ESC/X/遮罩保护草稿，取消保留，失败留值可重试；监听/footer随路由释放。子页显示真实添加/编辑标题。

同日期最多一个有效阶段；启用在原事务内重新核对阶段/定义指纹，应用继续原完整预览/目标校验。刚从当天开始的阶段不允许同日替换，按既有历史合同明确拒绝，不能删除旧阶段或制造空阶段绕过。历史目标快照、其它日期、营养周期/排程、报告、区间级联删除、所有健康事实和计划保留。

## Automated Verification

- `npm run typecheck`、`npm test`：1088/1088、76文件，原1081保留+7项；Pages base生产build PASS。CI独立实际执行同样门槛，既有chunk-size advisory保留。
- 最终候选E的44条既有浏览器完整命令最终全部PASS，原业务/历史/数值/数据断言保留。仅旧营养模板脚本适配批准的列表入口和form关联footer，原完整300状态通过。此前中断批次不计最终完成；原日志、FAIL和复跑均保留。
- 新本地40双引擎上下文：320/375/390/430×100/200%×深浅加短屏和横屏；另4组34px真实CSS占位/实际viewport旋转。实测同dialog、outer/header/body/footer、焦点上下边界、Save滚入可达、返回完整高度和scroll。真实键盘/Safe Area仍Pending。
- 本地2组双引擎原生Escape/遮罩/X/草稿确认与键盘返回焦点；管理器返回新模板/唯一使用中与刷新零写入。非法草稿和每步22表精确允许ID核对；模板put、阶段add、目标put实际故障注入、回滚、重试、双提交、跨标签陈旧目标；7项单测含同ID阶段/方案变更和跨连接并发。
- 饮水完整64上下文PASS；jointUxReportsRange明确ONE定向双引擎各18高度组、9部位7→30→90→7高差0，保留报告/危险删除/回滚/并发断言；jointReportRanges双引擎日期/自定义/陈旧筛选/精确存活者PASS。没有把旧60上下文joint矩阵称为本轮全量执行。
- V7真实旧SW升级与离线PASS；Application另从本轮真实START资源测提示升级、Vision/AI草稿/提案/多客户端保护与明确reload。模拟Provider不代表真实服务。

正式App首轮32组通过后下一WebKit导航遇到网络离线；独立curl直连连接重置，现有7897代理返回HTTPS200。仅外部QA启动器显式使用该现有代理，本地绕过、TLS验证保留；不改系统设置/产品/测试，完整线上流程重跑，全部失败日志保留。

发布前实际补查修复管理器返回列表陈旧、首次同步resume注册重入，以及横屏200%键盘时输入上缘被标题遮挡。最后一项暴露原断言只检查键盘下边界的不足，已强化上下边界、实际标题、Save可达，并以最终E重新完成44条和全部新矩阵。最终E首批42 PASS/2 FAIL：两个删除后Backup套件的旧客户端资源未映射原/fitlog-lite/ base，旧页面未启动；新版删除导出阶段已通过。只在外部测试服务器映射原目录，逐字节验证原HTML和JS/CSS，两个完整套件不改源码/断言复跑通过。最终E共46个attempt、44条命令全部最终PASS，原失败保留。旧管理工作区等待Sync mock触及15分钟限制、Vision/Sync首次30秒超时，保留原日志；未更改这些产品模块/断言或宣称修复Sync缺陷，完整不改断言重跑通过。全部实际attempt见外部交付。

## 原型和生产UI

START两引擎实际复现：无有效阶段但已有模板时直接手填；初始820px，模拟键盘420px后子页返回遗留408px内联高度，减少412px。新390常规恢复820px、inlineHeight为空；40组几何测量及另4组安全区/旋转通过。已实际查看浅深、窄屏200%、横屏输入/Save及正式站点截图。

保留正式项目字体/token/标准控件、large最高820px、真实日期、原单列目标字段/管理/手动功能。演示原型720px、两列字段和模拟日期不硬编码到生产；差异见[实施合同](docs/NUTRITION_GOAL_TEMPLATE_V02.md)。普通截图保留外部交付，不新增运行截图二进制到仓库；原包图片原字节归档。

## Production Verification / 数据兼容

Application正式JS/CSS与本地干净构建逐字节/hash匹配，SW全文/precaches/build-info一致，local=false，App/SW=`b27601c872807fa329c200e3bd45ef7994918805`。正式App双引擎40组加2组键盘草稿实际PASS。

同一原专用合成Chrome生产profile从START→Application不reset/reseed；在线重开与离线冷启动22表hash `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置hash `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`完全相同。未操作个人健康数据。DB仍fitlog-lite-db / Dexie13 / IDB130 / 22表，Backup14 / Restore1–14 / Sync1 / envelope1；无迁移/格式/parser变更。

294个既有源码/fixtures/旧批准参考逐字节核对，仅4个允许既有产品文件变化，另新picker；其余290项与全部17冻结fixtures不变。报告/周期/删除/饮水/计划/共享Sheet和Toast未改。范围、Markdown本地链接、QA hash清单、git diff --check已实际通过。

END仅本报告；第二次CI/Pages后重核精确资源/App/SW、同原档案数据/配置与离线，另做双引擎4组加2组键盘线上复核，不冒充再次40组。最终值和结果见外部十项回执。

## Manual Device Verification / 已知边界

实体iPhone Safari、用户原安装PWA、真实键盘/Safe Area、VoiceOver及个人历史连续性Pending。浏览器WebKit、键盘模拟和合成Chrome档案不能替代。真实Provider未测，不标PASS；本轮ChatGPT独立代码/CI/视觉验收待交付后进行，原型批准不等于代码通过。

旧WebKit Undo −128px是既有边界，未归为本轮解决；本轮新饮水Sheet64组为0不证明旧路径/实体设备已修复。旧F1–F5用户36/36、联合v0.3和前轮结案历史保持，不重开。

## ChatGPT Baseline

本轮仅营养目标与模板Sheetv0.2；[实施合同](docs/NUTRITION_GOAL_TEMPLATE_V02.md)、[本地冻结QA](docs/NUTRITION_GOAL_TEMPLATE_V02_QA.md)、[测量与hash证据](design/qa/2026-10-20-nutrition-goal-sheet-v0.2/README.md)。已提交QA明确冻结于Application前，发布REL两项由真实最终回执补证，不倒写未来成功。

聊天工作档案`work/nutrition-goal-sheet-v02/`，十项回执、完整文件清单、两次CI、正式资源与截图、数据兼容报告、全部失败/复跑证据和校验ZIP在`outputs/nutrition-goal-sheet-v02/`。最终main以实际fetch为准。完成本轮发布验证后停止，等待ChatGPT独立核查，不继续其他UX。
