# 今日饮水底部 Sheet v0.1：本地实际验收证据

唯一批准输入与原字节[设计锁](../../reference/2026-10-18-today-water-sheet-v0.1/02_APPROVED_DESIGN_LOCK.md)一致；[实施合同](../../../docs/TODAY_WATER_SHEET_V01.md)说明真实组件与演示的边界。START为120cb0624d0efa06b7ff7ce638e7d02104d4d62c，所有local截图是最终候选B（meta仍为START、local=true），不是未来生产图。prototype前缀为实际运行的演示HTML；before为此次重新运行的真实START卡内展开。正式Application/END截图和资源/CI证据随本聊天最终交付目录另行提供，不预先宣称发布成功。

[sheet-receipt.json](sheet-receipt.json)为实际双引擎64上下文：每引擎五宽320/375/390/430/844×三字体100/140/200%×深浅共30，加390短视口480px的100%浅/200%深两组。390/100四组还通过真实Backup13预览确认恢复有历史的合成样本，然后做非法5值/配额失败/保留输入/重试/重复打开/双击/双提交/跨午夜精确ID Undo/同Sheet参考值/键盘焦点返回/Progress离线自定义。每次Undo完整比较22表原对象，成功仅改变允许的新WaterLog。默认首焦点标题，Back保持dialog，自定义成功整个录入关闭，重入无残留输入。键盘420px和底部34px安全区是模拟；WebKit移动wheel API不支持，背景固定/内部滚动检查不冒充实体触摸滚动。

[computed style比较](computed-style-comparison.csv)：390/100两引擎两主题四个按钮全部92px，标准同级样式完全一致；START饮水约100/99.58px。浅色rgb(233,240,220)、深色rgb(48,65,42)、44px触控、共享字重/字号/圆角/内边距/正常按压禁用键盘状态。无箭头/aria-expanded/卡内动作区；仍右侧。原型78px只属于其字体环境，正式沿用统一5.75rem最小宽度，没有改全局按钮。

[既有回归结果](regression-results.json)包含最终B完整44条及另加的双引擎joint定向2条（ONE=1，各18高度组，不冒充上一轮60上下文全量矩阵）。每个命令与开始/结束/退出码保留，原始完整stdout在最终交付包。所有9部位7→30→90→7高度不变；其余报告/范围删除/取消/失败回滚/跨标签等断言保留。unit/typecheck/build为此次真实结果，1081/1081、75文件；构建仍保留现有chunk-size提示。

[源码/夹具/基准保护](source-data-scope.json)逐文件核对279项，只有recovery.ts、recovery.css和ActionToast可选间距三处产品文件可变；其余276项、全部16旧fixtures和既有批准参考原字节不变。[原合成档案基线](preservation-baseline.json)逐表/配置哈希及离线启动通过；最终相同原档案升级后和END后检查在正式回执，不使用个人数据。

保留失败：初始baseline/preview路径配置错误没有加载App；WebKit mobile wheel API不可用；catalog原几何审计测到子视图过渡，需要等真实有限动画完成；joint关闭首帧曾返回0高，现等同一严格卡高稳定。A候选430/120真实Toast遮挡体重操作，START额外探针不复现；只给新饮水Sheet反馈8px控制缓冲，其他调用默认32px不变，针对及最终完整复测保留。A旧回归未全部完成即停止，不计入最终44条通过。旧approvedJointV05 WebKit首次及复跑超时实际在习惯点击，早期曾误把诊断中的媒体状态当作失败点；START也复现。原克隆夹具把旧打卡搬到当天，点击前true，点击后正常false，与旧固定true断言冲突。只修正测试前提：历史打卡日期保持，先断言今天false，再真实tap验证true、新ID唯一且旧行完全保留；等待既有有限图标过渡后仍严格检查opacity=1。未改冻结fixture、习惯/外观产品或超时。纠正后完整双引擎各17上下文复跑。最终44指各完整命令的最终成功执行，不表示首批零失败或把单套复跑称为全部矩阵重跑，全部attempts均保留。原始失败没有删除，详情在最终证据索引。公开TXT副本仅规范化本机路径及行尾空白；原始日志未改，均在外部交付包保留。

旧WebKit卡内展开Undo −128px是此前且本轮重新测得的现象，新Sheet最终64场景路径测得0px；不同交互不能宣称已修复共享滚动、Toast或真实设备问题。实体iPhone/原安装PWA/VoiceOver/真实键盘Safe Area/个人数据连续性Pending，ChatGPT独立核查在交付后进行。
