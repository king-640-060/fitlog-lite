# FitLog Lite Development Report

## Latest production round — Training & Recovery Experience Unification (2026-10-09)

- START_COMMIT: `99d6187b4573793c9a373fb7cbc92b9173d8d500`. Clean main, branch/ff-only pull/log verified; remote baseline rechecked before publication.
- APPLICATION_COMMIT: `9194390f0e3e45cdede5e2d87b453a4e73d08231`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37883862104 — success, including746 tests/typecheck/build/Pages.
- Production: https://king-640-060.github.io/fitlog-lite/.
- END_COMMIT: the report-only commit containing this file. Exact SHA and final CI/assets/data/offline receipts are external and returned to the user to avoid self-reference.

## Audit and shared architecture

Established `docs/TRAINING_RECOVERY_UX_CONTRACT.md` before UI implementation. Existing Kegel engine, Strength autosave, Cardio services and nine-category daily facts were retained. Prior UI lacked explicit results, had distant Weight management, large recovery history frames, nonselectable lines and wake-date sleep aggregation.

- `trainingCompletion.ts` / `trainingCompletion.css` share Completion Layout/Status/Summary/Actions for Kegel and Strength. Capture factual result once, saving/saved/error, disable repeated save, retain identity/result on retry, render actual successfully saved metrics, explicit Return; no automatic list jump or second unlock modal.
- Kegel captures one Session ID before await; transaction reuses identical existing ID and rejects conflicting facts. Stop timer RAF/interval, release Wake Lock and suspend cue audio; preserve timer engine/absolute clock/pause/visibility/progression. Manual completion never unlocks; natural unlock is an inline notice. Actual duration follows saved start/end semantics, including existing pause accounting.
- Strength flushes autosave then finishes the captured Workout; result shows actual saved actions/sets/date/optional subjective note, no inferred weight/score/time. View this saved record in the existing Sheet; return is explicit.
- Cardio stays lightweight. Busy/error retain draft and same Sheet; successful save closes/back once and locally patches its card. Repeated submit is guarded; actual history edit/delete and focus return update summaries without full-page flashing.
- `recordHistory.ts` shares content-sized History Sheet, Row, Meta, Actions, Empty State and same-Sheet editor/date Back. Weight/Sleep/Water use exact IDs, confirmed deletion, owned liveQuery, retained nodes/scroll/focus, in-place update and X cleanup. Cached detached parent nodes allow background writes during an editor without errors or lost drafts. Weight entry is near its summary; no bottom long list after Recovery.
- `weightTrend.ts` retains Chart.js and shares precise readout/selection/keyboard/internal-scroll behavior with `recoveryLineChart.ts`. Latest valid default, selected radius,44px targets; same-range updates retain selection and focus, range changes reset. Missing recovery days split lines; one/empty point stays factual. Removed all default numeric point labels and the whole daily expansion list.

## Sleep business dates and cross-surface facts

`getSleepBusinessDate` / `resolveSleepBusinessDate` is the shared source. Local start00:00–05:59 belongs to the previous night;06:00–23:59 belongs to the start date. This is attribution, not an inferred sleep type.

| Local start | Business date |
| --- | --- |
|2026-10-10 02:00|2026-10-09|
|2026-10-10 23:40|2026-10-10|
|2026-10-09 23:30|2026-10-09|
|2026-10-10 08:00|2026-10-10|
|2026-10-10 14:00|2026-10-10|
|2026-10-10 05:59|2026-10-09|
|2026-10-10 06:00|2026-10-10|

Optional sleepNightDate/sleepNightDateSource/sleepStartLocalDate are captured on new records, stable through timezone travel and preserved by existing Backup11/parser/Restore/Sync1. No DB/schema/index change. Manual correction chooses captured start date or previous night, visibly explains its range, preserves true start/end including seconds/milliseconds, ID and createdAt; end-only edits retain attribution. Legacy recordDate remains wake metadata, never repurposed. Legacy rows are not rewritten at startup; their missing original timezone is disclosed and fallback uses current local start time. Actual time corrections use current local timezone and reject future/inverted times.

Existing startTime index reads a bounded guard window then resolves nights: Calendar42, Detail/Day Report one date, Recovery7/30/90, period Reports selected natural range. Latest completed Today sleep uses a separate bounded indexed lookup; active sleep is independent and excluded from completed totals. No all-history sleep scans on date surfaces. Calendar/Detail/Trend/Day/Month/History share this same aggregation, exact deletion and live ownership. Today shows recent completed sleep even when it belongs to yesterday, also alongside active sleep.

`sleepTimeline.ts` shares actual chronological intervals/gaps/duration between History and Day Detail. Usual18:00→next12:00 bounds use calendar arithmetic across DST and extend for exceptional real times. Multiple actual intervals sum saved durations. No fabricated stages, REM, quality or score.

## Regression and visual evidence

| Gate | Result |
| --- | --- |
|npm run typecheck|PASS|
|npm test|PASS —746 /64 files;717 previous tests retained plus29 new|
|TZ=UTC npm test|PASS —746 /64 files|
|npm run build|PASS — clean application and CI; existing bundle-size advisory only|
|git diff --check|PASS|
|Full browser release inventory|PASS — all26 retained plus2 new,28 total|
|Training matrix|PASS —65 unique contexts,4width×4font×2color×2motion plus landscape|
|Daily Records matrix|PASS —65 unique contexts, all prior nine-category/data/clear/keyboard assertions|
|Food Recovery|PASS — full35-context gate|
|Integrated stress|PASS —20 full training/history/correction/trend/calendar/report cycles locally and production|
|Resource lifecycle|PASS —20 manual cycles;0 RAF/interval, stable Window22/Document10 listeners after feedback settles|
|Cross-page editor writes|PASS — same Sheet/parent lists and unsaved drafts retained|
|Delete last record|PASS — three histories empty, Today/Trend/Calendar/Detail/Day/Month no stale facts|

Browser inventory: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout, managementWorkspace, managementVisualConsistency, foodRecovery, macroNutritionSummary, catalogRecovery, dailyRecordsExperience, trainingRecoveryExperience, trainingRecoveryLifecycle.

Obsolete wake/default-label/automatic-list-jump expectations were replaced with stronger business-night/shared-completion/selected-readout assertions. No gate skip, weaker assertion, increased timeout, dependency or frozen-fixture edit. Initial CI on9810431 found a synthetic multi-episode fixture relying on host timezone; its captured attribution is now explicit, the516-minute/two-episode assertions remain intact, full UTC tests pass and corrected CI deployed9194390. Initial failed run never deployed Pages. Several parallel production reloads hit the host network IPv6 reset/ERR_INTERNET_DISCONNECTED; direct IPv4 and the existing local proxy returned200. A test-process-only IPv4 resolver route then reran every affected full production suite with the same HTTPS URL, assertions and12s timeout; no app networking or global settings changed. Final focused resource checks wait for legitimate finite Toast disposal before comparing listener counts.

Actual27 scene screenshots/contact sheets were inspected, plus raw390/100,320/200 dark reduced,430/140 dark reduced and landscape. Fixed shared radius token, completion date wrapping, chronological interval order, Sleep row title/meta density and long Weight canvas intrinsic overflow. Short histories are content-sized, long histories own body scrolling; enlarged completion results grow vertically and remain scrollable. Long-element screenshots may include fixed navigation at the current viewport position; actual page scrolling and reserved bottom space are separately asserted. No claim of physical Safari from Chromium.

External artifacts: training-recovery-2026-10-09/local/contact-all-27.png, contact-scenes-1/2/3.png, screenshot-manifest.txt, matrix-65.json, visual-review.json and individual originals. Final focus/background-draft fixes were verified on a stable build; final65 matrix includes focus retention. All final gate logs and receipts are external.

## Production application verification

All7 targeted production suites PASS: trainingRecoveryExperience(4 contexts,20 integrated cycles), trainingRecoveryLifecycle(20 resource cycles plus background writes and delete-last), dailyRecordsExperience(5), foodRecovery(4), catalogRecovery(6), macroNutritionSummary(4), uiQualityAudit. Existing AI/catalog/configuration, nutrition, nine-category facts, reports and Sheet functionality remain covered. Synthetic profiles and mocked providers only.

Exact productionAssets PASS: HTML/build-info/App identity, JS/CSS byte lengths/SHA256, exact SW bytes/precache and identity asset, all5 tabs, AI Settings and GitHub Sync entry, no page errors.

- `index-A3m4yDkr.js`: 835731 bytes; SHA256 `f7efc1803546a6e6596d34669ea9af80c5da9fddd18d8b53b9a9e917c29beb9b`.
- `index-pkhjcYyA.css`: 126755 bytes; SHA256 `cd6b37197daf705581fbc0fedd411e9b5cf2fc87f3b7b53b0af6dbbb69fd3b7d`.

One dedicated invented-data production profile was created before this release on the old production build and reused throughout this release, rather than claiming an unavailable older-round profile.25 actual fixture rows across20 stores remain unchanged; valid synthetic AI profile/key/Voice config and WaterReference2100 are retained with identical keys/hash.

- All20-store hash: `6448eeaacd97e099ef91416e1db77db3f683113b11662765ad48c8e9dc995799`.
- Config hash: `609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`.
- New offline page boots application App and controller `9194390f0e3e45cdede5e2d87b453a4e73d08231` and the same rows/config.
- Report-only END repeats CI, exact resources, the same persistent-profile hashes and offline new-page identity. Exact final receipts live outside this self-referencing report.

## Compatibility / Pending

Verified automated and synthetic: Dexie11 / IndexedDB110 /20 stores, stable DB name/indexes; Backup11 / Restore1–11; Sync/envelope1; AIConfig1 / VoiceConfig1 / WaterReference1. New optional attribution survives actual encrypted roundtrip and hash validation; malformed restore rejects before write. Historical FoodLog/Workout snapshots and old Sleep timestamps unchanged; Video remains retired. No personal profile, original PWA, reinstall or real-data reset used.

- Physical iPhone Safari: **Pending**.
- Original installed PWA: **Pending**.
- Real-device business data continuity: **Pending**.
- No known unresolved product-code blocker after automated/production gates.

## Actual changed files

Application37 files plus this report,38 total:

- `AGENTS.md`
- `LATEST_DEV_REPORT.md`
- `docs/DAILY_RECORDS_UX_CONTRACT.md`
- `docs/INTERACTION_VISUAL_SYSTEM.md`
- `docs/TRAINING_RECOVERY_UX_CONTRACT.md`
- `docs/UI_INTERACTION_SPEC.md`
- `docs/UI_QA_MATRIX.md`
- `src/db/types.ts`
- `src/main.ts`
- `src/services/dailyRecordsSummary.ts`
- `src/services/pelvicFloorService.ts`
- `src/services/recoveryService.ts`
- `src/services/weightService.ts`
- `src/styles/recovery.css`
- `src/styles/trainingCompletion.css`
- `src/ui/dayDetail.ts`
- `src/ui/recordHistory.ts`
- `src/ui/recovery.ts`
- `src/ui/recoveryLineChart.ts`
- `src/ui/sleepTimeline.ts`
- `src/ui/trainingCompletion.ts`
- `src/ui/weightHistory.ts`
- `src/ui/weightTrend.ts`
- `src/utils/recovery.ts`
- `src/utils/reporting.ts`
- `src/utils/sleepBusinessDate.ts`
- `tests/browser/README.md`
- `tests/browser/catalogRecovery.mjs`
- `tests/browser/dailyRecordsExperience.mjs`
- `tests/browser/foodRecovery.mjs`
- `tests/browser/trainingRecoveryExperience.mjs`
- `tests/browser/trainingRecoveryLifecycle.mjs`
- `tests/browser/trainingRecoveryPreservation.mjs`
- `tests/browser/uiQualityAudit.mjs`
- `tests/dailyRecordsSummary.test.ts`
- `tests/recovery.test.ts`
- `tests/trainingRecovery.test.ts`
- `tests/waterReference.test.ts`

## ChatGPT Baseline

Current application `9194390f0e3e45cdede5e2d87b453a4e73d08231`: shared explicit Kegel/Strength completion and lightweight guarded Cardio; nearby shared Weight/Sleep/Water histories; stable captured sleep business nights; actual interval timelines; selectable7/30/90 recovery and Chart.js weight interaction; no daily expansion list.746/64 units,28 browser gates,65 displays,27 inspected scenes and20 integrated cycles; production/synthetic preservation/offline verified. DB11/110/20,Backup11/Restore1–11,Sync1/config1 remain. Final main is the report-only commit containing this file; read Git first. Physical Safari/original PWA/real-device continuity Pending.
