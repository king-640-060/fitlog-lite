# FitLog Lite Development Report

## Latest production round — Video Feature Retirement + Motion & Visual Polish

- START_COMMIT: `37e1fa9ca1edb8a8489bad73fd350b86860f5e83` (clean, synchronized main).
- APPLICATION_COMMIT: `d7c481e7b99148cec4f98e102afc795ea8fae0f9`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37454240292 — success, including Pages deploy.
- END_COMMIT: the report-only commit containing this file. Its exact SHA, final Actions and identity/preservation receipts are recorded externally to avoid self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Permanent product retirement

**Training Video Search retired by product decision.** Do not restore its former providers, settings, tools, cards or fast router from historical context.

Removed search_training_videos definition/registration/environment/callback/artifact, direct trainingVideoIntent routing, YouTube/Bilibili providers and parsers, videoCards/videoSearchSettings, exclusive CSS, video fixture and dedicated feature suites. General AI safety/duplicate READ behavior migrated to retirement regression; generic Voice/STT/chat/TTS cases remain. AI Settings has no video group/divider. Assistant supports text, Camera, Voice, proposals and TTS. The prompt explicitly forbids claims of live external web/video search or fabricated live links, while permitting ordinary exercise explanations.

Startup retireLegacyVideoSearchStorage removes exactly these device-only keys, idempotently and safely when storage is restricted:

- fitlog-video-search-config-v1
- fitlog-video-search-config-v2
- fitlog-video-search-key-v1
- fitlog-video-search-bilibili-key-v2
- fitlog-video-search-privacy-ack-v1
- fitlog-video-search-privacy-ack-v2

No wildcard, storage.clear, DB reset, business write or PWA reinstall. knownSecrets retains AI credentials, independent Voice key and GitHub token protection; the retired video scanner is removed. Backup and canonical encrypted Sync data remain unchanged. docs/VIDEO_SEARCH.md is deleted. Remaining retired-name occurrences are negative regressions, cleanup whitelist, no-search prompt and durable retirement documentation.

## Shared interaction and visual contract

Tokens: instant80ms, fast120ms, normal160ms, sheet200ms; standard cubic-bezier(.2,0,0,1), emphasized cubic-bezier(.2,.8,.2,1). Toast entrance180ms and true-recording dot1300ms are bounded semantic exceptions. No new dependencies.

Primary uses existing lime/accent-pressed; secondary/icon press uses neutral surface; danger remains coral. Disabled has no transition, hover stays fine-pointer only, keyboard focus remains visible. No global button/card scale or bounce.

Bottom Nav remains connected across renders, with shared160ms background/text feedback and no icon translation. Page entrance opacity.96→1/Y4→0 occurs only for a genuine main-tab change; same-tab refresh/autosave/domain updates skip it. Plan/Progress keep actual tab controls mounted while replacing content; shared underline opacity/scaleX.75→1 and text colors are reversible. Async render generations prevent stale view publication.

Choice/chip colors and selected grammar share accent-soft/strong. Existing native input switches keep accessibility; no custom gesture added. Task completion and reversal animate only saved-state circle/check/title color; Habit check/uncheck animates internal check after persistence. Calendar selected number retains lightweight transition and independent Today marker, without grid/month animation.

Sheet entrance stays200ms/Y16/opacity.85; existing shared controller owns keyboard, lock and cleanup. Task date, AI/Voice settings, Habit manager/editor and strategy date/variant subviews keep outer frame height/scroll and animate only inner content by4px/160ms; Back reverses direction. Native disclosure layout is immediate, opted-in child content fades/Y3 without height:auto tricks. Training Journal add/edit controls expand/collapse and preserve the mounted draft.

New AI user/assistant text animates once per item ID; streaming deltas and historical reopening do not replay. Proposal status gets small text/color feedback, no card bounce. Only true listening shows a6px breathing dot; cancel/stop clears it. TTS has quiet state feedback only. Toast enters5px/180ms and exits opacity120ms with removal after actual completion. Nutrition/Weight numbers and rings show final values immediately; no targeted number/ring animation was added.

Reduced motion cancels active owned animations and disables decorative transitions/recording breathing. Animation replacement, finish/cancel and pagehide release owned handles; no persistent inline animation styles or perpetual decorative RAF.

Fresh Green, warm background, typography and five-tab IA retained. Plan chips use existing12px controls, selected Cardio/report/weight choices share accent-soft/strong and quiet border. Segment decorative shadow removed; Habit empty-state sole create is primary. Common inline icons normalized to16/18/20px, preserving semantic large icons. Existing section hierarchy and grouped quiet borders audited; no broad card redesign.

## Public reference research

Attempted public Douyin https://www.douyin.com/jingxuan/sy and Bilibili https://www.bilibili.com/; stable automated mobile interaction observation was unavailable, so no claim of verified native brand animations.

Read GitHub https://github.com/argyleink/gui-challenges and the relevant motion sections of https://web.dev/articles/building/a-switch-component, https://web.dev/articles/building/a-tabs-component and https://web.dev/articles/building/a-toast-component. Applied native state ownership, local feedback, finite short transitions and reduced-motion preference. No brand palette/code copying, library, custom page gesture, spring, glow, parallax, 3D, confetti, count-up, continuous ring or decorative infinite RAF.

## Automated verification

- npm run typecheck: PASS.
- npm test: **648 tests /58 files PASS**. New retirement6 and motion3 regressions cover exact cleanup, protected credentials/business stores, Backup/Sync equality, absent registry/tool/artifact/fast path and motion lifecycle/tokens/reduced behavior.
- GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build: PASS, clean local:false application identity. Existing Vite large-chunk advisory remains.
- git diff --check: PASS.
- Local browser: **19/19 PASS**. Production browser: **19/19 PASS after targeted reruns**; original failures retained. Initial GitHub Sync setup timeout, Nutrition Strategy network-suspended navigation and DietEvent screenshot timeout were followed by successful isolated full-suite runs; no assertion was removed to make them pass.
- Inventory: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion, motionPolish.
- motionPolish:24 contexts =320/375/390/430 ×100/120/140% ×normal/reduced, locally and production. Every context runs20 Bottom Nav,20 Plan and20 Sheet cycles, Habit check/uncheck, Task completion/reversal, stable Task/Voice subviews, once-only SSE text/history, true mock capture/cancel and Calendar selection. Native transitionrun/actual intermediate state confirms mounted controls animate. Final DOM/data/ARIA, no residual styles/locks/blocked pointer or overflow checked.
- Existing release suites cover all20 requested surfaces, Food date rail, Journal draft expand/collapse, libraries, reports, strategy, Sync and Backup/Restore. New motion/voice matrices use all4 widths; several existing production suites use390/430. Mock keyboard/safe-area/capture do not prove physical iPhone behavior.
- Reviewed production20-screen contact sheet plus320/140 Voice/Task/AI and representative390/100/430/100 before/mid/final captures. True Calendar Day Detail locator corrected; no test weakening.

## Preservation and production

DB DexieV10 /IndexedDB100 /18 stores, BackupV10, RestoreV1–V10, SyncV1/envelopeV1, AIConfigV1 and device-only VoiceConfigV1 unchanged. VideoSearchConfig is retired, not an active config version. No business schema/Backup/Restore/Sync/timer-engine change.

Original persistent synthetic profile /tmp/fitlog-vision-release-profile reused without business reseeding, Restore, clearing or reinstall.18 stores/15 rows preserved, four additive stores remain empty. Business SHA256 `376af70c86fcdc278808300ffe1d5744cd74d9ef489ee2203b6f78d54cffe64a`; protected AI/Voice/GitHub configuration SHA256 `f78010eca61b27311ee1e62144ccb9efbf0d5d12fd30519ecab15ceb6ca39f7a` unchanged before/after. All six old video keys absent. Frozen legacy AI/Voice and Food Vision preservation gates PASS; offline cold boot PASS.

Initial same-process adoption and first cold preservation probe still loaded37e1fa9 and failed; retained failures are not counted as passes. Native update, closing old scope clients, waiting for expected active worker with zero clients, then fresh release-query navigation adopted the application. Subsequent ordinary root navigations, strict hashes and offline reload pass. No cache/site-data deletion. Physical installed-PWA update timing remains unverified.

Production HTML build meta/build-info local:false, JS/CSS exact bytes/SHA256 and SW/precache match clean application build; five-tab/AI Settings/Sync smoke PASS. Report-only END repeats Actions/Pages, exact asset identity and the same-profile retirement/AI/Food Vision/offline gates, with receipts stored externally.

## Evidence and remaining verification

External evidence:
`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/work/artifacts/video-retirement-motion-2026-10-06/`

Contains exact43 application paths, full65-item release report, original failures, accepted reruns, matrices, Actions/identity/preservation and focused screenshots. END adds only this report.

Physical iPhone Safari: **Pending**. Original installed PWA: **Pending**. Real STT/CORS/codec/system mic-indicator and launcher storage-context verification remain Pending. Retired video provider/playback categories are removed from active QA. No confirmed unresolved software defect after final automated checks; these physical/real-service limits are open.

## ChatGPT Baseline

START37e1fa9ca1edb8a8489bad73fd350b86860f5e83; APPLICATIONd7c481e7b99148cec4f98e102afc795ea8fae0f9; END this report-only commit. Training Video Search permanently retired, exact six device-only keys safely cleaned; AI/Voice/GitHub and all business history retained. Shared80/120/160/200ms motion, mounted nav/tabs, saved Task/Habit checks, stable Sheet subviews, once-only streamed text, true-capture dot, reduced-motion ownership cleanup; Fresh Green unchanged.648/58 unit PASS, typecheck/build PASS, local19/19 and production19/19 after preserved transient-failure reruns. DBV10/100/18, BackupV10/Restore1–10, Sync/envelopeV1, AIConfigV1/VoiceConfigV1 unchanged. Same-profile hashes/offline PASS; physical Safari/original installed PWA Pending. Never restore retired video functionality from older reports.
