# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

Food Packaging Vision V1 is complete and released. This report supersedes the previous unreleased local note. Full 52-field acceptance details: [AI_FOOD_VISION_DEV_REPORT.md](docs/AI_FOOD_VISION_DEV_REPORT.md).

| Identity | Value |
| --- | --- |
| START_COMMIT (continuation) | e46aaf5b29e989a992239619a8101e41ecf9f9f2 |
| Original production baseline | a677eca53d2653c7764b845b365d075dced2481a |
| Original implementation / AI_VISION_COMMIT / APPLICATION_COMMIT | 6c99796f2147d20c3f7baeee234361433ff1ee67 |
| VISION_FIX_COMMIT / END_COMMIT / verified production application | 508057ca0f955859975a89dae68efee368378bcc |
| Final report/main HEAD | This report and verification-harness follow-up commit; exact SHA returned in release response and available from `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| Production | https://king-640-060.github.io/fitlog-lite/ |
| Application Actions | [36978286625](https://github.com/king-640-060/fitlog-lite/actions/runs/36978286625) — success |

The existing 6c99796 and e46aaf5 commits were preserved. HTTPS Git transport timed out; GitHub Git Data API verified identical commit/tree/blob SHAs and advanced main without force. The report follow-up contains no application change; its deployment serves the same verified assets. The calling release response records the final report commit, remote main and final successful Actions run.

## Delivered behavior

- Food Library, meal recording and assistant camera share one explicit packaging workflow. Two slots: nutrition table required, front optional. Camera uses rear-camera hint; gallery does not force the camera. Library/meal capture selected Food date; assistant captures local Today.
- Native decode → new Canvas → JPEG removes metadata and preserves decoded orientation. Max 20 MiB source, 60M decoded pixels, 1800px long edge, quality .88/.84/.80 as needed, 3 MiB/image, 6 MiB total binary, 9 MiB request. Images/extraction stay in workflow memory and never enter business DB/Backup/Sync/history. Independent first-image privacy acknowledgement explains transmission and provider-controlled retention.
- Existing OpenAI-compatible adapter sends text/image_url parts directly with no tools/history/business data. Vision capability is independent, unknown can try, exact probe or validated extraction can verify support. Only explicit image rejection establishes unsupported. 45s timeout, Stop, no retry/proxy/new dependency.
- Prompt/extraction V1 copies visible label fields with bounded evidence; strict parser rejects malformed results. Missing macros remain undefined; missing energy/name/gram basis requires correction. No 4/4/9, density or whole-package assumptions.
- Per100g/custom/explicit serving gram bases retain grams. Per-package can use explicit g/kg; volume labels require manual gram equivalence. Energy uses exactly 4.184 kJ/kcal and canonical kcal. Explicit kcal wins; a second observed kJ may trigger local discrepancy warning. Shared manual/Vision energy state preserves exact energy through unit-only switches and unrelated edits.
- Editable review → local preview → explicit confirmation. Duplicate name+brand requires Use existing / Update existing / Save as new. Transaction rechecks existing source. Save-only writes Food; save+record uses existing services atomically, retains historical snapshots and prevents double taps. Actual grams starts blank; whole-package shortcut requires a tap. Explicit meal (including Unclassified), shared date picker and future-intake guard remain local.

## Automated Verification

- npm run typecheck: PASS.
- npm test: **377 tests / 38 files PASS**, including frozen legacy compatibility, populate/reopen/migration/Backup, GitHub Sync, AI and existing domain regressions.
- npm run build: PASS.
- GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build: PASS.
- git diff --check: PASS.
- Local 320×812, 375×812, 390×844, 430×932: Food Vision, AI Assistant, Shared Date Picker and GitHub Sync safety browser scripts PASS. Synthetic images, keys, records and mock Provider only.
- Security audit: escaped model output; bearer-only key; bounded safe errors; textual secrets scanned without scanning raster base64 as text; image storage exclusions; no native business date inputs/UTC date truncation/new dependencies.
- Frozen legacy fixtures, business database/schema, Backup/Restore/Sync and package files unchanged.

### Pages assets

| Asset | Bytes | Vite gzip | SHA-256 |
| --- | --- | --- | --- |
| index-BQv77Iqt.js | 655765 | 210.34 kB | 9acc8a0ac4366cdd006d2bebb7db5f952efc739f5195211c19300003fab3f0a7 |
| index-C2fNovyN.css | 98569 | 17.90 kB | 34c8770f0b60582f5c34240ca849ad34ef7f6c42fdc894a10209098fc3e90c4d |

PWA precache: 17 entries / 771.97 KiB. Existing >500kB JS chunk warning remains.

## Production Verification

- Application Actions and Pages deployment at END_COMMIT: success. Live JS/CSS bytes and SHA-256 match the verified Pages build exactly.
- 390×844 / 430×932 mock Vision workflow PASS, including camera/gallery attributes, review, kJ conversion, save-only/save+record, user edits, duplicates and historical snapshots, actual dinner/date, Stop/errors, unknown/unsupported capability and manual/offline paths.
- Complete 105g/per100g/1980kJ/P9.2/C61.3/F21 mock example PASS at both sizes: canonical 473.23135755258124 kcal; 50g record 236.61567877629062 kcal. Missing macro/energy and mL guard covered separately.
- Production AI Assistant, Shared Date Picker and GitHub Sync safety regression at both sizes: PASS. Five main views, AI Settings and GitHub Sync entry: PASS; no page errors.
- **Cross-deploy preservation PASS:** same persistent synthetic browser profile before/after deployment; new workflow loaded under Service Worker; all 14 stores / 15 frozen records exactly unchanged. Stable fitlog-lite-db identity / Dexie V7. No database reset during upgrade. The new verifier's asynchronous-DOM/hidden-input waits were corrected in this report follow-up.

## Versions and compatibility

- DB identity fitlog-lite-db; Dexie V7 /14 stores, no migration.
- Backup V7; Restore V1–V7; GitHub Sync Envelope V1.
- AI Config V1; AI System Prompt V1; Food Vision Prompt / extraction V1.
- Food/FoodLog/Targets/imports/Reports/tools keep canonical kcal, local business dates, unknown macro semantics and historical snapshots.
- Bottom navigation remains exactly Today / Plan / Food / Workout / Progress. Progress remains Trend / Calendar / Reports; Calendar day details and weekly/monthly Reports retain their existing meanings. Nutrition Completion and manual encrypted GitHub Sync remain available.

## Manual Device Verification / remaining risks

- Real Provider: **Pending**, no real API Key used. Mock production tests do not establish real image transcription quality or CORS compatibility.
- Physical iPhone Safari and installed PWA: **Pending** for camera/photo-library return, orientation/HEIC, keyboard, Safe Area, energy units and save+record.
- HEIC relies on native browser decoding. Evidence checks only numeric/unit consistency; user review is still required. Existing large JS bundle warning remains.

## ChatGPT Baseline

Read AGENTS.md → LATEST_DEV_REPORT.md, then UI_INTERACTION_SPEC / AI_ARCHITECTURE for relevant work. Current production application baseline is 508057ca0f955859975a89dae68efee368378bcc with this report/verification follow-up on main. Food Packaging Vision is released and shared across three entries, with two image roles, device-only privacy acknowledgement, deterministic nutrition/unit handling, explicit duplicate selection and atomic ordinary Food/FoodLog writes. 377 tests/38 files PASS; production mock QA and cross-deploy 14-store preservation PASS. No schema/dependency changes. Real Provider and physical iPhone remain Pending. Keep all data preservation contracts.
