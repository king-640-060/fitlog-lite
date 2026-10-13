# v0.5 验证说明与验收追踪

批准范围及数据合同见 [APPROVED_JOINT_V05](APPROVED_JOINT_V05.md)。原始 [验收矩阵](../design/reference/2026-10-12-approved-v0.5/ACCEPTANCE_MATRIX.md) 与批准包不修改字节。起始 main/origin main 为 ab235e53781ee3f00af3c6794a7163fcdff6b1f0，初始工作区干净，A–D 既有联合功能继续由 combinedHandoff 与所有既有回归保护。

## 实际候选验证

- 完整单测：927 tests /71 files；之前879项保留。类型检查、Pages base构建、diff检查通过。
- 所有34个既有browser suites均实际执行，通过结果及早期失败原始日志保存。新增approvedJointV05在Chromium/WebKit各执行完整17组：320/375/390/430×100/200%×深浅系统偏好，以及844×390横屏140%。三态切换、系统实时变化、手动优先、跨窗口radio同步和任务草稿保留、4/4子项独立、历史25/50分页/日期定位、周期只读、manual grams及touch/keyboard均有真实操作。
- 实际运行批准HTML：Chromium/WebKit×四宽×深浅16组；另做两引擎×320/390×深浅200%字体8组实际截图。14份manifest SHA校验通过；HTML c7024903b4e6a3e628119403c1d31284c0f6e3c9bdd422bf766234df759494f2。
- 单元兼容覆盖Restore1–13、冻结V12→V13、V13重新打开、加密Sync/envelope1往返、22表写失败回滚、同日多ID体重、DST/捕获夜晚/旧睡眠回退及2000条分页。12份冻结V7–V12文件逐字节与START Git相同。
- 发布门槛另执行真实PWA upgrade（V7历史构建及START实际Pages artifact）→V13、same-existing synthetic profile全22表/8配置哈希、Production exactAssets/SW/离线。最终实际结果、SHA和CI链接由[LATEST_DEV_REPORT](../LATEST_DEV_REPORT.md)及正式交付回执记录；本地候选不冒充已上线。

## 原图与必要差异

[仓库8组原始对照](evidence/joint-v05-2026-10-12/README.md)保留原PNG与SHA；完整两浏览器/全部宽度深浅/200%对照在本轮外部HTML和证据包。原型使用系统字体；200%仅运行时将计算字体乘2，原文件不编辑。生产使用既有rem层级与语义Token；颜色、值和数据不要求假造与演示相同。

|场景|保留的批准设计|必要生产差异及依据|
|---|---|---|
|月导航|居中月份、对称44px箭头、右侧透明绿色今天|200%今天仍单行；透明命中区按文本扩展，导航边距仅扩展2/4px，年/月可分行。没有缩小字号或额外Today行|
|子任务|默认折叠、短项两列、长项整行/两行预览、4/4父项未完成|真实稳定IDs/时间/顺序；编辑器支持全文、上下移和删除；没有复制原型假任务|
|习惯与确认|只有44px左侧打卡，名称/空白进入编辑；永久删除短按钮|正文真实名字和实时数量；保持既有危险色对比度/事务再验证/取消保护|
|主题/Sheet|三态语义色、无容器蓝框、内部键盘焦点|dialog主动聚焦outline=0；内层keyboard outline>=2px。outline:none可计算medium宽度但不绘制，不能据此声称复现实体iPhone蓝框|
|趋势|7px选中点/3px文字色环、4/4虚线、实际日期读数|Weight保留有界Canvas，Sleep/Water保留SVG和原三个并列模块；真实缺失日断线，内部原生滚动|
|历史|日期分组、7/30/90、25条批次、单条编辑删除|独立进行中睡眠；按ID稳定分页，加载数不是全范围总数；按日期可访问2025旧记录。保留内容尺寸Sheet，新增筛选/分页所需高度不能套用旧无筛选<60%阈值|
|周期报|四种报告、真实周期选择、2×2事实卡、方案覆盖|长名称选择框保留native select，全文/日期另显示；200%切换两行。追加实际营养完整性/训练/体重日期细节，计划不算事实|
|指定食物|四缺口保留、唯一quiet手动入口、明确实际已吃确认|用户输入精确fractional grams，缺失宏量仍未知；没有Food优化/推荐。共享旧optimizer仅保留给既有AI功能|

## 验收ID → 证据入口

|ID组|自动化证据|状态边界|
|---|---|---|
|G-01/G-02|原包SHA日志/原型运行原图/START记录/combinedHandoff|PASS；原型预览旧版图片不作批准基准|
|TH-01–03|approvedJointV05两引擎/主题probe/PWA appearance offline/全表hash|浏览器PASS；实体状态栏及原安装PWA Pending|
|CH-01–03|approvedJointV05/coachReportExperience/unifiedExperience/trainingRecoveryExperience/lifecycle|PASS；Canvas有界及资源断开不是截图推断|
|FO-01–02|两引擎主动容器focus/keyboard检查/interactionStabilization/uiQualityAudit|浏览器PASS；真实键盘与Safe Area Pending|
|HI-01–04|approvedJointV05/unit大档案/DST/precise IDs/两个Recovery gates|PASS；没有清除真实DB或放宽事务断言|
|CR-01–05|周期边界与营养单测/archived/future/none UI/read-only hash|PASS；不把计划和未记录算执行或零|
|CA-01–03|四宽两引擎/中心与hit rect/今天单行/十类回归|浏览器PASS；实体iPhone Pending|
|HA-01–03|habitDeletion/approvedJointV05/habits units|PASS；取消及全部历史事务继续保护|
|ST-01–06|approvedJointV05/unit/旧Task回归/Backup1–13/日历详情|PASS；没有增加独立子项事实或自动父项完成|
|NU-01–03|approvedJointV05/v4FoodPlanToday/remainingPrototype/manual services|PASS；未来/stale拒绝写入，历史快照保留|
|D-01–05|完整单测/冻结hash/PWA/profile/CI/Production/文档与正式十项回执|D-01/03/04候选PASS；发布与回执实际结果见LATEST与外部完整39项矩阵，不能提前标已部署|

## 失败尝试和修复记录

早期preview缺少Pages base环境导致入口404；修正server环境后重跑。批准删除正文/单一manual入口/分页/日期组变化需要同步旧UI定位断言；原数据断言与所有suite保留。饮水编辑测试按真实选中ID计算总量并逐字段保护其它ID，不依赖同时间随机ID顺序。新增筛选后按实际内容边界验证Sheet收缩，无多余空白。

实际修复：active sleep保留独立入口；编辑日期变化保留展开组；后台写入更新被保留的父汇总节点而不丢编辑草稿；完整体重趋势与分页数据独立；同日最新有效体重一致；跨窗口外观单选状态同步；200%今天文字保持单行。早期点击/截图/Vision mock超时保留日志，完整原命令重跑；不删除、skip或强制激活点击来伪造通过。

浏览器Chromium/WebKit是模拟证据。实体iPhone Safari、原主屏幕PWA、真实状态栏/键盘/Safe Area/VoiceOver和用户个人数据连续性没有设备证据，均Pending；Codex交付不等于ChatGPT独立验收或用户最终确认。
