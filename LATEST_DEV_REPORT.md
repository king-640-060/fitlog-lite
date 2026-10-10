# FitLog Lite Development Report

本轮：V4.2.1 上线后视觉与交互一致性精确修复，2026-10-10。

## 代码身份与发布

- START_COMMIT：`98abbddffa8c3321b0f12222306360adcc678b6b`。开发前实际 fetch、clean main、ff-only 与远程身份核对完成。
- APPLICATION_COMMIT：`3253648b5b79bc9e495c34cd30a16295261dd99b`。
- Application GitHub Actions / Pages：[38025229385](https://github.com/king-640-060/fitlog-lite/actions/runs/38025229385)，success。
- END_COMMIT：承载本报告的 LATEST-only 提交，避免提交自引用。精确 SHA、最终 Actions、生产 assets/data/offline 回执保存在外部 DELIVERY.md 及最终回复。
- 正式环境：https://king-640-060.github.io/fitlog-lite/ 。Application 线上定向套件、资源字节身份与同一个既有合成 profile 的数据保留核查均完成后才形成此报告；END 发布后再验证。

## 设计来源与证据边界

完整读取 V4.2.1 用户指令、AGENTS、此前最新报告、UI_INTERACTION_SPEC、INTERACTION_VISUAL_SYSTEM 与 V4.2 合同，定向检查七处问题及相邻区域。原始 V4.2 ZIP/HTML 仍可读取；本轮重新实际打开并操作原型，未用旧版替代。

- ZIP SHA256：`7e9b64b701fc38d89d4ee08849bcdd3e238e86f6ffcdc9eb2ec9a10c52174dde`。
- HTML SHA256：`aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687`。
- 初始附件只有指令；回归期间用户补传四张真实 iPhone 修复前截图，已全部实际读取并保留原图/哈希，确认饮食摘要拥挤、报告说明空白、特殊饮食/餐食间距问题。截图没有今日页或新版发布后证据；浏览器使用合成资料与不同视口，不能宣称同设备逐像素一致或新版真机验收。
- 先在 START 构建复现并保存五组修复前原图/几何，再实施。新增 `docs/V4_2_1_VISUAL_REPAIR_CONTRACT.md`，同步耐久交互规则、视觉规范与 QA 矩阵。

## 七项修正及原因

1. **饮食日记录摘要**：原先在右窄列串联完整实际宏量与目标。折叠改为实际 kcal、记录数及已保存目标提示；展开采用明确 actual/target 四项 dl 网格，再保留原有全部逐食物克数、营养及每参考量历史快照。只有目标没有饮食记录时仍可查看目标；未知、未记录、未设置分别表达。保持九类共享 native disclosure 与辅助读屏信息，长名称转义，大数值与 200% 字体不丢失。
2. **报告统计说明空白**：实测34px来自全局 details 的16px margin、父 grid 的12px gap及 note 的6px margin。新增局部 footer 布局，将详情及说明纳入同一6px节奏，移除该详情冗余 margin；展开自然撑开，无固定裁剪。营养四卡和完整统计口径未删改。
3. **特殊饮食／今日饮食交界**：原 .diet-events 上下20px margin 与 .food-content-body 12px gap叠加至32px。移除冗余 margin，由 body gap统一负责12px；餐食标题允许合理换行。空态入口、真实特殊记录编辑、保存模板及四个紧凑餐次保留。9999kcal特殊估算测试证明实际摄入仍1619kcal。
4. **今日剩余目标**：共享真实 remainingNutritionGoals 渲染和计算，但明确 Today透明紧凑两列四项 + 单个轻量「去补齐」，Food安静边框卡 + 智能/指定两入口。清除 main/recovery/nutritionBudget 的旧互相覆盖样式，由共享基础和两页面变体负责。未设、达标、超额、记录不完整事实一致。
5. **今日力量／有氧**：采用相同 type/status/metadata + 右侧 compact action 结构。普通「记录训练」「记录有氧」secondary；现有「继续力量训练」primary并打开原记录。新增有氧入口复用原表单和服务，明确捕获本地 Today，避免沿用 Workout 的历史日期；成功后即时刷新 Today。有氧历史记录原内容不变。
6. **今日睡眠**：idle「开始睡眠」secondary，active「我醒了」primary；保持既有服务、进行中唯一性、开始/结束/编辑/取消/历史与忙锁，补全 pending rerender 的 aria-busy。趋势睡眠语义未改。
7. **今日同级操作**：训练/体重/凯格尔/睡眠的 compact action 共享同一几何与全局状态，44px最小高度、右对齐、共同字体/padding/radius。饮水保持同一 secondary primitive 及现有快捷记录组合，历史轻量、危险安静；没有导航或布局重设计。

## 自动化结果

| Gate | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm test | PASS：844 tests / 67 files；原841全部保留，新增3 |
| npm run build | PASS：clean APPLICATION Pages build；仅既有bundle-size advisory |
| git diff --check | PASS |
| 原31 browser UI suites | 全部PASS，原完整矩阵/周期保留，没有删除、skip或降低断言 |
| 新 v421Consistency | PASS：65显示组合；追加390完整16组及代表交互回归 |
| WebKit | PASS：五个定向显示组合及实际表单操作；不是实体iPhone证据 |
| PWA升级 | PASS：冻结旧V7→V11、实际START V11→APPLICATION V11 |

65组合：320/375/390/430px ×100/120/140/200%字号 ×浅/深 ×normal/reduced，加844px横屏。原31覆盖连续饮食、指定补齐、全报告/训练/趋势、20完整周期、Sheet/监听/图表/计时/焦点/滚动锁、AI、JSON恢复、同步冲突及旧记录；未缩减为 smoke。

新增覆盖相同剩余事实不同密度、展开全部保存营养与目标、target-only天、统计自然展开/间距、特殊空/已记录/编辑、正确Today有氧17.125分钟及历史行不变、Strength原记录继续、Sleep开始/结束。真实IndexedDB写锁期间重复点击Sleep只生成一行，pending disabled/aria-busy完整；长名称含HTML字符及极大值在320px/200%下完整安全显示。页面及弹层无横向溢出/截断，模拟键盘/SafeArea由原完整套件保护。

开发中测试失败与修正日志保留：结构改变后的旧可见文本断言更新至展开数据；新增测试状态文案及 immersive editor 退出顺序修正。没有删除原数据/业务/布局约束来取绿。

## 几何证据

| 区域 | START | APPLICATION |
| --- | ---: | ---: |
| 统计详情末尾 → 底部说明 | 34px | 6px |
| 营养主区 → 特殊饮食 | 32px | 12px |
| 特殊饮食 → 今日饮食标题 | 32px | 12px |
| 今日饮食标题 → 餐次 | 12px | 12px |

65组合：报告四卡最大宽差0、高差0、同行进度条基线差0；Today五个同级普通操作右边界差0，最小高度44px。390px/100%折叠饮食行高度141.53→87.81px；320px/200%深色299.14→191.66px，展开全部值仍保留。

## 生产与数据保护

APP生产八项全部PASS：productionAssets、v421Consistency、foodServing、foodRecovery、macroNutritionSummary、dailyRecordsExperience、coachReportExperience、uiSemanticConsistency。首次线上测试有三组遇到系统网络变化/断网/DNS拒绝连接，原日志保留；连接恢复后全部完整重跑PASS，没有删断言或降低范围。五组线上V4.2.1代表条件含320px/200%/深色和横屏，实际查看Today/Food/Report全页及滚动后局部原图，六张对照已使用真实部署APP原图。

clean APP生产资源与本地字节一致：index-BSL54vJc.js（873710字节，SHA256 a31dca8cec0c287cba4f9d406b8e7fdde92a81c3366baaf5cfc2f32ca78e82fd）、index-Cx5siiDL.css（148001字节，5356d1ca81fdbf68946ffbd1f106ce99db537f9286e5020cd2271f0a9c3c04bd）。build-info/App/SW均3253648；SW精确字节和precache匹配。END发布后重新核对其对应clean资源。

同一个既有合成生产 profile 继续使用，没有清库或重新播种：DB110、20stores、25rows及8配置项逐内容哈希与 START baseline 一致。

- allStoreHash：`6448eeaacd97e099ef91416e1db77db3f683113b11662765ad48c8e9dc995799`。
- configHash：`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。

APP App/SW身份一致及离线冷启动后哈希仍一致。END使用同一profile再次核查。隔离合成资料与用户真实浏览器不同；线上自动化IPv4路由仅限测试Chrome，HTTPS origin不变。

Dexie11 / IDB110 /20stores、Backup11 /Restore1–11、Sync/envelope1、AIConfig1、VoiceConfig1、WaterReference1与Video永久退休均不变。无迁移、历史快照重算、配置重置或删库；DB/Backup/Restore/Sync/AI业务源文件未改，营养补齐/目标/gkg算法和V3.1报告/趋势/执行引擎未改。旧冻结fixtures未修改。

## 截图与文件

外部目录：`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/artifacts/v4-2-1-2026-10-10`。

保存 prototype/reference、before、local65、webkit5、prod5原图；today/food/report/food-detail/report-expanded/sleep-active 六张前后对照、320px/200%深色原图裁切、SCREENSHOTS.md、VISUAL_REVIEW.md、geometry.json、完整日志、verification-ledger.json及preservation baseline/APP/END。END精确身份/Actions/assets见外部 DELIVERY.md。

实际Application18文件清单见外部 CHANGED_FILES.md，另加本报告的 LATEST-only END：

- 页面/组件：src/main.ts、src/ui/dayDetail.ts、src/ui/coachReport.ts、src/ui/recovery.ts。
- CSS：src/styles/main.css、nutritionBudget.css、coachReport.css、recovery.css。
- 测试：tests/browser/v421Consistency.mjs、v4Preservation.mjs、README.md、tests/dailyRecordsSummary.test.ts、dayDetail.test.ts。
- 规范：AGENTS.md、docs/UI_INTERACTION_SPEC.md、INTERACTION_VISUAL_SYSTEM.md、UI_QA_MATRIX.md、V4_2_1_VISUAL_REPAIR_CONTRACT.md。

## Pending 与下一轮基线

- 四张用户真实iPhone修复前截图：已读取，结构问题已对照；新版相同设备复测仍Pending。
- 实体iPhone Safari、用户原安装主屏幕PWA、用户真实设备数据连续性：Pending。

自动化没有已知未解决产品缺陷；WebKit、模拟键盘/SafeArea及浏览器PWA证据不能冒充物理设备。不要卸载原PWA或清除网站数据进行验收。

下一轮重新实际检查 main/remote，承载本报告的 END 为发布身份。V4.2.1七项精确修复合同优先于过时视觉规则；保留原V4.2真实连续录入/指定补齐、V3.1分析/趋势/执行、数据库/备份/同步与原有所有回归门禁。
