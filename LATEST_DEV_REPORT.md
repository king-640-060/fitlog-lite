# FitLog Lite Development Report

日期：2026-10-30（Asia/Shanghai）。本轮：用户已批准的 Calendar Gesture v1 日历手势稳定性修复。

## Git 与实际发布阶段

- START：`11c058ac6014842a9098443b7b8f304ad6d2d467`，开始及提交前fresh fetch确认main一致，未覆盖他人修改。
- Application：`ef520fe27f971e7a9be23732bddc6623849e0951`，正常非强制Git推送main。[正式CI／Pages success](https://github.com/king-640-060/fitlog-lite/actions/runs/41068614487)。
- Git大包先遇到HTTP408；原单大对象接口400后，仅把本轮新证据压缩包无损分为23份512KiB分片并校验整包SHA。通过对象预传／临时非发布缓存分支后普通Git推送成功，未强制更新main；产品源不变。代码和原始证据均有实际记录。
- 本文件是独立END归档，END SHA为本文件所在提交。按既定两阶段协议，提交后必须再核对对应CI、实际Pages资源、App/SW及原合成profile/离线；这里不提前将未执行的END后验写成PASS。最终实测SHA、第二次正式CI与后验结果由本轮最终回执列明，可fresh fetch HEAD独立核对。
- 正式站点：[FitLog Lite](https://king-640-060.github.io/fitlog-lite/)。Application已实际发布及后验通过；实体设备与ChatGPT独立验收另列。

## 批准基准与最小实现

[合同](docs/CALENDAR_GESTURE_FIX_V1.md)、[冻结输入](design/reference/2026-10-30-calendar-gesture-v1/README.md)、[QA](docs/CALENDAR_GESTURE_FIX_V1_QA.md)。唯一批准v1 HTML SHA256为`4207d932fcfe90d2d4e41d119f3eb28f6f767d0e2f63c83a59804ef94c5df177`，原包6项核验一致，实际运行双引擎原型。私人用户录屏仅在工作区解码查看，未公开上传。

产品仅改`src/main.ts`与`src/styles/approvedInteraction.css`：日历整个原生滚动host在异步读取前即设置data-no-page-swipe；局部pan-y pinch-zoom/overscroll-x:none阻止既有月头光学负边距的原生横滚，保留缩放与纵向滚动。兄弟顶部趋势／日历／报告导航继续原共享跟手／阈值／回弹／取消／点击／键盘；无共享导航重构、新滚动层或业务写入。

START月份标题拖动正文横移100px；仅加边界时发现内部仍原生横滚2px，最终页面及内部位移0。原14px／12px、月头预备→活动稳定ID/ARIA隔离和原节点晋升保留。真实42日期、十类标记、日期详情及服务保持，不复制原型的演示概览、数值、可变行数或缩放限制。

## 本轮实际验证与失败保留

- 最终本地TypeScript、80文件1199单测、Pages生产构建PASS；正式Application CI同样成功。新浏览器脚本calendarGestureV1/loadingV1；既有测试断言／fixture未改。
- [最终完整矩阵CI success](https://github.com/king-640-060/fitlog-lite/actions/runs/41034281432)：8分片、双引擎148上下文，320/375/390/430×100/140/200%×Classic浅深/Native×normal/reduced及短横屏。实际9类起点×7动作，9324正文手势、46620中间帧，页面及内部最大X位移0；2368顶部手势帧，超过原12px判向阈值后跟手误差约0.000025px。
- Chromium74上下文实际CDP上下滚动；WebKit74上下文为合成touch仲裁与独立scrollTop能力，不冒充真实iOS触摸。本地基础148和额外真实空白148审计另存，后者15540帧。空白必须实际命中月头背景／原滚动容器，不能拿今天按钮或图例代替。
- 双引擎详细场景包括650ms按住、1000ms慢拖、650ms停住再释放；键盘、20轮独立滚动／资源／ghost、有无记录日完整Food快照、月切换／今天／详情关闭、闰日与跨年、异步原生IDB完成取消／返回、只读零写及全22表和配置精确不变。
- 99份有效suite-call全部PASS：原91份详细／布局／业务／数据／生命周期门槛加最终8矩阵；109条实际调用保留3条旧矩阵FAIL及复验，不称109次全绿或99个独立功能。28份181产品源manifest逐文件对应Application。原v2、三图高度／独立范围、两类报告、营养范围危险事务、Backup/Restore/Sync等均本轮重跑。
- 旧FAIL含起点坐标与320减弱动效向下滚动。前者改实际DOM背景命中／可见边界；后者旧脚本没有记录方向变化阶段帧，不能声称根因完全查明。最终每次真实CDP move后35ms及RAF、先保存帧再断言，原上滑>0／下滑减少条件未放宽；完整复验及实际HTTPS复验通过。旧失败、脚本SHA与原始结果保留。

## Application 实际后验

12项有效后验PASS：10项实际HTTPS检查、1项同一原本机合成profile、1项真实旧构建同源升级harness。不是12项实体设备检查。

- 实际Pages15个静态文件逐字节／SHA与clean Application构建完全相同，manifest身份保持。线上双引擎日历真实命中／触摸／上下滚动、异步取消、布局v2／旧导航／报告／UI总审计通过。
- 实际V7与真实START11c静态构建升级至ef520fe，原15条旧事实／14原始store、AI配置、图片／草稿／提案、其他客户端、取消、明确一次reload与离线冷启动通过。QA升级harness仅沿用更严格的live registration＋同步worker状态等待，全部36个原业务assert AST完全相同；没有修改产品SW、迁移或主仓库PWA测试。
- 原专用合成profile未reset/reseed/Restore：22表hash`049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`、8配置hash`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`与START完全相同。App=activeSW=`ef520fe27f971e7a9be23732bddc6623849e0951`，离线冷启动PASS。END身份必须提交后另验。

## 数据、长期证据与待验边界

DB13／IDB130／22表、Backup14／Restore1–14、Sync/envelope1及设备配置合同保持。没有修改服务、schema、历史快照、冻结fixtures、三图／报告算法、计划或删除事务，没有操作个人健康数据、真实Provider key或个人原安装PWA。

[冻结证据](design/qa/2026-10-30-calendar-gesture-v1/README.md)保留1985原始JSON/日志、逐帧坐标、截图、失败与来源。23分片可按restore_raw_evidence.py验证并恢复，拼接原压缩包SHA为`567bebe6ea9e48a28c3c6ac194afceb4973dc7674c2a25e3e71c93e59016dd80`，原字节未改。四份原始空白使用.gitattributes精确路径-whitespace保持不可变证据，其余产品／测试／文档正常diff检查。实际发布阶段及完整十项回执在本聊天最终交付归档中提供。

Pending：实体iPhone Safari、原安装PWA、真实键盘／IME／Safe Area、VoiceOver、个人数据连续性、真实Provider、ChatGPT独立核查。旧WebKit饮水Undo−128px未在本轮修复。完成本轮发布与END后停止开发，不开展其他UX。

ChatGPT Baseline：先读AGENTS、本报告、CHAT_CODEX_WORKFLOW、CALENDAR_GESTURE_FIX_V1及QA，再fresh fetch main，核对Application／END两次正式CI、实际线上身份及最终回执。当前回归修复只改变日历触摸归属，既有业务和数据合同不变；自动化成功不是用户真机验收通过。
