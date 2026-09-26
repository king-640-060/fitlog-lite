# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` before trusting a recorded SHA. This report is committed after the verified application commit.

## Current Git and Production State

- Branch: main
- START_COMMIT: `f9abeae076ca6508ed163e18c6ea60a1e2cc21da`
- END_COMMIT (verified application): `d294f32f666537a32f98dcf833bf52cce83f1acd`
- Application commit message: `Refine food date rail interaction`
- Production URL: https://king-640-060.github.io/fitlog-lite/
- GitHub Actions run: [36232440342](https://github.com/king-640-060/fitlog-lite/actions/runs/36232440342)
- Workflow conclusion: completed / success; typecheck, tests, build, artifact upload, and Pages deployment passed

## Food Date Rail Interaction Refinement

The Food Date Rail keeps native horizontal scrolling, browser momentum, center scroll snap, and selection after `scrollend` (with the existing debounce fallback). Touch down immediately enters a restrained pressed state. Movement enters dragging; release enters settling; completion returns to idle. These states adjust the fixed center lens and quiet track line without changing scroll physics.

Each date item continuously changes scale and opacity according to its distance from the center. The rail scroll listener schedules one `requestAnimationFrame` visual update, reading item positions and writing CSS variables. A soft center marker and edge fade make the dates read as one track. Reduced-motion mode removes item scaling. No custom inertia, gesture library, body swipe, or Food content translation was added.

The rail uses a 31-day window as the bounded fallback for long scrolling. It recenters only near an edge after settlement, preserving continuous motion through ordinary multi-day gestures. Tapping a date and ArrowLeft/ArrowRight use the same center position. The distant-jump date picker and stale asynchronous render protection remain in place. The Food body and its displayed business date stay unchanged during dragging and momentum, then update after settlement. `docs/UI_INTERACTION_SPEC.md` records these durable rules.

## Data and Compatibility

- Database: Dexie V5, 10 stores; unchanged
- Database name: `fitlog-lite-db`; unchanged
- Backup export schema: V4; unchanged
- Restore compatibility: V1 / V2 / V3 / V4; unchanged
- FoodLog snapshots, Nutrition Target semantics, and device-local business dates: unchanged

## Automated Verification

- `npm run typecheck`: PASS
- `npm test`: PASS — 154 tests / 13 files
- `npm run build`: PASS
- PWA generateSW: PASS — 17 precache entries / 563.34 KiB (local build)
- `git diff --check`: PASS

The added unit test checks center, intermediate, boundary, negative-distance, and clamped focus values. Existing date-window, selection, asynchronous render, module, and compatibility tests remain green.

## Browser Simulation

Fresh local Chrome mobile contexts at 375 × 812, 390 × 844, and 430 × 932 verified immediate touch-down lens feedback without a date change, pressed hold, continuous item scale/opacity while dragging, settling after release, and return to idle after native snap. The selected date and Food content remained on the prior date during drag and settling and changed together afterward. The centered date was within about 0.5 px of the rail center. An adjacent tap, distant date-picker jump, body horizontal drag, and vertical document scroll behaved as expected, with no document overflow or page errors.

Ten successive native rail gestures advanced 20 dates. The 31-item window recentered once after settlement near its edge; every selected date matched Food content. Visual updates continued during the post-release settling phase. Reduced-motion mode kept center snap and date selection while item transforms were disabled. An isolated 200/300 kcal dataset confirmed FoodLog totals followed the selected business date.

## Production Verification

Production at https://king-640-060.github.io/fitlog-lite/ passed the same 375 × 812, 390 × 844, and 430 × 932 rail interaction sequence: pressed, dragging, settling, idle, continuous visual emphasis, date/content commit only after snap, adjacent tap, and no page errors or horizontal overflow. At 390 × 844, ten successive touch gestures, bounded window recentering, and reduced-motion behavior also passed. The body horizontal gesture did not change dates at any tested width; the date picker selected and centered a distant date. Actions deployed application commit `d294f32f666537a32f98dcf833bf52cce83f1acd` successfully.

## Manual Device Verification

Pending: real iPhone Safari and standalone PWA checks for touch feel, native momentum, frame pacing, mask rendering, Safari edge back, Safe Area, bottom navigation, and offline mode. Chrome mobile browser simulation does not establish physical-device feel.

## Known Remaining Issues

No code, test, build, browser, or deployment defect was confirmed. Physical iPhone Safari and standalone PWA verification remains pending.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA using Vanilla TypeScript, Dexie V5 with 10 stores, Backup V4, and V1/V2/V3/V4 Restore. The verified application commit is `d294f32f666537a32f98dcf833bf52cce83f1acd`. Food dates change only through a native horizontally scrolling, center-snapping Date Rail or the distant-jump date picker. The rail provides restrained touch states and distance-based visual emphasis; the Food body has no horizontal date gesture or page-slide animation. Content updates after rail settlement and stale queries are discarded. Calendar day detail uses a five-row icon-led grouped summary. Strength logging is timer-free and keeps legacy timestamps/RPE compatibility. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
