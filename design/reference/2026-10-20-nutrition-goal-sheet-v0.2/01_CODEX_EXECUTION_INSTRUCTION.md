# Codex 正式执行指令｜营养目标/模板 Sheet v0.2

## 开始前
- 阅读仓库 `AGENTS.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`LATEST_DEV_REPORT.md`、`docs/UI_INTERACTION_SPEC.md`、`docs/UI_QA_MATRIX.md`、`docs/DATA_PRESERVATION.md`、`docs/NUTRITION_CYCLE_SCHEDULE.md` 与本包全部合同；若文件移动，检索对应的现行合同。
- `git fetch`，从实际最新 `origin/main` 建立 START，确认工作树干净；记下 SHA。不得覆盖其他开发者修改或强推。
- 验证 ZIP 与 `SHA256SUMS.txt`、唯一 v0.2 HTML 原型哈希。实际打开/运行原型，不依赖截图替代点击体验。
- 在修改前按业务场景复现用户实机问题：无当前启用模板但已有 `V1` 时点「设置目标」直接出现纯手工表单；「管理营养模板」不是可选模板入口；新建/添加日方案输入后键盘收回，Sheet 不在合理高度，模板保存按钮不易触达。

## 产品目标（四个核心）
1. **入口优先模板**：饮食页「设置目标／编辑目标」直接打开单个“设置当日营养目标”选择器，优先列出现有可用营养模板，同时可直接“新建营养模板”；次级入口“手动设置当日目标”。没有启用模板、已有手动目标、存在多个模板均不能跳过选择器自动进入手填。
2. **模板闭环**：选择已有模板 → 若非当前有效模板则**显式确认启用（日期及旧模板影响）** → 选择该模板真实日方案 → 预览同一日期现有目标与待应用目标 → **显式确认**仅写当天目标。任何前置选择/新建/启用不等于自动写今日目标。保存新模板后回到可选择它的入口，不丢失刚创建的模板。
3. **稳定 Sheet**：模板编辑及添加/编辑日方案在同一自然管理路由与正确尺寸的原生 Sheet 中完成；进入子视图和返回、系统键盘展示/关闭、验证失败、成功保存后，弹层均位于可用视口的合理位置。无“缩回半截/停留底部”、“保存目标按钮被键盘或 Safe Area 挡住”。固定 header/必要 footer；表单 body 内滚动；保留草稿、返回位置、VoiceOver 语义。
4. **状态互斥**：仅一个模板在给定使用日期处于有效阶段；显示“使用中”时必须依据真实 phase/date，旧模板启用新模板后变成历史/非当前，不允许两个“使用中”标签同时存在。

## 严格实现边界
- 先查现有代码服务 API、历史来源指针、目标冲突提示；优先复用 `getNutritionStrategyForDate`, `activateNutritionStrategy`, `applyNutritionStrategyVariant`, `saveNutritionStrategy`, `saveNutritionTarget` 与现有 sheet/managementWorkspace 体系；不做演示内存状态替代。
- 清晰区分“可用模板/已归档模板/当前启用模板/模板日方案/已保存每日目标/营养周期排程”。不可把一个日期的目标视为永久模板绑定，不得修改未选日期的目标。
- 原来的营养目标手填、目标编辑/删除、过去/未来日期选择、模板管理/编辑/复制/归档/删除、营养周期排程均继续可用。既有删除合同、范围删除、数据隐私绝不变更。
- 不为实现 UI 去添加 Dexie 版本/表/索引，勿改变 Backup14/Restore1–14/Sync1 既有序列化语义；没有批准的业务语义变更先停止报告。
- 小范围改变 `src/main.ts` 和 `src/ui/nutritionStrategies.ts` 的入口/导航与子视图几何；必要时局部调整 `src/styles/nutritionStrategies.css` 或协调现有 Sheet；不要全局改变所有 Sheet 行为，除非通过全局回归证明合理且必要。

## 必须交付
- 最终修改文件清单，解释每个源码/测试/文档的作用；START/Application/END SHA 与非强推记录。
- 统一的业务状态转移说明（无模板、有未启用模板、有当前模板、有既有目标、过去/未来日期、归档/冲突）。
- 真实代码测试的交互与 computed geometry 原始数据，含截图：键盘打开/关闭/进入方案/返回/保存后的 Sheet 顶/底、标题/footer、视觉可用高度、滚动容器及焦点；对比旧缺陷。
- 符合 `05_ACCEPTANCE_MATRIX.md` 的逐项 PASS/FAIL/Pending，原始失败与复测都记录，不得只挑成功截屏。
- typecheck、单测、生产构建及与改动关联的全套浏览器回归；若原有基线为 1081 项单测、44 条浏览器命令，则交代本轮实际执行数量与变化，不可生搬数字。
- Application 与 END 正常非强推、GitHub Actions 真正成功、Pages/Service Worker/离线身份核对与数据兼容报告。END 仅做报告归档（如现有项目流程要求），工作区保持干净。
- 十项正式回执、GitHub CI 链接、保留实体 iPhone 原安装 PWA/VoiceOver/真实键盘/Safe Area/个人数据验收 Pending，开发完成后停止修改等待 ChatGPT 独立复核。
