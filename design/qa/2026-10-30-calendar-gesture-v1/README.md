# Calendar Gesture v1 · 冻结发布前证据

[实施合同](../../../docs/CALENDAR_GESTURE_FIX_V1.md)、[QA与失败归因](../../../docs/CALENDAR_GESTURE_FIX_V1_QA.md)、[批准原型](../../reference/2026-10-30-calendar-gesture-v1/README.md)。正式发布身份、同一合成profile及离线后验见LATEST_DEV_REPORT和本轮最终回执；这里不预填提交后的结果。

- [最终矩阵实测](final-matrix-summary.json)：最终成功CI8分片/148上下文，9324正文手势、46620中间帧，页面及内部X最大位移0，2368顶部手势帧，已过方向阈值的跟手误差约0.000025px；未达12px判向阈值保留原pending，不应误计作跟手失败。
- [完整调用对账](current-summary.json)：109条实际调用保留3条FAIL，99个有效suite-call全部PASS；原91个详细/既有调用加最终8矩阵分片。不是99个独立功能，也不是一次全部全绿。28份181产品源manifest与实际候选源码相同。
- 完整本地基础148上下文和额外148真实空白上下文另存原始结果；后者15540正文帧、每次起点必须命中真实背景。默认详细双引擎另含慢拖停住、20轮回返、实际有/无记录日、闰月/跨年和零写。原v2布局、报告/趋势/危险事务、数据兼容等原门槛本轮实际执行。
- [原始JSON/日志分片及整包哈希](raw-evidence-parts.json)、[原始文件校验索引](raw-index.json)、[输入核验](input-verification.json)、[范围与本地链接检查](scope-links.json)、[脚本源摘要](local-source-manifest.json)。压缩包按512KiB无损分片，使用[校验/恢复脚本](restore_raw_evidence.py)验证全部分片、拼接整包及原始文件SHA256。运行python3 restore_raw_evidence.py可只核验，附加输出目录才恢复原始文本。拼接压缩包是路径→原始UTF-8文本的JSON映射，按raw-index恢复并验证SHA256；无需依赖外部临时Actions保留期。
- [截图对照](visual/comparison.html)。所有产品截图为隔离合成数据的实际浏览器输出；这里的候选截图不是正式Pages截图。Approved原型只定义交互边界，不复制假状态栏、演示数值、可变行数、月概览或缩放限制。
- 历史`.mjs`按原始字节归档用于hash核查。完整运行需使用对应Git来源的tests/browser位置及其原始辅助模块/fixture；不要把证据目录中的历史副本当作新的独立测试入口。

Chromium为实际CDP touch，包含74上下文真实上下原生滚动；WebKit为合成touch仲裁与独立scrollTop能力，不能宣称iOS真实触摸。实体Safari、原安装PWA、VoiceOver、真实键盘/Safe Area、个人连续性/Provider均Pending。旧WebKit水Undo−128px未修。

私人用户录屏及解码帧不在本公开归档；只保留源文件哈希。未包含收集器传输日志/临时签名下载URL，也未操作个人数据。

四份含原始空白的冻结输入/运行输出使用根.gitattributes精确路径设置-whitespace，保留原始SHA字节；其他产品/测试/文档继续正常git whitespace检查，不修改原始验收矩阵或日志以凑检查。

Git HTTPS多次408、单大对象接口400后，发布前仅调整本归档的传输容器为有序分片；拼接原压缩包SHA不变，1985份原始内容字节不变，原单文件另存本聊天最终交付ZIP。产品及批准原件未改。
