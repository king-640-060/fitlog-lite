# 业务集成与数据安全合同

## 必须复用的真实机制

当前正式源码已存在：
- `mountRecovery()` / `readRecoveryRecords()` / `liveQuery()` 管理 Today 回显；
- `showWaterRecord(ui)` 提供底部紧凑饮水选择器，并由进度页面使用；
- `showWaterEditor()` 提供现有合法校验、历史编辑和嵌套表单能力；
- `addWater()` 将每次真实保存写为一个 `WaterLog`，`deleteWater(id,...)` 可按记录 ID 精确删除；
- `waterUndo(saved)` / `showActionToast()` 为现有 Undo 体验；
- `readWaterReference`、`saveWaterReference`、`observeWaterReference` 为设备级参考值；
- `openHistorySheet()` 等展示真实水历史；
- `setSheetVariant(...)` 和 `ui.openModal` 为现有 Sheet 生命周期/弹层架构。

Codex 应优先由 Today 调用/抽取共用 `showWaterRecord(ui)`，谨慎验证它的 `onSaved`、自定义子视图、父弹层关闭、默认日期和 Undo 行为。需要适配时明确参数，不新建第二套写入或重复展示两个底部弹层。保留进度页原有点击和选中事实日期语义。原型自制 DOM/模拟历史/`amount=1750`／`reference=2500` 不得进入正式构建。

## 今日入口状态变化

- **旧 Today 专用状态** `waterExpanded`、卡内 `#today-water-actions`、卡内快捷添加/修改按钮和显露该展开区的 `revealWater` 属于被替换的 UI 机制；删除这些专用逻辑时须先确认没有其他入口依赖。`revealOwnedContent` 如被其他模块使用，不得删除共享模块。
- 新 Today 「记录饮水」为普通 Button，直接打开同一真实 Sheet，不挂虚假的 `aria-expanded` Disclosure 状态。推荐 `aria-haspopup="dialog"`，使用现有 `openModal` 的真实可访问语义。
- 不因 `liveQuery` 重绘而让正在输入的 Sheet 被反复卸载；成功后关 Sheet 再响应数据，失败保留焦点和输入值。防双开/双提交。
- Today 按钮只用于写入今天，历史补录必须继续显式指定日期，不让趋势选中日期、上次记录日期成为 Today 自动写入日期。

## 写入、时间和撤销

- `addWater(amount)` 仍使用设备本地业务日期 `getLocalDateString(now)` 和真实 timestamp，不能 `toISOString().slice(0,10)` 生成业务日期。
- 当前服务校验由 `validateWaterLog` 定义。支持范围、错误文案以正式代码为准；不把原型“最多10000ml”硬编码成线上新阈值。
- 快捷操作 **1 次点击 → 1 条 WaterLog**；忙碌状态禁止快速双击产生重复日志；确切 ID Undo、失败不展示成功 Toast。
- 自定义成功需退出整个饮水录入操作，且为同一次记录生成恰好一条日志；取消后没有日志。
- 历史记录必须继续查看/编辑/精确删除旧 WaterLog；不得用新 UI 覆盖历史可编辑能力。
- 修改饮水参考值只影响当前设备参考展示，不能更改历史事实、Backup/Sync 事实、训练营养记录。

## 兼容与防护

- `fitlog-lite-db`、Dexie v13、22 stores、IDB130、Backup14、Restore1–14、Sync1／envelope1 不变。本轮无需迁移。
- 22表实际保存前/后一致性：只有明示新增/撤销的 ID 会改变 waterLogs；其他 21 表及非本次 WaterLog 行保持不变（如合成测试引用设备配置，设备参考值单独比对）。
- 本次不触发营养模板六类/九类范围删除、不改计划/任务/习惯、食物、体重、睡眠、训练、报告、AI 业务数据。不改历史快照、旧数据种子、备份/同步格式。合成隔离样本测试，严禁碰用户个人 PWA。
- 已知遗留：上轮 WebKit 撤销后页面自然滚动约 −128px，START 基线前后相同。本次要避免**新增滚动偏移**；若新 Bottom Sheet 令问题显著加重，须报告/阻断修复而不是掩盖。不可把本任务当已授权的共享 Toast 滚动重构。真实设备体验仍 Pending。
