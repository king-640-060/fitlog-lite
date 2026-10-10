# Approved FitLog Lite V4.2 design reference

`FitLog_V4_2_Prototype.html` is the original approved interactive HTML, copied byte-for-byte from the existing V4.2 delivery artifacts on 2026-10-10. It is not production code and contains demonstration data/calculations.

- Original HTML SHA256: `aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687`
- Original ZIP SHA256: `7e9b64b701fc38d89d4ee08849bcdd3e238e86f6ffcdc9eb2ec9a10c52174dde`
- Original delivery: `FitLog_V4_2_Prototype_for_Codex.zip`, containing this HTML; retained delivery directory `artifacts/v4-2-2026-10-10/prototype` outside the checkout.

## Mandatory acceptance workflow

Never edit this original HTML. Its unit and browser hash guards must remain. Future fixes involving this design must first run this file and inspect its actual DOM, complete CSS cascade and rendered screenshots; do not request the same attachment again or infer appearance from prose. From repository root: `python3 -m http.server 5190 --bind 127.0.0.1`, then open `/design/reference/v4.2/FitLog_V4_2_Prototype.html`. Navigate Today/Food in the running prototype. `tests/browser/remainingPrototype.mjs` runs it alongside the real App.

Today: `.remaining-compact`, `.goal-compact-top`, `.goal-mini-grid`, `.goal-mini-item`, `.goal-mini-dot`, `.remaining-compact-action`. Four bordered mini cards, nutrient dots, heading-right entry. Food: `.remaining`, `.remaining-heading`, `.gap-grid`, `.gap-item`, `.remaining-actions`, `.remaining-action`. Standalone card, four bordered cells, two equal-width bottom buttons. The later refinement style block and355px media rule override earlier styles.

The HTML governs confirmed visual anatomy. Development instructions govern functionality/security; existing real services govern data. Never import demo logs, mock optimizers or tolerance rules into production. Production retains four independent missing/unset/reached/excess states even where this demo filters dimensions. Preserve full values instead of its ellipsis; preserve existing real rounding (integer kcal), accessible contrast tokens and scalable rem text. Production controls remain at least44px (demo Today40/Food43); report resulting height differences explicitly. The existing dark surface tokens approximate the demo's restrained gradient without a new palette. For magnified-text comparisons, only the disposable browser scales prototype computed text sizes; the archived file stays unchanged. Automated Chromium/WebKit evidence is separate from physical iPhone Safari/standalone PWA acceptance.
