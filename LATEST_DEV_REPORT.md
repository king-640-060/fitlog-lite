# FitLog Lite Development Report

## 1. Actual baseline / release identity

Latest production round: Unified Experience & Visual Consistency, 2026-10-09.

- START_COMMIT: `32b1de23591bb7c24677551b9791eb501a362d0e`. Clean main, branch/ff-only pull/log verified; origin/main rechecked unchanged before publication.
- APPLICATION_COMMIT: `462c98ef4ebd8296187c66ae5b9a9c6619449c9c` —29 application files, including shared architecture, service, tests and durable rules.
- Application Actions/Pages: https://github.com/king-640-060/fitlog-lite/actions/runs/37905790820 — success, including typecheck,760 units, build and deployment.
- Production: https://king-640-060.github.io/fitlog-lite/.
- END_COMMIT: the LATEST-only commit containing this report. Exact SHA and final CI/assets/data/offline receipts are external and returned to the user, avoiding self-reference.

## 2. Root causes

Weight intersect-only tiny-dot hit detection required excessive precision. Recovery did not share bounded rendered-coordinate hit handling and sparse numeric feedback. Weight had duplicate hero/readout emphasis; Sleep/Water shared an outer group/range and lacked direct record actions. Strength history was distant while other training histories were nearby. Local typography and hardcoded Report chart colors caused inconsistent proportions/theme behavior. Sparse actual dates also collapsed against year-old observations, and the one-point SVG could repeat date labels at one position.

## 3. Final structure

Progress Trend now owns three independent sibling Weight/Sleep/Water modules. Each has shared header/icon/nearby History, one actual selected value/full date, chart, independent7/30/90(default30), then record actions. No body heading, duplicate Weight hero or Recovery outer card. Range/valid selection/internal scroll survive History and Calendar return; range changes reset latest, deleted points fall back latest. Domain-only saved-fact refresh prevents unrelated modules from remounting. Refresh owns visibility/midnight cleanup.

Workout Strength/Cardio/Kegel use the same peer header and nearby History. Removed the distant recent Strength list; complete Strength history remains available. Cardio main label is 新增有氧记录. All three primary actions retain shared lime states.

## 4. Shared visual contract / components

`docs/UNIFIED_MODULE_VISUAL_HIERARCHY_CONTRACT.md` was established before implementation. Durable AGENTS/UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM/UI_QA_MATRIX/TRAINING_RECOVERY_UX_CONTRACT now reference it.

`trendModule.ts` supplies shared anatomy, independent state, factual dates and saved-fact refresh; `trendInteraction.ts` supplies bounded pointer handling/sparse collision rules; `weightChart.ts` supplies reusable Chart.js presentation/ownership; `modules.css` supplies semantic sizes. Existing recordHistory/Sheet/primary primitives remain authoritative.

Tokens: --type-page1.5rem(24px), --type-module1.0625rem(17px), --type-metric1.75rem(28px), --type-unit/body.9375rem(15px), --type-meta.8125rem(13px), --type-action.875rem(14px). Icon20px in32px existing soft surface; controls>=44px, main record actions>=48px. Shared existing card spacing/radius/surface. Chart height11rem, sparse8.5rem, axes.8125rem. Category aliases reuse accent-mid/info/carbs; no independent palette.

## 5. Actual trend interaction

Chart.js remains Weight's engine. Screen CSS coordinates are derived from rendered points; SVG uses ScreenCTM. Near-point/date-column taps accept bounded44px horizontal proximity and12px plot exterior tolerance, with12px natural drift; distant exterior/cancel/native scroll do not select. Pointer, mouse, keyboard/assistive activation update the actual value/date, selected marker and locator. Native horizontal and vertical touch scrolling are verified without hijacking gestures.

Weight8/9 and Water8/9 actual-coordinate touch changes observable readouts/highlights; equal-valued Water dates still move date/marker.1–3 actual observations use compact even spacing and collision-safe value/date labels; dense charts omit numeric clutter and scroll internally. Missing recovery dates split lines, never create zeros. Weight History→查看全部趋势 retains year-old facts, complete dates, selection and scrolling using a distinct owned canvas.

## 6. Direct record actions

Weight records/modifies Today through existing upsertWeight, guarded repeated submit and retained inline errors. Inspected historical points never become implicit write dates; explicit Calendar/history dates remain intact.

Sleep Start/Woke reuse existing startSleep/finishSleep and unique active session. Backfill uses createCompletedSleep with real start/end, actual duration, wake metadata and captured automatic/manual night. Invalid/future/inverted inputs reject; repeated same-ID submit is idempotent and conflicting facts reject. It creates completed facts only and cannot mutate an active sleep. No inferred stages/quality.

Water opens the shared lightweight Sheet with250/500/custom. Existing addWater/edit/delete and exact-ID Action Toast Undo remain. Writes use Today, independently of inspected points; custom Back retains the same Sheet.

## 7. Data consistency / compatibility

Actual UI writes are checked in native IDB plus Today/Trend/History/Calendar/Day Detail/Day and Month Reports. Sleep uses the existing business-night resolver and bounded date reader. New completed backfills preserve factual timestamps and optional attribution through Backup/Sync. Frozen fixtures and prior tests remain.

Unchanged: Dexie11, IDB110/20stores, Backup11/Restore1–11, Sync/envelope1, AIConfig1, VoiceConfig1, device-only WaterReference1, permanently retired Video. No schema/index/reset/startup rewrite or business nutrition algorithm changes.

## 8. UI size / visual acceptance

PASS:320/375/390/430 ×100/120/140/200 ×Light/Dark ×Normal/Reduced plus landscape =65 unique contexts. Unified, Training and Daily Records each ran the full65 matrix. Enlarged text grows/wraps, targets remain usable; dense charts own horizontal scroll, page stays bounded. Today and Reports retain their domain-specific content/actions while sharing semantic type sizes and theme tokens. Plan/Food/Management/Calendar/Sheet paths were also audited by retained gates.

Actual screenshot review fixed single-point date overlap, Food counted meal metadata clipping at320/200, Report training grid overflow, missing Weight token alias and duplicate main/all-history canvas identity. Empty/single histories remain compact/content-sized; long histories own body scroll. All-history actual observations stay distinguishable despite large date gaps. Tall original screenshots include fixed navigation at the current viewport position; scrolling and reserved bottom space are separately asserted.

## 9. Training continuity

Strength autosave/actual saved completion and full histories; Cardio draft/busy/single write/edit/delete; Kegel manual/natural completion, unlock notice, failed-save retry, absolute-time timer/pause/visibility/Wake Lock/audio cleanup remain covered. Nearby headers share primary styling without altering execution engines.

## 10. Tests / regression

| Gate | Result |
| --- | --- |
|npm run typecheck|PASS|
|npm test|PASS —760 /65files;746 original retained +14 new|
|TZ=UTC npm test|PASS —760 /65files|
|npm run build|PASS —clean APP and CI; existing bundle-size advisory|
|git diff START..APP --check|PASS|
|Retained browser suites|PASS —all28 retained|
|New unifiedExperience|PASS —29 total interaction suites, plus preservation/assets guards|
|Unified/Training/Daily matrices|PASS —65 unique contexts each|
|Integrated cycles|PASS —20 actual complete cycles per representative gate locally and production|
|Lifecycle|PASS —actual Chart.js ownership1 when open/0 after exit, stable listener/timeout/interval/RAF counts, no lingering Sheet/focus/scroll-lock or duplicate writes|
|Production targeted suites|PASS —8 interaction suites plus exact assets gate|

Retained inventory: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout, managementWorkspace, managementVisualConsistency, foodRecovery, macroNutritionSummary, catalogRecovery, dailyRecordsExperience, trainingRecoveryExperience, trainingRecoveryLifecycle.

Obsolete hero/shared-range/old-label/bottom-list assertions were replaced by stronger peer/independent-range/factual-value/nearby-history assertions. No test deletion, skipped gate, timeout increase, frozen-fixture edit or new dependency. Actual coordinate tests do not call business interaction functions. Synthetic IDB fixture replacement reloads the app because arbitrary native writes bypass Dexie's observation cache; actual service writes are separately verified live. CDP raw canvas enumeration can retain destroyed nodes through automation handles; lifecycle asserts live Chart.js-owned canvases instead, while retaining independent timers/listeners/Sheet/data checks. Production test-process IPv4 routing preserves HTTPS origin/assertions and changes no app/global networking.

## 11. Production / preservation

Application CI/Pages success preceded production regressions. Exact HTML/build-info/App/JS/CSS/SW bytes/SHA/precache and five main views/AI settings/Sync entry pass.

Same existing dedicated synthetic production profile from the previous round was reused without reseeding. Baseline→APP all20-store contents,25rows,8device-config keys and versions compare equal. Entire data SHA256: `6448eeaacd97e099ef91416e1db77db3f683113b11662765ad48c8e9dc995799`; config SHA256: `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`. APP/SW identity both `462c98ef4ebd8296187c66ae5b9a9c6619449c9c`; new offline page cold boot passes with identical data/config. Final END identity/data/offline evidence is external after this report-only commit's CI/Pages.

## 12. Screenshots / actual changes

Artifacts: `artifacts/unified-experience-2026-10-09/`.38 required original scenes, five contact sheets, screenshot-index with hashes, manifest and actual visual-review receipt. Includes ordinary/enlarged/small/dark/reduced/landscape, actual8/9 selection, sparse/dense/empty, direct-record/editor/timeline, training peers, Today/Reports and short/long History. Browser originals are unedited. Machine matrix/browser inventory/production logs/preservation receipts remain separately inspectable.

Actual changed files (29 application + this report =30):

- `AGENTS.md`
- `docs/INTERACTION_VISUAL_SYSTEM.md`
- `docs/TRAINING_RECOVERY_UX_CONTRACT.md`
- `docs/UI_INTERACTION_SPEC.md`
- `docs/UI_QA_MATRIX.md`
- `docs/UNIFIED_MODULE_VISUAL_HIERARCHY_CONTRACT.md`
- `src/main.ts`
- `src/services/recoveryService.ts`
- `src/styles/main.css`
- `src/styles/modules.css`
- `src/styles/plan.css`
- `src/ui/recovery.ts`
- `src/ui/recoveryLineChart.ts`
- `src/ui/trendInteraction.ts`
- `src/ui/trendModule.ts`
- `src/ui/weightChart.ts`
- `src/ui/weightHistory.ts`
- `src/ui/weightTrend.ts`
- `tests/browser/catalogRecovery.mjs`
- `tests/browser/dailyRecordsExperience.mjs`
- `tests/browser/foodRecovery.mjs`
- `tests/browser/mobileLayout.mjs`
- `tests/browser/trainingRecoveryExperience.mjs`
- `tests/browser/trainingRecoveryLifecycle.mjs`
- `tests/browser/uiSemanticConsistency.mjs`
- `tests/browser/unifiedExperience.mjs`
- `tests/browser/unifiedExperiencePreservation.mjs`
- `tests/dailyRecordsSummary.test.ts`
- `tests/unifiedExperience.test.ts`
- `LATEST_DEV_REPORT.md`

## 13. Pending / limits

- Automated interaction, dimensions, data continuity, resources, CI/Pages and synthetic offline evidence: Verified.
- Physical iPhone Safari: Pending.
- Original installed PWA: Pending.
- Real-device data continuity: Pending.

No unresolved automated product defect. Browser emulation cannot substitute for device evidence. Do not uninstall the original PWA or clear website data for verification.
