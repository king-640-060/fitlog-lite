# FitLog Lite Development Report

日期：2026-10-30（Asia/Shanghai）。本轮：已批准 v0.9 Progress 布局回归修复 v2。

## Git 与发布阶段

- START：`0a95f675412a4b1c6d18f745c10e40dc6f4d4a5e`。开始和提交前均 fresh fetch，main/origin 无分叉，未覆盖其他修改。
- Application：`0af60a6d1969c7fbf8eed1b035d92a333fb51e48`，正常非强制推送 main。[正式 CI / Pages success](https://github.com/king-640-060/fitlog-lite/actions/runs/40967670265)。
- 本文件是独立 END 归档；END SHA 为本文件所在提交。按既定协议，提交后还要验证该 SHA 的 CI、实际资源、App/SW 和离线/原合成档案，不把尚未执行的 END 检查写成 PASS。最终实测 SHA、第二次正式 CI 和检查结果由本轮最终交付回执列明，并可通过 fresh fetch HEAD / Actions 独立核对。
- 正式站点：[FitLog Lite](https://king-640-060.github.io/fitlog-lite/)。Application 已发布且实际检查通过；实体设备和 ChatGPT 独立验收另列。

## 实现及批准基准

遵循[修复合同](docs/PROGRESS_LAYOUT_V2.md)、[原始 v2 指令](design/reference/2026-10-29-progress-layout-v2/README.md)、[逐项 QA](docs/PROGRESS_LAYOUT_V2_QA.md)。唯一 v0.9 HTML SHA256 仍为 `d41171fc85af521cd6d6c1b3a7a249eb20aee369941296a117ee474d261f480d`，本轮双引擎四宽实际重新运行；原件未改。

产品仅改 `src/main.ts`、`src/styles/approvedInteraction.css`：日历三个控件和日报日期补稳定 data-navigation-id，保留原 ID/ARIA/事件和预备节点隔离/原 DOM 晋升。一级 stage 唯一拥有14px间距，趋势/日历/报告一致；报告类型去掉重复顶部 margin，保留其12px底部间距；周期 stage 到日期行12px。最低高度探针计入真实轨道 margin，保留44px净操作区和20px内底部 padding、原生外层滚动。

旧版393px月头预备88px→活动48px、月历顶部跳40px；新版48→48px、差0。旧日报预备文字偏左87.19/87.55px，修复后约0/0.008px。148个最终场景首层14px、日期12px、父导航最大位移0，最小叶页总高度64px。详见[实测](design/qa/2026-10-29-progress-layout-v2/measurements-summary.json)、[矩阵](design/qa/2026-10-29-progress-layout-v2/matrix-summary.json)和[实际原图对照](design/qa/2026-10-29-progress-layout-v2/visual/comparison.html)。图表、报告分析、计划、主Tab、数据库、服务、冻结fixture和旧原型不改。

## 本轮实际自动化与首败

本地 Node24.16.0、Chromium151.0.7922.34、WebKit26.5；独立macOS runner固定 Playwright1.62.1，实际版本/来源元数据保留。只使用新隔离合成上下文、虚拟 Provider 和既有专用合成 Chrome profile，没有个人健康记录或真实 Key 操作。

- TypeScript、80文件1199单测、生产 build PASS。
- [89份有效 suite-call 对账](design/qa/2026-10-29-progress-layout-v2/effective-coverage.json)全部 PASS，覆盖上一轮85份门槛及4份新专项。97条实际调用保留5条失败及具体复验来源；不是89个独立功能，也不是一次全绿 CI。31份候选 runner 的181个产品源摘要逐文件匹配 Application。
- 最终双引擎148场景：四宽×100/140/200×Classic浅深/Native×normal/reduced，另每引擎两种短横屏。393px原生 Chromium CDP touch / 明确标记的 WebKit 合成 touch、中间帧、每引擎20轮三页往返、独立滚动、真实冷 IDB 读取/可见加载稳定性 PASS。隐藏未就绪占位不冒充已布局屏幕坐标。
- 主导航实测52几何上下文、444预备→活动边界及资源/状态门槛 PASS。完整三图十宽度分片合并60上下文、1080组九字段，7→30→90→7高度最大差0；390/浅色/100%的两引擎执行全部8项危险事务/并发保护。[三图汇总](design/qa/2026-10-29-progress-layout-v2/trend-height-summary.json)说明 selectedWidths 导致的 diagnostic 标记不缩减分片的字体/主题覆盖。
- 首跑空宽度参数、跨上海午夜的语义用例、旧 Edge 零滚动起点假设均保留。Edge 远程实际 screenY102+scrollY2 = screenY46+scrollY58 = documentY104；改为原子测量两端文档坐标，1px阈值不变，新增x/width/height检查，其余16条业务断言 AST 相同；未归因2px漂移仍被拒绝。修正后六场景 CI 和本地通过。
- 86个修改文档本地链接、diff --check、保护路径/范围检查通过；冻结证据72个文件校验项、1956个解压原始 JSON/日志摘要通过并入 Git。

## Application 实际线上结果

14项有效后检 PASS：12项真实 HTTPS 检查、1项真实旧构建升级 harness、1项原本机历史合成 profile。

[实际 Pages 四分片](https://github.com/king-640-060/fitlog-lite/actions/runs/40972596817)的12项 HTTPS 检查全部通过，包括15个静态文件逐字节/SHA、双引擎布局/触摸/原有功能、管理两外观、UI总审计、导航和报告。该轮升级 harness 首败保留，不宣称整轮CI全绿。

[升级完整复验 success](https://github.com/king-640-060/fitlog-lite/actions/runs/40980661509)：真实V7和真实START0a95构建升级至0af，15条旧记录、AI配置、未保存图片/草稿/待确认提案、其他客户端、取消、一次明确 reload、深色离线冷启动均通过。QA harness 原有 async waitForFunction 谓词会提前完成；改为已取得 registration 的同步状态轮询，并要求本次 waiting worker 真正成为 active。全部36个原业务断言 AST 完全相同，未修改产品SW/迁移代码。原始三次 harness 失败及严格等待脚本来源在最终交付证据保留，不将等待错误冒充数据迁移失败或通过。

本机初次部分浏览器操作受07:14–07:16 Maintenance Sleep/DarkWake中断，原失败保留，不计PASS；改由云端实际HTTPS复验，不强制点击或跳过断言。原本机专用合成profile的独立检查已通过：App=activeSW=`0af60a6d1969c7fbf8eed1b035d92a333fb51e48`，离线冷启动 PASS，未reset/reseed/Restore。22表摘要 `049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置摘要 `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34` 与START完全一致。END仍要按最终SHA重新验证，不能沿用此Application身份。

## 数据、证据与待验边界

DB13/IDB130/22表、Backup14/Restore1–14、Sync/envelope1保持。真实旧客户端0a95 Restore/Export→当前客户端→Backup14/加密Sync1→旧客户端，双引擎22表精确往返通过。未改依赖、schema、服务、历史快照或既有删除合同，未操作个人原安装PWA/健康记录。

[冻结证据入口](design/qa/2026-10-29-progress-layout-v2/README.md)保存负例、测量、截图、原始结果、失败和来源。Application/END实际后检及正式十项回执另外归档在本聊天工作区 `outputs/progress-layout-v2/`；最终交付提供可打开的文件及真实CI链接。

Pending：实体iPhone Safari、原安装PWA、真实系统键盘/IME/Safe Area、VoiceOver、个人数据连续性、真实Provider及ChatGPT独立核查。浏览器模拟不能代替真机；旧WebKit饮水Undo−128px现象未在本轮解决。本轮不开始其他UX开发。

ChatGPT Baseline：先读AGENTS、本报告、CHAT_CODEX_WORKFLOW、PROGRESS_LAYOUT_V2及QA，再fresh fetch核对main/HEAD、两次正式CI和最终线上身份。已有v0.9业务合同不变；本轮完成正式发布后停止，等待独立核查。
