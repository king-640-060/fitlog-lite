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

22 required suites: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout, managementWorkspace, managementVisualConsistency. Additional productionAssets and the same persistent legacy profile preserve DB100/18, AI and Voice while removing only retired device settings. No retired provider/playback gates remain.

`habitEditorLayout.mjs` tests Management → Habit Manager → New, Today direct create, populated manager scroll restore and editing a UI-created habit at320×812/375×812/390×844/430×932, fonts100/120/140 and normal/reduced motion. It measures static Save geometry/non-overlap throughout scroll and mocked keyboard/Safe Area, state/danger order,20 manager/editor/back cycles and final lock/style cleanup. Physical iPhone remains separate.

`managementWorkspace.mjs` verifies strict native-dialog/header/body identity across12L2 routes and entity editors, six shared toolbars/one empty create, parent scroll/search/save refresh,20 full management rounds per font/width/motion context,44px header controls, stable geometry, Habit static flow and complete X cleanup. Receipts/screenshots: `/tmp/management-{local|prod}-*`.

## Manager visual consistency release gate

`managementVisualConsistency.mjs` is the22nd required browser suite. All21 previous suites remain required. Local320×812/375×812/390×844/430×932 × fonts100/120/140 × normal/reduced; production targeted390/100 and320/140 in both motion modes. Two synthetic entities per manager compare actual toolbar/create/search-status geometry, shared list radius/border/background/no shadow, row height/padding/dividers/title/meta/chevron alignment (deltas<=2px). Six independent empty contexts per matrix case assert one primary create with matching48px/radius/font/padding, hidden toolbar duplicate; search modules verify quiet no-results. Run20 continuous six-module rounds in one actual dialog, check shared classes/counts/no stale empty/no overflow/locks and direct Food/Today entries. Capture390/100 populated and empty six-page contact sheets, no-results and320/140 screenshots; inspect side by side, including a blurred contact sheet. Preserve the existing Habit static-save and workspace identity/Back/X/state/cancellation gates, exact production assets and isolated persistent-profile offline/data evidence. Physical Safari and original installed PWA remain Pending until separately verified.


## Food / Recovery release gate (2026-10-08)

`foodRecovery.mjs` is the23rd required suite; all prior22 remain required. Local35 contexts:320/375/390/430 ×100/120/140% ×normal/reduced (24), dark320/360/430/480/844-landscape ×100/140% (10), plus light844-landscape140% (1). Production targeted390/100 light normal,320/140 light reduced,390/100 dark reduced and844/140 dark landscape. Synthetic20 long FoodLogs; separate +17,3-name case, expand/collapse/editable rows; absent/same-day latest weight, exact1.91/2.93/0.60 g/kg, four-digit macros/five-digit calories; primary completion and unclipped critical values/actions.

Exercise persistent overnight active session across Today/Trend/reload,456-minute wake-day completion, correction to396 minutes, same-Sheet history/editor/date Back, active cancellation and >24h warning. Water quick additions/undo/custom/edit/delete preserve independent rows and sums. Verify7/30 sleep/water bars and text data, fonts/touch bounds/no horizontal overflow, no page errors and shared dark contrast. Inspect actual card screenshots at320/140 light and390/100 dark. Automated Chromium reload proves durable storage, not OS-killed physical iPhone lifecycle.

Unit gates preserve frozenV10→V11 all rows/indexes, no reseed, unique active across two connections, reopen, DST absolute subtraction, local wake semantics, invalid/future edits, circular averages, older Backup1–10 normalization, Backup11 round trip, encrypted Sync envelopeV1 and atomic20-store rollback. `recoveryPreservation.mjs` captures the existing isolated production persistent profile without clearing/reseeding, then compares all old18-store rows/config after additive110/20 upgrade and repeats exact App/SW identity plus offline new-page boot for application and report deployments. Original installed PWA/Safari/timezone travel/camera/real AI/Voice remain separate Pending device checks.

`githubSyncSafety.mjs` retains the complete two-device/encryption/conflict/offline/disconnect flow and now seeds an active SleepSession plus WaterLog alongside frozen older data. Compare all20 stored collections with decrypted Backup11 through upload and Restore. Password headings are scoped to the active dialog; Today Recovery headings are legitimate background content.
