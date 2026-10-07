# FitLog Lite Development Report

## Latest production round — Habit editor Save action flow fix (2026-10-07)

- START_COMMIT: `ea2190e1154426b5d4825c44bc82ef5f5c970ed5` (clean main; actual git status/branch/pull/log confirmed).
- APPLICATION_COMMIT: `861bff37d933f380cf7bc0931fb86eb3dc9cd881`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37580126858 — completed success; Pages deploy success.
- END_COMMIT: the report-only commit containing this file. Exact SHA and final Actions/assets receipts are in the external report and final response, avoiding self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Confirmed root causes and scoped changes

The user-confirmed Save overlay is caused by `.habit-editor-actions { position:sticky; z-index:1; bottom:0 }` inside the shared scroll body. It pinned Save over fields rather than leaving it after planning. Final rule:

```css
.habit-editor-actions { padding: 2px 0 0; }
.habit-editor-actions .primary { min-height: 52px; border-radius: 15px; }
```

Save retains primary/full-btn and Fresh Green. No sticky/fixed/absolute overlay, replacement z-index, giant bottom padding or keyboard timeout patch.

A second related viewport constraint was measured: on390×844/100%, an empty Manager was313.25px high with238px body; Manager→New froze that short frame while the editor content was691px. Direct create did not take that freeze path. Habit now opens the existing large Sheet variant from the beginning for all entries, so Manager, New and Edit share the same usable frame. This is a Habit-only `openModal(...,true)` change. Shared stabilizeSheetSubview, subview/back animations, keyboard/scroll-lock controller and existing Safe Area padding remain unchanged.

Normal order is basic information → planning → Save → existing Habit state/stop/reactivate/quiet danger. New ends after Save. Existing Habit history guidance, create/update/active/delete/check-in services and all data semantics are unchanged. All showHabitManager callers use this one editor, including Today direct openCreate.

## Automated verification

- npm run typecheck: PASS.
- npm test: **648 tests /58 files PASS**.
- npm run build: PASS; application clean Pages build local:false. Existing Vite large-chunk advisory remains.
- git diff --check: PASS.
- Complete local release browser inventory: **20/20 PASS** — uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout.
- New habitEditorLayout locally and production: **24/24 contexts PASS each** =320×812/375×812/390×844/430×932 × fonts100/120/140 × normal/reduced motion.
- Real topbar Management→Habit Manager→New, Today direct create and editing a Habit created through the UI all pass. Direct/Manager creation DOM and frame are equal. Computed Save position static, full width/52px minimum/15px radius preserved; visible Save/field/fieldset/target/state maximum intersection height **0px**.
- Scroll measurements at0/25/50/75/100% show invariant body-relative Save position and screen position changing by exactly minus scrollTop. At390/100, the complete new form fits the large viewport, so ordinary scroll range is0; existing-edit and mocked keyboard states exercise nonzero scrolling.320/140 normal new-form scrolling is nonzero. No fake filler/padding was added to the App.
- Mock keyboard focus/input/open/close and34px platform Safe Area substitution pass; Save follows flow through nonzero keyboard scroll samples and is fully reachable above the body bottom. These are Chromium mocks, not actual iPhone evidence.
- Manager return restores a real180px parent scroll; each new editor starts at0. Save returns to Manager and restores parent scroll.20 rapid manager→editor→back cycles per context interrupt/replace real subview animations rather than waiting out every animation. Final frame/DOM/transform/opacity/pointer state and lock cleanup pass, with no duplicate form or horizontal overflow.
- Reduced-motion contexts pass; existing Motion System remains active in normal contexts. Representative local/production390/100 top/middle/bottom and320/140 top/bottom plus edit-state screenshots reviewed: Save is after planning and before state/danger controls, never across fields. Weekday<=360px four-column strategy remains unchanged.

### Retained failures / test reliability

An isolated negative control restores the original sticky CSS and the new regression fails immediately on `sticky !== static`, confirming it catches this defect. It is an expected negative control, not a release gate pass.

Initial uiSemanticConsistency failed on an unrelated measurement of47.99993896484375px during the existing120ms navigation animation, while CSS min-height was48px. The helper previously waited100ms. It now awaits the actual `#view` animation.finished before geometry measurement, preserving the original48px assertion and all other assertions; no timeout was raised, no assertion removed and no Workout production style changed. Full four-width retry PASS; original failure and diagnostic logs retained. All other19 release gates pass, including the new Habit gate. No skipped tests.

## Production verification

Application Actions/Pages succeeded. Production targeted Habit matrix24/24 PASS, max overlap0px; production screenshots reviewed. productionAssets verifies the exact HTML meta/build-info local:false, JS/CSS byte counts and SHA256, SW exact bytes/precache plus five-tab/AI Settings/Sync smoke against the clean application build. No browser page errors.

The report-only END rebuild/push repeats Actions/Pages and exact production resource verification. Its exact receipt is external. The complete20-suite run is local; production verification is the targeted24-context Habit matrix and resource/smoke checks, not an unrun full20-suite production claim.

## Data and compatibility

DexieV10 /IndexedDB100 /18 stores unchanged. BackupV10, RestoreV1–V10, SyncV1/envelopeV1, AIConfigV1 and device-only VoiceConfigV1 unchanged. No schema bump, persistence/service/Backup/Restore/Sync/AI/Voice/Task Editor change. All browser writes are isolated synthetic contexts. Existing unit migration/preservation and compatibility regressions pass. No real user site storage was cleared, restored or reseeded.

Training Video Search remains permanently retired from the prior production round; never restore it from older instructions/docs. Existing owned Voice Mode, Food Vision, Nutrition Strategy, DietEvent, Journal and Habit deletion contracts remain active.

## Changed files and evidence

Application9 files: src/main.ts, src/styles/main.css, tests/browser/habitEditorLayout.mjs, tests/browser/uiSemanticConsistency.mjs, tests/browser/README.md, AGENTS.md, docs/UI_INTERACTION_SPEC.md, docs/INTERACTION_VISUAL_SYSTEM.md, docs/UI_QA_MATRIX.md. END changes only LATEST_DEV_REPORT.md.

External evidence / full27-item report / exact commits, Actions, measurements, original failures, accepted gates and reviewed screenshots:
`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/work/artifacts/habit-editor-flow-2026-10-07/`

## Manual verification and remaining gaps

Physical iPhone Safari: **Pending**. Original installed PWA: **Pending**. User's prior recording establishes the original bug, not physical verification of this fix. Automated keyboard/Safe Area/Chromium results cannot establish actual iOS keyboard, toolbar or installed-PWA update timing. No remaining failure in requested automated gates; owner physical retest remains open.

## ChatGPT Baseline

STARTea2190e1154426b5d4825c44bc82ef5f5c970ed5; APPLICATION861bff37d933f380cf7bc0931fb86eb3dc9cd881; END this report-only commit. Habit Save is static flow with2px top padding, unchanged52px/15px primary full-btn; Habit-only existing large Sheet avoids freezing the empty manager's238px body and unifies all entry frames. Shared motion/keyboard/Safe Area remain; parent scroll restore/new editor top verified.648/58 unit, typecheck/build, local20/20 browser and production Habit24/24 PASS;0px overlap,20 rapid cycles/context, keyboard/reduced mocks pass. DBV10/100/18, BackupV10/Restore1–10, Sync/envelopeV1, AIConfigV1/VoiceConfigV1 unchanged. Physical Safari/original PWA Pending. Video feature stays retired.
