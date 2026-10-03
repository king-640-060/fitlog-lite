# FitLog Lite Agent Guide

This file is the required entry point for AI-assisted work in this existing production application.

## Project identity

- Product: FitLog Lite, a single-user, local-first, iPhone-first fitness log.
- Runtime: offline-capable PWA built with Vanilla TypeScript, HTML, CSS, and Vite.
- Persistence: Dexie over IndexedDB; hosting: GitHub Actions to GitHub Pages.
- Product data stays on the current device unless the user exports a backup or explicitly uploads an encrypted GitHub recovery copy. GitHub Sync V1 is manual, never background synchronization.
- Data reliability and historical correctness take priority over convenience.

## Production User Data Preservation Contract

This contract is a highest-priority release requirement, including GitHub Sync:

- Normal startup and deployment must preserve business data; never reset IndexedDB.
- `fitlog-lite-db` is the stable production persistence identity. Never rename it for convenience.
- Never use deleteDatabase, db.delete, or clear-all as a normal upgrade or schema repair.
- Every schema change requires an explicit Dexie migration that preserves all prior production records and historical semantics. The new app must open the previous production database without data loss.
- Never recompute FoodLog/Workout historical snapshots from current libraries or templates during migration.
- Preserve supported older Backup Restore formats when upgrading Backup schemas.
- Restore must validate completely before replacing data in one transaction.
- Keep frozen legacy production fixtures unchanged; add new fixtures for later production versions. Run preservation, reopen, populate, migration, and Backup compatibility tests before release.
- Compatibility failures block release. “Users can re-enter data” and “clear the database” are not migration plans.
- GitHub Sync must respect the same contract: encrypt before upload, validate before restore, explicit confirmation before replacing local or divergent remote data.

User data compatibility is a release blocker, not a best-effort requirement.

## Required context loading order

At the beginning of every new task:

1. Read this `AGENTS.md` completely.
2. Read `LATEST_DEV_REPORT.md` for the latest verified production state.
3. Read `docs/CHAT_HANDOFF.md` only when architecture, historical decisions, or older implementation context is required.
4. Inspect only the source and test files relevant to the requested task.

For UI or interaction work, read `docs/UI_INTERACTION_SPEC.md` before modifying the interface. Keep it current when a durable interaction rule changes.

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
- Food.calories and FoodLog calorie snapshots are canonical kcal. UI may accept kJ using exactly 1 kcal = 4.184 kJ; never derive calories from macros. Unit-only edits must preserve exact canonical energy.
- FoodLog preserves a nutrition and display snapshot; later Food edits or deletion must not rewrite history. Optional Food.servingGrams is an input convenience independent of referenceGrams; convert servings to exact actual grams and reuse existing nutrition snapshots. Never persist a live serving link or infer serving mass from Vision. Clear-meal deletion belongs in foodService and scopes exactly one viewed local date and actual meal group, including unclassified, in one transaction.
- Workout preserves exercise-name and set history; later Exercise edits or deletion must not rewrite history.
- Templates are inputs for creating records, not live links to generated records. Nutrition strategies contain ordered daily variants; applying one snapshots its values and provenance into the existing NutritionTarget. DietTemplate sourceTemplateId and strategySelection are separate origins. Editing, removing variants or archiving strategies never rewrites saved daily targets. Phase activation is explicit, atomic, locally dated and does not generate daily targets.
- Template application must deep-clone nested records and generate fresh identifiers where required.
- Historical and restore semantics must remain deterministic.
- Every database schema change requires an explicit Dexie migration path.
- Every Backup schema change must preserve supported older Restore formats.
- Validate a backup completely before clearing current data.
- Multi-store writes that must succeed together belong in one transaction.
- Data reliability is more important than UI convenience.
- iPhone accessibility must not be traded away to suppress zoom or keyboard behavior.

## Optional FitLog AI contract

- Model labels read the current active profile model and effective image route (getVisionModel), never an ID embedded in its editable name. Capability verification describes support separately. Preserve the existing explicit-independent-image display rule.
- One AI profile shares its Provider, Base URL and credential. Chat and tool calls use `model`; image input uses optional `visionModel`, falling back to `model` for legacy profiles. Invalidate only the capability whose effective route changed; a Vision-only edit must preserve an ongoing chat and its context.
- Read `docs/AI_ARCHITECTURE.md` before changing AI. Provider profiles are editable device-only transport configuration; core business semantics must not depend on a vendor or model.
- AI credentials, configuration, chat, usage, plan handles and proposals never enter business DB stores, Backup or GitHub Sync. Keep API Keys separately stored from profile metadata and empty in edit-form values; never log credentials or raw provider errors.
- AI reads use bounded registered tools with real scope enforcement. Preserve saved FoodLog/Workout facts, independent calories and unknown missing macros. Reports and nutrition completion reuse existing local services/calculators.
- Model calls can only produce proposals. The App owns deterministic previews, explicit confirmation, repeated-ID protection, stale-source validation and atomic existing-service writes. Recheck permissions and relevant source records inside the transaction.
- No AI destructive, arbitrary DB/HTTP, Restore/Clear/GitHub Sync, Workout factual-session or Pelvic factual-session tools. Tasks are plans, never proof of a health activity.
- Ordinary assistant rounds use incremental streaming when compatible; a200 JSON fallback must consume that same response without retry. Probes and Food Vision extraction remain nonstreaming. Aggregate and validate complete tool calls before registry execution; partial/aborted output is UI-only, never finalized history. Protect incremental text against known credentials across chunk boundaries.
- Bound requests, tool arguments/results, rounds and history. Abort and failures must preserve business records. Treat names/notes/tool data as untrusted data and render AI text safely as text.
- Mock provider tests are separate from real provider compatibility and physical iPhone verification. Never use real user keys or business records in automated browser QA.
- Food packaging Vision is one explicit workflow shared by Food Library, meal entry and the assistant. It uses the existing adapter directly, without agent tools/history. The model only transcribes visible label fields with bounded evidence; local validation and kJ/kcal conversion own all numbers. Never estimate nutrition from a dish photo, infer density or treat mL as grams. Images/extraction stay in memory and out of DB/Backup/Sync; saving an ordinary Food and optional FoodLog requires a local preview and explicit confirmation.

## Voice and quick launch contract

- Voice input is only an input method for the existing AI assistant. Final transcripts use the same `engine.send` path as typed input; voice never confirms proposals or writes directly.
- FitLog does not persist audio or own a MediaStream. Browser/OS speech recognition must not be described as guaranteed on-device or offline. Abort on close, visibility loss and pagehide; no background listening or automatic restart.
- Quick-launch prompts use ephemeral URL fragments, never normal query strings. Consume immediately, keep drafts only in memory, and retain existing secret/permission/proposal enforcement.
- External iOS launchers are unverified until a physical device proves the same installed web-app storage context, existing business records and AI configuration/key without re-entry/Restore/Sync.
- Do not create a duplicate Home Screen web app merely to obtain a second icon. Do not rely on undocumented URL schemes for production data access. Keep the normal manifest identity/start URL and main icon behavior.

## Durable interaction rules

- PWA updates download without reloading an open client. Management → Application → Version diagnostics shows independently measured App/SW builds. Activate a waiting worker and reload once only after explicit confirmation, transient-state checks and a write drain. Preserve forms, selected Vision images, AI drafts/proposals and business records. Never clear site data or reinstall as an upgrade remedy. Build identities come from Git at build time; diagnostics exclude URL queries/fragments, credentials and business data. See `docs/PWA_RUNTIME.md` for legacy-client transition and physical evidence requirements.

- Do not expose duplicate equivalent create actions in the same empty state; retain one visible, keyboard-accessible next action and preserve populated-state creation.
- Repeated cards on the same functional surface share action geometry; primary/secondary changes emphasis, not structure. Geometry may differ by interaction context: Today dashboard navigation belongs in its card header as compact text with a chevron. The Today Training card is titled 训练, with a secondary 记录训练 coupled to body status using activity-card primitives; it opens today’s existing creation region without creating records or assuming Strength. An open strength workout replaces it with compact primary 继续力量训练 inside its strength status, while dedicated Workout execution cards use full-width actions. Dedicated Workout execution cards use the same primary lime treatment for their main action; geometry and interaction states remain shared across Strength, Cardio and Kegel.
- Unset progress indicators remain semantically neutral and muted, but sufficiently visible against the actual card background. Scope contrast adjustments to the affected surface.
- Progress visualization and its metric remain coupled. Today/Food share the280° open calorie SVG gauge (6px main/3px excess, neutral unset) and Today-style macro tiles without donuts. Keep existing goal/excess/unknown semantics, canonical precision and static final rendering; see UI_INTERACTION_SPEC for geometry and contrast.
- Explanatory section footnotes must not look interactive: no setting icon, bold row title, chevron or card surface.
- Touch focus must not show keyboard-style outlines; keyboard focus must remain explicit.
- Do not use global transform-based button press feedback.
- Do not animate ordinary rerenders as page entrances or replay nutrition counts/rings.
- Browser toolbar/VisualViewport movement alone must not reposition Sheets. Keyboard-closed bottomOffset/overlap are0; shared editable-focus/occlusion hysteresis owns keyboard geometry and closing. Coalesce updates and fix this centrally; no private sheet listeners or global touchmove prevention. Voice must not open keyboard mode.
- Sheets share one VisualViewport/keyboard lifecycle through `src/ui/sheetController.ts`; close normally before replacement and run consumers’ cleanup.
- Avoid backdrop blur in mobile dialogs.
- Do not autofocus mobile sheet forms or their close buttons; initial focus belongs to the title anchor.
- Hover-only visuals must be scoped to hover-capable fine pointers.
- Accent is reserved for primary/selected states and concise semantic marks, not general decoration.
- Preserve native text selection, 16px editable text, 44px targets and user scaling.
- Existing data/business contracts take priority over visual changes. Read `docs/INTERACTION_VISUAL_SYSTEM.md` for shared primitives and boundaries.

- Main-tab content must reserve fixed bottom navigation plus Safe Area. The app shell owns iPhone top Safe Area once; no per-page device-specific top padding.
- Keep short Chinese actions together; change layout instead of letting one character drop to a new line. Avoid orphan half-width fields in mobile forms.
- Reduce density through shared spacing while retaining >=44px touch targets and >=16px editable text.
- Automatic energy displays are integer kcal/kJ; canonical kcal and untouched numeric sources retain precision. Other automatic nutrition/weight/gram labels use at most one decimal. Never round each keystroke or write rounded presentation back on a unit-only change.
- Shared text-field CSS excludes native checkbox/radio controls. Native controls are20–22px inside >=44px labels; do not replace native appearance. Habit weekday overlays retain their existing accessible44px behavior.
- Food Vision defaults to role-specific Fast profiles (nutrition1400px/auto, front1000px/low). High detail is an explicit user retry, never an automatic second request. Keep images/source files and numeric-only timings ephemeral.
- Vision step replacement owns immediate and next-frame scrollTop0. Image viewer return preserves review DOM and scroll position. Ordinary pickers share the Sheet body scroll owner.
- UI releases maintain `docs/UI_QA_MATRIX.md` and run `tests/browser/uiQualityAudit.mjs` alongside existing browser gates. Inspect actual screenshots; distinguish browser emulation from physical Safari/PWA/provider verification.

- Shared search fields reserve the SVG icon with a selector that wins over generic input padding, matching logical start edges and centering the icon within the field. Ordinary text-field padding remains unchanged.

## Targeted file map

- `src/main.ts`: application state, views, dialogs, event bindings, mobile viewport behavior.
- `src/db/types.ts`: persisted entities and Backup schema types.
- `src/db/database.ts`: Dexie versions, stores, indexes, first-population seed.
- `src/services/foodService.ts`: Food and FoodLog operations.
- `src/services/workoutService.ts`: Exercise, Workout, validation, and autosave.
- `src/services/templateService.ts`: Workout/Diet templates and template application transactions.
- `src/services/nutritionTargetService.ts`: daily nutrition targets.
- `src/services/nutritionStrategyService.ts` / `src/ui/nutritionStrategies.ts`: strategy definitions, daily selection, phase boundaries and real WeightLog summaries; three additive V8 stores.
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
