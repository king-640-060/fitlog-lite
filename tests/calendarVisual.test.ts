import { describe, expect, it } from 'vitest'
import {
  getCalendarDayAccessibleLabel, getCalendarRecordCategories, getCalendarVisibleMarkers,
  type CalendarDaySummary,
} from '../src/ui/calendarPage'
import { icon } from '../src/ui/icons'

const empty: CalendarDaySummary = {
  date: '2026-09-24', foodLogCount: 0, hasWorkout: false, workoutCount: 0, setCount: 0,
  cardioCount: 0, cardioMinutes: 0, pelvicFloorSessionCount: 0, pelvicFloorContractions: 0, pelvicFloorSeconds: 0,
}

describe('calendar visual encoding', () => {
  it('identifies cardio as a stairs glyph and keeps the fixed category order', () => {
    expect(getCalendarRecordCategories({ ...empty, cardioCount: 1 })).toEqual(['cardio'])
    expect(icon('stairs', 14)).toContain('M3 20h5v-5h5v-5h5V5h3')
    const all = { ...empty, weightKg: 70, pelvicFloorSessionCount: 1, cardioCount: 1, hasWorkout: true, foodLogCount: 1 }
    expect(getCalendarRecordCategories(all)).toEqual(['food', 'strength', 'cardio', 'pelvic', 'weight'])
    expect(getCalendarVisibleMarkers(all)).toEqual({ visible: ['food', 'strength', 'cardio', 'pelvic'], hiddenCount: 1 })
  })

  it('keeps selected and today separate from record categories in the accessible label', () => {
    const summary = { ...empty, foodLogCount: 1, calories: 350, hasWorkout: true, workoutCount: 1, cardioCount: 1, cardioMinutes: 25 }
    const label = getCalendarDayAccessibleLabel(empty.date, summary, { selected: true, today: true })
    expect(label).toContain('已选中，今天')
    expect(label).toContain('有饮食、力量训练、有氧训练记录')
    expect(label).toContain('1 次有氧训练')
    expect(getCalendarDayAccessibleLabel(empty.date, undefined, { selected: true })).toContain('已选中，无记录')
    expect(getCalendarDayAccessibleLabel(empty.date, empty, { today: true })).toContain('今天，无记录')
  })
})
