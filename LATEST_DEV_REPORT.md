# FitLog Lite — Latest Development Report

This document records the latest verified production application state. It is not a development history log.

Always sync Git before starting work. Documentation-only commits may be newer than the application-changing baseline recorded here without changing application behavior.

## Current Git State

```text
Current branch: main
Current commit at verification: 56558b3c0bb12ba0dd82c27932facef467b5db59
Current commit message: Add nutrition targets and pelvic floor training
Current application baseline commit: 56558b3c0bb12ba0dd82c27932facef467b5db59
Working tree at verification: clean
Remote main at verification: synchronized
Next START_COMMIT: sync main and record its current HEAD (56558b3c0bb12ba0dd82c27932facef467b5db59 at this verification)
```

## Current Project State

```text
Database version: Dexie V3
Backup schema version: V3
Restore compatibility: V1 / V2 / V3
Stores: 9
Typecheck status: PASS
Tests: 72 passed / 4 files
Build status: PASS
Production commit: 56558b3c0bb12ba0dd82c27932facef467b5db59
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

## Implemented Major Features

- Food library and FoodLog nutrition snapshots.
- Food CSV/JSON import.
- Diet Templates.
- Daily Nutrition Targets for calories, protein, carbs, and fat.
- Strength Workouts, history, editing, and autosave.
- Workout Templates.
- Exercise starter seed only on first database population.
- Pelvic Floor / Kegel timed sessions, pause/resume, history, audio cues, and optional Wake Lock.
- Weight logging and Chart.js trends.
- Calendar N/S/P/W visualization, selected-day detail, and monthly summary.
- Backup V3 export and V1/V2/V3 Restore.
- Transactional restore with validation before clear and rollback on failure.
- iPhone input sizing, VisualViewport keyboard handling, Bottom Sheet sizing, and Safe Area layout.
- Installable standalone PWA with Workbox offline application shell.

## Verification Snapshot

Automated Verification:

```text
npm run typecheck: PASS
npm test: PASS — 72 tests / 4 files
npm run build: PASS
PWA generateSW: PASS — 17 precache entries
```

Production Verification:

```text
GitHub Actions run: https://github.com/king-640-060/fitlog-lite/actions/runs/35617533023
Workflow status: completed
Workflow conclusion: success
Production HTTP: 200
Application boot: PASS
Browser console fatal errors: none observed
```

## Known Confirmed Issues

No confirmed code, test, build, or deployment defects were present at the latest verification.

The items below are verification gaps, not confirmed defects.

## Manual Verification Pending

- Real iPhone Safari keyboard and numeric input behavior.
- Add to Home Screen standalone launch, icon, and Safe Area behavior.
- Pelvic timer foreground/background and lock-screen behavior.
- Audio cues on real hardware and under iOS audio/silent-mode conditions.
- Wake Lock availability and graceful fallback on the target iPhone/iOS version.
- Offline cold launch, local write operations, and JSON export.
- Device checks at 375×812, 390×844, 393×852, and 430×932 viewports.

## Context Rules

- Read `AGENTS.md` before using this report.
- Current code overrides this report if they conflict.
- Read `docs/CHAT_HANDOFF.md` only for deeper architectural or historical context.
- Do not recreate an implemented feature without inspecting the current implementation.
- The next task must sync `main` and record the resulting HEAD as `START_COMMIT`.
