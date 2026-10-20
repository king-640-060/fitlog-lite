# 营养目标与模板 Sheet v0.2 QA

2026-10-20。此为Application提交前的本地执行定格，发布状态由LATEST和最终十项回执补证；不是未来CI或用户验收证明。[原始批准矩阵](../design/reference/2026-10-20-nutrition-goal-sheet-v0.2/05_ACCEPTANCE_MATRIX.md)、[实施合同](NUTRITION_GOAL_TEMPLATE_V02.md)、[可核验本地证据](../design/qa/2026-10-20-nutrition-goal-sheet-v0.2/README.md)。

| ID | 状态 | 实际执行及边界 |
| --- | --- | --- |
| BASE-01 | PASS（自动化） | START fa312427115db55311d9b2d380f0b87d7ac930d9，干净main/fetch/ff-only；19条SHA/18条FILES/20原成员一致；实际390浅深原型运行 |
| UI-01 | PASS（自动化） | 无阶段/已有手动目标仍先真实模板选择器，手动次级，不默认表单 |
| UI-02 | PASS（自动化） | 当前单一使用中、未启用、归档/无日方案禁用、空/全归档状态及创建入口 |
| UI-03 | PASS（自动化） | 手动0值保存/编辑/显式删除；旧营养模板完整回归；仅所选日期事务与陈旧检查 |
| UI-04 | PASS（自动化） | 独立启用确认/取消零写入，前阶段结束于前一天，新阶段唯一；同日冲突安全拒绝 |
| UI-05 | PASS（自动化） | 选真实方案只预览，四项原值/未设，独立明确确认才写日期目标 |
| UI-06 | PASS（自动化） | 手动/策略/周期/饮食模板历史来源和原快照显示；新预览展示已保存与将应用；其他日期保留 |
| UI-07 | PASS（自动化） | 同一dialog/header/body，选择器→新建→方案→父编辑→保存→新模板立即出现 |
| UI-08 | PASS（自动化） | 日方案Save全22表零变化；模板Save仅新template/variant ID；不自动启用/目标 |
| UI-09 | PASS（自动化） | Back/X/遮罩/ESC确认；取消保留草稿，真实配额失败/保留/重试；双提交单份 |
| SHEET-01 | PASS（自动化） | START双引擎复现820→408遗留内联高度；新父/子/键盘关闭返回完整高度、inlineHeight为空 |
| SHEET-02 | PASS（自动化）；真机Pending | 40上下文输入/Save可达、420或短屏键盘模拟；另4组34px Sheet padding及实际旋转恢复 |
| SHEET-03 | PASS（自动化） | 真实header/footer有序、短屏footer随原body滚动、输入上下缘和Save可达、标题焦点和原scroll恢复；旧manager24上下文全量身份与滚动回归 |
| SHEET-04 | PASS（自动化） | 双引擎40组：320/375/390/430×100/200%×深浅加短屏和横屏；另4组安全区/旋转 |
| SHEET-05 | PASS（自动化）；真机Pending | native dialog/标题/Back/X/键盘语义、44px、输入≥16px；真实VoiceOver另列Pending |
| DATA-01 | PASS（自动化） | 每步22表完整对象核对和精确允许对象；其他日期、周期/计划和实际健康事实保持 |
| DATA-02 | PASS（自动化） | 跨标签陈旧目标、同ID阶段变化、方案变化、归档/冲突/跨连接并发及事务回滚；浏览器与新增7单测 |
| DATA-03 | PASS（自动化） | DB13/130/22、Backup14/Restore1–14/Sync1/envelope1不变；全部既有冻结fixture原字节不变；原合成profile基线数据/配置hash与离线PASS，发布后重核 |
| REG-01 | PASS（自动化） | 1088/1088，76文件，typecheck/生产build；44旧完整命令最终PASS，全部attempts保留；新40+4与相邻饮水64，V7真实升级/离线 |
| REG-02 | PASS（自动化） | joint双引擎ONE定向各18高度组、报告自定义日期/陈旧筛选与删除精确存活者、旧Food/周期/Backup/Sync；未冒充旧60组全量joint矩阵 |
| REL-01 | Pending | 本地QA定格于Application提交前，发布与线上实测实际结果由LATEST和最终回执补充 |
| REL-02 | Pending | END仅LATEST；自身SHA/CI与正式身份需提交后实测，最终回执提供 |
| PENDING-01 | Pending | 实体iPhone Safari/原安装PWA/真实键盘/Safe Area/VoiceOver/个人数据连续性；本轮ChatGPT独立核查在交付后进行 |

最终E首批42 PASS/2 FAIL：两个删除后Backup套件的旧客户端资源未映射原/fitlog-lite/ base，旧页面未启动；新版删除导出阶段已通过。只在外部测试服务器映射原目录，逐字节验证原HTML和JS/CSS，两个完整套件不改源码/断言复跑通过。最终E共46个attempt、44条命令全部最终PASS，原失败保留。

初始旧营养模板测试使用已经被批准替代的表单内Save定位，真实按钮已在footer并以form关联；仅更新入口/定位和footer边界，原历史/数值/数据断言保留，完整四宽×三字号共300状态复跑通过。管理工作区首次在等待Sync mock请求处触及15分钟运行限制；未改Sync产品代码或断言，独立390/320诊断及原完整24上下文重跑通过，保留超时原日志，不宣称解决某个Sync产品缺陷。早期候选Vision和Sync旧套件的首次超时及重跑保留在外部原始regression-final日志；本文件regression-results的allAttempts仅统计冻结E批次；没有降低等待断言或改动这两个产品模块。

早期40组通过后补查发现：管理器返回未刷新列表，已新增只读resume刷新；首次同步注册造成回调重入，已改为异步读取后注册。随后实际截图发现横屏200%键盘时输入上缘被标题遮住，已在短视口把所属footer移入原正文滚动，并强化输入上下边界、真实子页标题及Save滚入可达断言。最终候选E重新执行完整44条旧命令、40场景、另4组安全区/旋转及2组草稿键盘测试；此前中断批次仅作历史保留，不计最终通过。没有将浏览器变量模拟等同于真实env Safe Area。所有最终本地截图为候选E、meta仍START且local=true，源码hash对应真实最终候选；正式截图随回执另供。

原型展示720px/模拟日期和两列数值；正式复用项目large最高820px、真实业务日期、单列原目标字段、原管理按钮与footer。父子页保持同一原生Sheet，必要长标题自然换行，不移植演示JS/数据。本轮不改饮水/趋势说明、报告、范围删除、周期语义或共享Sheet控制器。旧WebKit Undo −128px保持历史边界，不冒充本轮修复。本地首次START提示升级因提交前两包Git身份相同而被测试前提拒绝，保留失败日志；V7独立重跑通过，真实START提示升级于Application提交后执行。真实Provider未测，不能标PASS。
