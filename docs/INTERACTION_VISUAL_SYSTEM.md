# FitLog Interaction & Visual System

## Mobile quality invariants

`docs/UI_QA_MATRIX.md` and `tests/browser/uiQualityAudit.mjs` define the reusable release audit. Root clipping is not a substitute for child overflow checks. Main content reserves bottom navigation/Safe Area; Sheet body owns ordinary long forms and pickers. Keep Chinese action labels intact and task time metadata below the title.

Text-field selectors exclude checkbox/radio. Native20–22px toggles live in >=44px labels without appearance replacement; Habit weekday overlays retain their existing44px hit areas. Editable text is >=16px, user scaling remains enabled.

Energy presentation uses integer kcal/kJ while canonical precision stays unchanged. Generic automatic nutrition/grams/weight presentation uses at most one decimal. Restore untouched exact form sources during FormData creation; input edits and programmatic changes take precedence. Never round ongoing keystrokes.

Vision step rendering owns scrollTop0 immediately and on a guarded frame; viewer return restores the same review nodes and scroll. All image/source/timing state is memory-only. Fast nutrition1400px/auto and front1000px/low are defaults; high-detail1800px retry requires a fresh explicit recognition action.

## Boundaries

Vanilla TypeScript and existing CSS only. Business entities/services, historical snapshots, local date semantics, canonical kcal, Food Vision parsing/writes, AI tools/permissions/proposals, BackupV11/RestoreV1–V11/SyncV1 and the stable20-store DexieV11 identity preserve all prior records. Nutrition strategy stores are additive; daily target provenance is a snapshot, never a live link. Visual rules never override data preservation. Five bottom tabs and Progress Trend/Calendar/Reports remain.

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

- Repeated cards on the same functional surface share geometry; different interaction contexts may differ. Dedicated Workout training-card base owns full content width,48px minimum height,14px radius and nowrap. Dedicated Workout execution cards use the same primary lime treatment for their main action; geometry and interaction states remain shared across Strength, Cardio and Kegel. Today dashboard navigation is compact header text with a chevron; ongoing workout continuation stays compact primary within its corresponding strength status, without an isolated footer row.
- Today/Food reuse calorieGaugeHtml and goal-ring, backed by calorieGaugeGeometry's280° SVG arc with80° symmetric bottom gap. Main r46/stroke6 and excess r55/stroke3 share round endpoints, active accent-mid, weak border/.55 track and centered kcal hierarchy. Unset keeps text-tertiary3/7 dashes with Today .85/Food .65. Existing zero/reached/excess fractions map to the available arc, exact excess stays in text and outer progress remains capped. No mask or replay animation.
- Today and Food use macroNutritionSummaryHtml/macroNutritionSummaryForDay, backed by one read-only dailyNutritionSummary transaction and live observation of FoodLogs, NutritionTarget and same-date weights. One neutral token-based container aligns Protein/Carbs/Fat in three columns; large fonts or long values switch all three together to full-width rows, never two plus an orphan. Name, prominent consumed amount, secondary target and lightweight g/kg occupy separate lines. Main numbers use shared text ink; category colors are tiny marks only. Remaining/excess stays in the shared remaining-goal area, with no repeated cell badges or added Today CTA. g/kg uses the selected date’s latest valid weight and complete macro snapshots, exactly two decimals; hide absent same-date weights/unknown dimensions. Preserve saved precision, existing target/template/CTA and calorie semantics.
- Section explanatory text belongs to section-footnote grammar, not interactive-row grammar. `.settings-section-note` is a muted paragraph with8px top/10px inline margin, .74rem text and1.5 line-height, outside the group but inside the section; no box, icon, heading or action affordance.
- Empty-state create has one visible equivalent entry. Plan tab Today/Upcoming/Inbox use shared primary lime with the existing compact action geometry; Today Plan remains secondary. Plan hides its header create via `hidden` whenever the final view renders `.plan-empty`; the header primitive honors this visibility instead of overriding it with inline-grid display.
- Warm ivory background/white surfaces and readable green ink preserve Fresh Green identity. Neutral secondary actions and grouped rows reduce repeated green panels. Green remains for primary, selection and semantic marks; Calendar/nutrient category colors remain distinct.
- Small/control radius: 12–14px. Cards/groups: 16–18px. Sheet: 26px. Native confirmation:24px. Circles/pills are restricted to actual date/status/category marks, rings and timer geometry.
- Two shadow tokens: subtle selected/navigation surfaces and floating sheets/toasts/menus. Cards are flat with a quiet border; no border + shadow + colored card triple decoration.
- Primary uses lime with dark ink, secondary neutral warm surface, tertiary text/quiet icon, danger muted coral with explicit final confirmation. Common minimum touch height is 44px. Small delete/reorder/summary controls were expanded; the 320px Calendar bleeds slightly into page margins so seven columns remain 44px wide.
- Editable text is at least 16px; input focus uses one quiet border and no 3px shadow. Text hierarchy is page → Sheet → section → row → body → metadata/helper. Counts use tabular numerals.

Search geometry is owned by primitives.css: search-specific padding must win over generic text-field padding. Absolute icons and input text share the logical start edge; icons center within the field and ignore pointer events. Ordinary inputs retain their existing padding.

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
- Dedicated Workout Strength, Cardio and Kegel main actions all reuse the existing full-width primary lime class and its interaction states. Today actions remain compact. Use quiet borders and existing radii.

## Runtime diagnostics

Keep version and worker details inside Management → Application → Version diagnostics, using the existing Sheet and primary/secondary button primitives. Long SHAs and sanitized URLs wrap without clipping; controls retain shared touch/focus states. No homepage diagnostic decoration. Waiting activation and reload require user confirmation and transient-state preservation; see [PWA_RUNTIME.md](PWA_RUNTIME.md).

## Nutrition strategy interface

Day selection, manager, detail and editor use existing Sheet/button/form primitives. Daily variants are uniform quiet cards with actual/goal inputs already owned by Nutrition Target; selected cards use accent-soft plus a visible check and aria-pressed. The deterministic apply preview/primary stays in the shared Sheet footer while choices scroll. Saved daily values/names are displayed separately from current definition values; selection is based only on persisted provenance.

The manager uses the shared Manager Visual System with current phase/date metadata, other templates and archived definitions. Actual phase weights remain in the detail view. Detail provides phase history, copy-as-new, editing and explicit activation. Creation shows a name plus summary cards; only one variant is edited at a time in a same-Sheet subview, preserving the parent form. Reorder uses 44px arrow controls; long lists and save remain in the shared body. Variant inputs reuse existing nutrition validation/presentation with single-column layout. Activation reuses the shared date picker and previews old phase closure; it is not a scheduler. No private viewport/keyboard listeners.


## Food serving / training presentation boundaries

Food serving mode reuses existing secondary buttons and primary save, quiet accent-soft selected state, aria-pressed and a shared Sheet body. Optional serving mass and the existing reference nutrition have separate labels; conversion notes are metadata, not a second nutritional authority. Long names/decimal counts remain readable at140% and320px. Clear-meal is a quiet destructive link inside the expanded group, with the shared final danger dialog.

Calendar category Food uses one fork path; the same category primitive owns grid/legend/day-detail size and alignment. Today Training is titled 训练 and uses existing card-heading/text-btn/chevron navigation. Ordinary body status pairs with secondary 记录训练 using today-activity-body/action, with no isolated footer row. This opens today’s existing Strength/Cardio creation region without a write or a chooser. An open strength workout replaces that CTA with compact primary 继续力量训练 beside its own status, resuming the same workout. Empty/completed/Cardio states retain the ordinary CTA. Cardio metrics share one unitless presentation helper, preserving minutes and actual stored values.


## Contextual notes

Special-diet notes use quiet Fresh Green existing text/secondary controls and grouped editable rows; no warning/discipline design. Keep ordinary meal records as Food's main content. Meal/day estimates are contextual and never modify intake or target presentation. Reuse the shared Sheet for edit/photo subview, no private keyboard/viewport coordinator. Calendar category icon/legend/details share existing glyph geometry, with special diet prioritized inside max4 visible markers.


## Push-to-talk and manual Habit danger actions

Voice uses the existing composer mic geometry and shared selected/focus rules. Compact recording/timer and transcribing status sit next to composer; no large disclosure panel or private viewport logic. TTS has one quiet >=44px stop action. Static Voice privacy belongs in settings, without an app-specific startup acknowledgement. Habit editor keeps shared quiet danger below state controls; irreversible count confirmation uses the shared danger dialog. No new palette or primary geometry.


## Shared motion system (2026-10-06)

Tokens: instant80ms, fast120ms, normal160ms, Sheet200ms; Toast entrance180ms and real recording indicator1300ms are the two semantic exceptions. Standard easing cubic-bezier(.2,0,0,1); emphasized cubic-bezier(.2,.8,.2,1). No animation dependencies.

Primary press uses accent-pressed, secondary/icon press uses neutral surface, danger retains coral; disabled has no press transition. Hover remains fine-pointer-only. Selected choices share accent-soft/background, accent-strong/text and optional quiet accent border. Native checkbox/radio semantics and visible keyboard focus stay authoritative. Only internal checks/underlines transform; no global scale/bounce or card motion.

Bottom Nav retains its nodes: active surface and text transition160ms. Main content enters .96→1/+4px only on genuine navigation,120ms. Initial render and domain refresh do not replay. Plan/Progress retain tab nodes, with reversible underline opacity and scaleX(.75→1),120ms; text stays fixed. Calendar transitions only selected surfaces, keeping Today's independent marker; no whole-grid entrance.

Sheet entrance remains .85→1/+16px,200ms. Explicit same-Sheet navigation freezes its current frame and animates only inner content ±4px/160ms; returning restores parent scroll. Existing viewport/keyboard controller remains authoritative. Training Journal uses its existing add/edit control as an accessible expand/collapse control, preserving the mounted draft and existing autosave; only newly revealed editor content enters. Opt-in details disclosures use native layout followed by a short content entrance, without height:auto animation or global details interception.

New user/assistant text enters .88→1/+3px once; subsequent stream tokens and reopened history never replay. Proposal and TTS status use restrained color feedback. Only true recording uses a small opacity dot (.55↔1/1300ms), stopped with capture. Toast enters +5px/180ms and exits opacity/120ms. Numbers and rings always show final values on initial render; no countup, ring reset or generic refresh animation.

Reduced motion suppresses CSS decoration and explicit Web Animations, including cancellation if the preference changes. State remains readable without animation. No scroll-handler decoration or infinite RAF.

Research: public [Douyin](https://www.douyin.com/jingxuan/sy) and [Bilibili](https://www.bilibili.com/) were attempted; automated access did not provide reliable mobile interaction evidence. Public [GUI Challenges](https://github.com/argyleink/gui-challenges), [switch](https://web.dev/articles/building/a-switch-component), [tabs](https://web.dev/articles/building/a-tabs-component) and [toast](https://web.dev/articles/building/a-toast-component) references informed native state ownership, small local feedback, short transitions and reduced-motion opt-outs. No brand palette, copied code, custom drag, spring, glow, 3D, confetti or countup was adopted.

## Habit editor save flow

Habit Manager and Editor share the existing large Sheet frame so a short/empty manager cannot constrain the editor viewport. Preserve shared subview motion, keyboard/Safe Area ownership and manager scroll on return; each editor starts at the top. Save is an ordinary static-flow action after planning and before existing Habit state/danger controls, never sticky/fixed/absolute. Keep primary/full-btn,52px minimum and15px radius. Do not copy this rule onto unrelated editors.

## Persistent Management Workspace (2026-10-07)

The topbar Management entry creates one large primary native dialog, owned by `src/ui/managementWorkspace.ts`. Hub → all twelve managers/settings → editors/subviews → Back retain the exact dialog, handle, header, close and modal-body nodes. Only inner content animates with existing subview/back motion; ordinary route changes keep top/height within2px, ideally0. Never close/reopen Hub to imitate Back or call a child standalone openModal from this path.

`ManagedSurfaceContext` supplies existing renderers with the persistent host/dialog, mount/navigation stack, title/Back target, scroll restoration and route disposal. Standalone Food/Today entries use the same renderer and keep their own parent meaning. Navigation stores UI nodes, title, query/subview and scroll only; services/DB remain authoritative. Saving reloads current service data, then restores the existing query and a valid scroll position. Every New editor starts at0; X closes every level, releases route resources and the shared lock, and the next topbar entry starts at Hub0.

Hub is 管理与设置 without Back. Level2 titles: 食物库 / 动作库 / 训练模板 / 饮食模板 / 营养模板 / 习惯 / 导入数据 / 备份与恢复 / GitHub 同步 / AI 设置 / 版本诊断 / 关于 FitLog Lite. A shared44×44 header Back names its actual parent in aria-label and pops one level; X always exits the workspace. Internal body Back controls are replaced visually by this header in managed paths. Temporary existing danger/Restore confirmations may overlay the same parent; they never replace it. AI → Voice → Back returns AI, then Hub.

All six entity managers use `.manager-toolbar`: search or count/status plus visible `+ 新建`, with complete 新建X aria-label and44px target. Empty states contain a brief title, one explanatory sentence and one primary 新建X; hide/remove the equivalent toolbar entry. Use 新建X / 编辑X / 保存X for long-lived entities; 添加 means placing an existing item into a meal/workout/template. Rows contain name, metadata and chevron and open the entity destination; quiet confirmed deletion belongs to the editor. Habit Level2 is 习惯, never 习惯管理.

Preserve Habit large-frame/static Save52px/15px/full-width/2px top padding and zero field overlap. No sticky/fixed/absolute actions. Preserve DBV10/IndexedDB100/18stores, BackupV10/RestoreV1–V10, Sync/envelopeV1, AIConfigV1/VoiceConfigV1 and permanently retired Video status. Route cleanup aborts AI/Vision/Sync/diagnostic requests, file-read callbacks and timers without resetting business storage. Physical Safari/original installed PWA remain separate evidence.

## Manager Visual System (2026-10-07)

Navigation remains owned by the existing Persistent Management Workspace contract. `src/ui/managerPrimitives.ts` and `src/styles/primitives.css` are the single HTML/visual source for all six entity managers, including standalone entries: 食物库 / 动作库 / 训练模板 / 饮食模板 / 营养模板 / 习惯. Domain renderers provide escaped copy/attributes and slots; they do not invent parallel list/card/empty layouts.

Shared anatomy is `.manager-surface` → `.manager-toolbar` (`.manager-toolbar-main` search/status, `.manager-toolbar-actions` quiet actions) → optional `.manager-utilities` / `.manager-section-note` → `.manager-section` / `.manager-list` / `.manager-row`. Row buttons contain `.manager-row-copy`, `.manager-row-title`, `.manager-row-meta` and `.manager-row-trailing` with18px chevron. Lists share warm surface,1px border,17px radius and no shadow. Rows share66px minimum,12px14px padding,4px text gap, .93rem/700 title and .75rem metadata; wrap naturally for longer domain content/font scaling. Dividers are shared. Search/status toolbar has a shared scalable height matching the editable line box,46px at100%; Create is quiet44px `+ 新建` with full 新建X aria-label. All search/status types use the same responsive geometry; shrinkable main slot and nowrap actions retain320/140 without per-module breakpoints.

True entity-empty uses `.manager-empty` with centered brief title/copy and one `.primary.manager-empty-action`:48px minimum, shared12px control radius and16px inline padding. Hide equivalent toolbar Create. Filtered no-results uses `.manager-no-results`, quiet copy and optional clear-search text action, never an empty-state primary CTA. Toolbar New remains quiet when the library has entities.

Food preserves two neutral44px/18px-icon utilities in the shared utilities slot. Habit keeps active/inactive shared sections and explicit reorder mode, with44px arrows in trailing slots and Create hidden while reordering. Nutrition puts current status/start date in row metadata; its short explanatory note is unboxed below Toolbar. Detailed phase/weight history remains in the existing detail view through the editor. Templates retain copy/apply/delete in editors rather than list rows. Old library/template/Habit/Nutrition list-specific visual rules are removed; retained class names are business/test selectors only.

Editor audit uses existing forms plus `.manager-editor`, primary full-width Save, quiet danger below it and a separate `.manager-danger-zone` for library/template deletion. Habit preserves its existing basic→planning→static Save→state/danger order,2px top action padding,52px/15px geometry and0 overlap. No changes to workspace controller/navigation, business services, schemas, AI/Voice/PWA or motion ownership. Add no observers/listeners/animation loops for this visual system.


## Food density and Recovery (2026-10-08)

Food meal summaries show all names for1–3 items and first3 for larger meals. The existing counted meal header is the single expansion entry; remove duplicate +N controls/counts. Only preview names may truncate. Expansion reveals all actual editable records in place and bottom 收起; edit/delete/clear and date-scoped expansion remain intact. Macro/current/goal/g/kg tokens never clip or overlap; Today/Food share the complete neutral summary and same-date live snapshot. 帮我补齐 uses shared primary lime, shared pressed/focus and lime busy feedback with duplicate-click protection.

Today and Progress → Trend share 恢复 reading the same persisted sleep/water tables. 开始睡眠 creates one active session; 我醒了 finishes it by wall-clock subtraction, retaining legacy wake metadata and a separate stable business night. Keep state across routing/reopen/background/midnight; no timer-engine or per-minute DB writes. Correct local dates/times through the existing shared date-picker, reject future/inverted times, and explain >24h records. Cancel only the active session; historical delete is separately confirmed. Absolute instants remain stable across time zones; stored business dates retain captured local semantics.

Water quick250/500 and custom actions create separate entries, sum today's records, and offer exact-id six-second Action Toast undo outside card flow. History supports selected-date viewing, single volume edit and confirmed deletion. History→Editor→Date uses the same native Sheet, header Back returns one level and preserves parent nodes/scroll; X closes and disposes resources. Save stays in normal form flow with primary lime, busy state and inline validation.

Recovery charts use7/30/90 calendar days: daily duration and water in shared SVG line charts with one selected date/value readout and keyboard/touch-selectable actual points. Missing days excluded from sleep average, daily multiple episodes summed, clock means circular using each day's longest episode. Sleep uses a data-derived scale and objective means/recorded days only. Water reference is an optional device-only preference. Unknown days say 未记录. Numbers, HH:mm, duration, ml and CTA never ellipsize; adjust columns/rows at320–480px,140% text and landscape. Dark preference uses semantic surface/ink/macro tokens with the existing primary lime. Normal/reduced motion share final values and retain existing shared motion ownership.


## Today Recovery and catalog proposal grammar (2026-10-08)

Sleep/Water directly reuse today-card/today-activity-card and card-heading/today-activity-head with leading card-icon, h2 and right text-btn/chevron history. No recovery group heading. Body/copy/status/meta and compact today-activity-action are shared; the single Today action rule owns44px minimum,12px radius, padding/font. Primary color/hover/active/focus/disabled stay owned by existing primary primitives. Ordinary Today card gap also applies between Sleep/Water. Preserve dark/normal/reduced tokens and shared Safe Area. At large fonts, complete controls wrap into rows; no clipping or forced compression. Sleep empty state is compact; water shows factual total/optional reference and three quiet quick actions, no percentage/ratio or large tint.

Reference editing uses a small shared Sheet, normal16px input and Save/Unset/Cancel primitives; separate from custom drink entry. Device-only nullable config never becomes a business goal or backup value. Recovery range7/30/90 uses equal-width/equal-height shared selected segments. Data-derived selectable lines use no target line; empty ranges use quiet text.30/90-day scroll is owned only by each bounded chart region with 44px point spacing and safe gutters; enlarged-font7-day charts may also scroll internally. All daily facts remain accessible in native details.

Catalog proposals keep the existing quiet card/status/primary-confirm/cancel grammar. Default summary includes create/edit/type/name/write count; native expandable details shows human before/after fields and ordered contents, never raw JSON. One confirmation commits composite entities atomically, source changes expire the card, and successful manager refresh preserves the original workspace frame/query/scroll/navigation and hidden drafts. Full data/security contract: AI_ARCHITECTURE.md; release evidence: UI_QA_MATRIX.md.


## Unified Daily Records visual grammar

See [Daily Records UX Contract](DAILY_RECORDS_UX_CONTRACT.md). Calendar's nine restrained semantic glyphs occupy fixed3×3 slots in seven >=44px date columns at320. Empty slots stay empty; no +N, crowded kcal or progress tracks. All42 dates, including adjacent month, share actual-record semantics. Day Detail/Day Report share nine native disclosures, shared header/grouped rows/secondary metadata and complete escaped saved facts. Enlarged type wraps naturally; the Sheet body owns vertical scrolling.

Sleep/Water share one SVG line component with a precise selected-date/value readout and44px selectable markers. Default numeric labels are omitted, missing days split paths, and spacing/gutters protect interaction targets. Charts own horizontal scroll; empty ranges use quiet text. Average statistics belong to Reports, which retains Week and adds Day and Month recovery facts. Missing is not zero, and objective facts never become achievement/judgment scores.

Action Toast uses existing surface/border/radius/ink/shadow/motion tokens with44px Undo, one at a time in the top layer. Never insert feedback into a Today card, move surrounding content, or cover navigation/active fields/water actions. The app's shared viewport coordinator supplies keyboard state. Preserve live Sheet identity/date/expanded groups/scroll/focus and drafts with scoped subscriptions.

Date clear remains seven stores; name its actual scope and retain Sleep/Water/Habit/Tasks. Every future Daily Record type must audit Calendar, Detail, Trend and Reports together.


## Training & Recovery unification (2026-10-09)

Follow [Training Completion & Record Management UX Contract](TRAINING_RECOVERY_UX_CONTRACT.md). Kegel and Strength share Completion Layout/Status/Summary/Actions: saving/saved/error, retained actual result and stable identity, explicit Return; no automatic list jump. Manual Kegel never unlocks; natural unlock appears in the same completion. Cardio remains lightweight, guarded same-Sheet save/error/draft with local summary refresh.

Weight/Sleep/Water use shared content-sized History Sheet/Row/Meta/Actions/Empty and existing native Sheet lifecycle. Nearby history entries; no bottom Weight list after Recovery. Edit/delete exact IDs, confirm deletion, update original Sheet and facts in place; Back retains nodes/scroll/focus, X disposes subscriptions.

Sleep auto attribution uses local start00:00–05:59 previous night,06:00–23:59 start date. Manual correction chooses captured start date or previous night; real instants/ID/creation never change for attribution alone. New optional sleepNightDate/source/sleepStartLocalDate stays stable through timezone travel; legacy fallback uses current local timezone and explains unavailable original timezone. recordDate keeps wake metadata. Existing indexed bounded reads plus one resolver feed Today/Calendar/Detail/Trend/Reports/History. Today shows active and latest completed sleep even when the latest belongs to yesterday. Backup11/parser/Restore/Sync1 preserve optional fields without schema changes.

Single-night timelines display actual segments/gaps and sum actual duration, extend outside18:00→next12:00 using calendar arithmetic across DST. Never infer stages/REM/score/type. Recovery lines default latest valid point; pointer/touch/keyboard select full dates and exact values in a shared readout. Same-range refresh retains valid selection; range changes reset latest. Missing splits paths, single/empty remains factual. Use collision-safe numeric labels only for1–3 actual points when they fit; dense charts use the selected readout. Remove the entire 展开每日记录 list. Weight Chart.js follows the same readout/selection/keyboard/scroll contract. Long charts scroll internally.

Required release gates retain717 prior unit tests and26 prior browser suites, adding trainingRecoveryExperience and trainingRecoveryLifecycle;27 scene screenshots/contact sheet,4width×4font×2color×2motion pluslandscape and20 integrated actual UI cycles. Keep DB11/110/20,Backup11/Restore1–11,Sync/envelope1,AI/Voice1,WaterReference1. Physical Safari/original PWA/real-device continuity require separate evidence.


## Unified Module Experience (2026-10-09)

Follow [Unified Module Visual Hierarchy Contract](UNIFIED_MODULE_VISUAL_HIERARCHY_CONTRACT.md).
Progress Trend has three independent sibling Weight/Sleep/Water modules: shared title/icon/nearby History, one selected value and full date, factual chart, independent7/30/90(default30), then record actions. No duplicate Weight hero/body heading or Recovery outer group. `trendModule.ts` supplies anatomy/state, `modules.css` supplies shared rem semantic sizes, `trendInteraction.ts` supplies bounded rendered-coordinate hit handling and collision-safe sparse labels. Title1.0625rem, metric1.75rem, unit/body.9375rem, date/meta.8125rem, action.875rem; page1.5rem. Enlarge layout rather than shrink text. Targets44px, icon20px in32px shared surface, sparse chart8.5rem and ordinary11rem, internal horizontal scroll only.

Each module preserves its own range/valid selection/scroll through History and Calendar return. Range changes reset latest actual; deleting selected facts falls back latest. Real near-point/date-column touch allows modest drift, ignores distant exterior and native scroll/cancel; selection changes visible value/date/marker/locator and accessible text, including equal values. Keyboard arrows/Home/End/Enter/Space remain supported. Missing days split paths, never create zero. At1–3 real points compact charts may show collision-safe values; dense charts omit labels. Weight retains Chart.js; Weight History→查看全部趋势 retains year-old facts, own chart cleanup and unique canvas identity.

Weight and Water ordinary record actions always write Today, independently of inspected point. Shared saved-fact notification refreshes only its domain after a successful transaction; midnight/visibility refresh is owned and disposed. Sleep Start/Woke retain existing services/unique active session. Backfill creates one actual completed session with validated real start/end, duration/wake metadata and auto/manual captured night; never creates a fake active timer, changes an active sleep or fabricates stages. Invalid/future/inverted inputs retain draft and inline errors. Existing explicit history/date editing remains available.

Training Strength/Cardio/Kegel use peer headers with nearby History; no distant Strength history list. Dedicated Workout execution cards use the same primary lime treatment for their main action; geometry and interaction states remain shared across Strength, Cardio and Kegel. Preserve autosave, completion/retry/manual/unlock, absolute-time timer and full histories. Today and Reports reuse semantic sizing while preserving their different content and actions; report colors/Chart.js grid/axes read actual theme tokens.

Required gates retain746 previous unit tests and all28 browser suites, plus unifiedExperience units/browser and same-existing-profile preservation guard. Real screen-coordinate8th/9th touch, equal-valued dates, independent ranges, all-history, actual Today writes/backfill,65 display contexts(4width×4font×2theme×2motion plus landscape),38 scene originals/contact sheets/index/visual review and20 complete integrated cycles are required. Verify listener/Chart/RAF/timer/Sheet/focus/scroll-lock/data ownership. Keep DB11/IDB110/20stores, Backup11/Restore1–11, Sync/envelope1, AI/Voice/WaterReference1 and retiredVideo. Application CI/Pages→production targeted/exact assets/same synthetic hashes/offline→LATEST-only END→finalCI/identity/data/offline. Browser emulation is separate from physical Safari/original installed PWA/real-device continuity, which remain Pending without device evidence.
