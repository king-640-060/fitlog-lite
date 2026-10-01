# FitLog Lite — Latest Development Report

Latest verified production application snapshot. Sync `main` before trusting recorded SHAs. This report is a separate documentation commit after END_COMMIT.

## Current Git and Production State

- Branch: `main`.
- START_COMMIT: `759758d29e167e164af5310851373bdc1039e267`.
- NUTRITION_OPTIMIZER_COMMIT: `7556420cd7baff20156d6d71fd0911d74c0a2df3` — `Add deterministic nutrition completion optimizer`.
- NUTRITION_COMPLETION_UI_COMMIT / END_COMMIT: `f7d7a408a456ee8abece9b30320d22817ea487fd` — `Add Food nutrition completion workflow`.
- REPORT_COMMIT / latest main HEAD: separate commit after END_COMMIT, titled `Document nutrition completion verification`; obtain its exact SHA from `git log -1` after syncing. A report cannot contain its own commit SHA without changing that SHA.
- Production: https://king-640-060.github.io/fitlog-lite/.
- Application Actions: [36846286647](https://github.com/king-640-060/fitlog-lite/actions/runs/36846286647), completed / success, including typecheck, tests, build, artifact upload, and deployment.
- Initial main tree was clean. `git pull --ff-only` stalled in network transport and was stopped; GitHub refs independently confirmed remote main matched local START_COMMIT. The existing Git Data API publishing helper verified identical trees and commit SHAs and advanced main with non-forced fast-forwards for the two application commits.

## Local Deterministic Nutrition Completion

Food now has a compact remaining-target strip below the calorie and macro summary. No target means no completion entry. Today uses “帮我补齐” / “补齐今日营养”; past dates use “补齐当日营养”; future dates use “预览补齐方案”. Reached targets show a light text state without suggestions. Unknown targets are qualified as unknown, rather than declared complete.

The existing Bottom Sheet shows captured date, signed gaps, up to three different food combinations, integer suggested grams, added nutrients, and projected totals against the unchanged targets. Long food names and brands wrap. The current Sheet expands breakfast/lunch/dinner/snack/unclassified choices, with 44px touch targets. Suggestions only become factual records after the user chooses a meal following the “实际吃下后” prompt. Future dates show an explicit preview explanation and no adoption buttons; the write service independently rejects future dates.

Sources and correctness:

- Targets reuse the selected date's existing `NutritionTarget`; there is no separate tomorrow target or planned-meal model.
- Actual intake uses only FoodLog `totalCalories/totalProtein/totalCarbs/totalFat` snapshots. Candidate values use current Food Library records.
- Calories are an independent stored dimension, never calculated using macro 4/4/9.
- Any saved log missing a target macro makes that actual and gap unknown; the corresponding target is excluded from optimization and explained in text. Empty days have known zero actuals. Explicit macro zero remains valid.
- Foods missing an active macro are excluded and counted. Missing inactive macros remain allowed and are displayed as incomplete when appropriate, not zero.
- Signed gaps show “还差”, “已超”, or “已达目标”. Already-over dimensions remain in the objective and penalize further increases.
- Plans are ephemeral: every opening rereads target, snapshots, and current foods; no recommendation DB store, localStorage, backup field, report category, or Calendar marker was added.

Optimizer implementation in `src/utils/nutritionCompletion.ts`:

| Parameter | Actual bound |
| --- | --- |
| Gram step | 5g |
| Foods per plan | At most 4 |
| Grams per food | At most 400g |
| Total plan grams | At most 800g |
| Combination candidates | At most 12 |
| Beam width | 100 |
| Search rounds | At most 160 |
| Returned plans | At most 3 |

Each eligible food is scanned at 5–400g for its best single-food score. Candidates are ranked by score, then name, then id using deterministic text ordering. Beam states add 5g, deduplicate gram vectors, and recompute totals from the vector to avoid path-dependent floating-point tie drift. Each round keeps the best 100 states. The archive retains the best portion vector per food set, with at most 793 sets for the 12-candidate/4-food limits. Alternatives use different food sets and must remain within both absolute and relative score limits; three plans are not forced.

The score is normalized squared error using target scales with floors 200 kcal / 20g protein / 30g carbs / 10g fat. Undershoot weight is 1; ordinary overshoot is 1.8; additional intake in already-full/over dimensions uses weight 8. Additional food complexity costs 0.0004 per item beyond the first. Only plans improving on adding nothing are returned. `closeEnough` requires every active dimension within max(30 kcal, 2% target) or max(3g, 3% macro target). This is a bounded heuristic, not proof of a global optimum or exact feasibility. The UI discloses approximate results and never claims perfect completion.

`src/services/nutritionCompletionService.ts` validates the captured local business date, meal, unique food ids, and portion bounds, then calls existing `logFood()` inside one Dexie `rw` transaction on `foodLogs`. It snapshots the displayed recommendation's food values. One failed insertion rolls back the whole plan and preserves prior records. The Sheet disables all adoption/meal buttons before writing and guards repeated clicks; errors keep the Sheet available for retry. After success, the Sheet closes, shows the record count, and refreshes Food totals. Target and template records are untouched.

The Fresh Green system remains: clean warm ivory surfaces, deep ink, restrained secondary sage/lime states, existing shared tokens, no new hard-coded greens. Food's existing nutrition hero remains the main visual. UI_INTERACTION_SPEC records these durable interactions.

## Data Compatibility and Scope

- Dexie **V7 / 14 stores**.
- Backup **V7**; Restore **V1–V7**.
- No schema migration, store, backup format, package manifest, lockfile, dependency, API, AI, backend, cloud service, or external nutrition source was added.
- Database/types, existing Food snapshot service, NutritionTarget service, Backup/Restore, Diet Templates, Calendar, Reports, Clear Day, and training modules have no diff from START_COMMIT. Adopted records are ordinary FoodLogs consumed by the existing aggregation and cleanup flows.

## Automated Verification

- Typecheck: PASS.
- Full tests: **224 tests / 19 files**, PASS; baseline was 199 / 17.
- New coverage: 20 optimizer/UI helper tests and 5 application-service tests. Includes single/two/three-food results; portion limits; deterministic repeated/reordered inputs; snapshot ownership; independent calories/non-100g references; over-fat preference; unknown logs; incomplete candidates; partial/zero targets; completed targets; impossible exact match; different food sets; 100-food bounded sanity; date/copy helpers; atomic application and failure rollback; invalid inputs; service future-date rejection.
- Local build: PASS — main JS **530.95 kB**, CSS **86.89 kB**, **17 precache entries / 638.63 KiB**.
- Pages build: PASS — main JS **531.00 kB**, CSS **86.89 kB**, **17 entries / 638.73 KiB**.
- `git diff --check`: PASS.
- Main Pages JS increased 9525 bytes and CSS increased 3273 bytes from the preceding verified production assets. No dependency or precache entry was added.

## Local Browser and Visual QA

Fresh isolated Chrome mobile contexts at **320×812, 375×812, 390×844, and 430×932** passed with no page errors or horizontal overflow, including Sheet content. Eight test foods included a long Chinese food name, complementary lean/carbohydrate/fat foods, and one missing-fat food. Existing target forms were used; test data existed only in isolated browser contexts.

Verified target 2200 kcal / P180 / C230 / F65 against actual snapshot 1450 / P105 / C170 / F42, showing exact gaps **750 kcal / P75 / C60 / F23**. Suggestions were calculated and adopted while the browser context was offline. The selected three-food plan was shrimp 245g + olive oil 25g + rice 195g, adding **775.75 kcal / P73.5 / C58.5 / F25**, giving **2225.75 / P178.5 / C228.5 / F67**. UI rounds calorie amounts to one decimal. Three independent Dinner records matched the displayed grams/date/meal, and gaps updated immediately.

Other checks passed: no-target/no-entry; all-targets-complete/no-entry; missing FoodLog fat clearly incomplete; already-over fat favors lean/carbohydrate candidates; future target and recommendations with no adoption/future logs; empty library with opener to the existing food library. A supplemental 390px pass confirmed rapid double-click only produced three new records, reopening recomputed the new gaps, and a one-food library returned one approximate plan with an explanation. Screenshots were inspected for compact hierarchy, readable projections, meal choice layout, long-name wrapping, and clean surfaces.

## Production Verification

Application Actions succeeded. Production assets match the local Pages-path build byte for byte:

- `index-DfZ9YjVF.js`, **531005 bytes**, SHA-256 `4c31ad60dc23a31d6c4604381c8f5f5f21c71cec6bdd87226431a77395d19f1a`.
- `index-B2atRTLz.css`, **86898 bytes**, SHA-256 `fc0055c7c5bedd872c0773699c189277312a84480ba23a1c974819b41b0ac06f`.

Fresh production contexts at **390×844 and 430×932** passed the same core target/gap/Sheet/recommendation/Dinner application flow, including offline calculation and adoption, double-click prevention, reopening with recomputed gaps, and immediate totals refresh. All plans obeyed the food/gram bounds; the incomplete active-fat candidate was excluded. Missing-log macro, already-over fat, reached targets, future preview without factual future logs, empty library, and one-food approximate result also passed. No page errors or horizontal overflow. Settled production screenshots of plans and meal selection were visually inspected. These are simulated mobile-browser checks, not physical iPhone verification.

## Manual Device Verification

**Pending:** physical iPhone Safari and standalone PWA. Check 320/375-width completion Sheet; long-plan scrolling; meal-picker touch targets; Safe Area; keyboard; long food names; Fresh Green CTA saturation; offline calculation; standalone PWA adoption flow. No physical-device verification is claimed.

## Known Issues

The existing nonblocking Vite warning for the main JS bundle exceeding 500 kB remains. No new application, test, browser, or deployment defect was confirmed. Optimizer output is bounded/approximate; physical-device verification remains pending.

## ChatGPT Baseline

FitLog Lite remains a Vanilla TypeScript local-first iPhone PWA. Dexie V7/14 stores, Backup V7, Restore V1–V7. Verified application END_COMMIT: `f7d7a408a456ee8abece9b30320d22817ea487fd`; latest main also includes a separate report commit. Food now has local deterministic Nutrition Completion using existing daily targets, historical snapshots, and current Food Library. Beam100/candidates12/5g/4foods/400g-each/800g-total/160rounds/3plans. Unknown macros stay unknown; already-over targets are penalized; approximate results are disclosed. Suggestions are ephemeral; future dates preview only; today/past adoption asks for a meal and atomically creates normal FoodLog snapshots. No AI/network/backend/dependency/schema change. Fresh Green and existing modules remain. Tests 224/19; production verified at 390/430; physical iPhone pending. Read AGENTS, this report, and UI_INTERACTION_SPEC; sync main and record a fresh START_COMMIT for the next task.
