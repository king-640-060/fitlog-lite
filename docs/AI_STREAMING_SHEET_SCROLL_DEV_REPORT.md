# FitLog Lite Development Report — AI Streaming + Global Sheet Scroll

Date: 2026-10-02. Scope: ordinary assistant streaming and shared Sheet viewport stabilization. Voice, Quick Launch, dual model routing, packaging Vision, tools/proposals and local-first persistence remain.

## Release identities (requested fields 1–8)

| # | Field | Value |
| --- | --- | --- |
| 1 | START_COMMIT | 65824ed85e0edd1e407d9f78651e19ef1a7178ae |
| 2 | AI_STREAMING_COMMIT | 6f676db46702c70a52a174dc0a0457350a548518 |
| 3 | SHEET_SCROLL_STABILIZATION_COMMIT | 1731f8d2386e2e2045691bc172d5092e648537e6 |
| 4 | QA_FIX_COMMIT | N/A; local QA repairs are included in the two application commits |
| 5 | END_COMMIT | 1731f8d2386e2e2045691bc172d5092e648537e6 |
| 6 | REPORT_COMMIT | This report commit; exact SHA is in final response/artifact and `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| 7 | main HEAD | Application verification at END_COMMIT; final report-only main SHA in final receipt |
| 8 | production HEAD | Application QA at END_COMMIT; final report deployment receipt in final response/artifact |

Production: https://king-640-060.github.io/fitlog-lite/. Normal HTTPS fast-forward push succeeded. No API publishing workaround or history rewrite was needed. The report deployment changes documentation only and serves the same application assets.

## Streaming behavior (fields 9–29)

| # | Field | Implementation and evidence |
| --- | --- | --- |
| 9 | Transport architecture | Native fetch POST Chat Completions, `chatStream` returns complete AiChatResponse and emits safe `onContentDelta`; ordinary assistant rounds alone send stream:true. Same captured Provider/root/key/model. No SDK/backend/proxy/WebSocket/dependency. |
| 10 | SSE parser | Pure incremental UTF-8 line/event framing in src/ai/sse.ts. Empty line dispatch, LF/CRLF/CR, multiple data lines joined by newline, comments/event/id/retry ignored. Malformed JSON/UTF-8 rejects. 2MiB cumulative raw bound. |
| 11 | JSON fallback | HTTP200 application/json normalized from the same response and content emitted once. No second request or automatic retry. Private Symbol separates internal streamed result from untrusted JSON. |
| 12 | DONE | [DONE] finalizes aggregation and cancels the remaining reader. Normal EOF without DONE accepted only after valid delta events and without an unfinished data event. No token waits for DONE. |
| 13 | UTF-8/chunk boundaries | TextDecoder stream:true handles Chinese byte splits. Parser tests arbitrary1/2/3/7/23/1000-byte boundaries, cross-chunk lines/events and several events per chunk. Invalid UTF-8 rejects safely. |
| 14 | Content deltas | In-order text accumulation; first delta converts a thinking activity to one assistant item. Final content equals concatenated raw deltas; safe callbacks may briefly hold only a possible credential prefix. |
| 15 | Tool aggregation | Integer index0–15; repeated ID/type must agree. Fragmented name/arguments append in order; multiple interleaved indices return sorted calls. Tools never expose arguments in UI. |
| 16 | Execution timing | Only complete validated adapter response enters registry. Missing/invalid ID/name/type/JSON, unfinished frame or length/content_filter tool termination reject. Matching assistant/tool-result ordering and duplicate-ID cache preserved. |
| 17 | Tool argument bounds | Each tool is incrementally checked at64KiB UTF-8; final check repeated. Max16 calls/round,8 local tool rounds,2MiB response. Registry retains existing schema/permissions/result limits. |
| 18 | Stop | AbortController and reader cancellation release pending reads immediately. Half-tool Stop causes zero registry execution/proposals/writes. Closing uses same cleanup. No retries. |
| 19 | Partial response | Failed/stopped text already shown stays with a fixed safe error. No tool JSON, raw diagnostic or later stale delta. Thinking-only activity is removed on failure. |
| 20 | History | Only a completed final answer and its user turn enter finalized natural-language history. Unfinished user/assistant turn excluded; prior completed history remains. Tool payloads remain within current loop only. |
| 21 | Usage | Optional top-level prompt/completion/total counts normalized and added only on completed responses. Missing/invalid counts remain undefined. No stream_options added. |
| 22 | Timeout |45s initial headers; after headers30s stall timer renewed by arriving bytes;120s absolute per-request cap. Sustained stream survives45s. Heartbeats cannot bypass total cap. Nonstream remains45s. Fake-clock tests verify all three stages. |
| 23 | Stream errors | Invalid JSON/fields/truncation/size produce safe AiError; network/timeout/Stop distinguished. Explicit400 streaming rejection gets fixed interface guidance; other400 remains fixed model/parameter guidance. No raw body/log or automatic fallback request. |
| 24 | Secret guard | Bounded possible-prefix suffix plus each delta checked before display; a known credential crossing fragments never displays. No scan of the growing answer each token. Final response secret validation remains, tools stay hidden. |
| 25 | UI throttling | One requestAnimationFrame for text changes; busy boundaries, clear and idle errors remain immediate. Keyed article/paragraph reused with textContent. No HTML/Markdown/bubble animation or business-page rerender. |
| 26 | Scroll | Follow only within72px of bottom; upward reading keeps old scrollTop. Browser delayed long streams verify follow and preserve; no smooth stream scroll. |
| 27 | Voice | Final recognition text uses the same engine.send → chatStream. Browser/unit mocks verify streamed response, end-once and confirmation safety. Mic disabled throughout AI busy. Voice starts without input focus. |
| 28 | Quick Launch | Cold/warm fragment prompts use the same stream path, immediate hash cleanup, existing readiness/privacy/secret/busy/proposal guards. Delayed browser mock verifies text before DONE. |
| 29 | Vision nonstream | visionChat, Food Vision strict JSON extraction and image probe remain nonstreaming through independent visionModel/fallback. Connection/tool probes and model listing also remain nonstreaming. No packaging/parser/write changes. |

Streaming log and bubbles use aria-live=off and aria-atomic=false. A separate polite completion status prevents announcing the entire growing paragraph each token. IME, Camera/Mic busy controls, reserved Send/Stop width,320px two-row composer and confirmation footer remain.

## Shared Sheet behavior (fields 30–40)

| # | Field | Implementation and evidence |
| --- | --- | --- |
| 30 | Viewport architecture | Pure computeSheetViewportState in src/ui/sheetViewport.ts, one app-lifetime shared controller. Stable closed height baseline; no page/private VisualViewport handlers. CSS variants remain shared. |
| 31 | Keyboard detection | Editable input/textarea/contenteditable focus plus occlusion≥140px; button/file/range/checkbox/radio excluded. Pinch zoom does not open keyboard mode. |
| 32 | Hysteresis | Open at140px; remain open until occlusion≤80px. Avoid threshold oscillation. Blur while geometry remains obstructed preserves state. Unit sequence checks boundaries. |
| 33 | Nonkeyboard VisualViewport | Unfocused scroll returns immediately; toolbar resize keeps closed geometry. Mobile innerHeight toolbar changes do not refresh baseline. No unchanged style writes;20-cycle browser observer verifies zero toolbar writes. |
| 34 | bottomOffset | Closed exactly0, overlap0, offsetTop0, body keyboard-open false. Open max(0, stableLayoutHeight−visualHeight−offsetTop). Example844−760−40=44 stays0 without keyboard. |
| 35 | Keyboard open | Visual height/top/actual bottom occlusion adjust shared variables. Native focus scrolling first; residual obscured field correction only within its modal-body on keyboard opening/field focus. Composer stays above keyboard. |
| 36 | Keyboard close | Keep geometry through blur and shrinking occlusion, then restore stable closed values once. No500ms delay/reset-on-focusout/second jump/bottom gap. Frame-coalesced updates, unchanged values skipped. |
| 37 | Voice | No editable focus, no keyboard-open or Sheet resize from voice/toolbar movement. Existing physical keyboard dismissal may settle normally. No speech-owned viewport listener. |
| 38 | Background lock | Existing reference-counted fixed-body lock retains exact original body CSS and scrollX/Y; restore only after final lease. No body touch-action:none/global touchmove preventDefault. Native inner scroll/overscroll containment remains. |
| 39 | Replacement | New lease acquired before normal old close; synchronous once-only cleanup, no interim unlock/old trigger focus. Repeated Sheet opening retains one primary and one viewport listener pair. |
| 40 | Confirmation overlay | Temporary dialog keeps underlying primary and lock. Cancel returns to preserved primary scroll and body top. Native Escape/subview focus trap remains. |

Orientation/width changes refresh stable layout height, actual desktop height-only resize also refreshes it. Assistant modal-body stays overflow-hidden with conversation as its main vertical scroller; AI Settings scrolls in the shared modal-body. Repo-wide scrollIntoView audit: no calls remain. Date Rail directly scrolls its rail; explicit nutrition meal reveal directly scrolls its own body. Their business/date behavior is preserved.

## Automated verification (fields 41–46)

| # | Field | Result |
| --- | --- | --- |
| 41 | Tests/files | New aiStreaming.test.ts (47 tests), sheetViewport.test.ts (11); aiOrchestrator adds4 live/partial/Stop/tool-timing cases. Existing aiProvider/aiVoiceInput mocks verify proper API. New browser aiStreaming.mjs plus strengthened interactionStabilization and focused keyboard fixture in aiAssistant. All45 test files pass. |
| 42 | Test count | Baseline425/43files → final487/45files (+62), actual full Vitest run PASS. Frozen V7, Backup/Restore, Sync, Nutrition Completion, historical snapshots, Tools/Proposals all PASS. |
| 43 | Typecheck | npm run typecheck PASS. |
| 44 | Normal build | npm run build PASS, including TypeScript and PWA generation. |
| 45 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS; /fitlog-lite/ base correct. git diff --check PASS. |
| 46 | Bundles | See exact table below. No package/package-lock/manifest/schema/frozen fixture changes. Existing>500kB warning retained. |

| Pages asset | Bytes | gzip bytes (Python gzip) | Vite gzip estimate | SHA-256 |
| --- | --- | --- | --- | --- |
| index-CjrfcL7Y.js |683288|215441|218.75kB|d102118dd5c6924fccc930df118427d0c6750909c442075da917e8bdbea59766|
| index-C-p-6ets.css |102884|18275|18.45kB|86933073443f82397ef8a8d42195f892022479f874511eeee6b0ddf3a43c3f97|

Precache17entries/803.06KiB. JS grows8656 raw bytes (~1.28%) from previous674632; CSS identical. gzip methods are explicitly distinguished rather than treating Vite estimate as exact compressed bytes.

Local verified static Pages build, no HMR:320×812 /375×812 /390×844 /430×932. All eight browser suites PASS: aiStreaming, aiAssistant, aiVoice, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety. All five primary tabs and AI/proposal flows remain. Screenshots inspected at390px partial streaming and320px mocked keyboard/composer; no overflow and footer visible.

The new delayed browser fixture uses actual browser ReadableStream byte delivery (120/150/300ms) through intercepted native fetch responses. It verifies content visible before DONE, one bubble, no business view mutations, near-bottom/upward reading, immediate cancel, half-tool Stop, complete tool→local→second stream loop, partial-history exclusion, cross-delta credentials, Voice and Quick Launch. Existing JSON mocks independently verify same-response fallback.

Long-content geometry QA injects temporary2400px synthetic content into each checked native inner surface, then performs20 native wheel up/down cycles (with deterministic boundary scrolls) while mocking toolbar height/offset changes. It checks dialog top/bottom, background lock and zero root-style writes; removes fixture before functional tests. Assistant uses conversation, every other long Sheet uses modal-body. Covers AI Assistant/Settings, Food Library/Editor, Task, Workout, Cardio, Habit, GitHub Sync, Backup/Restore, Vision Import and other existing Sheets. Focused fake-keyboard sequences cover AI root/Key/model, Food name/energy/macros, Task title/note and assistant textarea. Orientation and real desktop height resize pass. These are Chromium geometry tests, never physical Safari gesture/keyboard results.

## Production verification (fields 47–49)

| # | Field | Result |
| --- | --- | --- |
| 47 | Actions | [37009831045](https://github.com/king-640-060/fitlog-lite/actions/runs/37009831045) SUCCESS at END_COMMIT; all Typecheck/Test/Build/Deploy steps SUCCESS; Pages6808900296 SUCCESS for the same SHA. |
| 48 | Production browser QA | Production390×844 /430×932: all eight mocked browser suites PASS (aiStreaming, aiAssistant, aiVoice, aiDualModelRouting, foodVision, interactionStabilization, sharedDatePicker, githubSyncSafety), zero page errors. Delayed incremental text, complete tools, Stop/history/secret guards, Voice/Quick, long Sheet toolbar/keyboard/scroll/confirm/replace, five tabs and existing write/date/Sync regressions verified. Production JS/CSS bytes and SHA exactly match the final Pages build. |
| 49 | Cross-deployment preservation | Same existing synthetic persistent profile across deployment: all14stores/15frozen historical records remain identical, saved AI Profiles/API Key/visionModel/Voice privacy acknowledgement fingerprints unchanged; no business reseeding/reset. Exact new JS loaded under the original Service Worker, then actual offline cold reload PASS. Desktop evidence only; not proof of external iPhone storage context. |

## Manual verification, versions and risks (fields 50–55)

| # | Field | Result |
| --- | --- | --- |
| 50 | Real Provider | Pending. No real Key/quota used. CORS, server buffering and real-model tool-delta compatibility/recognition quality require owner testing. |
| 51 | Physical iPhone Safari | Pending: real continuous touch scrolling, expanding/collapsing toolbar, input keyboard open/close and Safe Area, recognition/Stop. Chromium viewport mocks do not establish this. |
| 52 | Standalone PWA | Physical installed iPhone PWA Pending. Desktop original Service Worker update/offline cold boot is separately verified; not proof of native standalone keyboard/camera/storage routing. |
| 53 | Independent desktop AI icon | Pending / no verified same-storage iPhone launcher path. Existing manifest identity/start_url/scope unchanged. No duplicate installation or undocumented scheme recipe. |
| 54 | Versions | fitlog-lite-db, DexieV7/14stores, BackupV7, RestoreV1–V7, SyncEnvelopeV1, AIConfig/SystemPromptV1, FoodVisionPrompt/extractionV1. No migration/history recalculation/business-service changes. |
| 55 | Remaining risks | Real Provider/CORS/buffering, physical iPhone Safari/installed PWA/Speech and separate launcher storage context are Pending. Existing large JS bundle warning remains. No unresolved automated or production failure. Streaming bounded120s cap is intentional and reported. |

## Physical checklist (Pending)

1. Existing installed FitLog: each long Sheet20 touch scrolls up/down; toolbar opening/closing must not move Sheet or background.
2. Focus AI Key/Model/root, Food name/energy/macros, Task title/note and assistant textarea; visibility above real keyboard, dismiss without second jump or gap; rotate once.
3. Assistant real streaming: first text before completion, safe tools only after full response, Stop, upward reading, Mic final→stream without opening keyboard. Voice/manual Send/close/background continue correct.
4. Installed PWA: same checks, normal offline startup. Independent launcher requires original records and saved config/key without re-entry/Restore/Sync; Safari opening or second empty PWA fails that gate.

## ChatGPT Baseline

Read AGENTS → LATEST_DEV_REPORT → UI_INTERACTION_SPEC/INTERACTION_VISUAL_SYSTEM/AI_ARCHITECTURE/AI_QUICK_LAUNCH/FOOD_VISION_IMPORT. Application END1731f8d2386e2e2045691bc172d5092e648537e6 adds native chatStream/SSE with immediate safe text, complete indexed tool aggregation, same-response JSON fallback, Stop/reader cancellation, finalized-history exclusion for partial turns and45/30/120s timers. Voice/Quick share engine.send; Vision/probes stay nonstream, dual routing unchanged. Shared pure Sheet state uses focus+140px opening/80px closing, stable closed baseline and0 offsets, coalesced central updates, no toolbar reposition or per-sheet listeners, scoped residual keyboard correction, reference-counted original scroll lock.487tests/45files and eight local/prod mocked browser suites PASS; exact assets and same synthetic persistent14stores/15frozen rows plus AI config/key/visionModel/voice ack and SW offline cold boot PASS. Real Provider/Speech, physical Safari/installed PWA and separate Home Screen/storage-context launch remain Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1/manifest unchanged. Exact report/main/production SHA is in final receipt.
