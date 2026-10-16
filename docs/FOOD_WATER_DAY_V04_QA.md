# Food / Water / Day Detail v0.4 · 候选QA记录

本页记录真实执行的开发候选门槛。Git/PWA/CI/Pages与同档案上线后哈希不从候选通过推断，见 LATEST_DEV_REPORT.md 与最终十项回执。批准包16项SHA256全部通过；原HTML SHA256 `856de7f201b630572c8eedadfd4b4e299700d153894f9ee2fd99b4663e5c81a3`。包提供的是展开目录，已原样复制归档，未虚构输入ZIP哈希。文件内title仍v0.2，原字节不改。

## 执行与覆盖

- Typecheck、全量unit、Pages base构建已实际执行；最新完整单测969/72，保留旧927项，新增42项，无skip/todo。新增测试包括四餐次/精确小数/旧模板、历史fallback、当前食物源更新与删除、目标冲突、未来拒写、来源变化、Backup14/Restore/Sync、冻结V13及V14、所有引用、两连接、删除/Restore失败回滚。
- 原35个独立browser suites全部保留（approvedJointV05 Chromium/WebKit两次），共36条完整命令最终PASS；使用原矩阵，未用smoke/skip降门槛。具体清单如下。
- foodWaterDayV04 Chromium和WebKit各20组PASS：320/375/390/430与844×390，100/200%字体，深浅色。实际创建组合及整日、默认100/编辑125.5/0.25完整精度、关闭重开/复制/同餐次重排保存重开/跨餐次切换/添加删除、FoodLog转模板、实际确认、未来预览、目标保留冲突、四餐次/克数/未知宏量、重复点击、500/1000/自定义/非法/离线/失败、精确Undo、0/1/11/100与长数字、全部十类展开前后不移位、跨页liveQuery、无引用可删/引用受保护/取消与删除历史保留。部分引用保护UI样本有0个日方案而仍有阶段，特意证明不能靠方案数量决定可删；正常冻结备份另作完整结构验证。
- foodWaterBackupV04 两引擎PASS：真实旧e082构建先恢复V13；拒绝V14且内容hash不变。候选恢复V13/V14、重开、真实下载导出14、非法meal拒绝不写。
- 冻结V7–V13共14文件逐字节与START Git对象一致；新approvedFoodWaterBackupV14.json是Backup14样本，数据库仍13/130/22表。Restore1–14、Sync/envelope1，设备配置排除业务备份。

## F1根因和几何

默认100来自dietTemplateItemFromFood(food,100)，没有全库改克数。修复前两引擎320/390×100/200%实测input82px、实际paddingRight13px，绝对定位g与数字/原生步进区域共用空间；200%截图出现挤压。新控件g独立流式列，放大时整行重排。模板重量绕过自动一位小数展示器，输入与实际预览保留0.25/125.5/999.99，未编辑源精度不丢。实体iPhone原问题复现仍Pending，不把浏览器截图冒充实体。

标准字号11条记录实测（含边框）：

|宽度|单卡宽|高|
|---|---|---|
|320|138|73|
|375|165.5|73|
|390|173|73|
|430|193|73|
|844|298|73|

0/1/11/100正常记录宽高稳定；极长合法数值和200%字体允许自然增长，无裁剪。Native details仍可展开，summary以固定网格坐标保持十张卡位置，完整事实排在网格后。WebKit有0.00003px浮点测量噪声，几何容差0.1px；未放宽数据/点击/引用断言。

## 视觉与原型

真实运行批准HTML：两引擎×四宽×两主题16组完整操作，无pageerror；额外80张200%/横屏字体压力原图，样式覆盖仅运行时，原HTML未改。候选292对原图（原型与原生产品）及原始JSON在交付附件；仓库[10组390px原图](evidence/food-water-v04-2026-10-15/README.md)保留。

生产映射保留现有原生Sheet与语义tokens、16px输入/44px目标、真实日期和营养事实。原型是嵌套演示页，产品保留现有Sheet左右内容宽度，不复制外层演示导航/手机状态栏/示例记录；新重量单位独立，整日餐次分组和折叠目标、等权饮水按钮、双列73px、营养模板直接删除/保留历史层级一致。实际移动/餐次编辑有显式控件，保留多行说明与完整历史；这些是持久化/可访问性映射，不能宣称像素完全相同。原型14px字段和25–41px按钮不覆盖生产16/44下限，原型固定73px/ellipsis不覆盖字体放大时完整阅读。Today/Trend/历史仍承担真实累计与记录，不把原型演示数据移植到弹层。

## 失败尝试与处理

保留全部日志。首次typecheck有未用import，已修正；旧Food摘要断言按新批准文案替换但实际/目标/快照保护保留；首次apply内无条件normalize会拒绝旧测试“当前Food有效但无fallback”的来源，改成保持旧解析行为并仅对缺失源fallback严格校验。浮点营养预期使用原canonical乘法顺序。

修复了饮水按钮在放大字体时继承最小宽度撑宽页面的问题。旧250动作对应总量预期更新为实际500/1000（如500+333=833），精确ID/次数/日期/Undo/来源断言保留。日期卡展开保留全部网格位置；一次测量取到入场动画16px，改为等待动画完毕后量实际几何。WebKit73.00003与73的噪声用0.1px容差，73px标准目标仍强校验。一次回归撞到本地dist重建短暂404，冻结服务资源后完整重跑通过。

多次既有WebKit动态系统主题模拟请求未生效（matchMedia仍是旧值），独立含mock clock/截图/reload诊断正常，原完整17组低并发重跑PASS；一轮uiQualityAudit等待Vision评审页超时后，原完整审计低并发重跑PASS；应用代码和原主题断言未改。保留失败状态/日志，不将此写成实体Safari已通过，具体驱动触发条件未定位。

交付前复查修复整日模板按全局索引移动的问题：现在只交换当前餐次的相邻项目，其他餐次保持位置，未分类同理，旧组合仍按平面列表移动。新增3项边界/不可变/旧语义单测；浏览器真实移动后保存并关闭重开验证顺序，再还原并应用。首轮新断言在异步编辑器挂载前读取到空列表，改为等待实际项目挂载，失败日志保留；未放宽顺序断言。

## 独立类别

实体iPhone Safari、原主屏幕PWA、真实键盘/Safe Area/VoiceOver及用户个人设备存储连续性：Pending。AI/Voice真实Provider与硬件是此前独立Pending；未使用用户真实密钥做QA。ChatGPT和用户独立验收仍待进行。以上不计入自动化PASS。

## 完整原suite清单

- aiAssistant：PASS，['node', 'tests/browser/aiAssistant.mjs']。
- aiDualModelRouting：PASS，['node', 'tests/browser/aiDualModelRouting.mjs']。
- aiStreaming：PASS，['node', 'tests/browser/aiStreaming.mjs']。
- aiVoice：PASS，['node', 'tests/browser/aiVoice.mjs']。
- approvedJointV05：PASS，['node', 'tests/browser/approvedJointV05.mjs']。
- approvedJointV05-webkit：PASS，['node', 'tests/browser/approvedJointV05.mjs']。
- catalogRecovery：PASS，['node', 'tests/browser/catalogRecovery.mjs']。
- coachReportExperience：PASS，['node', 'tests/browser/coachReportExperience.mjs']。
- combinedHandoff：PASS，['node', 'tests/browser/combinedHandoff.mjs']。
- dailyRecordsExperience：PASS，['node', 'tests/browser/dailyRecordsExperience.mjs']。
- dietEvents：PASS，['node', 'tests/browser/dietEvents.mjs']。
- foodRecovery：PASS，['node', 'tests/browser/foodRecovery.mjs']。
- foodServing：PASS，['node', 'tests/browser/foodServing.mjs']。
- foodVision：PASS，['node', 'tests/browser/foodVision.mjs']。
- githubSyncSafety：PASS，['node', 'tests/browser/githubSyncSafety.mjs']。
- habitDeletion：PASS，['node', 'tests/browser/habitDeletion.mjs']。
- habitEditorLayout：PASS，['node', 'tests/browser/habitEditorLayout.mjs']。
- interactionStabilization：PASS，['node', 'tests/browser/interactionStabilization.mjs']。
- macroNutritionSummary：PASS，['node', 'tests/browser/macroNutritionSummary.mjs']。
- managementVisualConsistency：PASS，['node', 'tests/browser/managementVisualConsistency.mjs']。
- managementWorkspace：PASS，['node', 'tests/browser/managementWorkspace.mjs']。
- mobileLayout：PASS，['node', 'tests/browser/mobileLayout.mjs']。
- motionPolish：PASS，['node', 'tests/browser/motionPolish.mjs']。
- nutritionGauge：PASS，['node', 'tests/browser/nutritionGauge.mjs']。
- nutritionTemplates：PASS，['node', 'tests/browser/nutritionTemplates.mjs']。
- remainingPrototype：PASS，['node', 'tests/browser/remainingPrototype.mjs']。
- sharedDatePicker：PASS，['node', 'tests/browser/sharedDatePicker.mjs']。
- trainingJournal：PASS，['node', 'tests/browser/trainingJournal.mjs']。
- trainingRecoveryExperience：PASS，['node', 'tests/browser/trainingRecoveryExperience.mjs']。
- trainingRecoveryLifecycle：PASS，['node', 'tests/browser/trainingRecoveryLifecycle.mjs']。
- uiQualityAudit：PASS，['node', 'tests/browser/uiQualityAudit.mjs']。
- uiSemanticConsistency：PASS，['node', 'tests/browser/uiSemanticConsistency.mjs']。
- unifiedExperience：PASS，['node', 'tests/browser/unifiedExperience.mjs']。
- v421Consistency：PASS，['node', 'tests/browser/v421Consistency.mjs']。
- v4FoodPlanToday：PASS，['node', 'tests/browser/v4FoodPlanToday.mjs']。
- voiceMode：PASS，['node', 'tests/browser/voiceMode.mjs']。
