# 联合 v0.3 QA 执行档案

本文件记录 Application 提交前已执行的本地门槛与证据索引。正式推送、Application/END CI、生产App/SW/精确资源、同一合成profile与离线冷启动只在实测后写入 [LATEST_DEV_REPORT](../LATEST_DEV_REPORT.md) 和最终十项交付回执；不能把这里的本地构建当作线上发布或实体验收。

START=`9423586813e2c65a2f2d7126b82acb70bbe02100`。用户授权本轮正式开发/合成测试/正常发布；不授权操作个人PWA健康数据。原F1–F5用户36/36历史结案保持，不能覆盖本轮设备验收。

唯一批准HTML SHA256=`436f5eeaec511559026ffa7364be64b7d1fd94a63ee1cda04351efeed91e3991`。ZIP SHA256=`d37daed969a5435531cafb89dbba8905ec5f9a4d161bfa12dc252f2651204163`。19条SHA256SUMS、18项manifest字节/哈希、CRC/安全路径及20归档原字节均通过。实际原型Chromium/WebKit共360高度组，未当作App结果。

完整测试：`npm run typecheck`、`npm test` **1081/1081、75文件**（保留1009，新增64范围删除/并发/取消测试及8报告测试），无skip/todo；另UTC完整1081/75和洛杉矶新增72/2均通过。正确Pages base干净build通过，既有chunk-size advisory保留。44条既有浏览器命令与新增真实应用双引擎矩阵实际通过。最终K与完整矩阵候选G的差异有源码哈希清单：报告章节CSS、失效筛选重置、日详情大字体行尾标点换行；趋势及删除服务未变。受影响完整旧套件分阶段重跑，查询与跨tab删除后重置两引擎实际通过，均保留各次构建来源。所有原冻结样本及旧断言保护的事实/数据语义保留；仅更新新批准明确替代的focus/日期/空图/管理危险路径UI期望，并用原生summary点击展开新默认折叠章节。

证据：[完整44命令与最大高差](../design/qa/2026-10-17-joint-v0.3/local-summary.json)、[4320步骤测量CSV](../design/qa/2026-10-17-joint-v0.3/height-measurements.csv)、[截图/差异说明](../design/qa/2026-10-17-joint-v0.3/README.md)。两引擎各30完整显示上下文×6数据状态×3图=1080组，7→30→90→7；9个内外部位分别检查，最大差值由JSON/CSV给出。WebKit完成竖屏与横屏补跑的组合有明确原始运行SHA/范围，不将失败或未完成上下文算通过。Chromium完整执行使用配套Headless Shell151；旧门槛也保留系统Chrome155真实通过结果，各命令环境分开记录。

## 批准矩阵全部34行

|ID|本地状态/发布引用|实际证据或边界|
|---|---|---|
|BASE-01|PASS|起点干净 main/origin/main=94235868…；后续 fetch 未变化，既有历史保留；见上方原始JSON/命令及对应测试。|
|BASE-02|PASS|19项SHA、18项manifest/CRC/路径检查；20原件逐字节；唯一v0.3原型双引擎360组实跑；见上方原始JSON/命令及对应测试。|
|WATER-01|PASS|真实App SVG/ARIA/hidden/default closed/右侧动作；新矩阵及原UX双引擎；见上方原始JSON/命令及对应测试。|
|WATER-02|PASS|所有显示上下文显露；390代表真实内部owner、底栏与34px模拟SafeArea；见上方原始JSON/命令及对应测试。|
|WATER-03|PASS|原服务单log防重/Undo/自定义与历史；原44命令和双引擎新矩阵；见上方原始JSON/命令及对应测试。|
|TREND-01|PASS|实际各自独立range/selection/scroll，无共享控制；见上方原始JSON/命令及对应测试。|
|TREND-02|PASS|7完整自然日可见；30/90每个自然日横滚；实际文字range rect不重叠；见上方原始JSON/命令及对应测试。|
|TREND-03|PASS|1080组×4步；9个部位分别实测≤0.5px，不只测外卡；见上方原始JSON/命令及对应测试。|
|TREND-04|PASS|两引擎各30上下文：5宽×2主题×3真实字体；6数据状态；见上方原始JSON/命令及对应测试。|
|TREND-05|PASS|90日参考域，区间外大值/单点/空/跨月/离线；同选中ID或日期值比较Y；见上方原始JSON/命令及对应测试。|
|REPORT-01|PASS|顶层仅2类型；四旧focus值不再控制显示；日报十类事实保留；见上方原始JSON/命令及对应测试。|
|REPORT-02|PASS|共有事实引擎；默认折叠细节、真实覆盖/同日目标、最多3条事实与边界；见上方原始JSON/命令及对应测试。|
|REPORT-03|PASS|真实cycle/phase分开标注；模板筛选/无范围筛选不丢入口；跨客户端删选中模板后无刷新重置；未来尚未开始；见上方原始JSON/命令及对应测试。|
|REPORT-04|PASS|按真实窗口聚合九类事实，睡眠业务夜晚去重；Task变更不影响分析；见上方原始JSON/命令及对应测试。|
|REPORT-05|PASS|28天/12已到、3完整饮食、7饮水、1夜实际断言；g/kg具体日期体重；见上方原始JSON/命令及对应测试。|
|REPORT-06|PASS|确定性观察/局限/下一步；无身体成分、TDEE、确定赤字或疾病诊断；见上方原始JSON/命令及对应测试。|
|DELETE-01|PASS|全部阶段/周期闭区间并集、gap/future/open-local-today；明确日期日数；见上方原始JSON/命令及对应测试。|
|DELETE-02|PASS|六归属集合∪区间目标，独立核对来源/额外目标；无范围不删健康事实；见上方原始JSON/命令及对应测试。|
|DELETE-03|PASS|九健康表精确ID；跨午夜captured/legacy整段夜晚及active拒绝；见上方原始JSON/命令及对应测试。|
|DELETE-04|PASS|七计划/共享定义表与区间外、无关模板完整对象不变；见上方原始JSON/命令及对应测试。|
|DELETE-05|PASS|15类实际计数、范围来源、未来/已到、间接日期影响和旧备份可恢复告知；见上方原始JSON/命令及对应测试。|
|DELETE-06|PASS|两次取消、原生关闭/排队取消/事务中关闭回滚、刷新勾选重置、双击；见上方原始JSON/命令及对应测试。|
|DELETE-07|PASS|跨模板归档/phase交叠、交叉/混合/缺失引用/非法周期日全拒绝零写；见上方原始JSON/命令及对应测试。|
|DELETE-08|PASS|22表一个rw事务；15步故障与15步取消、后置异常、双连接/双tab；见上方原始JSON/命令及对应测试。|
|DELETE-09|PASS|两引擎全22表ID集合及完整内容hash、配置hash和重开一致；见上方原始JSON/命令及对应测试。|
|DELETE-10|PASS|Today/趋势/日历/两报告/管理刷新；保留B周期、范围外事实及计划可查看；见上方原始JSON/命令及对应测试。|
|DATA-01|PASS|DB13/130/22、Backup14/Restore1–14/Sync/envelope1；15冻结及16既有fixture未变；见上方原始JSON/命令及对应测试。|
|DATA-02|PASS|原合成profile发布前baseline22表/8配置hash及离线PASS；发布后同profile见LATEST；见上方原始JSON/命令及对应测试。|
|REG-01|PASS|Typecheck、1081/75 full units、Pages build、44完整浏览器命令PASS，无skip/todo；见上方原始JSON/命令及对应测试。|
|REG-02|PASS|Chromium/WebKit真实App危险流程、全表回滚/计时冲突/延迟autosave和高度矩阵；见上方原始JSON/命令及对应测试。|
|REL-01|本地检查PASS；推送结果见LATEST|原设计/冻结文件、diff检查、修改范围、合同/QA；正常START/App/END身份由发布后记录。|
|REL-02|发布后独立核验，见LATEST及最终回执|Application/END各自CI/Pages/线上JS/CSS/SW/build-info、执行worker及离线；本文件不预先宣称通过。|
|REL-03|Pending|实体iPhone Safari、原安装PWA、VoiceOver、真实键盘/SafeArea、个人数据连续性，无真人证据。|
|REL-04|最终十项回执交付时核验|本地原始日志/PNG/失败重试已保留；最终交付附件和停止状态见LATEST/回执。|

## 数据与失败记录边界

15个冻结历史文件及全部16既有fixture与START逐字节一致。DB13/IDB130/22stores，Backup14/Restore1–14、Sync1/envelope1和设备配置格式没有变化。新增独立合成fixture；所有危险测试仅在隔离上下文。既有合成profile的发布前22表hash为 `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`，8配置hash为 `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`；发布后重复检查由LATEST/最终回执记录。

新服务单一22表写锁内只按15表批准ID删除，七保护表只读校验；15步故障、15步取消、完整后置集合、陈旧指纹、午夜、归属缺失/混合/交叉、归档交叠、active Sleep/Workout及跨tab Kegel均有实际证据。迟到Workout autosave/finish必须存在检查与有氧原子编辑不复活删除ID。合法已移除variant历史仍可读/恢复，但新扩大危险路径缺失来源时拒绝并要求核对，未自动改写历史。

中间失败与中止不是PASS：后期真实报告失效筛选缺陷先保留单测/UI红灯，再修复并双引擎重跑；320px/200%中文行尾括号溢出先保留失败与无效修复证据，预留一个字宽后完整combined套件重跑。WebKit曾在Habit点击上超时，同版本后续完整套件通过，未据此改写Habit。Unified保存值检查改为等待真实异步liveQuery结果，原值/日期断言仍逐条保留。修复了实际SVG日期轴压缩、短屏饮水数字布局/nowrap、异步报告旧控件重复操作、取消排队/事务保护和迟到自动保存。原生IDB夹具直写后旧Dexie缓存导致的驱动误判，改为重开并等待实际数据就绪；完整语义断言未降低。后期系统Chrome环境发生大量截图/滚动/导航超时，保留原日志，改用匹配的驱动及安静本地服务器逐个重跑。撤销六次独立事件追踪未再现按钮位移，不据此凭空改写共享Toast。个别旧套件不可直接使用的假设以实际失败日志与后续修复记录为准；未通过的命令不计入44成功表。

物理设备、个人健康数据、真实Provider和ChatGPT独立代码/CI/视觉验收均未由本轮自动化代替。已批准范围以外不继续开发。
