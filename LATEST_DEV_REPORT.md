# FitLog Lite Development Report

## Latest verified production state — 2026-10-03

Shared search spacing and Food Vision effective-route labels corrected after targeted reproduction.

| Identity | Value |
|---|---|
| START_COMMIT | 12decc4bc45630d9f32a6b4e2cb5bffbd5412d24 |
| APPLICATION_COMMIT | 41ec0bacc0cb83a218b5b59c82a97f82e18fb1c9 |
| Application Actions / Pages | 37102340765 / 6824133180 SUCCESS |
| END_COMMIT / final main | This report commit; exact SHA via git log -1 --format=%H -- LATEST_DEV_REPORT.md and external final report |
| Production | https://king-640-060.github.io/fitlog-lite/ |

## Inspection before modification

- Search: Regression. Absolute19px SVG overlaps text because generic input:not([type=checkbox]):not([type=radio]) specificity overrides .search-field input padding-left42px with13px. Baseline390: text starts32px, icon ends50px, field height46px. This shared primitive affects all seven search fields, independent of Safari-specific font behavior.
- Vision: Partially implemented. Effective request routing and current-profile storage reads were already correct; the heading wrongly treated editable profile.name as a current chat-model label.
- Reproduction: name=智谱 · glm-4.5, model=glm-5.3-flash, visionModel=glm-5.3-flash still displayed 智谱 · glm-4.5 · 图片：glm-5.3-flash. Settings values preserve a nonempty existing name on save; this is the exact source of the obsolete4.5 label. No evidence of model-save failure, wrong active selection or probe overwriting a route was found. Physical device storage was not read.

## Delivered change and boundaries

- Search-specific typed selector now wins generic padding and reserves42px at the logical start edge. Absolute icon owns the matching13px logical start, vertical centering and pointer-events:none in primitives.css. Default measured icon/text gap11px, unchanged46px field/14px radius/surface-soft/16px editable font; ordinary text input padding13px unchanged. No search logic, placeholder, autofocus or Sheet/keyboard/VisualViewport changes.
- Food Vision title uses aiModelRouteLabel(current active profile): provider label, model, optional effective image model via existing getVisionModel. Settings/Assistant reuse aiProviderLabel with their existing presentation preserved. No hard-coded model IDs in production code.
- Existing explicit-independent-image rule retained: when visionModel is configured show both routes, even if equal; absent visionModel shows the shared model once. Capability text remains separate.
- Image request path unchanged: vision-analyze reads profiles.active → new AiClient → analyzeFoodPackageImages → client.visionChat → adapter.visionChat → getVisionModel(profile) → POST model. Chat/tools still use profile.model; one provider/root/key. Names/capability probes cannot substitute for model fields.
- Profiles, names, active selection, credentials, capability invalidation, chat/context signatures and business logic unchanged. src/main.ts inspected but unchanged.
- Durable source-of-truth/search rules and QA matrix updated.

## Automated Verification

Typecheck PASS; npm test498tests/46files PASS; npm run build (Pages base) PASS; git diff --check PASS. Existing>500KB bundle warning remains; no dependencies changed.

Expanded tests/aiUiHelpers.test.ts and existing aiDualModelRouting/uiQualityAudit browser gates. A equal5.3/B chat4.5+image5.3/C fallback5.3 labels and actual requests verified; real editor save/reopen/restart with old name, capability-label separation and Vision-only editor save retaining ordinary conversation verified. Existing stale-request/capability invalidation/session tests retained.

All11existing local gates320/375/390/430 PASS: aiDualModelRouting, uiQualityAudit, mobileLayout, interactionStabilization, aiAssistant, aiVoice, foodVision, sharedDatePicker, githubSyncSafety, uiSemanticConsistency, aiStreaming. uiQualityAudit140states per width/560captures, including search placeholder/typed/cleared/ordinary-field at100/120/140% fonts. Actual relevant screenshots inspected.

The initial new raw-height assertion was too strict during Sheet animation. It now requires computed min-height46px and allows0.5px rectangle precision; product geometry was not changed. Failed attempt and successful rerun retained separately. Git HTTPS pull timed out; GitHub API confirmed remote main equals START_COMMIT. Normal application push succeeded.

## Production Verification

Application Actions37102340765 and exact-SHA Pages6824133180 SUCCESS. All11production gates390/430 PASS; quality130states per width/260captures. Search140% and Vision A/B/C screenshots inspected separately from assertions. Production JS/CSS match the verified Pages build byte-for-byte.

Same existing synthetic persistent profile:14stores/15frozen records, AI profile/key/active/vision configuration and Voice acknowledgement unchanged; no business reseeding, SW update and offline cold boot PASS.

## Data compatibility

fitlog-lite-db / DexieV7 (IDB70) /14stores / BackupV7 / RestoreV1–V7 / SyncV1 / AIConfigV1 unchanged. No migration, DB/Backup/Restore/Sync implementation or FoodLog historical changes.

## Remaining issues / Manual Device Verification

No unresolved implementation, automated or production-browser failures. Physical iPhone Safari/original installed PWA search typography, keyboard/zoom and real Provider requests were not tested. The reported card's image segment resolves getVisionModel; if the profile remains unchanged it requests glm-5.3-flash. The device's actual chat-model value cannot be established from the old profile name. Synthetic route tests are not actual user configuration or real-provider compatibility evidence.

## ChatGPT Baseline

Read AGENTS→LATEST→UI/visual/AI specs. Shared search icon reserve42px now wins generic input padding; ordinary fields remain13px. Food Vision title reads active model/getVisionModel, never an auto-name model snapshot. Explicit independent image display remains even when IDs equal; fallback shared route appears once. Actual request/session/preservation contracts unchanged.498tests/46files; local/production11browser gatesPASS. Data versions unchanged. Physical Safari/PWA/provider checks remain separate.
