# FitLog Lite UI and Interaction Specification

Read this before changing UI or interaction code. This document holds durable product rules; current implementation and data semantics remain authoritative.

## Visual direction

The interface is entirely Chinese and iPhone first: 浅、柔、净、暖、绿、稳. Use warm ivory surfaces, fresh leaf emphasis, quiet spacing, clear numbers, and restrained feedback. Standard units such as kg, g, kcal, cm, s, and min may remain Latin. Do not show Workout, Nutrition, Progress, Set, Reps, RPE, or RIR as UI labels.

Do not use human training illustrations, anatomical diagrams, food photography, large illustrations, large black areas, oppressive dark styling, esports styling, hard gym styling, 3D art, complex textures, large gradients, or persistent glow.

The shared page backdrop keeps the warm white base, restrained asymmetric glows, and extremely faint organic contour lines. Decoration is static, noninteractive, and lightweight; never place texture on cards, forms, charts, calendar surfaces, sheets, or controls, or reduce legibility. Avoid raster textures, animated decoration, blur filters, and repeating patterns.

## Color and status

- Use fresh yellow-green sparingly for primary actions and compact active marks, supported by deep green ink and muted sage surfaces. Bright accents never serve as body text; lime primary surfaces use dark ink, including hover and pressed states.
- Deep leaf green carries readable links, icons, and selected labels; muted sage and soft leaf surfaces carry secondary states. Calorie/protein rings use the darker accent-mid rather than bright lime. Keep text-action contrast at least 4.5:1 on page and card surfaces, and provide a distinct keyboard focus outline.
- Preserve semantic category colors: carbohydrate yellow, fat orange, danger/excess coral, cardio amber, pelvic olive, and weight blue-gray. Theme updates must not collapse meal, Calendar, or Report categories into one green.
- Muted coral indicates an amount over a goal or a destructive action. Preserve each nutrient's category color when it exceeds a goal; use coral only for the extra amount or outer ring.
- Say what happened: “高于目标 150 kcal”, “+12 g”, or “已达目标”. Do not label a recorded value “失败”, “超标”, or “不健康”.
- Destructive controls are visually quiet until the final confirmation. The final confirmation is distinctly dangerous and names the scope and irreversibility.

## Rings and numbers

- A goal ring represents 0–100% in its main track. If no goal is set, use a faint empty track and show “尚未设置目标”; do not imply 0% completion. A zero goal is not a denominator.
- At 100%, the main ring is full and text says “已达目标”. Above 100%, keep the main ring full, show a thinner coral outer ring capped at one revolution, and put the exact excess in text. Never wrap the main ring around to zero.
- Today's screen uses small rings; the Food screen may use a prominent calorie ring and three smaller nutrient rings. All ring values must be readable as text and exposed to assistive technology.
- Animate first appearance once: main ring about 500–650 ms, small rings about 400–550 ms. On data changes, progress and numbers may move over 250–350 ms without flashing or rebuilding the whole view. A first crossing of 100% may receive a single subtle 1.02 scale pulse.

## Today dashboard hierarchy

- Today's Food card is the primary dashboard card: a clear left-ring/right-number structure and compact, aligned nutrient tiles. An unset goal remains a gentle text prompt.
- Workout and Weight are secondary cards. Keep the Workout start action solid green but compact, and Weight entry soft green; neither empty state should reserve chart space or imply recorded data.
- Kegel is a shorter tertiary habit card with a lighter action. Preserve all existing routes and business meaning while varying visual weight.
- Habit is an independent data domain without a bottom tab. Users create their own habit definitions; schedules and weekly targets are optional guidance and never prevent a check-in on any day. Each active habit may be checked in once per device-local business date, with a second tap undoing that check-in. Today owns quick check-in and the global management entry owns habit management. Do not use streaks, badges, failure, or punitive missed-day language. Reports derive history from saved check-ins.
- Reports are derived from current business records when opened and are never persisted. Weekly periods use Monday through Sunday device-local dates; monthly periods aggregate by calendar weeks clipped to the month. Future dates in the current period are subdued and excluded from counts and averages. Weekly reports emphasize daily rhythm, while monthly reports emphasize weekly buckets and trend. Every chart has a visible text equivalent. Nutrition comparisons only pair actual values and targets from the same dates, and missing macro snapshots are unavailable rather than zero.
- Progress has exactly three first-level views: Trend for change over time, Calendar for factual history on a selected day, and Reports for weekly or monthly aggregation. There is no separate Overview view or daily report mode. Calendar contains month navigation, the month grid, and the category legend; its day detail sheet owns single-day review. Do not add period-level aggregate cards beneath the calendar grid.
- Compact Today activity cards follow domain → current status → metadata → primary action → secondary history or detail entry. Today Weight is titled “体重”, with trend as a secondary destination; its change compares today's record with the most recent earlier record. Today Weight and Kegel share header, status, metadata, and action alignment. The Kegel history remains available from its card header and training remains available after a completed session.
- Today Habit uses the same compact activity-card header, icon surface, status, and action grammar as Weight and Kegel. Its domain title is “习惯”; today's state belongs in the body. Active habits appear as one quiet checklist with accessible pressed states and a neutral count of completed check-ins. The empty card's “创建习惯” action opens the editor directly. Toggling a row updates only the Habit card.
- Habit Manager and Habit Editor are distinct sheet states with their own titles. The manager groups active and inactive habits, uses each row to open editing, and exposes move controls only in an explicit reorder mode. The editor groups basic information and optional planning controls, with a quiet return to the manager and saving as its only high-emphasis action. Seven accessible weekday choices use compact touch targets; unselected weekdays mean free check-in. The optional weekly target uses a compact row with a native picker. Schedules remain guidance and never block check-in.
- Plan is a first-level domain between Today and Food in the five-item bottom navigation. The former More destinations remain reachable through each topbar's “管理与设置” entry. Tasks represent intended actions; checking one off never creates a factual Food, Workout, Cardio, Weight, Kegel, or Habit record.
- A Task without a date belongs to Inbox. A dated Task without a start time is a day-level todo; a dated Task with a start time is a timed plan item. Completion is represented only by a reversible `completedAt` timestamp. Today shows a compact preview of at most four unfinished tasks; Plan owns the full Today, Upcoming, and Inbox workflows. Completed tasks remain reachable to undo.
- Task tags are fully user-created and may be combined on one Task. Stored tag names omit `#`; the interface displays `#name`. Typing `#` at a token boundary in a task title finds or creates tags, and an explicitly selected token is removed from the stored title. Preserve Chinese IME composition. Tags are filters and never fixed Work/Life/Shopping lists or folders.
- Plan's tag filter is contextual filtering, not a fourth navigation destination. It shares one context row with the current Today date, Upcoming context, or Inbox context. The default control says “标签”; reserve `#` for concrete tag names such as `#旅行`. An active filter can be changed or cleared independently.
- Plan empty states use a compact horizontal card: primary text column and trailing secondary action, never a tall hero. Default tag filtering is a quiet text control with a 44 px touch target and no persistent form-like box; selected tags may use a soft emphasis surface.
- The management hub separates reusable content and templates, personal management, data and backup, and application information. Food Library, Exercise Library, Workout Templates, and Diet Templates belong to content and templates; Habit management belongs to personal management. Operational actions such as starting Kegel training remain in their owning domain rather than management and settings.
- Tasks do not enter health Reports or the existing five-category Progress Calendar. Calendar clear-day leaves both Tasks and HabitCheckIns intact.

## Food day and meal hierarchy

- Food date navigation is controlled only through the top horizontal Date Rail. The Food body does not support horizontal date-swipe gestures. The rail uses native horizontal scrolling and center scroll snapping so iOS/browser momentum and deceleration remain native. The centered date is the selected device-local business date and exposes `aria-current="date"`; the center selection surface stays fixed as dates move beneath it. Keep a modest date window around the selection and recenter that window only near its edges or after a distant date-picker jump. Food content updates only after the rail settles, not continuously during scrolling, and never uses page-slide transitions. Tapping a date scrolls it to center through the same rail interaction. The date picker remains available for distant jumps. Preserve natural vertical scrolling, controls, modal interactions, and the iOS left-edge back gesture. The calorie and nutrient summary stays below the rail; Food library and tools remain reachable without crowding the first screen.
- The Food Date Rail reads as one continuous track with a soft fixed center lens, restrained touch-down and dragging feedback, and date labels whose size and opacity respond continuously to distance from the center. Schedule scroll-driven visual updates through `requestAnimationFrame`; only transform and opacity should change each frame. The browser remains responsible for momentum and scroll physics; do not simulate inertia or interrupt default scrolling. A date remains the committed business date, with `aria-current="date"`, until the rail settles. Keep the Food body horizontally static.
- When the selected Food business date differs from the device-local Today, show a quiet “回到今天” shortcut outside the scrolling Date Rail, regardless of the date's distance from Today. Hide it whenever Today is selected. Activating it directly rebuilds and recenters the rail around Today without a long date-by-date animation, and updates the date picker and Food content to Today. Any old rail settlement must not replace that selection.
- Food exposes “使用模板” and “食物库” as quiet top-level page actions. “选择日期”, “回到今天”, and the Date Rail form one date-navigation group; routine date and template actions do not use an overflow menu. “保存为模板” belongs to the selected day's meal heading and appears only when that day has recorded FoodLogs.
- Breakfast, lunch, dinner, and snack are the four persistent meal choices. Entry from a meal writes that exact choice. Historical FoodLogs without `meal` stay unclassified; never infer a meal from timestamps or the food name.
- Show “未分类” only when records actually lack a meal. Editing a record may explicitly assign or clear its meal. Recompute each meal's nutrients from its FoodLog snapshots, not stored subtotals.
- The four meal sections use light separators, compact empty guidance, and an expandable record list. Preserve editing and deletion for every FoodLog, including unclassified and long lists.

## Motion and performance

- Buttons press in about 100–140 ms; state changes take 150–220 ms; sheets take 220–280 ms; number counts take 300–500 ms. Keep motion finite, lightweight, and secondary to responsiveness.
- Use CSS, SVG, vanilla TypeScript, and the existing Chart.js. Do not add a large UI or animation framework. Avoid continuous layout measurement, redundant DOM rebuilding, and perpetual animation loops.
- Honor `prefers-reduced-motion: reduce`: render final ring and number values immediately and disable decorative motion. Timer phase, remaining time, and completion must stay understandable in text.
- Data correctness takes priority over animation. Never invent a trend from fewer than two weight points or infer a Workout set completion state from fields that do not encode one.

## Mobile interaction

- Preserve local business dates, iPhone Safe Area, and the five existing bottom tabs. Keep Safe Area separate from navigation body height; the tab bar should not jump during animation.
- Interactive targets should be approximately 44 × 44 px or larger. Inputs and textareas must use at least 16 px text to avoid focus zoom. Never disable user scaling.
- VisualViewport reports usable height and keyboard overlap. Let stable scroll containers and native focus scrolling position fields; avoid competing programmatic focus scrolling.
- Bottom Sheets have a stable header and their own scrollable content; keep confirmation controls reachable above the keyboard and Safe Area.
- Timers derive visual progress from their existing clock or state machine. Pause stops the visual state at the matching point, and resume continues from that point. Do not create an independent animation clock that can drift from the recorded state.

## Pelvic floor training

- Pelvic floor training uses a data-driven multi-phase timer. Each routine contains exercises, repetitions, optional sets, and ordered phases; the engine advances through that sequence.
- Routine selection presents one primary daily workout and four compact specialty workout buttons. A tap starts the named routine directly; do not use large radio-style option cards.
- Pelvic-floor daily training uses a three-stage progressive plan: Foundation → Standard → Advanced. The plan is a training structure, not a medical assessment or promise of results.
- Progression uses completed training days rather than elapsed calendar weeks. Count at most one naturally completed plan session per device-local business date; specialty routines, manually ended sessions, and legacy routine IDs do not advance the plan.
- Seven distinct Foundation dates unlock Standard; seven further distinct Standard dates unlock Advanced. Unlocking never forces advancement. The user may select any unlocked stage, including a previous stage.
- Session snapshots remain the source of truth for progress. An optional local preference may retain a stage selection until the next naturally completed plan session; it must not unlock a stage or rewrite history.
- Estimated workout duration is calculated from phases, repetitions, sets, and intervening rests in the routine data. Never duplicate it as a display-only duration constant.
- Keep the breathing and discomfort guidance available in a compact, expandable help area without crowding the primary training choices.
- Timer state derives from absolute deadlines. Delayed callbacks must catch up across phases, repetitions, sets, and exercises.
- `requestAnimationFrame` only renders visual progress and is never the source of time. The SVG ring, breathing scale, and text reflect the current timer state and `Date.now()`.
- Pause freezes the exact current phase position; resume continues from that position. Reduced Motion may remove breathing scale but must keep phase, remaining time, progress, and completion visible.
- Historical contract/relax-only sessions remain valid and must never be inferred into newer routine types. Display them as “基础训练”.

## Training categories and calendar

- Training has two primary categories: strength/anaerobic and cardio. Existing Workout records remain strength training; do not infer a new type for them.
- Strength training is a logging workflow for exercises, sets, weight, and repetitions, with optional notes. The strength editor does not show workout elapsed time, rest timers, or RPE inputs and values. Its summaries use exercise and set counts rather than elapsed duration.
- Retain Workout startedAt and finishedAt for lifecycle and historical compatibility, and preserve legacy WorkoutSet.rpe and WorkoutTemplateSet.rpe through editing, templates, Backup, and Restore without showing them in the UI. Real-time strength and rest timing are deferred to a future native/watch integration phase. Cardio's manually entered duration and pelvic-floor routine timing remain unchanged.
- Strength, cardio, and pelvic-floor sections share one visual hierarchy and alignment grid: consistent section labels, card padding, title and metadata spacing, and primary CTA height and shape. Their content may differ, but their primary actions should read as peers.
- Use tabular numerals for workout duration, speed, set and repetition counts, timer values, and numeric summaries where stable alignment improves readability. Do not apply a monospace face to the whole app.
- New cardio records explicitly choose stair climber or treadmill; older records without a type remain stair climber sessions. Stair climber requires duration and unitless speed. Treadmill requires duration and at least one of speed or incline; speed displays in km/h and incline as percent, with zero incline allowed. Do not estimate distance, energy, or training intensity from either metric. Calendar keeps one cardio category for both activities.
- Calendar visually separates the selected day, recorded category markers, and the category legend. Selection highlights the date number without creating an oversized empty highlighted cell; Today has its own small indicator, including when it is selected.
- Month cells use compact category icons rather than category text labels or detailed workout metrics. Keep day heights stable with or without records. Show at most four icons plus a small overflow count, always ordered food, strength, cardio, pelvic floor, weight. Recorded food calories may remain below the marker row; never put speed, duration, or set counts in a month cell.
- Calendar markers and legend share the same glyph and restrained semantic color for each category; label text keeps one secondary color. Cardio uses a stair/steps icon in both places rather than a text badge. Non-month dates and their markers stay subdued. Do not color an entire day cell by category.
- Each day cell's accessible label names its recorded categories and identifies selected and Today states; the selected date exposes `aria-selected="true"`. Legend icons may be hidden from assistive technology because their labels supply the meaning.
- Cardio type and recorded metrics appear in day detail and history, not in compact calendar cells. The day detail lists food, strength, cardio, pelvic floor, and weight information separately.
- Calendar day detail presents all five categories in one light grouped surface with subtle internal dividers. Each row uses the shared Calendar category icon and the same label → primary value or status → optional secondary detail structure and aligned columns. Empty states are 饮食/体重「未记录」and 无氧/有氧/凯格尔「未训练」; empty rows keep a compact, consistent height.
- Food logs and nutrition targets are separate states in day detail: an unlogged day remains 「未记录」 even when a goal exists, and the goal appears as secondary information. Strength shows sets and exercises; one cardio session shows activity type, recorded minutes, and its available metrics, while multiple sessions show count and total minutes; pelvic floor shows the saved routine and duration; weight shows that day's kilograms. Each row's accessible label names its category and full value.
- Day detail keeps three uniform soft quick-record actions under a 「快捷记录」label: 饮食, 训练, and 体重. The Training entry continues to provide strength, cardio, and pelvic-floor choices.
