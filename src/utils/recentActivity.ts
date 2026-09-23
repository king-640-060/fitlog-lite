import type { FoodLog, PelvicFloorSession, WeightLog, Workout } from '../db/types'
import { formatNumber } from './nutrition'

export type RecentActivityKind = 'food' | 'workout' | 'pelvic' | 'weight'

export interface RecentActivity {
  id: string
  date: string
  kind: RecentActivityKind
  title: string
  detail: string
  timestamp: string
}

export function buildRecentActivity(
  records: { foodLogs: FoodLog[]; workouts: Workout[]; pelvicFloorSessions: PelvicFloorSession[]; weights: WeightLog[] },
  today: string,
  limit = 4,
): RecentActivity[] {
  const activities: RecentActivity[] = []
  const foodsByDate = new Map<string, { count: number; calories: number; timestamp: string }>()
  for (const log of records.foodLogs) {
    if (log.date > today) continue
    const daily = foodsByDate.get(log.date) ?? { count: 0, calories: 0, timestamp: log.createdAt }
    daily.count += 1
    daily.calories += log.totalCalories
    if (log.createdAt > daily.timestamp) daily.timestamp = log.createdAt
    foodsByDate.set(log.date, daily)
  }
  for (const [date, daily] of foodsByDate) activities.push({
    id: `food-${date}`, date, kind: 'food', title: '饮食记录',
    detail: `${daily.count} 项 · ${formatNumber(daily.calories)} kcal`, timestamp: daily.timestamp,
  })
  for (const workout of records.workouts) {
    if (workout.date > today || !workout.finishedAt) continue
    activities.push({ id: workout.id, date: workout.date, kind: 'workout', title: '完成力量训练',
      detail: `${workout.exercises.length} 个动作`, timestamp: workout.finishedAt })
  }
  const pelvicByDate = new Map<string, { count: number; timestamp: string }>()
  for (const session of records.pelvicFloorSessions) {
    if (session.date > today) continue
    const daily = pelvicByDate.get(session.date) ?? { count: 0, timestamp: session.finishedAt }
    daily.count += 1
    if (session.finishedAt > daily.timestamp) daily.timestamp = session.finishedAt
    pelvicByDate.set(session.date, daily)
  }
  for (const [date, daily] of pelvicByDate) activities.push({
    id: `pelvic-${date}`, date, kind: 'pelvic', title: '凯格尔训练',
    detail: `${daily.count} 次完成`, timestamp: daily.timestamp,
  })
  for (const weight of records.weights) {
    if (weight.date > today) continue
    activities.push({ id: weight.id, date: weight.date, kind: 'weight', title: '记录体重',
      detail: `${formatNumber(weight.weightKg)} kg`, timestamp: weight.updatedAt })
  }
  return activities.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id)).slice(0, limit)
}
