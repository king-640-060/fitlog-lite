// SVG presentation only; goal/progress semantics remain in progressRing.ts.
export const CALORIE_ARC_SPAN = 280
export const CALORIE_RADIUS = 46
export const CALORIE_OUTER_RADIUS = 55

export function calorieArc(radius: number): { path: string; length: number } {
  const start = (90 + (360 - CALORIE_ARC_SPAN) / 2) * Math.PI / 180
  const end = start + CALORIE_ARC_SPAN * Math.PI / 180
  const point = (angle: number) => `${(60 + radius * Math.cos(angle)).toFixed(4)} ${(60 + radius * Math.sin(angle)).toFixed(4)}`
  return { path: `M ${point(start)} A ${radius} ${radius} 0 1 1 ${point(end)}`, length: radius * CALORIE_ARC_SPAN * Math.PI / 180 }
}
