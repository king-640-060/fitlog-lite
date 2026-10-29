# Progress v2 QA

本文件随Application归档发布前证据；最终Application/END、正式CI和实际线上结果以[最新报告](../LATEST_DEV_REPORT.md)及最终交付回执为准。不得将候选验证称为正式发布。

START：`0a95f675412a4b1c6d18f745c10e40dc6f4d4a5e`，fresh fetch main=origin/main，工作区干净。

执行入口：[修复合同](PROGRESS_LAYOUT_V2.md)、[冻结指令](../design/reference/2026-10-29-progress-layout-v2/README.md)。完整原始JSON、截图、computed style、日志及来源记录归档在[本轮证据](../design/qa/2026-10-29-progress-layout-v2/README.md)。

## 验证状态

发布前自动化PASS。Node24.16.0，本地Chromium151.0.7922.34/WebKit26.5；独立macOS CI固定Playwright1.62.1及Node24.16.0，逐runner元数据和181份产品源摘要均归档。只使用新隔离合成上下文及既有专用合成profile，未操作个人健康数据。

- `npm run typecheck`、80文件1199单测、`GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build`实际通过。原单测、DB/服务、依赖/冻结输入未改。
- [完整首跑](https://github.com/king-640-060/fitlog-lite/actions/runs/40899165152)：78调用74PASS/4FAIL，原始失败保留；不宣称一次全绿。两项完整三图调用因为空宽度参数未进入场景，改为十个明确宽度分片；语义测试在上海午夜跨日期超时，未改断言的本地四宽176状态及CI原样重测通过；Edge首败由下述滚动起点假设定位。
- [最终布局/加载专项](https://github.com/king-640-060/fitlog-lite/actions/runs/40901317634)四job success；[既有门槛及完整三图复验](https://github.com/king-640-060/fitlog-lite/actions/runs/40960696579)13PASS/1FAIL，保留Edge同一首败；[修正滚动测量的六场景CI](https://github.com/king-640-060/fitlog-lite/actions/runs/40962649236)success。四轮候选产品源181/181逐文件相同，QA分支/runner不合并main。
- [89份有效suite-call对账](../design/qa/2026-10-29-progress-layout-v2/effective-coverage.json)全部PASS，涵盖上一轮85份门槛及4份新增专项；97条实际调用记录中保留全部5条失败。它不是89个独立功能，也不是一轮全绿CI。

| 验收项 | 实际结果及证据 |
|---|---|
| L01 | 双引擎393px：原生Chromium CDP touch／明确标记的WebKit合成touch，0/25/50/75/近100%预备帧加落位100%。旧版月头88→48px、月历顶部跳40px；新版48→48px、顶部差0，四控件computed style预备／活动相同。 |
| L02 | 每引擎20轮三页往返，日历月头／月历y差0；趋势、日历、报告独立滚动恢复。 |
| L03 | 周→月→自定义→日的逐RAF日期style，另双引擎真实tap预备/活动截图。旧版日期文字偏左87.19/87.55px、24px；新版偏差约0/0.008px、17px，落位不再二次变样。 |
| L04 | 四周期切换，三层父导航rect最大差0px；第三层到日期行恒12px；第二层原12px保留。 |
| L05 | 每引擎74上下文，共148：四宽×100/140/200×Classic浅深/Native×normal/reduced，另各两种短横屏。日期两列等宽、≥44px、不裁切或重叠。 |
| L06 | 两引擎短横屏200%实测；全部周期叶页最小总高度64px（含20px底部padding，净操作区44px），保留原生外层滚动和44px热区。 |
| L07 | 预备/活动宽度及y稳定；真实20轮恢复、stages零scrollTop/Left且overflow为clip，不借邻页高度。 |
| L08 | 原85份有效门槛复验覆盖：拖拽/改名/footer、报告真实数据/删除/回滚、计划/AI/Voice/备份等；双引擎主导航52上下文444边界、资源循环、管理/UI总审计均有本轮结果。三图十分片60上下文、1080组九字段高度差均0。 |
| L09 | 类型/单测/build及兼容性PASS。Application/END和正式Pages是在本文件归档之后执行，实际SHA、两次正式CI、资源/App/SW/离线/同profile结论见最新报告与最终回执；不以候选CI冒充发布。 |
| L10 | 进度初入、日历/报告返回及20轮三页循环：趋势首个真实Weight模块到一级tabs底边均14px，最大差0。 |
| L11 | 148上下文中趋势/日历/报告净间距均14px，第二/三级没有重复一级间距；真实合成长报告和空范围、横屏均覆盖。 |
| L12 | 冷初次原生IDB Weight读取延迟，隐藏未就绪占位单独记录；不把隐藏未布局DOM当屏幕坐标。可见预备与活动首模块恒14px；滚动→切离→返回及实际刷新保留scrollTop，原图表触摸/范围测试保留。 |

三图按十个明确宽度分片合并为完整60上下文。原驱动把任何selectedWidths标为diagnostic=true；此标记不缩减各分片的两主题/三字号。并集覆盖全部五宽×双引擎，1080组九字段差0，390/浅色/100%的两引擎均执行全部8项danger事务/并发保护；不是用一个诊断点代替完整矩阵。

WebKit远程Edge诊断：before screenY102/scrollY2，after screenY46/scrollY58，两端documentY均104；旧断言错误假设起点0。现原子读取两端rect与scroll，比较document坐标，1px阈值不变；新增x/width/height检查。其余16条业务断言AST完全相同，另验证未归因的2px漂移仍被拒绝；不是放宽门槛。

## 不变范围

181份产品源SHA与隔离候选逐一对比。只改main.ts和approvedInteraction.css；DB/服务/localDeck、依赖/lock、冻结fixtures、旧原型不变。旧版预期FAIL和测试驱动诊断保留；新建测试不删改原有业务断言。备份保持DB13/IDB130/22、Backup14/Restore1–14、Sync/envelope1；同专用合成profile不清空/重种/Restore，独立记录App/SW/离线与22表/8配置摘要。

实体iPhone Safari、原安装PWA、真实键盘/IME/Safe Area、VoiceOver、个人数据连续性、真实Provider仍Pending。WebKit旧Undo −128px未在本轮解决。没有把既有真机结论改写为本轮新测试。
