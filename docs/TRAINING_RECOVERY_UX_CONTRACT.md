# Training Completion & Record Management UX Contract

Established before UI implementation on2026-10-09. Baseline99d6187; current audit: training persistence/timers and nine-domain facts exist; explicit completion states, shared compact history, interactive recovery selection and sleep-night semantics are missing/partial.

| Surface | Responsibility |
| --- | --- |
| Training execution | Existing absolute-time Kegel engine or record-based Strength editor |
| Saving | Explicit saving/saved/error, retained immutable result/draft and stable write identity |
| Completion | Actual successfully persisted metrics; natural/manual distinguished; no automatic exit |
| Return | User explicitly returns to Training or opens this saved Strength record |
| Trend | Selectable precise date/value, latest valid default, missing gaps and internal scroll |
| History | Nearby entry; shared content-sized Sheet/list/actions/empty state; edit/delete in place |
| Day Detail | Complete actual facts for the selected business date, including real sleep intervals |
| Reports | Shared day facts and recorded-day objective period statistics |

## Boundaries

- Kegel captures one Session ID/result before save; retries reuse it, automatic/manual reentry is guarded. Stop RAF/sound/Wake Lock after capture. Saved state waits for explicit Return; manual completion never advances progression. Unlock notice belongs inside this same result.
- Strength flushes autosave before finish, retains actual saved Workout and explicit completion/record view. No score, inferred load or duration engine. Cardio remains a lightweight same-Sheet save, busy/error/draft/focus guarded, no full completion screen.
- Weight/Sleep/Water share History Sheet, Row, Meta, Actions and Empty State. Content-sized for short lists, bounded internal scroll for long lists. Editors/date pickers remain in the same existing Sheet with Back/X and restored parent scroll/focus. Nearby history entries; no Weight list after Recovery.
- Sleep recordDate retains legacy captured wake-date meaning. Optional sleepNightDate/source/local-start-date capture stable business attribution; no startup migration or rewriting old instants/IDs/createdAt. One resolver defaults local00:00–05:59 to previous date,06:00–23:59 to start date, without inferring sleep type. Explicit manual correction chooses previous evening or captured start date; this bounded range supports exact indexed reads without new schema/index. Manual overrides survive end-time edits; start-time correction re-infers auto dates and validates manual range visibly.
- New saved attribution is stable across device timezone travel. Legacy records infer from real start instant in current local timezone; original historical timezone cannot be recovered without evidence. Backup11/Restore/Sync1 preserve optional fields and validate them. Existing records without fields remain byte-for-byte intact until explicitly edited.
- Shared startTime-index window extends requested date range safely before resolving/grouping; Calendar42, Detail one day, Trend7/30/90 and Reports selected period never scan all sleep history. Active sleep remains independent. Today shows active and latest completed sleep even when the latter belongs to yesterday.
- Day Detail/Sleep History share a true interval timeline: real start/end segments, gaps preserved, sum saved durations; expand range for exceptional hours. No stages/REM/quality inference.
- Recovery lines share touch/keyboard selection and quiet selected-date/value readout with Weight's existing Chart.js contract. Default latest valid; range resets selection; same-range updates preserve valid selection.44px hit slots, no scroll hijack, no page rerender per click. Use the same162px scalable frame, actual calendar spacing and selected readout for all densities, omit numeric point labels and remove redundant daily list; all actual points remain precisely queryable. Missing is unknown, never zero.
- All changes share existing tokens/icons/motion/Sheet/viewport/Toast and preserve user scaling,Safe Area,dark/reduced. No new dependencies, palette or private modal framework.
- Every new record dimension audits Today/Calendar/Detail/Trend/Reports/History together. Preserve Dexie11/110/20,Backup11/Restore1–11,Sync/envelope1,AI/Voice1,device-only WaterReference1 and permanently retired Video.

## Acceptance

All717 unit tests and26 browser suites retained with stronger replacements for obsolete product expectations. Add actual training saved/manual/error/retry/no-duplicate/unlock, history0/1/many/edit/delete, resolver timezone/DST/legacy/roundtrip, interval proportions and chart pointer/keyboard/live-selection tests. Mobile4widths×4fonts×2colors×2motions pluslandscape;27 actual scene screenshots/contact sheet and20 full integrated cycles. Application deployment → production targeted/exact assets/same-profile hashes/offline → report-only END → final identity/data/offline. Physical Safari/original installed PWA/real-device continuity remain independent Pending absent physical evidence.


## Current unified module extension

The [Unified Module Visual Hierarchy Contract](UNIFIED_MODULE_VISUAL_HIERARCHY_CONTRACT.md) governs the current peer structure and shared sizes. Weight/Sleep/Water each default30 and independently support7/30/90, near-coordinate selection, nearby History and direct recording. Weight all-history remains in History, with a unique owned Chart.js canvas. Point inspection never sets ordinary write dates. Saved-fact refresh, midnight refresh and cleanup are owned per domain. Sleep backfill validates a completed actual session without touching active sleep. Strength/Cardio/Kegel share peer headers and nearby History while preserving all existing execution/completion semantics. Required previous746 units/28 browser gates,65 display contexts,38 scene review and20 integrated cycles remain mandatory.


## Professional Fitness Analytics & Visual Experience V3.1 (2026-10-09)

Follow [Professional Fitness Report Contract](PROFESSIONAL_FITNESS_REPORT_CONTRACT.md). Coach Reports use the supplied V3 HTML anatomy plus the user's explicit V3.1 rules; the exact V3.1 source was not supplied. Pure exercisePerformanceAnalysis/trainingVolumeAnalysis/coachReportAnalysis own qualified completed sessions, ID-first cautious legacy matching, cross-period same-condition baselines, all-prior-history records, unknown load/partial nutrition and actual weekly Habit targets. loadCoachReport uses one readonly transaction/history query; UI focuses consume the same facts, with disposable plots/observation and no DB writes. Day retains all nine complete saved domains/sets; Week/Month add action comparisons, actual-date trends, weekly frequency/volume, recorded-day nutrition/weight/recovery and goal-aware habits. No muscle/fat/1RM/TDEE inference.

Weight remains Chart.js; Weight/Sleep/Water share trendGeometry, fixed sibling Y labels/three grids, scalable10.125rem(162px) plot, real date intervals, selected readout/highlight/locator and native internal scroll across7/30/90. No sparse height or numeric-label variant. Retain all-history, keyboard and native cancel/scroll behavior. Training peers use two actual summary tiles, nearby History and unchanged shared primary execution/editor/timer flows. Measure nav row/reserve/Safe Area/last-content reachability; do not guess a geometry fix. Keep all29 prior browser suites/760 prior units, new coach analytics/experience,65 display contexts, actual coordinate taps,20 readonly cycles and20-store/config hashes. WebKit is additional browser evidence, not a physical iPhone/PWA verification. Data versions/fixtures/retired Video stay unchanged.
