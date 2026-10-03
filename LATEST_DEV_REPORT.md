# Latest Development Report — open calorie gauge and shared macro tiles

## Release baseline

- START_COMMIT: f5ea0520a7d3e4e981491007239ebc5ee0cc4e9f (clean main, pull already up to date).
- Application commit: a2804083253b531ff09ed99846c2392810844cbd.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37111818893; Pages 6825673335, SUCCESS.
- Production: https://king-640-060.github.io/fitlog-lite/.
- Report maintenance also deploys its own Git build SHA. Resolve the report commit with git log -1 --format=%H -- LATEST_DEV_REPORT.md and confirm executing App/controller builds in Management → Application → Version diagnostics. Delivered final report contains exact END_COMMIT and final assets/Actions/Pages receipts.

## Scope and implementation

Before: Partially implemented. Today/Food already shared calorieGaugeHtml/goal-ring, but still used heavy360° circles; Food had three macro donuts while Today used tiles.

Now: calorieGaugeHtml/ringSvgHtml reuse the existing getGoalProgress and a presentation-only calorieGaugeGeometry helper. True SVG280° clockwise arc, symmetric80° bottom gap, main r46/stroke6, excess r55/stroke3 in120×120 viewBox. Round endpoints. Existing112px Today/140px Food footprint remains; effective main stroke5.6px/7px. Active accent-mid; weak border/.55 track; unset text-tertiary3/7 dashes with Today .85/Food .65. Fractions map only to available arc.0% has no active dot,100% fills the main arc, above stays full plus capped coral open outer arc/exact excess text. No mask/gradient/glow/shadow/rotation/replay.

Food macro donuts are fully removed without linear bars. Both pages call nutritionMetricHtml and nutrition-tiles, reusing Today11px radius/7px9px padding, category surfaces, label/value hierarchy and actual/goal format. Existing unset/reached/excess text carries progress. Named accessible groups preserve values/status; category color remains above goal and only excess uses coral. No header/navigation/card spacing redesign.

Gauge-only number sizing and unit line-height were calibrated against320px/140% text bounds. All canonical kcal, integer energy display, macro formatting, FoodLog history, targets and calculations remain unchanged. No DB/Backup/Restore/Sync/AI/PWA changes.

## Automated verification

- Typecheck PASS;502 tests/48files PASS; Pages build PASS (existing >500kB chunk advisory).
- Targeted nutritionGauge gate: eleven states (unset,0/1/65/99/100%,above,capped above,zero goal,above zero,partial macro goals) ×3font sizes ×2surfaces =66checks per width;264local checks at320/375/390/430px. Compare identical SVG/tile markup/styles, actual path lengths/offsets, zero/excess/ARIA/neutral semantics, no macro donuts, no clipped bounds/text-arc overlap or animations.
- Local11existing browser gates PASS: aiDualModelRouting, uiQualityAudit, mobileLayout, interactionStabilization, aiAssistant, aiVoice, foodVision, sharedDatePicker, githubSyncSafety, uiSemanticConsistency, aiStreaming. Updated semantic assertions expect6px/.55 open geometry while preserving unset differences. Quality audit141states per local width.
- Actual screenshot inspection: normal1259/65%, unset, near/reached and excess;320px140% and390/430px full cards; both pages share the same grammar. Early text-bound failures at140% were resolved through gauge-only typography before release, and the full targeted matrix passed.

## Production verification

- Application exact JS/CSS and entire sw.js match clean local Pages build; SW precaches the same files and worker identity script. Build-info is network-only.
- Production11existing browser gates PASS; quality audit131states at390/430px. Targeted gauge66checks per width/132total with100/120/140% fonts PASS; screenshots inspected.
- Persistent-profile gate initially asserted an old bundle twice; an outside-scope update probe also reported ServiceWorker cannot be started. Reopening the original App showed both App and active/controller build a280408, no waiting worker. The unchanged preservation gate then passed, including offline reload. No clear/reseed/unregister or PWA source change was used. These are browser upgrade timing observations, not physical-device proof.
- Original synthetic persistent production profile retains14frozen stores/15records and AI configuration/key/voice acknowledgement, matches its before-release snapshot without reseeding, and reopens offline under the new SW/build. No real user records/keys used.

## Data versions and manual verification

fitlog-lite-db: DexieV7/IDB70/14stores; BackupV7; RestoreV1–V7; GitHub SyncV1; AIConfigV1. All unchanged; snapshots, target semantics and canonical precision unchanged.

- Physical iPhone Safari: Pending.
- Original installed PWA: Pending.
- Physical search/Vision issue from the previous round remains unverified; no search/model/PWA changes in this round.

Check both pages on the original device after Version diagnostics proves the new App/controller build. Inspect bottom opening, integer kcal, macro tiles, unset/above states and system text scaling; never clear data/reinstall for this visual release. Chromium bounds/screenshots do not establish physical Safari/PWA behavior.

## ChatGPT Baseline

Current main uses shared280° calorie gauge with80° gap,6px main/3px capped excess arc, existing goal math,112/140px footprints, accent-mid and weak track. Unset Today .85/Food .65 remains. Macro donuts removed; both pages share Today-style nutritionMetricHtml/nutrition-tiles and readable actual/goal/state. Canonical calculations/storage/history/targets/DB/Backup/Restore/Sync/AI/PWA untouched.502tests/48files, local264/production132targeted checks and11existing browser gates PASS; production assets/SW/persistent frozen data/offline PASS. Physical Safari/original PWA remain Pending and runtime SHA must be checked before device visual conclusions.
