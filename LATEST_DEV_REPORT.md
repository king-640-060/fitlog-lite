# FitLog Lite Development Report

## Latest production round — Persistent Management Workspace + Manager Semantic Unification (2026-10-07)

- START_COMMIT: `007f506b5244bd1adbf411c1f8fe4ba55cc3dd80`. Actual clean main/status/branch/pull/log confirmed; origin/main rechecked before publishing.
- APPLICATION_COMMIT: `823d81d6a25946f2aed72446e70c512861d7c471`.
- Application Actions: https://github.com/king-640-060/fitlog-lite/actions/runs/37587352787 — completed success, including Pages deploy.
- END_COMMIT: the report-only commit containing this file. Its exact SHA and final Actions/assets/offline receipts are recorded externally and in the final response to avoid self-reference.
- Production: https://king-640-060.github.io/fitlog-lite/.

## Architecture and verified behavior

`src/ui/managementWorkspace.ts` owns one persistent large native primary Sheet. Hub → all12 managers/settings → editors/subviews → Back preserve the same actual dialog, handle, header, X and modal-body nodes. A lightweight route stack stores UI nodes/title/query/subview/scroll and resource cleanup, while current services/DB remain authoritative. No general SPA router, global openModal interception or duplicate manager HTML.

Hub has no Back. Shared44×44 Header Back names its parent and pops one level; X exits the entire workspace and releases the shared lock. Reopening starts at Hub0. Existing temporary danger/Restore confirmations can overlay the retained parent. All12 Level2 destinations remain inside the workspace: 食物库 / 动作库 / 训练模板 / 饮食模板 / 营养模板 / 习惯 / 导入数据 / 备份与恢复 / GitHub 同步 / AI 设置 / 版本诊断 / 关于 FitLog Lite. AI → Voice → Back returns AI, then Hub.

Existing renderers accept an optional ManagedSurfaceContext and remain shared with standalone Food/Today entrances. Six entity managers use manager-toolbar, search/status plus visible `+ 新建` with complete 新建X aria-label. Empty states expose exactly one primary 新建X and hide/remove the equivalent toolbar entry. 新建X / 编辑X / 保存X name durable entities; 添加 joins existing items to records/combinations. Habit Level2 is 习惯. Rows expose name/metadata/chevron and open editors; confirmed quiet deletion is in editors. Nutrition rows open editors, with 查看阶段与详情 preserving existing phase/detail/history/activation flows. Existing template start/apply/copy actions remain available in editors.

Hub descriptions use the requested parallel wording; dynamic AI/GitHub summaries refresh on return. Hub180±1, Exercise manager240±1, search query and valid scroll after Save are preserved. New editors start at0. Existing subview/back motion and shared Sheet controller remain authoritative. Route cleanup aborts owned AI/GitHub/diagnostic work and rejects stale file callbacks on Back/X; GitHub retains its existing app-memory password session. No new framework/dependency.

Habit Save remains static after planning and before state/danger actions, with2px top padding, full width/52px height/15px radius. Large Sheet retained; measured maximum field overlap0px.

## Automated verification

- npm run typecheck: PASS.
- npm test: **648 tests /58 files PASS**.
- npm run build: PASS, including clean application Pages build with local:false. Existing Vite >500kB chunk advisory remains.
- git diff --check: PASS.
- Complete release browser inventory: **21/21 PASS** — managementWorkspace, habitEditorLayout, motionPolish, uiQualityAudit, uiSemanticConsistency, interactionStabilization, mobileLayout, sharedDatePicker, githubSyncSafety, aiAssistant, aiVoice, voiceMode, aiStreaming, aiDualModelRouting, foodVision, nutritionGauge, nutritionTemplates, foodServing, dietEvents, trainingJournal, habitDeletion. All20 existing suites retained. No skipped tests, removed assertions or raised timeouts.
- New managementWorkspace local **24/24** contexts:320×812 /375×812 /390×844 /430×932 × fonts100/120/140 × normal/reduced motion. Strict actual-node identity, all12 destinations, six empty/populated New toolbars and44px controls, three-level New/Edit, parent search/scroll/Save, confirmations, X at Hub/manager/editor/AI, AI→Voice, and route-owned delayed request/file cancellation pass.
- Each context runs20 complete Hub→Food/Exercise/WorkoutTemplate/DietTemplate/Nutrition/Habit/AI/GitHub→Back rounds. Final local10,056 identity/layout checks; primary max1, top/height deltas0px, Header overlap0, horizontal overflow0, no body-lock/opacity/transform/pointer/animation residue. Actual dialog listener types remain exactly cancel/click/close/close/close before and after stress.
- Existing habitEditorLayout **24/24** contexts PASS, including Today direct entry, manager/edit/new/save, static52px/15px Save, overlap0px, parent scroll, keyboard/Safe Area mocks and reduced motion.
- uiQualityAudit retains141 states per width; Nutrition Templates retains75 states per width, including historical snapshots, activation, copy/archive, date and keyboard mocks. GitHub safety retains its upload/conflict/restore/data checks. Direct Food Library and Today Habit entrances pass existing suites.

### Retained failures and verification reliability

Early development HMR invalidated an in-flight runner; subsequent release suites use a frozen built preview. A preview without GITHUB_REPOSITORY served the wrong base; corrected build/preview environment. Earlier frozen builds exposed AI-root navigation expectations and a recreated GitHub memory-password session regression; corrected shared-header expectations and retained the original singleton session with UI-owned cancellation. A Nutrition test/assets mismatch was corrected by freezing matching tests/build. Preliminary runs were stopped when adding Back-owned request cancellation.

The final full inventory found one remaining old interactionStabilization selector targeting #habit-new in an empty manager. Updated to visible populated/empty alternatives; original form/focus/save/hierarchy assertions preserved. All four widths pass the rerun. managementWorkspace reran all24 contexts after strengthening exact primary-class and44px create-control assertions. The final gate receipt includes passing replacements and preserves the original failed logs. No preliminary/partial pass substitutes for a final release gate.

## Production verification

Application Actions/Pages succeeded. Production managementWorkspace **12/12** contexts PASS:390×844/430×932 × fonts100/120/140 × normal/reduced motion. Each includes20 full management rounds, total5,028 identity/layout checks, all12 destinations, Back/X/request cancellation, max primary1, top/height delta0 and Habit overlap0. This is the production targeted matrix; the complete21-suite inventory was run locally.

productionAssets PASS against the clean application dist: exact build meta/build-info local:false, JS/CSS byte lengths and SHA256, exact SW bytes and precache entries, plus five-tab/AI Settings/GitHub entry smoke, no page errors. Local390/100 ten requested surfaces and320/140 Hub/Exercise/Habit/AI screenshots captured and reviewed; production390/100 Habit screenshot confirms static Save and shared frame. Screenshots and complete receipts are retained externally.

A dedicated synthetic persistent Chrome profile was seeded once before publishing with immutable legacyV10 fixture22 rows and synthetic AI/Voice configuration. Across the application deployment its18-store business hash and AI/Voice config hash match the before snapshot. An actual offline new-page cold boot succeeds, and independent App/SW identities both equal APPLICATION_COMMIT. This is this round's isolated profile, not the user's original installed PWA or a previous unavailable legacy profile. An initial helper update raced a not-yet-ready registration; waiting for navigator.serviceWorker.ready and actual installation state resolved the helper timing failure. No App PWA code changed. Original helper failure retained.

The report-only END publish repeats Actions/Pages, exact production assets and the same synthetic profile's data/AI/Voice/offline new-page/App/SW verification. Final receipts and SHA are external.

## Data compatibility and scope

DB DexieV10 /IndexedDB100 /18 stores unchanged; BackupV10 /RestoreV1–V10 unchanged; SyncV1/envelopeV1, AIConfigV1, VoiceConfigV1 unchanged. No domain/service/schema/Backup/Restore/credential format changes, historical snapshot rewrites or real-user storage resets/restores/reseeding. All automated writes use isolated synthetic browser contexts. Training Video Search remains permanently retired.

Application22 files: src/ui/managementWorkspace.ts (new), src/main.ts, src/styles/sheets.css, src/ui/aiSettings.ts, src/ui/githubSync.ts, src/ui/nutritionStrategies.ts, src/ui/foodVisionImport.ts, src/ui/pwaDiagnostics.ts; AGENTS.md, docs/UI_INTERACTION_SPEC.md, docs/INTERACTION_VISUAL_SYSTEM.md, docs/UI_QA_MATRIX.md; tests/browser/managementWorkspace.mjs (new), tests/browser/README.md, aiAssistant.mjs, foodVision.mjs, habitEditorLayout.mjs, interactionStabilization.mjs, mobileLayout.mjs, motionPolish.mjs, nutritionTemplates.mjs, uiQualityAudit.mjs. END changes only this report.

Evidence: external workspace artifacts/management-workspace-2026-10-07 contains final aggregate gate receipt, individual logs, retained failures, screenshots, production assets, Actions and preservation/offline receipts.

## Manual device verification and remaining issues

- Physical iPhone Safari: **Pending**.
- Original installed PWA: **Pending**.
- Physical keyboard/Safe Area/browser chrome and real-provider AI/Voice behavior are not established by Chromium mocks.
- No confirmed unresolved implementation defect from this round. The existing build chunk advisory remains informational.

## ChatGPT Baseline

Use actual main as truth. Management now has one persistent large native Sheet with explicit lightweight route stack and optional ManagedSurfaceContext renderer seam. Back pops one level; X exits; only existing temporary confirmations nest. Preserve six-manager New/row/empty grammar, parent state restoration, route cancellation and direct-entry renderer reuse. Preserve Habit static Save52px/15px/2px padding/zero overlap, DBV10/18, BackupV10/RestoreV1–V10, Sync/envelopeV1, AIConfigV1/VoiceConfigV1 and retired Video status. Read AGENTS and this report first; keep automated, production and physical evidence separate. Next release requires all21 browser suites plus production assets and data/offline verification.
