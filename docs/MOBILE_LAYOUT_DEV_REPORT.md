# FitLog Lite Development Report — Mobile Layout / Information Density

## Verified release

DATE: 2026-10-02. Production: https://king-640-060.github.io/fitlog-lite/.

| # | Required field | Verified result |
| --- | --- | --- |
|1|START_COMMIT|67f6112a55c99ea91857b8b3123c397b317ebff5|
|2|MOBILE_LAYOUT_COMMIT|d94b4ed924cbead8297f5120e622f3bbe57b7e9b|
|3|END_COMMIT|bed79ecdd0e95c6a3956f2c1c0a95a2d3ac79329|
|4|REPORT_COMMIT|This report commit; exact SHA in final artifact and git log -1 --format=%H -- LATEST_DEV_REPORT.md|
|5|main HEAD|This report commit; exact SHA in final artifact and git log -1 --format=%H -- LATEST_DEV_REPORT.md|
|6|production HEAD|This report commit; exact SHA in final artifact and git log -1 --format=%H -- LATEST_DEV_REPORT.md|
|7|Top Safe Area|`app-frame` owns `--safe-area-top = env(safe-area-inset-top,0px)` once. Topbar adds ordinary spacing. No per-tab device padding; immersive fixed-header reserve retains its existing ownership. No standalone-specific duplicate inset.|
|8|Bottom Nav reserve|`--bottom-nav-height` derives from48px row +2×4px padding +1px border + bottom inset; app-frame reserves that height +20px breathing room. No last-section margin hack.|
|9|5 Tab top|Today / Plan / Food / Workout / Progress PASS at four local sizes and two production sizes, including47px synthetic top inset and120% font simulation. Chromium geometry, not physical iPhone evidence.|
|10|5 Tab bottom|All five final content blocks scroll above navigation; synthetic34px bottom inset included.|
|11|Food Library hierarchy|Search +44px Add; next row two quiet actions 拍包装录入 / 导入文件. Dense grouped rows; modal-body is the only main vertical scroller.|
|12|CSV import|导入文件 → 表格文件（CSV） → native file chooser → existing parseFoodCsv/buildImportPreview/explicit confirm; actual synthetic CSV saved in browser QA.|
|13|JSON import|Same chooser → 数据文件（JSON） → existing parseFoodJson/buildImportPreview/explicit confirm; actual synthetic JSON saved. Management 导入数据 uses this chooser too.|
|14|Chinese button wrapping|Domain nowrap and `compact-action` preserve complete short labels. At narrow widths action groups move to another row; no global button nowrap or tiny11px fallback.|
|15|Food empty state|还没有食物 / 拍包装录入，或手动新建。 Uses content-sized shared Sheet and existing Camera/Add controls.|
|16|No-result state|没有匹配的食物 / 换个关键词试试。 Clear Search cancels pending debounce, clears query and restores list/empty state.|
|17|Food Form layout|Dedicated `food-form`, single-column full-width fields, one three-column nutrition group, full-width Save; no shared grid-form override.|
|18|Reference grams|Full-width labeled numeric field, g at right.|
|19|Energy|Full-width group with numeric value + unit selector; adjacent quiet canonical conversion hint. Existing energy editor unchanged.|
|20|P/C/F|Three equal minmax(0,1fr) columns,8px gap, nowrap labels, g inside inputs. No orphan fat field.|
|21|320px|PASS; full fields and three macros, each numeric input ≥75px measured width, no horizontal overflow; Food/Workout compact actions can use a second row.|
|22|375px|PASS; three macros and whole action phrases; compact date/action row fits.|
|23|390px|PASS local +production; three macros, all five tabs and last Workout row.|
|24|430px|PASS local +production; same form grammar and action hierarchy.|
|25|Workout density|Card padding18→16, internal gap14→10, icons38→34; existing radii/borders. Shared44px section heads; groups wrap only when necessary.|
|26|Strength CTA|Full-width48px accent Start/Continue preserved.|
|27|Cardio CTA|Compact neutral secondary44px action; duration/type/metrics unchanged.|
|28|Kegel CTA|Compact neutral secondary44px Start; timer and progression engine unchanged.|
|29|Recent Workout visibility|Four displayed rows from eight synthetic historical workouts; final row fully above fixed nav after scrolling.|
|30|Management density|Same four groups,62px minimum rows, consistent20px section gap and quiet local note. No IA rewrite.|
|31|Local copy|本地数据保存在当前设备。更换设备或清除浏览器数据前，请先备份。 Detailed Backup/Sync notices preserved.|
|32|Consumer AI summary|已连接 · 智谱 (or 自定义服务); optional 对话与图片已配置 for separately configured visionModel. Configuration wording does not claim verified capability. No model IDs or auto-generated model-bearing profile names in Hub.|
|33|Real AI model details|Exact model and visionModel remain in AI Settings, tested with long synthetic IDs. Overview makes no network request.|
|34|Shared tokens|page-inline16; section-gap20; card-padding16; card-gap10; field-gap12; group-gap16. Existing base space tokens reused.|
|35|Card rules|Training and shared Today card grammar reuse padding/gap aliases; no decoration or radius expansion.|
|36|Form rules|Food gap12; Task group gap16 and Habit grouping use aliases. Cardio, Habit, Task paired time, Nutrition Target2×2 and Weight forms audited: no unexplained orphan cell found.|
|37|Chinese typography|Short actions stay whole; long food/brand/exercise/task text wraps or uses existing factual-row ellipsis; model IDs wrap only in AI detail.|
|38|Accessibility|Semantic button/label/ARIA names retained; native selection and scaling; no autofocus, focus glow or global transform press.|
|39|Touch targets|44px controls/navigation minimum; Food Save48px; library delete column corrected to44px.|
|40|Editable text|Food inputs46px high and ≥16px text; existing16px editable controls preserved.|
|41|Keyboard focus|Existing modality/Sheet/input keyboard regression PASS; controller unchanged.|
|42|Tests|Actual baseline487tests/45files PASS; final full487tests/45files PASS. FrozenV7/Backup/Restore/snapshots/AI/Sync gates included. Added mobileLayout browser suite.|
|43|Final count|487 unit tests. Browser QA covers9 suites ×4 local sizes +9 suites ×2 production sizes, plus desktop resize/fallback cases.|
|44|Typecheck|PASS.|
|45|Normal build|PASS.|
|46|Pages build|PASS with GITHUB_REPOSITORY=king-640-060/fitlog-lite.|
|47|Diff check|PASS.|
|48|Bundle|JS684958B, Python gzip215911B, Vite219.19kB; CSS104999B, Python gzip18790B, Vite18.97kB;17precache entries/806.76KiB. JS+1670B (~0.24%); no dependency change. See asset SHA table below.|
|49|Browser QA|Local320×812 /375×812 /390×844 /430×932 and production390×844 /430×932 PASS: mobileLayout, aiStreaming, aiAssistant, aiVoice, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety.|
|50|Screenshot QA|Actual screenshots inspected for Library empty/list/actions, Food form across four sizes and120%, Workout top/bottom, Management top/bottom and AI details. Long Chinese Food/brand/exercise/Task fixtures included.|
|51|Actions|[37017973063](https://github.com/king-640-060/fitlog-lite/actions/runs/37017973063) SUCCESS; report deployment receipt in final artifact.|
|52|Production verification|Exact JS/CSS bytes and SHA match final local Pages build; five tabs/AI Settings/Sync entries and all nine mocked suites PASS. Application Pages 6810338037 SUCCESS; report Pages receipt in final artifact.|
|53|Data preservation|Same existing synthetic persistent browser profile before/after application and final report deployment. No business reseeding/reset. Existing SW loads exact new JS, then actual offline cold reload PASS.|
|54|14 stores|All14 stores/15 frozen historical rows compared exactly; AI Profiles/key/visionModel/Voice privacy ack fingerprint unchanged. Synthetic desktop evidence only.|
|55|DB|fitlog-lite-db /DexieV7 /14stores. No schema/migration.|
|56|Backup|V7 unchanged.|
|57|Restore|V1–V7 unchanged.|
|58|Sync|EnvelopeV1 unchanged.|
|59|AI Streaming|PASS; before-DONE text, one bubble, tools after complete validation, Stop, partial history exclusion, cross-delta secret guard, near-bottom/upward-read, typed/Voice/Quick shared path. No transport/parser/engine edits.|
|60|Voice|PASS mocked standard/prefixed recognition, first privacy, final/end once, cleanup/background/Stop/busy/proposal guards, text fallback. Real speech Pending.|
|61|Dual Model|PASS; chat/tools use model, Vision uses optional visionModel/fallback, one service/key, stale routing/probe guards.|
|62|Food Vision|PASS; three entrances, preprocessing, explicit write preview, kJ/kcal, mL guard, Stop/errors/history snapshots.|
|63|Sheet stabilization|PASS; shared VisualViewport/hysteresis, toolbar stability, major long Sheets, temporary confirm/replacement, background lock/restore, keyboard inputs, orientation and actual desktop resize. No controller changes.|
|64|GitHub Sync|PASS mocked safety paths,14stores, encrypted/manual/conflict/SHA guard and Backup/Restore tests.|
|65|Physical iPhone|PENDING. No accessible physical iPhone. Safari/installed PWA status bar, Home Indicator, touch scroll and real keyboard are not proven by Chromium.|
|66|Remaining risks|Physical Safari/PWA verification, real Provider/CORS/stream buffering and real Speech Pending; independent external Home Screen AI launcher/same-storage path remains Pending from prior release. Existing>500kB JS warning. No unresolved automated or production failure.|

## Assets

| File | Bytes | Python gzip | SHA-256 |
| --- | --- | --- | --- |
|index-BC5K5E_w.js|684958|215911|f0a6804a02c6bc17149ce2e0e98fa477b4f35d7f9f5108517c646a20b95eb07a|
|index-CRvGw-68.css|104999|18790|e7b33e4d1f1b72fc37fb105c384866306c632b3628d5929d1dab011936663dcb|

## Release transport

Application commits used normal HTTPS push. Report HTTPS push timed out; verified GitHub Git Data API publication preserved exact blob/tree/commit hashes and checked the remote parent again before force:false fast-forward. No reset/amend/force push or history rewrite.

## Automated Verification

QA_FIX_COMMIT / final application END is bed79ecdd0e95c6a3956f2c1c0a95a2d3ac79329: compact Today header metadata now stays on one line with accessible full text and visual ellipsis.

No business service, AI transport/orchestrator/streaming/voice/routing, Sheet controller, Dexie schema, frozen fixture, package/lockfile or manifest edits. The existing animation guard was corrected to match the whole `page-in` name rather than falsely rejecting `--page-inline`. No gate was disabled. Test-only synthetic data lives in isolated contexts; the separate preservation profile is never cleared/reseeded.

Exercise and template manager empty states now name the missing content and next step; existing Habit/Task empty grammar retained. Empty library/empty Exercise/Template managers use the shared content variant to avoid unnecessary fixed tall blank space. Ordinary library results keep dense rows and the shared modal-body scroll. Task/Cardio/Habit/Nutrition Target/Weight forms were inspected rather than globally rebuilt.

## Manual Device Verification

Physical iPhone verification: **PENDING**. In original installed FitLog and Safari, inspect all five topbars, Workout date/Template/Exercise controls, Recent Workout last row, Food Library two actions/chooser, Food Editor macro inputs/unit switch/save, Management summary, AI Assistant long scroll, keyboard open/blur/dismissal and toolbar changes. Check portrait and rotation, no doubled top inset, no Home Indicator overlap,44px touch targets, system zoom remains usable. Confirm existing recognizable records and saved AI config without re-entry. Do not clear/reinstall for QA.

## ChatGPT Baseline

START67f6112… → bed79ecdd0e95c6a3956f2c1c0a95a2d3ac79329: central app-frame Safe Area and shared navigation height+breathing reserve; compact Workout cards with one strength primary; Food Library two actions and common CSV/JSON chooser; full-width Food fields plus dedicated three-column macro grid; consumer AI summary, short local-data note and shared density aliases.487tests/45files, typecheck/normal/Pages builds/diff and nine local4/prod2 suites PASS; exact assets and same14store/15row+AIconfig/key/visionModel/voiceack preservation/SW offline cold boot PASS. DBV7/BackupV7/RestoreV1–V7/SyncV1 and all AI/Sheet engines unchanged. Physical iPhone/real Provider/Speech/external AI launcher storage path Pending. Exact report SHA/Actions/Pages receipt in final artifact.
