# 今日饮水底部 Sheet v0.1 QA

日期：2026-10-18。此为Application提交前的本地QA定格；发布部分必须另查`LATEST_DEV_REPORT.md`及本聊天最终交付回执，不能把本文件视作未来CI结果。上一轮改色任务已由用户转述ChatGPT独立核查通过，本轮不重开旧开发。

[批准矩阵](../design/reference/2026-10-18-today-water-sheet-v0.1/04_ACCEPTANCE_MATRIX.md)／[完整本地证据](../design/qa/2026-10-18-today-water-sheet-v0.1/README.md)／[样式与宽度CSV](../design/qa/2026-10-18-today-water-sheet-v0.1/computed-style-comparison.csv)／[真实64上下文](../design/qa/2026-10-18-today-water-sheet-v0.1/sheet-receipt.json)／[44条结果及全部attempts](../design/qa/2026-10-18-today-water-sheet-v0.1/regression-results.json)。

浏览器：Chromium151.0.7922.34、WebKit26.5，macOS/arm64移动模拟；Node24.16.0、npm11.13.0。浏览器模拟不等于实体iPhone；下表PASS仅指实际执行的自动化部分。A11Y/SCROLL中的硬件部分和PENDING项没有被计作通过。

| ID | 状态 | 本轮实际证据及边界 |
| --- | --- | --- |
| BASE-01 | PASS（自动化） | 干净main，fresh fetch/ff-only pull，START=120cb0624d0efa06b7ff7ce638e7d02104d4d62c；提交前再fetch |
| BASE-02 | PASS（自动化） | 14条SHA256、13条FILES条目全部一致；唯一HTML b611db…；390深浅原型实际快捷/自定义/历史/参考/Undo操作 |
| UI-01 | PASS（自动化） | 真实Today无SVG/aria-expanded/卡内动作区，普通secondary today-activity-action右侧按钮 |
| UI-02 | PASS（自动化） | 390/100双引擎深浅四组，四按钮均92px，正常/按压/禁用/键盘轮廓含颜色均一致 |
| UI-03 | PASS（自动化） | 双引擎64上下文：320/375/390/430/844，100/140/200%，深浅，另加480px短屏；截图与几何 |
| SHEET-01 | PASS（自动化） | 真正native dialog、单个Sheet、遮罩、title初始焦点、卡高/布局锚点不变 |
| SHEET-02 | PASS（自动化） | 两个等宽等权500/1000；44px或随字体自然增高、窄屏堆叠、内部滚动可达 |
| SHEET-03 | PASS（自动化）；真机Pending | 同dialog自定义Back及重入空值，16px以上输入，保存成功整Sheet关闭；420px键盘为模拟 |
| SHEET-04 | PASS（自动化） | 真实参考值同Sheet子视图；历史仍由Today/Trend附近History入口访问，保留旧编辑/删除 |
| SHEET-05 | PASS（自动化）；真机Pending | X/Backdrop/原生ESC无写入，键盘返回原入口；真实iPhone系统手势未执行 |
| SHEET-06 | PASS（自动化） | 双调用一dialog；Back保留父节点；重开快捷页、没有未提交值残留 |
| WATER-01 | PASS（自动化） | 真实tap500→唯一ID/本地日期/实际累计→关闭→精确Undo，全22表还原 |
| WATER-02 | PASS（自动化） | 真实1000正常路径及失败后retry；原UX/本轮busy都验证独立单条 |
| WATER-03 | PASS（自动化） | 自定义333/444/777、服务重试与双提交、父Sheet关闭、精确Undo |
| WATER-04 | PASS（自动化） | 空/-1/0/1.5/100001原合法性；注入实际IDB add配额失败，零写入、错误、保留444、恢复后可保存 |
| WATER-05 | PASS（自动化） | 快捷double click、form两次requestSubmit只生成1条；重新打开不是全局节流 |
| WATER-06 | PASS（自动化） | 每轮完整22表对象比较；跨午夜新ID日期10/19，Undo仅移除该ID，其他行完全相同 |
| WATER-07 | PASS（自动化） | foodRecovery、trainingRecovery、F1–F5真实历史编辑/精确删除与参考值跨标签；参考值2800不写WaterLog |
| PROG-01 | PASS（自动化） | 共享Progress原入口、Back、离线自定义、成功整体关闭、选中事实/三图独立；unifiedExperience全65上下文 |
| SCROLL-01 | PASS（自动化）；真机Pending | 背景fixed lock/关闭复原、Sheet body滚动、键盘/34px安全区模拟；真实硬件仍Pending |
| SCROLL-02 | PASS（自动化） | START Chromium0/WebKit-128；新Sheet路径64上下文0；没有声称旧问题已修复。430/120新Toast遮挡用仅饮水8px缓冲修复，默认32不变 |
| A11Y-01 | PASS（自动化）；真机Pending | native dialog/aria-labelledby/haspopup/title/Back/X/键盘焦点返回/44px/大字，VoiceOver真实验收Pending |
| DATA-01 | PASS（自动化） | 279文件保护核对，仅3个产品文件变更；DB13/IDB130/22、Backup14/Restore1–14/Sync1/envelope1不变，16旧fixtures及批准基准未变；原合成profile22表与8配置/离线基线PASS |
| REG-01 | PASS（自动化） | typecheck、1081单测/75文件、生产base构建、44旧完整命令+joint双引擎ONE定向2条、新64场景；V7真实SW升级/离线。旧习惯打卡前提FAIL及修正前提后的双引擎完整复跑分别保留 |
| REL-01 | Pending | 本文件冻结于Application提交前；提交、非强推、对应CI与Pages实际结果在LATEST和最终交付回执，不预写未来成功 |
| REL-02 | Pending | 同上；END仅LATEST，自身SHA/CI/资源/App/SW/原合成档案/离线结果由提交后实际证据记录 |
| PENDING-01 | Pending | 实体iPhone Safari/原安装PWA/VoiceOver/真实键盘和Safe Area/个人数据连续性未执行；ChatGPT独立验收在交付后进行 |

## 原型与正式组件差异

保留项目原生Sheet、44px标准快捷控件、生产色彩token/字体、明确真实本地日期与事实说明；原型的78px入口和66px快捷按钮是演示测量，不硬编码进产品。四字入口实际92px且与同级完全一致；自定义/参考值复用成熟同dialog Back子视图；历史沿用真实分页History Sheet。符合设计锁对复用现有体系的边界，没有复制演示1750ml或10000ml验证上限。

## 失败与复测

初始路径配置、WebKit mobile wheel API、动画/关闭首帧测量的测试方法问题均留存原始失败，最终审计保留同样严格的几何/数据断言。新Sheet430/120确实暴露Toast遮挡体重动作，START同条件额外探针通过；仅新饮水Sheet使用8px控制缓冲，其他Toast仍默认32。针对红/绿、dailyRecords完整65上下文和最终64场景均通过。

最终B首批44条为43 PASS/1 FAIL。approvedJointV05 WebKit的实际超时点是习惯打卡，不是早期误判的媒体模拟。START与不改测试的独立复跑也能复现；原克隆夹具把历史打卡日期改成当天，实测点击前true、正常点击后false，因此固定等待true是错误前提。仅测试克隆保留历史打卡日期，新增今天false前提断言，真实tap后严格验证true/opacity=1/新增唯一ID与当天日期、旧行全部精确保留；图标的既有有限过渡完成后再检查最终opacity。未改冻结fixture、习惯或外观产品，也未延长超时；多余媒体调整已撤回。修正后Chromium/WebKit完整各17显示上下文复跑，全部尝试与原始FAIL保留。44条是逐个完整命令的最终通过，不表示首批零失败，也没有把单套复测冒充全部矩阵重跑。

旧卡内展开WebKit Undo -128px本轮重新测得；新Sheet64场景路径0px。不同路径不能视作已解决旧共享Toast滚动或实体iPhone问题。

## 数据保护

无迁移、无Backup/Restore/Sync格式变更。只有UI三文件：recovery.ts、recovery.css，以及ActionToast的可选controlGap；其他276个受保护源码/fixtures/批准参考逐字节不变。新鲜隔离上下文的明确新增/Undo与同一原合成生产profile的只读升级检查严格分开，未使用个人PWA健康数据。原合成profile在START重开及离线：22表hash `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`，8设备配置hash `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。Application和END后重复核验的实际结果见正式交付证据。
