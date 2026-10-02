# FitLog Lite Development Report

## Comprehensive Mobile UI / UX Quality Audit

自动化与生产验证完成；实体设备/真实服务状态独立列明。Production: https://king-640-060.github.io/fitlog-lite/

初始 clean main/origin/API SHA均为START；初始HTTPS pull与HTTP/1.1重试超时。完成前再次实际 git -c http.version=HTTP/1.1 pull --ff-only 成功 Already up to date，此时本地HEAD已包含FORM/VISION两提交48acde9d23e4a99b1abeea0ada1f39a44bccaaef。START记录真实初始基线，未伪造最初pull成功。提交均保留独立历史，无force/amend/reset。

## Requested105-field receipt

| # | Field | Verified result / boundary |
|---|---|---|
|1|START_COMMIT|f62b6b957c3852cc3b8f10ae6a3b679a54fd75f2|
|2|FORM_PRESENTATION_FIX_COMMIT|b426359b7b07a353655f39cb1eddc474c6615090|
|3|VISION_QUALITY_COMMIT|48acde9d23e4a99b1abeea0ada1f39a44bccaaef|
|4|UI_QUALITY_AUDIT_COMMIT|799e9188305d245bad03ed4c6c3d5de25bd37ba2|
|5|END_COMMIT|799e9188305d245bad03ed4c6c3d5de25bd37ba2|
|6|REPORT_COMMIT|本报告提交；自身 SHA 不能写入自身内容。最终外部报告记录完整 SHA；可用 git log -1 --format=%H -- LATEST_DEV_REPORT.md 查询。|
|7|main HEAD|应用发布已核验 799e9188305d245bad03ed4c6c3d5de25bd37ba2；报告提交发布后的确切值见外部最终回执。|
|8|production HEAD|应用 799e9188305d245bad03ed4c6c3d5de25bd37ba2，Pages SUCCESS；报告部署回执见外部报告。|
|9|UI Inventory|完成27组、74个命名页面/子视图清单，先读取现有实现并分类，继续以代码为准。|
|10|UI_QA_MATRIX 路径|docs/UI_QA_MATRIX.md；可复用检查表、适用状态、专项 gate、物理验收清单。|
|11|screen / state 数量|74个 inventory 项；新 gate 本地512个状态截图，生产236个，共748个；128个本地命名状态，生产每宽118；不重复累加既有 suite 状态。|
|12|Energy rounding policy|共享 formatEnergyInputValue / EnergyEditor.displayValue；自动 kcal/kJ input、转换提示、食物库/营养/模板/日期详情/补齐预览为整数。|
|13|Canonical precision policy|Food/FoodLog kcal、宏量营养、克数源值保持精度；仅 presentation。FormData 恢复未编辑的原值，真实 input 编辑或程序改变优先。|
|14|Unit round-trip result|PASS：1584kJ→379kcal→1584kJ显示；canonical=1584/4.184不变。20次 round-trip；浏览器既有 Food 单位切换后实际保存 caloric/protein/referenceGrams 精确不变。|
|15|Other numeric formatting fixes|Intl formatter最多一位小数，无科学计数/负零/浮点尾数。宏量营养未知为空；weight业务精度保留。初始/自动格式化，不逐键round；微小正 editable value显示0.1维持有效性，未编辑源精度保持。|
|16|Checkbox global selector change|input:not([type="checkbox"]):not([type="radio"]), textarea, select；toggle单独20px、padding0、min-height0、native border/background/appearance；标签>=44px。|
|17|Vision checkbox result|PASS：复核确认 checkbox 几何20–22px、标签>=44px；复核内容丢弃需确认；未改native。|
|18|AI checkbox result|PASS：privacy/permission checkbox20–22px，关联标签>=44px。|
|19|Radio result|PASS：AI imageRouting、Import duplicate radio不再继承普通input盒子；native20–22px。|
|20|Touch target result|PASS：审计 button/a/summary/rolebutton44×44；修复历史入口36px宽度。Habit weekday44px overlay保留意图并列明例外。|
|21|Vision old preprocessing|原统一1800px/JPEG.88起步，nutrition/front都detail high；保留安全 transport ceiling。|
|22|Vision new fast preprocessing|nutrition1400px/.82/.80/.78/≤1500KiB；front1000px/.80/.78/≤800KiB；async canvas.toBlob，角色区分。|
|23|Nutrition table dimensions/bytes|{'width': 1400, 'height': 1050, 'bytes': 561865, 'detail': 'auto'}；4032×3024合成源，source864433B。压缩JPEG人工可读。|
|24|Package-front dimensions/bytes|{'width': 1000, 'height': 750, 'bytes': 269951, 'detail': 'low'}|
|25|detail policy|Fast nutrition auto / front low；高质量 retry high；小能力probe仍high。|
|26|high-detail retry behavior|显式高清入口返回选图，再点击识别；已编辑review需确认舍弃。High重编码保留在当前Sheet的原File；返回Fast重新编码。无自动重试/第二请求。|
|27|EXIF stripping status|新canvas JPEG编码，不复用源文件字节；对象URL撤销。原有native orientation/decode路径保留；真实HEIC/iPhone方向待实体确认。|
|28|image persistence status|File/image/dataURL/draft仅当前Sheet内存；close/save/remove清理。无DB/Backup/Sync/history图片字段。|
|29|preprocess timing|{"preprocessMs": 99.69999998807907, "requestMs": 310.60000002384186, "parseMs": 0.5, "totalMs": 410.80000001192093, "payloadBytes": 831816}；仅numeric字段；包含一次250ms mock延迟，不代表真实Provider。|
|30|payload reduction|同源Fast vs High1800×1350双图：序列化请求减少58.87%；Fast精确binary831816B。|
|31|real Provider timing status|Pending；未使用真实Key/用户照片。真实延迟、准确率、CORS须独立实测。|
|32|Vision scroll transition architecture|唯一 renderStep 替换host内容并绑定数字展示；scrollTop0立即执行和guarded next RAF；stepGeneration阻止陈旧frame。viewer保留DOM/焦点/scroll。|
|33|choose scroll|PASS：review返回choose从0；相机/相册入口不被header遮挡。|
|34|review scroll|PASS：识别/high retry/back-to-edit后从0；无input autofocus。|
|35|quantity scroll|PASS：新step从0，记录日期/餐次/克数可达。|
|36|preview scroll|PASS：新step从0、返回编辑也从0；dup/done同一策略。|
|37|viewer return scroll|PASS：review滚动600后viewer返回恢复同一DOM和原位置，焦点preventScroll；实体触摸Pending。|
|38|horizontal overflow audit|PASS：document及实际子元素边界；移除html/body根overflow-x:hidden。FoodPicker长品牌使用受限grid+anywhere wrapping；DateRail/chart为显式例外。|
|39|clipped-content audit|PASS：button scrollWidth、Sheet body/header bounds、长picker底部入口/重开；输入可横向编辑，单行值不要求完整静态展开。|
|40|Chinese typography audit|修复任务时间挤窄长标题和140%发送单字换行；时间另行显示，发送/停止保持整词宽度。|
|41|long-text audit|超长中文任务/食物/动作/标签，连续英文品牌/Model ID、长GitHub owner/repo、多条FoodLog/Workout、26食物picker、大数字；PASS。|
|42|dynamic-font audit|100/120/140%核心5tabs、Food Editor、Assistant；PASS。非每个Sheet笛卡尔组合；实体Dynamic Type Pending。|
|43|Today audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。|
|44|Plan audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 Today/Upcoming/Inbox/Completed/Tag。|
|45|Food audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 日期rail保持当前正确业务绑定。|
|46|Workout audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 strength active/history、Cardio、Kegel。|
|47|Progress audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 trend/weight、Calendar/day、week/month report。|
|48|Management audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 分组入口及长Sheet。|
|49|Food Library audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 empty/search-none/long entries/import。|
|50|Food Editor audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 三宏量列、integer energy、原精度真实保存。|
|51|Food Vision audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 choose/review/quantity/dup/preview/done/viewer；parsererror/stop/manualhigh。|
|52|Task audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 时间字段、标签、共享日期、long title。|
|53|Habit audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 manager/reorder/editor/weekday。|
|54|Workout Editor audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 active/set/exercisePicker/detail/finish confirmation。|
|55|Cardio audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 stair/treadmill可选速度坡度/history。|
|56|Kegel audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 setup/timer/pause/history；timer engine未改。|
|57|Weight audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 1decimal展示，trend/history。|
|58|Date Picker audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 sharedDatePicker专项 gate。|
|59|AI Assistant audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 streaming/busy/stop/error/voice/long convo。|
|60|AI Settings audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 profile/permissions/privacy/routing/model/error states。|
|61|Backup/Restore audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 validated preview + danger confirm取消；V1–V7 compatibility测试。|
|62|GitHub Sync audit|PASS：uiQualityAudit + 既有专项回归；实际状态/适用范围见 UI_QA_MATRIX 和 JSON receipt。实体 iPhone 仍 Pending。 encrypted setup/unlock/conflict/restore/errors专项mock；无真实Token。|
|63|Sheet scroll audit|PASS：共享controller未重写；普通picker移除54vh内层滚动。26-food picker top/bottom/close/reopen; Vision explicit step policy。AI conversation保留专用scroll owner。|
|64|keyboard audit|PASS：既有shared VisualViewport mock键盘/toolbar区别、input可视、blur关闭、背景恢复；实体Safari键盘Pending。|
|65|Safe Area audit|PASS：47px top/34px bottom mock；app shell单次top，固定Nav reserve；实体Pending。|
|66|Bottom Nav audit|PASS：5labels/44targets；最后content完整滚到Nav上方，含140%字号。|
|67|focus audit|PASS：title anchor/no autofocus、keyboard focus/native trap、触摸无outline、close return/reducedmotion既有gate。|
|68|empty state audit|PASS：五tabs + Food/exercise/templates/habit libraries；search-none/AI初态；matrix列明无独立empty状态。|
|69|loading state audit|PASS：AI streaming/busy/model tests、Vision one-request/Stop、Sync busy；同步本地表单无Provider loading。|
|70|error state audit|PASS：Vision parser无自动retry；AI bounded errors/partial/400；Sync错误密码/网络/冲突；业务validation unit gate。|
|71|disabled state audit|PASS：未选图识别不可用，busy/Stop，模板首末move，未来报告next，AI权限/Sync actions。|
|72|accessibility audit|PASS：可访问icon名字（补Diet模板移位/移除）、原生toggle、标题焦点、keyboard trap；完整VoiceOver实体Pending。|
|73|touch target audit|新gate实际几何>=44×44、toggle关联标签>=44；无为适配缩小targets。|
|74|editable font size audit|新gate computed>=16px；所有被覆盖输入/select/textarea；保留user scaling。|
|75|reduced motion audit|PASS：interactionStabilization emulateMedia reduce检查dialog animation none；未新增page-in/数字重播。|
|76|local screenshot matrix|512张新gate截图，320×812/375×812/390×844/430×932；状态清单JSON；其他专项截图另外保留。|
|77|landscape smoke|PASS：812×375和844×390；Today/Food/Workout/Assistant/Vision review，每个本地width覆盖；非全屏横屏全集。|
|78|screenshot manual inspection|已实际打开全部36张本地联系图（108个代表截图），并检查controls、Vision quantity/preview、长picker/repo、横屏和压缩JPEG；发现字号问题后修复重测。不是仅生成截图。|
|79|production screenshot QA|390×844/430×932共236张新gate截图；人工查看主页面、Library/Editor、Vision、Workout editor、AI Settings/Assistant、Management和140%代表状态。|
|80|baseline tests|487tests /45files PASS，/tmp/fitlog-quality-baseline-tests.log。|
|81|final tests|495tests PASS；新增8个有效回归用例，未修改frozen fixtures/关闭旧gate。|
|82|test file count|46files PASS。|
|83|typecheck|npm run typecheck PASS。|
|84|build|npm run build PASS。|
|85|Pages build|GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS；17precache/810.31KiB。|
|86|diff check|git diff --check PASS；DB/services frozen contract/package/lockfile未改。|
|87|bundle|JS688112B/gzip217071B（baseline+3154B，约0.46%）；CSS105489B/gzip18909B（+490B）。既有>500KB warning仍在，无新依赖。|
|88|Actions|应用 [37027614694](https://github.com/king-640-060/fitlog-lite/actions/runs/37027614694) SUCCESS；Pages 6812032205 SUCCESS。报告专属回执见外部最终报告。|
|89|production verification|PASS：productionAssets实际JS/CSS bytes/SHA匹配Pages dist，五tabs/AI Settings/Sync入口；10套production gates全PASS。|
|90|offline cold boot|PASS：同persistent profile更新SW匹配新JS，真正断网冷reload后app和旧数据可用；不是实体PWA证明。|
|91|cross-deployment preservation|PASS：同一既存 /tmp/fitlog-vision-release-profile，before只读既有业务，application后比较；未重置/重seed。报告deploy再次复验回执见外部最终报告。|
|92|14 stores|fitlog-lite-db/DexieV7/14 stores完全保持；migration none；BackupV7/RestoreV1–V7/SyncEnvelopeV1。|
|93|frozen records|15条legacy frozen记录全字段比较PASS，包括历史FoodLog/Workout快照及本地日期。|
|94|AI config preservation|PASS：profile/key/active profile/visionModel fingerprint、Voice privacy ack保持；Quick Launch打开原配置无需重填。合成key不输出。|
|95|AI Streaming regression|PASS local4/prod2；SSE、工具聚合、partial/Stop、同response JSON fallback，bounded diagnostics。|
|96|Voice regression|PASS mock local4/prod2；权限、确认、final transcript走engine.send、close/pagehide/visibility abort；无audio persistence。|
|97|Quick Launch regression|PASS现有fragment消费/草稿/同profile浏览器路径；外部iOS launcher同原PWA storage context仍Pending。|
|98|Dual Model routing regression|PASS local4/prod2；同provider/key、chat工具model、visionModelfallback/隔离invalidate；本轮未改路由规则。|
|99|Food Vision parser regression|PASS extraction/version/evidence/null/kJ canonical/strict bounds；未改parser语义/新增估计；one failure one request。|
|100|GitHub Sync regression|PASS local4/prod2安全mock、unit/envelope/Restore compatibility；无后台sync/真实写入。|
|101|Physical iPhone Safari status|Pending：需用户实体检查native scroll/keyboard/camera/toggle/文字；未声称全PASS。|
|102|Installed PWA status|Pending：原安装PWA实体数据/standalone/same context需现场确认；不得重装/清站点数据。|
|103|Real Provider status|Pending：真实照片/小字/反光/HEIC、fast/high识别准确率/延迟、Provider CORS/compatibility。|
|104|Real SpeechRecognition status|Pending：浏览器/OS真实权限和识别；mock PASS不证明本地/离线语音。|
|105|remaining risks|实体Safari/PWA、真实Provider/Speech和外部AI launcher同storage context未实测；既有JS>500KB警告。无未解决自动/生产gate失败；覆盖是代表状态矩阵，不保证未来所有内容和OS组合。|

## Exact application assets

| File | Bytes | Python gzip | SHA-256 |
|---|---|---|---|
|index-DsyqLrVB.js|688112|217071|52263551a179b9f72bdfeaf31cdd58e26369e89710b45dc2120f977fc3f630fc|
|index-VzC3ASI-.css|105489|18909|261914de13e65666e4d735e7d182751bcb31d8dde37e6c52e8bc59c814166240|

## Evidence and manual review

生产首次并发执行时 aiStreaming 的「正在思考…」可见性断言超时。该 fixture 在150ms后输出首段，短暂状态可能在测试观察前消失；这与并发调度时序一致，但单次失败不能证明原因。保留原失败日志 /tmp/fitlog-quality-streaming-first-attempt.log；未改或跳过任何断言，单独复跑原完整套件后390/430全部PASS（/tmp/fitlog-quality-streaming-retry.log），包含incrementalBeforeDone、Stop、tool loop、partial history、rolling secrets、scroll、Voice/Quick Launch。最终10套结果由首次9项PASS与完整Streaming复跑组成；原始并发总日志仍保留FAIL。该短暂状态断言的并发时序敏感性是测试维护风险，未发现对应产品回归。

Reusable matrix: docs/UI_QA_MATRIX.md. External evidence folder: artifacts/ui-quality-audit/ in the calling workspace. Includes final local/prod receipts, all ten suite logs, build/unit/typecheck/preservation/asset receipts and selected screenshots/contact sheets. Images are not committed to the repository. Screenshots are synthetic records/provider responses; no real credentials or user records were used.

Confirmed fixes: native toggle inheritance; automatic energy/floating noise; Vision Fast profiles and asynchronous encoding; explicit high retry; step scroll reset/viewer restoration; long FoodPicker brand overflow; history36px target; Diet template icon accessible names; long task time/title compression;140% send label split; picker nested scroll. Existing correct module IA/theme/business engines are retained.

## Physical verification checklist — Pending

Use existing Safari and the original installed PWA without clearing/reinstalling. Check five main pages top/bottom, Food Library/editor1584kJ round-trip, Vision camera/gallery/clear table/Fast vs High timings/review checkbox/step top/viewer return, Workout long content, Habit weekday/AI native routing, long Sheet keyboard open/close and background restore, Voice permission/Stop/close, original AI config and records, offline cold boot. Report real photo accuracy and network latency separately. Never infer physical PASS from Chrome emulation.

## ChatGPT Baseline

STARTf62b6b957c3852cc3b8f10ae6a3b679a54fd75f2 → application END recorded above: integer energy presentation preserving canonical/untouched values, native toggles outside shared field CSS, role-specific Vision Fast auto/low and explicit high retry, numeric-only memory timings, guarded step scroll0/viewer restoration, bounded long-text layouts/44targets, task time separate row, no split Chinese send, shared picker scroll.495tests/46files, typecheck/normal+Pages builds/diff,10local4/prod2 browser suites, exact assets, same14store/15row+AIconfig/key/visionModel/voiceack preservation and SW/offline PASS. DBV7/BackupV7/RestoreV1–V7/SyncV1 no migration. Physical Safari/original PWA/real Provider/Speech/external launcher storage path Pending. Final report SHA/Actions/Pages in external receipt.
