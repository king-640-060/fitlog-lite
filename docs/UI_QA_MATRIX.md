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
| uiSemanticConsistency |Per-width captures (exact counts in receipts): Plan empty/populated Today/Upcoming/Inbox, filtered-empty/completed-only, single unfocusable hidden create; primary lime empty Add computed styles with existing compact geometry across all three views and font scales, Today Plan secondary unchanged; Today/Food shared SVG/value/ARIA/unset/zero/below/reached/above; Today-only unset contrast .85 vs Food .65, active accent-mid/3–7 dashes and shared6px open stroke; dedicated Workout three primary lime full-width48px actions with matching shared styling and width/height/radius/padding across empty/completed/open and one/multiple/recent cardio/Kegel states, Today actions remain compact; Management paragraph membership/close/reopen scrollTop0;120/140% core fonts including Start strength. Receipts /tmp/semantic-{local\|prod}-receipt.json; isolated synthetic contexts only. |
| uiQualityAudit | Main empty/populated/bottom; task/tag/editor; libraries search-none; search icon/text gap>=8px at100/120/140%, typed/cleared states and unchanged ordinary-field padding; long Chinese/English/model/repository; 26-food picker top/bottom/reopen; numeric unit-only and untouched exact save; all seven Vision steps/viewer/parser error/manual high retry; AI permission/routing controls; nested Restore confirmation; fonts120/140; local landscape |
| mobileLayout | Five tabs/Safe Area mock/bottom reserve; food CSV/JSON imports; three macro columns; form/editor/management widths; font120 |
| interactionStabilization | Modality/focus trap/return; shared mocked VisualViewport keyboard and toolbar distinction; scroll/lock/restoration; rapid open/close; settings/models/errors; reduced motion; landscape |
| sharedDatePicker | Full app date entry replacement; range/leap date/return-to-form; Calendar selected date |
| aiStreaming / aiAssistant | Busy/Stop/partial/fallback/tool proposal/error; long conversation; bounded contextual reads and explicit writes |
| aiVoice / aiDualModelRouting | Explicit compatibility voice lifecycle/permission/no-app-ack/quick launch; model routing/legacy fallback/capability invalidation; stale-name A/B/C route labels, actual editor saves/reopen/restart, probe-label separation and Vision-only editor context |
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

## Open calorie gauge and shared macro summary

`tests/browser/nutritionGauge.mjs` checks Today/Food at320/375/390/430px locally and390/430px production, fonts100/120/140%. Cases cover unset,0/1/65/99/100%, excess, capped excess, zero goals and partial macro targets. Compare identical SVG/macro-cell markup and styles, actual arc length/fraction, zero active opacity, above coral arc/exact text, unset contrast, centered numeric/unit bounds inside the arc, no donut/no overflow/clipping/replay. Capture actual cards and inspect screenshots. Numerical/target calculation and historical data gates remain unchanged. Physical iPhone Safari/original PWA are Pending until tested separately.

## Nutrition strategy dedicated release gate

`tests/browser/nutritionTemplates.mjs` adds the dedicated day-picker/manager/detail/editor/variant/activation suite at local320/375/390/430 and production390/430, fonts100/120/140. It exercises empty, one/four/eight variants, long Chinese names, active/inactive, persisted high/low selection, identical-number manual goals without guessed selection, actual UI create/copy/reorder/activation, historical saved values/names and archived history retention, shared start-date selection, keyboard-open variant editing, bottom Save reachability and0/1/many real WeightLogs. Inspect390/100,320/140 and430/100 screenshots for hierarchy/card alignment/text/CTA/Sheet density. Bounds/targets/keyboard/Safe Area mocks are browser evidence; physical Safari/original PWA remain Pending. Existing quality/semantic/gauge and all browser release gates remain required.


## Six requirement round: nutrition strategy / servings / meal clear / Calendar / Cardio / Today

Automated matrix:320/375/390/430px ×100/120/140%. Production browser matrix:390/430px ×100/120/140%. `nutritionTemplates.mjs` preserves the existing complete strategy coverage; `foodServing.mjs` adds absent/present serving, default grams,0.5/1.5/2.25 servings, exact mode conversion, long Food names, library/editor, shared mocked keyboard, snapshot immutability after serving edits; single/multiple meals, cancel, precise historical/unclassified deletion and retained expansion; four Calendar category combinations/single glyph/shared marker geometry/ARIA; treadmill/stair history/form and duration; seven Today training states, header navigation and coupled primary continuation. All existing release suites remain gates.

Actual screenshot review must cover390/100,320/140,430/100 for strategy long/selected/editor/bottom CTA, serving conversion and keyboard, quiet meal deletion/confirmation, Calendar glyphs, natural Cardio separators and Today normal/open-workout density. Physical Safari/installed PWA remain separate manual evidence.

Preservation: stable fitlog-lite-db, one explicitV8→V9 upgrade,17stores/unchanged indexes, optional serving mass without inference/history rewrite. FrozenV8 fixtures remain unchanged; new frozenV9 fixtures preserve strategy/provenance and serving precision. BackupV9 / RestoreV1–V9 / encrypted envelopeV1; validation-before-write and all-store rollback remain release blockers.

## Today Training action follow-up

Only Today Training changes: 训练 title, header 查看训练 navigation, body secondary 记录训练 paired with status through today-activity primitives, replaced by primary 继续力量训练 for an open workout. Existing foodServing suite covers empty/Cardio/completed/combined/open plus enlarged5-exercise16-set and120-minute metrics, stale history, local-day creation navigation, zero writes on navigation/record/continuation and return-to-Today refresh. Local320/375/390/430 ×100/120/140%; production390/430; inspect390/100,320/140,430/100 screenshots for all five core states. DB/Backup/Restore/Sync and all non-Today functionality unchanged; physical Safari/original installed PWA remain Pending.


## DietEvent release gates



Diet covers empty/mark-only/manual/long-note/multiple/day/historical selected dates, real local edit/delete, quiet day+meal coexistence, independent photo disclosure,2 Canvas JPEG images/gallery vs camera, Vision route/image payload/review/use/draft/explicit Save, day-photo disabled, mocked keyboard/Safe Area, canonical totals/17 old stores unchanged, ordinary/meal/day/crowded6-category Calendar+detail and delete marker removal. Preserve frozenV9 fixtures, add frozenV10. Verify stable100/18 migration, all prior indexes/rows, reopen/populate, BackupV10/RestoreV1–V10 and all-store rollback/Sync envelopeV1/hash.

Physical iPhone Safari, original installed PWA and meal-photo camera/gallery are independent Pending categories until real device evidence exists. Mock browser/provider PASS never proves them.

## Owned Voice / permanent Habit release gates

voiceMode covers4 widths320/375/390/430 × fonts100/120/140 locally and production: idle/recording/transcribing/error/TTS, >=44px mic, no keyboard focus/app voice blocker, one STT plus ordinary typed/voice chat, all track-ended cleanup (Stop/close/Clear/settings/hidden/pagehide/error/abort), closed AudioContexts, no audio/business persistence. habitDeletion covers0/1/100 actual histories, quiet danger, irreversible count confirmation, cancel and delete, unrelated records and Today/manager/Calendar/report refresh. Unit injection proves transaction rollback/stale-count safety and duration/size/permission races. These join the full existing18 browser gates; aiVoice remains explicit browser compatibility/quick-launch regression. Physical Safari/original PWA/mic indicator and real STT are Pending until separately tested.

## Retirement / motion release gate inventory

Required25 suites (none skipped): uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish, habitEditorLayout, managementWorkspace, managementVisualConsistency, foodRecovery, macroNutritionSummary, catalogRecovery. The removed feature suites are deleted. ProductionAssets and legacy persistent-profile preservation are additional release checks.

Run320/375/390/430 with fonts100/120/140. motionPolish covers normal/reduced preferences, retained navigation/tabs,20 rapid main-tab changes and20 Sheet cycles, Task/Habit persistence, Calendar Today/selected semantics, one-time streamed message entrance and recording-only feedback. Existing full suites retain Food Rail, journals, settings, privacy, rollback and business coverage. Inspect before/mid/final screenshots and the20 named product surfaces. No real provider, hardware Safari or original installed PWA claim from mocks.

The same old production persistent profile must retain all18-store logical snapshots and AI/Voice metadata+keys while only six retired device keys disappear. Never clear/reseed/Restore/reinstall it. Production identity includes HTML,JS,CSS,SW, online/offline cold boots and both application/report-only deployments. Physical iPhone Safari and Original installed PWA stay Pending without direct evidence.

## Habit editor flow regression (2026-10-07)

Add habitEditorLayout to the release inventory (20 suites). All320×812/375×812/390×844/430×932, fonts100/120/140%, normal/reduced: actual Management→Habit Manager→New, Today direct create and edit of a UI-created Habit. Assert static Save52px/15px, zero overlap with visible fields/fieldset/target/state across0/25/50/75/100% body scroll, invariant body-relative Save position, reachable Safe Area bottom, shared keyboard mock open/close, stable large frame, restored nonzero manager scroll and20 editor/back cycles without locks/styles/duplicate form. Review390/100 top/middle/bottom and320/140 top/bottom. Physical iPhone Safari remains Pending until owner retest.

## Persistent workspace release gate

`managementWorkspace.mjs` is the21st required suite; all20 existing suites remain required. Local320×812/375×812/390×844/430×932 and production390×844/430×932 × fonts100/120/140 × normal/reduced motion. Use an isolated synthetic profile. Capture the actual dialog node at the real topbar entry and compare strict object identity, header/body identity, one primary, exact frame and background lock through all12L2 destinations and six create/edit paths. Verify a single visible empty New action, populated `+ 新建` with full accessible name, shared44px Back/X, readable bounded header, no horizontal overflow, new scroll0, Hub180±1, Exercise query/manager scroll240±1 and Save refresh.

Run20 continuous Hub→Food/back→Exercise/back→WorkoutTemplates/back→Diet/back→Nutrition/back→Habit/back→AI/back→GitHub/back rounds without another topbar click in each context. Verify final transform none/opacity1/pointer auto/no running animations/no retained inline style or duplicate Sheet and X at Hub/manager/editor/AI. Preserve the existing Habit flow/keyboard/Safe Area/deletion tests. Capture390/100 Hub/Food/Exercise/WorkoutTemplates/Nutrition/Habit/AI/Backup/ExerciseEditor/HabitEditor and320/140 Hub/Exercise/Habit/AI; inspect the images. Production assets/Actions/Pages/exact build identity and offline cold boot remain additional gates. Chromium tests never establish physical Safari/original installed-PWA verification.

## Manager visual consistency release gate

`managementVisualConsistency.mjs` is the22nd required browser suite. All21 previous suites remain required. Local320×812/375×812/390×844/430×932 × fonts100/120/140 × normal/reduced; production targeted390/100 and320/140 in both motion modes. Two synthetic entities per manager compare actual toolbar/create/search-status geometry, shared list radius/border/background/no shadow, row height/padding/dividers/title/meta/chevron alignment (deltas<=2px). Six independent empty contexts per matrix case assert one primary create with matching48px/radius/font/padding, hidden toolbar duplicate; search modules verify quiet no-results. Run20 continuous six-module rounds in one actual dialog, check shared classes/counts/no stale empty/no overflow/locks and direct Food/Today entries. Capture390/100 populated and empty six-page contact sheets, no-results and320/140 screenshots; inspect side by side, including a blurred contact sheet. Preserve the existing Habit static-save and workspace identity/Back/X/state/cancellation gates, exact production assets and isolated persistent-profile offline/data evidence. Physical Safari and original installed PWA remain Pending until separately verified.


## Food / Recovery release gate (2026-10-08)

`foodRecovery.mjs` is the23rd required suite; all prior22 remain required. Local35 contexts:320/375/390/430 ×100/120/140% ×normal/reduced (24), dark320/360/430/480/844-landscape ×100/140% (10), plus light844-landscape140% (1). Production targeted390/100 light normal,320/140 light reduced,390/100 dark reduced and844/140 dark landscape. Synthetic20 long FoodLogs; one counted meal-header expand entry without +N,3-name case, expand/collapse/editable rows; absent/same-day latest weight, exact1.91/2.93/0.60 g/kg, four-digit macros/five-digit calories; primary completion and unclipped critical values/actions.

Exercise persistent overnight active session across Today/Trend/reload,456-minute completion attributed to its start night, correction to396 minutes, same-Sheet history/editor/date Back, active cancellation and >24h warning. Water quick additions/undo/custom/edit/delete preserve independent rows and sums. Verify7/30/90 sleep/water labelled lines and text data, fonts/touch bounds/no horizontal overflow, no page errors and shared dark contrast. Inspect actual card screenshots at320/140 light and390/100 dark. Automated Chromium reload proves durable storage, not OS-killed physical iPhone lifecycle.

Unit gates preserve frozenV10→V11 all rows/indexes, no reseed, unique active across two connections, reopen, DST absolute subtraction, legacy wake metadata and shared night semantics, invalid/future edits, circular averages, older Backup1–10 normalization, Backup11 round trip, encrypted Sync envelopeV1 and atomic20-store rollback. `recoveryPreservation.mjs` captures the existing isolated production persistent profile without clearing/reseeding, then compares all old18-store rows/config after additive110/20 upgrade and repeats exact App/SW identity plus offline new-page boot for application and report deployments. Original installed PWA/Safari/timezone travel/camera/real AI/Voice remain separate Pending device checks.

## Today / Food complete shared macro summary gate (2026-10-08)

`macroNutritionSummary.mjs` is the24th suite; all previous23 gates remain required. Local40 contexts:320/375/390/430 ×100/120/140/200% ×light/dark (32), plus480 and844-landscape ×100/140% ×light/dark (8). Production targeted375/100 light,320/200 light,430/140 dark and844/140 dark landscape. Reduced motion is used at140/200%; lower scales retain normal motion.

Compare the complete shared summary HTML between Today and Food for identical selected-date facts. Require three columns at normal phone fonts; enlarged/long values may switch all three together to full-width rows, never a two-plus-one orphan. Verify name/consumed/target/g/kg line separation and consumed > target > ratio font hierarchy; main numbers share ink, cells have transparent backgrounds within one neutral container, text contrast>=4.5:1 in both modes, no clipping/overlap/overflow or repeated excess badges. Check exact1.85/2.53/0.53 g/kg at86.4kg, absent same-day weight, unknown fat snapshot, historical80kg independently, four-digit macro values, and real weight edits in a second live app refreshing each still-mounted surface.

The existing meal header is the only expand entry for20 long food names; no +N button or repeated count. All20 editable rows remain visible on expansion, actual edit preserves expansion/count, bottom collapse works, and existing foodServing retains scoped deletion/clear/template/serving/snapshot coverage. Inspect before/after375px Today and Food,320/200 summary,430/140 dark and844/140 dark landscape screenshots. The shared read service is read-only; schema remainsV11/110/20, Backup11/Restore1–11/Sync1 unchanged. Compare every store and device-config hash in the same existing isolated production profile and repeat App/SW identity/offline cold new-page boot after application/report deployments. Physical Safari/original installed PWA remain Pending.


## AI Catalog / Recovery integration gate (2026-10-08)

catalogRecovery is the25th required browser suite; all previous24 remain required, without skips/deleted assertions/extended timeouts. New local and production matrix:390/100 light normal,320/140 light reduced,320/200 light reduced,430/140 dark reduced,390/100 dark normal,844/140 dark landscape reduced. Use isolated synthetic data and mocked provider; never original user storage.

Assert Today shared headers/icons/compact CTA geometry and sleep empty height<170px at100%, no new-card child clipping/body overflow, Safe Area reserve, reference default/save/null/current/cross-tab update and unchanged WaterLogs. Real7/30/90 summaries include correct endpoints/completed facts/missing-vs-zero,90-day chart-only scroll and60 switches per context. Five actual user-confirmed catalog creates refresh another already-open manager while retaining exact dialog identity/navigation; Food also retains nonempty query and180px scroll. A hidden unsaved Food editor survives a live AI write, and its retained list refreshes on Back.

aiCatalog unit tests cover create/update, partial nested/set/variant changes, unknown macros/missing required values/duplicates/real refs, snapshot preservation, one confirmation, Workout/Diet atomic rollback, transaction source/permission recheck, unsupported-model refusal and bounded read/preview. waterReference unit tests cover default/no-autowrite/save/null/invalid input;7/30/90 include local endpoints, DST elapsed minutes, active exclusion, missing values and exact water sums. Existing recovery tests retain midnight, circular clock, migration/Backup/Restore/Sync guards.

Capture and inspect Today training+weight+habit+sleep+water contact sheets, trends7/30/90, reference editor, Food/Workout proposal details and managers after confirmation. Keep390/100 light/dark,320/140 and320/200 images. Exact production assets/App/SW and same existing persistent synthetic profile's20-store/config hashes plus offline cold-new-page boot are additional application/report release gates. Dexie11/IDB110/20, Backup11/Restore1–11, Sync/envelope1, AIConfig1/VoiceConfig1 remain unchanged. Physical Safari/original installed PWA/real provider tools stay Pending until direct evidence.

Workspace may shard by FITLOG_WORKSPACE_WIDTH=320/375/390/430; default still runs the full matrix. Acceptance requires the union of all four width receipts to contain exactly24 unique width/font/motion cases, every419 identity assertions and20 navigation rounds per case. No assertions, loops or timeouts change. Final catalog-targeted reruns also cover the completed composite child-field preview and legacy duplicate-ID partial-edit fix.


## Unified Daily Records release matrix (2026-10-08)

`dailyRecordsExperience.mjs` is the26th browser release suite; all25 previous suites and705 previous unit tests remain gates. Full local matrix:320×812/375×812/390×844/430×932 ×100/120/140/200% ×Light/Dark ×Normal/Reduced (64), plus844×390 landscape. Production targeted390/100 Light,320/140 Light reduced,320/200 Dark reduced,430/140 Dark reduced and landscape. Synthetic isolated contexts only. Mocked keyboard is labelled as such, never physical evidence.

Assert all nine markers/fixed slots/order/no+N,42 dates/adjacent navigation/selectedToday/ARIA/seven44px columns; nine complete disclosures, saved Food/Workout snapshots, unknown macros/load/RPE, inactive actual HabitCheckIns, cross-midnight/multi-episode/completed night sleep and independent water facts. Keep the same Sheet/open groups/focus/scroll across real cross-tab service writes and Undo. Verify clear's original seven-store boundary with Sleep/Water/Habit/Tasks unchanged.

For both shared SVG lines verify7/30/90 actual points/precise selected date and value, missing-day gaps, isolated points/empty ranges, large/equal/close values,44px hit slots and selected readout bounds, chart-only scrolling. Day selected-date navigation and shared detail facts; Week compatibility; Month objective recorded-day averages. Water3 rapid independent adds/exact latest-ID Undo, single compact top-layer toast, unchanged card geometry, protected controls/navigation and shared mocked keyboard viewport. Twenty full Calendar/month/detail/all-expand/Trend7/30/90/Day/Month/Today/add/undo cycles verify cleanup/identity/locks/focus/nooverflow.

Capture fifteen cross-surface scenes: nine/single/empty calendars, collapsed/all-expanded/no-recovery day details, Sleep7/30/90, Water7/30/90, Action Toast, Day and Month Reports. Review a contact sheet and the actual320/140,320/200,390/100,Dark,Reduced and landscape screenshots before publishing. Preserve old production synthetic-profile20-store/18-store/config hashes through APP and report-only END, exact HTML/JS/CSS/SW identity and offline fresh-page boot. Physical Safari/original installed PWA remain Pending absent direct device evidence.

Future Daily Record types must audit Calendar/Detail/Trend/Reports together and extend this matrix. See [Daily Records UX Contract](DAILY_RECORDS_UX_CONTRACT.md).


## Training & Recovery unification (2026-10-09)

Follow [Training Completion & Record Management UX Contract](TRAINING_RECOVERY_UX_CONTRACT.md). Kegel and Strength share Completion Layout/Status/Summary/Actions: saving/saved/error, retained actual result and stable identity, explicit Return; no automatic list jump. Manual Kegel never unlocks; natural unlock appears in the same completion. Cardio remains lightweight, guarded same-Sheet save/error/draft with local summary refresh.

Weight/Sleep/Water use shared content-sized History Sheet/Row/Meta/Actions/Empty and existing native Sheet lifecycle. Nearby history entries; no bottom Weight list after Recovery. Edit/delete exact IDs, confirm deletion, update original Sheet and facts in place; Back retains nodes/scroll/focus, X disposes subscriptions.

Sleep auto attribution uses local start00:00–05:59 previous night,06:00–23:59 start date. Manual correction chooses captured start date or previous night; real instants/ID/creation never change for attribution alone. New optional sleepNightDate/source/sleepStartLocalDate stays stable through timezone travel; legacy fallback uses current local timezone and explains unavailable original timezone. recordDate keeps wake metadata. Existing indexed bounded reads plus one resolver feed Today/Calendar/Detail/Trend/Reports/History. Today shows active and latest completed sleep even when the latest belongs to yesterday. Backup11/parser/Restore/Sync1 preserve optional fields without schema changes.

Single-night timelines display actual segments/gaps and sum actual duration, extend outside18:00→next12:00 using calendar arithmetic across DST. Never infer stages/REM/score/type. Recovery lines default latest valid point; pointer/touch/keyboard select full dates and exact values in a shared readout. Same-range refresh retains valid selection; range changes reset latest. Missing splits paths, single/empty remains factual. Use the same selected readout/highlight/locator for all densities without repeated numeric labels. Remove the entire 展开每日记录 list. Weight Chart.js follows the same readout/selection/keyboard/scroll contract. Long charts scroll internally.

Required release gates retain717 prior unit tests and26 prior browser suites, adding trainingRecoveryExperience and trainingRecoveryLifecycle;27 scene screenshots/contact sheet,4width×4font×2color×2motion pluslandscape and20 integrated actual UI cycles. Keep DB11/110/20,Backup11/Restore1–11,Sync/envelope1,AI/Voice1,WaterReference1. Physical Safari/original PWA/real-device continuity require separate evidence.

`trainingRecoveryLifecycle.mjs` is the additional resource and deletion gate:20 actual manual completions use CDP Window/Document listener counts and owned RAF/interval accounting, then real cross-page Sleep/Water writes while editors are open preserve drafts and the same history Sheet. Delete-last Sleep/Water/Weight verifies Today, empty selectable trends, Calendar marker removal, empty Day Detail/Day Report and zero recorded days in Month. Compare listener counts after legitimate finite Toast feedback has disposed, never while its five owned listeners are active. Do not replace these assertions with a timeout increase or silent skip.


## Unified Module Experience (2026-10-09)

Follow [Unified Module Visual Hierarchy Contract](UNIFIED_MODULE_VISUAL_HIERARCHY_CONTRACT.md).
Progress Trend has three independent sibling Weight/Sleep/Water modules: shared title/icon/nearby History, one selected value and full date, factual chart, independent7/30/90(default30), then record actions. No duplicate Weight hero/body heading or Recovery outer group. `trendModule.ts` supplies anatomy/state, `modules.css` supplies shared rem semantic sizes, `trendInteraction.ts` supplies bounded rendered-coordinate hit handling and actual calendar geometry. Title1.0625rem, metric1.75rem, unit/body.9375rem, date/meta.8125rem, action.875rem; page1.5rem. Enlarge layout rather than shrink text. Targets44px, icon20px in32px shared surface, one scalable10.125rem(162px) plotting frame across ranges and densities, internal horizontal scroll only.

Each module preserves its own range/valid selection/scroll through History and Calendar return. Range changes reset latest actual; deleting selected facts falls back latest. Real near-point/date-column touch allows modest drift, ignores distant exterior and native scroll/cancel; selection changes visible value/date/marker/locator and accessible text, including equal values. Keyboard arrows/Home/End/Enter/Space remain supported. Missing days split paths, never create zero. All densities use real calendar spacing and the same selected readout; no numeric-label variant. Weight retains Chart.js; Weight History→查看全部趋势 retains year-old facts, own chart cleanup and unique canvas identity.

Weight and Water ordinary record actions always write Today, independently of inspected point. Shared saved-fact notification refreshes only its domain after a successful transaction; midnight/visibility refresh is owned and disposed. Sleep Start/Woke retain existing services/unique active session. Backfill creates one actual completed session with validated real start/end, duration/wake metadata and auto/manual captured night; never creates a fake active timer, changes an active sleep or fabricates stages. Invalid/future/inverted inputs retain draft and inline errors. Existing explicit history/date editing remains available.

Training Strength/Cardio/Kegel use peer headers with nearby History; no distant Strength history list. Dedicated Workout execution cards use the same primary lime treatment for their main action; geometry and interaction states remain shared across Strength, Cardio and Kegel. Preserve autosave, completion/retry/manual/unlock, absolute-time timer and full histories. Today and Reports reuse semantic sizing while preserving their different content and actions; report colors/Chart.js grid/axes read actual theme tokens.

Required gates retain746 previous unit tests and all28 browser suites, plus unifiedExperience units/browser and same-existing-profile preservation guard. Real screen-coordinate8th/9th touch, equal-valued dates, independent ranges, all-history, actual Today writes/backfill,65 display contexts(4width×4font×2theme×2motion plus landscape),38 scene originals/contact sheets/index/visual review and20 complete integrated cycles are required. Verify listener/Chart/RAF/timer/Sheet/focus/scroll-lock/data ownership. Keep DB11/IDB110/20stores, Backup11/Restore1–11, Sync/envelope1, AI/Voice/WaterReference1 and retiredVideo. Application CI/Pages→production targeted/exact assets/same synthetic hashes/offline→LATEST-only END→finalCI/identity/data/offline. Browser emulation is separate from physical Safari/original installed PWA/real-device continuity, which remain Pending without device evidence.


## Professional Fitness Analytics V3.1 release matrix

Retain all29 existing browser gates and760 existing units. Add exercisePerformanceAnalysis units and coachReportExperience browser. Verify3 report periods ×4 reading focuses, real same-rep/same-load/tradeoff/stable/first comparisons, cross-period baseline, all-history PR and actual selected load/volume readout.65 contexts:320/375/390/430 ×100/120/140/200% ×Light/Dark ×Normal/Reduced, plus landscape. All9 Weight/Sleep/Water range plots share162px at100% and scale identically;0/1/2/3/dense, actual screen-coordinate point/date selection, equal values, missing gaps, native scroll/cancel, keyboard, complete History and cleanup.

Keep original screenshots, manifest/hashes/contact sheets and explicit supplied-V3 vs current-V3.1 difference review. Inspect Day/Week/Month,4focus,5comparators,action load/volume/single/multiple/dense,habit week/month/target met/not/no goal/mid-created,nutrition complete/partial/no target,9trends,selected weight,3training and nav five views/end/Safe Area/standalone-simulated. Measure nav/viewport/reserve/end reachability, not just document overflow.20 integrated readonly cycles cover all report focuses/periods, actual chart tap/history,3trends/ranges/history,3training histories and report return: unchanged20-store/config hashes, stable listener/timer/RAF/live Chart/Sheet/focus/locks. Run Chromium and available WebKit; physical Safari/original installed PWA/real-device continuity stay Pending absent actual evidence.
