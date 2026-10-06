# FitLog Lite Development Report

## Latest production round — Habit permanent deletion / owned Voice Mode / reliable video search

- START_COMMIT: `17d305da4ef4f64f23e034482092e93985b1d8ba` (actual clean synchronized main).
- APPLICATION_COMMIT: `cd97a905c034213e4d4f6d203dd661555c91aefa`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37442240091 — completed, success; Pages deploy success.
- END_COMMIT: the report-only commit containing this file. Exact SHA and final Actions/identity/preservation receipts live in the external release report and final response, avoiding self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Product changes

### Habit

`deleteUnusedHabit` retains its existing history protection. Manual editor now always offers quiet danger 删除习惯 below normal save and stop/reactivate. Used habits retain “如果只是暂时不再执行，建议停用以保留历史。” Confirmation includes the actual X checks, permanence and 删除习惯及 X 条记录; no-history copy is unchanged. `deleteHabitWithHistory` verifies existence/count and deletes all owned check-ins plus Habit in one two-store rw transaction. Stale counts require another confirmation; failure rolls back. Manager/Today refresh, future history/report reads omit deleted checks, and unrelated habits remain intact. No AI permanent-delete tool.

### Voice

Primary path is getUserMedia → runtime-supported MediaRecorder MP4/WebM → immediate all-track stop → memory mono WAV → one dedicated official Zhipu GLM-ASR-2512 transcription → final-text engine.send → system speechSynthesis final reply. No ordinary chat model receives raw audio. One VoiceCaptureController owns stream/recorder/chunks/timers/AbortController and cleanup for Stop/cancel/dispose/close/Clear/settings/hidden/pagehide/permission/recorder/transcription/network/timeout/abort. Late callbacks cannot publish or revive capture; AudioContext closes.

Official STT checked2026-10-06: fixed `/audio/transcriptions`, Bearer, multipart model/file/stream=false, JSON text. Official WAV/MP3 limit30sec/25MB; app uses30sec/8MiB and runtime format detection plus in-memory WAV conversion. This follows the documented30sec limit rather than the request's approximate45sec. Actual CORS, codec and physical-device operation remain Pending.

Reuse references the active compatible Zhipu preset + official base credential without copying it; model names never imply compatibility. AI Settings → Voice offers optional independent official Zhipu key or explicit browser compatibility. VoiceConfigV1/optional key are device-only. SpeechRecognition is no longer default; compatibility Stop aborts immediately and sends only already-final text. Legacy voice acknowledgement is unused/preserved. No app-specific “我知道了” startup blocker; existing AI data privacy and system mic permission remain. Static settings privacy names the receiving service and excludes raw audio from DB/Backup/Sync/logs.

One existing44px mic indicates recording/elapsed time, then immediately idle styling with compact 正在转写…. Final primary transcript automatically sends once while retaining an existing typed draft. Only voice-originated final replies use system TTS, with quiet44px Stop; typed replies stay silent. New recording/Stop/close/Clear/background cancel TTS. No API TTS, automatic mic restart, background listening, persistent audio, new dependency or private viewport logic.

### Video / cost

The former narrow structured-field projection could miss actual plain/Markdown message links; this is a confirmed code limitation, not a verified real-account root cause. Bilibili now extracts bounded structured/nested/tool/search/citation/plain/Markdown/escaped links, deduplicates BV and validates exact official HTTPS root/www/mobile video paths. Query/trailing slash are canonicalized locally; reject evil/auth/port/HTTP/article/search/iframe/script input. Provider URLs/HTML are never accepted as arbitrary players or thumbnails. Responses128KiB, depth12,1500nodes and bounded text; known-secret guards remain.

Successful-empty searches try at most3 unique local standard/alias variants within the original12sec total deadline, stopping on first validated result; HTTP/auth/network/parse errors never retry. One near-phonetic row typo is normalized locally. AUTO/YouTube/ALL partial success and one-player cleanup/external fallback remain. Settings 测试 B站搜索 exposes safe request/candidate/validated counts; HTTP successful-empty is explicit. Diagnostics are ephemeral, never raw response/key logs, and success uses neutral text.

Conservative direct finite exercise-video patterns use the existing registered external READ router with0 chat calls and a fixed count reply/cards. Ambiguous/private descriptions use normal routing to short nonprivate keywords; no extra normalization model. Voice explicit video has1 STT/0chat/1–3 search requests/0TTS API. Ordinary voice questions use1STT plus normal conversation flow (simple fixture1chat; tool routing retains existing rounds). Default3/max5; model metadata is bounded id/title/channel/provider/count and safe notices, excluding URLs/raw/HTML/keys. No real before/after token bill measurement; external search/STT may still have fees.

Official Web-Search-Pro example uses `choices[0].message.tool_calls[1].search_result` with link/title/content/media/icon/refer; message.content can contain links. Frozen `tests/fixtures/webSearchPro.json` is a synthetic official-shape fixture, producing2 canonical BV cards. It is not a captured real response. No real dedicated Zhipu credential supplied in this task/environment; real search/transcription/playback remain Pending. Production diagnostics enable owner verification without clearing/reinstalling.

## Automated Verification

- `npm run typecheck`: PASS.
- `npm test`: **706 tests /59 files PASS**, including Habit rollback/unrelated/stale count; recording/late permission/abort/error/duration/size/WAV/STT/TTS/Backup-Sync-input boundaries;18 parser sources/safety plus official fixture/variants/AUTO/fast path/call counts.
- `npm run build`: PASS; clean Pages application build `local:false`. Existing Vite>500kB chunk advisory remains.
- `git diff --check`: PASS.
- Full local release browser gates: **20/20 PASS**. Suites: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, aiDualModelRouting, foodVision, aiStreaming, nutritionGauge, nutritionTemplates, foodServing, videoSearch, dietEvents, videoSearchSettings, trainingJournal, voiceMode, habitDeletion.
- Full production release browser gates: **20/20 PASS**.
- New primary voice and Habit gates locally and production:4 widths320/375/390/430 × fonts100/120/140; voice idle/recording/transcribing/error/TTS and typed/voice direct cards, Habit0/1/100 histories/cancel/delete and unrelated data. Existing production gates use390/430; local existing gates4 widths. No real user data/credentials in mocks.
- All fake tracks ended before STT; active capture false/transcription pending; AudioContexts closed; Voice-originated TTS only, no auto restart, no DB writes. Mic/composer44px and no keyboard focus/overflow. Reviewed local/production screenshots include320/140 and390/100 voice states, dangerous count confirmation, cards and B站 diagnostics.
- Retained all original assertions. Streaming/voice fixtures explicitly choose compatibility. A Plan test sampled the old DOM during async view replacement; waiting for target aria-selected fixes the test race without an app change. Initial preview-base/mount/failure logs retained; corrected reruns pass. New diagnostics validate invalid local Key without a request and successful-empty counts.
- Generated legacy PWA upgrade PASS: frozen history/config unchanged,18 stores, selected Vision image not auto-reloaded, offline cold boot PASS. No PWA architecture change.

## Production Verification

- Application Actions and Pages successful. Exact HTML build identity, build-info local:false, JS/CSS bytes/SHA256 and SW bytes/precache match the clean application build; five tabs, AI Settings and Sync entry smoke PASS.
- Existing dedicated synthetic production profile: stable `fitlog-lite-db`, DexieV10/IndexedDB100/18stores;14 frozen legacy stores/15rows and AI/key/legacy voice-ack hashes preserved, four additive stores empty. No business reseeding, Restore, clearing or reinstall; offline cold boot PASS.
- Initial profile probes retained an old document while the new worker was waiting. Closing actual old-scope clients, waiting for the expected worker with0 scope clients and reopening the same profile adopted the new build; strict hash/offline checks then passed. Original failed probes are preserved, not called PASS. Physical installed-PWA behavior remains Pending.
- Report-only END Actions/Pages/exact assets and same-profile preservation are rechecked in the external report.

Video card source badges now stay in normal card flow below media, inside card bounds and outside official player controls. Local four-width video/Voice regressions assert those bounds; this scoped fix also corrects the pre-existing global badge positioning collision.

## Compatibility / changed files

DBV10/18, BackupV10, RestoreV1–V10, SyncV1/envelopeV1, AIConfigV1, VideoSearchConfigV2 unchanged. VoiceConfigV1 localStorage only. No Training Journal/DietEvent/Food/Nutrition/schema/Backup/Restore/Sync/PWA architecture change.

39 implementation/test/document files plus this report. Sources: src/main.ts (Habit only); src/services/{habitService,speechRecognitionService,voiceCaptureController,voiceTranscriptionService,voiceAudio,voiceReply,trainingVideoIntent,videoSearchService,aiProfiles}.ts; src/ui/{aiAssistant,aiSettings,voiceSettings,videoSearchSettings}.ts; src/ai/{orchestrator,systemPrompt,tools/videoTools}.ts; src/styles/{ai,main}.css. Tests: habits, speechRecognition, videoSearch, videoReliability, voiceMode; frozen webSearchPro JSON; browser aiStreaming/aiVoice/uiSemanticConsistency/videoSearch/videoSearchSettings plus new voiceMode/habitDeletion. Docs: AGENTS, AI_ARCHITECTURE, AI_QUICK_LAUNCH, VIDEO_SEARCH, UI_INTERACTION_SPEC, INTERACTION_VISUAL_SYSTEM, UI_QA_MATRIX. Exact paths in external changed-files.txt.

## Manual Device Verification / remaining gaps

Physical iPhone Safari: **Pending**. Original installed PWA: **Pending**. Physical microphone indicator release: **Pending**. Real Zhipu STT / five standard Bilibili queries: **Pending**. Real Bilibili playback: **Pending**. Browser mocks do not establish real relevance, credential/CORS/codec compatibility, iOS orange-indicator timing or installed storage context. External launcher same-storage behavior remains Pending. No confirmed unresolved application defect after automated/production checks; these manual gaps remain explicitly open.

## Evidence / ChatGPT Baseline

Full59-item report, exact START/APPLICATION/END, Actions/production/preservation receipts, original failure logs, accepted reruns and reviewed screenshots:
`/Users/zhaozhantian/Documents/Codex/2026-09-24/files-pasted-by-the-user-king/artifacts/habit-voice-video-2026-10-06/`.

START17d305da4ef4f64f23e034482092e93985b1d8ba; APPLICATIONcd97a905c034213e4d4f6d203dd661555c91aefa; END this report-only commit. Manual atomic Habit+history deletion; owned short capture→official STT→auto final send→system TTS with immediate tracks release; explicit browser compatibility only. Bounded raw/Markdown/mobile BV extraction,3 local empty variants, conservative direct-video0-chat path and safe settings counts. 706/59 unit tests, typecheck/build, local20/20, production 20/20 PASS, legacy PWA upgrade/data/AI/offline PASS. DBV10/18, BackupV10, RestoreV1–V10, Sync/envelopeV1, AIConfigV1, VideoConfigV2 unchanged; VoiceConfigV1 device-only. Physical and real-provider verification Pending.
