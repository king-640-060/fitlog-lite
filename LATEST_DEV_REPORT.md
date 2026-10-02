# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

Mobile Layout / Information Density Audit implemented and production verified. Full requested66-field report: [MOBILE_LAYOUT_DEV_REPORT.md](docs/MOBILE_LAYOUT_DEV_REPORT.md).

| Identity | Value |
| --- | --- |
| START_COMMIT |67f6112a55c99ea91857b8b3123c397b317ebff5|
| MOBILE_LAYOUT_COMMIT |d94b4ed924cbead8297f5120e622f3bbe57b7e9b|
| QA_FIX_COMMIT / END_COMMIT |bed79ecdd0e95c6a3956f2c1c0a95a2d3ac79329|
| Application Actions |[37017973063](https://github.com/king-640-060/fitlog-lite/actions/runs/37017973063) SUCCESS|
| Application production HEAD / Pages |bed79ecdd0e95c6a3956f2c1c0a95a2d3ac79329 /6810338037 SUCCESS|
| REPORT_COMMIT / final main / production HEAD |This report commit; exact SHA/Actions/Pages receipt in final artifact and `git log -1 --format=%H -- LATEST_DEV_REPORT.md`|
| Production |https://king-640-060.github.io/fitlog-lite/|

Normal HTTPS fast-forward push succeeded. No history rewrite or publishing workaround. Report-only release keeps identical application assets.

## Delivered behavior

- App frame owns top `env(safe-area-inset-top)` once; topbar adds ordinary spacing. Existing immersive fixed headers retain their central reserve. No device/per-tab padding or standalone duplicate inset.
- Five-tab fixed nav and main bottom reserve derive from one row-height/padding/bottom-inset token expression. Pages reserve its full visible height +20px breathing room; last Recent Workout row scrolls wholly above navigation.
- Shared spacing aliases page-inline16, section-gap20, card-padding16, card-gap10, field-gap12, group-gap16;44px controls and16px editable text retained. Topbar title can shrink, Food/Workout small-screen groups wrap as whole actions, compact Today date metadata uses visual ellipsis while keeping full accessible text.
- Food Library: Search/Add, then 拍包装录入 / 导入文件. Shared content Sheet chooser exposes CSV and JSON; Management Import uses the same existing parser/preview/confirm logic. Dense rows and one modal-body vertical scroll. Empty state distinguishes no Foods from no matches with a debounce-safe Clear Search.
- Dedicated Food form: full-width name/brand/reference grams/energy + unit and quiet conversion hint; three equal P/C/F inputs with8px gap,12px form spacing and48px Save. No unexplained orphan grid cell or shared grid-form change. Canonical kcal/4.184 and unit-only energy edits unchanged.
- Workout cards reduce padding18→16, gap14→10, icon38→34. Strength keeps primary Start/Continue; Cardio/Kegel use compact44px neutral secondary actions; section heads align. Timer/autosave/history/template/business logic unchanged.
- Management retains grouped IA and62px rows. Local note is short and still asks for Backup before changing device/clearing browser data. Consumer AI summary names service and optional separately configured image route, while actual model IDs stay in AI detail.
- Empty Exercise/Template managers gain clear next-step copy; empty lists use existing content Sheet variant. Habit/Task empty grammar and paired/complete fields in other forms remain. No broad form rebuild or decorative additions.

## Automated Verification

Actual baseline487tests/45files; final487tests/45files PASS. No fake claim of added unit cases: new mobileLayout browser suite covers geometry/actions/imports/forms/summary/120% root fonts. Existing animation guard now matches complete `page-in` name, avoiding false matches against `--page-inline`; no gate disabled. Typecheck, full tests, normal build, Pages build, diff-check PASS.

Local320×812 /375×812 /390×844 /430×932: mobileLayout and eight existing suites PASS (aiStreaming, aiAssistant, aiVoice, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety). Production390×844 /430×932: same nine suites PASS. Screenshots inspected across sizes; long Chinese Food/brand/exercise/Task fixtures and120% font simulation included. Safe Area47px top/34px bottom is mocked geometry, not physical Safari proof.

| Pages asset | Bytes | Python gzip bytes | Vite gzip estimate | SHA-256 |
| --- | --- | --- | --- | --- |
|index-BC5K5E_w.js|684958|215911|219.19kB|f0a6804a02c6bc17149ce2e0e98fa477b4f35d7f9f5108517c646a20b95eb07a|
|index-CRvGw-68.css|104999|18790|18.97kB|e7b33e4d1f1b72fc37fb105c384866306c632b3628d5929d1dab011936663dcb|

Precache17entries/806.76KiB. JS+1670B (~0.24%); CSS+2115B. Existing>500kB JS warning; no package/lockfile/manifest/frozen fixture/DB/service/AI engine/Sheet controller changes.

## Production Verification

Application Actions37017973063 and Pages6810338037 SUCCESS at END_COMMIT. Production JS/CSS exact bytes/SHA match final Pages build; five tabs/AI Settings/Sync entries PASS. Nine suites at390/430 PASS with zero page errors, including streaming/tools/Stop/history/secret guards, Voice/Quick, dual routing/Vision, long Sheet toolbar/keyboard/hysteresis/confirmation/replace/scroll restoration, Date Picker and Sync safety.

Same existing synthetic persistent profile across application and final report deployment: all14stores/15frozen historical rows identical, AI Profiles/API Key/visionModel/Voice privacy ack fingerprints unchanged; no business reseeding/reset. Original Service Worker loads exact new JS, then actual offline cold reload PASS. This desktop synthetic evidence does not prove an external iPhone storage context. Final report-only deployment receipt appears in final artifact.

## Versions

fitlog-lite-db /DexieV7 /14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfig/SystemPromptV1; FoodVisionPrompt/extractionV1. No migration, historical recalculation or business semantic change. Existing local dates and snapshots remain.

## Manual Device Verification / remaining risks

Physical iPhone verification: **PENDING**. Check original installed PWA and Safari: all five topbars, Workout date/template/exercise actions and final history row, Food Library/CSV/JSON chooser, Food Editor P/C/F + unit/save, Management summary, AI Assistant keyboard and long touch scroll, toolbar changes and rotation. No doubled top inset or Home Indicator overlap; system zoom remains usable. Preserve existing records/configuration—do not clear/reinstall for QA.

Real Provider/CORS/buffering and real SpeechRecognition Pending. Independent external FitLog AI icon/one-tap listening/same-storage route remain Pending / unsupported by the previously verified path; normal manifest unchanged. No unresolved automated or production failure. See [AI_QUICK_LAUNCH.md](docs/AI_QUICK_LAUNCH.md) for that separate gate.

## ChatGPT Baseline

Read AGENTS→LATEST→UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM; AI display work also reads AI_ARCHITECTURE/AI_QUICK_LAUNCH. ENDbed79ec… centralizes main Safe Areas/nav reserve, Food two-action Library/common import chooser/dedicated full-width+three-macro form, compact Workout hierarchy, consumer AI summary/local note/shared spacing.487tests/45files +nine local4/prod2 suites, builds/typecheck/diff PASS; exact assets and same14store/15row+AIconfig/key/visionModel/voiceack preservation/SW offline PASS. DBV7/BackupV7/RestoreV1–V7/SyncV1 and AI/Sheet engines unchanged. Physical iPhone/real Provider/Speech/external AI storage path Pending. Exact report/main/production receipt in final artifact.
