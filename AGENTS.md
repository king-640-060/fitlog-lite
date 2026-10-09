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
- Food packaging Vision is one explicit workflow shared by Food Library, meal entry and the assistant. It uses the existing adapter directly, without agent tools/history. The model only transcribes visible label fields with bounded evidence; local validation and kJ/kcal conversion own all numbers. This packaging workflow never estimates nutrition from a dish photo, infers density or treats mL as grams. The separate, explicitly confirmed Meal Photo Estimate workflow may suggest only a rough contextual DietEvent kcal range; it never writes Food or FoodLogs. Images/extraction stay in memory and out of DB/Backup/Sync; saving an ordinary Food and optional FoodLog requires a local preview and explicit confirmation.

## Contextual DietEvent contract


- DietEvent is an independent contextual fact, never a FoodLog or NutritionTarget. Optional manual/photo estimates may overlap actual FoodLogs and never enter canonical intake, gauges or report totals. Meal/day scopes, notes and original rough ranges preserve history; no score, punishment, compensation, inferred strategy change or chat write tool.
- V10 adds only an empty dietEvents store to stable fitlog-lite-db; all17 prior stores/indexes/snapshots remain unchanged. BackupV10/RestoreV1–V10 validate completely before one18-store replacement transaction. Sync/envelopeV1 and AIConfigV1 remain unchanged. FrozenV9 fixtures stay immutable; add frozenV10 coverage.
- Single-meal photos use the active profile's existing Vision route/key, independent strict JSON parser and disclosure. Local Canvas re-encoding strips metadata. At most2 images, memory-only; review and “使用这个估算” only fill a draft, explicit Save persists contextual fields. Day scope forbids photo estimates; converting a photo meal to day clears its range/value. Packaging label transcription remains separate and strict.
- Calendar shows all nine actual categories in fixed3×3 slots without +N; the special-diet marker remains independent from Food intake. Nutrition READ context is bounded and permission-gated; no estimates are summed into actual values.

- Habit Manager/Editor use the existing large Sheet frame; Save stays in normal static form flow after planning, before state/danger actions. Preserve parent scroll on Back and start each editor at the top; no sticky/fixed Save or private viewport compensation.
- Manual Habit deletion is quiet danger in the editor, with actual check-in count and irreversible confirmation. Keep deleteUnusedHabit protection; deleteHabitWithHistory removes definition and every owned check-in in one two-store transaction with rollback and stale-count guard. Deactivation preserves history. No AI permanent-delete tool.

## Voice and quick launch contract

- Voice Mode adds owned capture, dedicated transcription and system replies to the existing AI assistant. Final transcripts use the same `engine.send` path as typed input; voice never confirms proposals or writes directly.
- Primary Voice Mode owns getUserMedia + MediaRecorder in one VoiceCaptureController. Stop all tracks before dedicated STT; release on Stop/cancel/close/Clear/settings/hidden/pagehide/errors. Audio is memory-only and excluded from DB/Backup/Sync/logs. Official Zhipu glm-asr-2512 uses WAV <=30s; reuse only compatible preset + official base credential without copying it. VoiceConfigV1 and optional independent key are device-only. SpeechRecognition is explicitly selected browser compatibility, stopped via abort. No app voice acknowledgement blocker; retain system permission and static AI Settings → Voice privacy. System TTS speaks only voice-originated final replies; cancel on new recording/close/Clear/background, never auto-restart listening.
- Quick-launch prompts use ephemeral URL fragments, never normal query strings. Consume immediately, keep drafts only in memory, and retain existing secret/permission/proposal enforcement.
- External iOS launchers are unverified until a physical device proves the same installed web-app storage context, existing business records and AI configuration/key without re-entry/Restore/Sync.
- Do not create a duplicate Home Screen web app merely to obtain a second icon. Do not rely on undocumented URL schemes for production data access. Keep the normal manifest identity/start URL and main icon behavior.

## Durable interaction rules

- PWA updates download without reloading an open client. Management → Application → Version diagnostics shows independently measured App/SW builds. Activate a waiting worker and reload once only after explicit confirmation, transient-state checks and a write drain. Preserve forms, selected Vision images, AI drafts/proposals and business records. Never clear site data or reinstall as an upgrade remedy. Build identities come from Git at build time; diagnostics exclude URL queries/fragments, credentials and business data. See `docs/PWA_RUNTIME.md` for legacy-client transition and physical evidence requirements.

- Plan tab Today/Upcoming/Inbox empty-card Add uses shared primary lime with its existing compact geometry; Today Plan remains secondary. Do not expose duplicate equivalent create actions in the same empty state; retain one visible, keyboard-accessible next action and preserve populated-state creation.
- Repeated cards on the same functional surface share action geometry; primary/secondary changes emphasis, not structure. Optional Training Journal reuses `Workout.note` and `CardioSession.note`, uses progressive disclosure, preserves line breaks/Unicode, caps at2000 characters, and is labelled subjective user-authored context for AI. Geometry may differ by interaction context: Today dashboard navigation belongs in its card header as compact text with a chevron. The Today Training card is titled 训练, with a secondary 记录训练 coupled to body status using activity-card primitives; it opens today’s existing creation region without creating records or assuming Strength. An open strength workout replaces it with compact primary 继续力量训练 inside its strength status, while dedicated Workout execution cards use full-width actions. Dedicated Workout execution cards use the same primary lime treatment for their main action; geometry and interaction states remain shared across Strength, Cardio and Kegel.
- Unset progress indicators remain semantically neutral and muted, but sufficiently visible against the actual card background. Scope contrast adjustments to the affected surface.
- Progress visualization and its metric remain coupled. Today/Food share the280° open calorie SVG gauge (6px main/3px excess, neutral unset) and one neutral MacroNutritionSummary container without donuts. Keep existing goal/excess/unknown semantics, canonical precision and static final rendering; see UI_INTERACTION_SPEC for geometry and contrast.
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

## Product retirement and motion contract

- Training Video Search retired by product decision. Do not reintroduce external search tools, providers, cards, settings or credentials. Startup cleanup removes only the six explicit legacy keys in retiredVideoStorage.ts; never enumerate or clear storage. AI, Voice, GitHub and business data remain protected.
- Use shared motion tokens and explicit event feedback in ui/motion.ts. Navigation entrance runs only on an actual main-tab change; domain refresh, initial numbers and progress rings remain static. Keep native checkbox semantics, reversible selected indicators, same-Sheet frame stability and parent scroll. Streamed messages enter once, historical messages never replay. Reduced motion disables all decoration. No global button/card scale, bounce, dependency or perpetual decorative RAF.

## Persistent Management Workspace (2026-10-07)

The topbar Management entry creates one large primary native dialog, owned by `src/ui/managementWorkspace.ts`. Hub → all twelve managers/settings → editors/subviews → Back retain the exact dialog, handle, header, close and modal-body nodes. Only inner content animates with existing subview/back motion; ordinary route changes keep top/height within2px, ideally0. Never close/reopen Hub to imitate Back or call a child standalone openModal from this path.

`ManagedSurfaceContext` supplies existing renderers with the persistent host/dialog, mount/navigation stack, title/Back target, scroll restoration and route disposal. Standalone Food/Today entries use the same renderer and keep their own parent meaning. Navigation stores UI nodes, title, query/subview and scroll only; services/DB remain authoritative. Saving reloads current service data, then restores the existing query and a valid scroll position. Every New editor starts at0; X closes every level, releases route resources and the shared lock, and the next topbar entry starts at Hub0.

Hub is 管理与设置 without Back. Level2 titles: 食物库 / 动作库 / 训练模板 / 饮食模板 / 营养模板 / 习惯 / 导入数据 / 备份与恢复 / GitHub 同步 / AI 设置 / 版本诊断 / 关于 FitLog Lite. A shared44×44 header Back names its actual parent in aria-label and pops one level; X always exits the workspace. Internal body Back controls are replaced visually by this header in managed paths. Temporary existing danger/Restore confirmations may overlay the same parent; they never replace it. AI → Voice → Back returns AI, then Hub.

All six entity managers use `.manager-toolbar`: search or count/status plus visible `+ 新建`, with complete 新建X aria-label and44px target. Empty states contain a brief title, one explanatory sentence and one primary 新建X; hide/remove the equivalent toolbar entry. Use 新建X / 编辑X / 保存X for long-lived entities; 添加 means placing an existing item into a meal/workout/template. Rows contain name, metadata and chevron and open the entity destination; quiet confirmed deletion belongs to the editor. Habit Level2 is 习惯, never 习惯管理.

Preserve Habit large-frame/static Save52px/15px/full-width/2px top padding and zero field overlap. No sticky/fixed/absolute actions. Preserve DBV11/IndexedDB110/20stores, BackupV11/RestoreV1–V11, Sync/envelopeV1, AIConfigV1/VoiceConfigV1 and permanently retired Video status. Route cleanup aborts AI/Vision/Sync/diagnostic requests, file-read callbacks and timers without resetting business storage. Physical Safari/original installed PWA remain separate evidence.

## Manager Visual System (2026-10-07)

Navigation remains owned by the existing Persistent Management Workspace contract. `src/ui/managerPrimitives.ts` and `src/styles/primitives.css` are the single HTML/visual source for all six entity managers, including standalone entries: 食物库 / 动作库 / 训练模板 / 饮食模板 / 营养模板 / 习惯. Domain renderers provide escaped copy/attributes and slots; they do not invent parallel list/card/empty layouts.

Shared anatomy is `.manager-surface` → `.manager-toolbar` (`.manager-toolbar-main` search/status, `.manager-toolbar-actions` quiet actions) → optional `.manager-utilities` / `.manager-section-note` → `.manager-section` / `.manager-list` / `.manager-row`. Row buttons contain `.manager-row-copy`, `.manager-row-title`, `.manager-row-meta` and `.manager-row-trailing` with18px chevron. Lists share warm surface,1px border,17px radius and no shadow. Rows share66px minimum,12px14px padding,4px text gap, .93rem/700 title and .75rem metadata; wrap naturally for longer domain content/font scaling. Dividers are shared. Search/status toolbar has a shared scalable height matching the editable line box,46px at100%; Create is quiet44px `+ 新建` with full 新建X aria-label. All search/status types use the same responsive geometry; shrinkable main slot and nowrap actions retain320/140 without per-module breakpoints.

True entity-empty uses `.manager-empty` with centered brief title/copy and one `.primary.manager-empty-action`:48px minimum, shared12px control radius and16px inline padding. Hide equivalent toolbar Create. Filtered no-results uses `.manager-no-results`, quiet copy and optional clear-search text action, never an empty-state primary CTA. Toolbar New remains quiet when the library has entities.

Food preserves two neutral44px/18px-icon utilities in the shared utilities slot. Habit keeps active/inactive shared sections and explicit reorder mode, with44px arrows in trailing slots and Create hidden while reordering. Nutrition puts current status/start date in row metadata; its short explanatory note is unboxed below Toolbar. Detailed phase/weight history remains in the existing detail view through the editor. Templates retain copy/apply/delete in editors rather than list rows. Old library/template/Habit/Nutrition list-specific visual rules are removed; retained class names are business/test selectors only.

Editor audit uses existing forms plus `.manager-editor`, primary full-width Save, quiet danger below it and a separate `.manager-danger-zone` for library/template deletion. Habit preserves its existing basic→planning→static Save→state/danger order,2px top action padding,52px/15px geometry and0 overlap. No changes to workspace controller/navigation, business services, schemas, AI/Voice/PWA or motion ownership. Add no observers/listeners/animation loops for this visual system.


## Recovery and Food nutrition contract (2026-10-08)

- Recovery uses additive V11 sleepSessions and waterLogs stores; retain every V10 index/row/snapshot. BackupV11 and RestoreV1–V11 include both stores in validation-before-write and the same atomic20-store transaction. FrozenV10 fixtures remain immutable; frozenV11 covers both active and completed sleep plus water. Sync/envelopeV1 and device-only AI/Voice configuration remain unchanged.
- Sleep stores absolute ISO instants, one unique activeKey=active across connections, and completed durationMinutes with the legacy local wake recordDate captured on finish or an actual end correction; optional sleepNightDate/source/local-start-date captures business-night attribution. Today and Progress read the same persisted sessions through liveQuery. UI elapsed time derives from wall clock, never periodic DB writes. Reject future/inverted edits; allow explicit cancellation and correction; warn after24h. Reopen, visibility and midnight retain the active session.
- Water is append-only per action with independent ids, local date and absolute timestamp. Exact-id six-second Action Toast outside card flow without covering other controls, volume edit and confirmed deletion never overwrite another drink. Daily sum uses only that date.Water reference is an editable device-only preference, not an inferred individualized target.
- Recovery7/30/90-day charts separate duration and water. Missing days are unknown, not zero in averages; sum completed episodes per resolved night. Mean sleep/wake clocks use circular means of each day's longest episode. Sleep statistics are objective facts only. History/editor/date subviews retain the same shared Sheet, with header Back/X and route cleanup.
- Today/Food use the complete shared MacroNutritionSummary and readDailyNutritionSummary snapshot/live observation, never separately assembled nutrient cards. One neutral container shows Protein/Carbs/Fat in three columns; text-derived rem thresholds switch all three to full-width rows together under large fonts/long values. Name → prominent consumed → secondary target → lightweight g/kg; main numbers share ink, category colors appear only in tiny marks. Remaining/excess appears once in the shared remaining-goal area; Today adds no duplicate CTA. g/kg uses only the selected local date's latest valid WeightLog and complete macro snapshots, exactly two decimals, no historical fallback. Observers unsubscribe on view/date changes. Food previews at most three names, with the existing counted meal header as the only expand entry; no separate +N. All actual editable rows and bottom collapse remain accessible.
- Food nutrition completion uses the existing primary lime class/states; busy retains lime and prevents duplicate requests. Recovery primary actions use the same primitive. Preserve critical numbers/CTA at320px,140% text, landscape and dark preference. Recovery dark colors use shared tokens rather than per-button overrides. Required browser inventory includes dailyRecordsExperience, catalogRecovery, macroNutritionSummary and foodRecovery; preserve all existing release gates and separate physical Safari/PWA evidence.


## AI Catalog / Recovery integration (2026-10-08)

- AI Catalog tools: search_catalog (kind-specific read, max10), propose_food, propose_exercise, propose_workout_template, propose_diet_template and propose_nutrition_strategy. Use existing memory-only AiProposals, user confirmation and service validation/writes; no model confirmation or arbitrary-table tool. Required Food facts come from user input; missing macros stay unknown, duplicate normalized names require clarification, historical snapshots remain immutable.
- Updates require real IDs and merge only supplied fields/nested exercise/set/item/variant patches; explicit remove/order alone remove/reorder. Preserve omitted items/goals. Nutrition templates are definitions only: never activate or alter phases/daily targets. New Exercises+Workout or new Foods+Diet form one proposal/confirmation/atomic transaction; references are real IDs or proposal-local keys; Diet fallback derives from validated Food.
- Recheck permissions and canonical relevant-catalog fingerprints inside final rw transaction. Changed source rejects with “数据已变化，请重新生成建议。” Human preview shows operation/type/name/count and expandable before/after, never raw JSON. observeManagerCatalog owns disposable liveQuery observation: clean visible managers refresh within the original workspace with query/scroll/navigation retained; hidden editors keep unsaved drafts and their manager refreshes on return. Guard deferred rendering against navigation races.
- Water Reference ConfigV1: fitlog-water-reference-v1 stores {referenceMl:number|null}, device-only and excluded from Backup/Restore/Sync. Absent/invalid config reads2500 without autowrite. Save integer1–100000 or explicit null. 修改参考值 is separate from 自定义记录; shared Sheet save/unset/cancel; current-page event and same-origin storage event refresh, unsubscribe on unmount. Show actual ml and optional 每日参考值; no ratio/percentage. Preserve independent WaterLogs/history/undo/edit/delete.
- Sleep has objective duration/clock means/recorded days and completed daily facts only. No achievement/judgment fields or fixed target. Recovery7/30/90 includes today and prior6/29/89 captured local days; missing is unknown. Data-derived safe chart ceilings and 44px point spacing/gutters;30/90-day charts and enlarged-font ranges own internal horizontal scroll when needed, all actual dates/values remain accessible through point selection. Preserve wall-clock/DST instants and legacy wake-date metadata and same-Sheet history contracts.
- Today Sleep/Water have no group heading and reuse today-card/today-activity-card, card-heading/today-activity-head, card-icon, h2, text-btn/chevron, body/copy/meta/action. Shared Today action rule owns44px/12px compact geometry; primary retains shared lime states. Existing tokens, dark, reduced motion and Safe Area remain authoritative.
- Required browser inventory retains all previous gates and adds catalogRecovery and dailyRecordsExperience. Preserve Dexie11/IDB110/20stores, Backup11/Restore1–11, Sync/envelope1, AIConfig1/VoiceConfig1. Exact assets and same persistent-profile data/config/offline guard remain release requirements. Physical Safari/original installed PWA/real provider evidence stays independent.


## Unified Daily Records Experience (2026-10-08)

Follow [Daily Records UX Contract](docs/DAILY_RECORDS_UX_CONTRACT.md). Today owns actual summaries/actions; Calendar owns nine fixed category slots; Day Detail owns complete saved facts; Recovery Trend owns labelled lines; Reports owns recorded-day statistics. Calendar/Detail/Day Report use the bounded shared date reader; Today/Trend share the same recovery day aggregation. Existing business services remain authoritative.

Calendar order is food/strength/cardio/pelvic/weight/dietEvent/habit/sleep/water. Display every actual category, absent slots empty, no +N, seven >=44px columns even at320, no per-cell kcal/progress. Read all42 visible dates including adjacent months. Day Sheet and Day Report share nine expandable summaries and complete snapshots, sets/optional load/legacy RPE/notes, actual historical check-ins, completed night-date sleep and individual water logs. Legacy RPE remains excluded from strength execution/editor/summary; complete saved day facts may disclose it.

Recovery uses one shared SVG line primitive, actual7/30/90 local dates, one selected full-date/value readout and selectable44px markers, missing dates split paths. Expand internal chart width before labels can overlap or clip; never horizontally scroll the page. Average sleep/circular clocks/recorded-day water averages belong to Reports Day/Week/Month. Missing is unknown, never fabricated zero; no health judgments or achievement metrics.

Water quick actions append independent rows; one compact top-layer shared Action Toast offers exact-ID guarded Undo without changing card flow or covering navigation/active inputs/main actions. Shared viewport coordinator supplies keyboard geometry. Reactive subscriptions preserve Sheet identity/date/open groups/scroll/focus and drafts; dispose them on exit and reject stale callbacks.

clearDayRecords stays the existing seven stores: FoodLogs/DietEvents/NutritionTargets/Workouts/CardioSessions/PelvicFloorSessions/Weights. The action and confirmation name this scope; Sleep/Water/Habit/Tasks remain untouched. Do not expand deletion implicitly.

Every future Daily Record type MUST audit Calendar, Detail, Trend and Reports together: bounded reads, date semantics, actual-record presence, complete details, live refresh, shared visual grammar and regression evidence. Preserve DB11/110/20, Backup11/Restore1–11, Sync/envelope1, AIConfig1/VoiceConfig1 and device-only WaterReference1. Retain every existing browser release gate and unit test when extending daily-record coverage.


## Training & Recovery unification (2026-10-09)

Follow [Training Completion & Record Management UX Contract](docs/TRAINING_RECOVERY_UX_CONTRACT.md). Kegel and Strength share Completion Layout/Status/Summary/Actions: saving/saved/error, retained actual result and stable identity, explicit Return; no automatic list jump. Manual Kegel never unlocks; natural unlock appears in the same completion. Cardio remains lightweight, guarded same-Sheet save/error/draft with local summary refresh.

Weight/Sleep/Water use shared content-sized History Sheet/Row/Meta/Actions/Empty and existing native Sheet lifecycle. Nearby history entries; no bottom Weight list after Recovery. Edit/delete exact IDs, confirm deletion, update original Sheet and facts in place; Back retains nodes/scroll/focus, X disposes subscriptions.

Sleep auto attribution uses local start00:00–05:59 previous night,06:00–23:59 start date. Manual correction chooses captured start date or previous night; real instants/ID/creation never change for attribution alone. New optional sleepNightDate/source/sleepStartLocalDate stays stable through timezone travel; legacy fallback uses current local timezone and explains unavailable original timezone. recordDate keeps wake metadata. Existing indexed bounded reads plus one resolver feed Today/Calendar/Detail/Trend/Reports/History. Today shows active and latest completed sleep even when the latest belongs to yesterday. Backup11/parser/Restore/Sync1 preserve optional fields without schema changes.

Single-night timelines display actual segments/gaps and sum actual duration, extend outside18:00→next12:00 using calendar arithmetic across DST. Never infer stages/REM/score/type. Recovery lines default latest valid point; pointer/touch/keyboard select full dates and exact values in a shared readout. Same-range refresh retains valid selection; range changes reset latest. Missing splits paths, single/empty remains factual. Remove all default point numeric labels and the entire 展开每日记录 list. Weight Chart.js follows the same readout/selection/keyboard/scroll contract. Long charts scroll internally.

Required release gates retain717 prior unit tests and26 prior browser suites, adding trainingRecoveryExperience and trainingRecoveryLifecycle;27 scene screenshots/contact sheet,4width×4font×2color×2motion pluslandscape and20 integrated actual UI cycles. Keep DB11/110/20,Backup11/Restore1–11,Sync/envelope1,AI/Voice1,WaterReference1. Physical Safari/original PWA/real-device continuity require separate evidence.
