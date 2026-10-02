# FitLog Lite Development Report — AI Voice Mode + Quick Launch

Date: 2026-10-02. Voice input and app-side fragment routing are implemented and released. Independent iPhone Home Screen launcher remains **Pending / unsupported by verified path**. No physical device or real Provider result is inferred from mocks.

## Release identities

| Required field | Value |
| --- | --- |
| 1. START_COMMIT | `9f8b5c9d59e7d936a4ee69c69d1796eecf018ada` |
| 2. AI_VOICE_QUICK_LAUNCH_COMMIT | `33cc62c85b4ecf0a964d8293e62fc5a5e3c27b0d` |
| Application QA commit | `6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c` |
| 3. END_COMMIT / last application | `6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c` |
| 4. REPORT_COMMIT | This documentation commit; exact SHA in release response/artifact and `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| 5. main HEAD | This report commit after END; exact SHA in final release receipt |
| 6. production HEAD | Verified application `6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c`; final report deployment receipt is supplied in release response/artifact |

The QA commit removes an unnecessary settings-change call on opening the assistant, preserving a first rejected request's error card on close/reopen. Browser regression exercises this before any successful request. No engine rewrite, schema, dependency, manifest or business service change.

HTTPS pull/push timed out after bounded35s attempts. API confirmed START equals remote main. Git Data API uploaded and verified identical blob/tree/commit SHAs and advanced main with `force:false`, exact-parent checks and no history rewrite. Local remote-tracking main was updated only after remote SHA verification.

## Delivered behavior (required fields 7–25)

| # | Field | Verified behavior |
| --- | --- | --- |
| 7 | Quick Launch URL contract | Production base + `#quick=ai`; `#quick=ai&voice=1`; `#quick=ai&prompt=<encoded text>&send=1`. Unknown fields ignored; other targets no-op; malformed/oversized prompts rejected. Fragment-only, no normal query prompt support. |
| 8 | Initial-load routing | Fragment consumed at startup, assistant opens after database and initial render. Mock cold text/voice tested. |
| 9 | Warm-app routing | hashchange uses captured event URL and serial opening queue; flushes pending Workout autosave before shared assistant. Existing Sheet receives intents; rapid two prompts both retained in one Sheet. |
| 10 | Hash cleanup | Immediate replaceState preserves history state, pathname, normal query and Pages base. Invalid AI fragments also erased; reload does not replay. |
| 11 | Prompt privacy | Untrusted memory-only draft. Missing profile retains text; busy retains without deferred send. Missing AI acknowledgement waits; acknowledging sends unchanged draft once. Editing cancels pending auto-send. No prompt storage/log/analytics. |
| 12 | SpeechRecognition implementation | New service owns standard/prefixed API, zh-CN, continuous=false, interimResults=true, maxAlternatives=1, finite state/generation; final segments aggregate only at end. |
| 13 | Safari/webkit fallback | Feature detect standard then webkitSpeechRecognition. Unit/prefixed browser mocks PASS; real Safari/PWA remains Pending. |
| 14 | Voice privacy | Independent first-use disclosure, compact explicit acknowledgement and AI Settings privacy text. Device-only `fitlog-ai-voice-privacy-ack-v1`; excluded from business Backup/Sync. |
| 15 | Audio persistence | FitLog captures/stores/uploads no microphone audio, uses no MediaRecorder/getUserMedia/audio Blob/File/ObjectURL/backend/STT provider. Browser/OS service may process voice remotely; no guaranteed local/offline claim. |
| 16 | Mic permission | First disclosure never silently listens. Explicit Mic/ack starts from a gesture. Fixed denied/capture/network/no-speech/language/abort/unknown copy; no automatic retry. |
| 17 | Auto-send | Interim/early final do not send; final+end calls shared submitText→engine.send once. Existing typed text combines by newline. Quick Voice without activation/after automatic denial shows calm Start button. |
| 18 | Manual stop | Mic active click calls stop, waits for final/end, sends once if nonempty. Manual Send aborts speech and sends current typed composer text only. |
| 19 | Close/abort | Close/dispose, hidden visibility and pagehide abort without sending, invalidate late callbacks, remove recognition/lifecycle handlers and retain existing AI request Stop semantics. |
| 20 | AI busy | Mic/voice Start disabled. Warm auto-send prompt stays in composer, says “上一条请求还在处理中。” and never auto-sends when old request finishes. |
| 21 | Unsupported fallback | “当前浏览器不支持网页语音识别，可以使用系统键盘听写。” Text Send remains usable, including chat-only/unsupported-Vision profiles. |
| 22 | Proposal safety | Spoken “记录今天72kg” generates only a pending proposal; DB unchanged before explicit confirmation. Existing permission/source/atomic write validation remains unchanged. |
| 23 | Secret guard | Voice and quick prompts containing synthetic saved Key are rejected before provider calls and do not enter history. Existing known-secret guard stays authoritative. |
| 24 | Assistant UI | Quiet SVG Mic44px, polite live status/static dot, separate voice privacy, unchanged Camera/Send/Stop/16px IME-safe input/footer/shared Sheet/viewport. No text focus on voice start. |
| 25 | 320px | Two-row composer keeps usable textarea/Send above Camera/Mic; no overflow. Wider screens keep one row. Pointer outline suppression and keyboard accessibility retained. |

Full contract and platform gate: [AI_QUICK_LAUNCH.md](AI_QUICK_LAUNCH.md). Existing routing/permissions/proposals: [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).

## Automated Verification (required fields 26–30)

| # | Field | Result |
| --- | --- | --- |
| 26 | Tests | Actual baseline405tests/40files PASS; final425tests/43files PASS (+20). Quick parser, strict decoding/limit/cleanup; speech state/interim/final/end/errors/stop/abort/stale/dispose; voice→engine proposal/secret safety. Full existing Provider/Dual Model/Tools/Proposals/Assistant/Vision/Interaction/Sync/Date Picker/Nutrition/Backup/Restore/frozenV7 suites PASS. |
| 27 | Typecheck | `npm run typecheck` PASS. |
| 28 | Build | `npm run build` PASS. |
| 29 | Pages build | `GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build` PASS; `git diff --check` PASS. |
| 30 | Bundle | JS674632B / Vite gzip216.19kB; CSS102884B / Vite gzip18.45kB; PWA precache17entries/794.61KiB. No new dependency. Existing >500kB chunk warning remains. |

Browser local build QA uses the real Pages build served from127.0.0.1:5175/fitlog-lite/, without HMR. 320×812 /375×812 /390×844 /430×932: aiVoice, aiAssistant, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety all PASS. Isolated synthetic profiles/keys/images/records, mocked browser speech and provider. Camera shortcut, typed chat, proposal writes, model routing, keyboard geometry, touch/focus, shared Sheet and offline core regressions pass. New speech fixture explicitly replaces both browser constructors so tests cannot use a real microphone.

Security audit: browser API details isolated to service; no new audio capture/persistence or raw logging. Main's existing pelvic AudioContext is an unchanged generated timer cue, not microphone capture. Quick hash is consumed through one bounded parser; prompts reach engine.send, not tools/DB directly. DB/services/manifest/package/frozen fixtures unchanged. Early dev-server checks interrupted by HMR were rerun against static built assets and passed; no unresolved automated failure.

## Production Verification (required fields 31–33)

| # | Field | Result |
| --- | --- | --- |
| 31 | Actions | Initial application [36999415822](https://github.com/king-640-060/fitlog-lite/actions/runs/36999415822) SUCCESS, deployment6807048574. Final application [36999687683](https://github.com/king-640-060/fitlog-lite/actions/runs/36999687683) SUCCESS, deployment6807096297 SUCCESS. Final report receipt: Report-only deployment after application QA; exact Actions/deployment receipt is supplied in release response/artifact. |
| 32 | Production QA | https://king-640-060.github.io/fitlog-lite/ — 390×844 /430×932 all seven mocked browser suites PASS. Cold text/voice, warm/rapid route, prompt/cleanup/privacy/busy/secret/stop/close/background/unsupported/proposals/autosave/layout verified. JS/CSS byte/SHA match local final Pages build exactly. |
| 33 | Cross-deployment preservation | Same dedicated synthetic persistent profile before/after; no business reseed/reset. fitlog-lite-db/V7/14stores/15frozen historical rows identical. Existing AI configuration/key and voice acknowledgement fingerprints unchanged, exact new bundle under original Service Worker. Actual Service Worker offline cold reload PASS; consumed quick link does not reopen. |

| Asset | Bytes | SHA-256 |
| --- | --- | --- |
| index-D1fd2jUl.js | 674632 | ad3e712950f7e70e9764df9a89d178e2d45cdf8a91e3a9328b375e57c5b22f67 |
| index-C-p-6ets.css | 102884 | 86933073443f82397ef8a8d42195f892022479f874511eeee6b0ddf3a43c3f97 |

Persistent preservation is desktop browser evidence only; it does not validate an external iPhone storage context.

## Manual Device Verification (required fields 34–40)

| # | Field | Status |
| --- | --- | --- |
| 34 | Real SpeechRecognition | Pending. Only deterministic browser API mocks; no actual microphone test. |
| 35 | Physical iPhone Safari | Pending. No accessible physical device; actual Chinese recognition/Siri/permission/keyboard/Safe Area not established. |
| 36 | Installed PWA | Physical installed iPhone PWA Pending. Desktop Service Worker offline boot/update PASS is separate. |
| 37 | Independent FitLog AI Home Screen launcher | **Pending / unsupported by verified path.** Safe independent Home Screen icon not verified under current PWA architecture. |
| 38 | One-tap-to-listen | Pending. App accepts Voice request; cold activation may require a second tap. No physical everyday tap-count claim. |
| 39 | Storage-context verification | External launcher Pending. Must show original standalone Food/Weight/Tasks and saved Provider/key without re-entry/Restore/Sync. Safari opening, second empty web app, or Key re-entry = FAIL. |
| 40 | Real Provider | Pending. No real Key/quota consumed. Mock chat/tool/image protocol and safety PASS; actual provider/CORS/quality separate. |

PWA cannot currently provide a verified separate one-tap Home Screen AI launcher without risking a distinct storage context. No duplicate install/manifest/database/profile/key, no undocumented webapp:// production route, no unverified Shortcut recipe. Normal icon/start_url='.' stay intact. Candidate launcher instructions require physical same-storage proof first; future thin native companion/App Intent is a separate round.

Platform background is documented from [WebKit speech recognition](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/) and [WebKit Home Screen storage behavior](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/), with [MDN recognition availability](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). These references explain boundaries; they are not a FitLog device test.

## Versions and remaining risks (required fields 41–42)

41. fitlog-lite-db; DexieV7/14stores; BackupV7; RestoreV1–V7; SyncEnvelopeV1; AIConfigV1; AISystemPromptV1; FoodVisionPrompt/extractionV1. No migration or business compatibility change.
42. Remaining verification risks are real browser/OS speech availability/network/Siri/permission/activation, physical Safari/installed PWA keyboard/Safe Area, real Provider connectivity, and external launcher same-context/tap count. Those categories remain Pending. Existing bundle warning remains; no new automated or production failure is left unresolved.

## ChatGPT Baseline

Read AGENTS→LATEST_DEV_REPORT→UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM/AI_ARCHITECTURE/FOOD_VISION_IMPORT/AI_QUICK_LAUNCH. END6ab921dc76fd2fb0edd3bdec83c5c653cfe46b9c implements optional browser/system voice via final/end-only shared engine.send, generation-guarded close/background abort, device-only voice ack, quiet44px Mic and320px two-row composer. Fragment-only quick=ai/voice=1/prompt/send=1 consumed immediately; cold/warm serial routing flushes Workout and reuses one Sheet. Prompt drafts memory-only; busy never defers auto-send; privacy gates preserve and resume unchanged text. Existing Keys/scopes/models/tools/proposals remain; voice cannot confirm/write. 425tests/43files, seven browser suites local4/prod2 sizes, asset identity and same-profile14store/15row+AIconfig preservation+SW offline cold boot PASS. Real Speech/Provider, physical Safari/PWA, independent Home Screen launcher/storage context/one-tap Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1 and manifest unchanged.
