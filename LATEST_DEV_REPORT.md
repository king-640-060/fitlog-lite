# FitLog Lite Development Report — 2026-10-16

## 最新验证状态

F1–F5已实施、自动化验证并正式发布：精确重量输入与独立g、组合/整日模板逐项餐次、等权500/1000ml与低强调自定义、十类73px标准双列及独立展开事实、无引用营养模板事务永久删除与历史引用保护。既有A–D、B1–B9和35个旧browser suites全部保留。实体设备与ChatGPT/用户独立验收仍Pending。

- main；START_COMMIT `e082689dce56f7fcdfd055c4709b93fafafd7819`，起点干净，pull --ff-only且与远程一致。
- Application Commit `79c570be9cc7ef6b05d74a7ed070fabd7cc950d4`，94个任务文件。
- Application Actions / Pages：[38847590284](https://github.com/king-640-060/fitlog-lite/actions/runs/38847590284)，Type check/Test/Build/Deploy实际success。
- 正式地址 https://king-640-060.github.io/fitlog-lite/ 。线上两引擎各20组F1–F5完整流程，以及两引擎真实Backup UI验证均PASS；都是隔离合成数据，不能冒充个人数据/实体Safari。
- END_COMMIT是包含本报告的提交，且只修改本文件。最终END CI、资源、App/SW、同档案与离线复核记录在本轮正式十项回执及证据包；不拿Application run替代END run，不预先宣称尚未发生的END CI成功。
- 普通HTTPS push首次HTTP2 framing error；单次 `git -c http.version=HTTP/1.1 push origin main`正常非强制推送成功，未改全局配置、未强推、未覆盖别人提交。

## 数据与业务合同

Dexie13 / IndexedDB130 /22stores不变，未改索引/迁移或重写旧行。导出Backup14，Restore1–14，Sync/envelope1；AIConfig1/Voice1/WaterReference1/Appearance1仍设备独立且排除业务Backup/Sync。旧客户端的模板normalizer会丢mode/meal，因此新导出用14阻止静默降级；真实e082客户端已实测拒绝14、原数据不变。冻结V7–V13共14文件与START Git对象逐字节一致，新approvedFoodWaterBackupV14为22表餐次样本。

DietTemplate可选mode combo/day，items可选合法MealType；缺字段的旧模板仍原组合/未分类，不自动归早餐。编辑/复制/按当天实际记录保存、预览/应用/周期、Backup/Restore/Sync全链路保留餐次、顺序、精确克数、fallback和可选营养目标。整日模板按四餐次组织，向上/下只交换同餐次相邻项目并保存重开保序，独立选择框切换餐次，旧组合仍平面重排，旧未分类独立保留。保存计划不生成摄入；确认日期/餐次和实际吃下后才原子追加；未来拒写，目标保留/替换和模板/食物/目标来源指纹在事务复核。Food当前来源仍按原合同解析，删除后用合法fallback，未知宏量不补零；坏fallback不能写NaN。编辑/删除模板不改历史FoodLog。

营养模板删除扫描templates/variants/phases/targets/cycles/cycleDays六表；阶段、每日目标strategySelection/cycleSelection（template/variant/phase）、周期模板、排程日nutrition及所属周期均保护。定义/变体/引用完整指纹在写锁内重查，owned variants与定义一起删除；两连接变化、失败回滚保护所有历史。管理行直接显示删除/当前使用/保留历史及查看入口；归档为普通确认并保留事实，永久删除危险确认列实际名称/数量。饮食模板管理删除沿用原历史保护。

默认新增100g保留。原输入82px、实际右padding13px与绝对定位g复现挤压；新单位独立流式列，放大换行；0.25/125.5/999.99输入/预览不被通用显示舍入，保存与快照精度保留。Today/Trend两枚饮水按钮同权，正整数自定义、忙碌防重、失败不累加、原精确ID Undo/编辑/删除和参考值仍分离。

Calendar十类概览铺满原内容区，两列标准73px；320/375/390/430卡宽138/165.5/173/193px。0/1/11/100正常记录几何稳定，长数字/200%可增长。原生summary位置不因展开改变，完整实际/目标/全部快照在网格后，概览无冗余已保存目标。保留完整访问、liveQuery、十类精确删除和快捷录入。

## 本轮自动化与原型证据

- typecheck PASS；npm test PASS：969 tests /72files（旧927保留+42）；Pages base干净构建PASS，local:false，只有既有chunk-size advisory；diff --check PASS。
- 所有35个既有browser suites，含approvedJointV05双引擎，共36条完整命令最终PASS；uiQualityAudit完整矩阵；本轮新foodWaterDayV04两引擎各20组（四宽+844横屏×100/200%×深浅）PASS；foodWaterBackupV04两引擎PASS。新旧共37个独立suite/40条命令，未smoke/skip。
- Restore1–14、冻结V13/Backup14重开、加密Sync1、恶意meal/mode/重复ID、精确小数、目标冲突、未来、缺失源、来源变化、六表引用/两连接/删除和22表Restore失败回滚PASS。
- 真实生成SW测试：V7与START V13→Application，通过等待worker、图片/草稿/提案/其他client保护、取消、明确确认只重载一次、15原行/14旧表/设备AI配置保留、离线冷启与深色偏好。浏览器证据不等于实体PWA。
- 批准包16项manifest全部匹配；HTML SHA256 `856de7f201b630572c8eedadfd4b4e299700d153894f9ee2fd99b4663e5c81a3`。提供物为展开目录，原样归档到design/reference/2026-10-15-food-water-v0.4；未捏造输入ZIP hash，title遗留v0.2原字节保留。
- 实际运行批准HTML两引擎四宽深浅16组，另80张运行时200%/横屏原图；候选292对匹配原图，仓库保留10对390px。正式原图与SHA/DOM/全部命令和失败日志在外部证据包，详见docs/FOOD_WATER_DAY_V04_QA.md。

早期未用import、旧摘要/250ml总量断言和浮点乘法顺序已纠正，原数据断言保留；修复饮水按钮继承min-width导致放大横溢、重量展示舍入、展开卡移位和模板源fallback兼容。一次dist重建短暂404在资源稳定后完整重跑；WebKit73.00003几何测量用0.1px容差，数据/引用断言未降级。多次既有WebKit媒体模拟未切换（MQL仍旧值），独立诊断正常，原完整17组低并发重跑PASS；一轮uiQualityAudit等待Vision评审页超时后，原完整审计低并发重跑PASS；未改产品主题逻辑或原断言，驱动触发条件尚未定位。交付前补修餐次内重排并新增3项单测；浏览器保存重开强断言首次因编辑器未挂载读到空列表，补等待后完整重跑。失败均保留。

生产必要差异：保留现有native Sheet/语义tokens/16px输入和44px目标、完整多行历史、真实日期/记录；不复制原型演示导航/数据/状态栏；四餐次移动与真实确认有实际控件。大字允许增长而非原型固定73px省略。详见批准合同和原图，不宣称像素完全相同。

## Application 正式资源与同档案核验

productionAssets实际PASS：{"build": "79c570be9cc7ef6b05d74a7ed070fabd7cc950d4", "assets": [{"file": "index-LHivBYUA.js", "bytes": 942506, "sha256": "53ae306af4ee39a316afce9ef820f7dae572b0a6190c534ec3ad80219c3b5dfa"}, {"file": "index-B5XslnSD.css", "bytes": 171028, "sha256": "2fa87b90b3695490ad1a9d56f4af08294571c9aa40cb69b568bc582d5a48ecda"}], "swPrecacheMatches": true, "swExactBytes": true, "mainViews": 5, "aiSettings": true, "githubSyncEntry": true, "errors": []}

此前已有专用合成profile不清空、不重建、不重新播种，全22表25rows hash `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`；全部fitlog设备配置8项hash `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`，均与START相同。App/SW均Application SHA，离线冷启PASS。END推送后再重复最终资源/同档案/offline验证并在外部十项回执给出真实END证据。

## 文档与Pending

新增FOOD_WATER_DAY_V04及QA、批准原包、Backup14冻结样本、两引擎UI/Backup与旧profile脚本；更新相关UI/交互/数据/周期/恢复合同和AGENTS必要入口。CHAT_CODEX_WORKFLOW长期规则不改。

实体iPhone Safari、原主屏幕PWA、真实键盘/Safe Area/VoiceOver、个人设备旧数据连续性：Pending；浏览器/CI/Pages不等于实体或用户验收。真实AI/Voice Provider/麦克风仍此前独立Pending，本轮不用真实密钥测试。最后回执、完整矩阵、原始日志/原图/文件清单和可校验ZIP在本聊天outputs/food-water-v04；交回ChatGPT独立验收后由用户最终确认。完成F1–F5后不继续未批准功能。

## ChatGPT Baseline

START e082689；Application79c570be；END为本报告提交。F1–F5完成且Application CI/Pages/实际线上回归/资产/同档案/offline通过，最终END证据需读外部回执。DB13/130/22不变，Backup14/Restore1–14/Sync1；旧组合未分类语义、四餐次/精确克数/fallback/目标和原A–D/B1–B9保留。969/72；旧35 suites完整+新UI/Backup双引擎；营养硬删六表引用与来源保护，归档保留历史。原型SHA856de7...归档不改字节。真机、个人设备连续性与ChatGPT/用户独立验收Pending。
