# Latest Development Report — runtime build diagnostics and safe PWA upgrades

## Verified application release

- START_COMMIT: `33798a7c804e99a0e0a1940092db63c421f7c999`.
- Application commit: `0c34d815fa714693d196b923e1f275859630b265`.
- Application Actions: [37105059905](https://github.com/king-640-060/fitlog-lite/actions/runs/37105059905), SUCCESS. Pages deployment6824569455, SUCCESS.
- Production: https://king-640-060.github.io/fitlog-lite/.
- The following report-maintenance commit also deploys a new runtime SHA. Resolve it with `git log -1 --format=%H -- LATEST_DEV_REPORT.md`; executing App/controller identity is available in Version diagnostics, and network deployment identity in `/fitlog-lite/build-info.json`. Final exact SHA, asset bytes and Actions/Pages receipts are in the delivered development report. Never treat the application commit above as the runtime build of a later report-only deployment.

## Changes and boundaries

Management → Application → Version diagnostics now reports build-time Git SHA, local/committed build type, sanitized App URL/expected scope, controller yes/no/build/state, registration scope and active/waiting/installing states/builds. A versioned imported worker script answers only its SHA and scope client count. Old workers without the handler remain explicitly unknown. Manual network deployment identity is separate from executing App/controller identity. No credentials, profile data, URL query/fragment, provider errors or business records are exposed or persisted.

PWA registration uses prompt mode, native scoped registration, updateViaCache none, no install-time skipWaiting, clientsClaim and Workbox precache/cleanup. Existing registration remains visible offline. Startup registration and throttled foreground/online checks discover updates without reloading. Explicit confirmation blocks open forms/images, active training/saves, busy AI, drafts and pending/processing proposals. It drains writes, rechecks safety and other scope clients, activates waiting worker, waits for the matching controller and reloads once. No startup/controllerchange reload loop, data clearing, unregister or reinstall remedy.

Legacy clients cannot acquire diagnostics retroactively. Save edits, close every FitLog Safari tab and fully close the original PWA, then reopen online so waiting activation can occur naturally. Physical iOS termination/storage contexts remain unverified. See [PWA_RUNTIME](docs/PWA_RUNTIME.md).

**Search CSS and aiModelRouteLabel remain unchanged this round.** The reported physical overlap/old Vision title remain unresolved pending actual device runtime evidence. Stale PWA/client/SW is plausible but unconfirmed; the previous device build and real active profile fields are unknown. Production33798a7 directly served index-DGXlZzHp.js/index-BW17gAhe.css and its SW precached both; hosted resources do not prove device adoption.

## Automated verification

- Typecheck PASS;500 tests /47 files PASS; Pages build PASS (existing monolithic chunk-size advisory remains).
- Local11browser gates PASS: aiDualModelRouting, uiQualityAudit, mobileLayout, interactionStabilization, aiAssistant, aiVoice, foodVision, sharedDatePicker, githubSyncSafety, uiSemanticConsistency, aiStreaming. Quality audit141states per320/375/390/430px width, including diagnostics. Screenshots inspected.
- Real generated old33798a7 App/SW → current build: selected Vision image survives new waiting worker; ending old scope clients activates the new worker; App/controller markers match; fourteen frozen stores/fifteen records and synthetic AI configuration/key stay identical; offline new-page boot PASS.
- Prior prompt build → application build: AI draft/proposal and other client block switching, cancel preserves old client, explicit confirmation causes one reload with no loop, identical records/config and offline boot PASS. Initial prior prompt fixture was a clearly marked dirty local build; final report-maintenance verification uses two committed builds.

## Production verification

- Application production index JS `index-BlVJ1KQg.js` (692378B/SHA256046b8bf456f39c52020713191046f7da41abdc7b2ec20eac05fbb61033c2d1ea) and CSS `index-CMWgEc5H.css` (105212B/SHA2562cb5de4e10e94f219ebff294d9fbd4bb52e215e005d1b478e444c04c1fa55942) exactly match local application build. Entire sw.js bytes match; it precaches these assets and the versioned worker identity script. Network build-info.json is excluded from precache. Later deployment hashes are reported independently in the delivered final receipt.
- Production browser native SW390/430px: App/controller/network build match, correct /fitlog-lite/ scope, online/manual check and offline new-page diagnostics PASS.
- Production11browser gates PASS; quality audit131states per390/430px width.
- Original synthetic persistent production profile: stable DB identity/version70, fourteen stores/fifteen frozen rows, AI configuration/key and voice acknowledgement remain identical to the before-release snapshot; quick launch and offline reopening PASS; no business reseeding.
- The first preservation attempt failed its new-bundle assertion because the previous gate checked waiting before installation completed and relied on reload polling. The gate now waits for installation, ends legacy scope clients and reopens once with explicit asset/build assertions; the original snapshot was retained and retry passed. This failure is not evidence of data loss or the physical device's root cause.

## Data versions

`fitlog-lite-db`: DexieV7/IDB70/14stores. BackupV7; RestoreV1–V7; GitHub SyncV1; AIConfigV1. No schema, persistence format, business service or historical snapshot changes. Diagnostics never enter DB/Backup/Sync.

## Manual device verification and remaining work

- Physical iPhone Safari: **Pending**.
- Original installed iPhone PWA: **Pending**.
- Physical search overlap, Food Vision title and actual active profile routing: **Pending**, not marked solved.
- Real Provider requests: not exercised; mock requests establish protocol/state behavior only.

User flow: open right-top Management → Application → Version diagnostics, capture App/controller/active/waiting/installing/scope; if entry is absent, save edits and end all old FitLog clients, then reopen online without clearing data/reinstalling. Handle drafts/proposals/other windows, check/confirm any waiting update; capture diagnostics before/after reopening and then retest search/Vision. Only after a new App/controller build is proven collect Safari computed search geometry and non-secret profile name/model/visionModel/effectiveVisionModel if either remains wrong.

## ChatGPT Baseline

Read AGENTS→LATEST→UI/visual/AI specs and PWA_RUNTIME. Build identities derive from Git on every build, including documentation-only deployments; trust executing diagnostic markers independently of network/Actions. Prompt SW downloads without disrupting editing; confirmation/safety/write drain/matching-controller precede one reload. Legacy clients must close for bootstrap. No search/model-label edits this round.500tests/47files; eleven local/production browser gates and real SW upgrade/preservation/offline checks PASS. Business versions unchanged. Physical Safari and original PWA require separate version screenshots; stale cause and the two original device bugs remain Pending.
