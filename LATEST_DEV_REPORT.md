# FitLog Lite Development Report — 五项联合改造 v1

2026-10-26，Asia/Shanghai。五项生产实现、完整必要自动化和Application正式环境验证已完成；实体iPhone与ChatGPT独立核查仍Pending。本文件为独立END报告提交，仅修改本文件。自身END SHA、对应CI及最终Pages/App/active SW/离线结果须由提交后的实际验证和十项正式回执确认，不预写未来成功。

## Git、批准输入与范围

- START：`68f4747994fd84bd2ef965c93ee3b009a3b52b72`；实施与提交前fresh fetch确认main，保护其他修改，全部正常非强制推送。
- 产品Application：[d27ca90c62809b769456a6546275b08e0fa8f0d4](https://github.com/king-640-060/fitlog-lite/commit/d27ca90c62809b769456a6546275b08e0fa8f0d4)；[CI/Pages success](https://github.com/king-640-060/fitlog-lite/actions/runs/40267200483)。21个产品/构建文件变化，另有必要测试、文档、批准原件与可核查证据。
- 测试入口修订：[6f20141918fb199c8b07b1b138de15f45d3406ea](https://github.com/king-640-060/fitlog-lite/commit/6f20141918fb199c8b07b1b138de15f45d3406ea)；[额外CI/Pages success](https://github.com/king-640-060/fitlog-lite/actions/runs/40268000562)。仅PWA升级测试先通过真实UI选择Classic及QA说明，产品源码未改。它是额外实际提交/CI，不隐藏为只有两次提交。
- [正式站](https://king-640-060.github.io/fitlog-lite/) · [批准原件与SHA](design/reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md) · [实现合同](docs/FIVE_COMBINED_V1.md) · [完整QA和首败/复验](docs/FIVE_COMBINED_V1_QA.md) · [冻结证据](design/qa/2026-10-25-five-combined-v1/README.md)。
- ZIP SHA256 `ae0dcbb25b80916c1e9742356c5dcf1fb567a74b3c7594b4fec54e4d6aae6e98`；7成员CRC、6/6 SHA匹配。唯一v1 HTML SHA256 `ebceb18d35a6e1c16fa4d2bdd02cba528ab289aec6826bf1dfa6bc8d65240176`。双引擎×4宽实际运行8上下文；包内32项演示检查不当作生产测试。原型及基准未改。

## 实现与保留语义

A：63个UI源文件1325个中文节点静态筛查与41项实际文案决策分开记录，见[文案审核](docs/FIVE_COMBINED_V1_COPY_AUDIT.md)。只去掉已审计的重复介绍/空态计数，缩回实际空间；未知、风险、单位、真实日期、估算/实际边界、隐私和删除/恢复警示保留。日期/星期完整语义块换行；静态目标短句均衡排版，空餐保留kcal、未记录与真实记录入口。

B/C：可选`Workout.name`是独立快照；手工名称上限2000，旧3200字符模板快照不截断或拒绝。名称专用事务只改name/updatedAt，保留原始set/RPE/日志/未知字段；关闭/后台只排空真实待保存编辑，不强制归一化历史。现有Autosave排空、完整source fingerprint、删除源/重复操作/并发守卫及模板+可选未命名同步两表原子回滚已验证。自由训练沿用真实服务，一个实际动作及有效组即可完成，不要求模板。模板改名/删除不追溯改名历史。

D：仅Classic与Light Native，两主题使用独立设备偏好键，旧system/light/dark不改写；缺新键保持旧升级行为直到显式选择。Classic精确palette来自`7110564631b6e40f59485cb1a12543ea59b3a2df`，Native来自START。初始head与运行时策略一致；切换保留页面/工作区节点和草稿，不写业务表。兼容态已勾选radio再次点击也固定显式选择。

E：复用原生`type=time`、日期子页、共享Sheet/VisualViewport与真实睡眠服务；>=16px/44px，不手搓滚轮或新建键盘控制器。凌晨/跨午夜/跨年/DST/手动夜晚归属不改。

发布回归另在真实冻结旧版与候选中定位到重复append已挂载预备DOM造成完整Chromium原生日期条归零、错选日期。只在节点尚非stage子节点时插入；不增加日期重置、监听器或计时兜底，保留节点、激活/取消/清理及245ms动效。旧版负对照FAIL、新回归6/6 PASS；不是重开旧视觉闪帧项目。

## 实际自动化

本地Node24.16.0、Chromium151.0.7922.34、WebKit26.5；远程独立macOS runner及浏览器版本见各原始产物。仅新隔离合成上下文、假Provider及既有专用合成profile，无个人健康数据或真实Key操作。

- `npm ci`、typecheck、79文件1190/1190单测、生产build PASS；原78文件1143单测不改，新增47。DB schema、依赖/lock不变。
- 最终182个产品/构建/依赖文件SHA与冻结QA源、两次驱动复验及Application逐一相同。原17冻结输入、691旧设计文件不改，158旧src/41服务逐字相同。原业务/结构assert AST不改，唯一旧呈现预期恢复批准Classic meta颜色。
- [完整77调用](https://github.com/king-640-060/fitlog-lite/actions/runs/40259901467)实际75PASS/2FAIL，原始CI为failure；[AI流式完整4宽复验](https://github.com/king-640-060/fitlog-lite/actions/runs/40264645142)和[每日记录完整65上下文复验](https://github.com/king-640-060/fitlog-lite/actions/runs/40265113049)均success。驱动分别等模拟流真实首片段及Sheet/Toast有限动画完成，替代固定250/40ms假设，原严格断言保留。补齐有效77调用覆盖，不能声称单次77/77全绿，重复不扩大唯一数量。
- 新五项空库74/74、历史合成库74/74（各2功能流+72显示上下文）、主题策略8/8、历史字段及名称/模板Sheet74/74；既有LightNative52/52、Management默认52/52、Classic52/52。历史fixture不等于当前Today有记录，后者由原LightNative套件另验。
- 三图2引擎×5宽×明暗×3字体共60/60，6状态×3图共1080组实际高度量测，7→30→90→7所有内部/外部高度最大差0px。单宽runner的diagnostic标记及完整并集证明均保留。
- 完整Chromium最终源Food35/35、宏量营养40/40、每日记录65/65及20压力往返；原生日期保持三运行方式×两字体6/6。短名与3200字符名各双引擎，真实旧客户端Restore/Export/Autosave→新Restore/加密Sync1，22表完整比较PASS。睡眠时钟12上下文84场景PASS，locale不冒充真实系统12/24小时设置。

原休眠/DarkWake、长标题溢出、静态目标孤字、旧强制Autosave、隐式主题radio、日期条重复DOM移动，以及所有测试时序首败/复验均保留，不能笼统归因为休眠。原始日志work不改；Git证据阅读副本仅去行尾空白，同名.gz及RAW_LOG_COPIES保存原字节/SHA。Markdown本地链接、修改范围及git diff --check实际通过。

## 实际正式环境与视觉

当前已验证版本`6f20141918fb199c8b07b1b138de15f45d3406ea`，clean build `local=false`、base=/fitlog-lite/。11项发布检查全部PASS：10项真实HTTPS（精确资源、同profile、两套Management、双引擎功能、主题、原始历史、UI总审计268状态、恢复筛选、导航闪帧）及1项本地V7/真实START升级harness。harness第一次旧深色入口FAIL，补齐Classic选择后两组完整PASS，未改产品/原断言；不能把它当成原安装iPhone实测。

正式HTML、JS/CSS、manifest、图标、SW标记等全部15静态文件逐一HTTP字节/SHA匹配clean build，安装identity/start_url/scope保持。相同既有专用合成Chrome profile未reset/reseed/Restore：App=active SW=6f20141、离线冷启动PASS；22表摘要`049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置摘要`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`与START/首个Application完全相同。END还须按最终SHA复验。

首次Application d27的双引擎×Classic浅/深及Native×空/历史fixture共12对正式站after与本地冻结before截图，五Tab及Hub均覆盖；15个palette token与代表控件颜色/背景/字体/边框/圆角/阴影精确相同。已实际查看三种外观的今日/训练/进度前后拼图，重复文案消失、实际空间缩回，图形绘图区未被删小。旧本地截图不称为旧正式站照片；另有真实旧HTTPS320px/200%目标孤字before和实际Application after。实际训练命名/模板勾选/时间表单截图另存。跨主题过渡中的瞬时截图不当作静态可读性证明；原生time六种引擎/主题稳定组合（含跨标签页切换）另测，12字段值保留、>=16px/44px、最低对比度11.436:1。系统picker皮肤仍待实体设备。

## 数据、文档与Pending

`fitlog-lite-db`、Dexie13/IDB130/22、Backup14/Restore1–14、Sync/envelope1保持；无清库、数据库改名、历史重算或自动同步。三图、两类专业报告、营养模板区间级联删除/回滚、计划、训练计时及AI/Voice权限合同保留。真实Provider未执行。

已更新AGENTS、UI_INTERACTION_SPEC、UI_QA_MATRIX、DATA_PRESERVATION、五项合同/文案审核/QA、browser README及批准原件/冻结证据。完整实际CI/日志、原始FAIL与复验、所有文件清单、源码保护、正式图片/computed style及App/END最终身份放在`outputs/five-combined-v1`正式十项回执与SHA证据包；work目录保留大图和全部中间证据。

实体iPhone Safari、原安装PWA、真实IME/键盘/原生时间picker/系统12或24小时设置、Safe Area、VoiceOver、个人历史连续性、真实Provider及ChatGPT独立核查均Pending。WebKit旧饮水Undo−128px没有在本轮解决或结案，不将本轮零偏移样本当作旧问题已修复。

ChatGPT Baseline：先读AGENTS、本报告、协作流程和五项合同/QA，再核对实际main/本报告END及其CI。开发与授权发布完成后停止，等待独立核查，不提前做新设计或其他开发。
