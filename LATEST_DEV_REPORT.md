# FitLog Lite — Latest Development Report

This is the latest verified production application snapshot. Sync main and inspect current code before trusting a recorded SHA. A later documentation-only commit may advance main without changing the application baseline.

## Current Git and Production State

- Branch: main
- START_COMMIT: 21c9a92ad88a033b0dc1be6bcd0feb29aebe6142
- Application commit: 88b389f7a5f2c7f31cc68f88e87c2e18fca7fa15
- Application commit message: Refine calendar markers and legend
- Production URL: https://king-640-060.github.io/fitlog-lite/
- GitHub Actions run: 35972018429
- Workflow conclusion: completed / success

## Latest Round — Calendar Visual Encoding

Calendar now separates the selected date, recorded category markers, and their legend. Only the date number receives a 36 px green selected circle; Today has a separate small dot that remains visible when the two states coincide. All date cells keep the same 74 px height, including empty and selected dates.

The legend uses one 22 × 22 px icon container and 14 px SVG for each of the five categories. Cardio now uses a simple stair/steps glyph rather than a text badge. Month cells reuse the same glyph and semantic color at a compact size, in fixed food → strength → cardio → pelvic floor → weight order. At most four glyphs appear, followed by +1 when all five categories occur. Non-month dates and their markers are subdued. Full category names, selected state, and Today state remain in each date's accessible label; the selected date exposes aria-selected=true.

Only Calendar presentation, its shared SVG icon helper, focused UI tests, and the UI specification changed. Calendar aggregation, day-detail data, monthly statistics, training, food, pelvic-floor, weight, Dexie, and Backup/Restore logic did not change.

## Data and Compatibility

- Database: Dexie V5, 10 stores; unchanged
- Database name: fitlog-lite-db; unchanged
- Backup export schema: V4; unchanged
- Restore compatibility: V1 / V2 / V3 / V4; unchanged
- Local business date: device-local YYYY-MM-DD; unchanged

## Automated Verification

- npm run typecheck: PASS
- npm test: PASS — 145 tests / 13 files
- npm run build: PASS
- PWA generateSW: PASS — 17 precache entries / 557.58 KiB
- git diff --check: PASS

The existing Calendar aggregation and compatibility tests passed. Two focused tests cover cardio/stairs recognition, stable marker order, four-marker overflow, accessible category names, and selected/Today combinations.

## Browser Visual and Interaction Verification

Local Chrome simulations at 375 × 812, 390 × 844, and 430 × 932 covered an empty month, each individual category, food + strength + cardio, all five categories, selected empty and populated dates, Today selected and unselected, and an adjacent-month recorded date. The legend retained equal 22 px containers, all sampled day cells remained 74 px high, and there were no page errors or horizontal overflows. Clicking another date moved aria-selected and its accessible label while Today retained its own indicator. These were browser simulations, not real iPhone tests.

## Production Verification

- GitHub Actions run 35972018429: completed / success for 88b389f7a5f2c7f31cc68f88e87c2e18fca7fa15
- Production HTML: HTTP 200
- HTML-referenced JavaScript: fetched and confirmed stair glyph, legend, and marker overflow
- HTML-referenced CSS: fetched and byte-identical to the local build CSS
- Production browser at 390 × 844: five icon legends, 22 px containers, 74 px day cells, selected aria state, no page errors or horizontal overflow

## Confirmed Issues and Manual Device Verification

No remaining code, test, build, browser, or deployment defect was confirmed. **Manual Device Verification: Pending.** Real iPhone Safari, standalone PWA, Safe Area, and offline behavior still require device verification. Browser viewport checks do not substitute for those checks.

## ChatGPT Baseline

FitLog Lite is a local-first iPhone PWA using Vanilla TypeScript, Dexie V5 with 10 stores, Backup V4, and V1/V2/V3/V4 Restore. The current application baseline is 88b389f7a5f2c7f31cc68f88e87c2e18fca7fa15. Calendar uses separate selected-date, Today, record-marker, and legend visuals; all five categories share their icon and semantic color between month cells and the legend, with cardio represented by stairs. Calendar aggregation and business data are unchanged. The progressive pelvic-floor plan remains Foundation → Standard → Advanced with four independent specialty routines. Read AGENTS.md, this report, and docs/UI_INTERACTION_SPEC.md before further UI work; sync main and record a fresh START_COMMIT.
