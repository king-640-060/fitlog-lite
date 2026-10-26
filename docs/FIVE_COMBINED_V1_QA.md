# 五项联合改造 v1：本轮验证记录

2026-10-25 开始、2026-10-26 完成开发与自动化归集，Asia/Shanghai；批准输入及起点见[设计基准](../design/reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md)，实现见[合同](FIVE_COMBINED_V1.md)。最终自动化门槛已补齐并冻结实际证据；本文件归档时Application/END正式提交与发布核验仍Pending，后续实际发布状态以LATEST和正式回执为准。以下保留历史失败，不改写为一次全绿。

## 输入与实际环境

- ZIP SHA256：`ae0dcbb25b80916c1e9742356c5dcf1fb567a74b3c7594b4fec54e4d6aae6e98`；7成员CRC、SHA清单6/6匹配，原始文件完整冻结。
- 唯一批准v1 HTML已在Chromium/WebKit ×320/375/390/430实际运行，共8个隔离上下文，五Tab、名称、模板同步、两主题和原生时间值均执行。包内32项旧演示检查仅为输入资料，不算生产测试。
- Node24.16.0、Chromium151.0.7922.34、WebKit26.5。所有写操作仅新建隔离合成上下文或既有专用合成QA profile，未读取或修改个人健康数据、真实Key或真实Provider。
- 起点与冻结旧客户端为`68f4747994fd84bd2ef965c93ee3b009a3b52b72`；Classic精确视觉基准为`7110564631b6e40f59485cb1a12543ea59b3a2df`。候选build记录完整source/resource SHA，实际await build成功、确认源未变后复制dist；本地build的local标识不当作正式发布身份。

## 已实际通过的验证

|检查|本轮实际结果|边界|
|---|---|---|
|TypeScript|`npm run typecheck` PASS|tsc --noEmit|
|完整单元测试|`npm test -- --maxWorkers=4`：79文件1190/1190 PASS|原78文件1143不改，新增47；不是浏览器或真机数量|
|生产构建|`GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build` PASS|发布仍需clean commit重建与线上比对|
|原型实际运行|双引擎8上下文PASS|独立演示不写业务数据|
|短名称兼容|双引擎2组PASS|真实冻结旧客户端Restore→Export/Autosave→新Restore→加密Sync1|
|3200字符旧名称兼容|双引擎2组PASS|全22表完整比较；不以新手工输入限制截断旧模板快照|
|睡眠时钟服务|12上下文84场景PASS|NY/Paris DST、跨年、凌晨0–5:59/6:00、手动归属；en-US/en-GB是浏览器locale，不是iPhone系统12/24小时设置|
|源码与冻结保护|PASS|原17冻结输入、78旧单测、691旧设计文件不改，最终修复后158旧src/41服务完整相同，数据库schema不改|

以下为日期保持兼容修复前的历史结果，产品源为临时QA提交`2ab91597b41cef204cddf669db5862f5d30f0455`，全部src与index/vite/package/lock共182文件SHA与本地stable build逐一相同。后续定位到下文DOM重复移动缺陷，最终源已重新冻结为`fb9f49a867e2be68226f74aa05ecfed7233ab6b2`并重跑全部77调用，历史PASS不能替代新源验证。

- [完整远程76项](https://github.com/king-640-060/fitlog-lite/actions/runs/40250994923)：**73 PASS / 3 FAIL**，整次CI是failure，不能称为全绿。原44+14、本轮8专项共66调用，加完整Joint矩阵10宽度/引擎分片。失败为dailyRecordsExperience、foodRecovery、macroNutritionSummary，原日志和SHA保留。
- 同182文件SHA本地`stable`完整复验：Food/Recovery **35/35**、宏量营养 **40/40**、每日记录 **65/65**（含20次实际压力往返）、WebKit饮水级联 **30/30**，全部exit0。不是smoke，也没有启用宽度筛选；未删除原断言。原模拟时钟会随长测试前进，实际负对照456分钟变458分钟，固定Date仅冻结业务日期，原生timer/rAF保持运行；Calendar等待当天格子脱离outside-month再点击。
- 采用远程73通过与本地三完整复验补齐的**有效76调用覆盖**，不是单次76/76 CI。额外WebKit完整复验不重复扩大数量。远程固定Date重跑仍出现Food选定日期/宏量更新等待失败，不能假称每个远程失败已被时钟修复；旧正式版与当前候选只读对照诊断另行记录。
- 新五项空库**74/74**、历史合成数据**74/74**（各2功能流+72显示上下文）、主题显式策略**8/8**、原始历史保护+命名/模板Sheet**74/74**、既有Light Native **52/52**、Management默认与Classic各**52/52**均在2ab历史源远程完整通过。历史合成fixture不等于当前Today有记录；后者由原LightNative套件另有覆盖。
- 三图完整矩阵：2引擎×5宽320/375/390/430/844×明暗×100/140/200，**60/60**；每组6状态、每状态3图、每图7/30/90，**1080组实际高度量测**。每个runner因单宽筛选标diagnostic，归集已验证60个组合无缺失；另两次旧Joint one-context诊断不当作完整矩阵。原始heights值随证据归档。

## 视觉核对与必要差异

最新冻结候选在390/100下实际截图：双引擎×Classic浅/深与Native×空/有记录，共12对，五Tab及管理中心均包含before/after。15个palette变量以及存在的代表控件颜色/背景/圆角/边框/阴影/字号与对应冻结基准逐项相同。已目视检查三种外观的今日/训练/进度拼图；删除重复教学后真实卡片缩回，三图不以删除绘图区换取紧凑。Classic精确颜色优先于演示近似色。

旧版本本地冻结截图不能称为旧正式站截图；本轮正式截图尚待Application发布后获取。日期/星期以完整片段换行；真实动作、起止时刻、日志/来源与安全说明仍可访问。新模板勾选使用20px原生checkbox与>=44px label，200%时完整语句均衡换行。原生time输入>=16px/44px，系统picker内部皮肤不承诺逐像素染色。

## 实际失败、修复与复测原则

- 历史名称专项的旧候选负对照真实FAIL：只命名后后台/退出触发强制全量Autosave，旧日志首尾空白及未知set字段被归一化丢失。产品改为只排空真实待保存编辑；名称专用事务只写name/updatedAt。双引擎开发流复测PASS；最终冻结完整专项74/74已通过。
- 主题负对照真实FAIL：隐式Classic已勾选，点击同一radio没有change而未固定显式选择。新增click/change去重与Classic旧模式动作固定选择；双引擎8组开发复测PASS，最终冻结策略8/8已通过。
- 200%模板同步短句出现单字孤行，已通过原生checkbox独立布局、清除共用数字后缀padding及均衡文本换行修复；保留原图及双引擎复测。
- 原有测试驱动只适配实际过渡完成、异步保存/跨页刷新就绪和本轮批准的Classic模式设置。所有原业务/结构assert保持逐字一致，唯一呈现assert由Native浅色meta恢复到冻结Classic `#f5f2eb`。独立motion套件仍量测运动本身，不用静态等待绕过动画要求。
- 最终回归出现多项locator稳定性超时。系统日志同期多次Sleep/DarkWake；诊断中Node已超时10秒，页面performance/动画仅经过约1秒。已保留原始失败和电源事件，保持唤醒后应完整复跑；不能把休眠关联推测为每个失败的确定原因，也不能直接改为PASS。
- 冻结候选实际发现今日新增训练名称的长英文撑宽卡片，现仅为`[data-today-workout-names]`增加`overflow-wrap:anywhere`；320px长名称实页重新测量卡片288px、内部无越界。其后本地LightNative前22上下文通过，整套因40分钟环境超时终止，不能记完整52PASS。
- 为绕过本机合盖休眠，使用临时非发布QA分支运行隔离macOS runner；未改变main或Pages。[首次完整66项](https://github.com/king-640-060/fitlog-lite/actions/runs/40223821878)实际60PASS/6FAIL，产物及所有失败保留。失败为AI初次网络就绪超时、Food/宏观营养旧驱动取样早于真实刷新、原趋势边界取样、原减少动态导航时序，以及320px/200%“剩余目标”单字孤行。最后一项已用标题均衡换行修复；驱动仅补充真实源/路由就绪，原assert不降低。不能把此60/66称为交付通过。
- [第二次完整66项](https://github.com/king-640-060/fitlog-lite/actions/runs/40244745123)候选`3ef390f4af8fe45f328ed6c1e49e008b27331d68`实际62PASS/4FAIL，非最终发布源。后续最后的目标短句均衡换行和空餐重复0项文案也已纳入最终2ab源码；临时QA workflow/旧基线资产不进入main。
- 320px/200%正式START实页的“未设置目标”出现“未设置目 / 标”已实际截图；正式实现用text-wrap:balance保留完整字号和目标语义。空餐仅移除重复0项计数，kcal、未记录和真实记录入口保留。本地双引擎通过；Application/END实际正式站复验仍须在部署后取得。

## 数据与部署门槛

`fitlog-lite-db`、Dexie13/IDB130/22、Backup14/Restore1–14、Sync/envelope1保持。可选name是独立快照；旧客户端完整对象通路保留新字段。名称、模板事务检查source fingerprint/repeat ID，失败零部分写；未完成训练与模板快照并发也在事务中重查。原food/nutrition/report/range-delete/plan/恢复服务及其断言不扩大。

同一个既有专用合成Chrome profile已取得START基线，未reset/reseed/Restore。22表hash `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`；8配置hash `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。Application与END仍需分别取得真实App=activeSW=该SHA、HTTP资源SHA、离线冷启动和上述摘要不变的证据。START成功不能代替新版本成功。

## Pending

尚未完成的最终自动化/CI/Pages不能记为PASS。实体iPhone Safari、原安装PWA、真实键盘/原生滚轮/系统12或24小时设置、Safe Area、VoiceOver、个人历史数据连续性、真实Provider及ChatGPT独立核查继续Pending。旧WebKit饮水Undo−128px不冒充本轮已解决；此前已结案任务不重开。


## Final source after native-scroll compatibility repair

A valid local full-Chromium control loaded frozen START68 and the2ab candidate; both reproduce Sep24 selection after the rail briefly resets to scrollLeft0 on DOM reinsertion. Earlier remote baseline load failures were invalid controls, never evidence of equivalence. Actual loaded-page traces, screenshots and facts are retained. horizontalNavigation now skips append when the prepared page is already a stage child. No new date listener/timer/controller or business semantics.

foodNavigationPreservation fails on frozen START; all6 fixed contexts pass across3 runtimes and2 fonts with18 measurements per context and all22 stores unchanged. Existing full-Chromium macro/Food/daily suites and all77 remote gates are being rerun on this newly frozen source. Publication remains Pending. Previous2ab PASS results cannot be relabelled as final-source PASS.

## 最终自动化门槛归档（2026-10-26）

最终产品源 `fb9f49a867e2be68226f74aa05ecfed7233ab6b2`；21个产品/构建文件变化。全部182个产品/构建/依赖文件与本地adoption构建、两次测试驱动复验候选及当前工作区SHA逐一相同，原断言AST核对通过。原17冻结输入、78旧单测、691旧设计文件未改；158旧src/41服务与START逐字相同，DB schema未改。

|实际执行|结果与身份|
|---|---|
|完整77调用|[原始CI](https://github.com/king-640-060/fitlog-lite/actions/runs/40259901467)实际75 PASS / 2 FAIL，18分片全部结束；整次CI为failure，不能声称77/77全绿|
|AI流式完整4宽复验|[实际success](https://github.com/king-640-060/fitlog-lite/actions/runs/40264645142)，仅模拟流驱动等待实际工具首片段，替代固定250ms假设；工具完整前不得执行、完成后精确一次续请求及所有原断言保留；AI产品代码未改|
|每日记录完整65上下文复验|[实际success](https://github.com/king-640-060/fitlog-lite/actions/runs/40265113049)，仅等真实Sheet/Toast有限动画完成后量测键盘几何，替代40ms猜测；保留不重叠、top-layer、草稿和全部原断言，不放宽容差；含20次实际压力往返|
|有效完整覆盖|75个原始PASS + 两套完整驱动复验，补齐77调用有效PASS；这是跨运行归集，不是单次全绿CI，重复不扩大唯一案例数量|
|原生滚动保持|3运行方式×2字体6/6；旧正式版真实负对照FAIL，修复版PASS；不重新移动已挂载预备DOM，22表只读一致|
|三图完整矩阵|最终源60/60，1080组实际高度，7→30→90→7全部内部/外部高度最大差 **0px**；每片单宽筛选标记保留，完整并集已验证|
|新五项矩阵|空库74/74、历史合成库74/74、主题策略8/8、历史原始字段与命名/模板Sheet74/74；既有LightNative52/52、Management默认52/52、Classic52/52|
|本地完整Chromium|最终源Food35/35、宏量营养40/40、每日记录65/65及20压力往返；AI4/4、新动画就绪驱动65/65亦完整通过。原driver远程失败照实保留|
|编译/单元/构建|最终源typecheck、79文件1190/1190、生产build全部PASS；原1143单测不改，新增47|

最终证据见[冻结证据目录](../design/qa/2026-10-25-five-combined-v1/README.md)：每个driver SHA、失败和复验链接、182文件一致性、完整高度原值、源/资源SHA、截图和原始日志均可核查。临时QA workflow与旧基线支持资产不会进入正式main。Application与END必须另行取得实际CI/Pages、全部HTTP资源、App=active SW、离线冷启动及同一专用合成profile数据/配置摘要，当前自动化通过不替代发布或实体iPhone验收。

### 首次正式发布后的升级驱动入口修订

Application `d27ca90c62809b769456a6546275b08e0fa8f0d4` 的CI/Pages成功，15个正式静态文件HTTP SHA与clean build完全相同，同一专用合成档案App=active SW、离线冷启动及数据/配置摘要不变。旧PWA升级harness第一次在直接选择深色时FAIL：新版默认Native会隐藏Classic明暗组。仅在原测试中通过实际UI先选Classic，再执行原深色/离线/数据断言；完整V7旧客户端及START提示式客户端两组复验PASS，所有原assert逐字不变，产品代码无修改。这次测试/文档修订单独提交并另行CI，最终END仍仅更新LATEST，不隐去额外提交或首次失败。正式站截图与computed style已完成12对双引擎对照，不能把本地升级harness称为实体PWA验收。
