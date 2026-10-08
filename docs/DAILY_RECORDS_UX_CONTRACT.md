# Integrated UX Contract — Unified Daily Records

Established before implementation on the current main baseline (2026-10-08).

| Surface | Responsibility | Shared facts / presentation |
| --- | --- | --- |
| Today | Today's actual summary, frequent actions, quiet success/undo | Existing Today activity cards; feedback floats outside card flow |
| Calendar | Date selection and actual category presence | All nine fixed slots in a 3×3 matrix; seven columns; no +N or cramped kcal/progress |
| Day Detail | Complete selected-day facts | Nine ordered grouped disclosures, complete saved-record details, missing explicitly unknown |
| Recovery Trend | Time variation | Shared labelled SVG line primitive for Sleep/Water, real7/30/90 local days, gaps stay gaps |
| Reports | Daily facts and period statistics | Existing Reports gains Day alongside Week/Month; averages only over recorded days |

## Initial audit

Partially implemented: Today sleep/water and real7/30/90 ranges, six Calendar categories/five base detail rows, existing Week/Month reports. Missing: nine fixed markers/full disclosures/shared day reader/day report/period recovery statistics/labelled lines. Regression in experience: water undo enters card flow and changes height. Existing services, database and snapshots are authoritative.

## Data contract

- One bounded date-fact reader uses existing date/recordDate indexes and a consistent read transaction. Calendar reads all42 displayed local dates; detail/day report one date; recovery only selected7/30/90; reports selected natural period excluding future dates.
- Fixed order: food, strength, cardio, pelvic, weight, dietEvent, habit, sleep, water.
- FoodLogs/Workout saved snapshots are never recomputed from current libraries. Missing macros/load stay unknown. Special-diet estimates remain separate from actual intake.
- Only actual HabitCheckIns establish recorded habits; inactive historical definitions remain readable. Sleep completes on its saved wake recordDate; active sessions do not establish a completed marker. Water uses WaterLog.date and sums every actual entry.
- Shared recovery day facts and recorded-day averages drive Today, Calendar, Detail, Trend and Reports. Missing is not zero; no interpolation, target, achievement or health judgment.

## Interaction / visual contract

- Existing surface/quiet border/radius/typography/icon/segmented/button/motion/Sheet/Safe Area own all surfaces. No new framework/dependency or independent Recovery palette.
- Compact action toast replaces the old toast, stays outside card flow, >=44px Undo targets, clears its resources. New successful records replace old feedback; undo captures exactly that successful ID, guarded against repeated clicks. Keyboard-open feedback uses the existing Sheet viewport geometry/top layer, never a private viewport listener or card insertion.
- Seven Calendar columns retain >=44px date targets at320 through the existing small-screen margin bleed, not smaller buttons. Cells grow with text. All nine semantic icons have stable slots; absent positions stay empty. Full numeric facts live in the detail, not Calendar cells.
- Nine disclosures share one Daily Records grammar and complete escaped content. Updates preserve the same Sheet/date/open categories/scroll/focus; no draft replacement. Subscriptions dispose on route/Sheet close and stale callbacks cannot update removed hosts.
- Both line charts share deterministic geometry. Every actual marker has a visible value label; generous spacing/gutters expand the chart's internal scroll width for large/close values and enlarged text. Missing dates split paths. No root clipping, hidden labels, animation replay or body horizontal scrolling.
- Period statistics belong in Reports. Week remains intact. Day reuses day-detail facts and disclosure renderer; Month adds objective Sleep/Water statistics and recorded-day coverage.
- Existing clearDayRecords boundary remains seven stores: FoodLogs, DietEvents, NutritionTargets, Workouts, CardioSessions, PelvicFloorSessions, Weights. Accurate action/confirmation names this scope and explicitly preserves Sleep/Water/Habit/Tasks.
- Any future Daily Record type must audit Calendar, Detail, Trend and Reports together, including data ranges, live refresh, missing semantics, shared visual grammar and release tests.

## Gates

Keep all25 existing browser suites and all705 unit tests; update obsolete visual expectations to assert the stronger new requirements. Add complete nine-category/details/line/reports/toast regression coverage, full mobile/font/color/motion matrix and20-cycle integration stress. Inspect actual cross-surface screenshots before release. Preserve Dexie11/IDB110/20, Backup11/Restore1–11, Sync/envelope1, AIConfig1/VoiceConfig1 and device-only WaterReference1. Formal application deployment → production gates/exact assets/same-profile preservation/offline → report-only END deployment → final identity/data/offline. Physical Safari/original installed PWA evidence remains separate.
