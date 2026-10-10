# Isolated mobile browser checks

These scripts use an external Playwright/Chrome installation. They add no application dependency and use fresh synthetic profiles only. GitHub requests in `githubSyncSafety.mjs` are intercepted; no real Token or repository is used. Run from the repository root while the Vite dev server is available:

```sh
export FITLOG_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export FITLOG_CHROME=/absolute/path/to/Chrome
node tests/browser/sharedDatePicker.mjs
node tests/browser/githubSyncSafety.mjs
node tests/browser/aiAssistant.mjs
node tests/browser/foodVision.mjs
```

Default URL is `http://127.0.0.1:5173/`; override `FITLOG_QA_URL` for the deployed app. Local checks cover 320×812, 375×812, 390×844, 430×932; production checks cover 390×844 and 430×932. Browser checks are separate from the Vitest count and physical iPhone verification.

AI checks intercept only synthetic provider endpoints and use invented credentials/data. They cover five entries, editable profiles, tiny tests/probe, empty key editing, unsupported model lists, snapshot reads, proposal confirmation/cancellation, reports/completion, safe text, usage, Stop, HTTP/CORS errors, known-secret blocking, A→B routing, permission enforcement, session/reload and offline core. They never contact a real AI provider or inspect a user's production browser profile.

Food Vision uses generated synthetic label images and an intercepted Provider. It covers three entrances, a data-free capability probe, Canvas JPEG preprocessing, expandable image review, strict unknown fields, no writes before confirmation, cancellation/double clicks, save-only/continue/save-and-log, selected dates/meals, mL guards, HTTP/CORS/Stop, manual kJ editing and preserved kcal snapshots. Its default dev URL is port 5174; override FITLOG_QA_URL for another port. Real Vision quality and physical camera/HEIC behavior are separate manual checks.

## Nutrition strategy release gate

`nutritionTemplates.mjs` exercises daily selection, manager/detail, template and variant editors, shared activation date picker, copy/reorder, V2 activation, historical snapshots and archive retention. Local widths320/375/390/430 and production390/430 use100/120/140% fonts, long Chinese names, one/four/eight variants, none/one/many WeightLogs, mocked keyboard/Safe Area and reachable bottom actions. Inspect actual screenshots at390/100,320/140 and430/100; physical iPhone Safari/original PWA remain Pending. Build the Pages distribution with `GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build`; set `FITLOG_QA_URL` to its `/fitlog-lite/` preview or production URL. Receipts/screenshots use `/tmp/nutrition-templates-{local|prod}-...`.

`pwaUpgrade.mjs` now verifies the legitimate DexieV7→V8 upgrade: original14 frozen stores/15records and isolated AI data are unchanged, the3new strategy stores are empty (17total), and the new App/controller reopens offline. `aiVoicePreservation.mjs after` applies the same original14-store projection to the existing synthetic production profile without reseeding and now requires DB100/18, with additive strategy/DietEvent stores empty. `videoRetirementPreservation.mjs before/after` additionally preserves complete18-store hashes and AI/Voice configurations while removing only the six explicit retired keys. BackupV8 preserves definitions/ordered variants/phases/daily provenance; RestoreV1–V8 and encrypted Sync envelopeV1 are covered separately by unit tests. Old frozen fixtures are unchanged; legacyV8 adds a new frozen fixture.

## Current release inventory

Previous26 required suites: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout, managementWorkspace, managementVisualConsistency, foodRecovery, macroNutritionSummary, catalogRecovery, dailyRecordsExperience. Additional productionAssets and the same persistent legacy profile preserve DB110/20, AI and Voice while removing only retired device settings. No retired provider/playback gates remain.

`habitEditorLayout.mjs` tests Management → Habit Manager → New, Today direct create, populated manager scroll restore and editing a UI-created habit at320×812/375×812/390×844/430×932, fonts100/120/140 and normal/reduced motion. It measures static Save geometry/non-overlap throughout scroll and mocked keyboard/Safe Area, state/danger order,20 manager/editor/back cycles and final lock/style cleanup. Physical iPhone remains separate.

`managementWorkspace.mjs` verifies strict native-dialog/header/body identity across12L2 routes and entity editors, six shared toolbars/one empty create, parent scroll/search/save refresh,20 full management rounds per font/width/motion context,44px header controls, stable geometry, Habit static flow and complete X cleanup. Receipts/screenshots: `/tmp/management-{local|prod}-*`.

## Manager visual consistency release gate

`managementVisualConsistency.mjs` is the22nd required browser suite. All21 previous suites remain required. Local320×812/375×812/390×844/430×932 × fonts100/120/140 × normal/reduced; production targeted390/100 and320/140 in both motion modes. Two synthetic entities per manager compare actual toolbar/create/search-status geometry, shared list radius/border/background/no shadow, row height/padding/dividers/title/meta/chevron alignment (deltas<=2px). Six independent empty contexts per matrix case assert one primary create with matching48px/radius/font/padding, hidden toolbar duplicate; search modules verify quiet no-results. Run20 continuous six-module rounds in one actual dialog, check shared classes/counts/no stale empty/no overflow/locks and direct Food/Today entries. Capture390/100 populated and empty six-page contact sheets, no-results and320/140 screenshots; inspect side by side, including a blurred contact sheet. Preserve the existing Habit static-save and workspace identity/Back/X/state/cancellation gates, exact production assets and isolated persistent-profile offline/data evidence. Physical Safari and original installed PWA remain Pending until separately verified.


## Food / Recovery release gate (2026-10-08)

`foodRecovery.mjs` is the23rd required suite; all prior22 remain required. Local35 contexts:320/375/390/430 ×100/120/140% ×normal/reduced (24), dark320/360/430/480/844-landscape ×100/140% (10), plus light844-landscape140% (1). Production targeted390/100 light normal,320/140 light reduced,390/100 dark reduced and844/140 dark landscape. Synthetic20 long FoodLogs; separate +17,3-name case, expand/collapse/editable rows; absent/same-day latest weight, exact1.91/2.93/0.60 g/kg, four-digit macros/five-digit calories; primary completion and unclipped critical values/actions.

Exercise persistent overnight active session across Today/Trend/reload,456-minute business-night completion, correction to396 minutes, same-Sheet history/editor/date Back, active cancellation and >24h warning. Water quick additions/undo/custom/edit/delete preserve independent rows and sums. Verify7/30/90 sleep/water SVG lines/selected precise values and keyboard/touch interaction, fonts/touch bounds/no horizontal overflow, no page errors and shared dark contrast. Inspect actual card screenshots at320/140 light and390/100 dark. Automated Chromium reload proves durable storage, not OS-killed physical iPhone lifecycle.

Unit gates preserve frozenV10→V11 all rows/indexes, no reseed, unique active across two connections, reopen, DST absolute subtraction, legacy wake metadata and shared night semantics, invalid/future edits, circular averages, older Backup1–10 normalization, Backup11 round trip, encrypted Sync envelopeV1 and atomic20-store rollback. `recoveryPreservation.mjs` captures the existing isolated production persistent profile without clearing/reseeding, then compares all old18-store rows/config after additive110/20 upgrade and repeats exact App/SW identity plus offline new-page boot for application and report deployments. Original installed PWA/Safari/timezone travel/camera/real AI/Voice remain separate Pending device checks.

`githubSyncSafety.mjs` retains the complete two-device/encryption/conflict/offline/disconnect flow and now seeds an active SleepSession plus WaterLog alongside frozen older data. Compare all20 stored collections with decrypted Backup11 through upload and Restore. Password headings are scoped to the active dialog; Today Recovery headings are legitimate background content.


## Catalog / Recovery integration

Run `node tests/browser/catalogRecovery.mjs` with FITLOG_QA_URL, FITLOG_PLAYWRIGHT_MODULE and FITLOG_CHROME configured, after the Pages build. This is the25th required suite, in addition to every previous24. Same six local/production contexts:390/100 light,320/140 light reduced,320/200 light reduced,430/140 dark reduced,390/100 dark,844/140 dark landscape.

Synthetic-only gate checks Today header/icon/compact geometry, reference default/save/null/cross-tab/no WaterLog mutation, real7/30/90/daily missing facts/90-day chart scroll/60 switches, five actual AI confirmation writes and same-frame manager refresh/query/scroll, plus hidden editor draft preservation. Screenshots and receipt: /tmp/catalog-recovery-{local|prod}-*.png and /tmp/catalog-recovery-{local|prod}-receipt.json. See UI_QA_MATRIX.md and AI_ARCHITECTURE.md for the full contract. Existing physical device/PWA/real-provider checks remain independent.

Full Workspace runs can use FITLOG_WORKSPACE_WIDTH=320,375,390,430 in four processes. Aggregate all four receipts (24 unique cases); never accept a single shard as a full release gate. Default/unset retains the original complete matrix and every existing assertion/timeout/loop.


## Unified Daily Records release gate

`dailyRecordsExperience.mjs` adds the26th suite while preserving all25 previous gates. Default local matrix:320/375/390/430 ×100/120/140/200% ×light/dark ×normal/reduced (64), plus844×390 dark landscape140% reduced. Production uses five targeted contexts including320/140,320/200 dark and landscape. Optional FITLOG_DAILY_WIDTH=320,375,390,430,844 shards execution only; accept the complete65-unique-case union, never one shard. FITLOG_DAILY_SMOKE=1 is diagnostic, not the full release gate.

Check all nine actual fixed Calendar slots/legend/44px seven-column geometry/adjacent dates, complete shared nine-disclosure Day Sheet and Day Report, real7/30/90 SVG point values/gaps/label bounds, objective recorded-day Month statistics and preserved Week. Cross-tab updates retain exact Sheet/open groups/scroll/focus. Three rapid water additions produce three independent rows; Undo removes the latest exact ID without card height changes. Undo remains interactive inside an open native modal and preserves its input draft; injected deletion failure stays visible and retryable. Real sleep completion, habit check-in and water edit/add/undo refresh all fact surfaces. Twenty integrated cycles and the existing seven-store clear scope are mandatory. Fifteen scene screenshots plus individual expanded groups are written to /tmp/daily-{local|prod}-*.png; receipts contain actual geometry, state and stress counts. Synthetic profiles only; physical Safari/original PWA remain independent Pending evidence.

## Training & Recovery Experience Unification (2026-10-09)

Current inventory is28 required UI suites: all26 above, plus `trainingRecoveryExperience.mjs` and `trainingRecoveryLifecycle.mjs`. Run against a stable Pages build; never replace dist while a browser run is loading its assets.

The experience suite runs65 local contexts: four widths ×100/120/140/200% ×light/dark ×normal/reduced plus landscape. Optional FITLOG_TRAINING_WIDTH=320/375/390/430/844 shards preserve the full union; FITLOG_TRAINING_SMOKE is development-only and cannot satisfy the release matrix. Production runs four targeted contexts. Actual service/UI flows cover retained Kegel result/ID/error/retry/manual/natural/pause/unlock, Strength saved actions/sets/unknown load, Cardio draft/error/double-submit/edit/delete, same-Sheet three-domain history0/1/many/exact-ID/delete-last, all three recovery ranges/keyboard/touch/live-selection, actual timelines, nine-category Calendar and Day/Month Reports. The390/100 light normal representative executes20 full integrated cycles. Lifecycle probe separately uses CDP global listener counts and noninvasive interval/RAF accounting over20 real manual completions; no timer or listener accumulation and exactly20 unique saved IDs.

Sleep uses the shared business-night resolver; legacy recordDate remains wake metadata. Replace obsolete default-point-value assertions with exact selected readouts/44px targets/gaps/internal scrolling, and obsolete automatic-list-jump assertions with explicit saved-completion/Return assertions. All prior assertions unrelated to the new accepted structure remain required. Physical iPhone remains Pending.

Screenshots/receipts: external `artifacts/training-recovery-2026-10-09/{local,prod}`. `trainingRecoveryPreservation.mjs baseline|application|end` owns one dedicated invented-data profile across this release. Baseline may seed that isolated profile exactly once; application/end only compare full20-store rows/config and offline App/SW identity. It never touches a personal profile. Existing frozen fixtures and all older compatibility tests remain unchanged.

## V4.2 release gate

`v4FoodPlanToday.mjs` adds the31st interaction suite. Use a stable Pages build at FITLOG_QA_URL, the external Playwright module and compatible Chrome executable. Local defaults run65 cases:320/375/390/430 ×100/120/140/200% ×light/dark ×normal/reduced plus844px landscape. FITLOG_V4_WIDTH shards these exact cases; require all65 unique cases, not one shard. Production and optional FITLOG_V4_ENGINE=webkit run five targeted cases. FITLOG_V4_SMOKE is diagnostic only. FITLOG_V4_CAPTURE_BEFORE captures the previous production anatomy using the same invented records in a fresh isolated context.

Real UI gates exercise repeated same-Sheet food recording, queued double submits under a real IDB write lock, cancelled drafts, historical exact grams, strict one/two-food previews and actual adoption, selected-mode retention, budget goal states, incomplete macros/no weight, shared Today/Food snapshots, Today/Plan completion sync, right action boundaries, full four-card geometry and overflow. Original snapshots/screenshots/receipts live outside the repo in artifacts/v4-2-2026-10-10. Existing foodServing, foodRecovery, macroNutritionSummary, nutritionGauge and uiSemanticConsistency assertions are updated for the approved budget/cards/unique disclosure/continuous-save anatomy; all other data, geometry, keyboard and interaction assertions remain.

`v4Preservation.mjs baseline|application|end` reuses the previous dedicated invented-data production profile without clearing or reseeding. Compare all20-store/config hashes, DB110 and exact App/SW identity plus offline cold boot. It never uses a personal browser. Physical iPhone Safari/original installed PWA remain independent Pending categories.

PWA gate additionally runs pwaUpgrade with FITLOG_PWA_OLD_DIST pointing to the immutable33798a7 Pages build (exact index-DGXlZzHp.js), and FITLOG_PWA_PROMPT_DIST to the actual preceding production Pages artifact. The historical V7 fixture remains unchanged: a V11 prompt baseline initializes only the six explicitly known additive stores empty; unknown unfixtured stores fail. Assert exact70/14 for legacy and110/20 for prompt, preserve all baseline rows/config, draft/image/proposal/update confirmation and cold offline identity. FITLOG_QA_ARTIFACT_ROOT optionally isolates retained-suite evidence without changing their assertions or default matrices.

## V4.2.1 targeted consistency gate

`v421Consistency.mjs` adds the32nd required UI suite; all31 preceding suites stay mandatory. Default full65 cases match V4.2 widths/fonts/themes/motion plus landscape. Existing FITLOG_V4_WIDTH shards only execution; require all65 unique cases. FITLOG_V421_BEFORE captures five before states without fix assertions; FITLOG_V4_SMOKE is diagnostic only. Production and WebKit use five targeted contexts. Artifacts: external artifacts/v4-2-1-2026-10-10. Verify structured full food/target disclosure, report closed/open gap<=8px and unchanged equal cards/tracks, empty/saved special-diet flow/no canonical estimate, identical remaining facts with distinct density, Today peer geometry/color, actual cardio date isolation and sleep start/finish. Existing suites retain continuous meals, strict completion, keyboard/SafeArea/lifecycle/backup/restore/sync/PWA coverage.

`v4Preservation.mjs` optionally takes FITLOG_PRESERVATION_ARTIFACT_ROOT and FITLOG_PRESERVATION_BASELINE to capture the new verified release baseline while reusing the same persistent invented-data profile without reseeding. Defaults retain the originalV4.2 run. Baseline/application/end hashes and offline App/SW evidence remain required; physical screenshots and Safari/original-PWA verification stay separate.

### Remaining-goal prototype conformance

`remainingPrototype.mjs` hashes and runs the immutable `design/reference/v4.2/FitLog_V4_2_Prototype.html` (serve repository root on5190), alongside the real Application. Default33 viewport/font/theme cases retain two-page original PNG pairs and computed DOM/style receipts in `FITLOG_QA_ARTIFACT_ROOT` (default external artifacts/v421-remaining-reference-2026-10-10). FITLOG_REMAINING_BEFORE captures pre-fix evidence; FITLOG_V4_SMOKE is diagnostic only. Prototype font magnification is a temporary browser-only computed-text scale, never a file edit. Assertions require approved borders/dots/heading-right Today action and independent Food four cells/equal bottom buttons, plus full shared canonical state/no clipping/real modes/no preview writes. Visually inspect pairs and report accessibility/data-format deviations explicitly. `v421Consistency.mjs` now compares canonical data rather than identical markup, and requires new boxed variants; all other preceding assertions remain.
