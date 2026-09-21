# FitLog Lite Agent Guide

This file is the required entry point for AI-assisted work in this existing production application.

## Project identity

- Product: FitLog Lite, a single-user, local-first, iPhone-first fitness log.
- Runtime: offline-capable PWA built with Vanilla TypeScript, HTML, CSS, and Vite.
- Persistence: Dexie over IndexedDB; hosting: GitHub Actions to GitHub Pages.
- Product data stays on the current device unless the user exports a backup.
- Data reliability and historical correctness take priority over convenience.

## Required context loading order

At the beginning of every new task:

1. Read this `AGENTS.md` completely.
2. Read `LATEST_DEV_REPORT.md` for the latest verified production state.
3. Read `docs/CHAT_HANDOFF.md` only when architecture, historical decisions, or older implementation context is required.
4. Inspect only the source and test files relevant to the requested task.

Resolve conflicts in this order:

```text
current code
> LATEST_DEV_REPORT.md
> docs/CHAT_HANDOFF.md
```

Always sync and inspect Git before trusting a recorded commit value; `LATEST_DEV_REPORT.md` is a maintained snapshot, while the repository remains the source of truth.

## Inspection rule

Do NOT scan the entire repository by default.

Use the file map below and the user request to perform targeted inspection first.
Classify the requested behavior before modifying anything:

```text
Already implemented
Partially implemented
Not implemented
Regression
```

Expand the investigation only when one or more of these conditions applies:

- The current report conflicts with the code.
- The task changes or audits a database migration.
- The task changes or audits Backup/Restore compatibility.
- The change has cross-module dependencies that cannot be resolved locally.
- A test fails for an unexplained reason.
- A regression appears outside the initially inspected area.

Do not recreate functionality merely because an older prompt describes it as future work; current `main` wins over old prompts and historical documentation.

## Existing functionality

The following major modules already exist. Inspect them before proposing replacement work:

- Food library, FoodLog nutrition snapshots, and CSV/JSON import.
- Diet Templates and daily Nutrition Targets.
- Strength Workouts, history, autosave, and Workout Templates.
- Exercise library and first-database starter seed behavior.
- Pelvic Floor / Kegel timed sessions and history.
- Weight logs, Chart.js trends, and Calendar N/S/P/W aggregation.
- Versioned JSON Backup with backward-compatible Restore.
- iPhone VisualViewport, keyboard, input, Safe Area, installable PWA, and offline shell.

Read `LATEST_DEV_REPORT.md` for verified versions, test counts, deployment status, and manual verification gaps.

## Core invariants

- Business dates use the device-local `YYYY-MM-DD` calendar date.
- Never generate a business date with `toISOString().slice(0, 10)` or another UTC truncation.
- ISO timestamps are appropriate for created/updated/start/finish metadata, not local business dates.
- FoodLog preserves a nutrition and display snapshot; later Food edits or deletion must not rewrite history.
- Workout preserves exercise-name and set history; later Exercise edits or deletion must not rewrite history.
- Templates are inputs for creating records, not live links to generated records.
- Template application must deep-clone nested records and generate fresh identifiers where required.
- Historical and restore semantics must remain deterministic.
- Every database schema change requires an explicit Dexie migration path.
- Every Backup schema change must preserve supported older Restore formats.
- Validate a backup completely before clearing current data.
- Multi-store writes that must succeed together belong in one transaction.
- Data reliability is more important than UI convenience.
- iPhone accessibility must not be traded away to suppress zoom or keyboard behavior.

## Targeted file map

- `src/main.ts`: application state, views, dialogs, event bindings, mobile viewport behavior.
- `src/db/types.ts`: persisted entities and Backup schema types.
- `src/db/database.ts`: Dexie versions, stores, indexes, first-population seed.
- `src/services/foodService.ts`: Food and FoodLog operations.
- `src/services/workoutService.ts`: Exercise, Workout, validation, and autosave.
- `src/services/templateService.ts`: Workout/Diet templates and template application transactions.
- `src/services/nutritionTargetService.ts`: daily nutrition targets.
- `src/services/pelvicFloorTimer.ts`: pure timed-session state machine.
- `src/services/pelvicFloorService.ts`: pelvic session persistence and duration.
- `src/services/backupService.ts`: export, validation, compatibility, and transactional restore.
- `src/services/importService.ts`: food CSV/JSON import.
- `src/services/weightService.ts`: weight upsert behavior.
- `src/ui/calendarPage.ts`: month grid, aggregation, and accessible calendar output.
- `src/utils/date.ts`: local business-date helpers.
- `src/styles/main.css`: mobile layout, sheets, navigation, Safe Area, and visual states.
- `tests/*.test.ts`: core, stability, templates, migrations, seed, Nutrition Target, pelvic timer, Backup, and calendar coverage.
- `vite.config.ts`: PWA manifest, Workbox, and GitHub Pages base.
- `.github/workflows/deploy.yml`: `main` deployment pipeline.

## Development workflow

Use this sequence for every implementation round:

```text
Sync
→ Inspect Before Modify
→ Small Increment
→ Regression Tests
→ Typecheck
→ Full Tests
→ Build
→ Commit
→ Push main
→ GitHub Actions
→ Production Verification
→ Development Report
```

Before work, run:

```bash
git status
git branch --show-current
git pull --ff-only
git log -1 --oneline
```

Record the resulting SHA as `START_COMMIT`; preserve unrelated user changes and do not proceed from an unexplained dirty tree.

Keep each increment within the explicit request:

- Do not perform unrelated refactors.
- Do not change frameworks without explicit approval.
- Do not modify unrelated schemas.
- Add a regression test for bug fixes when practical.
- Prefer existing services, validation helpers, and design patterns.

Before publishing, run and require success from:

```bash
npm run typecheck
npm test
npm run build
```

Use a focused commit message, push `main`, wait for GitHub Actions, verify Production, and record the published SHA as `END_COMMIT`.

## Development report rule

Every completed development round must:

- Update `LATEST_DEV_REPORT.md` with the latest verified production state.
- Return a `FitLog Lite Development Report` to the user.
- Report `START_COMMIT` and `END_COMMIT`.
- Report DB, Backup, and Restore versions.
- Report actual test and build results from that round.
- Report the GitHub Actions run and conclusion.
- Report the production commit and URL.
- Report only confirmed remaining issues.
- List manual device verification separately.
- Include a concise `ChatGPT Baseline` suitable for the next conversation.

Never merge these verification categories:

```text
Automated Verification
Production Verification
Manual Device Verification
```

A successful build is not proof of real iPhone, keyboard, standalone, or offline behavior.

## Scope guard

Do not introduce these without an explicit user requirement:

- Accounts or login.
- Backend services, cloud databases, or automatic cloud sync.
- Social or coaching features.
- Large UI frameworks or router migrations.
- Unnecessary dependencies.
- Unrelated architecture rewrites.
- Broad visual redesigns outside the requested scope.

## Documentation maintenance

- Keep this file focused on durable rules and architecture, not changing SHAs or test counts.
- Keep `LATEST_DEV_REPORT.md` focused on the latest verified production state, not development history.
- Keep `docs/CHAT_HANDOFF.md` as deeper historical and architectural context.
- When documentation conflicts with implementation, inspect current code and correct the documentation.
