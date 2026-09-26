# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` before trusting a recorded SHA. This report is committed after the verified application commit.

## Current Git and Production State

- Branch: main
- START_COMMIT: `c4673182b9ece0fe22ca307bb19c500312f992f7`
- END_COMMIT (verified application): `1005c71bed6481863ebe5d097fc0bd9bb58a5e27`
- Application commit message: `Add food return-to-today shortcut`
- Production URL: https://king-640-060.github.io/fitlog-lite/
- GitHub Actions run: [36233180885](https://github.com/king-640-060/fitlog-lite/actions/runs/36233180885)
- Workflow conclusion: completed / success; typecheck, tests, build, artifact upload, and Pages deployment passed

## Food Today Shortcut

Food now shows a quiet “回到今天” button in its top header, outside the scrolling Date Rail, whenever the selected business date differs from the device-local Today. It is hidden on Today, does not enter keyboard focus while hidden, and has a 44 px touch target while visible. Its visibility is updated from one helper on page render and date commit, so rail selection, date-picker jumps, and navigation from Today or Calendar follow the same rule.

Activating the shortcut obtains a fresh device-local date, detaches the old rail and aborts its listeners, builds the 31-day window around Today, and centers Today without a long scroll. This neutralizes old momentum, pending fallback timers, and delayed `scrollend` events. The existing date commit updates `aria-current`, the date picker, and the Food body. The established asynchronous render-version guard remains in place. The native rail interaction, center snap, distance-based visual emphasis, body behavior, and Food data semantics are unchanged. `docs/UI_INTERACTION_SPEC.md` records the durable shortcut rule.

## Data and Compatibility

- Database: Dexie V5, 10 stores; unchanged
- Database name: `fitlog-lite-db`; unchanged
- Backup export schema: V4; unchanged
- Restore compatibility: V1 / V2 / V3 / V4; unchanged
- FoodLog snapshots, Nutrition Target semantics, and device-local business dates: unchanged

## Automated Verification

- `npm run typecheck`: PASS
- `npm test`: PASS — 155 tests / 13 files
- `npm run build`: PASS
- PWA generateSW: PASS — 17 precache entries / 564.39 KiB (local build)
- `git diff --check`: PASS

The new unit test covers shortcut visibility for Today, yesterday, tomorrow, and a month-old date. Existing rail, asynchronous render, module, and compatibility tests remain green.

## Browser Simulation

Fresh local Chrome mobile contexts at 375 × 812, 390 × 844, and 430 × 932 verified that Today hides the shortcut; yesterday, one week ago, and one month ago show it; and activation returns directly to a centered Today with matching Food content and date picker. The rail retained 31 items, the top header stayed 71 px high, and there was no horizontal overflow or page error. Dispatching a delayed `scrollend` on the detached old rail did not change Today. A native rail gesture away from Today showed the shortcut after settlement; selecting Today through the rail hid it. Vertical document scrolling remained normal. Visual review at 390 px confirmed the quiet header placement.

## Production Verification

Production at https://king-640-060.github.io/fitlog-lite/ passed the same 375 × 812, 390 × 844, and 430 × 932 checks for visibility, direct recentering, date-picker and Food content synchronization, stable header height, no overflow, and stale old-rail event protection. At 390 × 844, native rail navigation away from and back to Today and vertical document scrolling also passed. Actions deployed application commit `1005c71bed6481863ebe5d097fc0bd9bb58a5e27` successfully.

## Manual Device Verification

Pending: real iPhone Safari and standalone PWA checks for button placement and touch feel, native momentum, Safe Area, Safari edge back, and offline mode. Chrome mobile browser simulation does not establish physical-device feel.

## Known Remaining Issues

No code, test, build, browser, or deployment defect was confirmed. Physical iPhone Safari and standalone PWA verification remains pending.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA using Vanilla TypeScript, Dexie V5 with 10 stores, Backup V4, and V1/V2/V3/V4 Restore. The verified application commit is `1005c71bed6481863ebe5d097fc0bd9bb58a5e27`. Food dates change through the native horizontal, center-snapping Date Rail or distant-jump date picker. The Food body has no horizontal date gesture. Content updates after rail settlement and stale queries are discarded. When a non-Today Food date is selected, a quiet top-header “回到今天” shortcut directly rebuilds and centers the rail on device-local Today, updates the date picker and Food content, and neutralizes old rail events. Calendar day detail uses a five-row icon-led grouped summary. Strength logging is timer-free and keeps legacy timestamps/RPE compatibility. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
