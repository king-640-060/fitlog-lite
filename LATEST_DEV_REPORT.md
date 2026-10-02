# FitLog Lite Development Report

## Latest verified production state — 2026-10-02

AI Voice Mode and app-side Quick Launch fragments are implemented and released. Full42-field report: [AI_VOICE_QUICK_LAUNCH_DEV_REPORT.md](docs/AI_VOICE_QUICK_LAUNCH_DEV_REPORT.md). Contract/platform gate: [AI_QUICK_LAUNCH.md](docs/AI_QUICK_LAUNCH.md). **Independent iPhone Home Screen launcher, same-storage routing and one-tap-to-listen remain Pending / unsupported by verified path.**

| Identity | Value |
| --- | --- |
| START_COMMIT | 9f8b5c9d59e7d936a4ee69c69d1796eecf018ada |
| AI_VOICE_QUICK_LAUNCH_COMMIT | 33cc62c85b4ecf0a964d8293e62fc5a5e3c27b0d |
| Application QA / END_COMMIT | 6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c |
| Initial application Actions | [36999415822](https://github.com/king-640-060/fitlog-lite/actions/runs/36999415822) SUCCESS; Pages6807048574 |
| Final application Actions | [36999687683](https://github.com/king-640-060/fitlog-lite/actions/runs/36999687683) SUCCESS |
| Verified application production HEAD | 6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c; Pages6807096297 SUCCESS |
| REPORT_COMMIT / final main HEAD | This report commit; exact SHA from release response/artifact and `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| Production | https://king-640-060.github.io/fitlog-lite/ |

Bounded HTTPS pull/push timed out. API confirmed START equals remote main, verified identical Git blobs/tree/commits and advanced main with force:false/exact-parent checks. No history rewrite. The report-only deployment serves the same verified application; its exact head/Actions/deployment receipt is in the final response/artifact.

## Delivered behavior

- Browser SpeechRecognition service detects standard then webkit API, uses zh-CN/one finite session/interim/one alternative, aggregates final segments only on end, and prevents duplicate/stale sends with a generation. Stop finishes; close/hidden/pagehide abort/dispose and remove handlers. No background restart, FitLog audio capture/persistence/upload, MediaRecorder/getUserMedia/STT backend/provider or new dependency.
- Quiet44px Mic, polite status/static dot and compact independent voice privacy acknowledgement in the existing shared Sheet. Voice does not focus the textarea or open the keyboard. First quick use shows Start; missing activation/automatic denial falls back quietly. Unsupported browsers retain normal text and system keyboard dictation guidance.
- Typed text, final voice and quick prompts share submitText→engine.send. Existing Key/scopes/model/tool/proposal protections remain. Manual Send aborts speech and sends current typed text. Existing typed+spoken text combines by newline; busy/oversized drafts remain editable. Writes still require explicit proposal confirmation.
- Fragment-only `#quick=ai`, `#quick=ai&voice=1`, `#quick=ai&prompt=<encoded text>&send=1`. Strict one-time decoding, trim/6000-character bound; immediate replaceState cleanup retains pathname/query/Pages base. Cold routing follows db/render; warm captured hashchange events serialize through Workout autosave and reuse one assistant. Rapid prompts do not create multiple Sheets. Reload never replays a consumed prompt.
- Prompt/draft stays memory-only. No profile keeps the composer text; AI privacy acknowledgement may continue the unchanged pending prompt. Busy never defers automatic send. In-page draft/history persists on close/reopen; reload clears it. QA patch preserves the first secret-blocked error card on reopening without an unnecessary settings-change clear.
- Camera/Food Vision, typed Send/Stop, IME, shared Sheet/viewport/Safe Area and confirmation footer remain. At320px textarea+Send use row one and Camera+Mic row two; wider screens use one row.

## Automated Verification

Actual baseline405tests/40files PASS; final425tests/43files PASS (+20). Full AI Provider/Dual Model/Tools/Proposals/security/Vision/Nutrition/Interaction/Date Picker/Sync/Backup/Restore/frozenV7/history gates PASS. New parser/speech/voice-engine tests verify interim/no-speech/denied/stale/abort/stop/final-only behavior and proposal/secret safety.

Typecheck, full tests, normal build, Pages build with GITHUB_REPOSITORY and diff-check PASS. Local build QA (no HMR)320×812 /375×812 /390×844 /430×932: seven browser suites aiVoice/aiAssistant/aiDualModelRouting/foodVision/interactionStabilization/sharedDatePicker/githubSyncSafety PASS. Synthetic speech/profile/key/image/record and mocked Provider only. Screenshots inspected at320/390; 44px Mic,16px textarea, reachable footer/no overflow/quiet touch feedback verified.

| Pages asset | Bytes | Vite gzip | SHA-256 |
| --- | --- | --- | --- |
| index-D1fd2jUl.js | 674632 | 216.19kB | ad3e712950f7e70e9764df9a89d178e2d45cdf8a91e3a9328b375e57c5b22f67 |
| index-C-p-6ets.css | 102884 | 18.45kB | 86933073443f82397ef8a8d42195f892022479f874511eeee6b0ddf3a43c3f97 |

PWA precache17entries/794.61KiB; no new package. Existing>500kB JS warning remains. Security audit found no new audio capture/storage/logging or direct write path. The existing pelvic generated AudioContext cue is unchanged.

## Production Verification

Final application Actions36999687683 /Pages6807096297 SUCCESS. Production JS/CSS bytes/SHA match the final local Pages build. Production390×844 /430×932: all seven mocked browser suites PASS, zero page errors. Cold/warm/rapid quick routes, cleanup/no replay, privacy/no-profile/busy drafts, secret guard, final/end once, manual Stop/Send, close/background abort, unsupported text, proposals, pending Workout autosave and model/Vision/interaction/date/Sync regressions verified.

Cross-deployment preservation PASS in the same existing dedicated synthetic persistent browser profile:14stores/15frozen historical records identical, AI config/API Key and voice acknowledgement fingerprints unchanged, no business reseed/reset. Exact new JS under original Service Worker; actual SW offline cold reload PASS. This is desktop evidence and does not prove an external iPhone storage context.

## Versions

fitlog-lite-db /DexieV7 /14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfigV1; AISystemPromptV1; FoodVisionPrompt/extractionV1. No schema/migration/business service/manifest/package/frozen-fixture change. Five tabs, local dates, canonical kcal and historical snapshots remain.

## Manual Device Verification

Real SpeechRecognition and real Provider Pending; no real microphone/Key/quota used. Physical iPhone Safari and installed PWA Pending. Independent FitLog AI Home Screen launcher, one-tap-to-listen and external same-storage routing Pending / unsupported by verified path. Browser mocks and desktop SW checks do not establish those results.

Do not install a second web app or use undocumented webapp:// as a production shortcut. Candidate launcher must show original standalone Food/Weight/Tasks and saved Provider/key without re-entry/Restore/Sync. Safari opening, second empty PWA or re-entering Key = FAIL. No unverified Shortcut recipe is supplied; normal manifest/start_url='.' and app icon remain. See the physical checklist in AI_QUICK_LAUNCH. Remaining risks are these manual platform/provider categories and the existing bundle warning; no unresolved automated/production failure.

## ChatGPT Baseline

Read AGENTS→LATEST_DEV_REPORT→UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM/AI_ARCHITECTURE/FOOD_VISION_IMPORT/AI_QUICK_LAUNCH. END6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c implements browser/system voice via final/end-only shared engine.send, generation-guarded close/background abort, device-only voice ack, quiet44px Mic and320px two-row composer. Fragment-only quick=ai/voice=1/prompt/send=1 consumed immediately; cold/warm serialized routing flushes Workout and reuses one Sheet. Prompt drafts memory-only; busy never defers auto-send; privacy preserves/resumes unchanged text. Existing Keys/scopes/models/tools/proposals remain; voice cannot confirm/write. 425tests/43files, seven browser suites local4/prod2sizes, exact asset identity and same-profile14store/15row+AIconfig preservation+SW offline cold boot PASS. Real Speech/Provider, physical Safari/PWA, independent Home Screen/storage context/one-tap Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1 and manifest unchanged.
