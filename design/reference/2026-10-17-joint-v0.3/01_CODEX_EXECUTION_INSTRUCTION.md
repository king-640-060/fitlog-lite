# Codex 执行指令 · 新一轮联合 UX / 趋势 / 专业报告 / 日期范围级联删除

## A. 角色与开工

按已批准 v0.3 完成开发→独立验证→完整回归→正常 Git 提交→CI/Pages 发布→正式十项回执。先 `git fetch`、`git status`，记录 START/current main；遵守仓库 `AGENTS.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`LATEST_DEV_REPORT.md` 和数据安全/APPROVED_JOINT_V05/UX_WATER_CASCADE_V04/原报告合同。绝不能 reset/force push/覆盖用户未提交更改。上一轮 main SHA `9423586813e2c65a2f2d7126b82acb70bbe02100` 是打包时已观察到的参照，不是将来的固定 HEAD。

## B. 锁定范围

- TODAY 饮水：右侧展开按钮、箭头对齐、展开后操作区有条件滚到可见、成功记录后仍可见；复用现在真实 water service/Undo/History/双防重/设备参考值。Today 默认收起，不能恢复高大卡片。
- 趋势：保留三张独立图及各自的 7、30、90；统一逐日 X 日期规则；**高度锁死为同一组件、同一视口、同一字体下切换永不变化**，包括空记录视图。日期占位是日历自然日，非只读已记录日期。7天不跳字，30/90可横滚；同一实际数值的可视 Y 基准不得因范围切换产生跳变。保持原交互、辅助功能和记录动作。
- 报告：`日常综合报告` + `营养周期报告`，取消四 focus UI 和由 focus 决定板块有无的分支。日常范围保留原日/周/月事实、历史动作与每日详细记录，周/月界面重组成少量有意义的段落；可选择周/月/自定义日期（若自定义范围需要变更大量已有合同，先以周/月为可交付并说明限制，**不可偷偷省略已经批准的能力**）。营养周期以真实 `nutritionCycles` 为明确周期，历史 `nutritionStrategyPhases` 显示为“模板使用阶段（非正式周期）”并与真实周期区分；以选中的对象和业务日期读取 NutritionTargets、FoodLogs、Weights、Workouts/Cardio/Pelvic、Water、Sleep及Habits CheckIns。普通任务不参与运动科学评分/建议。
- 删除：新“模板+日期范围内全部健康事实”危险路径。原上一轮 `nutritionStrategyCascadeService.ts` 是**仅六表**事务，不足以实现本轮；必须新建或受控扩展为覆盖全部选中健康事实存储的单次原子事务。完整细则见 `03_RANGE_CASCADE_DELETION_CONTRACT.md`。不要复用会清计划的全日删除 API，不要“归档”替代。旧仅六类 API 如有其他内部调用，需明确其保留/废止策略而非暗中拓宽任一危险 API 的默认范围。

## C. 首先检查实际代码路径

- `src/ui/recovery.ts` / `src/styles/recovery.css` / 统一 Today 相关样式、openModal、shared scroll/safe-area。
- `src/ui/weightChart.ts`, `src/ui/weightTrend.ts`, `src/ui/recoveryLineChart.ts`, `src/ui/trendGeometry.ts`, `src/ui/trendModule.ts`：目前体重 Chart.js 可视宽度跳日期、恢复 SVG 规则不同，需保留原语义/无障碍。当前 `weightChart.ts` 动态 `step`，恢复图多于7天条件抽取标签；新规则**保留每个自然日的位置**。
- `src/ui/coachReport.ts`, `src/services/coachReportService.ts`, `src/utils/coachReportAnalysis.ts`, `src/services/nutritionCycleReportService.ts`, `src/utils/nutritionCycleReport.ts`, `src/ui/nutritionCycleReport.ts`, `src/utils/reporting.ts`, `src/ui/recoveryReport.ts`, `src/services/dailyRecordsSummary.ts`。
- `src/services/nutritionStrategyCascadeService.ts`, `src/ui/nutritionStrategyCascade.ts`, `src/ui/nutritionStrategies.ts`, `src/db/types.ts`, `src/db/database.ts`, `src/services/nutritionStrategyService.ts`, `src/services/nutritionCycleService.ts`, `src/services/dayRecordsService.ts`, `src/utils/sleepBusinessDate.ts`。
- 确定导航/焦点状态的生命周期，不让取消删除或重绘失焦/产生旧按钮确认。

## D. 先复现、再实现、最后截屏

打开 v0.3 HTML，并操作：Today 右侧记录饮水→自动显露快捷键→+500/+1000→保持可见；体重7→30→90→7，再单独切睡眠和饮水；让睡眠无任何记录仍切换；普通/周期报告切换；模板删除预览→取消→勾选→第二次取消→最终仅对合成数据确认。建立截图/测量锚点，不复制演示数据或 demo 顶栏进正式 PWA。

## E. 数据与报告开发安全

严守 `03_RANGE_CASCADE_DELETION_CONTRACT.md`、`04_SPORTS_SCIENCE_REPORT_CONTRACT.md`。为“模板日期并集”实施**单事务快照+精确ID删+后置全表核对+冲突安全拒删**，并读取当时受影响的 sleep business night、在途记录和所有现存 nutrition targets。用户声明日常不会存在相互重叠的营养模板日期，但防数据异常的检测必须保留；**不能因为假设无重叠而不做检查**。

正式报告必须由已有事实服务提供来源快照；与模板的关联是时间区间上的**同期分析**，不是任意推断营养模板“导致”体重/睡眠变化。减脂/增肌/过度训练/脱水/REDs 不能靠这些记录直接诊断。不构造超出数据覆盖范围的结论，覆盖天数不可超过已发生天数。

## F. 测试、兼容与发布

以 `05_ACCEPTANCE_MATRIX.md` 全行报告 PASS/FAIL/Pending、证据。保留 UX-01～03 的原 1009 单测/全部既有40浏览器命令（在新 main 上以实际套件数为准），新增同时覆盖 UI/数据/备份/恢复/同步/两引擎的测试，不删旧测试、不 skip。原已安装PWA synthetic upgrade + App/END CI/Pages资源身份和离线冷启，禁止 reset IndexedDB 或依赖刷新删除数据库。DB13/22tables、Backup14/Restore1–14、Sync1/encrypted envelope1、15冻结历史 fixture 按原合同保持；如现有合同要求schema升级、必须先向用户报告原因、范围及迁移风险，不得自主变更。

最后普通提交/推送 main（非 force）；完成 Application CI、页面资源/SW身份、如需 END report-only commit 则再次检查 END CI 和线上身份；全部记录真实 Git SHA/链接。原安装 iPhone、真实键盘/Safe-Area/VoiceOver/个人数据连续性如未实际由用户验收，必须 Pending，绝不拿 WebKit 代替。

## G. 最终十项回执（逐项可核验）

1. `05_ACCEPTANCE_MATRIX` 每行状态及证据链接；2. 全部变更文件、每项原因；3. 三部分 UX + 两种报告 + 危险范围删除的真实实现；4. START/App/END Git SHA、远端和工作区；5. Typecheck、全量单测和浏览器旧/新实跑结果；6. 原型 v0.3 SHA、320/375/390/430/放大/暗色截图与**每个图表的 7/30/90 高度测量表**；7. 六表与九类健康事实、其他资料/计划/区间外逐表哈希，以及陈旧指纹、跨日期睡眠、并发与故障回滚、Backup14/Restore/Sync；8. 维护版合同和 QA；9. CI/Pages/App/SW/build-info/离线实际证据；10. 实体 iPhone、原安装 PWA、个人数据/ChatGPT独立验收 Pending 明细。

若出现无法保持数据一致性或危险范围超出用户批准的情况，暂停对应实现并报明确阻碍，**不得擅自扩大删除或删计划、擅改用户已批准的原型**。
