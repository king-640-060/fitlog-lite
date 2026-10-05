# FitLog Lite Development Report

## Latest verified production round — Stable Video Settings / Plan empty actions

- START_COMMIT: `1e3c4a8a7daeea2ca2dda4e2d5cabcf1e350362c` (actual clean latest main; newer than the supplied stable baseline).
- APPLICATION_COMMIT: `319231c6c0de2e6d6deeea211ca31c0990fca540`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37277487281 — completed, success; Pages deploy success.
- END_COMMIT: the report-only commit containing this file. Exact SHA and its final deployment receipt are recorded in the external release report and final user response, avoiding a self-referencing commit hash.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Product result / before and after

A was already corrected in the actual START main: the historical bug displayed editable `activeProfile.name` as model identity. This round preserves the existing shared `aiChatModelLabel` (`aiProviderLabel` plus actual `activeProfile.model`), shared with AI Settings / route labels. The name `智谱 · glm-4.5` with model `glm-5.3-fast` displays the actual model; reopening after editing to `glm-5.4` refreshes it. Vision identity is excluded and Zhipu compatibility is unchanged.

B/C: baseline browser reproduction showed a **118.3125px** Sheet top jump at 390/100 when provider credential blocks appeared/disappeared. The settings home now always contains source switches → search policy → two compact source configuration rows → privacy → status and shared save actions. Ordinary toggles update existing checked state, status text, policy text and accessibility state; they do not mount a credential block, recreate the dialog/form or navigate.

- Sources use real accessible checkboxes inside a small shared `setting-toggle` primitive with >=44px targets and visible keyboard focus. Existing color, typography, surface and button tokens are reused.
- Policy keeps a stable control slot: two enabled sources show 自动（推荐） / 全部来源; one source shows 当前使用：B站 / YouTube; both off show 未启用视频来源. V2 normalization is retained.
- Two source summary rows always exist. Enabled B站 shows the actual chat model / reuse provenance or separate Key; disabled rows show 未启用 while their detail slots preserve geometry. Each provider retains independent configured / successful / failed status.
- Clicking a source row enters its credential subview in the same mounted Sheet. B站 reuse is default only for compatible profiles; a quiet action reveals a separate Key. Incompatible profiles offer only separate credentials. YouTube shows its password field only in its subview. Saved Keys remain blank with the saved-key placeholder.
- Returning / Escape / successful save restores home scroll. Saving a disabled provider's Key does not enable that provider. Invalid Key errors clear after correction. Enter in a credential editor saves configuration without starting a provider test.
- Privacy remains enforced; two-column 保存并测试 primary / 仅保存 secondary use shared rules. Both off can save with no request; partial provider success remains visible; close/back abort outstanding tests.
- No new outer fixed height, height animation, whole-Sheet transform or extra palette/library.

D: only Plan tab Today / Upcoming / Inbox empty-state 添加任务 changes from `secondary plan-empty-action` to `primary plan-empty-action`. Shared primary lime states apply; min-height, radius, padding, font size and layout remain unchanged. Today home Plan card stays secondary; populated Plan creation entry stays unchanged.

## Automated Verification

- `npm run typecheck`: PASS.
- `npm test`: **641 tests / 57 files PASS**.
- `npm run build` plus clean application Pages build: PASS. Existing >500kB Vite chunk advisory remains.
- `git diff --check`: PASS.
- Full local release browser gates: **18/18 PASS**.
- Full production release browser gates against APPLICATION_COMMIT: **18/18 PASS**. Suites: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, aiDualModelRouting, foodVision, aiStreaming, nutritionGauge, nutritionTemplates, foodServing, videoSearch, dietEvents, videoSearchSettings, trainingJournal. AI Settings and Plan/Task coverage are included in existing suites and direct active-model edits.
- Focused settings locally and on production: **4 widths × 3 font scales × 12 states = 144 captured states per environment**, with top/bottom screenshots. Widths 320/375/390/430; fonts 100/120/140%. Production narrow widths supplement the existing 390/430 gate.
- Every measured ordinary toggle: maximum dialog top delta **0px**, home height delta **0px**, scroll delta **0px**, retained dialog/form/home nodes. The test establishes nonzero middle scroll and samples successive animation frames over eight rapid toggles, including 390/100 and 320/140.
- Plan computed shared primary background/foreground/border and original compact geometry PASS across all three views and font scales; Today Plan secondary PASS.
- Screenshots manually inspected: production 390/100 B-only reuse / both enabled, 320/140, both credential editors, partial success, top and bottom actions; Plan Today / Upcoming / Inbox. Actual model, summary hierarchy, switch alignment and action labels verified. No horizontal overflow in targeted states. Provider requests use synthetic mocks.
- Generated legacy PWA upgrade PASS: selected Vision image does not auto-reload; frozen business / AI hashes preserved across V7→V10; offline cold boot PASS. Advanced prompt-mode transient-state tests were not rerun this round.

## Production Verification

- Application Actions and Pages: success. Exact production HTML build identity, `build-info.json` (`local:false`), JS/CSS lengths and SHA256, SW bytes/precache, five main tabs, AI Settings and Sync entry match the clean application Pages build.
- Existing dedicated synthetic production profile preserves **14 frozen legacy stores / 15 rows**, stable `fitlog-lite-db`, Dexie V10 / IndexedDB 100 / 18 stores, AI config/Key and voice acknowledgement hashes. All four additive stores remain empty. No business reseeding, clearing, Restore or reinstall; offline cold boot PASS.
- Initial adoption probes read an older document while the worker update became available. Subsequent same-profile cache inspection confirmed the new precached document and executing application build, then exact preservation/offline checks passed. No application or PWA lifecycle changes were made for this probe.
- Report-only END deployment is rechecked for exact assets/build and same-profile preservation in the external receipt.

## Boundaries / actual changed files

DB V10 /18 stores; Backup V10; Restore V1–V10; Sync V1 / envelope V1; AIConfig V1; VideoSearchConfig V2: unchanged. Training Journal, notes, DietEvent, Food, Nutrition Strategy and Today Training CTAs are untouched. No provider service/router/protocol, compatibility relaxation, tool contract, validation/player or PWA lifecycle change.

Changed: `AGENTS.md`, `LATEST_DEV_REPORT.md`, `docs/INTERACTION_VISUAL_SYSTEM.md`, `docs/UI_INTERACTION_SPEC.md`, `docs/UI_QA_MATRIX.md`, `docs/VIDEO_SEARCH.md`, `src/main.ts`, `src/styles/ai.css`, `src/styles/primitives.css`, `src/ui/videoSearchSettings.ts`, `tests/browser/uiSemanticConsistency.mjs`, `tests/browser/videoSearch.mjs`, `tests/browser/videoSearchSettings.mjs`.

## Manual Device Verification / confirmed remaining issues

- Physical iPhone Safari: **Pending**.
- Original installed PWA: **Pending**.
- Real Zhipu/Bilibili / YouTube credential/search/playback: **Not performed**; no real credentials supplied or used.
- No confirmed unresolved application defect after automated and production checks. Browser emulation does not prove physical-device results.

## Evidence / ChatGPT Baseline

Full 35-item matrix, actual START/APPLICATION/END SHA, final Actions/Pages receipts, logs and reviewed screenshots:
`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/artifacts/video-settings-stability-plan-2026-10-05/`.

START `1e3c4a8a7daeea2ca2dda4e2d5cabcf1e350362c`; APPLICATION `319231c6c0de2e6d6deeea211ca31c0990fca540`; END is this report-only commit. Video home is structurally stable; provider credentials use explicit same-Sheet navigation, actual shared chat identity, independent statuses and preserved scroll. Toggle top/height/scroll delta 0px over 4 widths /3 font scales. Plan tab's three empty actions use shared primary lime; Today Plan unchanged. 641/57 tests, typecheck/build, local18/18 and production18/18 PASS. DBV10/18, BackupV10, RestoreV1–V10, Sync/envelopeV1, AIConfigV1, VideoSearchConfigV2 unchanged. Physical Safari/original PWA Pending; real providers Not performed.
