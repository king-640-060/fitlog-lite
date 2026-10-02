# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

Interaction & Visual System Stabilization is complete and released. Full 52-field acceptance report: [INTERACTION_VISUAL_DEV_REPORT.md](docs/INTERACTION_VISUAL_DEV_REPORT.md). Durable rules: [INTERACTION_VISUAL_SYSTEM.md](docs/INTERACTION_VISUAL_SYSTEM.md).

| Identity | Value |
| --- | --- |
| START_COMMIT | ee446bf4fb01a0a1e9fd0bdabbe63b7185143ddc |
| INTERACTION_STABILIZATION_COMMIT | 76c9e8fec46eb9a37a0569a684ecfb91643c9ac5 |
| AI_UI_SIMPLIFICATION_COMMIT | 624353c1d07b56d4a7610a7c7f2eef29c7c33281 |
| VISUAL_SYSTEM_COMMIT | 0af568c478cad26299a976962e1178a4f138b62c |
| END_COMMIT / last application | 832f812aef96d0238dc93dbc6339e10f883f5c09 — final service/permission summary layout |
| Verified application deployment HEAD | 4a83b1178f56e53aaafaa2ebe2c2bf876a1f2582 — only persistent verifier strengthened; same END application assets |
| Application Actions | [36986639166](https://github.com/king-640-060/fitlog-lite/actions/runs/36986639166) — success |
| Report/main HEAD | This report commit; exact SHA is returned in the release response and available from `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| Production | https://king-640-060.github.io/fitlog-lite/ |

Git HTTPS push timed out. GitHub Git Data API verified identical blob/tree/commit SHAs and advanced main without force. Original history was preserved. Intermediate Actions were superseded by concurrency; the application-verification deployment completed. The report deployment serves the same verified app assets, with its final main/deployment/Actions recorded in the release response.

## Delivered behavior

- Explicit pointer/keyboard modality. Touch controls have no persistent keyboard outline or input glow; keyboard controls retain 2px focus. Initial Sheet focus is its title, with no input/X autofocus. Hidden Habit controls follow the same policy. Hover requires a fine hover pointer; controls use quiet background/color/opacity presses.
- Shared native Sheet lifecycle: one primary, normal close/once-only cleanup before replacement, native confirmations above the preserved Sheet, title/keyboard trigger focus, reference-counted background lock and original scroll restoration. Native cancel can return from a date subview. No duplicate AI/Vision viewport listeners.
- One VisualViewport coordinator, shared height/offset/bottom/overlap variables, stable header and independent body/assistant conversation/composer. Bottom-nav hiding does not change page padding. Content/form/large/assistant variants share Safe Area handling. Backdrops are RGBA with no blur.
- Ordinary page updates, nutrition values/rings and charts display final states without entrance/count/pulse replay. Sheet/toast motion stays bounded; native rail/timer functional updates remain.
- AI Settings shows the current service first, with permissions, profiles and long privacy details in subviews. No profile opens Provider/Key/Model connection. Zhipu hides its preset root normally; Custom and advanced endpoint edits stay generic. Explicit exact `/models` selection preserves missing current IDs and has an always-available/manual-on-error fallback.
- Save and Test saves locally then probes Chat, Tools, Vision independently. Stale root/key/model/subview/close work is aborted/ignored. Advanced single probes and save-only remain. Keys stay empty in saved edit-form values.
- Assistant has quiet header controls, readable provider/model, compact chat-only notice and safe errors, two-column suggestions and a fixed-width Send/Stop slot. HTTP400 gives parameter/model/interface guidance; raw errors stay hidden. IME, Stop, camera, near-bottom scroll, memory session, actual tools/proposals/permissions/writes are preserved.
- Neutral secondary actions and management surfaces, flat 16–18px cards, 12–14px controls, 26px sheets and two shadow tokens refine Fresh Green. Smaller delete/reorder/summary controls were enlarged; metadata and AI summary rows remain readable at320px. No dependency/framework was added.

## Automated Verification

- Baseline: **377 tests /38 files PASS**; final: **384 tests /39 files PASS**.
- npm run typecheck, npm test, npm run build, Pages build with GITHUB_REPOSITORY, git diff --check: PASS.
- 320×812 /375×812 /390×844 /430×932: Interaction Stabilization, Assistant, Food Vision, Shared Date Picker and GitHub Sync Safety browser scripts all PASS. Synthetic images/credentials/records and mocked provider only.
- Added modality/keyboard/caret/IME, viewport geometry, forbidden CSS/rAF/static boundary, neutral primitive and HTTP400 regressions. Existing frozen V7/history/Backup/Restore, Nutrition Completion, AI orchestrator/tools/proposals/security, Vision and Sync pass.
- Full interaction audit is documented in INTERACTION_VISUAL_SYSTEM. Legitimate rAF/scroll exceptions are native Food Rail visual scheduling/centering and the actual pelvic timer/explicit meal picker. No user-facing native date inputs.
- Business DB/schema, existing business/AI execution services, package files and frozen fixtures remain unchanged except the safe Provider HTTP400 message.

### Pages assets

| Asset | Bytes | Vite gzip | SHA-256 |
| --- | --- | --- | --- |
| index-NzqvkQaX.js | 662972 | 212.52 kB | 477d82869d30fb193b8a479dec2bff473d1377b660e5428d3ebce746d123688f |
| index-C3VM3X0K.css | 101276 | 18.17 kB | 2007bba0d1e0ed695ee8440bea85b61693098967dfee4cc82391c0ce1451fbad |

PWA precache:17 entries /781.65KiB. Existing >500kB JS warning remains.

## Production Verification

- Actions36986639166 and Pages deployment6804934011 at verified HEAD: success. Live asset bytes/hash exactly match the verified Pages build.
- 390×844 /430×932: all five browser suites PASS, including touch/keyboard/title focus, major Sheets/confirmation/subview/Escape/rapid close, viewport mock/scroll restore, current settings/model/partial capabilities, HTTP400/errors/Stop/proposals, Food/Vision/DatePicker/Workout/Progress, offline core and Sync safety. No page errors.
- **Cross-deployment preservation PASS:** same dedicated synthetic persistent browser profile before/after; exact new JS build loaded under the old Service Worker; stable fitlog-lite-db /DexieV7, all14stores /15frozen records unchanged. After check is readonly, without resetting DB.

## Versions and compatibility

DB identity fitlog-lite-db; DexieV7 /14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfigV1; AISystemPromptV1; FoodVisionPrompt/extractionV1. No migrations. Canonical kcal, unknown macros, local business dates and saved snapshots are preserved. Five bottom tabs remain Today/Plan/Food/Workout/Progress; Progress remains Trend/Calendar/Reports.

## Manual Device Verification

- Real Provider: **Pending**, no real API Key used.
- Physical iPhone Safari and installed standalone PWA: **Pending**. Chromium touch/keyboard geometry and Service Worker upgrade verification do not establish physical device behavior.
- Device checklist: X/touch rings; keyboard and reachable last form/save; rapid sheets/background position; settings scrolling; composer/IME/Safe Area; camera/photo-library/rotation return.

## ChatGPT Baseline

Read AGENTS → LATEST_DEV_REPORT → UI_INTERACTION_SPEC → INTERACTION_VISUAL_SYSTEM; AI_ARCHITECTURE for AI changes. Application END832f812aef96d0238dc93dbc6339e10f883f5c09 with verifier/report follow-ups on main. Shared input modality/Sheet lifecycle/viewport are authoritative. No touch ring/global press scale/page or nutrition count/ring/chart replay/backdrop blur. AI settings is current-service-first with permissions/advanced subviews, exact models/manual fallback and independent Save-and-Test. Assistant execution contracts remain unchanged. Fresh Green uses neutral secondary controls, flat cards and clear typography. 384tests/39files PASS; production mock suites and exact14-store preservation PASS. Real Provider/physical iPhone Pending. Preserve all DBV7/BackupV7/RestoreV1–V7/SyncV1/AIConfig+PromptsV1 contracts.
