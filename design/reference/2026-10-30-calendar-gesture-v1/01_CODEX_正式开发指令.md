# 01 · Codex 正式开发指令 — FitLog Lite 日历手势稳定性修复 v1

> 本文与 `prototype/FitLog_Lite_Calendar_Gesture_Prototype_v1_APPROVED.html` 共同构成用户确认的实施合同。**先阅读和执行，禁止自行更改用户已确认的交互边界**。如发现现有业务/无障碍合同与本交互冲突，停止受影响改动并报告具体冲突；不得靠删除测试或改变数据规则解决。

## 1. 项目背景与起点

- 仓库：`king-640-060/fitlog-lite`，iPhone-first、local-first PWA（Vanilla TS/CSS/Vite，Dexie/IndexedDB，GitHub Pages）。
- 用户现网录屏反映：`进度 → 日历` 的月历正文在斜向/横向触摸时可能被整页横向拖走，同时与内部纵向滚动争夺手势，体验明显退化。
- 用户指出旧日历并非此行为；ChatGPT 已与旧版源码对照：在 `8dac27a…` 旧版，日历为普通页面；v0.9 之后被装入 `createLocalDeck` 的一级横向轨道。当前 `localDeck.ts` 允许根容器中的相当一部分日历正文参加横向切页，仅特别排除了 `.calendar-grid`，**不能覆盖月头、空白、图例及其他日历区域**。
- 目前已发布的 Progress Layout v2 解决月历预备态跳动和顶部间距，不能在本轮回归：一级 14px；第三级到日期行 12px；`data-navigation-id` 预备态/正式态布局稳定。
- 打包时远程 `main` 为 `11c058ac6014842a9098443b7b8f304ad6d2d467`；**Codex 必须自己执行 fresh fetch，检查真实起始 SHA、未提交变更及分支是否一致**，以上仅作参考。

## 2. 用户要求的目标

修复“日历四处乱推动”的手势体验，恢复旧日历稳定操作：

- 在**月历内容区任意位置**的横向、斜向拖动，不能引起进度一级页面横向位移或偷偷切到趋势/报告。
- 在月历内容区向上/向下滑动，仍为原生纵向滚动；只能有一个负责日历正文的有效纵向滚动层，不能冒出套娃滚动条、抖动、橡皮筋式横向位移。
- 只有**顶部「趋势／日历／报告」三个导航项区域**保留已批准的跟手横向滑动切页，点击切页也必须继续工作；趋势/报告本身既有局部交互不被本任务破坏。
- 月份“上一月／下一月／今天”、日期点击打开当天详情、返回关闭、键盘和辅助技术继续保持原产品能力。

## 3. 已知实现事实与必须核实的点

**已从当前仓库核对的实现：**

- `src/main.ts`：`renderProgressPage()` 中 `createLocalDeck({root,nav: .page-tabs, stage: .progress-deck-stage, keys:['trend','calendar','reports']...})`；`prepare()` 为日历建 `.deck-scroll.local-deck-page`，调用 `renderCalendarOverview(false, host)`。
- `src/ui/localDeck.ts`：`allowed` 使用 `el.closest('[data-local-deck]')===root` 和 `!el.closest('[data-sort-handle],.trend-chart-shell,.calendar-grid,.chart-scroll,[data-no-page-swipe]')` 进行手势仲裁。仅排除日历网格，不等于排除完整日历内容。
- `src/ui/horizontalNavigation.ts`：`bindHorizontalSwipe` 先用横纵方向判定，再调用 `preventDefault` 与位移/提交；不可破坏其他共用导航的手势策略。
- `src/ui/calendarPage.ts`：`renderMonthCalendar` 的日期 grid 和日期点击语义已存在。日历业务读取/渲染逻辑不要替换。
- `src/styles/approvedInteraction.css`：`.progress-deck-root > .progress-deck-stage { margin-top:14px; }`、`.deck-scroll { overflow-y:auto; overscroll-behavior-y:contain; padding-bottom:20px; }` 等已生效；不能简单移除所有滚动。
- `src/styles/main.css` / `src/styles/appearance.css`：月历七列、月头布局和稳定的 `data-navigation-id` 视觉规则已经存在。

**实施前必须核实：** 最新 main 是否出现比本包更新的调整；日历正文所有可交互/空白区域的实际 DOM 归属；顶部 `.page-tabs` 是否可独立接收横向手势；`.deck-scroll` 是否为当前日历唯一滚动所有者；在视口变化和异步加载时是否存在不同 DOM 结构。若现状不同，先报告真实差异，做最小改动。

## 4. 用户已确认的行为合同（强制）

| 起点／动作 | 必须得到的结果 |
|---|---|
| 日历日期单元格、日期数字、标记区域：水平左右长拖 | 月历正文及一级轨道不发生水平位移；停留日历，不切到趋势/报告；不误打开日期 |
| 月头空白、月份文本、月历卡片空白、星期标题、记录图例、内容总结：水平左右拖 | 同上；**不允许只禁用 `.calendar-grid` 而漏掉周边区域** |
| 日历正文斜向拖动 | 横向切页不触发，纵向意图交由原生页面滚动；无横向“抢夺”或中途突然换页 |
| 日历正文垂直滚动 | 原生上下滚动连续流畅，顶部主导航位置稳定，不新增嵌套纵向滚动容器；上下方向不牵动一级轨道 |
| 顶部一级「趋势／日历／报告」横向按住拖 | 保留跟手内容切页：移动中相邻页同进退，松手后按既有阈值提交或回弹；不能变成按下直接瞬切 |
| 顶部一级导航点击 | 仍然切到对应页，按钮状态、指示器及真实内容一致；不可被 pointer capture 吞掉点击 |
| 日历上一月／下一月／今天／点击日期／关闭详情 | 原始功能、当地日期与已记录状态保持；切换月份不误切进度一级页面 |
| 从趋势/报告返回日历、反复往返、触摸中取消 | 页宽和 14px 内容间距不变；日历视觉稳定；各页面纵向滚动位置独立、正确恢复 |

**可接受技术实现**：优先给日历**整个内容所有者**设置稳定、局部的手势拒绝边界，例如 `data-no-page-swipe`，或在 `createLocalDeck` 顶层路由根据当前 `calendar` 页和目标节点精确阻断；具体位置由真实 DOM 核定。该属性/条件不能误覆盖顶部 `.page-tabs`、不能阻断月历的正常 `click`/`pan-y`、不能让其他进度页失去已批准交互。请实现后用真实 DOM 测试验证，而不是只凭选择器名称推断。

## 5. 唯一批准的交互基准

- 包内原型：`prototype/FitLog_Lite_Calendar_Gesture_Prototype_v1_APPROVED.html`
- SHA256：`4207d932fcfe90d2d4e41d119f3eb28f6f767d0e2f63c83a59804ef94c5df177`（接收后务必重新计算）；不得悄悄修改原型。
- 参照预览：`prototype/calendar_v1_preview.png`
- 用户录屏：`evidence/USER_calendar_unintended_drag_recording.mp4`，作为回归复现路径；此私人证据默认只存任务工作区/非公开归档，不擅自提交公共 GitHub。
- 原型是**交互演示**，并不取代当前真实月历视图、图标标记/无障碍、记录概览、报告数据及服务合同。不得直接拷贝原型的固定日期、演示记录、示例数值。
- 本轮对已批准 v0.9 三层导航、Progress Layout v2 的 14px/12px 几何只做保持，不重新设计其布局、颜色或业务。

## 6. 实施范围与禁止修改

**建议先检查的文件**：

- `src/ui/localDeck.ts`（手势归属和排除条件）；
- `src/main.ts`（日历页面容器、`renderProgressPage`、`renderCalendarOverview`）；
- `src/ui/horizontalNavigation.ts`（只读核实，除非局部修复确需并有完整反回归）；
- `src/styles/approvedInteraction.css`、`src/styles/main.css`、`src/styles/appearance.css`（仅核对日历滚动/指示器/布局归属，非必要不改）；
- `tests/browser` 中 v0.9 进度和 v2 布局门槛。

**产品变更只允许最小局部范围**。禁止：重构所有页面导航；删除 `localDeck` 或放弃顶部导航跟手；改变第二级「日常综合/营养周期」或第三级「日报/周报/月报/自定义」联动逻辑；修改进度 14px / 日期 12px、预备页面稳定 ID；改业务算法、报表字段、服务、Dexie schema、Backup、Sync、原用户数据、旧冻结 fixture；拿 CSS `pointer-events:none` 禁用日期点击；一刀切 `overflow:hidden` 导致无法纵向滚动；为减少卡顿关闭动画或屏蔽真实交互。测试和文档必要修改按本任务执行。

**若必须改共享 `bindHorizontalSwipe`**，须证明日历局部解决不可行并对其全部消费者做回归；优先选择更小、更不影响其他路由的方案。

## 7. 数据保护、离线与安全

严格遵循 `AGENTS.md`、`docs/DATA_PRESERVATION.md`、UI 现有合同。沿用 `fitlog-lite-db`、Dexie13 / IDB130 / 22 stores，Backup14 / Restore1–14，GitHub Sync/Envelope1。此任务无数据迁移需要，不得创建迁移或更改业务持久化。必须证明日历触摸/预览/取消操作均**零数据库写入**；正常日期详情的既有显式业务操作例外但不得改其范围。

不得清理/重置/恢复个人生产 IndexedDB、不得触摸真实 provider secret；测试仅用隔离合成 profile。不得把录屏或含个人内容的数据上传公共仓库。测试结束对同一合成 profile 的 22 表/8 配置摘要、离线 App/SW 保持与前后做核验；如果触发生产发布，按真实用户兼容合同完成既定升级门槛。

## 8. 执行测试与可验证验收

Codex 自行确认 `package.json` 的真实命令，至少执行 `npm run typecheck`、`npm test`（或项目定义的完整适用单测命令）、`GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build`，及本次命中的浏览器专项/项目要求的相关既有门槛。**不得预填通过数字**；对本轮新 commit 实际记录结果。

新增或扩展实际浏览器回归测试，必须包含：

1. 在当前 START 上以真实日历 DOM 复现问题，保存至少 1 份旧版 FAIL 原始证据（若确实无法复现，则说明录屏与环境差异，仍需证实新行为）；不可伪造 FAIL。
2. Chromium 实际 CDP touch 和 WebKit 独立测试分别检查手势；明确区分 WebKit 合成 touch 与实体 iPhone。至少 320/375/390/430px，100/140/200% 字号，Classic 浅/深与 Native 主题，normal/reduced 动效；短横屏需要检查。
3. 在**月历完整区域** 8 个起点（日期、日期空白、月份标题、月头左右空白、星期标题、图例、概览、卡片下方空白）分别测水平左右、垂直、斜向触摸以及取消；测试划分必须覆盖日历 DOM 的所有关键交互所有者。
4. 对每个禁用区域记录中间帧（0/25/50/75/100% 或真实每帧采样）中 `.progress-deck-stage` 的 transform、当前页 x/width 和 tab 状态；拖日历正文时横向页面位移最大 ≤1px（浮点容差）、导航选中不变；纵向时不强行阻止原生 scrollTop。
5. 顶部一级导航做真实按住跟手：至少 20/50/80% 中途帧实际位移与 pointer/clientX 接近，松手提交/回弹正确；按钮点击、键盘 Arrow/Home/End 和焦点可达性无损。
6. 月份左右按钮、今天按钮、日期单击/详情关闭，真实数据来自现有 service；明确验证**不因横向滑动误触日期 click**。
7. 趋势 → 日历 → 报告 → 日历连续往返至少 20 轮，反向切换，月内/跨月、长短月、已有/无记录日、异步日历加载、滚动后返回、短页面与长页面；检查各页面独立滚动、无布局跳跃、宽度/水平溢出不变。
8. 回归既有 `progressLayoutV2.mjs`、`progressLayoutLoadingV2.mjs` 和 v0.9 导航/报告相关套件：14px/12px、月历头部预备↔活动高度差 0、日报日期居中、上级导航不跟随下级移动；不得删减旧断言。保留所有失败、修复和复验的对应来源及脚本 SHA。
9. 检查 listener/RAF 和预备邻页 dispose 生命周期，不能因为取消手势遗留 transform/ghost/不可恢复状态。
10. 数据保护回归：只读手势前后 22 表与配置摘要相等；原 PWA/Service Worker 与 Backup/Restore/Sync/离线门槛不受影响。

验收阈值、场景与证据映射详见 `02_逐项验收矩阵.md`。只有脚本 green 但页面不符合原型手感，不能宣布视觉/交互验收通过。

## 9. 视觉/操作验收与真机边界

在同一 viewport/主题/字号下对齐原型与实际页面，记录月头、日期七列、顶部三级导航已确认的位置与滚动边界。**不要拿演示日期/数据作像素内容比较**。中间帧截图比终态截图更重要：证明日期区域完全不水平移动、顶部导航仍可跟手；另外分别记录触控取消、点击和实际纵向滚动。iPhone Safe Area/VoiceOver/原安装 PWA/真实 iOS 橡皮筋效果没有实体证据一律标 `Pending`。

## 10. 文档与长期证据

更新必要的 `docs/UI_INTERACTION_SPEC.md`（增加“日历内容不承担一级横向切页、一级导航仍可拖动”持久规则）、`docs/UI_QA_MATRIX.md`（分区域及双引擎测试门槛）、单独新建 `docs/CALENDAR_GESTURE_FIX_V1.md` 和 QA 说明，保持旧历史不被覆盖。对应实际发布情况更新 `LATEST_DEV_REPORT.md`，但不得提前把未执行测试写成 PASS。旧已批准原型/原有 QA/冻结 fixtures 均不得覆盖。

批准原型和 SHA256 需长期归档至适合的 `design/reference/...`；新专项截图/负例/复验/原始 trace/summary/测试脚本 SHA 保存在 `design/qa/...`。不要上传用户私人原录屏到公开仓库；如引用，只记录脱敏问题描述和文件哈希。大型原始文件若另存，维护校验索引和真实可访问路径；不能虚构 ZIP 或清除唯一证据。

## 11. Git、CI、发布与回滚

1. 开始 `git status --short`、`git fetch origin` 和 `git rev-parse HEAD origin/main`，确认无未处理分叉/其他工作，记录 START；不要假设打包时的 SHA 仍是 HEAD。
2. 按最小范围实现、验证、截图、冻结证据，核对 `git diff --check`、受保护路径、业务源码更改列表，提交前 fresh fetch 并明确差异。严禁 force push、覆盖他人提交或改变用户个人数据。
3. 当本 ZIP 经用户交给 Codex 作为正式修复任务授权时，按照仓库正常 Application → CI/Pages → END 工作流执行已授权的发布；若当前环境不能安全发布或授权范围不明，报告具体阻塞而不是宣称成功。正式 CI SHA 应与 Application/END 一致。
4. 若 CI 或生产有明确阻断，停止声明 PASS，保留失败证据，修复或按项目正常 revert/release guard 回滚；不得 reset 远程、清空 IDB 或把旧 SW 强行覆盖。
5. 线上验证实际站点 `https://king-640-060.github.io/fitlog-lite/` 对应 SHA、App/SW/资源身份、离线、日期点击、日历正文手势与顶部导航操作、历史合成 profile；不能只凭 Actions 成功推断资源身份。

## 12. Codex 十项交付回执（必填）

1. **最终状态**：本轮交付/发布完成或阻塞，实际页面地址。
2. **修改文件**：产品/测试/文档/证据分组的精确完整清单和变更范围。
3. **功能实现**：逐条映射本指令第 4 项（尤其“整个日历不横向拖”和“顶部导航仍跟手”），新增/修改的触摸归属与清理逻辑。
4. **Git**：START、Application、END 的完整 SHA、分支、push 是否正常、最终工作区情况。
5. **测试**：真实命令、单测总数、浏览器矩阵/每场景结果、首败/复验，区分模拟和真机。
6. **视觉**：原型 SHA、已批准版本复核、关键触摸中间帧与真实页面截图/坐标、对比方式及偏差。
7. **数据**：数据库及备份兼容性、22 表/配置哈希、是否接触个人数据、滚动与日历只读零写证明。
8. **文档**：更新条目与长期证据存放、完整可追溯链接及文件校验值。
9. **CI/发布**：Application/END 的 Actions、真实 Pages/App/SW/资源/离线核对及 Pending。
10. **Pending/已知缺陷与后续**：实体 Safari、原安装 PWA、VoiceOver、系统键盘/Safe Area、个人连续性、真实 provider；旧 WebKit 饮水 Undo −128px 不得误报为已修。

Codex 实施完毕后停止新需求开发，交回 ChatGPT 独立核查；自动化成功不代表真机、截图及最终用户确认自动通过。
