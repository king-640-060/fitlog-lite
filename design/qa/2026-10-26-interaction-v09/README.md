# 交互 v0.9 可核查证据

对应 [批准原型](../../reference/2026-10-26-interaction-v09/DESIGN_REFERENCE.md)、[实现合同](../../../docs/INTERACTION_V09.md)、[首败及39项索引](../../../docs/INTERACTION_V09_QA.md)。正式 Application/END 身份与发布结果见 [LATEST](../../../LATEST_DEV_REPORT.md) 和本聊天 `outputs/interaction-v09` 的十项正式回执。本目录的本地截图不能称为生产截图。

- [批准输入逐文件复核](approved-input.json)：13个SHA条目和14个提取原件一致；原ZIP初次解压记录与本次原件重核分开，不声称重新读取已不在下载目录的ZIP。
- [181个最终产品源文件SHA](source-manifest.json)、[保护路径](scope.json)：最终源必须与独立候选runner、Application完全相同；数据库、格式、原fixture、旧设计不改。
- [原型运行](prototype/receipt.json)：Chromium/WebKit四宽8上下文；[饮食](prototype/diet-390.png)、[训练](prototype/workout-390.png)、[报告](prototype/report-390.png)、[指定食物](prototype/food-390.png)。演示值不是业务事实。
- [修改前与阶段后computed style](visual/before-and-stage-after.json.gz)、[最终修改后computed style](visual/final-after.json.gz)。before是START本地实际构建；after是最终源本地实际页面。两个引擎×Classic浅/深及Native，保留餐次、工作组、报告、选择及预览各状态。示例：[前](visual/before-webkit-classic-light-diet.png) / [后](visual/after-webkit-classic-light-diet.png)、[深色报告](visual/after-webkit-classic-dark-reports.png)、[Native预览](visual/after-webkit-light-native-food-preview.png)。实际业务字段/长名称与演示不同，不能伪称逐像素一致。
- [边界实测](edges/receipt.json)：pointercancel/blur零写、故障保留草稿、空名拦截、合成composition、组及其余21表保真、横屏上一期/返回与滚动可达；[Chromium](edges/chromium-landscape-report.png)、[WebKit](edges/webkit-landscape-report.png)。真实IME仍Pending。
- [旧客户端往返](data/old-client-roundtrip.json)、[Chromium细节](data/old-client-chromium.json)、[WebKit细节](data/old-client-webkit.json)：真实旧Restore/Export→新快照名→Backup14/加密Sync1→旧Restore/Export，全部22表精确比较。
- [同一合成profile发布前基线](data/preservation-baseline.json)：真实HTTPS App/activeSW、22表ID/内容hash、8配置hash和离线冷启动。Application/END同profile与最终线上原始结果在交付证据包，不预写未来成功。
- [C聚合57/25](regressions/candidate-c-aggregate.json)、[D聚合73/9](regressions/candidate-d-aggregate.json)，共82调用；[C原日志](regressions/candidate-c-raw-text.tar.gz)、[D原日志](regressions/candidate-d-raw-text.tar.gz)。保留失败，不伪称单次82/82绿。
- [原断言AST审核](regressions/assertion-audit.json)：14个驱动696原断言，695表达式不改；1条由window改为批准的实际deck-scroll所有者，保留>20px阈值，另增加起点检查。foodWater解剖适配及0.001px测量精度说明见QA。
- [40项排序阶段trace汇总](performance/sort.json)、[报告阶段trace汇总](performance/report-stage.json)。完整原始trace保留于本聊天work/evidence，最终源trace另标注来源，不以阶段样本代表所有最终环境。
- [日志原字节清单](logs/RAW_LOG_COPIES.json)：`.gz`解压SHA匹配原日志，保留首败、重测和真实命令输出；压缩不改内容。

独立QA分支仅用于macOS回归，不发布Pages，不合并它的临时workflow/payload。最终源G的受影响复验及F的全部受影响门槛、完整显示矩阵和实际测量产物通过后再发布；测试结果须读取各产物，不用README文字代替。

物理iPhone Safari、原安装PWA、真实系统键盘/Safe Area、VoiceOver、个人数据连续性、真实Provider和ChatGPT独立核查均Pending。WebKit旧饮水Undo−128px未修复。

最终G：[双引擎完整几何](geometry/chromium.json.gz) / [WebKit](geometry/webkit.json.gz)146/146、[触摸分支](edges/touch-g.json)、[功能/手势/边界/完整统一体验复验](regressions/local-g-retakes.json)、[F至G唯一CSS变化及180源文件保持](regressions/f-to-g-source.json)。[原型四宽三字号运行](prototype/scaled-matrix.json)与生产实现使用相同视口；原型固定px文本仅在浏览器内放大。

[最终G trace](performance/final-g.json)、[压缩原始报告trace](performance/report-final-g.trace.json.gz)、[压缩原始长列表trace](performance/sort-f.trace.json.gz)。解压原字节SHA可独立核对，不以汇总文字代替trace。

[最终主导航52矩阵/444边界](regressions/navigation-flicker-g.json.gz)、[Chromium100切换](regressions/chromium-ownership-g.json)、[WebKit100切换](regressions/webkit-ownership-g.json)、[六个名称Sheet上下文](edges/edges-g-final.json)、[原生触摸跨两行排序](edges/sort-frames-g.json)。`motion/`、`touch/`、`sort-frames/`、`name-sheet/` 保留逐帧与实际输入状态原件。

[最终G CI10/10](regressions/candidate-g-aggregate.json)、[三图60上下文/1080组/九个高度字段最大差0px](geometry/trend-height-summary.json)、[完整原始量测](geometry/trend-height-originals.json.gz)、[85份有效调用覆盖与来源](regressions/effective-coverage.json)。[F原始32调用28/4](regressions/candidate-f-aggregate.json)及[原日志](regressions/candidate-f-raw-text.tar.gz)保留；G实际成功不改写F的failure。

Large original JSON receipts are losslessly gzip archived for reviewable Git diffs. [Original-byte SHA metadata](RAW_JSON_ARCHIVES.json), [146-case readable summary](geometry/matrix-summary-g.json) and [52-case navigation summary](regressions/navigation-summary-g.json) retain the raw archives for independent verification.
