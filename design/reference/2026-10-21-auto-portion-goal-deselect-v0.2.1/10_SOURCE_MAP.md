# 正式仓库代码定位（实施前必须核对最新 main）

仓库：`king-640-060/fitlog-lite`。准备开发包时只读核对：main `87de0ee15eb583f5b8e1f16a86ee28c0f27add4e`。

- `src/ui/nutritionCompletionSheet.ts`：现有指定食物完整 Sheet，当前先要求 `data-designated-grams` 并重建 selected/list。**任务 A 的主要 UI 入口**。
- `src/utils/designatedNutrition.ts`：对用户手填克数只做纯预览；当前**不是**建议优化器。应保留用作微调结果预览。
- `src/utils/nutritionCompletion.ts`：`getNutritionCompletionSummary`, `completeNutrition`, `completionBounds`；已有确定性优化器，支持 `allowedFoodIds`。需验证全选食品被保留/不可达与未知值行为，适当受约束扩展。
- `src/services/nutritionCompletionService.ts`：`readNutritionCompletionSource` / `nutritionCompletionSourceSignature` / `applyNutritionCompletionPlan`，提供事务与陈旧数据检查。不能复制第二套保存实现。
- `src/main.ts`：Today、Food 两处进入补齐，以及 `showNutritionCompletion`。仅修改必要入口文案和状态连线。
- `src/ui/nutritionGoalPicker.ts`：当前 `current=...context?.template.id===t.id` 导致模板阶段信息呈现类似“已选中”，**任务 B 的主要位置**。引入单独 UI selection state，不写 DB。
- `src/services/nutritionStrategyService.ts`：启用/当天日方案应用在事务中查验，**取消选择不得调用任何写服务**。
- `src/styles/nutritionStrategies.css` 与相关 Food/Sheet 样式：仅局部控件状态、20px 选择圆圈、稳定布局；不修改共享 Sheet primitive。
- `docs/APPROVED_JOINT_V05.md`：含旧“不优化指定食物”的行为规定，本次合同仅局部覆盖旧行为，数据保护仍有效。
- `docs/NUTRITION_GOAL_TEMPLATE_V02.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`AGENTS.md`、`LATEST_DEV_REPORT.md`：历史保护与流程。

所有真实路径、函数名、文件版本在实施前重新核对 main；不要求照搬上述旧 SHA。针对具体变更最小修改。
