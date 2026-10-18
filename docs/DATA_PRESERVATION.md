# Production Data Preservation

## Stable identity and release contract

The production IndexedDB name is `fitlog-lite-db`. Normal startup, reload, PWA updates and static GitHub Pages deployments must preserve business records. Hosting replaces static resources; it does not own the browser's IndexedDB. Workbox `cleanupOutdatedCaches` cleans Cache Storage, not the business database. Service workers must never reset business IndexedDB.

User data compatibility is a release blocker, not a best-effort requirement.

Every schema change needs an explicit Dexie migration preserving all previous production records, optional fields, relationships, dates, nested order, and historical meaning. Never recompute historical FoodLog or Workout snapshots from current libraries/templates. Never rename production DB, deleteDatabase, db.delete or clear-all to repair an upgrade; asking users to re-enter data is not an acceptable migration.

## Frozen fixtures and release verification

`tests/fixtures/legacyV7Database.ts` freezes the published V7 schema; the adjacent JSON represents records in every store, including historical snapshots differing from current library values, optional missing values, nested sets/templates and task/habit relationships. Never update this fixture to match a future current schema. Add a fixture for each later production version and preserve earlier ones.

Before release run preservation, reopen, populate, existing migration and complete Backup/Restore tests. Open each frozen database with the current application and compare saved identities, counts and full record content. Startup seed applies only to first creation. When possible also seed synthetic records in an isolated persistent production browser profile before deployment and compare the same profile after deployment. Physical devices are a separate verification category.

## Backup compatibility and destructive allowlist

Backup schema changes must preserve all supported earlier Restore versions. Restore fully validates before clearing stores and replaces them in one transaction; failures preserve prior records. The destructive business operations allowed are explicit user-confirmed full Restore, clear-day for its defined domains, and intentional individual record/library deletion or undo of a check-in. Tests may delete only isolated test databases. Normal startup, deployment, seeding and migrations are not destructive-operation allowances.

Browser storage is not guaranteed permanent: clearing website data, deleting a browser profile, storage eviction, uninstall behavior, origin changes or changing devices can make a local copy unavailable. Keep exportable backups. Do not describe local storage as impossible to lose.

## Encrypted remote recovery

GitHub is an additional user-controlled encrypted recovery copy; IndexedDB remains the active working database. Sync transport configuration is separate from business Backup and never adds business stores. Manual sync must encrypt the complete versioned Backup on-device before upload, preserve local data on failed requests, detect divergent changes, use remote SHA concurrency protection, and require explicit choices for replacement. Download must decrypt and validate before local mutation; Restore uses the existing transaction path after a preview and explicit confirmation. Never persist the data password or derived key. Sync cannot bypass this contract.


## Approved joint v0.5 (2026-10-12)

Follow [Approved joint v0.5 contract](APPROVED_JOINT_V05.md). It supersedes prior smart-completion entries, whole-row Habit toggles, flat recovery history and version12 descriptions for this release. Preserve all preceding unrelated data/UI contracts.


## Approved Food / Water / Day Detail v0.4 (2026-10-15)

[Food / Water / Day Detail v0.4](FOOD_WATER_DAY_V04.md) supersedes earlier250ml shortcut and folded Food saved-goal-copy rules. Meal-aware templates remain plans until explicit actual confirmation, with full date/meal/source and target transaction guards. Calendar ten summaries retain width and73px standard height with accessible growth; complete target/actual facts and exact deletion remain. Nutrition permanent deletion checks every persisted reference and source version in one transaction; referenced history can only archive. Dexie13/130/22stores unchanged; Backup14/Restore1–14/encryptedSync1, immutable older snapshots plus new frozenBackup14. Device-only configuration remains excluded; exact production/SW/same-profile/offline evidence and separate physical Pending remain mandatory.


## Approved UX-01–03 v0.4 (2026-10-17)

[Water / six-category cascade contract](UX_WATER_CASCADE_V04.md) supersedes the earlier always-visible Today water controls and archive-only handling for referenced nutrition templates in this explicitly acknowledged path. Default Today disclosure and compact equal500/1000 Sheet preserve all water services. Only the six specified nutrition tables may lose approved owned rows, with full preview, risk checkbox, second danger confirmation, stale-source/ownership checks and complete rollback; mixed provenance and invalid cross-cycle allocations reject without writes. Original unused-only delete API remains guarded; all health facts, unrelated targets/templates and device config survive. Removed cycles leave the existing cycle-report picker; ordinary reports continue reading actual facts, deleted goals are not reconstructed, and no new nutrition-template analysis report is introduced. DB13/130/22, Backup14/Restore1–14/Sync1 unchanged. New-UX unit/browser/production/physical evidence is separate from the completed F1–F5 acceptance.


## Approved Joint UX / Reports / Range Delete v0.3 (2026-10-17)

[Joint v0.3 contract](JOINT_UX_REPORTS_RANGE_V03.md) supersedes six-only deletion **only** at its new explicitly acknowledged management danger path. All owned phase/cycle closed-date unions, including archived/future sources and local-today-truncated open phases, select the six nutrition categories plus nine actual-health tables. NutritionTargets include owned references plus all sources in the date union; preview discloses both counts. Sleep follows its captured/legacy business night as a whole ID. Seven protected plan/shared-definition tables, other owners and outside facts remain exact.

Use one22-table transaction for fresh source fingerprint/conflicts, exact15-table ID deletes and complete survivor postconditions; any failure/cancellation rolls back all writes. Current-client running timers and stale background Workout saves cannot silently recreate removed records. Foreign overlaps, mixed/missing provenance and active sleep/unfinished Workout reject without mutation. Old unused-only, six-only API and ordinary clear-day boundaries remain unchanged. DB13/130/22, Backup14/Restore1–14/Sync1/envelope1/configs and frozen historical fixtures remain unchanged. This permission never authorizes deployment/startup deletion or actual personal-data QA.
