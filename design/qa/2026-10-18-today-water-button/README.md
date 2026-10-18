# 今日饮水按钮视觉小修复：实际本地证据

用户2026-10-18直接批准最小视觉修复，无需新原型。START/main为57a58bfe32114af32a8b9fe19afe6b3fbb9e7f93。产品只改recovery.ts一处HTML class和recovery.css删除一条重复视觉尺寸规则；main.css和全部事件/服务逻辑不变。source-and-data-scope.json逐文件证明其余源码、16既有fixture及全部批准基准与START原字节相同。

饮水从text-btn改为secondary today-activity-action，保留water-expand-toggle。不能叠加text-btn：它在共享primitives内以相同class优先级重设透明背景/内边距，interaction.css另有text-btn按压透明背景/opacity规则。去掉专用字号/内边距/最小高度重复定义，让现行统一今日按钮规则提供实际字体/尺寸；不更改统一CSS。箭头6px间距和90/270度旋转仍由专用类管理。

before前缀PNG为干净START实际产物；after前缀PNG为2处修复后的本地候选产物（build meta仍为START、local=true），不是未来正式发布截图。390/100深浅色原生水卡及四个同级按钮截图逐项保留；320/430的200%字体图另列。实际已查看深浅色修复前后及窄屏放大图：按钮保持右侧，文字/箭头无重叠，信息允许自然换行，未裁切。

before-receipt.json含双引擎390/100×2主题共4上下文；after-receipt.json含双引擎320/390/430/844×100/200%×深浅共32上下文，均完整执行触摸收起→展开→500ml→Undo→收起，箭头/默认状态/必要显露/锚点/无额外收起scrollBy/22表精确恢复。390/100另比较按压、禁用和键盘焦点。computed-style-comparison.csv为逐属性实际值，不是从CSS源码抄录。

390/100两引擎实测：浅色背景由transparent变为rgb(233,240,220)，深色变为rgb(48,65,42)；左右padding由4/0px变为11/11px，字号13→14px，字重650→700，与体重/睡眠/训练一致；圆角12px、最小高度44px。收起/展开的视觉属性相同，只有箭头转向。按压/禁用/键盘焦点与三个同级按钮逐属性一致。

滚动边界：展开只为显露操作区进行必要定位，成功记录后保持展开及布局锚点。Chromium390 Undo位移0；WebKit390原版与修复版均观察到Undo后-128px位移，未确认底层浏览器原因，不能声称所有平台撤销绝对零滚动。初版新增审计误假设Undo必为0，在未改的START同样失败（原始日志保留）；最终严格比较同引擎/主题的改前后位移，同时保留无新增scrollBy、布局锚点、真实数据与既有全部断言。未修改共享Toast或既有测试，也未降低产品检查阈值。本次不扩大修复范围。

本轮npm test为1081/75，typecheck与生产base构建PASS。5条必要旧回归运行见regression-results.json：uiQualityAudit、uxWaterCascade双引擎均为完整脚本；joint critical双引擎为明确ONE定向模式，各18高度组及危险流程，不能称为重新完成60上下文全矩阵。未把上一轮44条命令结果沿用成本轮执行。所有测试使用隔离合成上下文。

正式Application/END提交、两次CI、线上真实视觉、精确资源/执行SW/同一原合成profile/离线结果在验证后由LATEST_DEV_REPORT.md与本次聊天outputs/water-button-2026-10-18/回执单独记录。实体iPhone Safari/原安装PWA/VoiceOver/真实键盘SafeArea/个人数据连续性与ChatGPT独立验收仍Pending。

归档TXT仅去除行尾空白及末尾空行以符合git diff --check，未改动输出内容；原始.log在本次工作档案保留。截图与JSON/CSV原始数值未改写。
