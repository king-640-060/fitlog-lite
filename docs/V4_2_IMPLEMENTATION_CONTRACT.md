# FitLog Lite V4.2 Implementation Contract

## Approved inputs and baseline

- START_BASELINE: `953a61d25b305939f35ddbaa6ca618d35adf55fa`; remote main fetched and pulled fast-forward on 2026-10-10, clean.
- Supplied ZIP SHA256: `7e9b64b701fc38d89d4ee08849bcdd3e238e86f6ffcdc9eb2ec9a10c52174dde`.
- Actual V4.2 HTML SHA256: `aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687`; archive and standalone instructions identical.
- Prototype completely read and operated in an isolated browser: Today, Plan, Food, compact meal disclosure, two consecutive saves, smart/designated previews, missing goals/partial/over, dark and report details. Reference originals and receipt: external artifacts/v4-2-2026-10-10/reference.
- HTML owns approved product anatomy. Markdown owns real behavior and safety. Existing services and saved snapshots remain authoritative; demo records/optimizer never enter production.

## Targeted differences

| Surface | Baseline | V4.2 change |
| --- | --- | --- |
| Today/Food nutrition | Shared snapshots and macro primitive implemented; calorie arc and neutral macro layout partial | Shared horizontal budget with independent goal states; three semantic compact macro cards, retained same-day g/kg and explicit incomplete values |
| Meals | Four groups and full records implemented; whole header toggles; save exits | Informational header, sole right disclosure, small always-visible + record; one captured-date/meal session with guarded consecutive saves |
| Completion | Real bounded deterministic optimizer and atomic recording implemented | Smart plus strict selected-ID candidates, preserved selection, residuals and stale-source transactional recheck |
| Remaining | Inline wrapping text/large primary partial | Shared four independent items in two columns and quiet two-mode actions |
| Today actions | Strength action nested differently | Shared right aligned activity action boundary, existing flows preserved |
| Plan | Real groups/tags/status implemented | Quiet progress and stronger existing task hierarchy; same services/date meaning |
| Report nutrition | Correct statistical facts; uneven content tracks | Four equal cards and aligned bars; full per-field evidence retained in details |
| Theme | Previous Fresh Green implemented | Warm ivory/olive/mist blue/amber/terracotta shared tokens, readable dark variants |

## Implementation ownership

- main.ts: existing page bindings, compact meals, captured recording session, completion selection.
- ui calorie budget / macroNutritionSummary / remaining goals: shared pure HTML; same readDailyNutritionSummary facts.
- nutritionCompletion: extend bounded candidate restriction, retain objective/tolerance/search limits.
- nutritionCompletionService: validate source/allowed IDs atomically before existing logFood calls.
- coachReport.ts/CSS: nutrition presentation only; all V3.1 analytics unchanged.
- shared CSS tokens and domain layout: no private viewport/keyboard/focus/motion engine.

## Safety and compatibility

No schema migration, new business store, snapshot recomputation, seed, settings reset or DB clearing. Preserve Dexie11/IDB110/20 stores, Backup11/Restore1–11, Sync/envelope1 and AI/Voice/WaterReference1. Future completion is preview only. Unknown nutrition is unknown, not zero. g/kg requires latest valid same-date weight and complete dimension. Manual gram/serving precision remains unchanged. Closed sessions cannot repaint; pending saves commit at most once and retain captured date/meal.

## Verification and release

Retain all existing unit/browser regression gates and frozen fixtures; add focused V4.2 units/browser flows and geometry assertions. Verify four mobile widths, fonts, both themes, landscape, keyboard/Sheet/Safe Area. Inspect actual originals. Capture existing synthetic production profile before deployment without reseeding; compare all stores/config and offline boot after APP and END. Typecheck, all units, Pages build, affected/full browser inventory, Actions, exact production assets required. Physical iPhone Safari/original PWA evidence remains Pending unless separately supplied.

Release: application commit → CI/Pages → production checks/preservation → LATEST-only END → final CI/identity/assets/data/offline. Record failures honestly; no skipped/weakened gates.

## Approved anatomy and accessibility differences

- Production reuses real global navigation, dates, target editing and all existing modules rather than copying demo labels, records, scores or optimizers. Food/Today use the same snapshot and shared budget/macros/remaining primitives.
- Primary olive uses #52723b with the existing white action text, darker than the demo's #6e8b43 to retain readable contrast. Secondary text uses #697369; the demo's lighter gray did not pass the retained 4.5:1 text gate. Semantic dots/tracks keep the approved mist-blue/amber/terracotta direction.
- Touch areas remain at least44px. Readable g/kg stays12px at100%, rather than the prototype's9px small-phone rule. At extreme fonts or long values all three macro cards stack together; no two-plus-orphan layout.
- Compact meal previews intentionally use ellipsis. The sole right Chevron opens every saved food, including full names, exact amounts and known/unknown nutrient details; edit/delete/clear remain reachable. Ellipsis never applies to actual intake, goal, g/kg or key actions.
- Report details retain all four dimensions' complete/partial/matched dates and paired totals; card tracks share geometry regardless of missing values. Existing analytical services are unchanged.

Continuous interactions exposed a shared Toast hit-test race: focus/scroll repositioned save feedback over a checkbox between pointerdown/up, causing native Sheet backdrop close. Informational Toasts now pass pointer events through, only their real action remains interactive, and placement includes checkbox/radio targets. Existing Undo/lifecycle gates and the full V4.2 matrix verify the correction.
