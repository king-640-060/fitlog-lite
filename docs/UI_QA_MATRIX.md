# UI QA release matrix

Inventory established during initial inspection and maintained after fixes. B = verified browser gate for applicable representative states; V = deterministic validation/unit coverage; K = shared keyboard mock gate (physical keyboard pending); P = physical device pending; — = no distinct state or outside core landscape scope. B is not a claim that every Cartesian combination was exercised. Screenshot names and exact per-width state counts are in the JSON receipts. Production results are recorded in the release report.

Every screen reviews empty/normal/long/error-loading/keyboard, four widths320/375/390/430, landscape applicability, target/overflow/Safe Area/bottom obstruction. Unsupported states must be documented rather than reported PASS.

| Screen | Entry point | Empty | Normal | Long | Error/loading | Keyboard | 320 | 375 | 390 | 430 | Landscape | Target | Overflow | Safe Area | Bottom | iPhone |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Today | Bottom Today | B | B | B | — | — | B | B | B | B | B | B | B | B/P | B | P |
| Plan Today/Upcoming/Inbox/Completed | Plan tabs/completed | B | B | B | — | — | B | B | B | B | B | B | B | B/P | B | P |
| Task create/edit | Plan new/row | — | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Tag filter/manager/editor | Plan tags | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Food | Bottom Food | B | B | B | — | — | B | B | B | B | B | B | B | B/P | B | P |
| Food Library | Food Library | B | B | B | — | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Food Editor | Library new/row | — | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Food Picker/AddLog/EditLog | Meal add/record | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Nutrition Strategies Picker/Manager/Detail/Editor/Variant/Activation/Date | Food goal/Management Nutrition template | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Nutrition Target/Completion | Food goal/completion | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Diet Template Manager/Editor/Picker | Management/Food template | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Import Chooser/Preview | Library/Management import | B | B | B | B | — | B | B | B | B | — | B | B | B/P | B | P |
| Vision Choose/Review/Quantity/Duplicate/Preview/Done/Viewer | Packaging flow | B | B | B | B | K/P | B | B | B | B | B | B | B | B/P | B | P |
| Workout | Bottom Workout | B | B | B | — | — | B | B | B | B | B | B | B | B/P | B | P |
| Strength Start/Editor/History/Detail | Workout start/history | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P |
| Exercise Library/Editor/Picker | Management/strength | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Workout Template Manager/Editor/Picker | Management/strength start | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | T | P |
| Cardio Editor/History | Workout cardio | — | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | T | P |
| Kegel Setup/Timer/History | Workout pelvic | B | B | B | V | — | B | B | B | B | — | B | B | B/P | B | P |
| Progress Trend/Weight Editor | Progress trend/record | B | B | — | V | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Calendar/Day Detail/Reports | Progress tabs/date | B | B | B | — | — | B | B | B | B | — | B | B | B/P | B | P |
| Management/About | Topbar management | — | B | — | — | — | B | B | B | B | — | B | B | B/P | B | P |
| Habit Manager/Reorder/Editor | Management/Today habit | B | B | B | V | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| AI Assistant | Topbar AI | B | B | B | B | K/P | B | B | B | B | B | B | B | B/P | B | P |
| AI Settings Overview/Editor/Permissions/Privacy/Profiles | Management AI | B | B | B | B | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Backup/Restore/Preview/Confirm | Management Backup | — | B | — | B | — | B | B | B | B | — | B | B | B/P | B | P |
| GitHub Sync setup/status/password/conflict/restore | Management Sync | B | B | B | B | K/P | B | B | B | B | — | B | B | B/P | B | P | P |
| Shared Date Picker/Confirm/Toast | Date/destructive/save | B | B | — | B | — | B | B | B | B | — | B | B | B/P | B | P |

## Repeatable procedure

The semantic follow-up adds `tests/browser/uiSemanticConsistency.mjs` to the gates. Check duplicate equivalent create actions (including filtered-empty and completed-only Plan), progress value-to-indicator association (Today/Food unset/zero/below/reached/above), settings row vs section-note semantics, and repeated card action geometry (empty/completed/open strength, one/multiple/recent cardio, empty/completed Kegel). Dedicated Workout main actions share the existing primary lime class: compare default/hover/active/focus-visible/disabled computed styles on a fine-pointer context, retaining full-width48px geometry. Capture all four widths and120/140% font smoke, Management close/reopen after arbitrary background/body scrolling. Browser evidence remains separate from physical iPhone.

1. Isolated synthetic records, mock credentials/provider; never real business records/Keys/Tokens. Long Chinese/English names/model/repo/errors and large numbers.
2. Each Sheet open/top/bottom/close/reopen. Root and actual offending child overflow, header/close separation, >=44px controls/labels, >=16px editable text. Horizontal allowlist only Date Rail and chart canvas.
3. Applicable empty/populated/search-none/validation/loading/error/disabled states; keyboard blur/dismiss, nested confirmation and exact background restore.
4. Font100/120/140%; landscape812×375/844×390 core pages/Assistant/Vision review. Actual screenshots and manual inspection.
5. Typecheck/full tests/build/Pages build/diff, nine existing browser suites + uiQualityAudit locally; production390/430.
6. Exact production assets and same persistent synthetic14-store/15frozen-row/AI-config profile across deployment, SW/offline cold boot.
7. Separate physical Safari, original installed PWA, real Provider/SpeechRecognition status. Pending never means browser PASS.

## Display policy

Canonical storage/calculation retain precision. Automatic energy input/preview use integer kcal/kJ; macros/grams/weight/chart labels at most one decimal, duration at most one decimal (timer seconds integer), percent labels rounded. Never round each keystroke. Unit-only energy changes preserve exact canonical kcal.

## Inventory accounting and state evidence

28 grouped rows include the existing74 named screens/subviews plus7 strategy-specific screens/subviews (daily picker, manager, detail, editor, variant editor, activation, activation date subview): Today; Plan Today/Upcoming/Inbox/Completed; Task create/edit; Tag filter/manager/editor; Food; Library; Food create/edit; Food picker/add log/edit log; Nutrition target/completion; Diet template manager/editor/picker; Import choose/preview; Vision choose/review/quantity/duplicate/preview/done/viewer; Workout; Strength start/editor/history/detail; Exercise library/editor/picker; Workout template manager/editor/picker; Cardio editor/history; Kegel setup/timer/history; Progress trend/weight editor; Calendar/day detail/reports; Management/About; Habit manager/reorder/editor; AI Assistant; AI overview/editor/permissions/privacy/profiles; Backup/restore preview/confirmation; Sync setup/status/password/conflict/restore; Shared date picker/confirmation/toast.

The new uiQualityAudit gate records141 states per local width (564 captures, including search placeholder/typed/cleared/ordinary-field at100/120/140% fonts and10 landscape states per width); production131 per width (262 captures). Other suites add functional states; they are not counted twice in this total. The committed harness fails on offending child bounds, undersized targets, clipped buttons, missing icon names, editable fonts, malformed native toggle geometry, noisy numbers and Sheet header/body overlap. A Date Rail and chart canvas are the only intentional horizontal regions. Habit weekday44px overlays are an intentional native-control exception.

| Gate | Actual scope |
|---|---|
| uiSemanticConsistency |40states per width: Plan empty/populated Today/Upcoming/Inbox, filtered-empty/completed-only, single unfocusable hidden create; Today/Food shared SVG/value/ARIA/unset/zero/below/reached/above; Today-only unset contrast .85 vs Food .65, active accent-mid/3–7 dashes and shared6px open stroke; dedicated Workout three primary lime full-width48px actions with matching shared styling and width/height/radius/padding across empty/completed/open and one/multiple/recent cardio/Kegel states, Today actions remain compact; Management paragraph membership/close/reopen scrollTop0;120/140% core fonts including Start strength. Receipts /tmp/semantic-{local\|prod}-receipt.json; isolated synthetic contexts only. |
| uiQualityAudit | Main empty/populated/bottom; task/tag/editor; libraries search-none; search icon/text gap>=8px at100/120/140%, typed/cleared states and unchanged ordinary-field padding; long Chinese/English/model/repository; 26-food picker top/bottom/reopen; numeric unit-only and untouched exact save; all seven Vision steps/viewer/parser error/manual high retry; AI permission/routing controls; nested Restore confirmation; fonts120/140; local landscape |
| mobileLayout | Five tabs/Safe Area mock/bottom reserve; food CSV/JSON imports; three macro columns; form/editor/management widths; font120 |
| interactionStabilization | Modality/focus trap/return; shared mocked VisualViewport keyboard and toolbar distinction; scroll/lock/restoration; rapid open/close; settings/models/errors; reduced motion; landscape |
| sharedDatePicker | Full app date entry replacement; range/leap date/return-to-form; Calendar selected date |
| aiStreaming / aiAssistant | Busy/Stop/partial/fallback/tool proposal/error; long conversation; bounded contextual reads and explicit writes |
| aiVoice / aiDualModelRouting | Mock voice lifecycle/permission/disclosure/quick launch; model routing/legacy fallback/capability invalidation; stale-name A/B/C route labels, actual editor saves/reopen/restart, probe-label separation and Vision-only editor context |
| foodVision | Extraction/evidence/unknown macros/kJ canonical; Stop/close/duplicate/save snapshot; denied writes/image memory |
| githubSyncSafety | Synthetic encrypted setup/unlock/remote/local/conflict/restore; errors/disabled; no unintended writes |

Loading/error screenshot coverage is explicitly concentrated in AI/Vision/Sync/import. Local synchronous forms do not have provider loading states; validation is covered by service tests. K refers to representative forms sharing the Sheet controller, not a physical keyboard test for every field. Landscape is core smoke only; other screens remain portrait-oriented. Safe Area uses47px top /34px bottom emulation; physical safe-area values remain Pending.

## Run gate

Use installed Playwright via FITLOG_PLAYWRIGHT_MODULE and Chrome via FITLOG_CHROME. Build Pages with GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build, serve dist under /fitlog-lite/, set FITLOG_QA_URL, then run node tests/browser/uiQualityAudit.mjs and each of the nine gates listed above. Production URL automatically selects390/430; local selects320/375/390/430. No real provider key/token or user DB is allowed.

Receipts: /tmp/ui-quality-local-receipt.json and /tmp/ui-quality-prod-receipt.json. Screenshots: /tmp/ui-quality-{local|prod}-{width}-{state}.png. Copy final receipts/logs and selected manually inspected images into the external release artifact folder; do not commit screenshot binaries.

## Required physical check (Pending)

Use existing Safari and the original installed PWA without clearing/reinstalling: Today/Plan/Food/Workout/Progress top and bottom; Library/edit/1584kJ round trip; Vision camera/gallery/review checkbox/top reset/viewer return; Habit/AI routing controls; long Sheet keyboard open/close; native scroll and background restoration; real Provider fast/high accuracy and latency; Voice permission/Stop/close; offline cold boot with existing records and stored AI configuration. Record each result separately from browser PASS.

## PWA identity and upgrade gate

`pwaUpgrade.mjs` serves real old and new generated bundles/SWs under one `/fitlog-lite/` origin, observes waiting without reload while a selected Vision image exists, closes legacy clients for bootstrap, verifies App/controller Git markers, all fourteen frozen business stores/fifteen rows and synthetic AI config/key, and creates a new page offline. Optional FITLOG_PWA_PROMPT_DIST tests a prior prompt build against a distinct Git build: retained AI draft blocks switching, another client blocks activation, cancel retains the client and explicit confirmation reloads once. UI quality includes the diagnostics Sheet at each mobile width. Physical Safari/installed PWA remain separate Pending categories; see PWA_RUNTIME.md.

## Open calorie gauge and shared macro tiles

`tests/browser/nutritionGauge.mjs` checks Today/Food at320/375/390/430px locally and390/430px production, fonts100/120/140%. Cases cover unset,0/1/65/99/100%, excess, capped excess, zero goals and partial macro targets. Compare identical SVG/tile markup and styles, actual arc length/fraction, zero active opacity, above coral arc/exact text, unset contrast, centered numeric/unit bounds inside the arc, no donut/no overflow/clipping/replay. Capture actual cards and inspect screenshots. Numerical/target calculation and historical data gates remain unchanged. Physical iPhone Safari/original PWA are Pending until tested separately.

## Nutrition strategy dedicated release gate

`tests/browser/nutritionTemplates.mjs` adds the dedicated day-picker/manager/detail/editor/variant/activation suite at local320/375/390/430 and production390/430, fonts100/120/140. It exercises empty, one/four/eight variants, long Chinese names, active/inactive, persisted high/low selection, identical-number manual goals without guessed selection, actual UI create/copy/reorder/activation, historical saved values/names and archived history retention, shared start-date selection, keyboard-open variant editing, bottom Save reachability and0/1/many real WeightLogs. Inspect390/100,320/140 and430/100 screenshots for hierarchy/card alignment/text/CTA/Sheet density. Bounds/targets/keyboard/Safe Area mocks are browser evidence; physical Safari/original PWA remain Pending. Existing quality/semantic/gauge and all browser release gates remain required.


## Six requirement round: nutrition strategy / servings / meal clear / Calendar / Cardio / Today

Automated matrix:320/375/390/430px ×100/120/140%. Production browser matrix:390/430px ×100/120/140%. `nutritionTemplates.mjs` preserves the existing complete strategy coverage; `foodServing.mjs` adds absent/present serving, default grams,0.5/1.5/2.25 servings, exact mode conversion, long Food names, library/editor, shared mocked keyboard, snapshot immutability after serving edits; single/multiple meals, cancel, precise historical/unclassified deletion and retained expansion; four Calendar category combinations/single glyph/shared marker geometry/ARIA; treadmill/stair history/form and duration; seven Today training states, header navigation and coupled primary continuation. All existing release suites remain gates.

Actual screenshot review must cover390/100,320/140,430/100 for strategy long/selected/editor/bottom CTA, serving conversion and keyboard, quiet meal deletion/confirmation, Calendar glyphs, natural Cardio separators and Today normal/open-workout density. Physical Safari/installed PWA remain separate manual evidence.

Preservation: stable fitlog-lite-db, one explicitV8→V9 upgrade,17stores/unchanged indexes, optional serving mass without inference/history rewrite. FrozenV8 fixtures remain unchanged; new frozenV9 fixtures preserve strategy/provenance and serving precision. BackupV9 / RestoreV1–V9 / encrypted envelopeV1; validation-before-write and all-store rollback remain release blockers.

## Today Training action follow-up

Only Today Training changes: 训练 title, header 查看训练 navigation, body secondary 记录训练 paired with status through today-activity primitives, replaced by primary 继续力量训练 for an open workout. Existing foodServing suite covers empty/Cardio/completed/combined/open plus enlarged5-exercise16-set and120-minute metrics, stale history, local-day creation navigation, zero writes on navigation/record/continuation and return-to-Today refresh. Local320/375/390/430 ×100/120/140%; production390/430; inspect390/100,320/140,430/100 screenshots for all five core states. DB/Backup/Restore/Sync and all non-Today functionality unchanged; physical Safari/original installed PWA remain Pending.


## Video Search / DietEvent release gates

Keep all14 existing browser suites; add `videoSearch.mjs` and `dietEvents.mjs` (16 total). Local320/375/390/430 and production390/430, fonts100/120/140. Video covers no config/independent consent/save+test,1/3 long Chinese/English results, thumbnail failure, fixed derived links, no iframe before click, one playing/switching, close/Clear/reopen/no re-search and provider error. Official player/search are mocked; real YouTube remains a separate Not performed category. Inspect actual320/140,390/100,430/100 screenshots.

Diet covers empty/mark-only/manual/long-note/multiple/day/historical selected dates, real local edit/delete, quiet day+meal coexistence, independent photo disclosure,2 Canvas JPEG images/gallery vs camera, Vision route/image payload/review/use/draft/explicit Save, day-photo disabled, mocked keyboard/Safe Area, canonical totals/17 old stores unchanged, ordinary/meal/day/crowded6-category Calendar+detail and delete marker removal. Preserve frozenV9 fixtures, add frozenV10. Verify stable100/18 migration, all prior indexes/rows, reopen/populate, BackupV10/RestoreV1–V10 and all-store rollback/Sync envelopeV1/hash.

Physical iPhone Safari, original installed PWA, YouTube in-app playback and meal-photo camera/gallery are four independent Pending categories until real device evidence exists. Mock browser/provider PASS never proves them.
