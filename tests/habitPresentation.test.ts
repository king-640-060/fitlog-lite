import { describe, expect, it } from 'vitest'
import type { Habit } from '../src/db/types'
import { habitPlanText, habitTodaySummary } from '../src/ui/habitPresentation'

const habit = (fields: Partial<Habit> = {}): Habit => ({
  id: 'habit', name: '拉伸', active: true, sortOrder: 0,
  createdAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z', ...fields,
})

describe('习惯界面文案', () => {
  it('计划文案覆盖自由、计划日、周目标和组合', () => {
    expect(habitPlanText(habit())).toBe('自由打卡')
    expect(habitPlanText(habit({ weekdays: [1, 3, 5] }))).toBe('周一 · 周三 · 周五')
    expect(habitPlanText(habit({ targetPerWeek: 3 }))).toBe('周目标 3 次')
    expect(habitPlanText(habit({ weekdays: [2], targetPerWeek: 2 }))).toBe('周二 · 周目标 2 次')
  })

  it('Today 只陈述已打卡数量', () => {
    expect(habitTodaySummary(0)).toBe('今天还没有打卡')
    expect(habitTodaySummary(1)).toBe('今天已打卡 1 项')
    expect(habitTodaySummary(3)).toBe('今天已打卡 3 项')
  })
})
