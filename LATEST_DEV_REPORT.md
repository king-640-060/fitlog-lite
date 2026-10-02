# FitLog Lite — Latest Development Report

Latest verified production application snapshot. Sync main before trusting recorded SHAs. The report is a separate documentation commit after END_COMMIT.

## Unreleased local work — Food Packaging Vision

Local implementation `6c99796f2147d20c3f7baeee234361433ff1ee67` adds the shared packaging Vision workflow and passes 367 tests / 37 files, typecheck, normal/Pages builds and four-size Vision/AI/DatePicker/Sync mock UI checks. It has **not been pushed or deployed**: the task attachment ends at section 21 / line 686 and the remaining specification has been requested but not received. Production main remains `a677eca53d2653c7764b845b365d075dced2481a`. Read [the unreleased report](docs/AI_FOOD_VISION_DEV_REPORT.md) before continuing; preserve these local commits and finish requirement review before release. The following sections describe the previous verified production snapshot.

## Git and Production State

| Field | Verified value |
| --- | --- |
| Branch | `main` |
| START_COMMIT | `3d752d992f8bf9bebd66d247318e3ea9ca2e6f3c` |
| AI_PROVIDER_COMMIT | `a376835b46a2adaeae6569e904003e478708028e` — Add configurable AI provider infrastructure |
| AI_TOOLS_COMMIT | `57c738dd6951d5647e864b0ffc4416271ac49878` — Add FitLog AI tool and proposal layer |
| AI_ASSISTANT_COMMIT | `303bb4b93551cfb89f3049c59cd3d2d934324f9a` — Add FitLog AI assistant workflow |
| REGRESSION_FIX_COMMIT / END_COMMIT | `38a6bdc26f30f2f27100ac00ca78cb784003bf16` — Avoid asynchronous task tag focus stealing |
| REPORT_COMMIT / latest main HEAD | Separate commit titled `Document AI assistant verification`; resolve with `git log -1 --format=%H -- LATEST_DEV_REPORT.md`. The final user report supplies the exact SHA; a document cannot embed its own SHA without changing that SHA. |
| Production | https://king-640-060.github.io/fitlog-lite/ |
| Initial AI Actions | [36961379709](https://github.com/king-640-060/fitlog-lite/actions/runs/36961379709), completed / success |
| Final application Actions | [36962148024](https://github.com/king-640-060/fitlog-lite/actions/runs/36962148024), completed / success |

The initial tree was clean on main. Git pull failed on a GitHub TCP timeout; the GitHub API independently confirmed the remote main SHA exactly matched local START_COMMIT. The first three implementation commits were published by normal Git fast-forward. Publishing the follow-up regression fix encountered another Git TCP timeout; the GitHub API recreated identical blobs/tree/commit, verified the exact local SHA and updated the ref with `force: false`. No force push, alternate code history or dependency update occurred.

## Provider Architecture and Configuration

`AiProviderProfile` → `AiClient` → `AiProviderAdapter` → `OpenAICompatibleChatAdapter`. V1 uses native fetch and `openai-chat-completions`: POST API root `/chat/completions`, model/messages/optional tools/tool_choice; normalized text, function calls and optional usage. `buildAiRequest` is pure and explicitly projects protocol fields; credentials stay in transport headers.

Profiles support add/edit/test/activate/switch/delete. API Base URL and model are editable. The only vendor preset is an editable 智谱 address, verified against [official OpenAI-compatible documentation](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction): `https://open.bigmodel.cn/api/paas/v4`. Model is not hardcoded. The [OpenAI function-calling guide](https://developers.openai.com/api/docs/guides/function-calling) was checked for Chat Completions tool definitions and matching call-result IDs. There is no SDK, backend, proxy fallback, cloud database, account, or new package.

| Device-only storage | Purpose |
| --- | --- |
| `fitlog-ai-profiles-v1` | Projected nonsecret profile metadata, protocol/preset/capability/timestamps |
| `fitlog-ai-active-profile-v1` | Active ID |
| `fitlog-ai-key-v1:<profileId>` | Separate API Key per profile |
| `fitlog-ai-permissions-v1` | Read scopes + write-proposal preference |
| `fitlog-ai-privacy-ack-v1` | Device privacy acknowledgement |

Saved keys are never placed into edit-input values. Empty key edits preserve the existing key. Profile deletion is explicitly confirmed and removes its key; deleting the active profile disconnects AI. Routing/model/key changes invalidate prior tool-capability verification.

Tiny connection tests send only “Reply with OK.”, never FitLog records. A separate forced `fitlog_capability_probe` tests actual tool-call behavior without business data. Unknown/unsupported capability permits plain chat only, with no registered tool definitions or execution. GET `/models` is best effort, capped at 200 IDs; failure does not invalidate a profile or manual model entry.

First enablement explains questions/necessary records will be sent to the configured provider, never an automatic whole-DB upload. Credentials remain device-local but are accessible to the same-origin browser environment. Profiles, credentials, permissions, chat, usage, plan handles and proposals are excluded from all business stores, Backup and encrypted Sync.

## AI Permission Model and Reading

Six independent read scopes default on: Food, Training, Weight, Plan, Habit, Nutrition Targets. Write proposals default on, but no setting enables direct writes. Definitions are filtered and execution is rechecked locally. Confirmation rechecks scopes/write preference within the business transaction. Compound tools require their relevant scopes; for example, disabling Weight also disables the compound Report tool. Configuration or permission changes clear old session context and pending proposals.

READ tools:

| Tool | Source/meaning |
| --- | --- |
| `get_current_context` | Device-local today, clock, timezone offset, tab, Food/Workout dates, Plan view |
| `search_foods` | Deterministic normalized Food name/brand search, max 20 |
| `get_nutrition_day` | FoodLog historical snapshots, targets, meal/day totals, gaps and unknown macros |
| `get_nutrition_range` | At most 31 days of snapshot totals/targets/counts; no raw full-database upload |
| `get_tasks` | At most 31 days, optional bounded Inbox/completed records; tags and saved completion |
| `get_task_tags` | Bounded user-created tags |
| `get_weight_trend` | At most 365 days, saved points, first/last/change only |
| `get_workout_summary` | At most 90 days; pure saved-name/set analysis, known reps/weighted-set count/known load volume, first/last/recent sets |
| `get_cardio_summary` | At most 90 days; saved type/duration/available speed/incline; legacy stair interpretation preserved |
| `get_habit_summary` | At most 31 days; definitions, optional planning guidance, actual dates/counts; no streaks |
| `get_report` | Existing loadReport week/month; no alternative report algorithm or Task health metrics |
| `get_nutrition_completion` | Existing deterministic completeNutrition, allowed/excluded current Food IDs and memory-only plan IDs |

Calories are independent saved facts, never macro 4/4/9 estimates. Missing macro snapshots remain unknown even when other logs contain that macro. Editing/deleting current Food/Exercise library items does not rewrite old FoodLog/Workout results. Weight change is factual rather than forecast. Strength volume includes known load × known reps only; missing load is explicitly unknown, not zero. Legacy RPE remains in business snapshots/Backup but is not projected into the AI strength interface.

## Proposal and Confirmation Architecture

The model never commits a mutation. Registered PROPOSAL tools validate inputs, read sources consistently, and create App-calculated memory-only previews. Confirming a card disables immediately, deduplicates its job and rechecks permissions plus canonical source fingerprints in the read/write transaction. Existing services commit the mutation. Repeated confirmation returns the existing result; cancellation, failed validation, changed source or revoked scope does not write. All-or-nothing batches use one transaction.

| PROPOSAL tool | Behavior |
| --- | --- |
| `propose_food_logs` | Existing Food IDs and user grams/date/meal; local nutrition preview; exact current Food fields/updatedAt and selected-day log guard; multiple logFood calls atomic |
| `propose_tasks` | Validated title/note/date/times, Inbox when no date; normalized tag reuse and explicit new-tag preview; Tasks + new tags atomic |
| `propose_set_task_completion` | Existing Task guard and desired boolean via setTaskCompletionState; repeated desired state never toggles |
| `propose_weight` | Old→new preview, saved-record guard and existing upsertWeight |
| `propose_nutrition_target` | Explicit supplied goal fields, before/after preview, existing target guard/saveNutritionTarget; unspecified macros remain unset, calories independent |
| `propose_habit` | Existing Habit validation/createHabit; optional days/weekly guidance; definitions guard |
| `propose_set_habit_checkin` | Active definition + habit/date guard and desired boolean via setHabitCheckInState; schedules never restrict an allowed day |
| `propose_cardio_session` | Existing validateCardioInput/saveCardioSession, type/duration/speed/incline preview and same-day sessions guard |
| `propose_adopt_nutrition_plan` | Only App-owned immutable local optimizer planId + meal; no model-authored grams; Food/target/logs guard and existing applyNutritionCompletionPlan |

Nonexistent/ambiguous Food requires library clarification rather than invented nutrition. Future factual Food proposals are rejected; future local nutrition plans may only be previewed. AI can analyze strength/Kegel reports and suggest Tasks, but cannot create Workout or Pelvic factual sessions. There are no delete, arbitrary DB/HTTP, Clear, Restore, Backup or GitHub Sync tools.

## Assistant Workflow and UI

All five normal topbars expose a compact AI icon before Management. The five bottom tabs are unchanged. At 320px Food retains Template and Library actions. Settings belongs to Management → Application before About.

The near-full-height Sheet has stable header/composer, its own scroll, six Chinese suggestions, active profile/model, quiet per-response/session usage, Send and Stop. It adapts its height/bottom to VisualViewport and keeps Safe Area separate. The textarea is 16px, grows only to 120px, uses Enter for newline and Ctrl/Cmd+Enter for explicit sending outside IME composition. User/model strings and proposal values render as text; raw HTML is never interpreted.

Conversation/proposals/usage live in memory and survive closing/reopening. Reload clears them. Clear conversation clears only AI state. Closing stops an active request. Failed/aborted turns cancel newly created pending proposals. Proposal cards remain visible as 待确认 / 处理中 / 已完成 / 已取消 / 已失效. AI has no confirm tool, and chat text cannot substitute for the button. Successful local confirmation records an application event for later conversation and refreshes the relevant current view without reload or reconstructing an active strength editor. Pending strength edits flush before opening AI.

The orchestrator handles multiple read/proposal calls and final explanations with matching IDs. Duplicate tool IDs reuse cached results within a turn. Unknown names/bad JSON/schema/permissions produce structured errors. No old tool payload is persisted into later turns.

## Limits, Secret and Network Protection

- HTTPS roots only, except explicit localhost/127.0.0.1 HTTP proxy. Reject user/password URL, query/fragment and known credentials in metadata/endpoints.
- Bearer header only; credentials omit, no-store cache, redirect error; native fetch has a bound global receiver.
- AbortController timeout 45 seconds, Stop and no automatic retry or alternate forwarding server.
- User text 6,000 chars; response 2 MiB measured during stream reading; tool arguments 64 KiB; 16 calls per response; 8 tool rounds per turn.
- Last 20 natural-language history messages; serialized request context/tools ≤50,000 chars. Trim prior history first, then stop a current loop that cannot fit.
- Tool output ≤16,000 chars as valid JSON with explicit truncated=true structural pruning, not broken string slicing.
- Exact current/saved AI keys and saved GitHub Token are blocked in user text, tool arguments/results and outgoing history. Returned known secrets are blocked rather than displayed. AI never reads the GitHub password session or exports a Backup to the API.
- Provider failures use fixed safe Chinese text; no raw body, credentials, prompts or responses are logged. CORS/network failure explains browser direct-connect limitations and does not trigger fallback routing.
- Names/notes/labels are untrusted tool data; system prompt V1 requires factual snapshots, ambiguity clarification, explicit confirmation, no secrets and no medical/causal claims. Local registry and transaction guards enforce policy independently of model behavior.

## Automated Verification

- **335 tests / 35 files PASS**, compared with the actual initial baseline of 286 / 28: seven AI test files, 49 new cases.
- New files: aiProvider.test.ts, aiProfiles.test.ts, aiTools.test.ts, aiProposals.test.ts, aiOrchestrator.test.ts, aiSecurity.test.ts, aiUiHelpers.test.ts.
- Coverage includes safe protocol payloads/native-fetch binding, separate credential persistence, URL/HTTP/network/timeout/size bounds, probe/chat-only/models fallback, secret/XSS defenses, scoped tools, snapshot nutrition/known load, existing report equality, deterministic completion/preferences/exact adoption, no preconfirm/cancel writes, actual second-write rollback for Food and Tasks/tags, stale/revoked proposals, desired-state completion/check-in, duplicate calls/clicks, eight rounds, Stop, empty/malformed responses, history/usage/config switching and encrypted-backup separation.
- Frozen production preservation, migrations/reopen/populate, V1–V7 Restore and encrypted GitHub regression remain PASS in full suite.
- typecheck, normal build, GitHub Pages build (`GITHUB_REPOSITORY=king-640-060/fitlog-lite`), git diff-check: **PASS**.
- Browser local 320×812, 375×812, 390×844, 430×932: AI mock suite, Shared Date Picker, GitHub Sync safety **PASS** in fresh synthetic contexts.
- AI browser checks cover five entries, setup/probe/models fallback/key edit, snapshot reads, confirm/cancel, Reports/completion, safe text, usage, Stop, HTTP401/429/500/CORS, secret guard, A→B credentials/model/base, read-scope enforcement, session/reload, offline Task saving, textarea growth/IME and mocked keyboard viewport geometry.

### Follow-up regression caught by the production gate

The initial concurrently run Date Picker browser regression failed once with a Task title containing the note text. Isolated rerun passed, but source inspection confirmed a real async focus race: createTaskTag().then applied a tag and forced title.focus after the user had moved to Note. The follow-up commit preserves the user's current focus and only removes a captured hashtag token if the title has not since changed. The durable Date Picker browser script now holds a real IndexedDB taskTags write lock, fills the Note while tag creation is pending, releases the lock and asserts Note retains focus and both fields retain exact content. Local four sizes and final production two sizes pass this deterministic regression. Date-picker form-preservation logic and DB schema were unchanged.

## Bundle and Production Verification

Final Pages build:

| Asset | Raw bytes | Vite gzip display | SHA-256 |
| --- | --- | --- | --- |
| `index-DDcaR70_.js` | 617,922 | 197.16 kB | `725c8523a51d05f1eebb1464924cf3bfe4e21901a028aa30a19d26e3281177b9` |
| `index-CnnnCdNG.css` | 95,190 | 17.32 kB | `c866bccea0e4b9c3606e19b3de71c618037caaa48d4f654be10891fead296809` |

PWA precache: 17 entries / 731.71 KiB. The existing >500kB chunk warning remains; compared with the prior JS 559,199 bytes, the new optional AI implementation adds 58,723 bytes. No package was added or updated.

**Final Production PASS** at application END_COMMIT:

- AI mock UI at 390×844 and 430×932: all five entries, configuration, snapshot reads, proposals, errors, Stop, switching/permissions, reload and offline core pass.
- Supplementary isolated optimizer→planId→proposal→confirm browser flow at both sizes passes; inserted Snack FoodLog grams equal the App-generated plan exactly, and no write occurs before confirmation.
- Shared Date Picker at both sizes passes, including deterministic delayed-tag focus preservation, exact title/note/date/time/tag retention, Inbox, cross-year selection and Workout business dates.
- Mock GitHub safety at both sizes passes: 5 writes / 6 attempts per context, explicit restore/conflict handling, 14 stores, no page errors.
- Live asset hashes and persistent frozen-record comparison both pass.

Production browser suites use 390×844 and 430×932 fresh synthetic profiles, mocked AI/GitHub endpoints and invented credentials. No real API Key, GitHub Token or user business record is used. Hash comparison verifies the deployed JS/CSS exactly match the final local Pages artifact. A separate persistent synthetic production profile was verified before and after deployment: stable fitlog-lite-db, Dexie V7, all 14 stores and all 15 frozen records remain exactly equal. The final verifier checks the new AI entry is active before the read-only record comparison.

## Manual Device and Real Provider Verification

- **Real AI provider: Pending.** No real key was supplied or used. Official protocol/preset documentation and intercepted browser transport were verified; actual vendor CORS, account/model availability, tool support and answer quality are not declared PASS.
- **Physical iPhone Safari / installed PWA: Pending.** Four/two emulated mobile sizes, IME events and mocked VisualViewport geometry passed. They do not establish real software-keyboard, browser chrome, Safe Area or standalone behavior.
- Real private GitHub repository/PAT/password recovery remains a separate manual verification category from the mock safety suite.

## Stable Versions and Confirmed Limitations

Production database identity **fitlog-lite-db**; **Dexie V7 / 14 stores**, **Backup V7**, **Restore V1–V7**, **Encrypted Sync Envelope V1**, **AI Config V1**, **AI System Prompt V1**. No migration or DB/Backup/Restore/Sync code change. No history rewrites or production record deletion.

Confirmed architectural limits: device-local BYOK remains accessible to same-origin/browser scripts; direct browser APIs depend on provider CORS; V1 supports only OpenAI-compatible nonstreaming Chat Completions and requires a verified tool-capable model for app data; compound tools require their relevant permissions. The existing bundle-size warning remains. No unresolved automated or production regression remains after the focus fix; real provider and physical-device checks remain explicitly Pending.

## ChatGPT Baseline

FitLog Lite main application END=38a6bdc26f30f2f27100ac00ca78cb784003bf16; report is the following Document AI assistant verification commit. AI is now optional and globally reachable through five topbars, with editable/multiple device-local BYOK profiles, openai-chat-completions adapter, six enforced read scopes, 12 READ tools, 9 PROPOSAL tools, deterministic previews, explicit/atomic/stale-guarded confirmations, ephemeral conversation and usage, Send/Stop and native mobile Sheet integration. Reports/completion reuse existing local services; snapshots remain authoritative. 335 tests / 35 files, typecheck/build/Pages, mobile mock AI/DatePicker/GitHub safety and frozen V7 data preservation PASS. Added a deterministic regression fix for async Task-tag focus stealing. DB V7 / 14 stores, Backup V7, Restore V1–V7, Sync Envelope V1; no dependency/schema/backend changes. Real AI and physical iPhone Pending. Read AGENTS → LATEST_DEV_REPORT → AI_ARCHITECTURE/UI_INTERACTION_SPEC before future work.
