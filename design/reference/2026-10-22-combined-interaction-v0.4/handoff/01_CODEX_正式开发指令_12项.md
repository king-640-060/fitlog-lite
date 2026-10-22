# Codex 正式开发指令（12 项）· FitLog Lite 联合交互 v0.4

> **执行前提**：用户已批准 `reference/fitlog_combined_interaction_prototype_v0.4.html`；将本 ZIP 发送给 Codex 并要求执行时，启动本轮实现与测试。必须先打开本包 README、完整原型和下述附件，不允许只照文字猜测画面。执行、提交、推送及发布受仓库 AGENTS 和本指令的安全门槛约束；用户将文件交给 Codex 不等于 ChatGPT 已代为实施。

## 1. 项目及任务背景

仓库 `king-640-060/fitlog-lite`，Vanilla TypeScript/Vite，local-first/IndexedDB Dexie，iPhone-first PWA，经 GitHub Actions 发布 GitHub Pages。2026-10-22 准备本包时 main 为 `01628f7170bae2a68071838a1ddfe7551d428bc7`，上一轮应用为 `c1dcc087ffa19a0ccf424df8c79c078390841fb9`。本轮为此前 v0.2.1 后的**独立交互改善任务**，不重启上一轮业务实现；读取并保护全部现存本地数据。

## 2. 需求目标

**同一轮全部交付**：A) 现有五项底部主导航支持页面左右真正跟手滑动、相邻页显现、释放吸附/回弹、点击任意 Tab、独立柔和浅绿胶囊与内容同步；B) 饮食页顶部日期轨和当天饮食内容实现独立同向跟手切换，点击日期直接跳转，严禁触发主 Tab；C) 力量初始选择、有氧记录、凯格尔初始方案三种弹层统一 Large Sheet 高度、滚动与温和 58px 左右上移/约275ms 进场、遮罩渐显/退出（以冻结原型手感为准）。保留力量训练原执行页、凯格尔沉浸计时页、现有业务逻辑和简洁柔和样式。

## 3. 当前已知实现与必须重新核实的事实

- `src/main.ts` 目前以 `activeTab` 与 `render()/renderWorkoutPage()` 切五个页面，`#view` 单容器，底部 `.bottom-nav` 是固定五按钮，原 `animateMotion(view,'navigation')` 是短纵向入场，不是真正跟手横向过渡。切页可能清理 liveQuery/事件/异步内容；需要**审阅实际当前实现中的竞态、状态与卸载行为**。
- `src/styles/main.css` 定义 `--nav-row-height`/`--bottom-nav-height`、固定导航、Safe Area、主题、`body.keyboard-open .bottom-nav` 隐藏与 `body.immersive` 等规则。`src/ui/motion.ts` 有既有减少动态效果处理。**不能全局重置已有动效/颜色/尺寸**。
- `src/ui/foodPager.ts` 提供 device-local 日期偏移、日期窗和居中策略；`src/main.ts` 中 `bindFoodRail()` 用 native 横向滚动、`scroll-snap` 与 settle 后的 `commitFoodDate()`，生产目前只有日期轨动，食品内容不横向拖动。需仔细核实改动对触摸惯性、滚动、旧日期读写护栏的影响。
- `src/ui/sheetController.ts` `openSheet(...,wide)`：wide=`large`；带 form 的普通弹层=`form`；其余=`content`。`src/styles/sheets.css` 的 Large Sheet 高度上限 820px、视口减12px，已有入场动画约 16px/200ms；Sheet 具有**一次性同步关闭通知、native dialog、focus return、Body scroll-lock 和 VisualViewport 键盘协调**合同。
- 力量初始 `showWorkoutStartSheet()` 目前用 wide/large；有氧 `showCardioForm()` 用默认 form；凯格尔 `showPelvicFloorSetup()` 用默认 content。训练执行另走 `renderWorkoutEditor()` 或 `renderPelvicFloorTimer()`；有氧真实保存使用原服务。继续未完成力量训练**可能直接进入执行页**，不能强制多一步弹窗。
- 对比 `docs/UI_INTERACTION_SPEC.md` 旧约束：日期轨仅自身滚动、内容不横向切日。本轮用户新批准的日期内容联动跟手是一个**狭义覆盖点**；正式改规范并新增回归，其他约束全部保留。
- 以上是准备包时核对的事实；执行前按 `AGENTS.md` 重新 `git status/branch/pull/log`，读取实际 HEAD，再确认没有新实现、更改或回归。禁止以参考 SHA 假设当前已锁定。

## 4. 已确认业务与交互行为

A 主 Tab 顺序固定：今日、计划、饮食、训练、进度。单指水平拖动时**真正同步位移**、实时出现邻页且胶囊按进度连续插值；根据距离和速度释放切一邻页或回弹；前/后边界不越界。不允许只在 release 后播放假滑动。点击任何 Tab 可直接切换，胶囊平滑到目标，页面协调过渡；快速连点最后一次优先；当前 Tab 重按不重播入场。导航栏自身固定，按钮图标和文字选中/未选中**等尺寸**，选中浅绿胶囊/深橄榄字，未选中灰绿透明，无障碍正确 `aria-current="page"`。

B 饮食：顶部日期居中、两侧渐淡和短绿下划线视觉保留；滑动日期轨或用户批准的饮食记录空白区域时，日期标题和相邻天内容真正跟手，结束后原生日期语义下吸附/回弹且统一选中日期；点击日期直达。日期本地 `YYYY-MM-DD`，切换仅加载所选日期的**真实** FoodLog/NutritionTarget 快照，不写入数据；没有任何跨日数据混用。横向图表滚动、日历交互、表单和主 Tab 彼此不抢手势。需要为触摸惯性/滚动仲裁提出可验证方案，而非强行取消全局原生事件。

C 三大 Sheet：力量初始/有氧编辑/凯格尔选择同高，使用已有 Large Sheet 视觉布局、native dialog 和内部滚动，`height: min(820px, visual viewport height − 12px)`（Safe Area/键盘按现有系统修正）；进场约 58px 上移/275ms 减速，约 210ms 遮罩渐显，关闭对应轻柔退场。只动 transform/opacity，不缩放图标/弹层、不夸张弹跳。无效快速关闭、重开、替换或进入执行页都不能留下遮罩、双弹层或监听器。Reduce Motion 近乎即时；关闭通知与自动保存/清理合同必须仍**精确一次**。

力量已开启训练直接恢复训练执行页，保留 WorkoutAutosave；凯格尔开始后进入沉浸计时，保留音频/锁/有效会话处理；有氧依旧短表单保存、出错保留输入、不重复提交。不通过点 Tab 或无意滑动静默删除记录、未保存草稿、计时器或内存状态。

## 5. 原型 / 视觉批准基准

唯一批准完整原型：`reference/fitlog_combined_interaction_prototype_v0.4.html`，SHA256：`b7be5a11161f138c0182b059bd42ca26d0b56852b309db34b01b5b4792b68419`。用户视频在 `reference/用户示例视频_仅供交互参考.mp4`，只用于拖动节奏参考。原型已实际含底部五 Tab、饮食日期双层手势、三种大 Sheet、进出场、训练模拟执行、深浅与多宽度/字体演示。**不要使用旧 v0.1/v0.2/v0.3 作最终批准基准**；原型的假数据、样例动作、Mock 操作不可迁入生产数据库。包内 `visual/` 来自 Chromium 原型截图，生产必须拍自己页面截图再对照。

## 6. 实施范围与禁止修改

最小必要更改为主导航状态协调、手势路由、邻页绘制/过渡、饮食日期导航协调和三类训练入口的大 Sheet 变体/动画。可评估 `src/main.ts`、`src/ui/foodPager.ts`、`src/ui/motion.ts`、`src/ui/sheetController.ts`、`src/styles/main.css`、`src/styles/sheets.css` 及必要的单一小型协调模块；**文件列表是审查入口，不是必须修改清单**。不能为运动重写全部五页、训练实体、Dexie、备份、日历、AI 或广泛 CSS。尽量维持现有单用户 local-first 架构，不加入框架/依赖/后台同步。

特别禁改：`fitlog-lite-db` 名称、业务 schema、历史 FoodLog/Workout 快照、恢复格式、真实训练服务、系统边缘返回、共享 Sheet 关闭通知/键盘生命周期和 PWA 更新保护。存在核心不可调和技术或无障碍冲突时，只暂停受影响点并请求用户确认，不擅自弱化批准体验。

## 7. 数据兼容、安全与历史语义

保留 Dexie13 / IndexedDB130 / 22 stores / Backup14 / Restore1–14 / Sync1 / envelope1，不计划任何迁移。不清空、重建或重新初始化生产用户库；所有已有 FoodLog、Workout、Task、NutritionTarget、Weight/Water/Sleep 和未完成训练应当完整保留。日期只使用设备本地日历，不使用 UTC 截断。图形变换绝不产生业务写入、跨日误认、克数自动变更或训练保存。原 Sync 保持明确手动、端侧加密，不引入隐式网络请求。后退、Sheet 关闭、快速连点、中断动画需保护待提交输入和 pending writes。旧备份样本与冻结 fixture 不得改写或删除。具体守则见附件 `05_数据安全与发布核验.md`。

## 8. 自动化测试与功能验收

必须实际运行 `npm run typecheck`、`npm test`、`npm run build`，生产 base 与 workflow 对齐；所有当前仓库要求的既有浏览器回归和数据兼容性门槛不能因本轮缩减。运行真实页面的 Chromium 与 WebKit 动画/手势/滚动/键盘测试，以及设备模拟 touch pointer/touch 证据。至少覆盖 `handoff/04_验收矩阵.md` 的每个 ID：五页 × 点击和双向拖动、20–80% 中途跟手、慢速回弹、速度边界、首末页、跨多 Tab 快连点、重复本 Tab、手势自子容器优先、饮食日期+记录联动、日期轨惯性、30/90 图、日历、Sheet、键盘、草稿、训练计时和全域数据哈希。**不可只用最后页面截图代替中间帧测试**。对异步加载模拟慢响应、快速反向、途中弹层/导航动作，不得白屏、双渲染、状态漂移、悬空监听器或数据写入。

原型已有演示验证不能计入本轮生产 PASS；以 Codex 本轮真实日志为准。测试失败必须修复或停止发布，失败、中断和复跑均记录。不减少既有测试断言/fixtures，不用 `force:true` click、清站点数据或更改业务记录绕过 UI 问题。

## 9. 视觉验收

严格遵守现有 token、固定导航高度/图标20px、文字/行高、按钮点击区≥44px、输入≥16px、Safe Area。现有五栏网格不变；浅绿胶囊位置跟 Tab 中心吻合；滑动中胶囊和页面同帧插值。顶部日期 rail 仍保留短下划线及两侧渐淡。训练三类初始 Large Sheet：同一设备/同一键盘状态顶部与外框高度等同，标题/手柄/滚动独立、进退场节奏同冻结原型。320/375/390/430px × 浅深 × 100/120/140/200% 字体，短屏/横屏/模拟键盘，视图外溢、末尾保存按钮和连续拖动过程均应实测截图。系统 Reduce Motion 下动画取消但页面/语义保持。实际截图与 reference 对照，以真实业务数据结构为准，不能复制原型的假菜谱/训练。

## 10. 文档维护

按本轮实际结果更新：`docs/UI_INTERACTION_SPEC.md` 对主 Tab 跟手/食物日期内容联动的**狭义**新规范（明确替换旧“Food body 不横滑、内容不做过渡”两句，不删除旧日期/数据安全限制）；`docs/UI_QA_MATRIX.md` 新增手势多层仲裁/Sheet 等高与退出/暗色/Reduce Motion/键盘矩阵；新建或更新适当的 `docs/` 批准 v0.4 交互合同并关联**不可变 SHA**；`LATEST_DEV_REPORT.md` 如实记录本轮 START/END、验证和 Pending，遵循报告独立提交规则。仅当确需更改高层入口时对 `AGENTS.md` 追加最小引用；`docs/CHAT_CODEX_WORKFLOW.md` 流程本身不改。不能把以前报告的 1115 个单测及 44 个浏览器回归直接当本轮结果。

## 11. Git、CI、正式发布及边界

Codex 在启动时实际 `git status`、当前分支、`git pull --ff-only`、`git log -1`，记录真实 START 和任何未提交更改。工作分支/提交按 `AGENTS.md` 当前规定执行；只提交授权范围文件，不 force-push，不篡改无关改动。完成全部测试、视觉/数据核验后按仓库已有授权发布流程提交并推送 main，等待相应 SHA 的 GitHub Actions/Pages **实际成功**，用线上真实资源核实 App/SW 版本、加载、导航与同一合成旧 profile 的 22-store/config 身份、离线冷启动。无法访问 CI/Pages 或没有安全推送条件时，状态必须标为 Pending/未执行并停止声称“已发布”；不改用假链接。不得接触用户真实个人记录、Key、Provider。交付后由 ChatGPT 对本轮提交/日志/生产状态独立验收，实体真机和已安装 PWA 由用户确认。

## 12. 交付回执要求

必须使用 `handoff/06_CODEX_十项交付回执模板.md` 的十项独立可读格式：①完成摘要；②修改文件；③关键行为；④Git START/END/PR/Push；⑤全部真实测试命令与结果；⑥生产 UI 对原型截图、拖动中间帧、几何对照；⑦数据保护和旧版兼容；⑧文档；⑨CI/Pages/生产同提交核查；⑩Pending/风险/实体设备事项。每项明确 **PASS / FAIL / 未执行 / 不适用 / Pending**，不得将原型通过、模拟触摸、CI success 互相冒充。向用户提供真正的回执、应用提交和可查看证据，不能只说“完成”。
