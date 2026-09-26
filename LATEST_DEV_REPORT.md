# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` before trusting a recorded SHA. This report is committed after the verified application commit.

## Current Git and Production State

- Branch: main
- START_COMMIT: `23039302881e7d450f0ce67f35460eca925db350`
- END_COMMIT (verified application): `de1993e6d9ffe48b3241a951e9913d9143683e6c`
- Application commit message: `Use native scroll-snap food date rail`
- Production URL: https://king-640-060.github.io/fitlog-lite/
- GitHub Actions run: [36230410203](https://github.com/king-640-060/fitlog-lite/actions/runs/36230410203)
- Workflow conclusion: completed / success; typecheck, tests, build, artifact upload, and Pages deployment passed

## Food Date Rail Simplification

Food date navigation now lives only in the top native horizontal Date Rail. It renders a 15-day window around the selected date, uses browser scrolling and center scroll snap, and keeps a soft selection surface fixed at the center. The rail selects the closest centered item after `scrollend`, with a 100 ms debounced scroll fallback where `scrollend` is unavailable. Tapping or using ArrowLeft/ArrowRight scrolls the target date into the center; reduced-motion users get immediate positioning. A date-picker jump rebuilds the date window around its destination without a long scroll. The window recenters near its edges rather than rebuilding on every date change.

Body swipe navigation, content page dragging, micro-translation, gesture damping, preview slots, and custom swipe settle animations were removed. Food content remains unchanged while the rail moves, then replaces only its dated body after selection settles; the header, library and tools controls, rail, and bottom navigation stay mounted. An incrementing render version prevents an older asynchronous query from overwriting the latest selected date. Date changes show the new ring and number values directly instead of replaying first-appearance motion.

Food data semantics and the date picker remain unchanged. The UI interaction specification now records the rail-only navigation rule.

## Data and Compatibility

- Database: Dexie V5, 10 stores; unchanged
- Database name: `fitlog-lite-db`; unchanged
- Backup export schema: V4; unchanged
- Restore compatibility: V1 / V2 / V3 / V4; unchanged
- FoodLog snapshots, Nutrition Target semantics, and device-local business dates: unchanged

## Automated Verification

- `npm run typecheck`: PASS
- `npm test`: PASS — 153 tests / 13 files
- `npm run build`: PASS
- PWA generateSW: PASS — 17 precache entries / 559.95 KiB (local build)
- `git diff --check`: PASS

Food rail tests cover the ±7-day window across month and year boundaries, relative date labels, duplicate-commit avoidance, edge and distant-jump recentering, and stale asynchronous render rejection. The other module and compatibility tests remain green.

## Browser Simulation

Fresh local Chrome mobile contexts at 375 × 812, 390 × 844, and 430 × 932 used native touch events. A body horizontal drag left the date and content unchanged with no content transform. During a rail drag, scrollLeft changed while Food content kept its prior date; after release, the nearest item snapped to within 0.4 px of center and the content updated to that date. An adjacent tap and a distant date-picker jump selected and centered the correct dates, with 15 rail items, no document overflow, and no page errors. A fast flick, five successive ArrowRight selections across the window recenter point, and a farther-date tap kept the content and selected rail date aligned. A 200/300 kcal isolated browser dataset confirmed the displayed FoodLog totals changed with the selected date. Vertical touch scrolling moved the document without changing the date. Reduced-motion clicks and keyboard navigation worked without content animation.

These results describe Chrome browser simulation; they do not establish iPhone Safari momentum or feel.

## Production Verification

Production at https://king-640-060.github.io/fitlog-lite/ served the new rail assets and passed the same 375 × 812, 390 × 844, and 430 × 932 touch sequence: only the rail scrolled horizontally, Food content waited until settlement, snap centered the selected date, adjacent taps and distant picker jumps worked, the body stayed still, and no horizontal overflow or page errors appeared. At 390 × 844, fast flick and five-day keyboard navigation, window recentering, reduced-motion behavior, and vertical document scrolling also passed. The bottom navigation remained fixed in the vertical-scroll check. Actions deployed application commit `de1993e6d9ffe48b3241a951e9913d9143683e6c` successfully.

## Manual Device Verification

Pending: real iPhone Safari and standalone PWA checks for native rail friction, momentum, snap feel, frame pacing, Safari edge back, Safe Area, bottom navigation, and offline mode. Browser viewport simulation does not replace a physical-device check.

## Known Remaining Issues

No code, test, build, browser, or deployment defect was confirmed.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA using Vanilla TypeScript, Dexie V5 with 10 stores, Backup V4, and V1/V2/V3/V4 Restore. The verified application commit is `de1993e6d9ffe48b3241a951e9913d9143683e6c`. Food dates change only through a native horizontally scrolling, center-snapping Date Rail or the distant-jump date picker; the Food body has no horizontal date gesture or page-slide animation. Content updates after rail settlement and stale queries are discarded. Calendar day detail uses a five-row icon-led grouped summary. Strength logging is timer-free and keeps legacy timestamps/RPE compatibility. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
