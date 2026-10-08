# FitLog Lite Development Report

## Latest production round — Today / Food shared macro summary (2026-10-08)

- START_COMMIT: `e9222c65888371de0625b71d1f026d0246fa43db`. Clean main; status/branch/pull/log confirmed and origin/main rechecked before publishing.
- APPLICATION_COMMIT: `74b9ef27154554f033e1e4b69e2e9dcf9e543b76`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37735754816 — completed success, including typecheck/tests/build/Pages deployment.
- END_COMMIT: the report-only commit containing this file. Its exact final SHA, Actions and production asset/offline receipts are external and returned to the user, avoiding self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Implemented behavior

Classified as partially implemented: both pages previously shared only an individual metric helper, separately assembled three colored tiles; Today omitted g/kg, responsive auto-fit could leave Fat alone, and Food had a duplicate +N expand action.

Today and Food now render the complete shared `macroNutritionSummaryForDay` / `macroNutritionSummaryHtml` primitive. Props include consumed/target Protein, Carbs and Fat, effectiveWeight and selectedDate, plus optional snapshot completeness. One neutral token-based container replaces three colored surfaces. Protein/Carbs/Fat retain that order. Name, prominent consumed value, secondary target and lighter g/kg use separate lines and distinct hierarchy. Main numbers share text ink; existing category tokens appear only in tiny lines. No duplicated cell excess/reached badges or macro rings/bars.

Normal phone fonts use three aligned columns. A content-derived rem threshold participates in font scaling and switches all three cells together to full-width rows when enlarged text or long numeric values need room; never two plus an orphan. No private viewport listeners, measurement loop, new framework/dependency or hardcoded color palette. Numeric/unit tokens remain intact. Light/dark and normal/reduced motion use the same shared component.

`readDailyNutritionSummary` reads FoodLogs, NutritionTarget and same-date WeightLogs in one read-only transaction. Both pages use that snapshot and the unchanged saved-food reducer/formatting, existing weight selection and ratio calculation. Only the selected local date's latest valid positive finite weight is eligible; no historical fallback. Ratios have exactly two decimals; missing same-day weight or incomplete dimension hides its g/kg. Dexie liveQuery refreshes still-mounted summaries after real writes from another app tab. Subscriptions unsubscribe on navigation/date/replacement; Today patches only its nutrition contents and retains existing navigation controls. Food retains its rail, selected date and same-date meal expansion.

Remaining/excess uses the existing shared completion summary and calculation. Today shows this same information without a new CTA; Food retains editing targets, strategy provenance and the existing primary completion action. Calorie SVG/calculation, target/template application and historical facts remain unchanged.

Food keeps the existing counted meal header as its single expand entry; the duplicate +N button/count is removed. One to three names remain visible; larger meals preview three names. Expansion shows every actual editable row, with bottom collapse and existing edit/delete/confirmed scoped clear. Today has no separate meal list or duplicate expand entry. No new navigation or redundant CTA.

## Data compatibility

- Stable `fitlog-lite-db`: DexieV11 / IndexedDB110 /20 stores, unchanged schema/indexes and database identity.
- BackupV11 / RestoreV1–V11; encrypted GitHub Sync/envelopeV1; device-only AIConfigV1/VoiceConfigV1 unchanged.
- No DB/Backup/Restore/Sync/AI/PWA implementation, migration, dependency or frozen production fixture changes in this round. Existing Recovery, strategy/template, serving, historical snapshot and offline behavior retained.
- Shared summary reads do not write or recompute saved snapshots. No real user data clearing/reseeding/Restore/reinstall.

## Automated Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS —675 tests /60 files |
| `npm run build` | PASS — final clean application build and CI build |
| Full browser inventory | PASS — all24 suites; none skipped |
| New macroNutritionSummary | PASS —40 local contexts |
| Existing foodRecovery | PASS —35 local contexts |
| Existing nutritionGauge | PASS —4 widths ×66 states, shared SVG/macro HTML/styles |

The24 suites are listed in docs/UI_QA_MATRIX.md and the external accepted-gates receipt. All previous23 remain required. New40 matrix:320/375/390/430 ×100/120/140/200% ×light/dark (32), plus480/844-landscape ×100/140% ×light/dark (8). Normal/reduced motion included. Assertions cover complete identical Today/Food summary HTML, aligned three columns at normal fonts, whole-group vertical fallback, font hierarchy, neutral cells/shared number ink, text contrast>=4.5:1, no overflow/clipping/overlap/orphan or repeated badges. Exact159.8/86.4=1.85,218.7/86.4=2.53,45.5/86.4=0.53 g/kg; no same-day weight; unknown Fat; independent historical80kg; cross-tab actual weight edits refreshing each mounted surface; large numbers;20 editable foods and one expand entry.

The initial uiSemanticConsistency run expected three direct Today wrapper children. Its obsolete flat selector was updated to count three nutrient cells inside the complete shared container; the full suite retry PASS. Application assets were unchanged for the retry. Original failure and final retry are both retained. Early synthetic fixture failures (existing unique weight-date index; missing reference macro facts during actual edit) were corrected in fixtures and rerun; no schema or business logic changes.

## Production Verification

Application Actions success verified. Production browser suites all PASS:

- macroNutritionSummary:4 contexts —375/100 light,320/200 light,430/140 dark,844/140 dark landscape; both pages, same-date/history/unknown/live refresh and20-food editing.
- foodRecovery:4 contexts —390/100 light,320/140 light,390/100 dark,844/140 dark landscape; original persisted Sleep/Water and meal flows retained.
- nutritionGauge:390/430 ×66 states each, shared SVG/cell markup/styles and no overflow/replay.
- productionAssets: exact HTML build marker/build-info, JS/CSS byte hashes, exact SW bytes/precache, all five main tabs, AI Settings and GitHub Sync entry; no page errors.

Application assets: JS `index-BYfeGKyM.js`,794352 bytes, SHA256 `0e28584709ef34798fa142a3f674a87ac4fb19838a1864380031dc0e561b6b59`; CSS `index-H4M02ugw.css`,122036 bytes, SHA256 `cc8ef2674ffa52de24ab93404e928203cd1d9e8b8d902ad985f21069eeab429c`. Report-only deployment assets are checked separately in external receipts.

The same pre-existing isolated synthetic production profile is reused without clearing/reseeding/Restore. Before/after application:V11/110/20,22 records; all20-store hash `9c2df75ef30db6923c19e48a588aaa77f25d053d80f005917fc36b6ad251eab6`; prior18-store hash `5566fc3e8df752b2ffd2a68a93c6db5bbef9051fd817b7fb63e9d04d2d9934c7`; AI/Voice config hash `be24fdaaad958fe42cfbfc2de052a846400e6401221282531f636669b7361dcf`. All unchanged. New page while offline boots the exact application App/SW SHA and preserves the same data/config hashes. This is isolated Chromium evidence, not personal-device verification. Repeat exact assets/data/offline checks after the report-only deployment.

## Actual modified files

- `src/ui/macroNutritionSummary.ts` — complete shared renderer and snapshot mapping.
- `src/services/dailyNutritionSummary.ts` — common read-only snapshot/live subscription.
- `src/styles/macroNutritionSummary.css` — single neutral layout/hierarchy/responsive/token owner.
- `src/main.ts` — Today + Food integration, freshness, shared remaining display and removal of duplicate meal +N.
- `src/styles/main.css`, `src/styles/recovery.css` — remove obsolete colored/dynamic tile and +N ownership; retain unrelated rules.
- `tests/macroNutritionSummary.test.ts` — saved precision/read preservation, same-date/unknown and two-connection refresh/cleanup.
- `tests/browser/macroNutritionSummary.mjs` — complete new acceptance matrix.
- `tests/browser/foodRecovery.mjs` — single existing meal header instead of duplicate +N assertion.
- `tests/browser/uiSemanticConsistency.mjs` — shared-container descendant assertion.
- `AGENTS.md`, `docs/UI_INTERACTION_SPEC.md`, `docs/INTERACTION_VISUAL_SYSTEM.md`, `docs/UI_QA_MATRIX.md` — replace obsolete tile/+N rules and maintain required24-suite inventory/matrix.
- `LATEST_DEV_REPORT.md` — report-only END commit.

Evidence: external workspace `artifacts/macro-summary-2026-10-08`:14-file application inventory/patch,24-suite raw and accepted receipts/logs, retained failures/retry,675-unit/typecheck/build, local/production matrices, screenshots, Actions/exact-assets and baseline/application/final same-profile preservation/offline receipts. Before screenshots use the START build; after full-card screenshots use the production APPLICATION build with identical synthetic facts. Side-by-side Today/Food comparisons and small/dark summary captures were visually inspected.

## Manual Device Verification

- Physical iPhone Safari: **Pending**.
- Original installed PWA: **Pending**.
- Real OS font scaling, native Safari CSS rendering/keyboard/Safe Area and original installed-PWA update require owner retest. Chromium font emulation/offline/mock provider results do not establish these physical results.
- Real-provider AI/Voice not changed or newly verified.
- No confirmed unresolved implementation defect. Existing large-bundle build advisory remains informational.

## ChatGPT Baseline

Read AGENTS and this report; actual main wins. Today/Food use one complete MacroNutritionSummary and read-only same-date snapshot/live observation. One neutral container, three normal columns or all-three vertical fallback; consumed > target > g/kg; tiny category marks and one shared remaining area. g/kg exactly2 decimals, latest valid selected-date weight only, unknown dimensions hidden. Food has one counted header expand entry, no +N; all rows/edit/delete/clear remain. Preserve V11/110/20, Backup11/Restore1–11, Sync/envelope1, device AI/Voice1, existing Recovery/templates/servings/history/PWA. Next UI release requires all24 browser gates plus exact production assets and same-profile data/offline evidence. Keep automated, production and physical verification separate.
