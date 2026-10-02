# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

Capability-specific AI model routing is complete and released. Full30-field report: [AI_DUAL_MODEL_DEV_REPORT.md](docs/AI_DUAL_MODEL_DEV_REPORT.md). AI contracts: [AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md), [FOOD_VISION_IMPORT.md](docs/FOOD_VISION_IMPORT.md). Shared interaction rules remain in [INTERACTION_VISUAL_SYSTEM.md](docs/INTERACTION_VISUAL_SYSTEM.md).

| Identity | Value |
| --- | --- |
| START_COMMIT | b2f6a64f3d04386d1c17508851b4573475e100dc |
| DUAL_MODEL_ROUTING_COMMIT | 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8 |
| END_COMMIT / last application | 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8 |
| Application Actions | [36994775092](https://github.com/king-640-060/fitlog-lite/actions/runs/36994775092) — SUCCESS |
| Verified application production HEAD | 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8; Pages deployment6806256081 SUCCESS |
| REPORT_COMMIT / final main HEAD | This report commit; exact SHA is returned in the release response and from `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| Production | https://king-640-060.github.io/fitlog-lite/ |

HTTPS pull/push timed out. API verification confirmed START=remote main, then Git Data API verified identical blobs/tree/commit and advanced main with force:false. No history was rewritten. Final report deployment serves the same verified application assets; its exact head/Actions/deployment is in the release response.

## Delivered behavior

- One profile retains one Provider/Base URL/API Key. `model` routes chat and FitLog tools; optional `visionModel` routes image input through the same client/adapter. `getVisionModel` supplies the legacy fallback to `model`; `visionChat` and `chat` share the transport, bounds, safe errors and normalization.
- Device AI Config remainsV1. Reader ignores invalid optional image IDs without rejecting old profiles. Save trims/omits blank, rejects >200 characters, explicitly projects metadata and scans image IDs for known secrets. Keys remain separate and empty in saved edit fields.
- Effective-route invalidation is independent: image-only changes preserve Tools; chat-only changes preserve independently routed Vision; fallback chat changes or root/key changes invalidate both. Same effective route/rename preserves verification.
- Ordinary assistant configuration excludes Vision metadata. A Vision-only save/test preserves an active chat, history and proposals; actual chat routing/tool capability/permissions changes still clear context. Existing explicit business-write confirmation remains authoritative.
- Vision probe and Food packaging extraction use the effective image model. Captured image request signatures include ID/root/image model/key; changed image routing rejects late results, while chat-only edits with an independent image model remain valid. Privacy,731 probe,preprocessing,EXIF removal,limits,kJ/kcal,unknown macros,atomic writes and snapshots stay unchanged.
- AI Settings keeps the stabilized hierarchy. Image routing defaults to the shared model; a radio choice progressively reveals an independent image selector. A single explicit `/models` fetch fills both selectors using one editor-session cache, with exact IDs and manual fallback. No model-name heuristics, vendor model defaults, second profile/key/root or automatic extra request. Save & Test saves first and runs Chat→Tools→Vision independently; partial failure does not roll back working chat/tools. Failed shared-image testing offers “选择图片模型”.

## Automated Verification

- Actual baseline384tests/39files PASS; final405tests/40files PASS (+21). New reader/save/secret/effective-route matrix/5-request routing/legacy/stale image signature/active chat and history tests; all existing AI/Tools/Proposals/security/Vision/Nutrition/Backup/Restore/Sync/frozenV7/history gates PASS.
- Typecheck, full tests, normal build, Pages build with GITHUB_REPOSITORY and git diff --check: PASS.
- Local320×812 /375×812 /390×844 /430×932: Dual Model Routing, Assistant, Food Vision, Interaction Stabilization, Shared Date Picker, GitHub Sync Safety browser suites PASS. Synthetic profiles/keys/images/records and mocked provider only.
- Screenshot inspection repaired image-radio row layout and verified44px options,16px inputs,320px no overflow and unchanged shared Sheet/focus/viewport behavior.

| Pages asset | Bytes | Vite gzip | SHA-256 |
| --- | --- | --- | --- |
| index-D-UBZopM.js | 667152 | 213.56kB | 86c318bc496a400a258dcdc72e2440ccd5f842acef5c63d06496d213aa704ff5 |
| index-DTxpCV3q.css | 101890 | 18.27kB | 8baf40154d9fa20456d833b4a3e76fe52df241f3ee92f999f9f2be709724367d |

PWA precache17entries/786.33KiB; no added dependencies. Existing>500kB JS warning remains.

## Production Verification

- Application Actions36994775092 and Pages deployment6806256081 SUCCESS. Production JS/CSS bytes/SHA-256 exactly match the final local Pages build.
- Production390×844 /430×932: all six browser suites PASS with no page errors. Covers the legacyglm-4.5 supported-tool/unsupported-image case, independent selector/save/reopen, single list reuse, manual fallback, connection/tool/image-probe/package models, partial400, changed-image rejection, chat-only changes during image scan and image-only changes during a chat; ordinary assistant/packaging writes/date/interaction/Sync regressions PASS.
- Cross-deployment data preservation PASS: same dedicated synthetic persistent profile before modification and after deployment; exact new JS runs under the old Service Worker, fitlog-lite-db V7 /14stores /15frozen records all unchanged. Both checks readonly; no reset/reseed.

## Versions

fitlog-lite-db /DexieV7 /14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfigV1; AISystemPromptV1; FoodVisionPrompt/extractionV1. No migration/package/frozen-fixture changes. Five tabs, Progress views, canonical kcal/local dates and historical snapshots remain unchanged.

## Manual Device Verification

- Real Provider: Pending. No real API Key used; actual account model availability/image quality/CORS requires the owner’s test.
- Physical iPhone Safari /installed standalone PWA: Pending. Mock touch/viewport and successful deployment do not establish physical keyboard/camera/gallery/Safe Area behavior.
- User steps: AI设置→编辑当前服务→保留聊天模型→图片识别选择“单独选择图片模型”→读取模型列表→选择候选或手填精确ID→保存并测试，直到图片识别显示“已验证”。

## ChatGPT Baseline

Read AGENTS→LATEST_DEV_REPORT→UI_INTERACTION_SPEC/AI_ARCHITECTURE/FOOD_VISION_IMPORT. END9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8 adds optionalvisionModel in one V1 profile/root/key. Chat/tools=model; image probe/import=visionChat+getVisionModel fallback. Only changed effective capabilities reset; Vision-only settings preserve active ordinary chat/history/proposals. Two selectors reuse one editor-session model list and manual fallback, with progressive image expansion and no fixed model IDs. 405tests/40files; six browser suites local4sizes/production2sizes; asset identity and exact14store preservation PASS. Real Provider/physical Safari/PWA Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1/AIConfig+PromptsV1 unchanged. Preserve all interaction/Sheet/viewport/security/nutrition/history contracts.
