# Progress 布局回归 v2 · 发布前冻结证据

[实施合同](../../../docs/PROGRESS_LAYOUT_V2.md)、[逐项QA](../../../docs/PROGRESS_LAYOUT_V2_QA.md)、[冻结修复指令](../../reference/2026-10-29-progress-layout-v2/README.md)。本轮独立证据，既有v0.9原件与旧QA不改。

- [有效门槛及所有实际调用](effective-coverage.json)：89份有效suite-call全部PASS；97条调用保留5条FAIL及复验来源，不冒称一次全绿CI。
- [测量前后](measurements-summary.json)、[148场景几何汇总](matrix-summary.json)、[181产品源摘要](candidate-source.json)、[断言保护核查](assertion-guard.json)、[三图完整矩阵实测](trend-height-summary.json)、[主导航实测汇总](navigation-summary.json)。
- [完整原始JSON/日志归档](raw-evidence.tar.gz)，[原始解压内容SHA索引](RAW_INDEX.json)。tar内路径与索引一致；其中gzip成员须先解压再按rawSHA256校验。全部31个runner来源（12+4+14+1）、原始失败、逐场景测量、metadata及运行脚本保留。
- [实际原图对照页](visual/comparison.html)、[对照接触表](visual/contact.png)。393×852/100%/Classic浅色、同合成日期2026-09-28；before冻结START，after最终候选。接触表仅缩略排版，原PNG可独立打开。
- [旧版滑动75%](negative-final/chromium-393-852-100-classic-light-no-preference-calendar-frame-0.75.png)、[修复后75%](verified-frames/chromium-393-852-100-classic-light-no-preference-calendar-frame-0.75.png)、[修复后落位100%](verified-frames/chromium-393-852-100-classic-light-no-preference-calendar-active.png)。
- [旧日报预备](date-frames-visible/chromium-before-day-prepared.png)、[新日报预备](date-frames-visible/chromium-after-day-prepared.png)；对应CSS、字体和文字相对按钮中心偏移在原始归档中，水平滑动进度可能不同，文字中心量与页面平移独立。

原型双引擎四宽实际重新运行，批准HTML SHA不变。这里的PNG为本地/候选测试证据，不称正式Pages截图或实体iPhone。正式两次CI、App/SW/离线与同历史合成profile另见[最新报告](../../../LATEST_DEV_REPORT.md)及最终交付回执。实体设备/原PWA/IME/VoiceOver/个人连续性Pending；旧WebKitUndo−128px未解决。
