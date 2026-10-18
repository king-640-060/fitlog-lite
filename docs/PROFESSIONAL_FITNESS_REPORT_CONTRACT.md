# Professional Fitness Report Contract — V3.1

## Design source

The user supplied `fitlog_coach_report_prototype_v3.html`, whose title is V3. The exact V3.1 file was not available. Use this actual HTML's report/trend/training anatomy together with the current request's explicit V3.1 corrections; never claim to have read a different file. In particular, replace its sparse145px chart override with one scalable162px plotting height. Preserve real application functions, five main tabs and three Progress tabs. Prototype demo fixtures/functions/debug controls never enter production.

## Read-only facts and comparisons

Only completed, valid Workout sessions enter professional performance analysis. Positive integer repetitions and finite nonnegative external weights follow existing validation. Missing weight remains unknown; count otherwise valid recorded sets but exclude them from load/volume. Snapshot names remain unchanged. No estimates of1RM, calories, muscle, fat loss, muscle groups or working sets.

Match exerciseId first. Legacy exact normalized names may join a single unambiguous identity; distinct IDs never merge and ambiguous names produce separate unreliable legacy identities. No fuzzy equipment/form matching. Group the complete qualified history once. Latest qualified session in the viewed period compares with the nearest earlier session sharing a valid repetition or weight condition, including before the viewed period. Show its full date. Keep the selected exercise chip completely inside its native horizontal viewport, including enlarged text. For each common rep condition compare the best weight of each session; for each common weight compare the best repetitions. Show all condition changes, not a cherry-picked percentage. Mixed positive/negative conditions remain mixed. Heavier load with fewer reps alone is not strength improvement. First record establishes a baseline; no comparable history remains unknown.

History best compares against all earlier facts, separately for highest recorded load, same-rep best load and same-load best reps. A tie is not a new record, highest load is not1RM. Volume is Σ(known valid external kg × reps), scoped to one action. Display valid/weighted/omitted coverage and preserve each actual set in history. Query history once per report, with disposable liveQuery and no persistence/cache writes.

## Period responsibilities and focus

Day shows actual saved facts, every set, meals/targets, habits and business-night recovery, without a fabricated day line. Week prioritizes action comparison, actual frequency/sets, weight, nutrition and recovery coverage. Month includes weekly count/volume summaries and action history. Comprehensive/Strength/Hypertrophy/Fat-loss are reading focuses of the same analysis, never different calculations. Hypertrophy includes protein execution; fat-loss includes strength maintenance and coverage; neither asserts body-composition outcomes.

Nutrition averages use complete finite nonnegative snapshot values over recorded dates only, independently per nutrient. Partial dates disclose missing coverage; explicit zero is valid. Target comparisons use the exact same complete, target-bearing dates and positive saved target only. No generic target/TDEE inference. g/kg uses only that local date's latest valid WeightLog and complete macro snapshots, two decimals, no historical/default weight.

Habit week cells distinguish actual done, planned/no check-in, rest, future, before creation and historically unknown plans. Weekly targetPerWeek takes precedence over weekdays when both exist; count-based goals do not invent daily required dates. Month displays actual weekly completed/target, never completed/natural7 days. Month boundary weeks query the whole actual natural week in a bounded read; disclose cross-month check-ins separately from monthly counts. Partial weeks are labelled, not prorated. Saved legacy check-ins that predate current creation metadata remain actual facts without invented past obligations. Without plan snapshots only a current unchanged plan demonstrably effective before the whole natural week can be evaluated; historical changed/inactive plans remain unknown and actual check-ins survive.

## Shared chart and navigation contract

Weight/Sleep/Water share one scalable10.125rem(162px at100%) plotting container across7/30/90 and all nonempty1/2/3/dense states; empty ranges use a quiet factual placeholder, fixed sibling Y labels, three grid levels, consistent stroke/markers/date axis and selected readout/highlight. Real calendar intervals, native internal scroll and no page overflow. Missing recovery dates split lines; no missing zeros. No per-point numeric labels. Weight remains Chart.js. Its canvas is viewport-sized inside a real-calendar native scroll track, so multi-year history/high DPR/font scaling never allocate a calendar-wide bitmap. Resize and scroll observers/listeners belong to the mounted chart and are released on disposal. Hide partially visible date glyphs at scroll edges; retain the complete selected date outside the plot. Same-date action sessions share the actual date X coordinate; completion time and keyboard/history distinguish them. SVG hit mapping uses ScreenCTM; Canvas uses rendered CSS dimensions and chart area. Bounded pointer tap, cancel/native scroll and keyboard behavior share ownership/cleanup. Actual screen-coordinate taps, including equal values and physical Safari/PWA evidence, are separate gates.

Training keeps real execution engines, shared primary actions and history; prototype's two factual summary tiles do not replace editors/timers. Navigation reserve uses the actual shared nav row/padding/Safe Area once; measure five views, bottom reachability and viewport height. Never hide overflow or remove Safe Area to conceal a defect.

## Release acceptance

Retain all prior units/browser suites and frozen fixtures. Add analysis qualification/matching/PR/missing/target boundary tests,65 display contexts, prototype/production original screenshots, actual-coordinate tests and20 integrated read-only cycles with resource/data hashes. No schema changes: Dexie11/IDB110/20stores, Backup11/Restore1–11, Sync/envelope1, AI/Voice/WaterReference1, retired Video. Application CI/Pages then exact production assets, existing synthetic-profile hashes/offline; LATEST-only END then final repeat. Physical iPhone Safari/original installed PWA/real-device continuity are Pending absent actual device evidence.


## 2026-10-11 联合交付补充

[营养周期排程合同](NUTRITION_CYCLE_SCHEDULE.md)新增两个计划业务表，当前 Dexie12 / IDB120 /22表、Backup12 /Restore1–12；既有报告计算及历史快照不变。日报完整记录增加第十类 Task.date 日程存在和已保存完成状态，计划不计入训练完成、营养摄入或健康成绩。删除菜单通过独立精确 ID 事务处理所选类别；报告与日历继续读取同一真实日期源。

日报日期按钮17px（rem缩放）、左右44px对称，深色分类底色使用既有主题 Token。周/月报告及原有四张等尺寸营养卡不重写；本轮不新增完整周期报告。原有发布、视觉、数据与真机门槛保留。


## Approved joint v0.5 (2026-10-12)

Follow [Approved joint v0.5 contract](APPROVED_JOINT_V05.md). It supersedes prior smart-completion entries, whole-row Habit toggles, flat recovery history and version12 descriptions for this release. Preserve all preceding unrelated data/UI contracts.

## Approved UX-01–03 v0.4 (2026-10-17)

The explicitly confirmed [six-category nutrition cascade](UX_WATER_CASCADE_V04.md) permanently removes only its selected template, owned variants/phases, related saved targets, owned cycles and their day allocations. Removed cycles disappear from the existing cycle-report picker; ordinary reports continue reading surviving actual FoodLogs, workouts, weights, sleep, water, habits and tasks without reconstructing deleted goals or historical source links. This approval adds no nutrition-template analysis report. Current DB13/IDB130/22 stores, Backup14/Restore1–14/Sync1 contracts remain unchanged.


## 2026-10-17 联合 v0.3 新批准范围

[联合 UX / 报告 / 区间删除合同](JOINT_UX_REPORTS_RANGE_V03.md)在新范围内生效：Today SVG disclosure与必要时定位、三张独立全日轴趋势及逐部位7/30/90不变高、两类共享实际事实报告与明确非周期阶段、独立原子日期并集删除入口。此前四focus、空图移除、抽样日期、侧Y占宽及管理危险路径只删六类等说明仅作为旧轮历史；旧六类/unused-only/清日API本身仍保留原边界。计划及共享定义永远不随营养范围删除，DB/Backup/Restore/Sync版本不变；本轮真机验收独立Pending。
