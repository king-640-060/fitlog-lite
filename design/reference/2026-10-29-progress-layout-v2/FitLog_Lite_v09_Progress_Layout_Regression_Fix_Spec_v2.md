# FitLog Lite · v0.9 Progress 布局回归修复清单（修订 v2：含趋势页）

状态：缺陷定位与修复约束；不是已实现或已验收报告。源于用户 43.7 秒、1180×2556、约 60fps 的实体设备录屏及 2026-10-29 `main` 的源码读取。目标：只修已批准 v0.9 设计的布局回归，不改变业务数据或报告逻辑。**本次明确涵盖趋势、日历、报告三个一级页面的顶部间距；缺一不可。**

## 输入与边界

- 仓库：`king-640-060/fitlog-lite`。核查时 `main` / END：`0a95f675412a4b1c6d18f745c10e40dc6f4d4a5e`；Application：`d9a009f271648a4d02742bbb5b17c13d92ac6048`。开始实际开发时必须重新 fresh fetch。
- 批准基准：`design/reference/2026-10-26-interaction-v09/prototype/fitlog_interaction_v09_APPROVED.html`；HTML SHA256 `d41171fc85af521cd6d6c1b3a7a249eb20aee369941296a117ee474d261f480d`，不可改写。
- 视频：由用户本轮上传，重点观察约 2.6–2.9 秒日历月头换行与收回、报告「自定义」日期贴近上级、切入日报时日期左→中跳动。
- 只允许本轮的 Progress 视觉间距及预备节点→活动节点切换的布局稳定性修正。主Tab、食物模板、训练、指定食物业务行为不得重构。

## 确认的两个根因

### BUG-P01：日历切页时月头布局由两行变一行

`src/ui/localDeck.ts` 的 `isolatePanelIds()` 在邻页被准备时临时给 ID 加 `local-preview-*` 前缀，提交后再恢复 ID。`src/styles/appearance.css` 月头的定位规则仅匹配 `#calendar-prev` / `#calendar-today` / `#calendar-next` 或 `[data-navigation-id="..."]`。但 `src/main.ts` 的 `renderCalendarOverview()` 给三个控件只设置了 ID，没设置稳定的 `data-navigation-id`。预备状态布局规则不命中：「下个月」箭头流入下一行；提交后 ID 恢复、定位规则才生效，出现一帧明显的纵向收缩/跳跃。

**首选小范围修法：** 给 `renderCalendarOverview()` 的上述三个按钮分别增加 `data-navigation-id="calendar-prev"`、`data-navigation-id="calendar-today"`、`data-navigation-id="calendar-next"`。保持原 ID、事件、ARIA 不变。既有 `appearance.css` 已支持该稳定属性，因此无需新建另一套布局。核对预备态与激活态：月头 `grid-column/grid-row`、绝对定位、行高、月历顶部必须一致。**不得禁用或删除 ID 隔离**（它保护邻页 ID 唯一性）。

### BUG-P02：日报日期切页完成后由左跳中

`src/main.ts` 的 `renderReportsPage()` 日报日期按钮有 `id="report-date-picker"` 和稳定 `class="fitlog-date-trigger"`。但 `src/styles/main.css` 的居中规则 `.report-period :is(#report-date-picker,[data-navigation-id="report-date-picker"])` 在预备态不命中，直到 `localDeck` 恢复 ID 后才命中；因此左右滑动期间和最终态 `text-align/justify-content/font-size` 不一致。

**首选小范围修法：** 给日报日期按钮加 `data-navigation-id="report-date-picker"`（已有 CSS 支持），并可改为基于已有 `.fitlog-date-trigger` 的稳定类选择器；不要再让几何样式只依赖临时改变的 ID。检查日期按钮在 0%、25%、50%、75%、100% 动画帧的文本居中、宽度、字体和布局，不能在落位后再变更。现有日期选择服务与事件保持不变。

### 防同类遗漏

审查 `localDeck` 管辖的所有预备页面中 `#id` 影响布局的 CSS 规则，逐一保证预备与激活态一致；只改本轮有影响的节点。不得将新属性用于业务状态保存，也不得在已存在页面上重复注入元素。

## UX-P03：统一进度导航间距

现有 `src/styles/approvedInteraction.css` 的 `.progress-deck-root` 纵向排列 `page-tabs` 与 `local-deck-stage`，没有统一的顶部内容间距；`.report-daily-shell` 中第三层 `.report-mode` 与 `.report-period-stage` 直接相邻。用户反馈上级导航与内容/日期栏贴得太紧。

建议先做**小范围的样式对照**，以本轮已批准配色和字号为准：

- 第一级「趋势／日历／报告」导航底边到**各自首个可见内容块**：统一 **12–16 CSS px**，推荐初值 **14px**，由同视口实际画面对照确定。该规则**同时覆盖趋势页（体重趋势首个模块）、日历页（年月与箭头头部）、报告页（报告类型导航）**，不得只修日历／报告。间距是在一级导航与其下内容的交界处，不是每张趋势卡内部间距，也不是给整个 `#view` 额外套一层 margin。
- **趋势专用核对：** `renderWeightPage()` 在 Progress 预备／活动页面中通过 `data-weight-module` 加载趋势内容；其外层 `.deck-scroll` 目前只有 `padding-bottom:20px`，未定义统一 `padding-top`。检查首个实际渲染模块 top 与 `.page-tabs` 底边的 `getBoundingClientRect()` 差值，并检查趋势加载前、加载后、返回趋势以及数据更新后的首帧均一致，不能靠内部卡片偶然的 margin 伪装成顶栏间距。
- **间距的布局归属：** 优先在一级轨道的内容所有者（如 `.progress-deck-root > .local-deck-stage` 或三个一级页面共用的内侧 inset）定义**唯一**间距来源，不要在 stage `margin-top`、页面 `padding-top` 和首卡 `margin-top` 三处叠加。若采用 stage 间距，三个一级页面受同一值约束；若采用各页内侧间距，则必须保证预备节点、活动节点、短横屏、scrollTop=0 时等价，且视觉上不因 `overflow-y:auto` 而吞掉间距。
- 第二级「日常综合报告／营养周期报告」到下一级：保留并核对现有 12px（`src/styles/modules.css` 中 `.report-kinds {margin-bottom:12px}`），避免新增重复间距。
- 第三级「日报／周报／月报／自定义」到底下日期导航或日期范围按钮：**12 CSS px**，第三层固定高度，不随周期内容变化。
- 「自定义」的开始/结束日期按钮保持两列等宽、≥44px 触控高度，宽屏与窄屏、100%/140%/200% 字号下均不得粘连/裁切；现有 `report-page` 内的分组间距继续遵守 12px。
- 修正 `.progress-deck-root > .local-deck-stage` 的 margin 或 gap 时同步修正 `src/main.ts` `minimumProgressHeight()` 对三层实际高度、stage margin、可操作 44px 区域和底部 reserve 的测量，以免短横屏再现 9px 内容或无法滚动。避免 `position:fixed`、任意 `scrollTo(0,0)`、可导致滚动抢焦点的强制滚动。

## 绝对不变量

1. 一级切换时，当前页面的完整内容横向跟手滑入；月头和日报日期控件从预备帧起即为正确布局，提交后位置不再二次跳变。
2. 切二级时一级固定；切三级时前两级固定；三级彼此独立，不改变底部五个主 Tab。
3. 每级纵向滚动独立；短内容不继承长报告高度；内容区不受邻页高度影响。
4. 三个导航级别高度与可点击热区满足≥44px；原有主题、暗色、字体缩放、Safe Area、边缘返回、原生图表/日历触摸优先级不变。
5. 历史数据库、Dexie/IDB、Backup/Restore/加密 Sync、报告算法、筛选、快照、用户个人数据保持不变；原始 v0.9 原型与冻结夹具不修改。

## 回归矩阵（必须有运行结果，不接受口头声称）

| ID | 实际操作与断言 |
|---|---|
| L01 | 393 CSS px 等效 iPhone 视口：趋势→日历。截 0/25/50/75/100% 帧，月头上/下月、月份、今天在同一行，下一页月历不曾下移再上移。预备和活动的元素 computed-style 核对 `grid-row/grid-column/position/transform/top`。 |
| L02 | 日历→趋势→日历连续20轮，月头和月历顶部 y 在相同滚动位置差≤1px；纵向滚动不串页。 |
| L03 | 报告页周报→月报→自定义→日报，日报日期按钮在预备/滑动中/落位后保持文本居中，期间无最后一帧的左→中跳变。 |
| L04 | 报告切换日报、周报、月报、自定义，各级导航 screen rect 在其不应移动时变化≤1px；日期行与第三级间距≥12px。 |
| L05 | 四个宽度320/375/390/430，100/140/200% 字号，Classic明暗与Light Native，normal/reduced motion；日期按钮不裁切、不叠压。 |
| L06 | 短横屏：根据新增间距重新测量共同最小高度，所有顶层及下层按钮≥44px，允许正确的原生外层滚动，不能以clip掩盖不可达内容。 |
| L07 | 所有相关页面在进入动画前后滚动坐标与宽度一致，无非预期跨页纵向跳动、双重滚动条、下方内容溢出。 |
| L08 | 原 v0.9 的拖拽排序、动作改名、指定食物footer、报告真实数据及所有必要受影响测试复验通过。 |
| L09 | 运行已有受影响测试 + 必要全量门槛；正式发布时跟随V2协议记录Application/END SHA、CI、Pages、实际资源/SW/离线/历史合成档案。实体iPhone/IME/VoiceOver无证据保持Pending。 |
| **L10（新增必测）** | **趋势页**：进度→趋势、日历→趋势、报告→趋势、趋势→日历→报告→趋势，分别记录 `.page-tabs` 底边、`[data-weight-module]` 内第一个实际可见模块顶边、两者间距。不同入口、重复20轮、预备与激活、异步模块加载前后，保持同一批准值（建议14px、允许与视觉基准调整到12–16px）；相同状态最大差≤1px；不能让内容贴线或因多余 margin 出现双倍空白。 |
| **L11（新增必测）** | **三页一致性**：同一视口和字体下，趋势首模块／日历年月头／报告第二级导航与一级导航底边的视觉净间距必须统一，报告其他级别不得被重复加上一级间距。检验320/375/390/430、100/140/200%、长短报告及短横屏，首屏内容不被挤压、无新纵向跳动。 |
| **L12（新增必测）** | **滚动和加载稳定性**：趋势的 `data-weight-module` 初始占位→实际异步数据→滚动→切离→切回，检查布局坐标与 `scrollTop`，不得出现跳顶、额外滚动条或焦点自动滚动；原有趋势交互（图表/日期/切换）和触摸归属不退化。 |

## 开发与交付

按照 `AGENTS.md`、`LATEST_DEV_REPORT.md`、`docs/CHAT_CODEX_WORKFLOW.md`：读取最新 `main`，保护未提交工作，实施**最小可审计改动**，为本轮缺陷补充能在旧版失败、新版通过的原生触摸/中间帧测试。保存旧版失败对照、修复后通过的截图/帧坐标和 computed-style 证据。交付清楚标注修改文件、精确根因、测试 PASS/FAIL/Pending、Git SHA 和回滚方案。不要用只测动画终帧替代逐帧验证，也不要把 CI 成功冒充真机通过。

**本修订替代此前同名 v1 修复说明，交给 Codex 时只使用本 v2 版本，不要同时执行两份相似指令。** 本说明不是生产代码补丁，也不宣称修复已完成。当前只完成录屏与静态源码交叉定位。
