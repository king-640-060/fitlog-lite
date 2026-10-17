# Codex 正式实施指令 · FitLog Lite UX-01～03 v0.4

## 1. 项目及背景
仓库 `king-640-060/fitlog-lite`；原 F1–F5 于 2026-10-16 结案，归档基线 `d8b08b74e17e91139239f1d6d939ddd9b1d7030c`。新任务是用户已批准的独立 UX-01/02/03，不能重新打开 F1–F5。实际开始 SHA 应先读取远程。
先读取 `AGENTS.md`、`docs/CHAT_CODEX_WORKFLOW.md`（V2 ChatGPT-first）、`LATEST_DEV_REPORT.md`、`docs/FOOD_WATER_DAY_V04.md`、`docs/FOOD_WATER_DAY_V04_ACCEPTANCE.md`、`docs/DATA_PRESERVATION.md`、`docs/NUTRITION_CYCLE_SCHEDULE.md`、`docs/APPROVED_JOINT_V05.md`、`docs/UI_QA_MATRIX.md` 及相关代码与测试。

## 2. 开发目标
- UX-01：首页饮水改为默认收起/按需下拉记录。
- UX-02：进度饮水 Sheet 减少不必要高度与按钮视觉重量。
- UX-03：**直接永久删除营养模板及六类所属关联数据**，取消“历史被引用就不可删”的 UX 限制，但严守六类之外健康数据不动、原子回滚。
用户已确认六类范围，且用户**明确不实施营养模板综合分析报告**。不新增报告或统计模块。

## 3. 当前事实与核查
截至已知版本：`src/ui/recovery.ts` 今天/进度使用实际 water service；`src/ui/nutritionStrategies.ts` 的删除按钮在引用时禁用，`src/services/nutritionStrategyService.ts` 的 `deleteUnusedNutritionStrategy` 扫描六表并阻止引用删除；`src/db/types.ts` 包含 strategySelection、cycleSelection、nutritionCycles/Days。以最新实码为准，核实引用通道、schema、存储和 CSS。先复现用户截图所见粗大问题，不能仅做静态改 CSS。
**禁止**把现有安全函数粗暴去掉 `canDelete` 判断后直接运行。

## 4. 用户已确认的交互与业务
以 `DESIGN_LOCK.md` 和 `CASCADE_DELETE_CONTRACT.md` 为约束。首页默认只展示累计/参考/历史和「记录饮水」展开；进度 Sheet 紧凑、500/1000 等权、自定义次级；用户在营养模板详情直接点击危险删除，读到六类真实数量，勾选风险并二次确认，系统原子删除六类直接关联对象。实际健康记录与其他模板保持不变。禁止把隐藏/归档当删除。
不能要求用户先逐个查找引用以解除保护。

## 5. 原型基准
先验证交付目录的 HTML 和 `SHA256SUMS.txt`：
`prototype/FitLog_UX01_UX02_UX03_Interactive_Prototype_v0.4.html`
`96804e985c5287fa9d0ea857924335a30813a49758b74f1abf73af550dbf8ceb`。
用 Chromium/WebKit 实际打开并交互：首页折叠/展开/饮水、进度 Sheet、历史有引用/活跃/无引用模板删除与取消。必要时建立新的隔离 snapshot，但绝不更改批准 HTML。原型日期/计数/示例为演示，不是正式业务值。

## 6. 修改范围和禁止项
仅修改必要的 UI、业务删除服务、相关 CSS、QA 测试/合同/最新状态及冻结原型归档。保留其他首页卡片、Progress/Coach Report、F1–F5、已有营养目标计算、饮食模板和真实健康数据。不能绕过冲突、扩大删除或变相清空数据库。不能采用禁用测试/删除断言/仅改组件样式而不落地真实事务。

## 7. 数据安全
完整执行 `CASCADE_DELETE_CONTRACT.md` / `DATA_RELEASE_SAFETY.md`。在单个六表 `rw` Dexie 事务内，锁住确定性预览、重查指纹、删除归属对象并验证一致性；并发变化、历史/跨模板引用含混和任何注入错误都必须零副作用。其他所有业务表精确保留。版本原则为 DB13/22 stores、Backup14/Restore1–14/Sync1，不自主升级。**开发并不授权真实用户数据删除。**

## 8. 测试与功能验收
逐项执行 `ACCEPTANCE_MATRIX.md`，覆盖 UI 点击事件、真实持久化、引用范围、并发、失效预览、混合来源、事务回滚、原独立记录 hashes、重新打开 DB、Backup14/Restore/Sync。保留全量旧 regression gates。
独立模拟风险：历史目标与手动目标同一天、两个不同模板的 variants、已归档周期和未来排程、不规范孤儿/交叉周期日；必须不越界，不留 orphan。所有异常状态须显示用户能理解的错误。

## 9. 视觉验收
必须用实际产品和唯一批准原型同视口/主题对照，标准 320/375/390/430；深浅；字体 100/140/200%；横屏；Sheet 打开关闭和真实键盘。保留 16px 输入、>=44px 点击目标和 Safe Area。不得牺牲卡片左右满宽，仅压缩竖向密度，避免 UX-01 又变成长高大卡片。原型演示顶栏不复制进 App。

## 10. 文档要求
新增/更新本轮 UX 数据合同、QA、验收清单、`LATEST_DEV_REPORT.md`；批准 HTML + 原 SHA 及必要预览图不可变归档到 `design/reference/`。保留原 F1–F5 结案与 UX-01～03 需求来源，不重写原历史。同步相关数据保存和报告合同，明确删除周期报告消失而普通报告继续读取真实记录。

## 11. Git、CI 与正式发布
开始时核实 `main`、`git status`、`git fetch`；普通非强制 push main，先 App commit 与 Application CI/Pages，再必要的最终 report-only END commit 和最终 END CI/Pages。实际核实线上资源/SW/build identity、offline cold boot、相同合成旧 profile hash。无权限/测试或真实发布失败时如实 Pending，不得虚称发布成功。不要依靠复制前一轮提交 SHA 的日志冒充当次执行。

## 12. 十项正式回执
最终回报必须覆盖：
1) 各验收编号状态 PASS/FAIL/Pending；
2) 全部修改文件及用途；
3) UX-01/02/03 实际实现与用户交互；
4) Git START/Application/END commit 和远程一致性/工作区；
5) Typecheck、unit 总数、旧/新浏览器套件真实命令和结果；
6) 唯一原型 SHA 与实际视觉截图/对照；
7) DB/Backup/Restore/Sync/六表级联及**全部保留健康数据** hash、事务失败与并发验证；
8) 更新合同/QA/设计基准；
9) 两次 CI、Pages/JS/CSS/SW/build-info/离线身份实际证据；
10) 真机原安装 PWA、个人数据及 ChatGPT/用户验收 Pending 项目。

保存可核验原始日志/截图/失败与修复证据。交付后停止，不进行未批准的营养模板分析开发。

**工程决策升级机制：** 如发现六类以外的数据必须删除才能保持 schema 合法，不得静默扩大范围；先暂停相关路径，给用户说明精确约束、可选方案与数据风险。未经批准不得按“方便实现”改需求。
