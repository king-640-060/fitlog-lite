# 主 Tab 闪帧 v0.4.1 执行QA

START为干净远程main `c78c428044a5ca80591d049fcf1d00cf680a0eeb`；提交前再次fetch核对。原8包成员、6Manifest/6SHA/CRC全部一致，唯一v0.4 HTML摘要未改，双引擎实际运行。

## 实际自动化

npm ci、TypeScript、78文件1143/1143单测、Pages生产构建PASS。原44门槛完整PASS，首轮7个不成功记录及复跑分列；只适配两处驱动前置动作，84+44个原断言表达式逐字一致，未删改业务/历史/数值/回滚断言。原联合6+日期边界共7、旧目标/份量/键盘/饮水/双引擎joint/报告补充7门槛全部PASS。

Chromium151.0.7922.34/WebKit26.5，前后各52显示上下文（4宽×3字体×2主题×2引擎，加短屏/横屏）；同一业务日期、52组22表/配置摘要逐组相同。修复前444次全部替换目标，训练区域下移8/16/24px；修复后444次均保留main/header/cards节点，纵向位置与高度偏移0px。另16次内部几何检查覆盖趋势绘图区/日历控件/两类报告/计划子页/训练历史，全部节点连续、纵向/高度偏移0px。浅深色视频实际解码与8张逐帧拼图已目视查看；25fps视频不冒充60fps完整像素证明，rAF标记最后两帧/首个active/稳定帧。视频导航颜色索引仅辅助选帧，旧WebKit两组未识别一个后续Food色彩变化如实保留。真实时钟造成部分前后问候跨小时，未声明整屏像素完全相同。

每引擎100次切换前后计时器1、observer2、外部监听43、DOM节点267、preview0/main1/capsule1；旧当前页/取消页资源释放，新页控件激活一次。深层定向运行自身资源循环0次，初始日志字符串误写100但JSON为0，已修正交付脚本；实际100证据来自完整矩阵后的独立计数。真实IDB慢完成/迟到丢弃、最后点击、回弹、子手势、日期与复访状态、管理/任务/饮食单次保存、三训练Sheet、同ID自动保存均有实际证据。额外未完成Workout前后双引擎录像与同ID保存通过，原可选字段缺失/undefined按现行序列化语义比较，不改变旧事实。

## 数据与发布边界

825受保护文件仅授权5产品文件变化，其余820及17冻结fixture、旧设计参考/冻结QA、全部service/DB/seed/Autosave未变。Dexie13/IDB130/22表、Backup14/Restore1–14/Sync与envelope1不变。原生产专用合成档案START在线/离线22表与8配置摘要通过，绝不重置或恢复该档案。新增隔离context的fixture准备与显式保存，不涉及个人档案。

[冻结证据](../design/qa/2026-10-23-navigation-flicker-v0.4.1/README.md)在发布前为17PASS/3Pending：17待升级、19待双CI/Pages、20待实体设备。Application与END实际线上结果由LATEST与外部正式十项回执记录，不能提前填成功。iPhone Safari/原安装PWA/真实键盘SafeArea/VoiceOver/个人连续性继续Pending，ChatGPT独立核查另Pending。原WebKit饮水Undo−128px未声称修复。此前用户F1–F5 36/36及已结案轮次不重开。


## 最终Application前的恢复筛选补充

初次Application `9d965c6d06cfb1b2bffdaa0a31e3e50f36bd20fc` 的CI/9项生产验证均已真实通过，但补充Restore检查发现未覆盖的状态：Plan原筛选标签消失，目标仍存在却被失效草稿隐藏。已在该实际发布版本上用两个新合成context执行Backup14 Restore重现，22表仍精确等于备份，证明是显示状态而非记录丢失；原记录/截图保留。

修正只在renderPlanPage计算可用filterId，准备页用此值渲染，接管时才归一化内存草稿。其余173源文件与初次Application逐字一致，没有更改Restore/Sync或任何业务数据/服务。追加双引擎实际Restore/22表精确断言、原interactionStabilization完整4宽、combinedInteraction的4显示+2完整手势定向、TypeScript/1143单测/Pages build全部通过。不是声称把原44全部再次重跑；原44完整阶段保留，最终版本另对受影响路径复验并完整执行正式Pages52矩阵/100切换/16内部区域及新Restore门槛。

[独立补充证据](../design/qa/2026-10-23-navigation-flicker-v0.4.1/restore-filter-addendum.json)及其[SHA256](../design/qa/2026-10-23-navigation-flicker-v0.4.1/restore-filter-addendum.sha256)另行保存，不改写此前冻结文件和原manifest。后续Application/END的实际SHA与CI/Pages由LATEST和正式回执记录。实体Pending保持原边界。
