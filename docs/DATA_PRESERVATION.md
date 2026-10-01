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
