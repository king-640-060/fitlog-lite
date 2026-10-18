# Codex 正式实施指令｜今日饮水从卡内展开改为底部 Sheet

## 1. 项目与背景

仓库 `king-640-060/fitlog-lite`，local-first iPhone PWA。上轮仅修复今日饮水展开按钮配色，当前正式按钮为 `secondary today-activity-action water-expand-toggle`，但箭头增加了按钮宽度；用户**否决缩字或压缩按钮**，明确选择「无箭头统一操作按钮 + 底部弹出记录 Sheet」，并批准本包 v0.1 可交互原型。此为独立后续任务，不是旧任务返工。

编包时远程 main `120cb0624d0efa06b7ff7ce638e7d02104d4d62c`，但所有提交前后都须实际 `fetch` 检查，不允许强推。首先完整读取 `AGENTS.md`、`LATEST_DEV_REPORT.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`docs/UI_INTERACTION_SPEC.md`，按需读取 `docs/UI_QA_MATRIX.md`、`docs/DATA_PRESERVATION.md`、`docs/JOINT_UX_REPORTS_RANGE_V03.md`、本轮饮水颜色修复 QA 与报告；只做定向源码调查。

## 2. 目标与用户已确认决策

将今日饮水从卡内 Disclosure 模式改成与其他今日操作一致的右侧普通按钮，**没有箭头**；按下后从底部出现真实业务饮水 Sheet，提供 +500/+1000 两个等权快捷操作、自定义输入，保存成功自动关闭并更新今日累计，展示精确撤销。用户已批准方案及 v0.1 原型；无需重新请求 UI 决策。

## 3. 当前已知实现与首次核查

在 `120cb0624d0efa06b7ff7ce638e7d02104d4d62c` 基线：
- `src/ui/recovery.ts` 的 `mountRecovery()` 仍创建 `waterExpanded`／`revealWater` 和 `#today-water-actions` 卡内展开元素；绑定 `data-water-toggle`、`data-water-add`、`data-water-custom`、`data-water-reference-edit`。
- 同文件内的 `showWaterRecord(ui)` 已用于进度趋势饮水入口：使用 `ui.openModal('记录饮水',...)`、`setSheetVariant(dialog,'content')`、快捷 500／1000、`addWater`、`waterUndo` 和自定义 `showWaterEditor(...)`。
- `src/services/recoveryService.ts` 的 `addWater` 写入一个真实 `WaterLog`；今日卡依靠现有 `liveQuery` 重绘。`src/styles/main.css` 的 `.today-activity-action` 给同级操作外观；`src/styles/recovery.css` 为旧展开箭头/卡内按钮提供样式。

这些只是本包生成时的源码证据；Codex 开始后必须核对最新实现，确保没有其他开发者已改动相同路径。调查共享 Modal/Sheet 生命周期、背景滚动、嵌套自定义表单、Toast Undo、焦点返回和 Water 历史入口，再以**最小改动**实现。

## 4. 批准业务和交互（必须）

- 今日：饮水卡累计/参考值左侧，右侧 4 字「记录饮水」无箭头，同类按钮视觉和计算宽度一致。默认没有卡内展开区，点击后首页卡高度不变化。
- Sheet：从底部升起，含标题、明显关闭入口、等权 +500ml／+1000ml、自定义饮水量、可到达修改参考值的入口；历史记录保持可用（首页标题右侧已有历史入口；如现有组件支持，在 Sheet 内通往同一真实历史，不创建第二套历史）。
- 单次快捷点击只写入一条新 `WaterLog`，成功后关闭整个饮水 Sheet；自定义输入成功也一样。今日累计/参考值由真实源驱动更新；反馈/Undo 指向刚写的具体 ID。保存中防连点，失败原 Sheet 不丢、错误可读且可重试。
- 取消、外部关闭、返回或 ESC 不产生饮水记录；重新打开恢复快捷初始视图，不携带上次未提交数量。自定义输入不默认自动写入，需明确确认。
- 复用现有 Progress 饮水 Sheet/业务服务与当前全局 Sheet 框架；如果共用后会改变进度原行为，则通过参数或适配处理「成功关闭今日父弹层」和可返回的焦点，且保证两个入口呈现一致，**不复制第二套服务/存储**。
- 保留现有水量上限/正整数校验，不把演示 HTML 的 1–10000 当作新业务规则；参考值更改沿用原设备配置语义，严禁当作 `WaterLog`。

## 5. 批准原型与文件校验

`prototype/FitLog_Today_Water_Bottom_Sheet_Interactive_Prototype_v0.1.html`，SHA256 **`b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`**。原型是演示，不是可直接移植的正式业务组件。必须先核对 SHA256，浏览完整页面并实际操作关闭、快捷、自定义、撤销、历史、深浅色，然后以相同视口比较真实 App 截图。原型参考图片在 `preview/`；模拟 QA 在 `evidence/prototype_browser_QA.json`。

## 6. 改动范围与禁止事项

建议首要文件：`src/ui/recovery.ts`，按实际需要清理 `src/styles/recovery.css` 中废弃的卡内展开专用选择器，并可极少量修改已存在的 Sheet 控制器/样式及新增针对性测试。切忌无依据重写整个 `recovery.ts`、共享 Modal 框架或 Toast。没有经同意不能重构 Today、Progress、Trend、Reports、Nutrition Strategy、Plan，也不能修改训练、营养或历史事实语义。

特别禁止：为了统一按钮宽度而缩小饮水文字、隐藏箭头但保留展开卡内区、给其他按钮加占位箭头、修改全局次级按钮样式、只做 CSS 假弹层且记录仍靠展开、每点击额外写入一笔记录。

## 7. 数据安全与历史兼容

数据库稳定名称 `fitlog-lite-db`，DB v13 / IndexedDB130 / 22 stores、Backup14、Restore1–14、Sync1、envelope1 应保持不变。本任务不需要数据库迁移、不应更改数据库schema、业务事实校验或所有历史 WaterLog。无 `clear()`、`deleteDatabase`、自动上传/还原。原合成生产样本前后逐表 hash 和设备设置 hash 保持一致；正常新记录和显式 Undo 以确切 ID 测试。

## 8. 功能和自动化验收

逐条执行 `04_ACCEPTANCE_MATRIX.md`。核心场景：今日按钮 → Sheet → +500 → 关闭 → 唯一日志 +500 → 今日更新 → 撤销还原；+1000；自定义合法/非法；快速连点；拒绝写入/失败保留输入；修改参考值不写日志；历史记录读取/修改；取消/ESC/Backdrop 不写；Progress 入口不回归。保证输入键盘、滚动安全区、focus 及无背景穿透。

依仓库现有脚本执行 `npm run typecheck`、`npm test`、`npm run build` 和与本次范围有关的所有必要原有浏览器脚本；新增实际双引擎真实 App 回归。先查 scripts 实际名称，不可把上轮测试结果当本轮运行。原有测试若验证被批准替代的卡内展开，应精确替换成新交互断言；不许删除数据语义/Undo/回滚测试以拿到绿灯。

## 9. 视觉验收

至少视口 320 / 375 / 390 / 430，浅色/深色、100%/140%/200%（宽度无法保证完全等宽时，先保证没有缩字/截断/卡片底部新增展开；布局允许随大字号正常增长），加一组短视口、真实弹出键盘模拟与横屏。默认字号390px：比较 4 个同类 4 字按钮的实际 `getBoundingClientRect().width`，差值≤1px（未加载特殊字体的环境应说明并重新测）；对照原型示例四个宽78px，**78px 不是生产环境的硬编码宽度**。检查统一 `backgroundColor`、`color`、`padding`、字体、圆角、触控目标 ≥44px。快捷两个按钮等宽、不被底栏/键盘遮挡，Sheet 背景固定，返回到原操作焦点，不额外抢页滚动。

## 10. 持久文档

仅更新受此次新交互实际影响的 `docs/UI_INTERACTION_SPEC.md`、`docs/UI_QA_MATRIX.md`、定向 QA 记录、`LATEST_DEV_REPORT.md` 和适用协作记录。旧 v0.3 及按钮改色报告保留为历史归档，不去改写先前 PASS 断言。于 `design/reference/2026-10-18-today-water-sheet-v0.1/` 归档本包**原字节**批准 HTML、关键设计锁与 SHA256，避免日后误拿旧 Disclosure 为现行设计。

## 11. Git、CI、Pages 发布

在干净且已 fetch 的 main 或按既有流程建独立工作分支，实施完成后正常提交/非强推 main，等待 Application CI 通过，正式 GitHub Pages 验证 JS/CSS/bundle/build-info/SW/precaches/离线冷启动与对应 Application 身份。根据仓库既定 START→Application→`LATEST_DEV_REPORT.md`-only END 模式完成最终 END CI 及线上身份复核，保持工作区干净。未经测试或上传未完成绝不能声称正式发布。只在独立合成 profile 做新增/Undo；不接触用户真实个人数据。

## 12. 十项最终回执

1. 完成状态与 QA PASS / FAIL / Pending。
2. 全部修改路径及每个路径的用途。
3. 已实现页面交互、与批准原型异同（含需批准差异）。
4. Git START、Application、END SHA，是否快进、工作区是否干净。
5. TypeScript、单测、构建、浏览器回归**真实执行命令和计数**。
6. 本地/线上不同浏览器真实截图、390px按钮宽度与样式、深浅/大字体/键盘/Safe Area 结果。
7. WaterLog 精确新增/撤销与全表无损、Backup/Restore/Sync 兼容证据。
8. 文档、唯一批准基准校验与证据归档索引。
9. Application/END GitHub CI 链接、Pages实际资源/SW/离线身份。
10. Pending：真实 iPhone、原安装PWA、VoiceOver、真实键盘SafeArea、个人数据连续性以及其他未做的测试（含真实Provider，如适用）。

**安全停止条件：** 如果无法使用现有 Sheet 保障保存成功后完整关闭/父子弹层焦点回归，或者新行为与用户确认原型严重冲突，先报告具体阻塞而不是擅自改变交互、数据契约、禁用测试或改数据库。
