# 交互 v0.9 验证与交付记录

本文件记录本轮实现、首败和可复核证据。它不是用户或 ChatGPT 的独立验收。正式发布身份、Application/END CI 和最终线上结果以 [LATEST](../LATEST_DEV_REPORT.md) 及正式十项回执为准；未完成的检查不能预写成功。

## 输入、范围和环境

START `8dac27a4399f6ab0a279308ad5f298bf25ca1482`。2026-10-29 fresh fetch 确认远程 main 无新增提交；保护其他修改，正常非强制推送。

ZIP SHA256 `da0ed4e621df46d9542a7e3c9626255d93e74845a5fa2fe3d582d9e918889a3c`；14 成员 CRC、安全路径和 13/13 SHA256 匹配。唯一批准 HTML SHA256 `d41171fc85af521cd6d6c1b3a7a249eb20aee369941296a117ee474d261f480d`。双引擎四宽实际运行 8 上下文；原件、冻结 fixture 和旧设计基准不改。见 [批准基准](../design/reference/2026-10-26-interaction-v09/DESIGN_REFERENCE.md)、[实现与有限审计](INTERACTION_V09.md)。

本地 Node24.16.0、Playwright1.62.1，Chromium/WebKit；远程独立 macOS runner 的具体系统和版本保存在原始产物。只使用新隔离合成上下文、假 Provider、既有专用合成持久 profile；不操作个人浏览器、个人健康记录或真实 Key。

## 自动化与首败

npm ci、TypeScript、80 文件 1199 单测通过，原 1190 单测保留，新增 9 项覆盖准确快照、未知字段/备注/精度、源删除/旧草稿、故障回滚、模板冲突、Backup14/Restore 与加密 Sync1。最终G TypeScript及修改态生产build亦通过；正式clean build、Application/END实际结果由最终回执列出。

- 候选 C [40623483525](https://github.com/king-640-060/fitlog-lite/actions/runs/40623483525)：真实 82 调用，57 PASS / 25 FAIL，CI failure。
- 候选 D [40858089614](https://github.com/king-640-060/fitlog-lite/actions/runs/40858089614)：真实 82 调用，73 PASS / 9 FAIL，CI failure。18 runner 的 181 源文件 SHA 与冻结 D 一致。
- 候选 E [40870633372](https://github.com/king-640-060/fitlog-lite/actions/runs/40870633372)：被后续横屏修复替代并主动取消，不能当作完整通过。
- 冻结候选 F `82578ab21d58f0618caf4196581aa49830e585f2`，[受影响完整回归](https://github.com/king-640-060/fitlog-lite/actions/runs/40871964589)。独立QA分支不发布Pages，不能将QA SHA冒充Application SHA。F最终32调用28PASS/4FAIL：两项横屏几何、两项筛选等待，原始CI为failure。最终结论须核对原始F产物及实际source manifest，不把重跑增加为独立业务覆盖。F两引擎几何的横屏场景因11px祖先偏移失败；最终G仅增加一条限定活动Progress的html scroll-padding规则，消除通用120px焦点预留引起的文档滚动。180/181源文件与F相同、全部TS和服务相同，见[源差异](../design/qa/2026-10-26-interaction-v09/regressions/f-to-g-source.json)。G完整双引擎146/146几何、双引擎功能/手势/边界、Chromium完整65场景统一体验及两引擎触摸分支实际复验通过；不声称F本身全绿或F181文件全部等于G。最终G对应非发布QA提交`902f8cde48686b6781c7bb6bff6e194f0ce2917e`，[完整双引擎十分片CI success](https://github.com/king-640-060/fitlog-lite/actions/runs/40879663483)，十个runner的181/181产品源SHA已逐一匹配最终G。60个引擎/宽度/主题/字号上下文，6种数据状态×3图共1080组实际测量，7→30→90→7的整体及全部9个内部/外部高度字段最大差均为0px，见[原始量测与摘要](../design/qa/2026-10-26-interaction-v09/geometry/trend-height-summary.json)。

实际修复及测试适配：

1. 原生 Sheet 内固定拖拽原点偏 24px：读取真实包含块原点；逐帧跟手误差 ≤3px，取消恢复原节点。
2. Escape 原先触发上级返回：起拖焦点保留把手，由局部处理取消；后台、失去焦点、pointercancel、销毁释放资源。
3. 报告预备 DOM 原先重复旧导航及 ID：在挂载真实图表前移除旧导航，隔离预备 ID/标签引用，晋升同一节点时恢复。
4. 指定食物大字体两步 footer 高度不同：共享状态样式、同一最小高度与换行规则。
5. 横屏原先猜测底栏 reserve 导致外部 4px 滚动；改读实际 app-frame padding。320px/200% 自定义标签裁切，改为真实容器宽度下两列整按钮布局。
6. 后续横屏复验发现 hidden 容器可被 scrollIntoView 程序化滚动，并在短视口把内容挤成 9px。裁剪层改用 clip；按同一实际三级导航尺寸及一个44px触控目标/原 padding 测量所有 Progress 页的共同最小高度。短视口允许原生外层滚动，内部仍各自保存滚动，不能用裁切内容掩盖可达性。
7. 旧驱动等固定时间、过早读取异步周期结果/Sheet 中间帧；现在等真实 route/aria/邻页结束及实际数据节点。营养周期recovery section原本在折叠章内，存在性等待使用attached，不强行要求展开前可见。F另两次筛选首败位于“选择器不存在后立即断言模板存在”，读到了重建中的空容器；改为等待实际目标筛选值、非空正确option及无预备邻页，保留全部业务断言，G双引擎完整十分片复验。
8. 旧“未来日期”固定每月28日，10月28日成为今日，修为设备本地明天；后续变量重名语法失败保留并修正。WebKit 两同级按钮高度相差 0.000015px，测量值统一到0.001px，再保留相同高度断言；没有删掉比较。
9. 原统一体验的纵向原生手势仍断言 window.scrollY，按本轮批准的独立滚动区改为实际最近 deck-scroll，保留 >20px 原生移动要求，并新增起点 >20px。14 个原驱动 696 条原断言中 695 条原表达式保持，1 条只改上述实际滚动所有者，另新增1条；见 [AST审核](../design/qa/2026-10-26-interaction-v09/regressions/assertion-audit.json)。foodWater 另按批准餐次页/把手/显式改餐次适配，营养、事务、历史快照及几何约束保留。

所有 C/D 首败原日志和聚合、后续失败/复验都保留，不能笼统归因为休眠。无服务连接失败单列为本地进程中断，不归为产品回归；重启服务后重测。新增边界测试早期因当天无样本报告而无章节，改为fixture真实固定日期和有事实的周期，未伪造事实。触摸分支另验证Chromium原生CDP touch和WebKit合成touch事件，不将后者称为实体触摸。

## 逐项证据索引

下表的 PASS 仅在链接的对应实际最终结果通过后有效。F 完整结果、线上 X06/X07 与真机边界在最终回执逐行复核，不以本表文字代替运行。测试源在 tests/browser，轻量原始回执与截图在 [证据入口](../design/qa/2026-10-26-interaction-v09/README.md)。

|ID|验证与证据|范围/边界|
|---|---|---|
|D01|interactionV09 / Geometry；diet截图|真实整日模板、4条早餐、名称品牌克数及删除|
|D02|interactionV09Gestures 的 meal-bounce/meal-commit 逐帧图和坐标|真实邻页、指示器、回弹|
|D03|Geometry 的 widths 数组及4餐往返|4/2/1/0，差≤1px|
|D04|interactionV09 cancelSamples/sortSamples、sort Performance|30/75/230px、占位/邻项让位、≤3px|
|D05|interactionV09 保存重开、sort Performance 40项5轮|实际边缘滚动、合法释放顺序|
|D06|interactionV09取消、Edges pointercancel/blur、Lifecycle|原节点原序、零写、原生滚动仲裁|
|D07|foodWaterDayV04、Edges故障注入|增删/克数/显式改餐次、保存失败保留草稿|
|D08|foodWaterDayV04、interactionV09单测、old-client roundtrip|旧combo/缺mode/meal、原始快照、22表|
|D09|Geometry完整矩阵、foodWaterDayV04|320/200、长中文/Latin、≥16px/44px|
|W01|Geometry workout、approvedJointV05/原训练套件|组值/ID/备注、紧凑卡片|
|W02|interactionV09 actionSort、9项单测|整卡跟手，组顺序内容原样|
|W03|Edges blankName/syntheticComposition、原动作库测试|中文合成composition不冒充真实系统IME|
|W04|interactionV09取消/保存、Edges、单测|本次快照名，不改整次名及实际组|
|W05|原动作库/模板浏览器、单测other21 stores|搜索/新建保留，不改Exercise身份和旧历史|
|W06|原训练恢复/历史保护、单测源冲突/回滚、Lifecycle|真实Autosave排空、重复/删除/旧草稿|
|W07|foodWaterDayV04及原训练模板/克隆测试、单测|训练模板自己的源指纹、顺序、事务|
|R01|Gestures calendar-reports逐帧及Functional timeline|报告导航随所属页面进入，无迟加124px|
|R02|Geometry、Gestures、uiQualityAudit|七列日历与独立页高，不借长报告高度|
|R03|Gestures period各帧、Functional timeline|前两层x/y/width/height偏差≤1px|
|R04|Gestures type-commit、jointReportRanges|前层不动，真实周期/模板筛选|
|R05|Functional非相邻点击、Gestures及键盘|各层aria/指示器和主Tab归属|
|R06|Gestures 20轮scrollRestore、Lifecycle 20轮|各自scrollTop、选中和资源稳定|
|R07|Gestures延迟原生getAll完成、真实周期筛选回归|晚到只读结果不能覆盖新选中|
|R08|Gestures双引擎bounce/cancel/commit|实际中间帧和回弹，不只结束帧|
|R09|unifiedExperience真实坐标滚动、原日期/导航门槛|图表/日期轨/控件/边缘优先|
|R10|Geometry完整146上下文、原显示门槛、Edges横屏|四宽/三字号/三外观/两动效及横屏|
|F01|Geometry food-picker、原remaining/portion测试|真实共享Sheet/footer、末行可达|
|F02|Geometry food-preview及返回状态|共享主次/间距/高度、选择不丢|
|F03|原keyboard套件、Geometry200%|合成VisualViewport不冒充实体键盘/Safe Area|
|F04|原portion/v4FoodPlanToday、Geometry全22表|预览/返回零写，真实确认后服务写|
|F05|原portion/remaining、相关单测/浏览器|重复确认、旧目标/食物变化、回滚|
|X01|INTERACTION_V09 有限审计表|习惯/Task不同业务保留，不扩大改造|
|X02|原管理/导航/日期/Sheet全部保留门槛|局部归属、预备节点晋升和清理|
|X03|Lifecycle每引擎20整轮、原资源压力套件|真实window/document监听计数、RAF/Interval/ghost|
|X04|Performance两trace与原始SHA/汇总|报告与40项排序，不关动画逃避测量|
|X05|键盘重排/Enter/Escape/焦点、Geometry|浏览器部分PASS；VoiceOver **Pending**|
|X06|9项数据单测、old-client往返、同profile/升级/离线|正式同profile结果仅由发布后实测确认|
|X07|npm/完整适用门槛、Application/END CI和正式资源|最终状态见LATEST及十项回执，不预写成功|
|X08|实体Safari/原安装PWA/系统键盘/返回/VoiceOver|**Pending**，本轮无实体设备证据|

## 视觉与数据证据

原型初次8上下文实际运行；又以两引擎×四宽×三字号运行24上下文、120张同视口原图。原型固定px字号采用仅浏览器内computed-font放大，不改原文件；这不是实体系统字体设置。修改前为冻结START本地实际构建，不能称旧生产照片；修改后为最终源实际页面，Classic浅/深与Native各双引擎，5场景共30张最终原图。原型/前后均保留独立原件与computed style，不拿不同演示数据作逐像素比较。保留模板名称/说明/可选目标、全部真实组备注及显式餐次调整入口；这些真实业务能力优先于演示原型省略项。生产截图须在发布后独立取证。

Chrome阶段trace：报告 RunTask最大17.728ms、Layout4.869ms、RAF3.392ms；40项食物5轮拖拽 RunTask11.999ms、Layout2.189ms、RAF7.758ms，本次样本无>50ms任务。阶段trace不能伪称所有最终环境都已测量。最终F另实际采样：报告RunTask17.695ms、Layout3.381ms、RAF3.481ms；40项排序5轮RunTask9.253ms、Layout2.073ms、RAF5.467ms，两个样本均无>50ms任务；[最终trace摘要及原始SHA](../design/qa/2026-10-26-interaction-v09/performance/final-f.json)。

库名fitlog-lite-db、Dexie13/IDB130/22表、Backup14/Restore1–14/Sync1不变。旧客户端真实Restore/Export → 新版本次快照改名 → Backup14/加密Sync1 → 旧版Restore/Export，双引擎全22表精确往返。冻结schema/fixture、Backup/Sync/报告分析/区间删除/计划服务字节不变；源码保护报告和181源SHA可复核。

既有专用合成profile的START实际HTTPS App=activeSW=8dac27a，离线冷启动通过。22表摘要 `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置摘要 `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`；发布后必须用同一profile复测，不reset/reseed/Restore。

实体iPhone、原安装PWA、真实IME/键盘/Safe Area、VoiceOver、个人数据连续性、真实Provider及ChatGPT独立核查均Pending。WebKit旧饮水Undo−128px未在本轮解决，不将某次零偏移样本当作已修复。

最终G实际报告手势trace：RunTask最大20.287ms、Layout3.605ms、RAF3.033ms，无>50ms任务。原始JSON压缩归档及解压SHA见[最终G性能证据](../design/qa/2026-10-26-interaction-v09/performance/final-g.json)。排序F样本对应完全未改的排序代码及非Progress样式，不伪称重新运行的G排序样本。

最终G主导航另完整52/52显示上下文、444个预备→active边界、两引擎各100切换资源/数据/迟到原生读取检查通过。动作名称Sheet另双引擎×390/100浅色、320/200深色、430/140 Native共6上下文；保留空名、composition中途、保存后真实快照及横屏的原图/trace，输入和操作区计算样式通过。排序补齐Chromium原生CDP touch与WebKit pointer的起点/30px/跨两行/释放原图、实际clientY/row top/占位索引及零写比较。

完整覆盖对账为[85份suite-call记录](../design/qa/2026-10-26-interaction-v09/regressions/effective-coverage.json)，不是85个独立产品功能或一次全绿CI。保留D未受影响既有门槛、F受影响全量门槛与G完整/定向复验的具体来源，原首败不删除。G主导航52/444/双100、几何146、统一体验65、新专项及完整三图60上下文的实际原件可单独核对。
