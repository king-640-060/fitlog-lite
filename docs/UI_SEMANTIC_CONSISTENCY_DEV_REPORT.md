# FitLog Lite Development Report — UI Semantic Consistency Follow-up

2026-10-03（Asia/Shanghai）

## 请求的67项回执

| # | 项目 | 结果 |
|---|---|---|
| 1 | START_COMMIT | 5795113c9f383ef213e59cc53b5b59ba529ef6bd |
| 2 | UI_CONSISTENCY_COMMIT / END_COMMIT | a4d75942c9ebf58b45c3d4a32acb14bbe93a8585 |
| 3 | REPORT_COMMIT | 本报告提交自身；使用 git log -1 --format=%H -- LATEST_DEV_REPORT.md 查询，完整 SHA 在最终外部报告中。 |
| 4 | main HEAD | 应用发布时 a4d75942c9ebf58b45c3d4a32acb14bbe93a8585；最终报告提交自身，外部receipt明确最终HEAD。 |
| 5 | production HEAD | 应用发布时 a4d75942c9ebf58b45c3d4a32acb14bbe93a8585；最终报告提交自身，外部receipt明确最终HEAD。 |
| 6 | Workout root cause | 同一卡片家族的 primary/secondary 错误改变了 width/min-height/对齐；共享 primary 后加载也覆盖48px。 |
| 7 | Workout final geometry | 卡片基础规则统一 auto width、44px minimum、right aligned、nowrap、shared button padding、14px radius；家族选择器确保不被后加载 primary 覆盖。无单卡/id/nth-child hack。 |
| 8 | Strength hierarchy | 开始力量训练 / 继续训练仍为 lime primary，紧凑右对齐。 |
| 9 | Cardio hierarchy | 记录训练 / 再记一次为 secondary，保持最近记录入口。 |
| 10 | Kegel hierarchy | 开始训练为 secondary；空/已完成均保持同一结构。 |
| 11 | Today Workout old | 所有状态均 primary full-btn 查看训练/继续力量训练。 |
| 12 | Today Workout new | 删除 full-btn，统一44px、auto width、右对齐与短标签不换行。 |
| 13 | no-open style | 查看训练为 secondary navigation。 |
| 14 | open style | 继续力量训练为 primary ongoing action；同样 compact/right aligned。 |
| 15 | Plan root cause | shell header 与 renderPlanPage 空卡各自独立创建等价 showTaskEditor 入口。 |
| 16 | Plan empty | 仅 plan-empty-add；top + 真实 hidden、不可 focus，初始隐藏直到数据解析避免闪现。 |
| 17 | Plan populated | 仅顶部 +；没有 inline empty Add；completed-only 保留 header create。 |
| 18 | Upcoming empty | 仅 empty CTA；defaultDate仍 undefined。 |
| 19 | Inbox empty | 仅 empty CTA；defaultDate仍 undefined。 |
| 20 | Filtered empty | 当前 tag 筛选后为空时同样隐藏 top +；清除筛选后恢复 header create。 |
| 21 | Today calorie old | 左 ring 与右 actual kcal 是分离对象。 |
| 22 | Today calorie new | 实际 kcal 位于 ring center；右侧 goal/status；下方仍三格 macros。 |
| 23 | Food reuse | 共享 calorieGaugeHtml + 原 ringSvgHtml/getGoalProgress/goalStatusText；Today仅112px size/density modifier，Food仍140px及原 caption grammar。 |
| 24 | no-target | unset虚线neutral track + 圈内 actual + 尚未设置目标；没有虚构0%。 |
| 25 | target | actual840 / target1800显示840kcal、目标1800kcal、47%；reached为已达目标；zero为目标为0。 |
| 26 | above | 主环满、coral外环保留原excess/cap；2100/1800显示高于目标300kcal。 |
| 27 | accessibility | role=img gauge：今日摄入840kcal，目标1800kcal，47%；unset明确尚未设置目标；SVG aria-hidden=true。 |
| 28 | Management old | archive icon + 粗体本地数据 + 独立块，介于备注和第四设置项之间。 |
| 29 | Management markup | p.settings-section-note role=note，仅说明正文：数据保存在当前设备。更换设备或清除浏览器数据前，请先备份。 |
| 30 | Management CSS | margin8px10px0；text-secondary；.74rem；line-height1.5；无border/background/hover/44px row约束。 |
| 31 | icon removed | PASS：note没有SVG或setting-icon。 |
| 32 | heading removed | PASS：没有strong本地数据或独立标题。 |
| 33 | group membership | PASS：settings-group外、同一settings-section内；不是button/无tabindex。 |
| 34 | fresh-open scroll | 生产基线390/430各close/reopen：scrollTop0、首行完整。修改后四宽度+100/120/140%每宽度6次fresh-open同样PASS。430高屏正文可全放下时临时合成高度用于验证实际滚动后的reopen。 |
| 35 | scroll fix required | 不需要；未改sheetController/sheetViewport/Sheet lifecycle。 |
| 36 | 320×812 | PASS：semantic、geometry、overflow/44px、三macro列与现有release gates。备注基准字号自然两行。 |
| 37 | 375×812 | PASS：同上。 |
| 38 | 390×844 | PASS：本地+生产全部要求的主状态截图。 |
| 39 | 430×932 | PASS：本地+生产。 |
| 40 | 120% font | PASS：Plan empty/populated、Today gauge/ongoing、Workout、Management fresh-open。 |
| 41 | 140% smoke | PASS：核心结构不collapse；长标题自然换行，短action完整。 |
| 42 | screenshot QA | 新semantic gate：local38×4=152、production38×2=76，全部真实PNG；旧uiQualityAudit继续512local+236prod。人工查看代表截图与底部/字号截图，非仅统计文件。 |
| 43 | Today/Food comparison | 已人工对比：center actual、同stroke/track/outer/excess语言；Today compact、Food detail。 |
| 44 | Plan screenshots | empty/populated/Upcoming/Inbox/filtered-empty/completed-only，header create仅在适用state出现。 |
| 45 | Workout screenshots | empty、completed/one cardio、multiple/recent、open；三CTA右边界一致，Strength较强。 |
| 46 | Management screenshots | 基线与新footnote、fresh/reopen、120/140；说明为section footer，非设置项。 |
| 47 | baseline tests | 495tests /46files PASS（实际运行）。 |
| 48 | final tests | 495tests /46files PASS；新增专用browser语义回归，不添加镜像实现的静态单元断言。 |
| 49 | typecheck | PASS。 |
| 50 | build | npm run build PASS。 |
| 51 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS。 |
| 52 | diff-check | PASS。 |
| 53 | browser suites | 11suites：uiSemanticConsistency、uiQualityAudit、mobileLayout、interactionStabilization、aiStreaming、aiAssistant、aiVoice、aiDualModelRouting、foodVision、sharedDatePicker、githubSyncSafety。本地四宽度/生产390+430全部PASS。Streaming完整单独执行，保留所有原断言。 |
| 54 | AI regressions | Streaming/Assistant/Voice/DualRouting mock gates PASS；引擎/路由/凭证处理无修改。 |
| 55 | Sheet regression | interactionStabilization/sharedDatePicker PASS；Management scroll基线和修改后PASS，生命周期无修改。 |
| 56 | Food Vision regression | foodVision/uiQualityAudit PASS；Fast/manualHigh/step scroll/metadata/confirmed writes保持。 |
| 57 | GitHub Sync regression | githubSyncSafety PASS，5writes/6attempts各宽度；真实数据/token未用于QA。 |
| 58 | DB version | fitlog-lite-db / DexieV7（IndexedDB70）。 |
| 59 | stores | 14 unchanged；冻结15条业务数据在同一persistent synthetic profile前后完全一致。 |
| 60 | Backup | V7 unchanged。 |
| 61 | Restore | V1–V7 unchanged。 |
| 62 | Sync | EnvelopeV1 unchanged。 |
| 63 | migration | No migration；数据库、服务、schema/Backup/Sync实现与冻结fixture未改。 |
| 64 | Actions | Application [37083017124](https://github.com/king-640-060/fitlog-lite/actions/runs/37083017124) SUCCESS；Pages 6821144808 SUCCESS。Report提交部署receipt在最终外部报告中。 |
| 65 | production verification | https://king-640-060.github.io/fitlog-lite/ ：11browser gates390/430；实际JS/CSS bytes/hash与Pages dist一致；同一旧persistent profile14stores/15records、AIprofile/key/voiceack保留，SW升级+offline cold boot PASS。Report-only部署另在最终外部receipt核对。 |
| 66 | physical iPhone recheck | Pending：实体iPhone Safari/原已安装PWA重新查看Plan/Today/Workout/Management与原数据；真实Provider/Speech/外部QuickLauncher独立Pending。浏览器截图与键盘/Safe Area mock不能代替实体设备。 |
| 67 | remaining risks | 现有>500KB bundle warning保持；实体/Provider验证Pending。无未解决自动化/生产失败。预检阶段两项harness等待问题（异步Plan渲染、430正文无需滚动）已按真实状态修正；并发现/修复primary后加载48px，最终全部重跑。 |

## Inspection and scope decisions

五个问题在当前main中均确认未完成：强调等级改变重复卡片结构、空状态重复create、Today indicator与value分离、Today navigation过度强调、section note伪装设置项。Management fresh-open已正确，不改生命周期。

检索其它Management/Settings说明：备份与恢复的“存储”surface同时显示动态持久化存储状态，是独立storage status语义，与数据与备份section脚注不同，保持现有结构；没有扩大重构。未新增视觉系统/动画/依赖/图标/业务功能。Task optional date/reversible completion、canonical kcal/independent macros、Workout snapshots/autosave全部保持。

## Synchronization and QA chronology

开始为干净main5795113；首次pull网络挂起中断，第二次40s超时；GitHub API确认remote同SHA。第三次45s有界pull实际成功Already up to date，在application commit前完成。没有reset、squash、force或历史回滚。

新browser harness首次在tab click后立即检查异步render，改为等待已解析visibility；430×932较短Management正文不需要滚动，改为仅无scroll range时增加临时合成高度，以真实验证旧body滚动后的fresh-open。首次现有DatePicker gate捕获top +在data resolve前短暂可见，产品改为initial hidden后由最终state决定，并完整重跑。人工截图发现primary后加载仍48px，修改family基础选择器并断言三个按钮都44px。预检中的未完成两项gate在修改前终止，所有release gates最终使用同一最终Pages build完整重跑；不把预检或中断结果计为PASS。

## Evidence and manual review

`artifacts/ui-semantic-consistency/`保存semantic PNG/receipts、contact sheets、完整gate日志、baseline/final unit/build、Actions/Pages、production资产和preservation回执。`uiSemanticConsistency.mjs`可重复执行，使用新的隔离合成context，不能操作真实用户数据或keys。全页拼接PNG里的fixed nav可能出现在拼接中部，这是截图方式；底部遮挡仍由mobileLayout/uiQualityAudit独立检查。

人工查看local320/390全6组contact、375/430主要状态与字号组，production390全部组及430代表组；Today/Food、Plan empty/populated、Workout三个card、Managementnote及fresh-open均检查。完整首屏与底部/字号分开检查；截图成功不等于physical iPhone PASS。

## ChatGPT Baseline

先读AGENTS→LATEST→UI_INTERACTION_SPEC与相关文档，sync后以实际代码为准。五处UI semantic修复已发布。Plan仅一个适用create；训练family44pxcompact/right aligned、emphasis独立；Today/Food共享calorieGaugeHtml/ring semantics；Management是paragraph footnote，fresh-open原本正确。DBV7/14stores、BackupV7/RestoreV1–V7/SyncV1保持，无migration。实体Safari/PWA/真实Provider/Speech仍独立Pending；继续11browser gates与可复用QA matrix。
