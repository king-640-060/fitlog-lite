# 五项联合 v1：实际验收证据

[批准原始基准](../../reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md) · [实现合同](../../../docs/FIVE_COMBINED_V1.md) · [QA与失败说明](../../../docs/FIVE_COMBINED_V1_QA.md) · [最新发布状态](../../../LATEST_DEV_REPORT.md)。

本目录为实际证据的精简副本，原始大图、完整中间FAIL/复测及部署后证据保留在交付包与work目录。冻结前的失败记录不倒写成PASS。

- `remote-full76-including-failures.json`：最终产品源远程76调用73PASS/3FAIL，整个临时QA CI为failure。`effective-full-regression.json`使用相同182产品文件SHA的本地三套完整复验补齐有效覆盖；绝不冒充一次全绿CI。原断言保持、Date/就绪适配见QA。另完整WebKit30组复验不重复计入76。
- `joint-full60-actual-measurements.json`包含全部60组合和1080组真实三图高度数据、7/30/90内部高度，非仅一条自述。
- units1190、typecheck/build为本轮实际命令。`candidate-source-and-assets.json`是提交前本地候选身份，不是Application/END。正式身份与CI/Pages要查最新报告及最终回执。
- 旧短名和3200字符名称的 frozen START Restore/Export/Autosave→新Restore/Sync双引擎实际执行，全22表比较；新增name与原始字段保护都有失败/并发/回滚场景。
- prototype8上下文，睡眠时钟12上下文84场景；浏览器locale不等于实体iPhone系统设置。
- local-contact与local-before-after-styles为本地冻结Classic7110564、Native/深色68f4747的12对截图/computed style，早于最后目标短句均衡换行与空餐重复计数修复，不偷换版本；这些最后修复在最终矩阵及正式站另验。
- actual-production-before PNG/JSON确实来自旧正式站HTTPS/START/320px/200%，仅用于记录修改前现象，不标为PASS。
- scope保护原17冻结输入（其中10 JSON）、78旧单测、691旧设计、159旧src/41服务及DB schema。唯一旧呈现assert恢复批准Classic meta颜色；原业务assert逐字保留。

实体iPhone/原安装PWA/真实键盘与时间picker/Safe Area/VoiceOver/个人数据连续性/真实Provider与独立核查仍Pending。旧WebKit饮水Undo−128px未在本轮解决。Application/END尚需实际发布核验，不能由本目录推断已上线。
