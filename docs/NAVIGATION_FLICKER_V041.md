# 主 Tab 闪帧修复 v0.4.1

本轮仅落实用户批准的[正式交付包](../design/reference/2026-10-23-navigation-flicker-v0.4.1/DESIGN_REFERENCE.md)。START 为干净远程 main `c78c428044a5ca80591d049fcf1d00cf680a0eeb`。视觉基准仍是唯一批准 v0.4；不实现未批准的 v0.5–v0.7.1。

实际根因有三项：动画结束调用全页 render，销毁准备好的节点并再次读取/绑定；预备 main 没有 `#view` 的训练20px间距，只采用12px；预备层使用独立不透明背景，交接后暴露另一背景。初次空资料与后续多日合成资料均实际复现，不冒称读取未附入包的个人视频。

## 所有权和交接

- 使用真实生产 renderer 准备实际 header/main/cards。只读 Recovery/Chart 挂载可在准备阶段完成，业务入口延迟一次激活；原真实服务继续执行写入。
- 准备页使用唯一命名空间ID、inert、aria-hidden，暂停 live announcement。现行CSS用同等优先级选择器同时匹配原ID与准备页原ID标记，保持几何一致。
- 提交时移除旧页，原位激活同一目标节点，恢复原ID/live region，转交图表/恢复订阅、状态和清理函数。仅绑定事件和启动原有带快照去重的观察，不执行第二次全页查询/HTML替换；真实资料变化仍按原服务观察更新。
- coordinator更新current所有权；已接管目标不再作为preview清理。迟到/取消准备释放自己的资源。仅保留当前页与一个目标，不做多页常驻缓存。
- 页面位置、Food日期/餐次展开、Plan筛选/子项/完成展开、Progress趋势范围/日历月/报告模式按已有状态复访。餐次展开仅内存、最多8个日期，不写业务记录。
- 原生子手势、控件/文字选择、系统边缘、弹层/键盘/沉浸训练仍优先；当前Tab不重绘，最后点击优先，resize/pagehide/reduced motion保留原规则。

## 禁止改变的边界

不改服务/数据库/迁移/seed/快照/WorkoutAutosave/计时/音频/计划/Sheet业务；不改变颜色、主题、信息层级或导航结构。fitlog-lite-db、Dexie13、IDB130、22表、Backup14、Restore1–14、Sync/envelope1不变。原17冻结fixture、原批准原型与旧冻结QA不变。所有测试写入仅限新建隔离合成context；旧生产合成档案仅比较摘要，绝不重置或恢复。

[本轮QA](NAVIGATION_FLICKER_V041_QA.md)分开记录自动化、真实生产、失败/重跑和实体Pending。原WebKit饮水Undo−128px未声称解决；iPhone Safari/原安装PWA/真实键盘SafeArea/VoiceOver/个人连续性无实体证据继续Pending。完成授权发布后停止，交还ChatGPT独立核查。
