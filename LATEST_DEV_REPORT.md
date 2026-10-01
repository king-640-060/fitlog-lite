# FitLog Lite — Latest Development Report

Latest verified production application snapshot. Sync main before trusting recorded SHAs. The report is a separate documentation commit after END_COMMIT.

## Current Git and Production State

| Field | Verified value |
| --- | --- |
| Branch | `main` |
| START_COMMIT | `570351c5432fb4557adddb2df9018796eff35c38` |
| SHARED_DATE_PICKER_COMMIT | `964c449f4dc09e2d15cafb0ebe2bacf43d41d65f` — Add shared FitLog date picker |
| GITHUB_SYNC_SETUP_COMMIT | `4d965090eed47cfb7618410e44462bb4b99815f7` — Simplify GitHub sync setup |
| END_COMMIT | `4d965090eed47cfb7618410e44462bb4b99815f7` |
| REPORT_COMMIT / latest main HEAD | Separate commit titled `Document shared date picker and sync setup verification`; resolve with `git log -1 --format=%H -- LATEST_DEV_REPORT.md`. A report cannot contain its own SHA without changing that SHA. The final user report supplies the exact value. |
| Production | https://king-640-060.github.io/fitlog-lite/ |
| Application Actions | [36869284744](https://github.com/king-640-060/fitlog-lite/actions/runs/36869284744), completed / success |

Initial tree was clean, branch main; `git pull --ff-only` succeeded with “Already up to date”. Both implementation commits were pushed through a normal Git fast-forward from START_COMMIT to END_COMMIT. This round implements shared business-date UI and preconfigured GitHub connection setup only. No kJ feature was present or added.

## Shared Date Picker Architecture and Scope

Before modification, the source audit found three user-facing native date inputs: Task, Food and Workout. After modification, **0 native business date inputs remain in src**. The regression scan covers literal date input attributes and dynamic `.type`, `setAttribute`, and object `type` construction. Its explicit exemption list is empty. Legacy Food input listeners/value writes and invisible-input CSS were removed.

`src/ui/datePicker.ts` supplies one `mountDatePicker(host, options)` controller with `value()`, `setValue()` and `destroy()`. It owns ephemeral selected/focused/visible-month state, markup, events, navigation and draft actions, with generic change/confirm/cancel callbacks. It has no knowledge of Food, Workout, Task or Dexie. All three integrations mount that same component rather than copying calendar markup.

The original Monday-first `getMonthGridDays` algorithm was minimally extracted unchanged to `src/utils/calendarGrid.ts`; Progress Calendar imports it and retains its original re-export for compatibility. Progress history UI, aggregation and category markers were not redesigned. Time inputs are unchanged.

- Monday-first, 42 dates / six rows; December↔January and outside-month selections update the visible month correctly.
- Device-local YYYY-MM-DD, parsed at local noon; no UTC truncation. Tests check Asia/Shanghai, Pacific/Kiritimati and America/Los_Angeles date behavior.
- Selected surface: soft fresh lime, deep green label, **38×38 px / 13 px radius**. Actual date hit areas are at least **44×48 px**, including 320 px viewport. Today independently shows a small dot and `aria-current="date"`; selection exposes `aria-selected`.
- Grid/row/gridcell semantics, full Chinese date/weekday/Today/selected labels and one roving tab stop. Arrow keys move focus one/seven local days across months without changing selection; Enter/Space selects the focused draft.
- Selection never commits a business date until explicit completion; cancel/dismiss leaves the caller's date unchanged. No month carousel or month animation.

### Food

The invisible native label/input became a real `#food-date-picker-open` button. Opening captures the current Food date. Selecting a draft leaves the underlying Date Rail and content unchanged. Completion closes the Sheet and calls the original `commitFoodDate(date, true)` only for a changed date. The Date Rail's native scroll momentum, snapping, center lens, finite window, settlement, edge recentering, stale async guard and return-Today shortcut remain intact. Nearby dates still use the rail.

### Task / Plan

The existing Task Sheet preserves its form DOM while a sibling date subview is visible. No second dialog is opened. A hidden date input retains FormData persistence semantics. Completion updates that input/visible label and returns to the form; cancellation or Escape in the subview returns without changing date. Title, selected hashtags, note and start/end times survive both paths. Today/Tomorrow/None remain direct choices; None retains existing time clearing and Inbox semantics. Browser checks saved a dated/time/tagged/note Task and a no-date Inbox Task and inspected their stored records.

### Workout

The compact `#workout-date-picker-open` button opens the shared component in a standalone Sheet. Completion sets workoutDate, resets currentWorkout/editor state and rerenders through the previous behavior. Browser checks selected a cross-year date, started an empty strength workout and confirmed that exact business date in IndexedDB. Cancellation uses the same draft-only wrapper as Food.

## Touch, Focus and Motion Verification

| Control/state | Actual implementation and browser observation |
| --- | --- |
| Trigger press | Scale `.985`, soft background, **120 ms** |
| Trigger release | **160 ms ease-out** |
| Date cell press | Scale `.97`, **110 ms** |
| Selected surface transition | Background/color **170 ms ease-out** |
| Selection geometry | **38 px**, radius **13 px** |
| Month controls | At least **44 px**, quiet background feedback; no month animation |
| Border width | **1 px** before/while pressing; no width jump |
| Touch focus | `:focus-visible` false, outline style **none**, no painted persistent outline |
| Keyboard focus | `:focus-visible` true, **2 px solid** outline; border width unchanged |
| Reduced Motion | New transitions and pressed transforms disabled; selection/Today remain visible |

A supplemental local browser check exercised Food/Task/Workout trigger press, date touch, keyboard focus and month arrows at all four widths. It observed the actual computed transforms/durations and stable borders. A non-painted default computed outline width does not represent a visible outline; outline style was verified as none for touch. No global focus suppression was added. Screenshots at 320 px and production 390/430 were inspected.

## GitHub Setup UX and Compatibility

New/disconnected setup preconfigures:

- Owner: **`king-640-060`**.
- Repository: **`fitlog-lite-data`**.
- Path: **`fitlog/latest.enc.json`**.
- Branch: repository's validated `default_branch`.

The first screen displays the fixed destination and waiting status, and has **only one editable field: Personal Access Token**, password-style, 16 px, autocomplete off. Users do not enter owner/repo/branch/path. A compact “准备 GitHub” disclosure explains Private repository creation, README initialization, Only selected repositories → fitlog-lite-data, Contents: Read and write. Quiet GitHub creation/Token links contain no secrets and use noopener/noreferrer.

Connection immediately checks the remote inside the same Sheet. A missing sync file shows “创建第一份加密备份” with password and confirmation, at least 12 characters. Existing backups show “发现已有 GitHub 备份” with one password field and “解锁并检查”. Subsequent upload/Restore/conflict confirmations remain explicit. The password explanation distinguishes it from GitHub credentials, says FitLog does not save it, and names its necessity for another device and the consequence of losing it.

The UI helper applies defaults only when explicitly connecting from an unconnected setup. The generic transport's `connect(owner, repo, token)` is preserved. Existing saved owner/repo/default branch/baseline are never overwritten merely by opening the new interface. Unit and browser checks used `another-owner / previous-private-repo`, `legacy-branch` and a preexisting baseline; all values stayed byte-for-byte intact, status showed the saved repository, and opening produced no GitHub request. Disconnect returns to default setup while preserving local records and remote backup.

404 names `king-640-060/fitlog-lite-data` and instructs creating a **Private Repository** and initializing **README**, with an additional Token-access hint. 403 retains Contents: Read and write guidance. Public, archived and uninitialized repositories remain blocked. The actual private data repository's existence/access has **not** been verified; no repository was created and no Administration permission was requested. Automated QA used synthetic tokens and mocked API responses only.

## Encryption, Conflict and Data Preservation Regression

Security and data handling are unchanged:

- Manual Sync only; no startup/background network, periodic uploads, automatic merge or backend.
- Token remains device-local localStorage, excluded from business Backup/remote/logs/URLs. Data password/key remains memory-only; pagehide/disconnect locking remains.
- Envelope **V1**, PBKDF2/HMAC-SHA-256 **310000 iterations**, random **16-byte salt**, AES-GCM **256-bit key**, random **12-byte IV**, **128-bit authentication tag**. Complete versioned Backup is encrypted before upload.
- Existing remote must decrypt and validate before replacement. Canonical hash decisions, remote SHA checks, preview races, explicit conflict/replacement/Restore confirmations, remote-missing protection and stopped/refetched PUT races are unchanged.
- All prior crypto/hash/decision/transport/manual-sync-safety/data-preservation tests passed. The two-device mocked browser flow independently exercised encrypted full-store first upload, local-only updates, remote-only confirmed recovery, divergent conflicts, wrong-password no-mutation, SHA race without retry/baseline change, offline preservation and safe disconnect.

Production persistence identity remains **`fitlog-lite-db`**. Dexie **V7 / 14 stores**, Backup **V7**, Restore **V1–V7**. No database name/schema/index/migration, Backup, dependency, package-lock, PWA or deployment configuration change.

**Frozen V7 → current, reopen and populate-once preservation: PASS.** Frozen fixture files are unchanged. Historical snapshots and all 14 stores remain covered by the passing preservation suite.

**Actual cross-deployment persistent-browser preservation: PASS.** An isolated persistent production Chrome profile already contained the frozen synthetic fixture (15 records across 14 stores). Immediately before publishing, all full records matched. After deployment, the same profile loaded and opened the new shared Food picker, then all ids/values in all 14 stores still matched, without clearing/reseeding the database. This is separate from fresh-profile browser QA and physical-device verification.

## Automated Verification

| Check | Actual result |
| --- | --- |
| Typecheck | PASS |
| Full Vitest suite | **286 tests / 28 files**, PASS; previous baseline 269 / 25 |
| Added unit tests | 11 shared-date state/grid/ARIA/local-zone cases, 1 native-date audit, 5 setup/default/error/old-config cases |
| Local build | PASS; main JS **559.15 kB**, CSS **90.59 kB** |
| Pages build | PASS with GITHUB_REPOSITORY=king-640-060/fitlog-lite; main JS **559.19 kB**, CSS **90.59 kB** |
| Precache | **17 entries**, local **669.77 KiB**, Pages **669.88 KiB** |
| git diff --check | PASS |
| Source native-date audit | **0**, no exemptions |

The prior nonblocking Vite main-bundle >500 kB warning remains. No dependency or precache entry was added.

Browser regressions are separate from Vitest: `tests/browser/sharedDatePicker.mjs` and `tests/browser/githubSyncSafety.mjs`; external runtime instructions are in `tests/browser/README.md`. No application browser automation dependency was introduced.

## Local Browser Verification

**320×812, 375×812, 390×844, 430×932: PASS** in isolated mobile/touch Chrome, timezone Asia/Shanghai.

Shared date checks: all three entries, 42 cells, >=44 px targets, no native inputs, no horizontal overflow, Food draft/cancel/commit/rail recenter/Today, cross-year month navigation and outside-month selection, keyboard draft selection, Task same form DOM and all unsaved fields/tags preserved, Today/Tomorrow/None, saved custom date, no-date Inbox, Workout stored date, Reduced Motion, no page errors. Supplemental press/focus checks passed for all modules/widths.

Sync checks: old config/baseline compatibility with no opening request; disconnect defaults; Token-only new setup; expanded preparation layout; 404/403/public/archived/empty failures without saved config; automatic create/unlock password flow. At every width, the complete two-device safety flow produced five successful mock uploads and one stopped SHA-race attempt, preserved all-store backups and reported no page errors or overflow.

## Production Verification

Application Actions **36869284744** succeeded for END_COMMIT. Production assets match the local Pages build byte-for-byte:

| Asset | Bytes | SHA-256 |
| --- | --- | --- |
| index-tymrJZUq.js | **559199** | `f2f0632eeaeace2a2b7cd753786c373f77e4f8d5c8a5bee58f54e002d94e08c9` |
| index-D2PdFTAv.css | **90595** | `998050864cc128f7fb1a79bbbf79ce9601d46f8dc15a32929a12815ae95cc006` |

**390×844 and 430×932: PASS** on the deployed Pages application for both browser suites. Food/Task/Workout shared pickers, draft/cancel/completion, Task unsaved fields/Inbox, cross-year dates, stored Workout date, keyboard/ARIA/Reduced Motion and management GitHub setup were checked. Production also passed the full old-config/error/setup/two-device sync flow with mocked GitHub requests. No real Token or private data repository was touched. Persistent-profile cross-deployment preservation passed separately. Screenshots of the production picker/setup were inspected.

## Manual Device Verification

**Pending: physical iPhone Safari and standalone PWA.** Check no native picker, date taps, Task subview, Sheet height/scroll/Safe Area, keyboard focus, press feedback, Token/password keyboard, mobile crypto timing and real network sync. Simulated Chrome is not a physical iPhone pass.

**Pending: real PAT/private-data-repository integration.** Repository existence/access was not established. All automated GitHub QA was mocked, with synthetic data/credentials.

No confirmed new implementation/test/browser/deployment defect remains. Existing bundle warning and manual-device/live-repository gaps remain. Encryption and local persistence do not imply absolute security or permanent storage; existing DATA_PRESERVATION and GITHUB_SYNC limits still apply.

## ChatGPT Baseline

FitLog Lite: Vanilla TS, local-first iPhone PWA. Application END_COMMIT `4d965090eed47cfb7618410e44462bb4b99815f7`; main includes the later verification report commit. Food/Task/Workout now use one draft-first shared custom Date Picker; native business-date inputs 0 with a regression guard. Monday-first 42-cell algorithm shared minimally with unchanged Progress Calendar. Task same-sheet subview preserves original form and Inbox/time semantics; Food commits distant jumps through existing Date Rail path. GitHub new setup preconfigures king-640-060/fitlog-lite-data, Token only then create/unlock data password; existing configurations stay intact. Generic transport, manual-only encrypted recovery and all conflicts/security unchanged. DB fitlog-lite-db; Dexie V7/14 stores, Backup V7, Restore V1–V7, Sync Envelope V1/PBKDF2-SHA256 310000/AES-GCM256. No business schema/dependency/kJ addition. Tests 286/28; local four-width browser and production 390/430 date/sync mock checks PASS; actual persistent-profile cross-deployment all-store preservation PASS. Actions 36869284744 success. Physical iPhone and real PAT/private-repo checks Pending. Read AGENTS, this report, UI_INTERACTION_SPEC, DATA_PRESERVATION, GITHUB_SYNC; sync main and record fresh START_COMMIT.
