# FitLog Lite UI and Interaction Specification

Read this before changing UI or interaction code. This document holds durable product rules; current implementation and data semantics remain authoritative.

## Visual direction

The interface is entirely Chinese and iPhone first: 浅、柔、净、暖、绿、稳. Use warm white surfaces, plant green emphasis, quiet spacing, clear numbers, and restrained feedback. Standard units such as kg, g, kcal, cm, s, and min may remain Latin. Do not show Workout, Nutrition, Progress, Set, Reps, RPE, or RIR as UI labels.

Do not use human training illustrations, anatomical diagrams, food photography, large illustrations, large black areas, oppressive dark styling, esports styling, hard gym styling, 3D art, complex textures, large gradients, or persistent glow.

## Color and status

- Plant green is the main action and normal calorie/protein progress color; carbohydrates use warm yellow and fat uses soft orange.
- Muted coral indicates an amount over a goal or a destructive action. Preserve each nutrient's category color when it exceeds a goal; use coral only for the extra amount or outer ring.
- Say what happened: “高于目标 150 kcal”, “+12 g”, or “已达目标”. Do not label a recorded value “失败”, “超标”, or “不健康”.
- Destructive controls are visually quiet until the final confirmation. The final confirmation is distinctly dangerous and names the scope and irreversibility.

## Rings and numbers

- A goal ring represents 0–100% in its main track. If no goal is set, use a faint empty track and show “尚未设置目标”; do not imply 0% completion. A zero goal is not a denominator.
- At 100%, the main ring is full and text says “已达目标”. Above 100%, keep the main ring full, show a thinner coral outer ring capped at one revolution, and put the exact excess in text. Never wrap the main ring around to zero.
- Today's screen uses small rings; the Food screen may use a prominent calorie ring and three smaller nutrient rings. All ring values must be readable as text and exposed to assistive technology.
- Animate first appearance once: main ring about 500–650 ms, small rings about 400–550 ms. On data changes, progress and numbers may move over 250–350 ms without flashing or rebuilding the whole view. A first crossing of 100% may receive a single subtle 1.02 scale pulse.

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
