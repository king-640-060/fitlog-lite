# 最新 Main 源码定位及待修复触发点

本指引根据准备交付时远程 `main` SHA `fa312427115db55311d9b2d380f0b87d7ac930d9` 核对。Codex 开始时须重新 fetch；行号可能变化。

| 文件/区域 | 当前行为 | 目标 |
| --- | --- | --- |
| `src/main.ts` 约 L1283 | 饮食总览「设置目标/编辑目标」按钮 | 保持入口并先进入模板优先 picker |
| `src/main.ts` 约 L1383–1400 | `showNutritionTargetForm` → `showNutritionStrategyPicker`；`showManualNutritionTargetForm` 手工目标及 `manual-nutrition-templates` | 保持原业务服务；优先 picker，手动为次级入口 |
| `src/ui/nutritionStrategies.ts` 约 L50–79 | `showNutritionStrategyPicker` 仅调用 `getNutritionStrategyForDate(date)`；若不存在当前模板即 `ui.manual(date,target)` | 核心导航断点：即使没启用模板也列可用模板，不直接跳手工 |
| `src/ui/nutritionStrategies.ts` 约 L80–111 | `showNutritionStrategyManager` 显示各模板，但主要点进编辑/详情，不是选用与应用 | 建立真实 picker 选择链路，保留管理独立职责 |
| `src/ui/nutritionStrategies.ts` 约 L131–170 | `showNutritionStrategyEditor` 和 `edit()` 日方案子视图、`returnFromVariant()` | 修复进入/返回的 Sheet 几何与草稿/焦点/滚动 |
| `src/ui/nutritionStrategies.ts` 约 L174+ | `showNutritionStrategyActivation` 已有启用确认流程 | 复用真实启用服务；禁止无确认结束旧阶段 |
| `src/ui/motion.ts` 约 L28–31 | `stabilizeSheetSubview(dialog)` 把可测得的当前高度设到内联 `dialog.style.height` | 在生命周期中安全重新计算/释放，防键盘收起仍留下错误高度 |
| `src/styles/sheets.css` | 共享 `.sheet` + `[data-sheet-variant=large]`、`.modal-body` 及 `.management-workspace` | 利用既有布局与 viewport，不引入跨模块高度回归 |
| `src/ui/sheetController.ts` | `setupSheetViewport`、dialog/scroll lock/title focus 原生生命周期 | 保持真实 Sheet/键盘计算与 Safe Area，非手工 window scroll |
| `src/ui/managementWorkspace.ts` | `surface.open()`、路由栈、restoreScroll、持续的 large Sheet frame | 尽可能复用已稳定的管理路由与父子返回 |
| `src/services/nutritionStrategyService.ts` | 模板、阶段、日方案读取、启用、应用服务 | 沿用事务/日期/来源检查，不另建状态存储 |
| `src/services/nutritionTargetService.ts` | 每日目标独立持久化 | 原目标不默默覆盖，仍只能显式选择日期 |

**实机观察**：用户 3 段视频展示了“设置目标默认手填 + 管理模板才能找到既有模板”和“添加日方案后键盘/返回造成 Sheet 不合适地缩回”。文档给出源码中的可疑原因，但要求 Codex 用真实产品环境复现后定修复方式。全部视频是用户参考，不在交付 ZIP 中重新打包。批准 v0.2 HTML 为新的视觉交互合同。
