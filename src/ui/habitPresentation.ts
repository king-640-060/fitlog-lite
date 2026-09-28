import type { Habit } from '../db/types'

export const habitWeekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

export function habitPlanText(habit: Habit): string {
  const days = habit.weekdays?.map((day) => `周${habitWeekdayLabels[day - 1]}`).join(' · ')
  return [days, habit.targetPerWeek ? `周目标 ${habit.targetPerWeek} 次` : ''].filter(Boolean).join(' · ') || '自由打卡'
}

export function habitTodaySummary(count: number): string {
  return count ? `今天已打卡 ${count} 项` : '今天还没有打卡'
}
