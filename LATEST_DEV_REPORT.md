# FitLog Lite Development Report

## Latest production round — Training Video Search + contextual DietEvent

- START_COMMIT: `567c9f2e2e5d164f6bfacbb23877e65666dd03f4`.
- APPLICATION_COMMIT: `136a27b2b13237d642942e5f45a51c32832aaff6`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37162831041 — success.
- Pages deployment: `6834567346` — success, environment URL https://king-640-060.github.io/fitlog-lite/.
- END_COMMIT: report-maintenance commit after this file is published. The application SHA and report SHA are intentionally separate.

## Product result

### Training Video Search

1. Provider is an app-owned YouTube Data API v3 `search.list` READ adapter. The model never constructs a video URL.
2. `search_training_videos(query, limit)` is exposed only when the existing READ permission environment allows the tool. Query bounds are 120 characters, 1–5 results, fixed exercise-keyword validation, no URLs, digits, private health context or known secrets.
3. Configuration is device-only: `fitlog-video-search-config-v1`, `fitlog-video-search-key-v1`, and independent `fitlog-video-search-privacy-ack-v1`. The Key is not in DB, Backup, Sync, AIConfig, prompt, rendered text or logs; it is included in known-secret guards. The saved form is blank after save. Browser storage cannot make a browser Key a backend secret, which the UI discloses.
4. Transport uses `X-Goog-Api-Key`, `credentials: omit`, `cache: no-store`, `redirect: error`, strict origin referrer policy, timeout, AbortSignal, bounded response reading and fixed safe errors. Provider HTML and thumbnail URLs are not trusted. Strict 11-character IDs produce local watch/embed/thumbnail URLs.
5. Typed, memory-only video artifacts render as plain app-owned cards with text title/channel, fallback thumbnails, max five results and 44px actions. The model receives bounded metadata only; no iframe or HTML is returned to it.
6. Playback is click-to-load using the official YouTube IFrame API and `youtube-nocookie.com`, no autoplay, inline/fullscreen enabled, source Referer preserved, one active player, destroy on switch/clear/close, fixed error and timeout fallback.
7. Automated browser mocks cover widths 320/375/390/430 and font scales 100/120/140, 1/3 results, long Chinese/English titles, thumbnail failure, player switch, close/reopen, clear, provider failure, player error/timeout, pending search Stop/close abort and duplicate tool-call IDs. Receipt: 29 states × 4 widths locally; production 29 states × 2 widths. Real YouTube Key/provider test: **Not performed**. Physical playback: **Pending**.

### Contextual DietEvent

1. `DietEvent` is independent contextual data: `date`, `kind: indulgence`, `scope: MealType | day`, optional note, optional manual estimate, optional photo range/final estimate/source, timestamps and stable id. It never becomes FoodLog, NutritionTarget, report total, score, compensation or chat write.
2. Dexie version 10 / IndexedDB version 100 adds exactly one empty `dietEvents` store; all 17 existing stores, indexes and snapshots remain unchanged. Migration does not infer or seed events. Backup schema is V10; Restore accepts V1–V10, validates all data before one 18-store replacement transaction and rolls back on injected failures. Sync/envelope V1 and AIConfig V1 remain unchanged.
3. Food supports mark-only or multiple meal events, independent day events, note and optional manual `约 … kcal`; day events disable photo estimates and do not delete meal notes. Calendar has a sixth restrained flame marker, accessible 放纵餐/放纵日 labels, accurate overflow and a priority rule that keeps the DietEvent marker visible within four icons. Day Detail includes separate editable contextual cards and does not mix estimates into nutrition rows.
4. Meal Photo Estimate is a separate, explicitly confirmed Vision route using the active profile's existing image adapter and a strict four-field parser. It accepts at most two local Canvas-reencoded images, stores no image, only fills a draft after review, requires explicit Save, preserves the original range and final value, and clears the draft when converting meal scope to day. Packaging-label Vision remains separate.
5. AI nutrition READ day/range context includes bounded DietEvent notes/ranges with `contextualOnly` and possible overlap flags; canonical calories/macros still come only from FoodLog snapshots. NutritionTarget and Nutrition Strategy are untouched.
6. Automated browser mocks cover widths 320/375/390/430 and font scales 100/120/140, mark-only, multiple meals, day scope, long notes, keyboard bottom, photo consent/camera/gallery, strict Vision response, review/draft/save, malformed response, Stop/close abort preservation, day conversion, Calendar ordinary/crowded/detail/delete/historical date and unchanged canonical totals. Receipt: 64 states × 4 widths locally; production 64 states × 2 widths. Physical camera/gallery: **Pending**.

## Data and preservation

- Original persistent synthetic profile: 14 legacy stores / 15 records preserved; AI configuration/key/voice acknowledgement hashes unchanged; four additive stores are empty after migration; no reseed, clear, Restore or reinstall. Offline cold boot passes.
- Frozen V9→V10 fixture, reopen/populate, Backup V1–V10, restore validation/rollback and encrypted Sync V1/hash tests pass. No real user data or credentials were used.
- Existing Today Training, FoodLog snapshots, Nutrition Targets/Strategies, Backup/Restore, Sync, AI Voice/Streaming, Vision packaging workflow and all other prior modules remain within their existing contracts.

## Verification

### Automated Verification

- `npm run typecheck`: PASS.
- `npm test`: **633 tests / 55 files PASS**.
- `npm run build` and Pages build: PASS. Existing Vite advisory about a >500 kB minified chunk remains.
- Local original release suites: 14/14 PASS; new Video Search and DietEvent suites PASS.
- Production deployment suites: 16/16 PASS, including exact asset, UI quality, preservation and offline checks.
- Screenshot review: 320/140%, 390/100%, 430/100% Food, Calendar and AI states inspected. Long Food notes use a three-line preview while Day Detail retains full text; no horizontal overflow, orphaned action text, player overflow or hidden DietEvent marker.

### Production Verification

- Production URL: https://king-640-060.github.io/fitlog-lite/.
- Production JS/CSS bytes and SW precache match the local build for APPLICATION_COMMIT; App/SW build identity, scope and network deployment match. Main views, AI settings and GitHub Sync entry pass.
- Native SW 390/430 offline cold-page and exact PWA upgrade/preservation checks pass.
- Actions and Pages for APPLICATION_COMMIT are successful.

### Manual Device Verification / remaining issues

- Physical iPhone Safari: Pending.
- Original installed PWA: Pending.
- Physical YouTube playback with a real restricted Key: Pending; no real provider call was made in this round.
- Physical meal-photo camera/gallery: Pending.
- No confirmed unresolved automated or production defect.

## ChatGPT Baseline

From START `567c9f2e2e5d164f6bfacbb23877e65666dd03f4`, APPLICATION `136a27b2b13237d642942e5f45a51c32832aaff6` adds app-owned YouTube training-video search with typed click-to-load official playback and independent contextual DietEvent/meal-photo estimate flows. DBV10/IDB100/18 stores, BackupV10, RestoreV1–V10, SyncV1/envelopeV1 and AIConfigV1 boundaries hold. `npm test` 633/55, typecheck/build PASS, local and production browser suites PASS, screenshots and synthetic data/PWA preservation verified. Real YouTube provider, physical Safari/PWA, physical playback and physical camera/gallery remain Pending.

## External release receipt

The complete 37-item answer matrix, receipt JSON, screenshots and browser logs are stored in the task artifact directory:
`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/artifacts/video-search-diet-events-2026-10-04/`.
