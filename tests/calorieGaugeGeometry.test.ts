import { describe, expect, it } from 'vitest'
import { calorieArc, CALORIE_ARC_SPAN, CALORIE_RADIUS, CALORIE_OUTER_RADIUS } from '../src/ui/calorieGaugeGeometry'
import { getGoalProgress } from '../src/ui/progressRing'

describe('open calorie gauge presentation', () => {
  it('has an 80-degree symmetric bottom gap and a true clockwise SVG arc', () => {
    expect(CALORIE_ARC_SPAN).toBe(280)
    for (const radius of [CALORIE_RADIUS, CALORIE_OUTER_RADIUS]) {
      const arc = calorieArc(radius)
      expect(arc.length).toBeCloseTo(2 * Math.PI * radius * 280 / 360)
      const values = arc.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      const [x1, y1] = values, [x2, y2] = values.slice(-2)
      expect(x1! + x2!).toBeCloseTo(120)
      expect(y1).toBe(y2); expect(y1).toBeGreaterThan(60)
      expect(arc.path).toContain(`A ${radius} ${radius} 0 1 1`)
      expect(Math.hypot(x1! - 60, y1! - 60)).toBeCloseTo(radius, 3)
    }
  })
  it('maps existing goal fractions to the available arc without wrapping', () => {
    const length = calorieArc(CALORIE_RADIUS).length
    for (const fraction of [0, .01, .65, .99, 1, 1.2, 2.5]) {
      const progress = getGoalProgress(fraction * 2000, 2000)
      expect(length * (1 - progress.main)).toBeCloseTo(length * (1 - Math.min(fraction, 1)))
      expect(progress.outer).toBeCloseTo(Math.min(Math.max(fraction - 1, 0), 1))
    }
    expect(getGoalProgress(1259).state).toBe('unset')
    expect(getGoalProgress(0, 0).state).toBe('zero')
    expect(getGoalProgress(20, 0)).toMatchObject({ state: 'above', main: 1, outer: 1, excess: 20 })
  })
})
