# FitLog Lite Development Report

## Latest production round — AI Catalog Writes + Recovery UX/Visual Integration (2026-10-08)

- START_COMMIT: `82acb386a4ba9f6a6cf64c5256477bf3c22a8aea`. Clean main; status/branch/ff-only pull/log confirmed at start, origin/main rechecked before publishing.
- APPLICATION_COMMIT: `0a412dccb4b89513ad6b90ebcb38cf03b7a638a2`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37749297442 — completed success, including typecheck/tests/build/Pages deployment.
- END_COMMIT: the report-only commit containing this file. Exact final SHA, Actions and final production asset/offline receipts are external and returned to the user, avoiding self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Initial classification and implemented behavior

AI catalog writes were not implemented; recovery customization/ranges/Today integration were partially implemented. Existing Proposal safety, services, local wake/DST semantics and Today card primitives were reused.

### Confirmed AI Catalog writes

`search_catalog` is a bounded kind-permission READ tool, max10, returning real IDs and nested definitions. Five registered PROPOSAL tools support explicit create/update: `propose_food`, `propose_exercise`, `propose_workout_template`, `propose_diet_template`, `propose_nutrition_strategy`. They use memory-only AiProposals, one explicit user confirmation, existing validators/services, permission rechecks, duplicate-confirm guards and final transactional source-fingerprint checks. Changed data rejects with “数据已变化，请重新生成建议。” No model confirmation, arbitrary table access, direct factual sessions or destructive tools.

Food requires user-supplied name/referenceGrams/kcal; missing macros remain undefined. Partial edits preserve omitted brand/serving/macros; saved FoodLogs remain unchanged. Normalized duplicate creation/rename is refused; explicit real ID disambiguates legacy same-name records without blocking unchanged-name edits. Exercise name/notes use saveExercise in workoutService (no separate exerciseService exists), with optional injected database preserving manual defaults. Workout nested exercise/set and Diet item edits merge by real nested ID, retaining omitted content. Removal/order require explicit complete operations. Workout may include explicitly requested new Exercises; Diet may include explicitly requested new Foods. Each composite creates children and template within one transaction and one confirmation. Diet fallbacks are locally generated from actual/planned validated Food, never model-authored JSON. Nutrition tools edit template definitions/ordered variants only; missing goals stay unset, other variants remain, no activation/phase/daily-target writes.

Preview cards show operation/type/name/write count and concise summaries. Expandable human-readable before/after includes child fields, notes, Food brand/serving and template facts; no raw JSON. Tool prompts remain bounded schema descriptions, visible tool labels concise. Success marks proposal saved. `observeManagerCatalog` disposes liveQuery on route cleanup; visible clean managers refresh within the original workspace frame, preserving query/scroll/navigation. Suspended editors keep unsaved drafts, manager refreshes on Back, deferred rendering guards navigation races. Existing workspace controller/frame/Sheet lifecycle unchanged.

### Water reference / objective Recovery

`fitlog-water-reference-v1` is device-only `{referenceMl:number|null}`. Absent/invalid reads2500 without autowrite. Integer1–100000 is accepted; explicit null means unset. 修改参考值 opens existing shared small Sheet with Save/Unset/Cancel, separate from 自定义记录. Current-page event and same-origin storage event refresh mounted cards without reload; cleanup on unmount. UI shows actual total plus optional 每日参考值, without ratio/percentage. WaterLog/history/edit/delete/undo remain independent; preference never enters DB, Backup, Restore or Sync.

Sleep achievement fields/constants/logic/tests/docs were removed. Only average completed duration, circular average start/end and recorded-day count remain, with actual daily facts. No fixed goal line or judgment UI. Existing absolute elapsed/DST and captured local wake dates retained. Recovery summary/range accepts7|30|90, including today and prior6/29/89 local dates. Completed episodes sum per day, clock means use each day's longest episode. Multiple water entries sum; missing is undefined/未记录 rather than zero. Safe data-derived chart scales handle empty data. Equal range segments share selected styles.90-day plots scroll only inside a bounded chart,24px per day; daily text disclosure remains complete.7/30 retain simple fit-to-card charts.

### Today visual integration

Sleep/Water now use the same today-card/today-activity-card/header/leading badge/icon/h2/history-chevron/content/meta/compact CTA primitives. No Recovery panel or duplicate group heading. Sleep retains empty/active/completed facts and primary lime at shared compact44px geometry. Water uses actual total, optional reference, explicit reference editor and +250/+500/自定义记录 group. Quiet token-based borders/background and shared10px spacing, no independent tinted block or private primary colors. Shared CTA geometry is separate from primary emphasis/states.

Actual screenshot crops at390/100: Sleep214→123px; Water224→175px. At320/140: Sleep231→187px; Water346→343px, retaining readable wrapping and the new reference editor rather than compressing text. These crop dimensions round geometric heights outward. Enlarged text can increase height. Images include all five Training/Weight/Habit/Sleep/Water cards as actual long-page capture and a labelled contact sheet, plus320/140,320/200,dark,7/30/90,reference editor,proposals and five refreshed managers. They are Chromium screenshots, not physical-device photographs.

## Data compatibility

- Stable fitlog-lite-db: Dexie11 / IndexedDB110 /20 stores. No migration/schema/index/entity-store/DB-name change.
- Backup11 / Restore1–11; Sync/envelope1; device-only AIConfig1/VoiceConfig1 unchanged.
- No dependency, timer engine, Backup/Restore/Sync implementation or frozen fixture changes. FoodLog/Workout/daily-target historical snapshots remain immutable.
- Water reference and AI transport/proposal/chat remain excluded from business serialization. No user DB clearing/reseeding/Restore/reinstall.

## Automated verification

| Gate | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm test | PASS —705 tests /62 files; previous675 retained +20 catalog +10 preference/range tests |
| npm run build | PASS — clean application build and CI build; existing bundle-size advisory only |
| git diff --check | PASS |
| Full release browser inventory | PASS —25 suites: all previous24 plus catalogRecovery |
| Final focused source rerun | PASS —catalogRecovery,aiAssistant,aiStreaming after child-detail preview/legacy-name-ID fixes |

All25 gates are listed in docs/UI_QA_MATRIX.md and external accepted receipt. managementWorkspace's initial serial process was interrupted to execute all four fresh width shards; raw exit13/log retained. Complete union is24 distinct320/375/390/430 ×100/120/140% ×normal/reduced cases,419 identity checks and20 navigation rounds each. Original assertions/loops/timeout unchanged; default unsharded matrix unchanged. No skips/deleted assertions/timeout extensions. Observer preserves the original dialog/title/body geometry (0 position/height delta), queries, scroll, draft return and disposal.

New catalogRecovery has6 local contexts:390/100 light,320/140 light,320/200 light,430/140 dark,390/100 dark and844/140 dark landscape; normal/reduced motion. It checks shared headers/icons/CTA, bounded body/chart,60 range transitions each, reference default/save/unset/cancel/cross-tab without changing WaterLogs, five actual confirmed catalog writes and already-open managers refreshing in another tab with same frame/query/scroll, and unsaved Food draft preserved through a live write. No page errors. Unit coverage includes cancellation, missing facts/unknown macros, partial edits, immutable FoodLog, real references, one confirmation/repeat guard, both composite rollback paths, stale data, permission/model refusal and objective local-day/DST boundaries. Existing675 tests retain data preservation/reopen/migration/Backup compatibility coverage.

Earlier synthetic fixture/selector failures were corrected (notify Dexie via fixture reload; precise assistant/record selectors), then rerun. Browser testing found and fixed90-day chart intrinsic body overflow and shared compact primary geometry. Failures/retries are retained externally.

## Production verification (application commit)

All five production targeted suites PASS: catalogRecovery(6 contexts),aiAssistant(390/430),foodRecovery(4),macroNutritionSummary(4),managementVisualConsistency(4). Existing Today/Food shared macros, selected-date facts, many-food edit/expand and recovery history flows remain covered. Same six catalog contexts verify320/140,200%,dark,reduced,landscape,actual5-tool writes,live manager refresh and60 range switches. No real provider request or personal business fixture used.

Exact productionAssets PASS: HTML/build-info `0a412dccb4b89513ad6b90ebcb38cf03b7a638a2`, JS/CSS exact bytes/SHA256, exact SW bytes/precache,5 tabs,AI Settings,GitHub Sync entry; no page errors.

- JS `index-BmrSBdpk.js`: 809127 bytes; SHA256 `b1c31a7bd740d6f195a846a0778740a42c5c4fc665ba5a0faa20bea0a82e875c`.
- CSS `index-CwmxJJQE.css`: 123106 bytes; SHA256 `14dfa2a5ddc7840788abf3acbe9671ab5c97d8fbf2d7704415a4ad5428675ace`.

Same pre-existing isolated synthetic production profile reused without clearing/reseeding/Restore:22 records,110/20. Before/application all20-store hash `9c2df75ef30db6923c19e48a588aaa77f25d053d80f005917fc36b6ad251eab6`; prior18-store hash `5566fc3e8df752b2ffd2a68a93c6db5bbef9051fd817b7fb63e9d04d2d9934c7`; AI/Voice config hash `be24fdaaad958fe42cfbfc2de052a846400e6401221282531f636669b7361dcf`. Hashes/rows/store list/config keys identical. Missing water preference remains absent (no default autowrite). Offline cold NEW page boots exact application App/SW commit, same hashes/config. Final report-only deployment must repeat exact assets and this same-profile/offline check; final receipts are external because this report precedes END.

## Actual modified files

- `AGENTS.md`
- `docs/AI_ARCHITECTURE.md`
- `docs/INTERACTION_VISUAL_SYSTEM.md`
- `docs/UI_INTERACTION_SPEC.md`
- `docs/UI_QA_MATRIX.md`
- `src/ai/proposals.ts`
- `src/ai/systemPrompt.ts`
- `src/ai/toolRegistry.ts`
- `src/ai/tools/catalogTools.ts`
- `src/ai/tools/readTools.ts`
- `src/main.ts`
- `src/services/waterReferenceConfig.ts`
- `src/services/workoutService.ts`
- `src/styles/main.css`
- `src/styles/recovery.css`
- `src/ui/aiAssistant.ts`
- `src/ui/aiUiHelpers.ts`
- `src/ui/icons.ts`
- `src/ui/nutritionStrategies.ts`
- `src/ui/observeManagerCatalog.ts`
- `src/ui/recovery.ts`
- `src/utils/recovery.ts`
- `tests/aiCatalog.test.ts`
- `tests/browser/README.md`
- `tests/browser/catalogRecovery.mjs`
- `tests/browser/foodRecovery.mjs`
- `tests/browser/managementWorkspace.mjs`
- `tests/recovery.test.ts`
- `tests/waterReference.test.ts`
- `LATEST_DEV_REPORT.md` — report-only END commit.

External evidence: workspace artifacts/ai-catalog-recovery-2026-10-08 contains the62-item DELIVERY_REPORT.md, application patch/inventory, raw/accepted gates, retained interrupted/failure/retry evidence, unit/type/build logs, matrix receipts, before/after and production screenshots, Actions/assets and baseline/application/final preservation/offline receipts. Exact final SHA/END Actions/assets are in external final receipt.

## Manual verification and limits

- Physical iPhone Safari: **Pending**.
- Original installed PWA: **Pending**.
- Real provider catalog tool calls: **Pending**; mocks verify app protocol/safety/UI, not vendor CORS/model compatibility or response quality.
- Browser font/dark/reduced/landscape/Safe Area checks are automated Chromium evidence; they do not verify physical Safari/OS scaling/original installed-PWA update.
- No confirmed unresolved implementation defect. Existing Vite large-chunk advisory remains informational. Source fingerprint invalidation deliberately covers relevant whole catalogs, so unrelated same-catalog changes can conservatively expire a proposal.

## ChatGPT baseline

Read AGENTS and this report; actual main wins. AI can READ bounded real catalog IDs and PROPOSE create/update Food/Exercise/Workout/Diet/Nutrition template definitions. One user confirmation, existing services, strict patches/source guards and composite atomic writes. No automatic phase activation or historical rewrite. Water reference is device-only2500 default or integer/null, never backup/sync; factual total only. Sleep is objective facts only; Recovery7/30/90 actual local days,90 chart-only scrolling. Sleep/Water are ordinary shared Today activity cards. Preserve existing Today/Food shared MacroNutritionSummary, Management Workspace lifecycle and all compatibility contracts. Next release requires all25 browser suites plus exact production assets and same-profile preservation/offline verification. Physical Safari/original PWA/real provider remain separate Pending evidence.
