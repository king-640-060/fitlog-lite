# FitLog Lite Development Report — Food Packaging Vision

Verified date: 2026-10-02 (Asia/Shanghai).

The continuation was audited against the existing local implementation. The two earlier commits were preserved. Minimal acceptance fixes added image roles, first-transmission privacy acknowledgement, duplicate resolution, exact canonical-energy state, optional secondary kJ review, explicit unclassified meal, offline/manual handling and additional regression coverage.

## Commit and release identity

| Field | Value |
| --- | --- |
| START_COMMIT (continuation) | e46aaf5b29e989a992239619a8101e41ecf9f9f2 |
| Original Vision production baseline | a677eca53d2653c7764b845b365d075dced2481a |
| AI_VISION_COMMIT | 6c99796f2147d20c3f7baeee234361433ff1ee67 |
| FOOD_VISION_IMPORT_COMMIT / APPLICATION_COMMIT | 6c99796f2147d20c3f7baeee234361433ff1ee67 |
| Original local report commit | e46aaf5b29e989a992239619a8101e41ecf9f9f2 |
| VISION_FIX_COMMIT / END_COMMIT | 508057ca0f955859975a89dae68efee368378bcc |
| Final report commit | This report / verification-harness commit; resolve via `git log -1 --format=%H -- LATEST_DEV_REPORT.md`. Its SHA is returned in the release response. |
| Production application | 508057ca0f955859975a89dae68efee368378bcc; any following report-only build serves the same verified JS/CSS |
| Production URL | https://king-640-060.github.io/fitlog-lite/ |

Git HTTPS pull/push timed out. GitHub Git Data API rechecked the remote parent, created identical blobs/trees/commits, verified exact SHAs and advanced main without force. Original local commits were not reset, amended or squashed. Final remote/local main equality is checked after report publication.

## Complete acceptance fields

| # | Field | Verified behavior / evidence |
| --- | --- | --- |
| 1 | START_COMMIT | Continuation e46aaf5b29e989a992239619a8101e41ecf9f9f2; original production baseline above |
| 2 | AI_VISION_COMMIT | 6c99796f2147d20c3f7baeee234361433ff1ee67 |
| 3 | FOOD_VISION_IMPORT_COMMIT / APPLICATION_COMMIT | Same combined implementation commit 6c99796f2147d20c3f7baeee234361433ff1ee67 |
| 4 | VISION_FIX_COMMIT | 508057ca0f955859975a89dae68efee368378bcc |
| 5 | END_COMMIT | 508057ca0f955859975a89dae68efee368378bcc |
| 6 | FINAL_REPORT_COMMIT | Report / verification-harness commit containing this report; full SHA in final response |
| 7 | main HEAD | Final report / verification-harness commit, descendant of END_COMMIT; full SHA in final response |
| 8 | production HEAD | Final successful report-only deployment, same application assets as END_COMMIT; full SHA in final response |
| 9 | Vision protocol | Existing OpenAI-compatible Chat Completions: text/image_url, local JPEG/PNG data URLs, detail high; no tools/history/SDK/proxy |
| 10 | visionCapability | Independent of tools; legacy missing→unknown; unknown may try; valid extraction/exact 731 probe→supported; explicit image rejection→unsupported; network/429/5xx/timeout never establish unsupported. Routing/model/key changes reset both. |
| 11 | Camera support | Both image slots: accept=image/*, capture=environment; browser attribute/workflow QA PASS, real iPhone Pending |
| 12 | Gallery / photo library | Both slots: accept=image/* without capture; same preprocessing/workflow; browser PASS |
| 13 | Max images | Two; nutrition-table slot required, package-front optional; front alone cannot send |
| 14 | Preprocessing | Native decode → resize → new Canvas → JPEG; source ≤20 MiB; decoded ≤60M pixels |
| 15 | EXIF stripping | Synthetic orientation-6 JPEG tested through actual UI; clockwise orientation retained and EXIF removed from re-encoded output |
| 16 | Image dimensions | Long edge ≤1800px; no upscale; dimensions below 32px rejected |
| 17 | JPEG quality | .88; .84 then .80 only when needed by final-size bound |
| 18 | Payload limits | ≤3 MiB per encoded image; ≤6 MiB total binary; ≤9 MiB serialized request, checked before fetch; 45s timeout, no automatic retry |
| 19 | Original image persistence | Original/processed images and extraction/evidence only in workflow memory; no business DB/localStorage/Backup/Sync/history/reports; source object URLs revoked, close aborts and drops references |
| 20 | Vision prompt version | AI_FOOD_VISION_PROMPT_VERSION=1 |
| 21 | Extraction JSON | fitlog-food-label V1; strict exact shape, bounded finite nonnegative values/enums/strings; pure JSON or one complete fence. Optional energyKj retains a second observed energy. |
| 22 | Evidence | ≤100 characters; numeric/unit witness checked; expandable escaped text. Cannot prove real transcription quality; user must review. |
| 23 | Missing fields | Name/reference grams/energy require correction; optional brand blank; missing macros→undefined, never zero; no macro-derived calories |
| 24 | per100g | referenceGrams=100; net content cannot replace basis |
| 25 | per-serving | Explicit gram amount (including 105g) retained; otherwise user supplies grams; custom 30g supported |
| 26 | per-package | Explicit package gram basis or clearly observed net g/kg when no conflicting volume basis; kg×1000 locally |
| 27 | per100mL safety | No mL→g/density assumption; explicit gram equivalence required; volume net quantity does not become grams |
| 28 | kJ/kcal | Deterministic 1 kcal=4.184 kJ; direct explicit kcal preferred; secondary kJ discrepancy above max(1 kcal, 5%) warns without blocking correction |
| 29 | Canonical kcal | Food, FoodLog snapshots, imports, Targets, Reports and AI tools remain kcal; no schema or semantics change |
| 30 | Food editor units | Same canonical EnergyEditor in manual/Vision forms; unit-only switching and unrelated edits preserve exact energy; numeric edits convert locally |
| 31 | Duplicates | Normalized name+brand; current/recognized summaries; explicit Use existing / Update existing / Save as new; transaction source recheck; no silent duplicate or historical rewrite |
| 32 | Save-only | Ordinary Food created/updated/reused; no FoodLog; completed flow returns to refreshed Food Library |
| 33 | Save+record | Captured local date/meal; explicit grams; shared date picker; general meal starts blank and includes explicit Unclassified; future factual intake blocked |
| 34 | Transaction | Existing saveFood/logFood in one foods+foodLogs transaction; both-or-neither for create/update; deduplicated confirmation, cancellation/stale-source guard |
| 35 | Whole package | Actual grams initially blank; tap-only shortcut for observed net g/kg; local calorie/macro preview via calculateNutrition |
| 36 | Food Library entry | 拍包装录入, including empty library; camera/gallery available |
| 37 | Meal picker entry | 拍包装并记录, including empty library; dinner context retained; successful record closes sheet, refreshes and toasts 已记录 |
| 38 | Assistant entry | Camera icon with 拍包装录入 aria label opens the same workflow; local Today captured; text assistant regression PASS |
| 39 | Privacy | Separate fitlog-ai-vision-privacy-ack-v1; first actual packaging request requires 我知道了; explains provider transmission, local metadata removal and provider-dependent retention |
| 40 | Security audit | Keys only Authorization; textual model/messages/tools/schema scanned; validated raster base64 exempt from textual substring scan; XSS escaped; model cannot control image src; no native date input/UTC business-date truncation/new dependencies; no image business persistence |
| 41 | Tests / files | 377 tests / 38 files PASS; focus aiVisionFood, foodVisionImport, energy, aiProfiles plus existing frozen-V7, reopen/migration/population, Backup/Sync and all domain regressions |
| 42 | Typecheck | npm run typecheck PASS |
| 43 | Build | npm run build PASS |
| 44 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS |
| 45 | Bundle JS/CSS | index-BQv77Iqt.js 655765 B (Vite gzip 210.34 kB); index-C2fNovyN.css 98569 B (Vite gzip 17.90 kB). Existing >500kB chunk warning. |
| 46 | Actions run | [36978286625](https://github.com/king-640-060/fitlog-lite/actions/runs/36978286625) — success |
| 47 | Production verification | 390×844 / 430×932 mock Vision, AI Assistant, Shared Date Picker and GitHub Sync safety PASS; five main views/settings/sync entry PASS; live asset SHA-256 exact match |
| 48 | Cross-deploy preservation | Same synthetic persistent browser profile before/after deployment: fitlog-lite-db V7, all 14 stores / 15 frozen records compared exactly, PASS; no DB reset between phases |
| 49 | Real Provider | Pending: no real Key used; production recognition QA uses explicit mock/interception |
| 50 | Physical iPhone | Pending: Safari + installed PWA camera/gallery/camera return/orientation/keyboard/units/save+record |
| 51 | Versions | fitlog-lite-db; Dexie V7 / 14 stores; Backup V7; Restore V1–V7; Sync Envelope V1; AI Config V1; System Prompt V1; Food Vision Prompt/extraction V1 |
| 52 | Remaining risks | Real model accuracy/CORS and physical device behavior unverified; HEIC depends on browser decode; existing large JS bundle warning. Evidence validation is consistency checking, not proof the model read correctly. |

## Automated Verification

- Typecheck, 377/38 complete tests, normal build, Pages build and git diff --check: PASS.
- Food Vision browser QA: 320×812, 375×812, 390×844, 430×932 PASS. Mock provider only, synthetic images/secrets/business records. Includes two image roles, EXIF orientation/stripping, gallery attributes, unknown Vision with tools/scopes/writes disabled, missing name/energy/macros, local kJ conversion, explicit duplicate update, immutable snapshots, explicit Unclassified, whole-package tap, captured dinner/date, save-only/save+record/cancel/double tap, shared-date cancellation, error/CORS/Stop, late profile changes, offline recognition guard/manual Food and exact manual energy preservation.
- AI Assistant, Shared Date Picker and GitHub Sync safety browser regression: all four local sizes PASS.
- Frozen legacy fixtures, database definitions, Backup/Restore/Sync schemas and package files unchanged.

## Production Verification

- Application deployment [36978286625](https://github.com/king-640-060/fitlog-lite/actions/runs/36978286625): success, including typecheck/tests/build/deploy. GitHub Pages deployment 6803454325 at application SHA 508057ca0f955859975a89dae68efee368378bcc: success.
- 390×844 / 430×932: Food Vision mock workflow, AI Assistant mock regression, Shared Date Picker and GitHub Sync safety PASS. No real Provider Key or personal photo was used.
- The requested complete mock example (红烧牛肉面, 测试品牌, net105g, per100g, energy1980kJ, protein9.2g, carbs61.3g, fat21g) also passed both production sizes. Food canonical energy 473.23135755258124 kcal; actual 50g FoodLog 236.61567877629062 kcal, P4.6/C30.65/F10.5. Grams starts blank and whole-package105g requires an explicit tap; local 2026-10-02/dinner retained.
- Live JS/CSS bytes and SHA-256 equal the locally verified final Pages build. Five Today/Plan/Food/Workout/Progress views, AI Settings and GitHub Sync entry loaded without page errors.
- Before deployment, the dedicated `/tmp/fitlog-vision-release-profile` held frozen synthetic V7 data. After deployment, it actually opened the new Vision workflow under its Service Worker, then read all 14 stores and compared all 15 records exactly: PASS. No business DB clearing/restoring was performed after setup or during deployment.
- The final report also corrects two waits in the new preservation harness: wait for the asynchronous library DOM before checking its entry, and wait for the intentionally hidden camera file input to be attached rather than visible. These were test-observer errors, not application data or cache-update failures. Application assets remain unchanged by this follow-up.

### Verified Pages asset SHA-256

- index-BQv77Iqt.js: 9acc8a0ac4366cdd006d2bebb7db5f952efc739f5195211c19300003fab3f0a7
- index-C2fNovyN.css: 34c8770f0b60582f5c34240ca849ad34ef7f6c42fdc894a10209098fc3e90c4d

## Manual Device Verification

Real Provider and physical iPhone Safari/installed PWA are Pending, separate from automated and production mock QA. No actual camera/photo-library OS permission, HEIC support or real Provider OCR/CORS claim is made.

## ChatGPT Baseline

Continue from current production main; application baseline 508057ca0f955859975a89dae68efee368378bcc, followed only by the release report. Read AGENTS.md → LATEST_DEV_REPORT.md; UI work also reads UI_INTERACTION_SPEC and AI work AI_ARCHITECTURE. The Food packaging workflow is complete and released: two-role photos, direct Vision extraction, deterministic energy/basis, editable review, duplicate selection and atomic ordinary Food/FoodLog writes. No migrations/dependencies. 377 tests/38 files PASS. Preserve canonical kcal, unknown macros, local business dates, snapshots, frozen V7 compatibility and manual encrypted GitHub Sync. Real Provider/physical iPhone remain Pending.
