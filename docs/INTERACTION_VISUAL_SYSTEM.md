# FitLog Interaction & Visual System

## Boundaries

Vanilla TypeScript and existing CSS only. Business entities/services, historical snapshots, local date semantics, canonical kcal, Food Vision parsing/writes, AI tools/permissions/proposals, Backup/Restore/Sync and the 14-store Dexie V7 identity are unchanged. Visual rules never override data preservation. Five bottom tabs and Progress Trend/Calendar/Reports remain.

## Shared layers

| Layer | Owner | Contract |
| --- | --- | --- |
| Input modality | `src/ui/inputModality.ts` | Capture pointer/touch and navigation keys; text entry/caret/IME stay in their current modality. Select, checkbox and button navigation can switch to keyboard. |
| Focus/press/hover | `src/styles/interaction.css` | Pointer focus has no outline/glow; keyboard navigation has 2px outline, including inputs and custom rows. Neutral field border on focus. Transparent native tap highlights on real controls; no global user-select:none. |
| Sheet lifecycle | `src/ui/sheetController.ts` | One primary native dialog, synchronous once-only close notification for explicit close/replacement, native cancel left to subviews, normal cleanup, temporary confirmations, title anchor focus and keyboard trigger restoration. |
| Viewport | Same controller, app lifetime | One resize/scroll pair on the real VisualViewport plus window/focus listeners. All sheets inherit height/offset/overlap. Domain sheets add none. No listener growth when opening sheets. |
| Scroll | Same controller + `src/styles/sheets.css` | Reference-counted fixed-body lock preserves CSS and x/y scroll; nested confirmation keeps the lock. Header is fixed within flex column, body min-height:0 and overscroll containment, footer independent. |
| Primitives | `src/styles/primitives.css` | Buttons, inputs, form fields/search/radio; domain CSS owns content layout. |
| Variants | `src/styles/sheets.css` | Content and form fit content within viewport; large uses a near-viewport cap, assistant uses available height and its own flex conversation/composer. |

Explicit close wraps native `dialog.close`, dispatches one close notification immediately, then suppresses the browser’s queued duplicate. Consumers retain their existing close listeners (abort requests, cancel timers/pickers, discard images). Native Escape uses the native cancel/close path so a date subview may prevent cancellation and return to its preserved form. A replacement takes a scroll-lock lease before releasing the previous one and suppresses old trigger restoration. Only the controller removes a primary after normal close.

Initial title uses autofocus and tabindex=-1 with no outline. Forms and close buttons do not autofocus. Date subviews place focus on the same title; arrow navigation uses the date picker’s existing roving tab stop. Pointer dismissal has no residual ring; keyboard dismissal restores a connected trigger with preventScroll. Ordinary async tag completion preserves current user focus.

Viewport variables are `--sheet-viewport-height`, `--sheet-offset-top`, `--sheet-bottom-offset`, `--sheet-keyboard-overlap`. The pure `src/ui/sheetViewport.ts` state machine owns a stable layout baseline. Keyboard opening needs editable focus plus at least140px occlusion; once open it persists until occlusion drops to80px or less, even when focus leaves during dismissal. Keyboard-closed height stays at the baseline, offsets/overlap are0 and `keyboard-open` is false. Toolbar-only visual resize/scroll never repositions a Sheet. Nonediting visual scroll returns early; all remaining updates coalesce into one animation frame and unchanged CSS values are not rewritten.

Keyboard-open geometry uses visual height/top and actual bottom occlusion. Native focus scrolling goes first; the controller only corrects a still-obscured focused field inside its own scroll body when real keyboard mode opens or a field receives focus. No smooth keyboard scroll, repeated global focus scrolling, private listeners or fixed dismissal delay. Blur does not reset geometry while the keyboard is still visible. Mobile toolbar changes to innerHeight also leave the baseline stable; width/orientation changes refresh it, and desktop window resize refreshes height normally. User zoom does not count as a new keyboard. Voice starts without editable focus and cannot open keyboard mode.

AI Assistant's modal-body remains overflow-hidden with conversation as its only main vertical scroll surface. AI Settings uses the shared modal-body for long content. Native inner scrolling/rubber-band and overscroll containment remain; no global touchmove preventDefault or body touch-action:none. Background locking and nested confirmations retain the reference count; replacement acquires the new lease before normal old-sheet cleanup, so there is no intermediate unlock. Exact original x/y scroll and body styles restore only after the last dialog closes. Date Rail centering now directly scrolls its rail, and explicit nutrition meal reveal directly scrolls its own body; neither can scroll the page through scrollIntoView.

## Visual grammar

- Warm ivory background/white surfaces and readable green ink preserve Fresh Green identity. Neutral secondary actions and grouped rows reduce repeated green panels. Green remains for primary, selection and semantic marks; Calendar/nutrient category colors remain distinct.
- Small/control radius: 12–14px. Cards/groups: 16–18px. Sheet: 26px. Native confirmation:24px. Circles/pills are restricted to actual date/status/category marks, rings and timer geometry.
- Two shadow tokens: subtle selected/navigation surfaces and floating sheets/toasts/menus. Cards are flat with a quiet border; no border + shadow + colored card triple decoration.
- Primary uses lime with dark ink, secondary neutral warm surface, tertiary text/quiet icon, danger muted coral with explicit final confirmation. Common minimum touch height is 44px. Small delete/reorder/summary controls were expanded; the 320px Calendar bleeds slightly into page margins so seven columns remain 44px wide.
- Editable text is at least 16px; input focus uses one quiet border and no 3px shadow. Text hierarchy is page → Sheet → section → row → body → metadata/helper. Counts use tabular numerals.

## Motion budget and audit

| Pattern | Result / legitimate exception |
| --- | --- |
| Global button transform / date press scales | Removed; press changes background/color/opacity. Date Rail lens updates retain their functional transform. |
| Hover | All visual hover rules require `(hover: hover) and (pointer: fine)`. Pointer-mode focus does not activate keyboard styling. |
| Focus / focus-within | Shared modality rules; Habit hidden weekday/select controls use explicit keyboard parent/adjacent outline only. |
| autofocus / .focus | Title anchor only on opening. Date arrow movement, Food rail keyboard navigation and already-focused async task title restoration use preventScroll. Assistant suggestion taps explicitly open the composer keyboard. |
| showModal / dialog remove | Native presentation centralized; removal only as closed-dialog cleanup. Temporary confirmation overlays share lifecycle/lock. |
| Backdrop blur | Removed. RGBA overlay is static. |
| Page/number/ring/chart entrance | Removed. Final values and offsets are present in initial DOM. No count from zero/pulse/reveal on ordinary render. |
| Sheet / toast | Sheet200ms,16px,.85→1; toast180ms; close immediate. Reduced motion disables both. |
| requestAnimationFrame | Food Rail lens, actual pelvic timer, coalesced assistant text paints and shared viewport updates; no nutrition counting/initial task focus loop. |
| scrollIntoView | No calls remain. Rail/meal reveal scroll only their owned surface; shared controller corrects only residual real keyboard occlusion. |
| VisualViewport | One app lifetime coordinator, no private AI/Vision listeners. |
| Tap highlight / text selection | Actual controls suppress native highlight. Rail keeps its existing selection restriction; app text remains selectable. |

## AI presentation

Current service overview contains model, three capability labels, Edit, permission summary and advanced management. Permission switches and full privacy explanation are separate views. No active service opens the compact Provider/Key/Model form. 智谱 hides its preset URL normally; custom shows it; advanced endpoint edits remain possible. List/manual model selection uses exact returned IDs and keeps a missing current value with a warning.

Save and Test saves locally, then Chat → Tools → Vision in sequence. Each result/error is independent and safe. No automatic network on overview. Captured signature/generation guards prevent stale results on edits, subviews or close. Individual tests/save-only/rename/delete are advanced. Saved secrets are never inserted into the form.

Assistant uses readable provider/model, quiet header icons, compact unverified-data notice and safe error cards. HTTP400 has fixed parameter/model/interface guidance; raw provider bodies are hidden. Suggestions use two columns. User bubbles use a soft accent, assistant text is transparent. Send/Stop share one width, textarea stays 16px and ≤120px. Existing tools, proposal confirmation, IME, camera, near-bottom scroll and memory sessions are preserved.

## Verification

`tests/interactionSystem.test.ts` protects modality, viewport geometry and static motion/focus/hover/shared-boundary rules. `tests/browser/interactionStabilization.mjs` uses isolated synthetic contexts and mocked providers at 320×812/375×812/390×844/430×932 (production390/430). It checks title focus, pointer/keyboard outlines, input size, native cancel/subviews, confirmations, rapid lifecycle, background restore, focused fake keyboard/blur/close sequences, orientation, settings/model/save-test/partial/errors and major Sheets/pages. Every checked Sheet receives synthetic long content and20 native wheel up/down cycles plus toolbar movements; geometry and background lock must stay unchanged. This is Chromium geometry QA, not physical touch/Safari proof. Existing Assistant/Vision/DatePicker/Sync scripts remain regression gates.

Physical iPhone Safari/installed PWA remain manual categories, independent of Chromium geometry emulation. Check: open Sheets without green X ring; keyboard without jump; rapid open/close without flash; settings scroll; composer/Safe Area; camera/photo-library return. Real Provider probes require the owner’s configuration and remain distinct from mock results.

## Mobile layout and density

- Main pages own top Safe Area centrally in the app frame (using the platform insets documented by [WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)); the topbar adds ordinary spacing only. Do not patch individual tabs with device-specific status-bar padding or add a second standalone inset. Immersive editors keep their existing central fixed-header reserve.
- Fixed five-tab navigation and page bottom reserve share `--nav-row-height`, `--nav-padding`, `--safe-area-bottom` and `--bottom-nav-height`. Main content reserves that full height plus `--section-gap`; its last item must scroll wholly above navigation.
- Shared spacing aliases are `--page-inline` (16px mobile), `--section-gap` (20px), `--card-padding` (16px), `--card-gap` (10px), `--field-gap` (12px) and `--group-gap` (16px). Reuse them when refining density; preserve 44px targets and 16px editable text.
- Compact Chinese action phrases stay together with domain rules / `compact-action`. If a phrase cannot fit, change the row or grid; never force a final character onto another line or globally prevent long copy from wrapping.
- Mobile forms must not leave unexplained orphan cells. Food uses its own single-column form and three-column P/C/F group; shared grid-form stays unchanged.
- Keep one obvious accent action per active workflow. Strength retains primary Start/Continue; Cardio and Kegel use compact secondary recording/start actions. Use quiet borders and existing radii.
