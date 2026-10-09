# Integrated UX Contract — Unified Daily Records

Established before implementation on the current main baseline (2026-10-08).

| Surface | Responsibility | Shared facts / presentation |
| --- | --- | --- |
| Today | Today's actual summary, frequent actions, quiet success/undo | Existing Today activity cards; feedback floats outside card flow |
| Calendar | Date selection and actual category presence | All nine fixed slots in a 3×3 matrix; seven columns; no +N or cramped kcal/progress |
| Day Detail | Complete selected-day facts | Nine ordered grouped disclosures, complete saved-record details, missing explicitly unknown |
| Recovery Trend | Time variation | Shared selectable SVG line primitive for Sleep/Water, real7/30/90 local days, gaps stay gaps |
| Reports | Daily facts and period statistics | Existing Reports gains Day alongside Week/Month; averages only over recorded days |

## Initial audit

Partially implemented: Today sleep/water and real7/30/90 ranges, six Calendar categories/five base detail rows, existing Week/Month reports. Missing: nine fixed markers/full disclosures/shared day reader/day report/period recovery statistics/labelled lines. Regression in experience: water undo enters card flow and changes height. Existing services, database and snapshots are authoritative.

## Data contract

- One bounded date-fact reader uses existing date/startTime indexes and the shared night resolver and a consistent read transaction. Calendar reads all42 displayed local dates; detail/day report one date; recovery only selected7/30/90; reports selected natural period excluding future dates.
- Fixed order: food, strength, cardio, pelvic, weight, dietEvent, habit, sleep, water.
- FoodLogs/Workout saved snapshots are never recomputed from current libraries. Missing macros/load stay unknown. Special-diet estimates remain separate from actual intake.
- Only actual HabitCheckIns establish recorded habits; inactive historical definitions remain readable. Sleep groups by resolveSleepBusinessDate; recordDate retains its legacy wake-date meaning; active sessions do not establish a completed marker. Water uses WaterLog.date and sums every actual entry.
- Shared recovery day facts and recorded-day averages drive Today, Calendar, Detail, Trend and Reports. Missing is not zero; no interpolation, target, achievement or health judgment.

## Interaction / visual contract

- Existing surface/quiet border/radius/typography/icon/segmented/button/motion/Sheet/Safe Area own all surfaces. No new framework/dependency or independent Recovery palette.
- Compact action toast replaces the old toast, stays outside card flow, >=44px Undo targets, clears its resources. New successful records replace old feedback; undo captures exactly that successful ID, guarded against repeated clicks. Keyboard-open feedback uses the existing Sheet viewport geometry/top layer, never a private viewport listener or card insertion.
- Seven Calendar columns retain >=44px date targets at320 through the existing small-screen margin bleed, not smaller buttons. Cells grow with text. All nine semantic icons have stable slots; absent positions stay empty. Full numeric facts live in the detail, not Calendar cells.
- Nine disclosures share one Daily Records grammar and complete escaped content. Updates preserve the same Sheet/date/open categories/scroll/focus; no draft replacement. Subscriptions dispose on route/Sheet close and stale callbacks cannot update removed hosts.
- Both line charts share deterministic geometry and a precise selected-date/value readout. Actual markers have44px hit areas and keyboard selection; default numeric labels are omitted. Generous spacing/gutters expand only the chart's internal scroll width. Missing dates split paths. No redundant daily expansion list, root clipping, animation replay or body horizontal scrolling.
- Period statistics belong in Reports. Week remains intact. Day reuses day-detail facts and disclosure renderer; Month adds objective Sleep/Water statistics and recorded-day coverage.
- Existing clearDayRecords boundary remains seven stores: FoodLogs, DietEvents, NutritionTargets, Workouts, CardioSessions, PelvicFloorSessions, Weights. Accurate action/confirmation names this scope and explicitly preserves Sleep/Water/Habit/Tasks.
- Any future Daily Record type must audit Calendar, Detail, Trend and Reports together, including data ranges, live refresh, missing semantics, shared visual grammar and release tests.

## Gates

Keep all25 existing browser suites and all705 unit tests; update obsolete visual expectations to assert the stronger new requirements. Add complete nine-category/details/line/reports/toast regression coverage, full mobile/font/color/motion matrix and20-cycle integration stress. Inspect actual cross-surface screenshots before release. Preserve Dexie11/IDB110/20, Backup11/Restore1–11, Sync/envelope1, AIConfig1/VoiceConfig1 and device-only WaterReference1. Formal application deployment → production gates/exact assets/same-profile preservation/offline → report-only END deployment → final identity/data/offline. Physical Safari/original installed PWA evidence remains separate.


## Training & Recovery unification (2026-10-09)

Follow [Training Completion & Record Management UX Contract](TRAINING_RECOVERY_UX_CONTRACT.md). Kegel and Strength share Completion Layout/Status/Summary/Actions: saving/saved/error, retained actual result and stable identity, explicit Return; no automatic list jump. Manual Kegel never unlocks; natural unlock appears in the same completion. Cardio remains lightweight, guarded same-Sheet save/error/draft with local summary refresh.

Weight/Sleep/Water use shared content-sized History Sheet/Row/Meta/Actions/Empty and existing native Sheet lifecycle. Nearby history entries; no bottom Weight list after Recovery. Edit/delete exact IDs, confirm deletion, update original Sheet and facts in place; Back retains nodes/scroll/focus, X disposes subscriptions.

Sleep auto attribution uses local start00:00–05:59 previous night,06:00–23:59 start date. Manual correction chooses captured start date or previous night; real instants/ID/creation never change for attribution alone. New optional sleepNightDate/source/sleepStartLocalDate stays stable through timezone travel; legacy fallback uses current local timezone and explains unavailable original timezone. recordDate keeps wake metadata. Existing indexed bounded reads plus one resolver feed Today/Calendar/Detail/Trend/Reports/History. Today shows active and latest completed sleep even when the latest belongs to yesterday. Backup11/parser/Restore/Sync1 preserve optional fields without schema changes.

Single-night timelines display actual segments/gaps and sum actual duration, extend outside18:00→next12:00 using calendar arithmetic across DST. Never infer stages/REM/score/type. Recovery lines default latest valid point; pointer/touch/keyboard select full dates and exact values in a shared readout. Same-range refresh retains valid selection; range changes reset latest. Missing splits paths, single/empty remains factual. Remove all default point numeric labels and the entire 展开每日记录 list. Weight Chart.js follows the same readout/selection/keyboard/scroll contract. Long charts scroll internally.

Required release gates retain717 prior unit tests and26 prior browser suites, adding trainingRecoveryExperience and trainingRecoveryLifecycle;27 scene screenshots/contact sheet,4width×4font×2color×2motion pluslandscape and20 integrated actual UI cycles. Keep DB11/110/20,Backup11/Restore1–11,Sync/envelope1,AI/Voice1,WaterReference1. Physical Safari/original PWA/real-device continuity require separate evidence.
