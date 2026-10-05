# FitLog AI V1

AI is an optional layer over FitLog, never the source of truth. The model interprets language; FitLog reads facts, calculates numbers, validates mutations, and commits through existing services after explicit user confirmation.

## Provider boundary

`AiProviderProfile` is editable routing metadata. `AiProviderAdapter` separates transport from app tools; `OpenAICompatibleChatAdapter` implements the first protocol, `openai-chat-completions`, with native fetch. `AiClient` captures one profile and key for a complete request/turn. Chat and tools use `model`; `visionChat` uses optional `visionModel` through the pure `getVisionModel` helper, falling back to `model`. Both paths share the same transport and response normalization. No SDK, backend, forwarding proxy, cloud database, account, or new package is installed.

One profile has one Provider, Base URL and API Key. `visionModel?: string` is projected device metadata, not another profile or credential. Save trims it and omits an empty value; IDs above200 characters are rejected and known-secret scanning includes this field. The V1 reader ignores invalid optional values without rejecting a legacy profile. AI Config remains V1; no business DB, Backup or Sync migration.

Tool verification depends on Base URL + chat model + key. Vision verification depends on Base URL + effective image model + key. A Vision-only edit preserves tool verification. With an independent image model, a chat-model edit preserves Vision verification; without one it resets both. Root/key edits reset both. Equivalent effective routes preserve verification, including an explicit image ID equal to the fallback. The assistant's configuration signature excludes Vision metadata: a Vision-only save or probe preserves an active ordinary turn, history and proposals. Chat routing/tool capability/permission changes still clear the old session.

POST `{baseUrl}/chat/completions` sends `model`, `messages`, optional `tools` and `tool_choice`. The adapter normalizes `choices[0].message.content`, function `tool_calls`, and optional prompt/completion/total usage. Tool result messages use matching `tool_call_id` values. Ordinary assistant rounds additionally send `stream:true`; probes and packaging Vision keep the existing nonstreaming request. No model is selected automatically and no vendor-specific response field is assumed.

Official references verified for this implementation:

- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling): Chat Completions function definitions, assistant calls and matching tool result messages.
- [智谱 OpenAI compatibility](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction): preset API root `https://open.bigmodel.cn/api/paas/v4`. This is an editable address preset, not a core vendor binding. Models use exact explicitly fetched IDs with a manual fallback; no hard-coded model table is maintained.

Connection testing sends only `Reply with OK.`. A separate forced `fitlog_capability_probe` verifies actual tool-call output without app data. Profiles with unknown/unsupported capability can chat but receive no FitLog tools; even unsolicited calls cannot execute. A failed network/authorization probe is an error, not proof of incompatibility. GET `/models` is best effort, capped at 200 IDs; failure leaves manual model entry and the saved profile usable.

Model labels use the current active profile: model for chat/tools, getVisionModel(profile) for images. Editable profile names may contain an obsolete model ID and are not routing metadata. Food Vision, Settings and Assistant reuse aiProviderLabel; Vision uses aiModelRouteLabel, whose chat portion reuses aiChatModelLabel. Video Search settings reuse aiChatModelLabel without adding the separate image route. Preserve the existing rule: show the separate image line when visionModel is explicitly configured, including an ID equal to model; without it, display the shared model once. Capability status remains separate. Saving does not rewrite names or select another active profile.

## Assistant incremental streaming

`AiProviderAdapter.chatStream(request, callbacks)` returns the same complete `AiChatResponse` as `chat`/`visionChat`, while `onContentDelta` publishes safe text as bytes arrive. Only ordinary assistant model rounds use this path, including final Voice transcripts and quick-launch prompts. Tools and chat continue to use `model`; Vision uses `visionModel` with fallback. Connection/tool/Vision probes, model listing and strict Food Vision extraction remain nonstreaming. No new Provider setting, SDK, `stream_options`, retry or alternate request is added.

`src/ai/sse.ts` owns a pure incremental UTF-8 decoder and SSE line/event parser. It supports LF/CRLF/CR, boundaries within Chinese UTF-8, several events in one chunk, comments and multiple data lines joined with a newline. Only complete blank-line events dispatch. `[DONE]` finishes and cancels the remaining reader; normal EOF without it completes only after at least one valid delta and no truncated final data event. Malformed JSON/UTF-8/chunks reject with fixed safe errors. The cumulative raw response remains bounded at 2 MiB. HTTP200 `application/json` is normalized from the same response and emitted once; HTTP400 explicitly rejecting streaming gets fixed interface guidance. Neither case retries.

Tool deltas aggregate by bounded integer index (0–15). ID/type must stay consistent when repeated, function names and arguments concatenate in order. Each argument is checked incrementally against 64 KiB. Final ID/type/name/JSON validation precedes any registry execution; incomplete or `length`/`content_filter` tool termination rejects. UI never receives tool JSON. The existing 8-round/16-call guards, matching assistant-call/tool-result ordering, per-turn duplicate-ID cache, permission enforcement and proposal confirmation remain.

One thinking activity becomes one live assistant item on its first text delta. Subsequent deltas update that item; tool-only replies become local tool activity and the next model round gets its own thinking/live item. Usage accumulates only when a completed response supplies valid top-level token counts. Stop/close immediately abort; failed or stopped partial text remains visible with a safe error, but neither the partial answer nor that unfinished user turn enters finalized natural-language history. Business writes still occur only after a user confirms a validated proposal.

A rolling known-secret guard holds only a suffix that could begin a saved credential. It checks that bounded suffix plus the new delta before publishing, so a credential crossing chunks cannot leak and no entire growing answer is rescanned on each token. The complete response retains final secret validation; tool parameters stay hidden. Prompts, responses, tool arguments and credentials are not logged.

The assistant coalesces text paints with one `requestAnimationFrame`; busy start/end updates are immediate. The existing keyed bubble and its paragraph are reused with `textContent`, without HTML/Markdown rendering or business-page rerender. Scrolling follows only within72px of the bottom; an upward reader retains position. The streaming log/bubbles have `aria-live=off`, `aria-atomic=false`; a separate polite completion status avoids rereading a growing answer each token.

Protocol framing reference: [WHATWG SSE parsing](https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream); transport shapes: [Chat Completions reference](https://developers.openai.com/api/reference/resources/chat).

## Device configuration and privacy

| Device-only localStorage | Contents |
| --- | --- |
| `fitlog-ai-profiles-v1` | Up to 20 projected metadata profiles; no credential field |
| `fitlog-ai-active-profile-v1` | Active profile ID |
| `fitlog-ai-key-v1:<profileId>` | This profile's API Key |
| `fitlog-ai-permissions-v1` | Six read scopes + write-proposal permission |
| `fitlog-ai-privacy-ack-v1` | Device acknowledgement |
| `fitlog-ai-vision-privacy-ack-v1` | Independent first-image transmission acknowledgement |
| `fitlog-ai-voice-privacy-ack-v1` | Independent browser/system voice acknowledgement |

Food, Training, Weight, Plan, Habit, Nutrition Targets read permissions default on. Write proposals default on; there is no direct-write permission. The registry removes unauthorized definitions and checks authorization on every execution. Confirmation checks it again inside the business transaction. Reports require all five relevant health scopes; they contain no Tasks. Turning off Weight also removes the compound Report tool to avoid disclosure through reports.

Credentials, permissions, profile metadata, messages, usage, local nutrition plan handles and pending proposals never enter business stores, Backup or encrypted GitHub Sync. Editing a profile shows an empty password input and the saved-key placeholder. Empty edits preserve the stored key. Changing an effective capability route resets only its verification as described above. Deleting a profile requires UI confirmation and removes its key; deleting the active one disconnects AI.

First enablement states: “AI 功能会把你的提问，以及完成当前请求所需的 FitLog 数据发送给你配置的 AI 服务商。FitLog 不会自动上传整个数据库。”

Credential explanation: “API Key 只保存在当前设备浏览器。本模式适用于你自己的私人 FitLog；同源脚本和浏览器环境理论上能够访问该凭据。”

This browser BYOK architecture cannot conceal keys from same-origin scripts, browser extensions, or a compromised device. It is for the owner's private app. The chosen provider receives the question and the tool results required by a permitted request. No entire Backup is supplied to the model. Data passwords are not read by the assistant; the GitHub sync session and its memory secrets remain independent.

## Request safety and bounds

- HTTPS API roots only; HTTP is allowed solely for `localhost` / `127.0.0.1` local proxies. Embedded authentication, query and fragment are rejected. Trailing slashes are normalized. Known saved credentials cannot be placed in profile labels, models, endpoint paths, questions, tool arguments/results, or outgoing conversation context.
- Key only in the Authorization Bearer header; fetch uses `credentials: omit`, `cache: no-store`, `redirect: error`, and a bound global fetch receiver.
- Nonstreaming requests retain a 45 second AbortController timeout. Assistant streaming waits at most 45 seconds for headers, then 30 seconds without bytes, with a 120 second total cap; arriving chunks renew only the stall timer. Explicit Stop aborts the fetch and cancels the pending reader. No automatic retries, redirect following or fallback forwarding server.
- User text ≤6,000 characters; accepted response ≤2 MiB, measured while reading the stream; tool arguments ≤64 KiB; at most 16 calls per response and 8 tool rounds per user turn.
- Last 20 natural-language history messages, with a 50,000 character serialized request-context budget including tools. Older history is removed first. A current loop that cannot fit stops with a scope-reduction message rather than sending unbounded context or dropping required call/results.
- Each tool result ≤16,000 characters as valid JSON. Structural pruning marks `truncated: true`; never slice a JSON string into invalid syntax. The system prompt requires disclosure of truncation.
- Ranges: nutrition, Tasks and Habits ≤31 days; strength/cardio ≤90 days; Weight ≤365 days. Searches return ≤20 Foods. Tags/Tasks, recent sets, cardio sessions and habit definitions have additional result row bounds.
- HTTP statuses produce fixed Chinese messages; raw server bodies, URLs from exceptions, prompts, responses and credentials are not logged. CORS/network errors explain that direct browser connectivity may be blocked and that no alternate server is used.
- AI text and proposal values use textContent. No raw HTML/Markdown rendering, arbitrary HTTP, arbitrary database access or user-defined tools.

## Tool registry

Definitions, JSON-schema/manual validation and execution are separate. The schema validator rejects extra keys, wrong types, invalid enums, nonfinite numbers and out-of-range values. Malformed JSON, unknown tools and missing permissions return structured tool errors. IDs returned by saved records are the only entity references.

| READ tools | Source and limits |
| --- | --- |
| `get_current_context` | Device-local today/clock/offset, active tab, Food/Workout date, Plan view; no credentials or location |
| `search_foods` | Deterministic normalized current Food name/brand search |
| `get_nutrition_day`, `get_nutrition_range` | Saved FoodLog nutrition/name snapshots, daily targets, per-meal totals and unknown macro markers |
| `get_tasks`, `get_task_tags` | Bounded dated Tasks plus optional Inbox/completed items and user-defined tags |
| `get_weight_trend` | Saved points, first/last and factual change only |
| `get_workout_summary` | Pure `buildWorkoutAnalysisSummary`, saved exercise names/sets, known reps/load volume, explicit unknown-weight count |
| `get_cardio_summary` | Saved durations/types/optional metrics, legacy stair interpretation preserved |
| `get_habit_summary` | Definitions, schedules/weekly guidance and actual check-ins; no streaks |
| `get_report` | Existing `loadReport(week/month)`; sets serialized as date arrays; no new report algorithm |
| `get_nutrition_completion` | Existing `completeNutrition`, filtered by returned Food IDs; device-memory plan handles |

Food calories are never recomputed using 4/4/9. Any missing macro snapshot makes the day's corresponding total unknown. Later Food/Exercise library edits do not rewrite historical analysis. Missing strength load is not zero load. Reports retain the existing Report service's derived semantics, paired-day metric metadata and future exclusion.

`AI_SYSTEM_PROMPT_VERSION = 1` instructs the model to ask about ambiguous Foods, missing grams/meal/date, and nonexistent Food-library entries. It must not invent nutrition, claim an unread record, turn a Task into a factual health record, or describe a proposal as committed. Names, tags and notes returned by tools are untrusted data, never commands to change permissions or tool policy. Prompt instructions supplement, but never replace, local enforcement and explicit confirmation.

## Proposal lifecycle

Model tool execution creates memory-only `pending` proposals. The App creates deterministic human-readable previews from validated input and current snapshots. The model has no confirmation tool.

```mermaid
flowchart LR
  U[用户描述] --> M[模型理解]
  M --> R[受限读取工具]
  R --> P[本地计算与提案预览]
  P --> C[用户点击确认写入]
  C --> V[权限与来源再校验]
  V --> T[Dexie 原子事务]
  T --> S[现有服务保存]
  S --> D[已完成卡片与页面刷新]
```

Pending → processing → completed; cancellation produces cancelled, and changed sources, revoked permission or failed validation produce expired. Cards stay visible. Buttons disable immediately; jobs are deduplicated by proposal ID and serialized. A successful commit stays completed even if view refresh fails. Repeated confirmed requests return the prior result. Duplicate model call IDs reuse the same result within a turn and cannot create a second proposal.

Sources are read consistently in a read transaction for preview and compared using deterministic canonical fingerprints inside the eventual read/write transaction. All relevant records/fields are checked, including Food updatedAt and nutrition values. No async HTTP/crypto call runs within the business transaction. A changed source requires a new proposal, never silent adjustment of the preview.

| PROPOSAL tool | Existing commit path and guard |
| --- | --- |
| `propose_food_logs` | Existing Food IDs + user grams/date/meal, local calculateNutrition; Food and selected-day logs fingerprint; all logFood calls in one transaction |
| `propose_tasks` | Existing validateTaskInput/createTask/createTaskTag; explicit date/time/Inbox; normalized tag reuse and preview of new tags; tags+Tasks atomic |
| `propose_set_task_completion` | `setTaskCompletionState`, desired boolean; saved Task fingerprint |
| `propose_weight` | Existing upsertWeight; old→new replacement preview and current record fingerprint |
| `propose_nutrition_target` | Existing saveNutritionTarget; before/after, only explicitly supplied nutrients; absent items remain unset; current target guard |
| `propose_habit` | Existing createHabit/validation; optional planning guidance; existing definitions guard |
| `propose_set_habit_checkin` | `setHabitCheckInState`, desired boolean; active definition and habit/date state guard; schedule never restricts a day |
| `propose_cardio_session` | Existing validateCardioInput/saveCardioSession; duration/type/speed/incline preview and selected-day sessions guard |
| `propose_adopt_nutrition_plan` | App-owned immutable optimizer plan ID only; no model-authored grams; Food/target/logs source fingerprint; existing applyNutritionCompletionPlan |

Future nutrition completion may be previewed, never adopted as factual FoodLogs. AI direct Food proposals also reject future factual intake and suggest a Task instead. There are no Workout/Pelvic factual-session creation tools or destructive/Restore/Clear/Sync tools.

## Assistant and refresh

Five topbars share one compact AI entry before Management, keeping five bottom tabs. Food retains Template and Library actions at 320 px. The nearly full-height shared Sheet has a stable header/composer, its own conversation scroll, VisualViewport-aware height/bottom and Safe Area padding. Textareas use 16px, grow to 120px, keep Enter for a newline and require explicit Send or Ctrl/Cmd+Enter outside IME composition.

Conversation, usage and proposal cards survive closing/reopening within the page. Reload clears them. Clear conversation deletes only AI memory; settings and business data stay intact. Stop/failed turns cancel their newly created pending suggestions without business writes. Closing the assistant stops an active request. Chat routing/tool capability/permissions changes clear the old AI session; Vision-only changes preserve it. Successful confirmation refreshes the relevant current view using existing render functions, without reload or reconstructing an active strength editor. Pending strength edits are flushed before opening AI.

## Verification and future scope

Unit files: aiProvider, aiProfiles, aiTools, aiProposals, aiOrchestrator, aiSecurity, aiUiHelpers. Browser script `tests/browser/aiAssistant.mjs` intercepts synthetic provider requests in fresh synthetic browser contexts at four mobile sizes; production uses 390/430. Existing frozen-V7, GitHub Sync and Shared Date Picker gates remain required. These mocks verify app behavior and protocol shape; they do not establish a real vendor's model quality, CORS policy or tool compatibility. Physical iPhone Safari/PWA keyboard and Safe Area behavior remain a distinct manual verification category.

Future protocols can supply a new adapter, preserving the same tools, facts, proposals and write-confirmation semantics. Streaming, remote/backend credential custody, search, MCP/RAG, automatic plans or automatic writes remain outside V1. Voice is an optional input method described below. Packaging Vision uses the direct workflow below.

## Packaging Vision

Profiles retain AI Config V1 with optional independent `visionCapability`; legacy readers default missing Vision to unknown. Image requests and the exact-digit probe use `visionChat`, with optional `visionModel` and legacy fallback. `visionRoutingSignature` checks profile ID/root/effective image model/key before applying a captured result; changing the image route rejects stale extraction, while a chat-only change with independent image routing remains valid. The existing client and adapter accept OpenAI-style text/image_url parts. Transport rejects remote/file/blob/script/SVG images and image content outside user messages. The only user image path is an explicit local file processed on a new Canvas and re-encoded JPEG; the capability probe uses our local PNG with 731. Unknown allows user-initiated recognition; a valid extraction can establish support. Correct exact digits also verify support, explicit image rejection establishes unsupported, while wrong digits/network/status/timeouts leave unknown. No model is fixed and no package is added. Protocol shape was checked against [official Images and Vision documentation](https://developers.openai.com/api/docs/guides/images-vision).

The shared UI calls `analyzeFoodPackageImages` directly with prompt version 1, no business records, conversation or tools. It accepts strict extraction JSON or one whole JSON fence, rejects additional keys/strings/percent values/nonfinite/negative values/unsupported units, and checks bounded evidence contains the corresponding number and unit. This only checks transcription consistency, not whether a model truthfully read the image; user review remains required. Unknown values stay null. The App converts energy by 4.184, retains label nutrition basis in grams, and requires actual grams for mL/unknown bases. Images/extraction never enter business stores/Backup/Sync or assistant history.

Local bounds: 2 images (required nutrition table, optional front), 20 MiB/source, 60 million decoded pixels, 1800px long edge, 3 MiB/encoded image, 6 MiB total binary, 9 MiB serialized request, 16000 extraction characters, 100-character evidence, 8 warnings. Native browser HEIC decoding is optional; unsupported files request JPEG/PNG. Shared transport retains 45s timeout/Stop, bounded response, safe fixed errors, no retry/proxy and Bearer-only credentials.

These are transport ceilings. Food Vision defaults to Fast nutrition1400px/JPEG.82/.80/.78/≤1500KiB/detail auto and front1000px/.80/.78/≤800KiB/detail low. High1800px/.88/.84/.80/detail high is an explicit retry requiring another user click; it is never automatic. Async canvas JPEG strips metadata; current-Sheet source files permit manual re-encoding and are released on close/save/remove. Numeric-only timing is memory diagnostics, never chat/history/DB/Backup/Sync. See `docs/FOOD_VISION_IMPORT.md` and the mobile QA matrix.

`FoodVisionWrite` captures an immutable validated Food/intake preview, cancels without writes and deduplicates confirmation jobs. It calls existing saveFood/logFood in one transaction; a failed FoodLog write rolls back the Food. Saved-only Food may continue to an intake preview, which rechecks the current saved Food before writing its snapshot. This is a user-operated form, not a model tool that can confirm a proposal; no AI registry mutation API was added. Library and historical snapshots retain existing semantics. DB V7 / Backup V7 / Restore V1–V7 / Sync Envelope V1 are unchanged.

Canvas JPEG qualities are .88, .84, then .80 only if required by the output bound. Native orientation decode precedes drawing; output strips EXIF/GPS. Gallery never forces camera. Images exist only in workflow memory and do not enter AI history, storage or reports. Both privacy notices explicitly acknowledge provider-controlled handling. Text/model/tool/schema fields keep known-secret scanning; validated image data receives MIME/signature/size checks without textual secret substring scans across base64.

The parser accepts optional `nutrients.energyKj` for a second observed kJ value alongside explicit kcal. Neither the model nor the UI recomputes label values; a local difference above max(1 kcal, 5%) adds a review warning. kcal is preferred and saved directly. Manual and Vision editors preserve canonical kcal across unit-only switches. Duplicate handling compares normalized name and brand locally without sending the library. Use/update/new require explicit selection; existing-food preview fields are rechecked in the transaction. Update plus intake is atomic, while historical FoodLog snapshots remain unchanged.

## Settings and assistant presentation (stabilization)

AI Config and all execution/storage contracts remain V1. `aiSettings.ts` now owns UI-only current-service, editor, permissions, management and privacy subviews. Overview performs no request. 智谱 uses its existing preset root, normally hidden; custom roots and advanced endpoint/name edits remain generic. Explicit model refresh uses the existing bounded adapter, preserves an absent current ID and falls back to manual input on failure. No vendor model defaults are added.

Save and Test commits device configuration first, then runs the existing data-free Chat, forced Tools and exact-digit Vision probes sequentially. Results are independent: unsupported/error in one capability does not discard the profile or prevent the next probe. Only captured root/key/model results may be applied; field changes abort and invalidate pending work, subview/close changes also invalidate the UI generation. Individual tests and save-only remain advanced. Keys stay in device storage and empty DOM values after saving.

The model section says “对话与 FitLog 数据模型”. Image routing defaults to “使用同一个模型”; “单独选择图片模型” progressively reveals a second selector. One explicitly fetched `/models` array is cached only in the editor session and reused by both selectors; expansion makes no request. Root/key changes clear that cache. Every exact returned ID is selectable; no model-name heuristic determines image support. Both selectors preserve absent current IDs and allow manual fallback on list failure. An unsupported fallback image model receives a quiet “选择图片模型” action while the working chat/tool model is retained. Overview adds a short image model line only when independent.

Six read switches and write proposals are in a separate permission view with real input controls. Enforcement remains in the unchanged registry/proposal transaction. UI simplification adds no permission or mutation path. The assistant filters the existing repeated chat-only notice from ordinary message rendering and displays one compact status notice, while protocol/history semantics remain unchanged. HTTP 400 adds an actionable fixed Chinese message; optional raw provider diagnostics are deliberately not displayed.

Assistant and Vision use the common Sheet viewport/lifecycle; no private resize listeners remain. Conversation/proposal DOM updates, IME shortcuts, near-bottom scroll, Stop, camera and memory session behavior remain. Header controls are quiet icons; the composer reserves the same width for Send/Stop. Mock browser verification and physical iPhone/provider checks remain distinct.


## Voice input and quick launch

`SpeechRecognitionService` feature-detects standard / Safari-prefixed Web Speech recognition. Chinese (`zh-CN`), one finite session, interim results and one alternative; no FitLog audio capture, upload, backend, STT provider or dependency. Browser/OS processing may require network. Interim text stays in a live status area; final segments are deduplicated by result index and published only once on `end`. Stop asks the service to finish; abort invalidates session callbacks before detaching. Close/hidden/pagehide abort, dispose removes handlers/listeners, and no session restarts itself.

The assistant's shared `submitText` path handles typed, final voice and quick text. Profile, privacy, busy, composition and 6000-character checks precede unchanged `engine.send`, known-secret guarding, provider/tool routing, scopes and proposals. Voice combines existing composer text with final transcript using a newline. Manual Send aborts voice and sends current typed text only. Voice never confirms a card. Camera/Vision model support and Tools support do not gate ordinary voice chat.

`quickLaunch.ts` parses only fragment fields: `#quick=ai`, `#quick=ai&voice=1`, `#quick=ai&prompt=<encoded text>&send=1`. Prompt is untrusted ephemeral text, decoded once, trimmed and bounded. Unknown fields are ignored; malformed/oversized prompts do not launch. Valid and rejected AI fragments are consumed immediately using `history.replaceState`, preserving pathname/query/Pages base. Startup routes after database/render readiness; warm hashchange uses the same serialized opening/autosave flush. An already-open assistant receives the intent without a second Sheet or stopping an active turn. Busy prompts stay in the composer with no deferred automatic send; privacy-blocked prompts may continue after acknowledgement if unchanged. Missing service keeps the draft; in-page close/reopen preserves it only in memory, reload clears it.

Voice privacy is a separate device-local acknowledgement, excluded from DB/Backup/Sync along with all drafts/recognition state. No mic silently starts on first disclosure. Quick Voice without active user activation shows a calm start button; automatic policy denial also falls back to that button. Feature detection and mocks do not prove physical Safari/PWA microphone or external launcher behavior. See [AI_QUICK_LAUNCH.md](AI_QUICK_LAUNCH.md) for the contract and storage verification gate.

## PWA update safety

PWA version diagnostics never read or expose AI profile credentials. User-confirmed updates block busy requests, unsent in-memory assistant drafts and pending/processing proposals, including after the assistant closes. Confirmation explicitly states that completed in-memory conversation ends on reload. Vision forms and selected images block switching while their Sheet is open. Settings/keys remain device-local and unchanged. See [PWA_RUNTIME.md](PWA_RUNTIME.md).


## Exercise video search and contextual meal estimates

`search_training_videos({query,limit?})` is an external app-owned READ tool, with no private business scope requirement. Default3, limits1–5, trimmed120-character exercise/technique keywords only. The app-owned TrainingVideoSearchRouter routes Bilibili through the official Zhipu Web-Search-Pro endpoint and preserves the YouTube native adapter, with timeout/AbortSignal, omit credentials, no-store, redirect rejection and128KiB response bounds. Known-secret guards include the separate video credential. No scraping/proxy/arbitrary URL or speculative model links. Metadata sent to the model omits URLs/HTML; typed `videos` conversation items hold validated results in memory. Orchestrator's existing duplicate-call cache also protects quota. Stop/close cancels pending search; reload/Clear removes artifacts, reopen does not search.

`VideoSearchConfigV2` migrates the old YouTube metadata/key without deletion; Bilibili has a separate device-local credential unless the active profile has the explicit compatible Zhipu route identity. AIConfigV1 and business persistence remain unchanged. An independent `fitlog-video-search-privacy-ack-v1` disclosure authorizes keyword transmission and external playback. Settings save/test has no implicit fetch on opening; saved Key stays blank. Plainly disclose browser credential accessibility and recommend API/browser restrictions.

Strict YouTube IDs and canonical Bilibili BV IDs derive trusted watch/embed/player URLs locally. Cards are text-only DOM, with stable missing-thumbnail fallback,44px actions and bounded titles. Only Play creates an official youtube-nocookie iframe and lazily loads YouTube's official IFrame API for ready/error events. No npm player dependency. No autoplay; inline/fullscreen/source identity. One player; switching/close/Clear destroys it. Loading/failure text stays outside provider controls; bounded fallback retains external noopener/noreferrer opening. Small-screen player minimum200px height follows current YouTube requirements. See [VIDEO_SEARCH.md](VIDEO_SEARCH.md) for verified official constraints.

Meal Photo Estimate uses `mealPhotoEstimateService` directly through the active adapter's Vision route (`visionModel || model`), separate from packaging transcription, agent tools and chat history. Canvas preprocessing strips EXIF/location, max2 local images; a WeakSet admits only local preprocessing products to this workflow. Independent `fitlog-meal-photo-privacy-ack-v1` consent precedes transmission. Exact JSON keys summary/caloriesLow/caloriesHigh/assumptions; finite ordered0–100000 kcal range or paired nulls, bounded copy, no macro/gram output. No fenced/raw text or extra keys. Review/explicit use fills a draft; Save stores only final estimate, original bounds/source and user's note. Images/raw provider JSON/prompts are never persisted. Day scope disables photos and clears previous photo estimates on conversion.

`get_nutrition_day` and `get_nutrition_range` return separate bounded `dietEvents` context under existing food+nutritionTargets permissions. Notes cap240 characters,10 events/day, explicit truncation/possible overlap. Estimates never alter actual FoodLog snapshot totals, targets or strategy provenance. There is no DietEvent proposal/chat write tool. DatabaseV10/18stores and BackupV10/RestoreV1–V10 include only this independent business entity; manual encrypted Sync/envelopeV1 remain unchanged.

### Optional training journals

`Workout.note` and `CardioSession.note` remain the only journal fields. They are normalized at 2000 characters, preserved through existing V10 Backup/Restore and V1 Sync, and shown progressively in their owning editor/details. READ tools expose bounded notes as `user-authored journal` / `subjective`; there is no AI journal write tool.
