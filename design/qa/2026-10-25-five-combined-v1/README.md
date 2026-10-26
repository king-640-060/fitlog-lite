# 五项联合 v1：冻结的开发验收证据

[批准输入](../../reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md) · [实现合同](../../../docs/FIVE_COMBINED_V1.md) · [QA](../../../docs/FIVE_COMBINED_V1_QA.md) · [实际发布状态](../../../LATEST_DEV_REPORT.md)。

最终产品源为fb9f49a867e2be68226f74aa05ecfed7233ab6b2，182个产品/构建/依赖文件与本地候选及两次测试驱动专项重跑逐一SHA相同。最终Application/END是后续正式提交，不能将临时QA SHA冒充上线身份。

- final-regression-summary：完整77调用原始75PASS/2FAIL；固定AI模拟流首片段就绪和真实Sheet动画就绪后，两套原断言完整专项复验PASS，构成有效77调用覆盖。它不是一次77/77全绿CI；原FAIL、两次重跑的独立CI链接、每个driver SHA均保留。
- joint-full60-actual-measurements：最终源全部60组合、1080组三图真实高度数据与7/30/90内部高度；各单宽runner标diagnostic，不掩盖筛选，汇总验证完整并集。
- native-scroll-regression：headless-shell Chromium/完整Chromium/WebKit×两字号6/6，今日和历史所选日期各8次往返，22表完全不变。有效旧正式版/候选负对照证明重复append导致scrollLeft归零及错选日期；修复只避免移动已挂载的DOM，没有新增日期重置/计时器/监听器。
- final-local-gates：最终源实际完整Chromium的Food35、宏量营养40、每日记录65与20压力循环；后续AI4及每日记录65动画就绪驱动复跑均保留，重复不扩大唯一案例数量。units1190/typecheck/build来自最终源实际命令。
- compatibility-short/long：旧客户端Restore/Export/Autosave→新Restore/Sync双引擎、22表完整比较，含3200字符旧模板名称。sleep-clock：12上下文84场景；浏览器locale不是实体iPhone系统设置。
- local-contact/local-before-after是较早本地冻结Classic7110564与Native/深色68f4747的12对截图与15个token/代表组件computed style，早于最后目标短句与空餐文案修复，不偷换成最终正式站图。actual-production-before确为旧正式HTTPS/START/320px200%。最终正式站照片与资源/同档案/离线证据由发布后回执和证据包提供。
- pre-adoption文件、remote-full76及local-complete-retries是较早2ab源码历史记录，不当作最终源通过；所有首败原件仍在work交付目录。

本目录冻结时正式Application/END部署仍Pending；不得由本地或临时CI推断Pages已发布。实体iPhone、原安装PWA、真实IME/原生时间picker/系统12或24小时设置、Safe Area、VoiceOver、个人连续性、真实Provider与独立核查仍Pending。旧WebKit饮水Undo−128px未在本轮解决。

日志阅读副本仅移除行尾空白和多余末尾空行，以通过git diff --check；有变化的文件同时保留同名.gz原始字节，RAW_LOG_COPIES记录两者SHA。原始work日志不修改，测试结果与断言不改。
