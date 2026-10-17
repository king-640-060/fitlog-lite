# 营养周期排程合同

2026-10-11 联合交付 D；批准原型与 SHA 见 [设计基准](../design/reference/2026-10-11-combined/DESIGN_REFERENCE.md)。本文件扩展现有营养策略、每日目标及饮食模板合同，不改变历史事实。

## 业务边界

- 周期为名称、关联真实营养模板、包含首尾的本地日期范围，最多 366 天。按当地日历逐日推进，支持跨年、闰年和 DST；ISO 时间戳仅用于创建、修改和归档元数据。
- 周期按日安排任意真实 Variant 与独立 DietTemplate。未指定只移除该字段的排程，不删除已保存 NutritionTarget；两个更新掩码独立，未选择的字段保持原值。
- 支持单日、多日、跨周、本周、工作日和周末选择。复制按星期位置映射到后续周，首尾范围裁剪；覆盖前展示差异并确认。保存前列出每个日期、快照营养值、饮食模板、已有目标、空白和重叠周期。
- 活跃周期不得日期重叠。用户调整范围或先归档冲突周期；不会以最后写入胜出。修改使用 revision 校验，其他窗口修改后旧草稿拒绝保存。
- 周期日保留选择时的方案名称和值快照。已有快照不随原模板修改或删除重算。新分配会在事务内核实真实来源和值，陈旧来源拒绝；缺失饮食模板保留名称但禁止实际应用。
- 保存、编辑、复制、归档只操作排程。不会创建 FoodLog、修改已保存目标、改动营养阶段、训练和历史快照。归档只使排程退出活跃选择，历史事实继续保留。

## 真实应用路径

管理与设置 → 营养模板 → 营养周期。编辑在现有 Management Workspace / Sheet 内进行，日期使用共享选择器；返回保留草稿和滚动。输入至少 16px，目标至少 44px；七日排程在窄屏/放大字体下仅内部横向滚动。

饮食页所选日期有排程时显示计划来源和两个不同操作：

1. **预览目标**：显示方案快照与已保存目标，明确保留或覆盖。确认后通过现有 NutritionTarget 校验创建每日快照及独立 cycleSelection 来源；事务复核排程、现有目标，拒绝陈旧预览。
2. **预览饮食模板**：使用真实模板/食物解析与现有快照后备规则；预览不写入。仅用户确认已经实际摄入后进入现有 DietTemplate 应用及目标冲突处理。未来日期只能预览，模板删除后不能确认记账。最终事务同时复核周期 revision、每日排程、模板、解析食物来源及已保存目标；预览后食物资料变化也拒绝记账。

这些按钮不会将排程当作健康活动完成或实际摄入。原模板来源、strategySelection 和 cycleSelection 互相独立，不混用；原有每日目标编辑和模板应用保持。

## 持久化与兼容性

- 稳定数据库 fitlog-lite-db，Dexie V12 / IndexedDB 120。显式正向迁移仅新增空 nutritionCycles 与 nutritionCycleDays；原 20 个表的索引、行和快照不变，不从旧事实推断或回填排程。
- nutritionCycles：id、startDate、endDate、archivedAt、updatedAt 索引；nutritionCycleDays：id、cycleId、date、唯一 [cycleId+date] 索引。排程属于业务数据，不是 LocalStorage 配置。
- Backup V12，兼容 Restore V1–V12。旧格式缺少两个新表时归一为空；新格式完整验证 ID、所属周期、日期边界、重复日期、营养值和活跃周期冲突后，所有 22 表在同一替换事务中恢复，失败原子回滚。
- GitHub 加密 Sync / envelope V1 不变，新业务表进入既有 Backup 的加密/验证路径。AI、Voice、WaterReference 等设备配置不入业务备份；无新增 AI 写工具。
- 冻结旧 fixtures 不修改；迁移、重开、失败恢复、加密 roundtrip、多连接冲突以及同一个既有合成生产 profile 的数据/配置哈希与离线启动均为发布门槛。

## 验证与后续范围

单测：tests/nutritionCycles.test.ts。浏览器：tests/browser/combinedHandoff.mjs，并保留既有营养模板、Food、Calendar、报告、Backup、Sync、PWA 回归。视觉以实际运行批准 HTML、匹配视口/字体/主题的截图和 DOM/CSS 对照为证据；可访问性与真实数据差异必须说明。

周期报告没有批准原型，本轮不新增周期报告、不替换日报/周报/月报。浏览器模拟、WebKit、正式部署检查与实体 iPhone Safari / 原安装 PWA 独立；没有设备证据标 Pending。


## Approved joint v0.5 (2026-10-12)

Follow [Approved joint v0.5 contract](APPROVED_JOINT_V05.md). It supersedes prior smart-completion entries, whole-row Habit toggles, flat recovery history and version12 descriptions for this release. Preserve all preceding unrelated data/UI contracts.


## Approved Food / Water / Day Detail v0.4 (2026-10-15)

[Food / Water / Day Detail v0.4](FOOD_WATER_DAY_V04.md) supersedes earlier250ml shortcut and folded Food saved-goal-copy rules. Meal-aware templates remain plans until explicit actual confirmation, with full date/meal/source and target transaction guards. Calendar ten summaries retain width and73px standard height with accessible growth; complete target/actual facts and exact deletion remain. Nutrition permanent deletion checks every persisted reference and source version in one transaction; referenced history can only archive. Dexie13/130/22stores unchanged; Backup14/Restore1–14/encryptedSync1, immutable older snapshots plus new frozenBackup14. Device-only configuration remains excluded; exact production/SW/same-profile/offline evidence and separate physical Pending remain mandatory.


## Approved UX-01–03 v0.4 (2026-10-17)

[Water / six-category cascade contract](UX_WATER_CASCADE_V04.md) supersedes the earlier always-visible Today water controls and archive-only handling for referenced nutrition templates in this explicitly acknowledged path. Default Today disclosure and compact equal500/1000 Sheet preserve all water services. Only the six specified nutrition tables may lose approved owned rows, with full preview, risk checkbox, second danger confirmation, stale-source/ownership checks and complete rollback; mixed provenance and invalid cross-cycle allocations reject without writes. Original unused-only delete API remains guarded; all health facts, unrelated targets/templates and device config survive. Removed cycles leave the existing cycle-report picker; ordinary reports continue reading actual facts, deleted goals are not reconstructed, and no new nutrition-template analysis report is introduced. DB13/130/22, Backup14/Restore1–14/Sync1 unchanged. New-UX unit/browser/production/physical evidence is separate from the completed F1–F5 acceptance.
