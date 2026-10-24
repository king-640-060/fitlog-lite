# 管理中心 v0.6.1 QA

2026-10-24，Asia/Shanghai。本轮本地开发与验证已完成；发布身份、Application/END CI和实际生产结果由后置验证记录在 `LATEST_DEV_REPORT.md`及十项正式回执。本文的本地PASS不能代替实体设备或发布验收。

## 基准及范围

START `87dad7206829238540c33fd82fb05cf24dd478e4`：main工作区干净，fresh fetch、ff-only pull与origin/main一致。[原包](../design/reference/2026-10-24-management-v0.6.1/DESIGN_REFERENCE.md)6成员CRC及5/5SHA通过，唯一v0.6.1 HTML在Chromium与WebKit实际操作。根页按实际原型为四分区加个人计划/习惯，合计13真实入口，没有采用v0.7。

5产品文件：main管理入口接线、新managementHub、新management.css、workspace可选根标题，以及真实营养周期UI的一个静态标签span。main其余310顶层语句逐字不变；cycle UI将该span还原后整份文件与START逐字相同，所有周期字段/绑定/业务逻辑保留。174旧源文件中仅3份必要UI文件改变，其余171及所有服务/DB/种子/导航协调器/Autosave不变；17冻结fixture、637旧设计/QA文件未改。

## 实际自动化结果

- npm ci、TypeScript、78文件1143/1143单测及 `/fitlog-lite/` base生产构建PASS。无依赖、数据库或格式版本更新。
- 44个既有浏览器命令全部实际执行；首次40PASS、4FAIL，逐项保留失败。入口驱动完整复跑、真实标签修正后的33上下文完整复跑、正确旧版本基准服务上的两引擎Backup复跑均PASS，形成44项有效通过。未降低任何原断言。
- 14项补充：目标、键盘、自动份量、饮水、联合两引擎定向、报告区间、完整联合交互、真实日期轨、日期竞争、训练motion/执行、完整导航闪帧及实际Restore筛选。首次13PASS，饮水因缺少冻结对照参数在启动前失败；补齐原参数后完整64场景PASS。联合区间为双引擎390/100定向，不冒充全宽矩阵。
- 最终管理专项52上下文PASS：两引擎×4宽×100/140/200%×浅深，加短屏和横屏。13真实入口、六新建编辑器、搜索/清空/无结果/键盘、同dialog及父节点、Back/X和22表/配置前后摘要检查通过。554次稳定路由采样外框top/height偏移均0px；10个代表上下文各20轮，共200轮。另有修正前后阶段的完整52及窄屏深层4，分列留存，不累计成更多独立覆盖。
- 管理Workspace24、VisualConsistency24、mobile4，以及UIQuality4宽各144状态通过；包含原生命周期、20轮资源/监听、实际保存刷新、父滚动/查询、隐藏草稿和异步请求取消。最后的周期标签修正由Chromium完整33与WebKit6（含390/200浅深）进一步通过。
- 30份旧测试入口驱动适配；语法树逐项对照确认1261个原断言调用逐字相同。UIQuality保留原边界/230ms审计，只在导航前置增加现有真实commit等待。新专项使用实际Tab（Chromium）或Option+Tab（macOS WebKit）遍历，不当成物理iPhone键盘/VoiceOver。

## 视觉与真实回归

390px浅深实际截图和computed style与冻结原型对照：分区75px最小行高、12px/13px内边距、12px间隔、38px字标/12px圆角、14.24px标题、11.52px辅助文字及浅深背景/文字色一致。保留原生dialog与项目SVG，部分纵向差约1.375px；真实字段与既有66px/17px列表不替换成演示假表单。字体放大时标题和标签自然换行。实际截图已经目视查看；不是全屏逐像素相同声明。

发现并修复两个真实显示问题：搜索原生取消图标与44px自定义清空重复，仅该搜索框隐藏原生图标；新body间距下390/200周期表单长标签326px容器出现336px文字范围，原版同条件PASS。普通换行尝试未通过，原失败保留；最终仅包装这一个标签文字并限定可换行空间，完整原文、字段和业务绑定不变，同一原断言及完整矩阵通过。没有裁切、降字号或放松审计。

## 失败及候选区分

首次本地preview重建后保留旧资产索引导致JS404；改用不可变静态副本。WebKit默认Tab的文本控件偏好、未限定dialog的“新建习惯”定位、遗漏的动态旧入口，以及UIQuality在真实切页未提交前采样均有原日志与修正后完整复测。两项旧Backup门槛首次因原版本服务5406未启动连接失败；实际提供冻结e082689旧Backup13构建后两引擎通过：旧客户端拒绝14且数据不变，新客户端Restore13/14、Export14、重开及非法meal零变更。

候选A验证44+14业务/布局；B针对批准深色做管理内局部映射并复跑Workspace/Visual/UIQuality/mobile与52；C去掉重复清空符号并完整52；D标签普通wrap尝试失败；最终E标签span修正后完整52、Chromium33与WebKit6通过。每份记录保留其实际目标，不宣称所有旧门槛都在最后同一字节构建运行。最终发布必须对真实App/END资源与UI再次检查。[本地冻结证据](../design/qa/2026-10-24-management-v0.6.1/README.md)仅反映冻结时事实。

## 数据及验收边界

保持fitlog-lite-db、Dexie13/IDB130/22表、Backup14/Restore1–14、Sync/envelope1。原专用合成生产profile baseline在线/离线通过；22表摘要 `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`，8配置摘要 `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。该profile没有reset/reseed/Restore，Application/END仍须实际再次核对。它不是个人健康数据；所有写入/Restore/模拟Provider回归均在新的隔离context进行。

实体iPhone、原安装PWA、真实IME/Safe Area、VoiceOver、个人数据连续性继续Pending；真实Provider未执行，ChatGPT独立验收尚未进行。WebKit自动化不是实体设备证据。当前饮水样本的0px Undo也不证明旧−128px观察已解决，本轮未修复该旧现象。既有F1–F5用户36/36验收未被重开。
