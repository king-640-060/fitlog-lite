# 营养模板六类级联永久删除 · 安全与语义合同（本轮用户批准）

**用户决定：** 删除营养模板时一并永久删除六类直接关联数据，明确接受历史关联信息损失。不要求用户先去各处解除引用，不以归档或隐藏替代永久删除。**只删除这六类**，不得以关联日期范围批量删除其他业务记录。

## 1. 六类影响表/对象
1. `nutritionStrategyTemplates`：被选中的单个模板定义；
2. `nutritionStrategyVariants`：所有 `templateId` 属于该模板的日方案；
3. `nutritionStrategyPhases`：所有引用该模板的当前及历史阶段；
4. `nutritionTargets`：**来源关联**到本模板、任一 owned variant 或 owned phase 的每日营养目标（含 `strategySelection` 与 `cycleSelection` 的 template/variant/phase 路径）；不以相同日期或相同数值删除无关手动目标；
5. `nutritionCycles`：`templateId` 指向本模板的所有营养周期，包括已归档/历史/未来周期；
6. `nutritionCycleDays`：属于这些删除周期的所有日期行，以及代码核对发现明确指向所删模板/variant 的日期行（需要先检查该行所属周期完整性，禁止留下不合法残行）。

**保留并测试**：全部 `foodLogs`、`foods`、`weights`、`waterLogs`、`sleepSessions`、`workouts`、`cardioSessions`、`habits`、`habitCheckIns`、`tasks`、`dietTemplates`、设备 AI/Voice/Appearance 配置、其他模板及不相关手动 NutritionTarget。所有历史实际健康事实独立存在。

## 2. 非常重要：跨对象一致性
- 检查完整 `NutritionStrategySelection`/`NutritionCycleSelection`/`NutritionCycleDay` 数据类型、`saveNutritionCycle`/`validateCycleCollection` 等关联不变量，找出**全部**正向/反向引用路径、存储快照及非规范旧数据（不能只照搬上述字段集合）。
- 同一个目标行如混合了两个模板来源或目标/周期选择互相矛盾，不得粗暴删除无关模板的数据或残留悬空指针：判定为含混/不一致，**阻断整次删除并报告可操作原因**，待确认正确修复。不能凭名字/热量/日期猜测来源。
- 对不属于被删周期、但日排程引用被删模板的行：先确定是否能合法地**仅移除该排程的营养分配**且仍满足周期日非空、周期模板语义、revision/活跃交叠等合同；如无法保持合法性，则明确报冲突并原子拒删，不能留下孤儿/悬空 variantId，也不能为了成功静默删除其他模板完整周期。
- 删除被选模板正在使用的阶段时，撤销相应运行态选择/展示入口；无引用残余。禁止把持久化 active state 单独留在配置/缓存。
- 删除模板对应的周期后，该周期的历史报告不再可选择，但普通报告仍统计独立真实健康事实。不要尝试重建或虚构已删 NutritionTarget。
- 保留当前已有**无引用模板删除**语义；新有引用删除必须走独立明确确认的级联路径，不放松一般“无引用可直接删”服务的保护，避免其他调用方意外破坏历史。

## 3. 事务和并发
- 先在 read-only transaction 生成完整预览/计数与确定性的引用/对象指纹（六类），让用户知情。
- 用户确认后，在**同一 `rw` Dexie transaction** 覆盖六表；再次读取完整对象集合、归属、引用和 fingerprint；不同则中止并要求重新预览/确认。跨连接新增目标、周期日、变体、阶段也应拒绝陈旧确认。
- 在事务内按能维持完整性和可回滚顺序删除；任何失败必须原子回滚。不要跨 `await fetch()`、不在事务中打开 UI/等待用户输入。
- 事务完成后重新 read/check 六类对应对象无残留、其他健康事实/无关模板和目标 hash 完全未变；唯一允许的不同是六类的**已明确属于删除集合**的行。
- 在单个事务内正确处理 IndexedDB/Dexie 锁范围与其他写连接、重复快速点击、取消、离线、失败注入和 stale preview；既有删除界面不得暗中调用原 `deleteUnusedNutritionStrategy` 误阻断。
- 冲突报错必须明确**不删除任何记录**，不可“部分完成”。

## 4. 兼容性
- 先评估本删除行为是否改变 Backup14 文件语义或 Dexie13/22stores 模型。原则上**不引入 schema 迁移**，Backup14/Restore1–14/Sync1 保持兼容。若不得不变更合同，必须先报用户批准，不自行升版本。
- 冻结 fixtures 不改、不删；导出、恢复、加密同步、旧数据及相同 synthetic profile hash/重开验证必须覆盖“已删引用不存在”“独立真实事实继续存在”。
- 只在合成/隔离 DB 中测试；**不得执行实际用户模板的删除**。用户确认要实现功能，不等于授权在真实设备立即删除某个模板。

## 5. 确认 UI
应具体列出每类数量与对象总数、不含不相关记录。描述不可撤销及哪些历史关联会失去（如保存目标/周期报告）；同时明确真实 FoodLog/体重/饮水/睡眠/训练不受影响。提供取消和勾选确认，可用辅助按需展示影响明细，但不得强制逐项管理。
