# FitLog Lite Development Report — 2026-10-15

## 最新验证状态

B1–B9 已实施并发布：三态外观/深色语义图标、统一趋势选中样式、容器焦点、分组分页历史、真实只读周期报、居中月份与透明今天、精确习惯命中区/永久删除、一层独立子任务、仅指定食物实际克数。A–D 已有特殊饮食、模板空态、十类日历/精确删除、营养周期排程继续保留。用户及ChatGPT独立验收尚未完成；实体证据单独Pending。

- 分支 main；START_COMMIT：ab235e53781ee3f00af3c6794a7163fcdff6b1f0。初始干净，多次核对远程；无强推、无覆盖他人变更。
- Application Commit：89e3fbc3b56a407987e6c7d4962feb6ce245990c。
- Application Actions / Pages：[38681081231](https://github.com/king-640-060/fitlog-lite/actions/runs/38681081231)，success；typecheck/test/build/deploy全部通过。
- END_COMMIT：包含本报告的提交（HEAD，只有本文件的文档变更）。END对应CI/资产/App/SW/同档案/离线的最终实测保存在本轮正式十项回执与证据包；恢复上下文时实际读取当前HEAD和其Actions，不能拿Application run冒充END run。
- 正式地址：https://king-640-060.github.io/fitlog-lite/ 。本报告先记录已验证的Application状态，END推送后再按同一门槛核验，不预先宣称其CI成功。

## 数据与版本

Dexie13 / IndexedDB130 /22stores；Backup13 / Restore1–13；Sync/envelope1；AIConfig1、VoiceConfig1、WaterReference1不变；Appearance1为设备枚举，排除业务Backup/Sync。V13只将weights.date唯一索引改为普通索引、给已捕获sleepNightDate加索引，不改旧行或快照、不回填子任务、不新建业务表。

Task.subtasks为可选有序嵌入数组，稳定id/text/completedAt，最多100项且无嵌套。子项4/4仍不自动完成父项；父项可手动完成，旧调用省略子项保留既有值，明确[]才清除；编辑/删除在事务内检查来源。日期详情展示全部子项，日历仍按主任务存在计计划。

历史默认30天、7/30/90、每批25条；精确ID编辑/删除及并发来源检查；多年记录按日期可访问。活动中睡眠单独保留，完成历史按捕获夜晚/旧数据本地回退，不改真实起止/归属。完整体重趋势显式读取且Canvas有界；今日与同日最新有效记录一致。

周期报只读真实周期（含归档/跨年/未来），统计实际范围与今天交集。排程≠目标≠已吃；完整实际与同日正目标才比较，缺失未知；力量只统计合格已完成、有氧只实际保存；体重至少两个不同日期并公开首末日期。无周期/无可比数据不伪造零或成果。

指定食物只用用户选中的1–4个真实ID及输入克数，保留精确fractional grams/独立canonical kcal/未知宏量；预览只读，实际吃下并选餐次确认才记账，未来/stale拒绝。Food智能模式/今日去补齐入口移除；共享optimizer仍供既有AI，未误删其他AI功能。

## 自动化验证

本地正式单测复核日期2026-10-13；主要浏览器候选证据2026-10-12；线上发布验收2026-10-15。使用独立合成档案/专用QA profile，不触碰用户日常浏览器档案。

|命令/门槛|实际结果|
|---|---|
|npm run typecheck|PASS|
|npm test|PASS：927 tests /71files；原879保留，新增48；无skip/todo|
|GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build|PASS；干净Application local:false；仅既有chunk-size advisory|
|git diff --check START..Application|PASS|
|所有34个既有browser suites|PASS；完整命令、各次日志与原矩阵保留|
|approvedJointV05 Chromium/WebKit|PASS：各完整17组，四宽×100/200%×两系统主题+横屏；三态/实时系统/manual override/跨窗口单选与草稿/4-4父子独立/长历史/周期只读/实际克数/触控与键盘|
|uiQualityAudit|PASS：四宽各144场景，含长名、原生控件、输入/弹层、Vision、放大字体/横屏/模拟安全区|
|PWA upgrade V7与START V12→V13|PASS：原15rows、14/22旧表保留；等待更新、图片/草稿/提案/其他客户端保护、显式一次更新、离线冷开和深色偏好|
|Restore1–13/冻结V12→13/冻结V13重开/加密Sync1/22表回滚/DST/2000条分页|PASS|
|冻结V7–V12共12文件字节|PASS：与START Git对象SHA256一致|

首次preview缺少Pages base，修正环境后重跑；旧确认文案/单手动入口/日期组/分页定位按批准契约更新，数据保护断言保留。饮水编辑按实际选中ID核验其它ID逐字段不变；Sheet收缩按实际内容边界，不沿用无筛选时代<60%高度阈值。

实际修复了进行中睡眠入口、编辑后展开组、后台更新保留父汇总引用而不丢草稿、分页与全历史趋势独立、同日最新体重一致、跨窗口外观radio同步、200%今天单行。早期点击/截图/Vision mock超时与线上WebKit首轮系统偏好模拟未切换（matchMedia仍为旧值）均保留原始失败；完整原命令重跑通过，不用skip/force-click/清空真实库造通过。

## 原型与实际UI

已完整读取README/CODEX_TASK/DESIGN_LOCK/ACCEPTANCE_MATRIX；ZIP SHA256：8b755115b404c5a3da786a4f07b8843942abe0e3a75d37546bfbad6eb6aeb584。14项manifest验证通过；原HTML SHA256：c7024903b4e6a3e628119403c1d31284c0f6e3c9bdd422bf766234df759494f2。

原包在design/reference/2026-10-12-approved-v0.5，字节不改；真实运行批准HTML两引擎×4宽×深浅16组，并追加8组200%放大。候选及线上各有184组同宽/主题/系统字体对照，原PNG与SHA、CSS/DOM receipt保留。仓库原图见[8组对照](docs/evidence/joint-v05-2026-10-12/README.md)，详细差异与ID追踪见[QA说明](docs/APPROVED_JOINT_V05_QA.md)。

生产保留既有semantic palette/rem层级/native dialog/select、三趋势并列模块与真实营养/历史细节；不复制假数据/调试控件。200%报告模式可两行，年/月可分行；今天文本不折行、透明>=44px命中区随文本扩展，月份仍居中。容器主动focus明确outline0；内部键盘>=2px。outline:none的medium计算宽度不等于实际画蓝框，不能声称已在实体iPhone重现原问题。

## 正式环境验证（Application）

productionAssets PASS：JS index-BEnnq9k8.js（930565 bytes，SHA256 24c2a0a89429e2b2be3cd6ccdbea26229ff3b05ddf0ee0f3fd92902112a5040d）；CSS index-Bnu-rrup.css（167003 bytes，SHA256 02735304e6260e1e66bf2b74cd6e1244c47a6522d1dfc61a8c9ddc227d601c67）。实际SW逐字节等于干净构建，precache准确；五主Tab/AI设置/Sync入口无pageerror。

线上approvedJointV05在两引擎各完整17组通过；全是新隔离合成上下文，不能称作用户个人数据或实体Safari验收。

此前已有专用合成profile不清空、不重建、不重新播种，V12→V13前后全22表/25rows哈希：049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a；8配置哈希：609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34。与本轮START baseline相同。离线冷启PASS，实际App/SW均Application SHA。END后重复此项，不从CI成功推断档案/离线成功。

正常HTTPS push出现HTTP2/连接超时，SSH缺少可用认证；未改全局配置、未加新密钥。通过已授权GitHub连接器上传116个相同blob，整树444dedfbc6c86a7b1fe2b63faf06822569ce8d55、原Commit89e3fbc逐一匹配；expected旧HEAD+force:false更新main，保留原Git身份和提交内容。没有强推。

## 文档与待验收

更新AGENTS入口及UI/交互/记录恢复/数据保护/营养周期/专业报告合同；新增APPROVED_JOINT_V05、QA说明、V13 fixtures、原包/8对原图。CHAT_CODEX_WORKFLOW长期规则不修改。具体116项实现/测试/归档文件在正式交付清单，本报告作为第117项。

实体iPhone Safari、原主屏幕PWA、真实状态栏/键盘/Safe Area/VoiceOver、用户个人设备历史连续性：Pending。FO原问题的实体复现/修复不能由模拟截图替代。AI/语音真实Provider与麦克风硬件属于既有独立Pending，没有用真实用户密钥做QA。浏览器/CI/上线不等于用户验收。

最终外部交付在本聊天outputs：中文十项回执、完整39项验收矩阵、修改清单、候选/线上原图HTML、原始命令日志/JSON/失败尝试和SHA256证据包。按CHAT_CODEX_WORKFLOW交回ChatGPT独立验收，用户保留最终确认权。

## ChatGPT Baseline

START ab235e5；Application89e3fbc，END为本报告提交。B1–B9完成，A–D不重做。DB13/IDB130/22表、Backup13/Restore1–13/Sync1；一层Task子项，4/4不自动完成父项；只读实际周期报；按日期25条分页，旧数据/活动睡眠保留；设备三态主题、图表选中统一、居中月份/透明单行今天、习惯左侧44px、仅手动指定食物。927/71、34旧suite+新双引擎17组、本轮PWA升级及正式资源/同profile哈希/离线通过。批准HTML原SHA c7024903... 原包与详细QA在仓库；必要可访问性差异说明保留。实际END运行和App/SW身份必须读最终证据，不把本报告的Application run冒充END run；真机与独立用户验收仍Pending。
