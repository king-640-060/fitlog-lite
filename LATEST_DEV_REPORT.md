# FitLog Lite Development Report — 自动份量与模板取消选中 v0.2.1

开发日期：2026-10-21–22（Asia/Shanghai）；实际执行时间见原始日志。已完成用户批准A/B、完整本地门槛、Application CI/Pages与真实线上检查。本文件为独立END文档提交；其自身SHA、第二次CI/Pages及身份在提交后检查，由最终十项回执记录，不预写未来成功。

## Git与批准基准

- START：`87de0ee15eb583f5b8e1f16a86ee28c0f27add4e`，干净main、fresh fetch/ff-only，提交前再次核对远程，不覆盖他人修改。
- Application：[`c1dcc087ffa19a0ccf424df8c79c078390841fb9`](https://github.com/king-640-060/fitlog-lite/commit/c1dcc087ffa19a0ccf424df8c79c078390841fb9)，正常非强推main。
- [Application CI/Pages](https://github.com/king-640-060/fitlog-lite/actions/runs/39711242808)：实际success，1115单测/TypeScript/生产build/Pages deploy通过。[正式站点](https://king-640-060.github.io/fitlog-lite/)。
- [批准包](design/reference/2026-10-21-auto-portion-goal-deselect-v0.2.1/00_README_请先阅读.md)：22原成员逐字节归档，21SHA条目/20FILES及ZIP CRC/尺寸匹配；唯一批准HTML SHA256 `4b7ffe5034d7f2984acaf68891541edd8be472cfc3b7c5c5e235b01278d6383e`。ZIP计算摘要`4fde00e22fa65f1aaabd6fe86e00ce8f169565ef11f1ec811f2264f35b7764ab`；未另给外部ZIP摘要，不冒称外部一致。批准原型两引擎390浅深/320浅实际运行6上下文，旧版只归档。

## 实现与边界

仅7个产品文件：指定食物Sheet、goal picker、两份局部CSS、designatedNutrition/completeNutrition及既有采用服务。A先选1–4真实Food，再按所选业务日期的已保存Target和FoodLog不可变快照计算。确定性原solver增加opt-in完整所选约束，绝不悄悄省略/增加Food；建议每种20–400g/合计800g/5g，过大最低总量也拒绝。真实referenceGrams、品牌和独立kcal，未知不作0、已超有代价，显示实际差额和折中；无目标/已达/成分缺失/不可行均明确手动回退。

人工调整即时只读预览，原始分数精度保留；实际摄入严格正有限每种1000g/合计2000g，不能manualPortions无限绕过。仅确认实际吃下再选餐次调用原logFood事务。事务核对捕获日期/完整选择白名单/当前Food及target+logs签名，陈旧、并发、重复、配额失败保护；失败保留选择/数量，不半数落库，未来不写实际。

A保留两步DOM、固定摘要/横向chips与独立原生列表，checkbox只更新勾选/摘要/CTA，不重建列表/替换body/补偿滚动。Back恢复query/scroll/focus。既有共享Sheet/footer/viewport生命周期；短屏键盘空间不足时沿用模板编辑器模式让同一footer进入原body滚动，返回文字不拆单字，不改全局Sheet/viewport/Toast。

B默认null的当前Sheet草稿，点击选择、同一行取消、另一行替换；20px圈/10px点/已选中/aria-pressed，整行44px，Continue无选择禁用。真实有效阶段中性说明、已保存目标来源独立；删除当天目标后重开不伪选中。选择/取消/关闭22表零写入。Continue才经过原真实阶段判断、必要启用确认、日方案和独立当天应用确认；不结束阶段、不删除历史。

## Automated Verification

- `npm run typecheck`、`npm test`、Pages base生产构建PASS；77文件1115/1115（原1088+27）。原数值/数据断言保留，四份旧浏览器脚本仅适配新批准导航。
- 最终固定171源文件/63浏览器脚本hash，完整44既有命令最终PASS；原失败、中断及复跑日志另外保存，不将部分早期批次算最终。
- 新矩阵Chromium151.0.7922.34/WebKit26.5，40上下文：320/375/390/430×100/200%×深浅+短屏2/横屏2；另8边界上下文强化键盘输入上下缘和确认按钮可达。20px/44px/16px、深色/原生缩放、同DOM/query/scroll/focus/Back、readonly22表、餐次、陈旧、第二笔写入失败及重复提交通过。
- 实际可见坐标点击/取消：list scrollTop最大差0px，事件→下一帧0px，列表top差0px；无列表子节点重建。START旧版列表下移161.047px Chromium/153.063px WebKit。没有用check()自动滚动或强制复位制造通过。
- 原营养目标40上下文、keyboard/草稿2、饮水64全PASS；joint两引擎各1上下文/18高度场景，三独立趋势7/30/90及原子范围删除/回滚/并发、报告区间双引擎均通过。明确ONE定向，未冒称重跑旧60组joint全矩阵。
- 新27单测覆盖1–4完整ID/参考重量/独立热量/未知0/历史快照/不可达/已超/手动边界；真实两个数据库连接同时采用只一组，陈旧日期/白名单/food变化/二写回滚均保全22表。Backup14/Restore1–14/Sync1及原44回归保持。
- V7与本轮真实START资产升级、离线/提示/明确reload及草稿保护另验。测试Provider均为mock，非真实服务验收。

早期问题及证据：预览服务器初次缺Pages base使JS未启动；Playwright.check先自动滚动、第五check因产品正确拒绝而报错、strict多元素locator、合法横向chip/可见行范围均修正测试工具定位，未削减原数据断言。复查补入最低总量上限；截图发现200%返回单字换行，修正局部footer并强化键盘上下边界。两批早期完整回归被主动停止，最终候选重新完成全部门槛。原FAIL/中断保留。首批44有14项失败（主要为点击/等待超时），额外动效复跑也有超时；不改产品或原数据断言复跑完整范围。另适配V4旧手填文案、预览Back/手动回退/隐藏DOM可见性和未来预览导航，保留原真实ID、未知、零写入、陈旧拒绝和记账断言。所有原失败和每次复跑均保留，未声称修复无关模块缺陷。

## Visual / Production Verification

实际查看批准原型与正式候选浅深、窄屏200%、短屏/横屏截图。20px尺寸与状态一致，正式项目使用现有tokens/44px控件/最高820px大Sheet，真实日期与食物/营养值；不复制演示小按钮/虚构数据。计算样式与原型对照、基线及逐步几何见[本地冻结QA](design/qa/2026-10-21-auto-portion-goal-deselect-v0.2.1/README.md)、[执行QA](docs/AUTO_PORTION_GOAL_DESELECT_V021_QA.md)。

Application正式JS/CSS hash/字节数与本地干净构建相同，SW全文/precaches/build-info一致且local=false，App/SW=`c1dcc087ffa19a0ccf424df8c79c078390841fb9`；正式A/B双引擎40上下文、旧目标4及键盘草稿2实际PASS。线上测试仅通过外部QA启动器复用已有7897 HTTPS代理，本地绕过、TLS验证保留，不改变系统设置或产品。

同一专用合成生产profile从START→Application无reset/reseed/Restore；在线重开和离线冷启动22表hash`049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置hash`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`完全一致。未操作个人健康数据。

## 数据合同与END

DB稳定fitlog-lite-db / Dexie13 / IndexedDB130 /22表；Backup14/Restore1–14/Sync1/envelope1无迁移/格式变更。315个既有source/reference/fixture核对，仅7个授权产品文件变化，其他308项及17冻结fixtures不变；报告、周期、范围删除、计划、水和所有健康记录服务未改。Markdown链接、diff --check、范围及QA hash清单通过。

END仅本报告。其第二次CI/Pages完成后再核精确资源/App/SW、同原合成档案与离线，A/B双引擎8边界、旧目标4/键盘2；不预称成功，不冒充再次40上下文。最终SHA/两次CI/正式资产与真实结果在外部十项交付回执。

## Manual Device Verification / Pending

实体iPhone Safari、原安装PWA、真实键盘/Safe Area、VoiceOver、个人数据连续性、真实Provider和本轮ChatGPT独立核查Pending。浏览器WebKit/模拟键盘/合成Chrome档案不能代替。A11Y-01设备部分Pending，浏览器部分通过。已知旧WebKit饮水Undo−128px未声称本轮解决；上一轮用户结案及F1–F5的用户36/36等历史验收不重开。

## ChatGPT Baseline

本轮仅[自动份量与模板取消选中v0.2.1](docs/AUTO_PORTION_GOAL_DESELECT_V021.md)。A自动推荐是对旧v0.5手填前置的局部新批准；B取消仅UI草稿，真实phase/Target不随之变化。候选QA在Application前冻结，发布REL由本文件及最终真实回执补证。

本地工作`work/auto-portion-goal-deselect-v021/`；十项回执、文件清单、两次CI、截图/测量/数据报告、全部原FAIL/中断/复跑与校验ZIP在`outputs/auto-portion-goal-deselect-v021/`。fresh fetch核对最终main。完成最终发布验证后停止，不继续新功能，等待ChatGPT独立核查。
