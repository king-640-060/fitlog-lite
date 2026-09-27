# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` before trusting a recorded SHA. The report commit follows the three separate application commits.

## Current Git and Production State

- Branch: `main`
- START_COMMIT: `a4c34c6066dd7ef0c33a51b80e58336a3d810bbd`
- HABIT_COMMIT: `bbdcd58a72de6ea68082387161384889c59bfde2` — `Add flexible habit check-ins`
- REPORTS_COMMIT: `b41f1e91adcfdbe9a80786764637a89e632f1120` — `Add weekly and monthly reports`
- TODAY_UI_COMMIT: `28193cebca7e11c72f548396de0e2396af1aeb04` — `Unify Today activity cards`
- END_COMMIT (verified application): `28193cebca7e11c72f548396de0e2396af1aeb04`
- Report commit: separate documentation commit immediately after `END_COMMIT`
- Production URL: https://king-640-060.github.io/fitlog-lite/
- Application Actions run: [36309636472](https://github.com/king-640-060/fitlog-lite/actions/runs/36309636472) — completed / success; typecheck, tests, build, artifact upload, and Pages deployment passed

## Flexible Habit Check-ins

Habits are user-created, independent records with optional notes, ISO weekdays, and a 1–7 weekly target. No starter habits, bottom tab, reminder, streak, or missed-day penalty was added. More opens a manager for creation, editing, accessible up/down ordering, stopping, restarting, and deletion of habits with no check-ins. Stopping retains history. Today lists every active habit, including outside planned weekdays, and supports one-tap check-in and undo. A unique `[habitId+date]` index enforces one check-in per habit and device-local day. Toggling updates only the habit card and preserves the rest of Today and its scroll position.

## Weekly and Monthly Visual Reports

Progress now has a fourth “报告” view with weekly and monthly modes, historical navigation, and a current-period shortcut. Local weeks run Monday–Sunday; months split into calendar-week buckets clipped to the month. Current-period future days are subdued and excluded from aggregates. Reports read indexed business-date ranges and derive results from current FoodLogs, NutritionTargets, Workouts, CardioSessions, PelvicFloorSessions, Weights, Habits, and HabitCheckIns; no report store was added. Weekly habit matrices and daily training rows become monthly week-bucket views. Training series scale independently. Weight uses the existing Chart.js only for two or more points, with a single-point state otherwise; the chart is destroyed on page changes. Nutrition bars compare actuals and targets only on matching dates, and missing macro snapshots remain unavailable rather than zero. Four compact summary values and a deterministic factual paragraph accompany the charts.

## Today Compact Activity Cards

Weight is titled “体重”; trend is a secondary destination. The card has a recording/update action on both empty and recorded days and no Today sparkline. “较上次” compares today's weight with the latest earlier record, excluding future records. Kegel now has a top-level “训练记录” entry, matching layout, accurate accumulated duration text, and “再练一次” after completion. Its timer, progression, and saved session semantics were not changed. The Habit header uses the same domain and secondary-entry pattern.

## Calendar and Data Compatibility

- Calendar retains five categories and five day-detail rows; habits add no marker or day-detail row. “清空当天记录” explicitly excludes HabitCheckIns, and its transaction leaves them intact.
- Database: **Dexie V6, 12 stores**, name `fitlog-lite-db`; the original 10 stores and their data remain unchanged through migration.
- Backup export: **V6**, containing all 12 stores and preserving typed-cardio export normalization.
- Restore: **V1 / V2 / V3 / V4 / V5 / V6**. V1–V5 normalize absent habits and check-ins to empty arrays. V6 validates habit fields, unique IDs and habit/date pairs, valid dates and timestamps, and references to existing habits before the 12-store restore transaction clears data.
- `docs/UI_INTERACTION_SPEC.md` records the durable Habit, Reports, and Today rules.

## Automated Verification

- `npm run typecheck`: PASS
- `npm test`: PASS — **191 tests / 16 files**
- `npm run build`: PASS — main JS **503.03 kB**, PWA generateSW **17 precache entries / 594.53 KiB** (local `/` base)
- Pages-path build (`GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build`): PASS — main JS **503.08 kB**, **17 entries / 594.64 KiB**
- `git diff --check`: PASS

Tests cover the V5→V6 migration, habit validation and toggle semantics, V1–V6 restore, duplicate/orphan rejection, indexed report loading, local week/month boundaries, future exclusion, nutrition pairing, training/weight/habit aggregation, and Today Weight/Kegel states. Vite reports an advisory that the minified main JS exceeds 500 kB; the build and deployment succeed.

## Browser QA

Fresh local Chrome mobile contexts at **375 × 812, 390 × 844, and 430 × 932**, with an additional 320 px layout check, exercised habit creation, planned days, weekly targets, edit, reorder, stop/restart, unused deletion, rapid toggles, and undo; Today Weight/Kegel empty and recorded states; report modes, current/previous periods, cross-month weeks, February, cross-year navigation, empty states, habit matrices, training rows, Weight Chart.js, and Nutrition bars. Calendar clear-day confirmation explicitly excluded habits; after clearing a WeightLog, the HabitCheckIn remained. No page errors or horizontal overflow were observed. The browser QA uses isolated data and is not a physical-device test.

## Production Verification

Actions deployed `END_COMMIT` successfully. Production HTML references `index-2LETSyfU.js` and `index-CJkgxkKK.css`; downloaded copies match the Pages-path local build byte for byte by SHA-256. Fresh production Chrome mobile contexts at 375, 390, and 430 px created and checked in a custom habit, displayed weekly and monthly history, opened More habit management, and exported a V6 backup containing the habit and check-in. The two Today activity cards and four Progress tabs were present, with no page errors or horizontal overflow.

## Manual Device Verification

**Pending:** real iPhone Safari and standalone PWA. Verify 44 px habit rows, weekday controls and keyboard, report-tab width and matrix readability, Chart.js rendering, Today action alignment, Safe Area, Bottom Nav, and offline behavior. Chrome mobile simulation cannot confirm physical-device touch feel.

## Known Issues

Vite emits a nonblocking advisory for the 503.08 kB Pages-path main JS bundle, slightly above its 500 kB warning threshold. No functional code, test, browser, or deployment defect was confirmed. Physical iPhone verification remains pending.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA built with Vanilla TypeScript, Dexie V6 (12 stores), Backup V6, and Restore V1–V6. The verified application commit is `28193cebca7e11c72f548396de0e2396af1aeb04`. Today supports quick custom-habit check-in and matching compact Weight/Kegel cards; More manages habits; Progress Reports derive weekly/monthly visualizations from current records without storing reports. Calendar remains at five categories, and clear-day does not delete HabitCheckIns. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
