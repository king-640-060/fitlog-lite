# UX-01–03 v0.4 · 开发候选 QA 与验收基线

本轮与已结案的 F1–F5 分开。START `d8b08b74e17e91139239f1d6d939ddd9b1d7030c`；本文件随 Application 提交，候选原始证据与最终生产验收证据由十项回执归档。App/END 的真实 CI、Pages、SW、离线及同档案结果见 [LATEST_DEV_REPORT.md](../LATEST_DEV_REPORT.md)，不能由本地 PASS 推断已发布。

## 输入、原型与实际观察

- ZIP SHA256 `8e53105055ddee13ccaa810d030d1fd1c8c0d508f344381a12a19ffd03ecc055`；安全解压，九项 SHA256 和 FILES.json 八项长度/哈希全部通过。原始文件冻结于[批准包](../design/reference/2026-10-17-ux01-03-v0.4/README.md)。
- 唯一 HTML SHA256 `96804e985c5287fa9d0ea857924335a30813a49758b74f1abf73af550dbf8ceb`，双引擎实际运行60组（5宽×2主题×3字体），操作折叠/展开、500/Undo/自定义、当前/历史/无引用模板删除与取消。原型不创建 IndexedDB；字体压力通过运行时 CSSOM 放大，无修改文件。
- 修改前真实 START 浏览器16组：标准 Today 饮水卡244px、快捷58px、17px字；进度 Sheet258.5px。标准候选折叠约131.73px，快捷44px、15px字，390宽进度 Sheet255.5px。紧凑化主要来自控制权重与折叠，不为追求数字牺牲16px输入或44px触控。
- [16张同条件原始对照图与检查说明](../design/qa/2026-10-17-ux01-03-v0.4/README.md)。完整240场景配对索引和所有原图在交付包 `visual-comparison.html`。已实际检查标准浅色卡片、展开、预览及窄屏大字体深色 Sheet；演示顶栏不复制，正式共享工作区/真实日期计数保持。200%重排保留触控/滚动。

## 自动化结果与命令

macOS / Node24 / 本机 Chrome 与 Playwright WebKit。`npm run typecheck`、`npm test`、`npm run build -- --base=/fitlog-lite/`实际通过；全量73文件 **1009/1009**（969原有+40新增，无 skip/todo）。完整构建日志、原始 JSON 和日志归档在本轮交付包。

```sh
npm run typecheck
npm test
npm run build -- --base=/fitlog-lite/
# 每条 browser 命令均设置实际 Playwright module、Chrome、QA URL 与独立 artifacts 路径
node tests/browser/uxWaterCascade.mjs
node tests/browser/uxWaterCascadeBackup.mjs
# 以上分别 FITLOG_UX_ENGINE=chromium / webkit
node tests/browser/pwaUpgrade.mjs
node tests/browser/productionAssets.mjs
node tests/browser/uxWaterCascadePreservation.mjs application
node tests/browser/uxWaterCascadePreservation.mjs end
```

后三类为发布门槛，随 Application/END 实际运行后在最终回执登记；此候选 QA 不预先标为 PASS。pwaUpgrade 使用真实旧V7及 START d8b08b7 构建，非伪造 SW。

- 新 UI 双引擎各30组，全量60组 PASS：320/375/390/430与844横屏，浅/深，100/140/200%。实际控制器/IDB写入，Today默认收起及往返、ARIA、500/1000等权、精确单条/防重/Undo、自定义333/非法整数、离线、日期、共享键盘模拟、焦点/滚动、原生checkbox、取消/拒绝、当前使用可预览、真实六类15条、重复确认、全部22表精确保留、设备配置字节不变、重开及被删周期不可选。390浅100另外通过跨窗口新增后拒绝旧预览、刷新重置确认、真实IDB删除故障注入/回滚再重试。键盘/安全区是浏览器模拟，非实体结论。
- 双引擎新 Backup UI各三阶段 PASS：真实删除→下载Backup14→实际旧d8 Backup14客户端Restore→当前客户端Restore/重开，22表一致，非法混合来源拒绝无写。两个引擎相同删除后内容hash `062e97cc7cec766bbab5cbe1eef845baaed94c782726ce75babf1ce09d3a1bc4`。
- 新40单测覆盖：精确范围/22表hash；同日手动覆盖及既有date唯一约束；8种来源冲突；6种异常周期；六表两连接变化；手动覆盖旧预览；六个删除步骤故障回滚+重开；后置验证捕获无关行写入并回滚；重复确认一次；Backup14/Restore/加密Sync1和失败Restore；周期报告消失、普通事实报告不变；结束阶段保留事实；归档后仍可永久删除；无关变化也保守要求重新预览。
- 原有37个独立浏览器套件全部保留，含三套双引擎（approvedJoint、F1–F5 UI/Backup），**40条完整命令全部 PASS**，未用 smoke/shard/skip替代原矩阵。六份旧饮水用例仅加显式展开前置操作；F5旧UI断言按新批准路径验证可点击→六类预览→取消零写/无引用两次确认；原 unused-only API保护单测未改。

|原套件命令|最终结果|
|---|---|
|`node tests/browser/aiAssistant.mjs`|PASS|
|`node tests/browser/aiDualModelRouting.mjs`|PASS|
|`node tests/browser/aiStreaming.mjs`|PASS|
|`node tests/browser/aiVoice.mjs`|PASS|
|`node tests/browser/approvedJointV05.mjs`|PASS|
|`node tests/browser/approvedJointV05.mjs`（WebKit）|PASS|
|`node tests/browser/catalogRecovery.mjs`|PASS|
|`node tests/browser/coachReportExperience.mjs`|PASS|
|`node tests/browser/combinedHandoff.mjs`|PASS|
|`node tests/browser/dailyRecordsExperience.mjs`|PASS|
|`node tests/browser/dietEvents.mjs`|PASS|
|`node tests/browser/foodRecovery.mjs`|PASS|
|`node tests/browser/foodServing.mjs`|PASS|
|`node tests/browser/foodVision.mjs`|PASS|
|`node tests/browser/foodWaterBackupV04.mjs`|PASS|
|`node tests/browser/foodWaterBackupV04.mjs`（WebKit）|PASS|
|`node tests/browser/foodWaterDayV04.mjs`|PASS|
|`node tests/browser/foodWaterDayV04.mjs`（WebKit）|PASS|
|`node tests/browser/githubSyncSafety.mjs`|PASS|
|`node tests/browser/habitDeletion.mjs`|PASS|
|`node tests/browser/habitEditorLayout.mjs`|PASS|
|`node tests/browser/interactionStabilization.mjs`|PASS|
|`node tests/browser/macroNutritionSummary.mjs`|PASS|
|`node tests/browser/managementVisualConsistency.mjs`|PASS|
|`node tests/browser/managementWorkspace.mjs`|PASS|
|`node tests/browser/mobileLayout.mjs`|PASS|
|`node tests/browser/motionPolish.mjs`|PASS|
|`node tests/browser/nutritionGauge.mjs`|PASS|
|`node tests/browser/nutritionTemplates.mjs`|PASS|
|`node tests/browser/remainingPrototype.mjs`|PASS|
|`node tests/browser/sharedDatePicker.mjs`|PASS|
|`node tests/browser/trainingJournal.mjs`|PASS|
|`node tests/browser/trainingRecoveryExperience.mjs`|PASS|
|`node tests/browser/trainingRecoveryLifecycle.mjs`|PASS|
|`node tests/browser/uiQualityAudit.mjs`|PASS|
|`node tests/browser/uiSemanticConsistency.mjs`|PASS|
|`node tests/browser/unifiedExperience.mjs`|PASS|
|`node tests/browser/v421Consistency.mjs`|PASS|
|`node tests/browser/v4FoodPlanToday.mjs`|PASS|
|`node tests/browser/voiceMode.mjs`|PASS|

## 数据不变量与冲突处理

DB13 / IDB130 /22表；Backup14 / Restore1–14 / Sync及加密envelope1。schema/index/版本/启动/备份解析和同步合同没有变化。冻结V7–V13的14文件加已批准Backup14 fixture共15文件逐字节与START一致，新增独立fixture。原unused-only API仍拒绝引用；新明确级联仅六表rw权限，按指纹/精确ID集合复查和后置保留验证。实际事实16表不参与删除事务。全部22表前/后hash及设备配置hash在每一场景receipt内。

NutritionTarget.date原有唯一约束不可能保存两个同日目标；测试验证手动覆盖清来源后保留，不按日期/值误删。外模板周期混入所删模板的分配、孤儿或其他非法数据整次拒绝零写，不能通过删他人周期/空日行来修复。有效结构不需六表外删除。未检查或删除用户个人数据库。

同一既有合成档案baseline22表/25行hash `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`；8项配置hash `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。baseline已实际验证不重播种/不清库；App及END需同档案重复并离线冷启动，最终见回执。自动化新建上下文只含合成记录/合成密钥。

## 失败尝试与修复

保留所有失败日志/截图，不计为通过：初次新UI测试在“重新读取预览”的异步替换前点到旧勾选，现刷新立即禁用旧确认/取消勾选，最终完整双引擎重跑 PASS；首次旧dailyRecords在320/140字体下0→500出现卡高跳变，修复为容器宽度驱动的稳定grid，24组独立几何检查及最终完整旧套件/新60组都 PASS。后续视觉人工检查发现390宽Progress两枚按钮因完整跨栏文案使auto-fit保留第三空轨；独立几何断言实际FAIL（354px容器只用约235.33px），将两按钮放入独立adaptive行后真实复测PASS（172+10+172=354px），并新增全行/纵排宽度断言。此前未完成旧回归两次因修复构建被明确中止，保留中止记录，不算 PASS；最终所有40条旧命令与新双引擎均在最后候选构建完整重跑。候选构建保持静态后完整重跑，不在活跃测试间覆盖dist。

## 验收编号与发布边界

PRE-01/02、UX1-01–03、UX2-01–03、UX3-01–09、DATA-01/02、REG-01/02、VIS-01及REL-01候选门槛有实际证据。REL-02/04需最终App/END CI/Pages/资源/SW/离线和十项回执补齐后结论。最终26行矩阵由交付回执逐项链接证据，不将本地构建身份当线上身份。

**REL-03 Pending**：本轮实体iPhone Safari、原安装PWA、真实键盘/Safe Area、VoiceOver和个人数据连续性未实际验收。真实Provider与外部启动器等扩展范围没有新增证据，不标通过。ChatGPT独立核查/用户最终验收留待其本人完成。原F1–F5用户六组实体验收36/36正式结案保持，不作为本轮新UX设备证据。
