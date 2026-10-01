# FitLog Lite — Latest Development Report

Latest verified production application snapshot. Sync main before trusting recorded SHAs. This report is a separate documentation commit after END_COMMIT.

## Current Git and Production State

- Branch: `main`.
- START_COMMIT: `d0dcde3372018721660af2e553d673a1d036eabd`.
- DATA_PRESERVATION_COMMIT: `04e3860358bbcaddb707c17c0d794f70d9b2f612` — `Enforce production data preservation`.
- GITHUB_SYNC_COMMIT / END_COMMIT: `ae616362e82344487d6dd9f7a0f2574e2584da9b` — `Add encrypted GitHub manual sync`.
- REPORT_COMMIT / latest main HEAD: separate commit titled `Document data preservation and GitHub sync verification`; obtain its exact SHA from the latest main commit. A report cannot contain its own SHA without changing that SHA.
- Production: https://king-640-060.github.io/fitlog-lite/.
- Application Actions: [36857703769](https://github.com/king-640-060/fitlog-lite/actions/runs/36857703769), completed / success, including typecheck, tests, build, upload and deployment.
- Initial tree was clean; `git pull --ff-only` succeeded with “Already up to date”. GitHub refs independently confirmed START_COMMIT. No kJ feature was present; it was not added this round. Existing nutrition completion is preserved.
- Publishing used the existing Git Data API helper, verifying identical trees/commit SHAs and non-forced fast-forwards for the two application commits.

## Data Preservation Verification

**Normal app upgrades must preserve existing data.** This is now a highest-priority permanent contract in AGENTS.md: “User data compatibility is a release blocker, not a best-effort requirement.” DATA_PRESERVATION.md documents stable identity, migration/Backup policy, historical snapshots, destructive-operation allowlist and release verification.

- Production DB identity remains **`fitlog-lite-db`**, now exported as `PRODUCTION_DATABASE_NAME` and locked by a regression test.
- Destructive-data-loss audit found no automatic deleteDatabase, Dexie/db delete, startup clear-all, dynamic production DB rename, localStorage.clear, destructive upgrade, or Service Worker IndexedDB reset.
- Full store clear remains only in existing Restore, after complete validation and inside one transaction. Clear Day and individual record deletion/check-in undo are explicit user operations. Tests delete only isolated test databases.
- Dexie migrations add stores while preserving existing history. Populate seeds exercises only on first database creation; reopen never overwrites edited exercises or re-adds deleted defaults.
- Frozen `tests/fixtures/legacyV7Database.ts` records the actual published V7/14-store schema. Its JSON fixture contains 15 representative records across all 14 stores, including stable ids, historical timestamps/local dates, nested sets/templates, optional missing values, relationships, and FoodLog/Workout snapshots differing from current library values. Future releases must retain this fixture and add later production fixtures.
- Frozen V7 → current application opening: PASS, complete record comparison across every store.
- Current database close/reopen: PASS, complete record comparison.
- Populate-once/user-exercise preservation: PASS.
- Backup V7 / Restore V1–V7 compatibility remains covered by the full passing suite.
- GitHub Pages replaces static resources; Workbox cleanupOutdatedCaches cleans Cache Storage, not business IndexedDB. PWA/build/deployment configuration has no change this round.
- **Production Upgrade Persistence Browser QA: PASS.** Before publishing, an isolated persistent Chrome profile loaded the preceding production app and saved the synthetic frozen records into all 14 stores. After deployment, the same profile loaded the new app (GitHub Sync entry verified) and all 15 records matched original ids and full values. This is actual cross-deployment browser persistence verification, separate from physical-device QA.

Browser local data can still disappear if a user clears site data, deletes a profile, changes device/browser/origin, or the browser evicts storage; uninstall behavior can vary. No permanent-storage guarantee is claimed. Independent manual export and the new encrypted remote recovery copy provide recovery options. Remote recovery requires repository access, an existing backup and the data password.

## Encrypted GitHub Manual Sync V1

Management → Data & Backup now contains Import, independent Backup/Restore, and GitHub Sync. Setup uses single-column owner/repository/password Token inputs. Connection validates an accessible, private, non-archived repository and initialized default branch/Contents access. Public repositories are blocked. Users are instructed to create an independent data repository, initialize README, and use a fine-grained PAT for only that repository's **Contents: Read and write** permission. No extra permission is requested; actual write denial is handled at PUT without creating a test file.

Only user actions make GitHub requests. No background/periodic sync, merge engine, OAuth, account service, backend, AI or cloud worker was added. The app calls GitHub REST directly with Authorization headers, the official API version `2026-03-10`, no credential query parameters, no-store cache policy, and a 20-second network timeout. Known API errors have safe fixed text; raw server response bodies are not exposed or logged. Larger Contents files are read via immutable Git blob SHA, avoiding a metadata/raw-file race and credential use on arbitrary download URLs.

Transport parameters:

| Item | Actual implementation |
| --- | --- |
| Remote path | `fitlog/latest.enc.json` |
| Branch | Repository's validated default branch |
| Envelope | `fitlog-lite-encrypted-sync`, formatVersion **1** |
| KDF | PBKDF2 / HMAC-SHA-256, **310000** iterations |
| Salt | Fresh random **16 bytes** per encryption |
| Cipher | AES-GCM, **256-bit** key |
| IV / authentication tag | Fresh random **12-byte IV** / **128-bit tag** |
| Implementation | Native Web Crypto; no new dependency |
| Payload | Complete existing exportBackup(), UTF-8 encrypted before upload |
| Payload bound | Plaintext Backup at most **20 MiB**; use manual export for larger data |

Envelope plaintext contains only protocol metadata and encrypted ciphertext, not names, nutrition, weight, counts or tasks. Identical input/password produces different envelopes through fresh salt/IV. Unsupported versions, malformed base64, invalid lengths and unexpected metadata fail safely; fixed KDF parameters prevent unbounded derivation from malicious envelope values. Wrong passwords and authenticated ciphertext tampering fail decryption. The app never claims perfect security.

GitHub token is stored only in device-local `fitlog-github-sync-token-v1` localStorage. Config and device/baseline metadata have separate versioned keys. None are added to business Backup. Same-origin script/browser access can read localStorage: this is the explicitly requested convenience tradeoff; scope/revoke tokens appropriately. Password and AES keys are never persisted or uploaded. Initial passwords require confirmation and at least 12 characters; an existing remote must decrypt and validate before any overwrite. A successful password may remain only in the current memory session; pagehide/disconnect clears it, with a lifecycle guard against late asynchronous caching.

## Sync Decisions, Conflicts and Restore Safety

A pure decision helper compares SHA-256 fingerprints of business Backup.data and remote file SHAs. Canonical JSON excludes exportedAt, sorts top-level entities by id and object keys, preserves nested semantic array order, respects JSON undefined semantics, and does not mutate input. A read transaction captures all business stores consistently.

- Unchanged local/remote: current; identical actual content under a new envelope SHA: advance baseline without replacing either side.
- Only local changed: upload encrypted current complete Backup.
- Only remote changed: offer decrypted Restore preview and explicit confirmation; never silently replace local data.
- Both changed with different content: explicit conflict UI. “Use GitHub data” previews Restore. “Keep local and upload” requires a second danger confirmation naming remote replacement scope. No automatic merge or overwrite.
- No baseline + existing remote + untouched starter exercises: show “发现 GitHub 备份”, primary Restore, no normal upload action.
- No baseline + meaningful local and remote data: explicit unpaired conflict choice. Default starter names alone never cause an empty new device to overwrite real remote data.
- Remote missing after pairing: require confirmed recreation; network/API failure is never interpreted as missing.
- Upload rechecks private/default-branch state and remote SHA, verifies the password against the existing validated remote, then captures/hashes/encrypts and PUTs with current SHA. PUT 409/422 triggers refetch then stops, never automatic retry. Local changes after inspection also stop. Failed uploads do not advance baseline.
- Download/decrypt/JSON parse/validate/preview happen before local mutation. Preview shows encrypted backup timestamp and compact counts for all stores, explicit local replacement wording, and local export when meaningful data exists.
- Confirmed Restore rechecks remote SHA and decrypts/validates again, checks local hash inside the same write transaction, then calls existing restoreBackup(). Crypto hashing uses Dexie.waitFor to preserve transaction lifetime. Local/remote changes after preview abort; failure preserves prior data.
- Pending workout autosave is flushed before opening Sync; transient workout state is reset after Restore. Sheet actions are disabled during operations and service operations are serialized.
- Disconnect removes only three transport keys, device baseline and memory password; neither local records nor the remote file is deleted.

Fresh Green surfaces and existing Sheet/VisualViewport/Safe Area behavior are reused. Inputs are 16px, actions at least 44px, long repository names wrap, and untrusted labels are escaped/errors use textContent. UI_INTERACTION_SPEC records the durable rules; GITHUB_SYNC.md documents setup, credentials, encryption, recovery and limits.

## Compatibility and Existing Features

- Dexie **V7 / 14 stores**; Backup **V7**; Restore **V1–V7**.
- Encrypted Sync Envelope **V1** is a separate transport version, not a business Backup upgrade.
- No business store, index, schema migration, dependency, package/lockfile change, or Backup format change.
- Existing Food snapshots, local date semantics, deterministic nutrition completion, Plan/Habit, training, Calendar/Reports, templates, manual Backup and Clear Day remain. Upload/check do not mutate business stores; only explicitly confirmed Restore replaces them.

## Automated Verification

- Typecheck: PASS.
- Full tests: **269 / 25 files**, PASS (baseline 224 / 19).
- New tests: 4 data preservation, 4 crypto, 3 hash, 10 decisions/fresh-install, 16 GitHub transport, 8 manual-sync safety: **45** total.
- Coverage includes all-store frozen/reopen/populate preservation; UTF-8 round trip and plaintext leakage; wrong password/tampering/invalid envelope; canonical stability/nested order; all sync decision branches; public/archived/empty repositories; 401/403/404/409/422/rate/network responses; initial/update SHA payloads; immutable large-file reads; native browser fetch receiver; validated complete Restore; wrong-password/invalid-Backup no-mutation; local/remote preview races; failed-PUT refetch without retry/baseline change; confirmed disconnect with data preserved.
- Local build: PASS — main JS **553.33 kB**, CSS **87.72 kB**, **17 precache entries / 661.29 KiB**.
- Pages build: PASS — main JS **553.37 kB**, CSS **87.72 kB**, **17 entries / 661.39 KiB**.
- `git diff --check`: PASS.
- The existing nonblocking Vite main-bundle >500 kB warning remains. No new dependency or precache entry was introduced.

## Local Browser Verification

Isolated mobile Chrome at **320×812, 375×812, 390×844, 430×932** used synthetic records and an intercepted/mock GitHub API, not real credentials. Each width exercised two independent devices: public-repo rejection; initial encrypted upload of all stores; decrypt/validate the mock remote; local-only upload; new starter-only device unlock; wrong password preserving local/remote/baseline; Restore preference/preview/full confirmed recovery; second-device update; remote-only confirmation; divergent conflict without PUT; explicit danger-confirmed remote replacement; concurrent PUT conflict/refetch/no retry; offline message/no business mutation; disconnect preserving local and remote data. Each pass produced five successful uploads and one stopped concurrent attempt, with no page errors or horizontal overflow.

Browser integration exposed native fetch receiver binding, which was corrected and given a regression test. A harness launch-path correction was also needed; it was not an app defect. Visual QA led to compact two-column Restore counts. A final 390 pass after this adjustment passed; final 320 supplemental verification checks actual 44px actions and 16px input sizes. Setup, status, unlock, conflict, replacement, Restore and offline screenshots were inspected for restrained hierarchy and readable long names.

## Production Verification

Application Actions succeeded. Production JS/CSS match the local Pages build byte for byte:

- `index-WTaZ2eZl.js`, **553379 bytes**, SHA-256 `ba2dd63d01d180b2a658196a28e3ab40ee5b284bda9cc84c94809062a930c2ee`.
- `index-BIt_2fI4.css`, **87725 bytes**, SHA-256 `1d5edc38824970ba6e6442b49dbdca717e4ecbc58e3a90f7f9fd7b320aa32cea`.

**390×844 / 430×932** production pages passed the complete two-device sync browser flow above with mocked GitHub API requests. Management entry, setup, password unlock, state displays, conflict, Restore preview/application, offline handling and disconnect worked without page errors or overflow. Production status/screenshots were inspected. No real user Token or personal data was used, and no real private data repository was modified. Actual live PAT/private-repository integration was not exercised; tests verified the documented API contract using mocked responses.

The separate actual production upgrade persistent-profile test passed with all 14 stores unchanged after the new application loaded, as described in Data Preservation Verification.

## Manual Device Verification

**Pending:** physical iPhone Safari and standalone PWA. Check setup keyboard/password-manager/native inputs, Sheet scrolling/Safe Area, network→offline→network, mobile PBKDF2 duration, post-sync state, and post-Restore rerender. Simulated Chrome is not physical iPhone verification.

## Confirmed Limits and Remaining Risks

No new confirmed application/test/browser/deployment defect remains. The existing bundle warning remains. Physical iPhone and live private-repository/PAT integration are unverified. V1 has no automatic sync, merge or history browser; the recovery copy is only as recent as the last successful manual upload. Payload limit is 20 MiB. Forgotten data passwords cannot decrypt remote recovery copies. Device-local credentials remain readable to same-origin script/browser access. Local storage can still be removed by user/browser actions, and remote access/repository availability depends on the user's GitHub configuration. These mechanisms do not imply an absolute security or permanent-data guarantee.

## ChatGPT Baseline

FitLog Lite: Vanilla TypeScript, local-first iPhone PWA. Verified application END_COMMIT `ae616362e82344487d6dd9f7a0f2574e2584da9b`; main includes a later report commit. Stable production DB `fitlog-lite-db`, Dexie V7/14 stores, Backup V7, Restore V1–V7. Permanent data compatibility release contract and frozen V7/all-store/reopen/populate tests now exist. Management has user-initiated encrypted GitHub recovery: Private initialized repo/default branch, path fitlog/latest.enc.json, Envelope V1/PBKDF2-SHA256 310000/AES-GCM256. PAT only device localStorage; data password memory only. Fingerprint/SHA decisions detect conflicts; fresh devices prefer Restore; validated previews/explicit confirmation precede transactional Restore; SHA races refetch and stop. No automatic merge/sync, backend, AI, dependency or business schema change. Existing nutrition completion and Fresh Green retained. Tests 269/25. Production 390/430 mocked sync and actual cross-deployment persistent-profile preservation PASS; real iPhone/live PAT integration unverified. Read AGENTS, this report, DATA_PRESERVATION, GITHUB_SYNC and UI_INTERACTION_SPEC; sync main and record a fresh START_COMMIT.
