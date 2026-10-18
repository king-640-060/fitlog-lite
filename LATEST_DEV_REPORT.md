# FitLog Lite Development Report — 联合 UX / 报告 / 范围删除 v0.3

日期：2026-10-18。已完成批准范围开发、全量单测、既有浏览器回归及 Application 正式部署验证。实体设备与独立验收保持 Pending。本文件是 Application 验证后的报告专用提交；自身 END SHA/CI/线上身份只能在提交后实测，最终准确值见本轮十项交付回执，不预先宣称自身 CI 已成功。

## Git 与正式状态

- START：`9423586813e2c65a2f2d7126b82acb70bbe02100`，起点干净 main 与 fresh origin/main 一致；提交前再次 fetch，未覆盖其他提交。
- Application：[`d2a5abebc0991e944cb8bcfb4c79759bad4b0a15`](https://github.com/king-640-060/fitlog-lite/commit/d2a5abebc0991e944cb8bcfb4c79759bad4b0a15)，正常非强制推送 main。
- [Application CI / Pages](https://github.com/king-640-060/fitlog-lite/actions/runs/39096866484)：success，包含 typecheck、1081 单测、production build、Pages deploy。发布地址：[FitLog Lite](https://king-640-060.github.io/fitlog-lite/)。
- 本报告专用 END 仅修改本文件，产品源码与 Application 完全相同；按协作规范再次正常推送、等待 CI、重复精确资源/原合成档案/SW/离线检查，实际完成结果由最终回执记录。新聊天须实际 fetch 和检查 [main 提交](https://github.com/king-640-060/fitlog-lite/commits/main/)，不能将本文件中的 Application SHA 当作永远不变的线上 HEAD。

## 实际实现

Today 饮水共享 SVG、内容右侧记录按钮、默认收起；显式展开/成功记录后由真实滚动容器在需要时显露操作区，普通 liveQuery/参考值更新不抢滚动。保留独立日志、精确 Undo、自定义、历史及 Progress 紧凑 Sheet。

体重、睡眠、饮水三张独立图分别保留7/30/90、选中日期和内部滚动。7天显示全部自然日，30/90逐日横滚；缺失不补零，睡眠按业务夜晚，纵轴参考最近90天实际数据。外卡及全部8个内部部位在同一字号/视口/数据状态切换时均不变高，未通过仅固定外卡掩盖内部变化。

报告仅「日常综合报告」「营养周期报告」。保留日/周/月、自定义最多366天、十类日报事实、历史动作与专业细节；真实周期与“模板使用阶段·非正式排程周期”明确区分。共享只读实际记录分析与覆盖率，最多3条可追溯观察，普通任务不参与科学结论；不推断体脂、TDEE、确定缺口或疾病。专业章节默认折叠，标准卡58px、summary44px。另修复跨客户端删除当前筛选模板后的失效筛选：无需重载即显示保留的周期/阶段。

新范围级联路径按全部归属阶段/周期的日期并集处理原六类营养数据及九类健康事实，营养目标为来源关联集合∪区间内所有来源。一个22表事务重读指纹、精确删15表ID、校验全部22表完整幸存对象；七类计划/共享定义及区间外事实保留。保留原unused-only/六类窄API/日清理范围。支持取消/关闭中止、15步故障与取消回滚、午夜/陈旧预览/跨模板交叠/缺失来源拒绝、active睡眠/未完成力量/跨tab凯格尔保护；迟到Workout自动保存及有氧编辑不得复活已删ID。运行锁仅在内存/Web Locks，不增schema或配置；不支持协调能力时拒绝危险范围操作。当前版本跨客户端已测，旧版混合运行与真实设备不能由该证据代替。

## 数据兼容与保留

DB13 / IDB130 /22表，Backup14 / Restore1–14，Sync1 / 加密envelope1不变；数据库、备份、同步和设备配置格式的9个源文件与 START 原字节一致。全部16个既有fixture不变，其中15个历史冻结样本保留；新增独立合成fixture，不改历史快照或原始原型。

独立合成档案没有清库、重建或重新播种。Application线上升级前后、重开及离线冷启动的22表hash均为 `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`，8项设备配置hash均为 `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。App与执行SW均为Application SHA，DB130/22表无损。未操作个人PWA数据或真实密钥。

真实V7旧产物与上一版942产物在隔离本地同源服务上切换到Application真实产物：V7/70/14表→V13/130/22表，15行与AI配置原样保留；等待更新、未保存图片、AI草稿/提案、其他窗口、取消、单次确认重载、离线及外观冷启动通过。这是合成旧客户端升级证据，不是实体原安装PWA验收。

## 实际测试、测量与发布证据

- `npm run typecheck`、`npm test`：75文件 **1081/1081 PASS**，原1009保留，新增64范围删除与8报告测试；UTC全1081、洛杉矶新增72也通过。无skip/todo。Pages base干净构建PASS；现有chunk-size advisory保留。
- **44条既有完整浏览器命令PASS**；新增真实App Chromium/WebKit各30显示上下文×6数据状态×3图，共1080高度组、4320切换步骤，9部位最大差 **0px**。候选来源及分阶段受影响重跑有明细，未将每条命令伪称在同一个bundle运行。
- 390px浅色100%代表7→30→90→7：体重卡582.5px、睡眠630.5px、饮水582.5px；各图绘图区162px、日期轴44px、内部滚动区206px，四步均相同。不同字体可整体变高。保留真实历史/记录/补录/帮助控件，未照抄演示364.09px外卡或150px绘图区。
- 批准v0.3 HTML SHA256 `436f5eeaec511559026ffa7364be64b7d1fd94a63ee1cda04351efeed91e3991`；19条SHA256SUMS、18项manifest、CRC/路径检查及20归档原字节PASS。实际原型双引擎360组另记，未混作应用结果。
- Application线上：JS `index-u5-d_FRP.js` SHA256 `fe273d591abccffebef632e3df8a3abc6fa9bee79c161bce4e76cdb8fc4ec200`；CSS `index-Bzea6oNb.css` SHA256 `77e9d76148c7288ca75ec6b5ee186445cff59ea97b541090ae320bda493389fc`；SW精确字节、precache、build-info与干净本地构建一致，`local=false`。
- Application线上两引擎390/100关键流程、故障回滚、22表精确集合、原生日期选择/未来/反向/超366天与跨客户端删后报告重置PASS；这是定向线上回归，不冒充再次完整60上下文。另采13张实际生产原生元素/视口截图，已查看饮水、报告章节、趋势与危险计数。
- Markdown本地链接、diff --check、提交范围、冻结夹具/原型/数据格式源码检查PASS。失败和无效修复日志保留：失效报告筛选先红后绿；中文行尾括号320/200溢出修复后完整combined套件及WebKit定向检查通过；一次WebKit Habit点击超时后完整重跑通过，未修改Habit。未将中止/诊断/局部运行算完整通过。

## 合同、矩阵与交付档案

[实施合同](docs/JOINT_UX_REPORTS_RANGE_V03.md)、[34行QA矩阵](docs/JOINT_UX_REPORTS_RANGE_V03_QA.md)、[本地测量/截图/完整命令日志](design/qa/2026-10-17-joint-v0.3/README.md)、[4320步骤CSV](design/qa/2026-10-17-joint-v0.3/height-measurements.csv)、[唯一批准包](design/reference/2026-10-17-joint-v0.3/00_README_请先阅读.md)。相关数据/交互/报告/周期/视觉合同已追加本轮明确替代范围，保留旧合同与历史结果。

Application已验证的开发/自动化/正式站点门槛通过；矩阵REL-01/02/04的最终END与十项回执结果只能在END实测后结算。完整十项回执、逐文件用途、最终34行状态、App/END资源与profile日志、原始证据索引及核心ZIP存于本聊天 `outputs/joint-v03/`；全部中间原始目录保留在 `work/joint-v03/`。旧套件少数固定路径截图可能被重跑覆盖，未声称每次失败均有独立截图。

## Pending 与 ChatGPT Baseline

实体 iPhone Safari、原安装PWA、VoiceOver、真实键盘与Safe Area、个人健康数据连续性、真实Provider及ChatGPT独立代码/CI/视觉验收无本轮证据，保持Pending；既往F1–F5用户36/36结案不替代本轮。旧版本混合运行的原设备更新需按既有PWA流程关闭旧窗口并独立验收。无新增未批准开发任务。

新聊天先完整读取AGENTS、实际fetch main、本报告和协作规范，再读本轮合同/QA及唯一v0.3基准。不要重新实现已通过的工作，不把自动化当真机，不重置IndexedDB或业务数据。完成END实测与交付后停止本轮工作。
