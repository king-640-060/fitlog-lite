# FitLog AI Voice and Quick Launch

## Shipped app capabilities

Voice is an input method for the existing assistant. Final text now receives an incremental streamed assistant response through the same `engine.send → chatStream` path as typed and quick-launch text. Stop/close cancel it; unfinished output remains UI-only and does not enter finalized history. Probes and packaging Vision remain nonstreaming. Open normal FitLog → AI 助手 → Mic, acknowledge first voice use, speak, then recognition end auto-sends final text. Normal AI entry stays text-first. No wake word, background mic, voice backend, audio attachment, new Provider/key or direct business write.

The app-side quick-launch contract is implemented. **An independent iPhone Home Screen “FitLog AI” launcher and one-tap-to-listen are Pending**, with no verified same-storage path in this environment. No physical iPhone was accessible. App-side tests do not establish launcher safety.

## Fragment contract (developer integration)

| Fragment | Intent |
| --- | --- |
| `#quick=ai` | Open ordinary assistant |
| `#quick=ai&voice=1` | Request Voice Mode |
| `#quick=ai&prompt=<URL-encoded text>` | Prefill untrusted text |
| `#quick=ai&prompt=<URL-encoded text>&send=1` | Request existing text send after readiness gates |

Production base: `https://king-640-060.github.io/fitlog-lite/`. Encode text using `encodeURIComponent`; fragments are never ordinary query parameters. Voice and prompt may combine but existing busy gating prevents simultaneous AI/speech work. Other targets do nothing; unknown fields are ignored; explicit value `1` is required. Decode once, trim, reject malformed encoding or more than 6000 characters. Empty text cannot auto-send.

Consumption happens immediately through `history.replaceState`, preserving existing history state, pathname, ordinary query and Pages base. Rejected AI fragments are erased too. Cold start waits for database opening and initial render before assistant routing. Warm `hashchange` routes through the same serial queue and awaits workout autosave. One primary Sheet is reused if already open; replacement otherwise follows normal cleanup. Fragment removal does not trigger a second route. Reload never repeats a consumed prompt.

Prompts are untrusted user text. They never become HTML, tool commands, direct DB writes or arbitrary HTTP. Shared submitText → engine.send retains secret checks, bounded context, selected provider, scopes, registered tools and explicit proposal confirmation. Unknown/unsupported Tools still permit ordinary chat; unsupported Vision does not disable Mic. Chat/tools use `model`; packaging images use optional `visionModel` with existing fallback.

Busy auto-send preserves text and says “上一条请求还在处理中。”; completion of the old request does not auto-send the draft. No profile retains composer text and offers existing connection UI. Missing AI privacy acknowledgement retains text; explicit acknowledgement may continue the same unchanged pending prompt. Editing cancels that pending auto-send. Drafts survive in-page close/reopen in memory, including visits to settings, but reload clears them. No prompt/draft is written to localStorage, sessionStorage, logs, analytics, Backup or Sync. URL fragments still exist in the launching surface/history until consumed; launchers must not persist them or place credentials in them.

## Speech implementation and lifecycle

`src/services/speechRecognitionService.ts` is the browser API boundary. Feature detect `SpeechRecognition`, then `webkitSpeechRecognition`. Use `lang=zh-CN`, `continuous=false`, `interimResults=true`, `maxAlternatives=1`. State: idle, starting, listening, stopping, unsupported, error. No dependency or vendor-specific speech integration.

Interim and already-final partial segments are status text only. Result indices replace earlier versions; aggregate final text once at `onend`. A session generation invalidates late/double callbacks. No speech/error means no send; fixed Chinese errors hide browser diagnostic details. Manual Mic Stop calls `stop()` and final/end may send once. Manual Send aborts recognition and sends only current composer text. Existing typed text and final voice combine with a newline; an oversized combined draft stays available to edit. Close/dispose, nonvisible document and pagehide abort, never send. All recognition handlers and lifecycle listeners are detached; no restart or retry.

Voice never focuses the textarea; an existing text focus is blurred before start. Error/blocked final text is not automatically focused. Listening has a quiet static dot/status; no decorative animation. The existing shared Sheet owns Safe Area/viewport and independent conversation scrolling. At 320px a two-row composer keeps Camera/Mic/Send and a usable 16px textarea; larger screens use one row. AI busy disables Mic. Speech/privacy controls have 44px touch targets and keyboard focus remains accessible.

Unsupported copy: “当前浏览器不支持网页语音识别，可以使用系统键盘听写。” Ordinary text Send remains available. Browser/system speech may require network, OS Siri settings or microphone permission; support detection does not guarantee successful recognition.

## Privacy and activation

First-use disclosure (also AI Settings → 隐私说明):

> 语音会由当前浏览器或系统提供的语音识别服务处理。FitLog 不保存录音；识别后的文字会按正常 AI 流程发送给你配置的 AI 服务。

Only `fitlog-ai-voice-privacy-ack-v1=1` is persisted, device-local and separate from AI/Vision acknowledgements. It is excluded from the business DB, Backup and Sync. FitLog neither captures a MediaStream nor creates audio files/Blobs/ObjectURLs nor uploads audio to the AI Provider. The browser/system's processing must not be called guaranteed local-only or offline. Only final text enters normal in-memory AI history; browser/provider retention is outside FitLog's control.

App Mic is an explicit gesture. On first use it shows acknowledgement, then starts from that gesture. Quick Voice without acknowledgement shows “开始语音”, never silently listens. Without active user activation, show “准备好后开始说话” / “开始说话”. `navigator.userActivation` is only an auxiliary signal: an attempted automatic start may still be denied; return quietly to the start button. Explicit user permission denial explains system microphone settings. No repeated permission requests/automatic retries. Physical daily launch tap count remains Pending.

## iPhone launcher and storage gate

**PWA external launcher pending / unsupported by verified path.**

PWA cannot currently provide a verified separate one-tap Home Screen AI launcher without risking a distinct storage context. Safe independent Home Screen icon not verified under current PWA architecture. Do not give an unverified “follow these Shortcut steps and it is safe” recipe. Candidate methods require physical verification first.

Preserve the existing manifest identity, `start_url='.'`, scope, offline fallback/autoUpdate, icons and normal full-app start. No second manifest/install/database/profile/key copy, no `webapp://` or other undocumented scheme. A Safari URL and a duplicate Home Screen installation must not be assumed to share the installed PWA's IndexedDB/localStorage. A matching origin or visible app name alone is insufficient evidence.

### Physical verification checklist (all Pending)

1. In the **existing installed standalone FitLog**, verify recognizable existing Food, Weight and Task records plus the saved AI Provider configuration. Do not print/export the Key.
2. Record the same-context evidence using visible data and a nonsecret configuration fingerprint; do not mutate real data for convenience.
3. Open any candidate external launcher. Require original standalone FitLog, original records and saved Provider/key working without re-entry, Restore or Sync.
4. Safari opening = FAIL for the formal local-first launcher. A second empty web app = FAIL. Re-entering Key = FAIL. Stop offering that candidate as safe.
5. Only after same-context PASS test first microphone permission, later launches, real Chinese recognition, close/background abort, and proposed-write safety.
6. Measure everyday taps after permissions: one tap → listening, or one tap → Voice screen + second tap → start. Record first-use OS permission separately. Do not turn desktop mocks into an iPhone result.

No physical device result is claimed by this release. Real SpeechRecognition, physical Safari, installed PWA, external icon, same-storage routing, one-tap-to-listen and real Provider remain separate Pending categories.

## Verification and future native contract

Unit: quickLaunch, speechRecognition, aiVoiceInput plus complete existing suite. Browser: aiVoice uses synthetic SpeechRecognition/Provider events in isolated contexts, local 320×812 / 375×812 / 390×844 / 430×932, production 390/430. Existing Assistant, Dual Model, Food Vision, Interaction, Shared Date Picker and GitHub Sync suites remain release gates. The same synthetic persistent production profile is compared across deployment with all 14 stores/15 frozen historical rows, without reseeding after release. No DB migration: fitlog-lite-db, Dexie V7/14 stores, Backup V7, Restore V1–V7, Sync Envelope V1, AI Config/System Prompt V1.

If guaranteed separate icon/Siri/Action Button/lock screen is needed later, design a thin native companion/App Intent in a new round. It must first guarantee a safe data-context boundary, hand off only ephemeral user text through this contract, retain the same Provider and proposal checks, and accurately report activation limits. This release adds no Xcode project or native integration.

## Primary platform references

- [WebKit Safari 14.1 speech recognition](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/): browser speech uses the Siri engine and OS availability requirements; not proof of physical FitLog operation.
- [WebKit Safari 17.2 Home Screen storage](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/): cookies may copy during installation, other local storage does not. This supports treating separate install/context as a data risk; it does not prove any candidate launcher.
- [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition): limited browser availability, final/interim and stop/abort APIs, implementations may use a server service.
