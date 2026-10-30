# 日历手势稳定性修复 v1

用户已批准[正式交付包](../design/reference/2026-10-30-calendar-gesture-v1/README.md)，本轮分类为v0.9日历手势回归。START为`11c058ac6014842a9098443b7b8f304ad6d2d467`，fresh fetch确认main一致且工作区干净。

## 实现边界

Progress日历的整个`.deck-scroll`内容所有者在创建时即设置`data-no-page-swipe`，早于异步真实月历读取。该属性经原DOM晋升、月切换重建和再次进入均保持。它利用既有closest仲裁，覆盖月头/标题/按钮/日期网格/星期/图例/底部空白；不新增全局事件或滚动层。仅对该日历容器设置`touch-action: pan-y pinch-zoom`及`overscroll-behavior-x:none`，防止既有月头光学负边距造成的原生2px横滚，同时保留双指缩放和纵向滚动。

顶部`.page-tabs`是该容器的兄弟节点，仍采用原createLocalDeck及bindHorizontalSwipe的跟手、阈值、回弹、取消、点击和键盘策略。趋势/报告的子deck与图表原生交互保持。共享导航及其余消费者没有修改。

## 持久合同

- 日历正文水平/斜向动作不移动一级轨道，不切换视图，不误开日期；纵向意图交给既有原生滚动。
- 整个内容只保留原`.deck-scroll`纵向所有者，不增加嵌套滚动、pointer-events阻断或全局preventDefault。
- 月份与今天使用设备当地日期；日期详情继续读真实服务。固定42日期、十类标记、无障碍标签保留，不复制演示概览。
- 原Progress一级14px、周期日期12px、稳定data-navigation-id、预备节点ID/ARIA隔离、原节点晋升和独立滚动保持。
- 只改src/main.ts局部容器归属及approvedInteraction.css的日历触摸约束；不改其他CSS、业务服务、数据、DB13/IDB130/22表、Backup14/Restore1–14/Sync1。

验证和失败保留见[QA](CALENDAR_GESTURE_FIX_V1_QA.md)。自动化WebKit不是实体iPhone。
