# Latest Development Report — Nutrition Strategy Templates / Phases

## Release baseline

- START_COMMIT: 64a3b4e64daaf11d3e872d90e1010d47e4bc9c40. Clean main; HTTPS pull timed out45s, GitHub API confirmed remote main exactly matched this baseline before work.
- APPLICATION_COMMIT: 761d8467ce8d0283e33afc74c02ab07e2a8591ac.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37116544888 — SUCCESS; Pages deployment6826459307 — SUCCESS.
- END_COMMIT is the report-only commit containing this file: resolve `git log -1 --format=%H -- LATEST_DEV_REPORT.md`. A commit cannot contain its own literal SHA; the final delivered report/release receipt records the exact END_COMMIT and its independent Actions/Pages/production checks. Report maintenance also deploys a distinct Git build identity.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Product model and workflow

Before: Not implemented. Existing NutritionTarget held daily goals and DietTemplate generated FoodLogs; neither represented a multi-variant strategy or usage phase.

Now: NutritionStrategyTemplate contains1–32 freely named ordered NutritionStrategyVariants. NutritionStrategyPhase stores template ID/activation-name snapshot/local start and optional end. Existing NutritionTarget remains the sole actual daily goal source, extended with optional persisted strategySelection (template/variant/phase IDs and applied template/variant-name snapshots). DietTemplate sourceTemplateId remains distinct.

Food→设置/编辑目标 shows the strategy valid for the selected local business date. Choose one variant, read deterministic preview, Apply in the shared Sheet footer. Reopen shows saved values/names and explicit provenance selection; equal numbers never infer origin. 自定义目标 preserves manual entry and only replaces that date, clearing strategy origin without editing definitions/phases. With no strategy on the date, the existing manual form opens. Food displays the saved provenance even after definition changes/archive.

Management→营养模板 shows current phase and real weight summary, other/archived templates and one creation action. Separate detail, template editor, same-Sheet variant editor, activation and shared DatePicker subviews keep daily use light. Template editor uses summary cards and stable44px edit/up/down/remove actions; variant input reuses existing nutrition fields, normalization, exact-source numeric presentation and iPhone inputMode. No private keyboard listener/autofocus/new dependency/framework.

Copy opens an editable draft with fresh template and variant IDs. Save does not activate. Explicit activation defaults to today, previews the boundary, atomically closes the previous phase on the preceding local date and opens one new phase. Starts cannot be future dates or overlap prior phases; a new start must be later than the current start/latest closed end. Backdated activation preserves every previously saved daily goal. Activation generates no daily targets or automatic schedule.

Editing/removing variants only affects future explicit choices. Applied numeric and name snapshots never follow live template edits. Archive is soft and retains definitions/variants/phases/targets; the current template must be switched before archive. Detail retains phase activation names after definition rename. Old templates remain viewable/copyable.

Phase days count both endpoints, start→end/today, using calendar ordinals (DST-safe). Existing Weight service queries actual inclusive in-range WeightLogs; first/latest/net change are derived dynamically, not copied into phases. Zero records says none; one explicitly cannot calculate change. No prediction, nutrition advice, AI adjustment or automatic V2.

## Data versions and preservation

- Stable fitlog-lite-db: DexieV8 / IndexedDB80 /17stores. Explicit additive V7→V8 migration adds three initially empty strategy stores; original14 stores/indexes/records and precision are unchanged. No inferred provenance, historical recomputation, reset or deletion on startup/deployment.
- BackupV8 includes definitions/ordered variants/phases/daily provenance. RestoreV1–V8 fully validates before one17-store replacement transaction; failure rolls back. Removed variants remain interpretable through snapshots.
- GitHub SyncV1 stays manual/encrypted/confirmed with the same BackupV8 payload and envelopeV1. AIConfigV1 stays isolated; no credentials/images/chat in business Backup.
- Old frozen fixtures are unchanged. New legacyV8 schema/data fixtures include stage/name snapshots and canonical precision.

## Automated Verification

- npm run typecheck PASS; npm test533tests/50files PASS; npm run build and clean Pages build PASS. Existing >500kB chunk advisory only.
- Service tests: four-variant create/reorder/edit/copy fresh IDs; stale/concurrent activation/application; one open phase; backdated V2 boundaries; past-date snapshots; removed variants/archive; manual/no-active; precision/invalid data; inclusive dates/DST/year boundaries; weights0/1/many and excluded dates.
- Migration/reopen/populate/preservation: exact original14store records retained,3new stores empty, new data survives reopen; V8 fixture roundtrip; RestoreV1–V8; validation-before-write;17-store rollback; encrypted payload roundtrip/hash participation with AI exclusion.
- Dedicated nutritionTemplates browser suite:300local states (75perwidth320/375/390/430) and150production states (390/430),100/120/140% fonts. Actual UI create/save/copy/reorder/V2 activation/date preview, high/low persisted selection, identical-number manual no-guess, historical saved-vs-current snapshot and archived history retention, one/four/eight variants/long Chinese names, weights0/1/many, shared mocked keyboard and bottom CTA reachability.
- All12existing browser gates PASS locally and production: uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, aiDualModelRouting, foodVision, aiStreaming, nutritionGauge. Quality audit141states/localwidth and131states/productionwidth.
- Actual screenshot inspection390/100,320/140,430/100: selected state, long cards, numeric wrapping, empty/manager density, editor actions, historical values/names, bottom Save, activation/date picker, keyboard field. Refined left alignment, compact manager/borderless detail entry, shared footer confirmation, single-column fields and start-date label. No overflow-mask workaround.
- Real old bundle/SW→clean application PWA upgrade PASS in legacy and prompt modes: waiting preserves selected Vision image/AI draft/proposal, other client blocks, cancel preserves, explicit confirmation reloads once, all legacy business/AI hashes retained, DB80/17/new3empty and offline cold boot. Outside-scope MessageChannel worker startup failed in the first harness attempt; the corrected gate waits for native activation then proves identity from the actual controlled App. No PWA application source change or skipWaiting/unregister/data clear workaround.

## Production Verification

- Exact application JS/CSS/SW bytes match clean local Pages build; SW precaches matching Git identity and assets. App/controller/active/network build761d8467ce8d0283e33afc74c02ab07e2a8591ac at390/430; offline new page PASS.
- Dedicated150state suite and all12existing production gates PASS; selected/manager screenshots inspected.
- Original synthetic persistent production profile upgraded via existing diagnostics→confirm update. Before/after14frozen stores/15records and AI configuration/key/voice acknowledgement hashes match; new3stores empty; DB80/17; offline reopen PASS. No business reseeding/clear/Restore/reinstall; no real records/keys. Food Vision preservation after gate also PASS.
- Git HTTPS push timed out; exact application commit/tree/blob identities were verified and published through a non-forced API fast-forward from the exact remote parent. Final report commit is independently checked in the delivered receipt.

## Manual Device Verification / remaining issues

- Physical iPhone Safari: Pending.
- Original installed PWA: Pending.
- Physical keyboard/VisualViewport/Safe Area/system text/actual font rendering: Pending. Browser emulation is not physical-device proof.
- No confirmed unresolved defect within this feature after automated/production checks. Existing physical search/Vision observations remain unverified and were outside this scope.

On the original device, verify App/controller builds in Version diagnostics, then test Food date-specific selection/manual goals, template creation/editing/8long variants with keyboard, V1→V2 boundary preview and stage weights. Never clear/reinstall/re-enter data to upgrade.

## ChatGPT Baseline

Current main adds nutrition strategy collections/ordered variants/explicit usage phases alongside existing DietTemplates. Daily NutritionTarget is sole authority; applied values/name/ID provenance are deep snapshots, never inferred from equality or rewritten by editing/archive/activation. Copy fresh IDs; save≠activate; single open phase/local dates/no scheduler; dynamic actual WeightLog summary. Stable DBV8/IDB80/17stores, BackupV8, RestoreV1–V8, manual encrypted SyncV1, isolated AIConfigV1.533tests/50files; dedicated300local/150production states and12existing gates both PASS, real PWA migration/production exact assets/original synthetic data+AI/offline PASS. Physical Safari/original installed PWA Pending. Resolve current report END_COMMIT from Git and check actual App/controller build before device conclusions.
