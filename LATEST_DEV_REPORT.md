# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync `main` before trusting a recorded SHA. The report commit follows the two separate application commits.

## Current Git and Production State

- Branch: `main`
- START_COMMIT: `a4d1f6eaf57c76b2a9c3bf27bd38ac1be6de4a3d`
- CARDIO_COMMIT: `b15b70e03d22e45dfc6004364ffb08e79ef801fb` — `Add typed cardio sessions`
- FOOD_UI_COMMIT: `9e1312f7fcea72ac61888b2ab6565d25aefbab3f` — `Refine food action hierarchy`
- END_COMMIT (verified application): `9e1312f7fcea72ac61888b2ab6565d25aefbab3f`
- Report commit: separate documentation commit immediately after `END_COMMIT`
- Production URL: https://king-640-060.github.io/fitlog-lite/
- Application Actions run: [36307199905](https://github.com/king-640-060/fitlog-lite/actions/runs/36307199905) — completed / success; typecheck, tests, build, artifact upload, and Pages deployment passed

## Typed Cardio Sessions

New cardio records explicitly select `stair_climber` (楼梯机) or `treadmill` (跑步机). Existing records without `activityType` continue to mean stair climber. Both require a positive duration. Stair climber requires a positive speed and stores no incline. Treadmill accepts speed, incline, or both; speed must be positive when present, incline must be finite and nonnegative, and at least one metric is required. Treadmill speed displays as km/h and incline as percent. Switching type in the same sheet preserves unsubmitted fields; saving normalizes fields for the selected type. History, workout summaries, Today, and Calendar day detail show the appropriate type and metrics. The Calendar month category remains a single `cardio` category.

## Food Action Hierarchy

“使用模板” and “食物库” are visible quiet actions in the Food topbar. “选择日期” and the conditional “回到今天” are grouped directly above the Date Rail. “保存为模板” appears in the selected day's meal heading only when that day has FoodLogs. The three-dot menu and its listeners/styles are removed. Template, library, and date actions retain their existing behavior. The native Date Rail scroll, snap, feedback, settlement, old-event protection, and horizontally static Food body remain intact. `docs/UI_INTERACTION_SPEC.md` records both durable feature rules.

## Data and Compatibility

- Database: Dexie V5, 10 stores; no migration or index change
- Database name: `fitlog-lite-db`
- Backup export schema: **V5**, with all 10 stores unchanged; old cardio records are explicitly typed as stair climber in the export without changing stored records
- Restore compatibility: **V1 / V2 / V3 / V4 / V5**; V4 cardio retains its required-speed validation, V5 validates typed cardio; validation completes before the restore transaction
- FoodLog snapshots, Nutrition Target conflict handling, and device-local business dates remain unchanged

## Automated Verification

- `npm run typecheck`: PASS
- `npm test`: PASS — **169 tests / 13 files**
- `npm run build`: PASS — PWA generateSW **17 precache entries / 567.46 KiB** (local `/` base)
- Pages-path build (`GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build`): PASS — **17 entries / 567.56 KiB**
- `git diff --check`: PASS for both application commits

Tests cover legacy cardio interpretation, stair and treadmill validation, type changes, metric formatting, Calendar detail aggregation, V1–V5 restore, V5 export and round trip, and existing Food date helpers.

## Browser QA

Fresh Chrome mobile contexts at **375 × 812, 390 × 844, and 430 × 932** exercised old stair records; new stair, treadmill speed-only, incline-only, and combined records; old-record editing and type switching; history, Today summary, Calendar detail, and deletion. Numeric input text was 16 px. Food checks covered topbar actions, the date helper row, direct picker jump, return to Today and delayed old-rail event, saving a nonempty day as a template, hidden save action on an empty day, native rail touch scrolling and settlement, and a static Food body. Calendar day detail navigation into Food also passed at 320 and 390 px. No page errors or horizontal overflow were observed. Visual review at 390 px confirmed the quiet Food action layout.

## Production Verification

Actions deployed application commit `9e1312f7fcea72ac61888b2ab6565d25aefbab3f`. The production HTML references `index-CHGt4ai5.js` and `index-nXrO5YXp.css`; both downloaded production assets match the Pages-path local build byte for byte by SHA-256. Fresh production Chrome mobile contexts at 375, 390, and 430 px repeated typed-cardio creation, legacy editing, history and Today checks, plus Food date, template, touch, and stale-rail checks. Production Calendar-to-Food navigation passed at 320 and 390 px. No page errors or horizontal overflow were observed.

## Manual Device Verification

**Pending:** real iPhone Safari and standalone PWA. Check the cardio type control, numeric keyboard and Done/submit, km/h and % labels, sheet spacing, Food topbar and date-picker touch targets, Date Rail feel, Return to Today, and Safe Area. Chrome mobile simulation does not establish physical-device behavior.

## Known Issues

No code, test, build, browser, or deployment defect was confirmed. Physical iPhone verification remains pending.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA built with Vanilla TypeScript and Dexie V5 (10 stores). The verified application commit is `9e1312f7fcea72ac61888b2ab6565d25aefbab3f`; its preceding independent cardio commit is `b15b70e03d22e45dfc6004364ffb08e79ef801fb`. Backup export is V5 and Restore accepts V1–V5. Cardio supports stair climber and treadmill, while missing legacy activity types mean stair climber. Food has top-level template/library actions, a date helper row above the native Date Rail, and contextual Save as Template. The Food body has no horizontal date gesture. Calendar still aggregates all cardio types into one category. Read `AGENTS.md`, this report, and `docs/UI_INTERACTION_SPEC.md` before further UI work; sync `main` and record a fresh START_COMMIT.
