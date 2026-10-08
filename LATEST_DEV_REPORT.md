# FitLog Lite Development Report

## Latest production round — Unified Daily Records Experience (2026-10-08)

- START_COMMIT: `039d3b41b0bfe6a20bc5fcb90b12afbc79a8f2dc`. Clean main; status/branch/ff-only pull/log confirmed at start and remote main rechecked before publication.
- APPLICATION_COMMIT: `c37f9fc3cecd7faa4b94598f46e1aa0eb809e43f`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37762704866 — completed success, including typecheck/tests/build/Pages.
- END_COMMIT: the report-only commit containing this file. Exact final SHA, final Actions and final asset/data/offline receipts are external and returned to the user to avoid self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Audit and integrated contract

The initial implementation had six Calendar categories capped at four visible markers, five base detail categories, bars/default average blocks and water Undo inside the card. Today/Recovery and existing Week/Month services already persisted valid facts. `docs/DAILY_RECORDS_UX_CONTRACT.md` was established before implementation: Today owns frequent actions, Calendar actual category presence, Detail complete saved facts, Trend labelled time variation and Reports daily/period facts. All five surfaces now share date semantics and presentation primitives. No unrelated module redesign.

### Bounded shared facts and live ownership

`dailyRecordsSummary.ts` reads existing date/recordDate indexes within one readonly transaction. Calendar reads all42 displayed dates including adjacent months, Detail/Day Report one date, Reports the selected natural period excluding future dates, Recovery only its7/30/90 range plus independent active-key lookup. Habit definitions use referenced IDs; period reports may read the small definition catalog for preserved planned-habit coverage. No whole-history scan of business records or shadow database. Existing write services remain authoritative.

`recoveryDayFacts` sums completed sessions by saved local wake recordDate and WaterLogs by date. Missing is undefined, never fabricated zero. Active sleep is excluded from completed markers/lines/reports. Multiple episodes/water entries sum, actual historical inactive HabitCheckIns remain facts. FoodLog/Workout snapshots are not recalculated from current libraries. Day Sheet and Day Report use the same nine-group renderer and facts.

Owned liveQuery subscriptions refresh Calendar grid, open Day Sheet, Today/Trend and Reports. Date/route/Sheet cleanup unsubscribes; stale async navigation cannot open a wrong-date Sheet. Shared group patching keeps the exact Sheet, date, native disclosure openness, unchanged nodes, scroll, focus and drafts. No-op visibility reads do not replace Today nodes.

### Compact shared Action Toast

Removed the card-flow water Undo block. One shared compact Action Toast uses existing tokens/motion, quiet border and44px Undo; new feedback replaces old feedback. Three rapid +250/+500/+250 writes produce three independent WaterLogs and1000 ml; Undo captures the latest successful exact ID, guarded against duplicates. Failure remains visible and retryable, never a false success. Stable number geometry preserves card height including0→250.

The manual popover uses the top layer and the shared Sheet viewport event, accounts for navigation/Safe Area/keyboard and avoids current foreground controls. When a native modal opens, the same toast joins its subtree so Undo is interactive rather than modal-inert; close moves it safely back. Owned focus/close/animation/scroll handlers and timer dispose when feedback is replaced/removed. Regression actually clicks Undo with the custom-water editor open and retains the unsaved123 draft.

### Shared labelled recovery lines and existing Reports

Sleep/Water share `recoveryLineChart.ts` SVG geometry: actual7/30/90 local dates, marker and default numeric value for every actual point, missing dates split paths, actual zero retained. Data-derived scales, label-sized spacing and gutters expand internal width before labels collide or clip.30/90 and enlarged-font ranges scroll only within chart regions, never the body. No new dependency, target line, judgment or hidden labels. Complete daily facts remain expandable. Default Trend averages were removed.

Existing Reports now has Day/Week/Month. Day uses selected-date shared picker and the same complete detail renderer. Week retained all prior functionality. Month adds objective sleep average duration/circular mean bedtime/wake/recorded days, water 有记录日平均/recorded days/total. Averages use only actual recorded dates; sleep duration sums episodes first, clock means use each day's longest episode. Missing dates do not become zero. No sleep/water score, achievement or health judgment.

### Nine-category Calendar and complete details

Order: food / strength / cardio / pelvic / weight / dietEvent / habit / sleep / water. Fixed3×3 slots; absent slots empty, all actual icons visible, no +N, no cell kcal/progress. Nine shared-icon legend entries wrap. Seven date targets remain44px at320 through existing small-screen margin bleed; cells104px at100% and140px at200%, growing with text. Adjacent-month records are fully read and open the correct month/date.

Nine native disclosures contain every saved FoodLog (unknown macros stay unknown, original per100g snapshots), Workout/action/set/reps/optional load/legacy saved RPE/notes, Cardio type/speed/incline/duration, Kegel facts, WeightLogs, editable DietEvents/independent estimates, historical actual HabitCheckIns, all completed sleep instants/durations and all water amounts/timestamps. Missing load is 重量未记录, never fabricated0. Strength editor/execution still does not expose RPE; complete saved day facts are the explicit exception. Normal mobile rows align summary/details; small widths/enlarged fonts stack accessibly, without truncation.

`clearDayRecords` implementation stays unchanged: FoodLogs, DietEvents, NutritionTargets, Workouts, CardioSessions, PelvicFloorSessions, Weights only. Action/confirmation explicitly name the scope. Sleep/Water/Habit/Tasks are preserved in an actual clear regression.

## Compatibility and preservation

- Dexie11 / IndexedDB110 /20 stores; same DB name/schema/indexes, no migration or storage clearing.
- Backup11 / Restore1–11; Sync/envelope1; device-only AIConfig1/VoiceConfig1/WaterReference1 unchanged. Video remains retired.
- No Backup/Restore/Sync/AI implementation, frozen fixture, dependency, timer-engine or business service write change. Offline core and historical snapshots preserved.
- No personal browser profile accessed, no reinstall/Restore/reseed as an upgrade remedy. All writable tests use separate invented data.

## Automated verification

| Gate | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm test | PASS —717 tests /63files; all705 retained plus12 new assertions |
| npm run build | PASS — clean application build and CI build; existing bundle-size advisory only |
| git diff --check | PASS |
| Existing full browser release inventory | PASS —all25 retained |
| New dailyRecordsExperience | PASS —65 unique local contexts |
| Final shared-toast rerun | PASS —full35-context foodRecovery and aiAssistant |
| Integrated stress | PASS —20 full cross-surface cycles locally and on production |
| Production targeted | PASS —five suites listed below |

Existing25: catalogRecovery, aiAssistant, aiStreaming, managementWorkspace, managementVisualConsistency, foodRecovery, macroNutritionSummary, habitEditorLayout, motionPolish, uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiVoice, voiceMode, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion. New26th: dailyRecordsExperience. Obsolete four-marker/bar assertions were updated to stronger nine-slot/labelled-line assertions, never skipped/deleted or given longer timeouts. Workspace's four fresh width shards retain all24 unique contexts, original assertions and20 rounds each.

Daily local matrix:320/375/390/430 ×100/120/140/200% ×light/dark ×normal/reduced (64), plus844×390 dark landscape140% reduced. All nine categories/details, adjacent dates, visible SVG labels/BBoxes/gaps/large/equal values, chart-only scrolling, real add/undo/edit/sleep finish/habit check-in, cross-tab same-Sheet identity/open groups/focus/scroll, keyboard Undo/draft and original clear scope pass. Twenty continuous Calendar/month/expand-all/Trend7,30,90/Day/Month/Today/add/undo rounds have no page errors/locks/overflow.

Early development failures, source corrections and raw rerun logs are external. Browser testing found and fixed internal chart width/label gutters, no-op DOM replacement, foreground viewport placement and native modal-inert Undo. Fixture/API/selector corrections retained the original tests. Serial Workspace runs were replaced with complete fresh four-shard unions, not a partial pass. Two final local tests hit404 while a rebuild replaced the preview directory; full HabitDeletion and full FoodRecovery reruns passed on the stable preview, without assertion/timeout changes. Final65-case matrix passes the finished source; the later landscape-only rerun adds screenshots without changing assertions.

## Visual evidence

External delivery contains15 scene screenshots/contact sheet: nine/single/empty Calendar; collapsed/all-expanded/no-recovery Detail; Sleep and Water7/30/90; compact Toast; Day/Month Reports. All-expanded complete evidence additionally captures each of the nine actual open group nodes and assembles them; an actual scrollable Sheet viewport cannot honestly be represented as an unclipped child-element screenshot. Individual originals remain available.

Actual contact sheet and raw320/140,320/200 dark,390/100,430/140 dark and844/140 dark landscape screenshots were inspected. Calendar has seven reachable columns and all nine fixed slots, neutral shared detail cards, readable large-font wrapping, visible point values and quiet feedback outside the water card. Viewport crops of long30/90 charts are intentional internal scroll; SVG text bounds/non-overlap are separately verified for every point. Images are Chromium evidence, not physical-device photos.

## Production verification — application deployment

All five suites PASS on the actual production URL: dailyRecordsExperience(5 targeted contexts with20 stress rounds), catalogRecovery(6), foodRecovery(4), macroNutritionSummary(4), dietEvents(2). They cover320/140,320/200 dark,reduced,landscape,complete day facts,all ranges/recorded-day reports,Today/Food same macros and existing AI Catalog/reference/manager behavior. No real provider call or personal business fixture used.

Exact productionAssets PASS: HTML/build-info/application App and SW identity, JS/CSS bytes/SHA256, exact SW/precache, all5 tabs, AI settings and GitHub Sync entry; no page errors.

- `index-Jxv4wstI.js`: 819293 bytes; SHA256 `0ff76db8579132ad487451f6e411ba7e7c81834353c6e94f9f63ca1a3a665dbb`.
- `index-D2Lt30Vp.css`: 123692 bytes; SHA256 `418e748cb4ad979418e245015a13fcfd73e209748c6f7c8e2494834e2fd88e67`.

Same pre-existing isolated synthetic production profile:22 rows,110/20. Baseline/application all20-store hash `9c2df75ef30db6923c19e48a588aaa77f25d053d80f005917fc36b6ad251eab6`; old18-store hash `5566fc3e8df752b2ffd2a68a93c6db5bbef9051fd817b7fb63e9d04d2d9934c7`; AI/Voice config hash `be24fdaaad958fe42cfbfc2de052a846400e6401221282531f636669b7361dcf`. Rows/store lists/config keys/hashes identical, absent water preference stays absent. Offline NEW page boots exact application App/SW and the same hashes. Report-only END deployment repeats exact assets and this same-profile/offline guard; final receipts and exact END SHA are external because this file precedes END.

## Physical / remaining verification

- iPhone Safari: Pending —no new physical-device evidence.
- Original installed PWA: Pending —no original-device evidence or duplicate install; Chromium/synthetic offline checks are separate.
- No known unresolved product-code blocker. Real keyboard/WebKit/Safe Area and installed storage continuity require those physical follow-ups and are not claimed Verified.

## Actual modified files

- `AGENTS.md`
- `docs/DAILY_RECORDS_UX_CONTRACT.md`
- `docs/INTERACTION_VISUAL_SYSTEM.md`
- `docs/UI_INTERACTION_SPEC.md`
- `docs/UI_QA_MATRIX.md`
- `src/main.ts`
- `src/services/dailyRecordsSummary.ts`
- `src/services/reportService.ts`
- `src/styles/main.css`
- `src/styles/recovery.css`
- `src/ui/actionToast.ts`
- `src/ui/calendarPage.ts`
- `src/ui/dayDetail.ts`
- `src/ui/recovery.ts`
- `src/ui/recoveryLineChart.ts`
- `src/ui/recoveryReport.ts`
- `src/ui/sheetController.ts`
- `src/utils/recovery.ts`
- `src/utils/reporting.ts`
- `tests/browser/README.md`
- `tests/browser/catalogRecovery.mjs`
- `tests/browser/dailyRecordsExperience.mjs`
- `tests/browser/dietEvents.mjs`
- `tests/browser/foodRecovery.mjs`
- `tests/browser/foodServing.mjs`
- `tests/calendarVisual.test.ts`
- `tests/dailyRecordsSummary.test.ts`
- `tests/dayDetail.test.ts`
- `tests/dayRecords.test.ts`
- `tests/dietEvents.test.ts`
- `LATEST_DEV_REPORT.md` (report-only END).
