# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

AI Streaming and Global Sheet Scroll Stabilization are implemented. Full requested55-field report: [AI_STREAMING_SHEET_SCROLL_DEV_REPORT.md](docs/AI_STREAMING_SHEET_SCROLL_DEV_REPORT.md). Ordinary assistant text now arrives incrementally; tools execute only after complete aggregation/validation. Browser toolbar movement no longer changes shared Sheet geometry in closed-keyboard mode.

| Identity | Value |
| --- | --- |
| START_COMMIT |65824ed85e0edd1e407d9f78651e19ef1a7178ae|
| AI_STREAMING_COMMIT |6f676db46702c70a52a174dc0a0457350a548518|
| SHEET_SCROLL_STABILIZATION_COMMIT / END_COMMIT |1731f8d2386e2e2045691bc172d5092e648537e6|
| QA_FIX_COMMIT |N/A; QA repairs included in the two application commits|
| Application Actions |[37009831045](https://github.com/king-640-060/fitlog-lite/actions/runs/37009831045) SUCCESS|
| Application production HEAD / Pages |1731f8d2386e2e2045691bc172d5092e648537e6 /6808900296 SUCCESS|
| REPORT_COMMIT / final main / production HEAD |This report commit; exact SHA/Actions/Pages receipt in final response/artifact and `git log -1 --format=%H -- LATEST_DEV_REPORT.md`|
| Production |https://king-640-060.github.io/fitlog-lite/|

Normal HTTPS fast-forward push succeeded, no publishing workaround or history rewrite. The final report-only deployment serves the same verified application assets.

## Delivered behavior

- Native Chat Completions `chatStream` with stream:true for ordinary assistant rounds; typed/Voice-final/Quick Launch share engine.send. Vision/extraction and capability/connection probes stay nonstreaming. Same Provider/key, chat/tools model and independent visionModel/fallback.
- Incremental UTF-8 SSE framing across arbitrary chunks, LF/CRLF/CR, multiple events/data lines, comments ignored. DONE ends and cancels reader; valid complete events permit EOF without DONE, truncated final data rejects. HTTP200 JSON fallback consumes the same response and emits once. No retry or stream_options.
- Tool index0–15 aggregation; consistent repeated IDs/type, fragmented names/arguments,64KiB/tool incremental bound and complete final validation before execution. Existing8-round guard, matching results, duplicate-call cache, scopes and explicit proposals remain. Partial tools never execute.
- First text replaces thinking in one keyed bubble; paragraph updated with textContent, one paint/frame, immediate busy/clear/error changes. Near-bottom follows; upward reading stays. Streaming live region off; separate polite completion status. No business-page rerender or new animation.
- Stop/close abort fetch and reader. Already displayed partial UI retained with safe error but unfinished turn excluded from completed history. Optional completed usage only.45s headers/30s byte-stall/120s absolute stream cap; nonstream45s. Rolling possible-secret prefix protection prevents cross-delta credential display and avoids scanning the growing text each token.
- Pure shared Sheet keyboard state: editable focus +140px opens;80px closes with hysteresis and geometry held through blur/dismissal. Closed bottomOffset/overlap/offsetTop0 and stable layout height. Toolbar resize/scroll never repositions Sheet; nonediting visual scroll returns early; one coalesced update/frame and no unchanged style writes.
- Real keyboard adjusts visual geometry; native field focus scroll first, scoped residual correction only when still obscured. No smooth keyboard adjustment/fixed dismissal delay/private listeners/global touchmove prevention. Voice never focuses an input or opens keyboard mode. Orientation/width and actual desktop resize refresh baseline.
- Existing native Sheet lifecycle, one primary, replacement lease/no unlock, temporary confirmation/scroll preservation and exact background scroll/style restoration remain. Assistant conversation and Settings modal-body own their vertical scroll. No scrollIntoView calls remain: Date Rail and explicit meal reveal directly scroll their own surfaces.

## Automated Verification

Actual baseline425tests/43files; final487tests/45files (+62) PASS. New47 streaming tests,11 viewport tests and4 engine live/partial/Stop cases. Existing Tools/Proposals/dual routing/Vision/Nutrition/Date Picker/Sync/Backup/Restore/frozenV7/history gates PASS. Typecheck, full tests, normal build, Pages build and diff-check PASS. No dependency/package-lock/manifest/schema/frozen fixture changes.

Static Pages build local QA at320×812 /375×812 /390×844 /430×932: eight suites aiStreaming/aiAssistant/aiVoice/aiDualModelRouting/foodVision/interactionStabilization/sharedDatePicker/githubSyncSafety PASS. Delayed browser ReadableStream proves text before DONE, one bubble, no business-view mutations, near-bottom/upward-read, Stop, half-tool cancellation, complete tool loop, partial history exclusion, cross-delta secrets, Voice/Quick streams. Existing JSON mocks cover fallback.

Long Sheet QA uses temporary2400px synthetic content and20 native wheel up/down cycles with deterministic boundary scrolls and mocked toolbar movements. All major Sheets checked: AI Assistant/Settings, Food Library/Editor, Task, Workout, Cardio, Habit, GitHub Sync, Backup/Restore, Vision Import. Stable top/bottom/background and zero toolbar CSS writes PASS. Focused mocked keyboard sequences cover AI root/Key/model, Food name/energy/macros, Task title/note and assistant textarea; blur/dismissal/orientation plus actual desktop height resize PASS. Screenshots inspected at390/320. These are Chromium geometry checks, not physical Safari touch/keyboard proof.

| Pages asset | Bytes | Python gzip bytes | Vite gzip estimate | SHA-256 |
| --- | --- | --- | --- | --- |
|index-CjrfcL7Y.js|683288|215441|218.75kB|d102118dd5c6924fccc930df118427d0c6750909c442075da917e8bdbea59766|
|index-C-p-6ets.css|102884|18275|18.45kB|86933073443f82397ef8a8d42195f892022479f874511eeee6b0ddf3a43c3f97|

Precache17entries/803.06KiB. JS +8656raw bytes (~1.28%); CSS identical. Existing>500kB warning retained; no new package.

## Production Verification

Application Actions37009831045 and Pages6808900296 SUCCESS at END_COMMIT. Production JS/CSS bytes/SHA exactly match local final Pages build; five tabs, AI Settings and Sync entries PASS.

Production390×844 /430×932: all eight mocked browser suites PASS (aiStreaming, aiAssistant, aiVoice, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety), zero page errors. Delayed incremental text, complete tools, Stop/history/secret guards, Voice/Quick, long Sheet toolbar/keyboard/scroll/confirm/replace, five tabs and existing write/date/Sync regressions verified. Production JS/CSS bytes and SHA exactly match the final Pages build.

Same existing synthetic persistent profile across deployment: all14stores/15frozen historical records remain identical, saved AI Profiles/API Key/visionModel/Voice privacy acknowledgement fingerprints unchanged; no business reseeding/reset. Exact new JS loaded under the original Service Worker, then actual offline cold reload PASS. Desktop evidence only; not proof of external iPhone storage context.

## Versions

fitlog-lite-db /DexieV7 /14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfig/SystemPromptV1; FoodVisionPrompt/extractionV1. No migration, historical recalculation or business-service changes. Five tabs, local dates, canonical kcal and factual snapshots remain.

## Manual Device Verification / remaining risks

Real Provider/CORS/buffering/tool-delta compatibility and real SpeechRecognition Pending; no real Key/quota/microphone used. Physical iPhone Safari and installed PWA touch/toolbar/keyboard/Safe Area Pending. Desktop original SW offline check is separate from physical standalone verification. Independent FitLog AI Home Screen icon, one-tap-to-listen and same-storage external routing remain Pending / unsupported by verified path. No duplicate web-app installation or undocumented URL scheme recipe; normal manifest/start_url='.' unchanged. See [AI_QUICK_LAUNCH.md](docs/AI_QUICK_LAUNCH.md) and the new report's physical checklist. Existing large-bundle warning remains; no unresolved automated/production failure.120s stream hard cap is intentional.

## ChatGPT Baseline

Read AGENTS→LATEST_DEV_REPORT→UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM/AI_ARCHITECTURE/AI_QUICK_LAUNCH/FOOD_VISION_IMPORT. END1731f8d2386e2e2045691bc172d5092e648537e6 adds native stream:true assistant rounds with incremental UTF-8 SSE, complete indexed tools/64KiB safety, same-response JSON fallback, Stop/cancel, partial-turn history exclusion, rolling credential guard and45/30/120s timers. Voice/Quick share engine.send; probes/Vision remain nonstream, dual routing unchanged. Shared pure Sheet state uses focus+140/80px hysteresis, closed stable height/0 offsets, no toolbar reposition, coalesced central writes, scoped residual keyboard correction and existing replacement/confirm/original scroll lock.487tests/45files and eight local4/prod2size suites PASS; exact assets and same synthetic14store/15row+AIconfig/key/visionModel/voice ack preservation+SW offline cold boot PASS. Physical Safari/installed PWA/real Provider/Speech/external icon-storage path Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1 and manifest unchanged. Exact report/main/production receipt in final artifact.
