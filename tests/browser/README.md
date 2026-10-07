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

20 required suites: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout. Additional productionAssets and the same persistent legacy profile preserve DB100/18, AI and Voice while removing only retired device settings. No retired provider/playback gates remain.

`habitEditorLayout.mjs` tests Management → Habit Manager → New, Today direct create, populated manager scroll restore and editing a UI-created habit at320×812/375×812/390×844/430×932, fonts100/120/140 and normal/reduced motion. It measures static Save geometry/non-overlap throughout scroll and mocked keyboard/Safe Area, state/danger order,20 manager/editor/back cycles and final lock/style cleanup. Physical iPhone remains separate.
