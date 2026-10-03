# FitLog Lite Development Report

## Latest production round — six requirements

- START_COMMIT: `a22144f42ed91b0f1540c5db69ec507780d5409a`.
- APPLICATION_COMMIT: `e8155fb78c2192b6085dd94a9b92ec3e7be2e2f0`. The initial integration commit512461ec019e980a0ec4b9796cd9e46a1e3556ec was followed by a screenshot-driven Today phrase-wrap correction in this same round. No second schema/Backup bump.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37122463437, success. Pages deployment6827491114, success.
- END_COMMIT is the commit maintaining this report, resolved by `git log -1 --format=%H -- LATEST_DEV_REPORT.md`. A file cannot embed its own Git SHA; the delivered external release receipt and Development Report record the literal END_COMMIT plus its independently verified Actions/Pages/assets/PWA checks.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Product result

A was already implemented on the production baseline and was preserved/fully reverified. NutritionStrategyTemplate owns1–32 freely named ordered NutritionStrategyVariants; NutritionStrategyPhase owns local dates and the activation-name snapshot. Existing NutritionTarget remains the sole actual daily goal with optional persisted strategySelection (template/variant/phase IDs and applied-name snapshots), distinct from DietTemplate sourceTemplateId. Applying snapshots real values; edits/removal/archive/activation never rewrite saved targets. Manual entry changes only the selected date and clears strategy origin. Copy uses fresh template/variant IDs; Save does not activate. Explicit V2 activation closes V1 on the preceding local day, opens at most one phase and creates no daily schedule. Inclusive calendar-day counts are DST-safe; zero/one/many actual in-range WeightLogs drive dynamic first/latest/net-change summaries without copying weights into phases. Daily selection, manager/detail/editor/variant/activation/date-picker subviews remain shared Sheets.

B adds foodService.deleteFoodLog(id,database?) and deleteFoodLogsForMeal(date,meal?,database?,expectedIds?). Bulk scope is exactly the viewed local date and actual meal group, including unclassified, inside one FoodLog transaction without a new index. Confirmation states date/meal/count/irreversibility/library preservation and rechecks the preview ID set. Clear-meal is a quiet action only inside the expanded group; Cancel writes nothing. Single deletion preserves same-date expansion while records remain; the last deletion returns the group to its natural empty state. Other dates/meals/Foods/targets/templates/other stores are untouched.

C changes only Calendar's shared Food category mapping to the existing SVG system's single fork path. Grid/legend/day detail share peer size/stroke/opacity/alignment; aggregation, overflow markers and accessible history remain unchanged. Other Food icons remain utensils.

D changes shared formatCardioMetrics and actual form suffixes to omit km/h and%, retaining 分钟. Every Today/Workout/history/Calendar consumer shares that formatting. Missing optional metrics do not leave trailing separators. speed/inclinePercent values, field meanings, validators and factual history are unchanged.

E adds optional finite-positive Food.servingGrams independent of referenceGrams. Blank is legal. Library has quiet serving metadata only when present; ordinary Food editor exposes a shared16px decimal field. Entry defaults to grams; only Foods with a serving mass expose equal-geometry 按克/按份 with aria-pressed. Decimal counts convert exactly to grams before the existing calculateNutrition/snapshot path. Mode-only toggles retain exact canonical grams, and conversion text preserves2.25 rather than falsely labelling it2.3. Saved FoodLog still contains grams and existing nutrition snapshots, without a live serving/count dependency. Later serving changes never rewrite logs. Selecting a Food changes the large picker into the existing form Sheet and resets its body scroll. No private keyboard/viewport logic. JSON accepts servingGrams; CSV accepts optional servingGrams/serving_g/每份克数 while old files remain compatible. Vision never infers serving mass; updates preserve a manually supplied existing mass, and users can edit ordinary Food afterward.

F moves Today 查看训练 into the existing card-heading text-btn/chevron navigation and removes the isolated footer row. A continuing strength workout retains compact primary lime inside its own strength status, with header navigation still available. Normal navigation and continuation explicitly leave stale strength-history view state. Recording status and individual Cardio label/value phrases wrap as whole spans, preventing a lone 中 or metric value at enlarged fonts. Existing other Today card grammar and dedicated Strength/Cardio/Kegel primary primitives remain.

## Versions and preservation

- Stable fitlog-lite-db: DexieV9 / IndexedDB90 /17stores. One explicitV8→V9 upgrade adds only optional unindexed servingGrams. Existing17stores/indexes/rows/strategy relationships/provenance are preserved without inference or historical recomputation. No startup reset/clear/reseed.
- BackupV9 includes all17arrays plus optional Food serving mass. RestoreV1–V9 validates completely before one17-store replacement transaction; failures roll back every store. Legacy missing serving→undefined, pre-V8 missing strategies→empty.
- Manual encrypted GitHub SyncV1 reuses BackupV9 with unchanged envelopeV1; hash includes serving and strategy business data. AIConfigV1 remains device-only and excluded.
- FrozenV7/V8 fixtures remain unchanged. New frozenV9 schema/data include serving precision and the existing strategy/phase/provenance snapshots.

## Automated Verification

- npm run typecheck PASS; npm test566tests/52files PASS; npm run build and clean Pages build PASS. Existing >500kB bundle advisory only.
- Service/preservation tests cover optional/invalid serving,0.5/1/1.5/2.25/exact decimals, equal grams-vs-serving nutrition, changed/removed serving with immutable FoodLog, Vision preservation, old/new import, currentV8→V9 all17stores, reopen/populate, V9 fixture, RestoreV1–V9, validation-before-write, full rollback and encrypted/hash round-trip.
- Meal tests cover2breakfast/4lunch/3dinner, snack/unclassified, other-date5lunch rows, exact group/date scope, stale confirmation, empty group, single delete and injected partial-delete rollback. Original Foods/other stores are compared unchanged.
- Nutrition strategy suite additionally injects activation and definition-edit failures and proves no partially closed phase or changed definition. Fixed an old random-ID-order-dependent duplicate-sort assertion to construct a real duplicate deterministically.
- All14browser suites PASS locally and production: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, aiDualModelRouting, foodVision, aiStreaming, nutritionGauge, nutritionTemplates, foodServing.
- One final production interactionStabilization attempt timed out at its initial8-second networkidle navigation before functional assertions. The unchanged standalone rerun passed both mobile widths and desktop height-resize; no timeout/assertion relaxation or application workaround.
- nutritionTemplates:300local states at320/375/390/430 and150production at390/430;100/120/140% fonts. Four/eight/long variants, selected high/low, manual/no guessed provenance, deep copy/reorder/V2 activation, archived/historical snapshots, weights0/1/many, shared mocked keyboard and reachable bottom Save.
- foodServing:396local states (99/width) and198production (99/width),100/120/140% fonts. Serving absent/present/default grams/0.5/1.5/2.25/exact toggles/long names/library/editor/keyboard, historical serving-edit immutability; single/multiple/historical/unclassified/cancel/retained expansion; four Calendar combinations/single glyph/shared marker geometry/ARIA; treadmill/stair forms/history/minutes; eight Today states including no metrics, finished/open/multiple/large values and stale-history navigation. A targeted320px pass adds serving/editor keyboard and bottom CTA reachability checks; production runs those checks at both widths too.
- UI quality audit:141states/local width and131states/production width; actual screenshots inspected at390/100,320/140,430/100 plus production390/140. Refined content-sized Food quantity Sheet, narrow danger confirmation button layout, exact conversion count, Today continuation coupling and whole-phrase wrapping. No overflow mask/global transform/private keyboard workaround.
- Real old bundle/SW upgrade, legacy and prompt modes: clean current build, DB90/17,14legacy stores/15rows preserved,3strategy stores empty; selected Vision image retained; prompt checks AI draft/proposal/other-client blocking, Cancel and one confirmed reload; offline cold boot PASS.

## Production Verification

- Actions/Pages for the application SHA above succeeded. Production JS/CSS/SW exact bytes match the clean Pages build; matching Git build, scope and precache. App/controller/active/network identities agree at390/430; offline new-page boot PASS.
- Full14gates and dedicated150/198state suites PASS on the deployed application. Production serving/confirmation/Today/strategy screenshots inspected.
- Original synthetic persistent production profile updated through existing diagnostics→explicit confirmation. BeforeV8/17→afterV9/17; all14frozen stores/15records and AI configuration/key/voice-acknowledgement hashes match. No business reseeding, clear, Restore or reinstall; offline reopen PASS. Food Vision after-preservation also checks the actual exact bundle and reads its real DB version/store count for its receipt.
- Initial integration used normal Git push. The final application correction hit a Git HTTPS connection timeout; the existing publication script verified exact blob/tree/commit identities and the unchanged remote parent before a non-forced API fast-forward. The report maintenance commit deploys a distinct Git build identity; its final exact asset/native PWA/original-profile checks are recorded in the delivered receipt.

## Manual Device Verification / remaining issues

- Physical iPhone Safari: Pending.
- Original installed PWA: Pending.
- Physical keyboard/VisualViewport/Safe Area/system text/rendering: Pending. Chromium/mocked viewport evidence is not physical-device proof.
- No confirmed unresolved defect within this round after automated/production verification.

On the original phone, use Version diagnostics and confirm the update without clearing/reinstalling. Verify date-specific nutrition strategy/manual goals, servings and exact grams snapshots, current/historical/unclassified meal confirmation/Cancel, Calendar's fork, Cardio minutes without speed/incline suffixes, and Today normal/open-workout layout at enlarged text with the real keyboard.

## ChatGPT Baseline

Current main preserves complete nutrition strategies and adds optional Food servings, exact scoped meal clearing, single Calendar fork, unitless Cardio metric presentation and compact Today training header navigation/coupled primary continuation. StableDBV9/IDB90/17stores, BackupV9, RestoreV1–V9, encrypted manual SyncV1/envelopeV1 and isolated AIConfigV1. Snapshot history remains authoritative; no inference/scheduler/recalculation.566tests/52files,14browser gates locally/production, strategy300/150states and Food/meal/Calendar/Cardio/Today396/198states, screenshots and actual PWA/production data+AI/offline checks PASS. Physical Safari/original installed PWA Pending. Resolve END_COMMIT from Git/report receipt and measure actual App/controller build before device conclusions.
