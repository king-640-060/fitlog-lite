# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` and inspect current code before trusting a recorded SHA. A later documentation-only commit may advance `main` without changing the application baseline.

## Current Git and Production State

```text
Branch: main
START_COMMIT: 611cd079f73d2045c36f076d30a920c83d14e213
Application commit: a08ef907e3ba2e53f84b3e6f0db68a11c021ee8d
Application commit message: Redesign pelvic floor and cardio training UI
Production URL: https://king-640-060.github.io/fitlog-lite/
GitHub Actions run: 35957203952
Workflow conclusion: completed / success
```

## Latest Round — Training UI

Pelvic floor selection now has a featured daily Standard Training card with composition, calculated duration, and a direct Start action. Four compact two-column specialty buttons start Foundation/Control, Endurance, Quick Pulse, and Combined Training. The full breathing and discomfort guidance remains in expandable help. Presets are data-driven; the multi-phase, absolute-deadline timer state machine and its requestAnimationFrame rendering remain unchanged. Legacy routine names and stored snapshots are preserved for history.

Strength, stair-machine cardio, and pelvic floor use a shared Training card hierarchy, spacing, typography, icon alignment, and primary CTA shape. The cardio card presents today's count, duration, speed, and one recent-record link. The cardio form aligns all labels and fields on one grid, centers the minute suffix, and groups Save/Delete actions. Cardio history uses stable date and numeric columns; an empty history offers a direct Record action. Today strength/cardio rows share label and value positions and use tabular numerals. The data model and cardio CRUD behavior remain unchanged.

## Data and Compatibility

```text
Database: Dexie V5, 10 stores; unchanged
Database name: fitlog-lite-db; unchanged
Backup export schema: V4; unchanged
Restore compatibility: V1 / V2 / V3 / V4; unchanged
Local business date: device-local YYYY-MM-DD; unchanged
```

No migration, new store, Backup format change, historical rewrite, strength business change, food change, or Calendar aggregation change was made.

## Automated Verification

```text
npm run typecheck: PASS
npm test: PASS — 135 tests / 11 files
npm run build: PASS
PWA generateSW: PASS — 17 precache entries / 547.29 KiB
git diff --check: PASS
```

New tests cover every visible pelvic floor preset's structure and calculated duration; start, pause, resume, and completion on the existing engine; set and between-exercise rest calculation; and legacy routine names. The existing cardio CRUD, validation, backup, restore, and migration tests continue to pass.

## Browser Visual Verification

Local Chrome simulations at 375 × 812, 390 × 844, and 430 × 932 confirmed equal widths for all three Training cards, aligned cardio form labels/inputs and minute suffix, an even 2 × 2 specialty grid, no oversized radio controls, no horizontal overflow, and no page errors. A specialty button opened the matching timer. Saving a 25-minute, speed-6.5 cardio entry updated the summary and history. Today strength/cardio labels and values shared their respective left boundaries. At a simulated 500px viewport with a focused field, the Save button remained visible and operable. These are browser simulations, not real iPhone testing.

## Production Verification

```text
GitHub Actions run 35957203952: completed / success for a08ef907e3ba2e53f84b3e6f0db68a11c021ee8d
Production HTML: HTTP 200
HTML-referenced JavaScript: HTTP 200; contains the new routine and cardio UI
HTML-referenced CSS: HTTP 200; byte-identical to the local build CSS
Production browser at 390 × 844: 3 Training cards, featured Standard Training, 4 specialty buttons, no radio controls, no page errors or horizontal overflow
```

## Confirmed Issues and Manual Device Verification

No remaining code, test, build, or deployment defect was confirmed. **Manual Device Verification: Pending.** Real iPhone Safari, standalone PWA, keyboard behavior, Safe Area, and offline checks still require device verification. Browser viewport checks do not substitute for those checks.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA using Vanilla TypeScript, Dexie V5 with 10 stores, Backup V4, and V1/V2/V3/V4 Restore. The current application baseline is `a08ef907e3ba2e53f84b3e6f0db68a11c021ee8d`. Training separates existing strength Workouts and stair-machine CardioSessions. The Training page shares one card hierarchy across strength, cardio, and pelvic floor. Pelvic floor selection offers Standard Training and four specialty presets; duration is derived from routine data, and the existing timer engine is unchanged. Historical pelvic floor snapshots remain immutable. Calendar retains its existing food/strength/cardio aggregation. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
