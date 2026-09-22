# FitLog Lite — Latest Development Report

This document records the latest verified production application state. It is not a development history log.

Always sync Git before starting work. Documentation-only commits may be newer than the application-changing baseline recorded here without changing application behavior.

## Current Git State

```text
Current branch: main
START_COMMIT: dd73a132f169b83f428b326f880ddc9ad3567997
END_COMMIT: 85af24ec9dac57e29095c459175eedcab51313ff
END_COMMIT message: feat: refine mobile UI and kegel history
Current application baseline commit: 85af24ec9dac57e29095c459175eedcab51313ff
Working tree at application verification: clean
Remote main at application verification: synchronized
Next START_COMMIT: sync main and record its current HEAD
```

## Current Project State

```text
Database version: Dexie V3
Backup schema version: V3
Restore compatibility: V1 / V2 / V3
Stores: 9
Typecheck status: PASS
Tests: 73 passed / 4 files
Build status: PASS
Production commit: 85af24ec9dac57e29095c459175eedcab51313ff
GitHub Actions status: completed / success
Production URL: https://king-640-060.github.io/fitlog-lite/
```

Current stores:

```text
foods
foodLogs
exercises
workouts
weights
workoutTemplates
dietTemplates
nutritionTargets
pelvicFloorSessions
```

## Latest UI and Stability Round

- Removed the user-facing strength/RPE column and inputs from Workout and Workout Template editors while retaining existing persisted fields for historical and Backup compatibility.
- Rebalanced Workout set rows around set number, weight, reps, note, and a visually subdued delete control.
- Changed all user-facing Pelvic Floor training names to 凯格尔训练 without renaming internal stores, entities, types, services, or Backup fields.
- Added unique-ID-based deletion for individual Kegel history records with a subdued more menu and destructive confirmation.
- Simplified the global VisualViewport strategy: removed competing viewport-scroll listeners and programmatic focus scrolling; VisualViewport now reports keyboard state/overlap while stable scroll containers and native focus behavior keep inputs available.
- Refined Today, Food, Workout Detail, Progress, More, Bottom Navigation, empty states, and narrow-screen spacing for iPhone viewports.
- Food macros now use stacked label/value/progress layout, calorie units no longer compete with the target action, and FoodLog deletion is moved into a more menu.
- A single weight record now uses a compact summary instead of reserving an empty chart; Trend shows a clear second-record prompt until two points exist.
- Bottom Navigation uses a 57px navigation body at the tested browser viewport with 48px tab targets; Safe Area remains a separate bottom inset.
- No database schema, entity schema, Backup schema, Restore compatibility, local-date rule, FoodLog snapshot, Workout history, or Template deep-clone semantics changed.

## Implemented Major Features

- Food library and FoodLog nutrition snapshots.
- Food CSV/JSON import.
- Diet Templates.
- Daily Nutrition Targets for calories, protein, carbs, and fat.
- Strength Workouts, history, editing, and autosave.
- Workout Templates.
- Exercise starter seed only on first database population.
- Kegel timed sessions, pause/resume, history, per-record deletion, audio cues, and optional Wake Lock.
- Weight logging and Chart.js trends.
- Calendar nutrition, strength, Kegel, and weight aggregation.
- Backup V3 export and V1/V2/V3 Restore.
- Transactional restore with validation before clear and rollback on failure.
- iPhone input sizing, VisualViewport keyboard state, stable Bottom Sheet scrolling, and Safe Area layout.
- Installable standalone PWA with Workbox offline application shell.

## Verification Snapshot

Automated Verification:

```text
npm run typecheck: PASS
npm test: PASS — 73 tests / 4 files
npm run build: PASS
PWA generateSW: PASS — 17 precache entries / 498.49 KiB
git diff --check: PASS
```

Production Verification:

```text
GitHub Actions run: https://github.com/king-640-060/fitlog-lite/actions/runs/35713687055
Workflow status: completed
Workflow conclusion: success
Production HTTP: 200
Published application bundle: PASS — contains 凯格尔训练记录, 删除记录, deletion confirmation, and the single-weight trend prompt
Production manifest theme/background: #f7f8f4 / #f7f8f4
Production service worker HTTP: 200
```

Local Browser Visual Verification:

```text
Application boot: PASS
Today, Food, Workout detail, Progress overview/trend, More, and Kegel history: PASS
375×812, 390×844, 393×852, and 430×932 responsive width checks: PASS
No horizontal overflow in the tested Today, Food, Workout detail, Progress, or More views
Bottom Navigation body: 57px; tab target: 48px at tested emulated viewports
Workout weight/reps inputs: PASS — strength/RPE UI absent
Food and Kegel more menus: PASS
Browser console errors: none observed
```

## Known Confirmed Issues

No confirmed code, test, build, deployment, or emulated-viewport defects were present at the latest verification.

The items below are verification gaps, not confirmed defects.

## Manual Device Verification Pending

- Real iPhone Safari keyboard checks across Food creation/editing, Workout weight/reps/notes, Weight entry, Exercise entry, and template-name inputs.
- Verify Bottom Sheet header stability and minimal native focus scrolling while switching fields on real iPhone hardware.
- Add to Home Screen standalone launch, icon, Bottom Navigation Safe Area, and Home Indicator spacing.
- Kegel record deletion end-to-end on a disposable real-device record, including Today, Progress, and Calendar refresh.
- Kegel timer foreground/background and lock-screen behavior.
- Audio cues on real hardware and under iOS audio/silent-mode conditions.
- Wake Lock availability and graceful fallback on the target iPhone/iOS version.
- Offline cold launch, local write operations, and JSON export.

## ChatGPT Baseline

FitLog Lite is a production, local-first iPhone PWA on Dexie V3 with Backup V3 and V1/V2/V3 Restore compatibility. The current production application baseline is `85af24e`. Round 2 removes strength/RPE from user-facing Workout and Template inputs without deleting legacy fields, standardizes the visible name 凯格尔训练, adds unique-ID Kegel history deletion with confirmation, simplifies global VisualViewport handling to avoid competing focus scrolling, and tightens the five-tab Chinese UI for 375–430px iPhone viewports. Start the next task by reading `AGENTS.md`, syncing `main`, recording the actual HEAD, and then using this report as the verified snapshot.

## Context Rules

- Read `AGENTS.md` before using this report.
- Current code overrides this report if they conflict.
- Read `docs/CHAT_HANDOFF.md` only for deeper historical and architectural context.
- Do not recreate an implemented feature without inspecting the current implementation.
- The next task must sync `main` and record its current HEAD as `START_COMMIT`.
