# 联合交互 v0.4 批准合同

2026-10-22 用户交付并授权执行[唯一批准包](../design/reference/2026-10-22-combined-interaction-v0.4/00_README_请先阅读.md)。冻结 [HTML](../design/reference/2026-10-22-combined-interaction-v0.4/reference/fitlog_combined_interaction_prototype_v0.4.html) SHA256 `b7be5a11161f138c0182b059bd42ca26d0b56852b309db34b01b5b4792b68419`；原始17成员不得改写。侧栏旧装饰v0.3不代表冻结版本。原型、示例视频及包内截图仅为设计依据，不能作为产品测试结果。

## 主导航

顺序始终今日/计划/饮食/训练/进度，原固定导航/Safe Area/20px图标及至少44px热区保留。独立浅绿胶囊与页面连续进度共用位移；只对相邻页实施手势，点击可直达任意页。相邻显示复用正式只读渲染和真实服务查询，惰性准备，inert/aria-hidden，独立副本UI状态/订阅销毁；不激活路由或调用写服务。没有准备好真实邻页就不允许空白切换。最终提交才改变activeTab/aria-current；回弹不重建当前DOM。当前Tab重按无重播；异步代次/取消信号、最后点击优先和有限动画防止旧查询覆盖新状态。

本地surface的方向仲裁保留原生纵向滚动、文字选区、控件、原生横向图表/日历和iOS边缘返回。触摸仅在明确水平归属后对该surface的move取消默认行为；不设置全局touch-action:none、不全局阻止touchmove、不禁止用户缩放/文字选择。打开dialog/键盘/沉浸训练时拒绝背景导航。resize/pagehide/Sheet打开/减少动态效果变化取消过期展示。

## 独立饮食日期

本批准狭义替代旧“Food body不横滑、内容不做切日过渡”。顶部日期原生横向轨、短下划线、居中/渐淡/近边窗口重建和远日选择器仍保留；滚动进度映射到真实只读日期面板，原生惯性与snap仍由浏览器负责。内容非交互空白处的局部拖动独立切相邻本地日，日期轨与内容同步；不切主Tab。原生轨可连续滚动多日，内容拖动每次至多一天；二者最终都归于唯一实际选择日期。

每一面板只使用其data-food-date对应的FoodLog快照、当日目标/周期安排/餐次。预览不写库；提交日期后重新读取并通过代次/日期/节点守卫，加载期间原旧日期控件inert，避免误将旧卡片操作写至新日期。原日期业务语义、回到今天、点击日期/焦点、餐次展开和真实保存服务不变。日期本地历法跨月/年/DST，不用UTC截断。表单、记录行、菜单与日期选择器优先于手势。

## 训练大Sheet

力量初始、有氧独立录入/编辑、凯格尔方案选择为Large：`min(820px, shared visual viewport - 12px)`，同设备/键盘状态同top/height，内容独立滚动。历史Sheet内部有氧编辑保留同一父dialog，不强行替换历史容器。力量执行/WorkoutAutosave、凯格尔沉浸计时/音频/锁及有氧原事务均保留。

仅以上入口opt-in约58px/275ms transform/opacity入场及210ms遮罩渐显。关闭通知、原生close、焦点恢复和ref-counted背景锁仍同步精确一次；退场使用短暂inert/aria-hidden视觉副本，没有第二次close或延迟业务清理。重开/替换/进入执行界面清理旧视觉，减少动态效果和pagehide清理动画。其余Sheet/Toast动效保持原合同。VisualViewport仍由唯一共享协调器负责。

## 不变的数据与发布门槛

fitlog-lite-db、Dexie13/IDB130/22stores、Backup14/Restore1–14/Sync1/envelope1及全部冻结输入不变。不修改服务、迁移、快照、训练/周期/报告/删除/计划语义；不接触个人健康资料。既有44命令、新的双引擎中间帧/尺寸/键盘/仲裁、完整单测/类型/构建、原合成profile与精确线上资源/离线以及Application/END两次CI均须实测。

实际结果见 [QA](COMBINED_INTERACTION_V04_QA.md)。浏览器模拟、注入事件、真实浏览器原生触摸、WebKit原生scrollBy/CSS snap以及实体iPhone分开标注；真实iPhone Safari、系统边缘返回、原安装PWA、真实键盘/Safe Area、VoiceOver和个人数据连续性没有独立证据则Pending。前轮结案/有条件通过不改写为本轮验收，旧WebKit饮水Undo−128px不在本轮修复范围。
