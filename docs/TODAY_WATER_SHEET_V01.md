# 今日饮水底部 Sheet v0.1 实施合同

2026-10-18 用户直接批准的独立开发任务。[原始说明](../design/reference/2026-10-18-today-water-sheet-v0.1/00_README_请先阅读.md)、[设计锁](../design/reference/2026-10-18-today-water-sheet-v0.1/02_APPROVED_DESIGN_LOCK.md)、[集成数据合同](../design/reference/2026-10-18-today-water-sheet-v0.1/03_INTEGRATION_AND_DATA_CONTRACT.md)、[验收矩阵](../design/reference/2026-10-18-today-water-sheet-v0.1/04_ACCEPTANCE_MATRIX.md)保留原字节。唯一批准 HTML SHA256：`b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`。本合同仅替代此前 Today 水卡内 disclosure/箭头/显露机制；上一轮按钮颜色修复已经用户转述 ChatGPT 独立核查通过，不重新打开。

Today 右侧普通「记录饮水」复用 `secondary today-activity-action`，无图标、无 `aria-expanded` 或虚假折叠区，`aria-haspopup=dialog`。不得缩字、压缩 padding、给其他按钮加占位或硬编码原型的78px。默认390/100%时与体重、训练、空闲睡眠的四字次级按钮实测宽差≤1px。字体放大允许信息自然增长，但操作仍在右侧，触控≥44px。

Today 与 Progress 调用同一个 `showWaterRecord`，由共享原生 dialog / Sheet / VisualViewport / scroll lock 管理。内容尺寸、标题初始焦点、底部弹出、等权500/1000与次级自定义/参考值采用既有组件和语义 token。自定义和参考值用现有 historySubview 在同一 dialog 内进入/返回，保留 Back/X；历史沿用首页旁的真实分页 History Sheet。正式界面保留既有44px快捷控件和服务说明，不照搬原型66px演示按钮、模拟导航/日期/日志或演示10000ml阈值。字号随系统放大，输入≥16px，无私有键盘监听。

快捷和自定义成功均关闭整个录入 Sheet，实际累计由 liveQuery 更新。失败保留 Sheet/输入，忙碌保护拒绝重复提交；重新打开恢复快捷视图。普通关闭不写入。键盘关闭返回当前 Today 入口；数据重绘保留该入口已拥有的焦点，不抢其他控件焦点。共享 Toast 继续按刚新增的真实 WaterLog ID 撤销，跨午夜也只删该ID。参考值仍是设备配置，不写日志；取消不改数据。

保留 `addWater` / `validateWaterLog` / `deleteWater` / `waterUndo`，本地业务日期及上限由原服务确定。数据库13/IDB130/22表、Backup14/Restore1–14/Sync1/envelope1及设备配置边界均不变，无迁移。除明确新增/撤销的 waterLogs ID，其余21表和旧饮水行保持完整。三张趋势及全部内部7/30/90高度、两类报告、原子区间删除、计划及健康记录语义不改。

旧 WebKit 卡内展开后 Undo −128px 是已知遗留。新 Sheet 路径需重新测量，不将不同路径的0px称为修复共享 Toast；共享滚动、Toast和Sheet框架不在本轮重构范围。浏览器模拟、物理设备、ChatGPT独立验收分开记录。实际证据见[本轮QA](TODAY_WATER_SHEET_V01_QA.md)。

新 Sheet 回归在430px/120%暴露了关闭后Toast遮住体重操作：旧Disclosure同条件的额外遮挡探针不复现。局部补救为现有 `ActionToastOptions` 增加可选控制间距，默认32px保持；只有共享饮水录入Sheet的快捷/自定义反馈显式用8px，以利用原被32px缓冲排除的真实空隙。所有交互控件本体仍被避开，不改滚动、计时、焦点、精确Undo或其他Toast调用默认行为。保留初始失败、START额外探针与实际绿灯证据，最终候选重新执行完整工程及浏览器门槛。
