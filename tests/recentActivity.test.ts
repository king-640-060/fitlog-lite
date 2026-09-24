import { describe, expect, it } from 'vitest'
import type { FoodLog, PelvicFloorSession, WeightLog, Workout } from '../src/db/types'
import { buildRecentActivity } from '../src/utils/recentActivity'

const timestamp = '2026-09-23T08:00:00.000Z'
const food = (id: string, date: string, calories: number): FoodLog => ({
  id, date, foodName: '米饭', grams: 100, referenceGrams: 100, caloriesPerReference: calories,
  totalCalories: calories, createdAt: timestamp, updatedAt: timestamp,
})
const workout: Workout = { id: 'workout', date: '2026-09-22', startedAt: timestamp, finishedAt: timestamp,
  exercises: [{ id: 'exercise', exerciseName: '深蹲', sets: [] }], createdAt: timestamp, updatedAt: timestamp }
const pelvic: PelvicFloorSession = { id: 'pelvic', date: '2026-09-21', startedAt: timestamp, finishedAt: timestamp,
  phases: [], repetitions: 1, completedRepetitions: 1, createdAt: timestamp, updatedAt: timestamp }
const weight: WeightLog = { id: 'weight', date: '2026-09-20', weightKg: 72.4, createdAt: timestamp, updatedAt: timestamp }

describe('最近活动', () => {
  it('空数据不生成活动', () => {
    expect(buildRecentActivity({ foodLogs: [], workouts: [], pelvicFloorSessions: [], weights: [] }, '2026-09-23')).toEqual([])
  })

  it('从四类真实记录生成、按业务日期排序，并按天汇总饮食', () => {
    const result = buildRecentActivity({ foodLogs: [food('a', '2026-09-23', 100), food('b', '2026-09-23', 200)], workouts: [workout], pelvicFloorSessions: [pelvic], weights: [weight] }, '2026-09-23')
    expect(result.map((item) => item.kind)).toEqual(['food', 'workout', 'pelvic', 'weight'])
    expect(result[0]).toMatchObject({ date: '2026-09-23', detail: '2 项 · 300 kcal' })
    expect(result[1]).toMatchObject({ kind: 'workout', detail: '1 个动作 · 0 组' })
  })

  it('不把未来记录或未完成训练展示为已完成活动', () => {
    const result = buildRecentActivity({ foodLogs: [food('future', '2026-09-24', 100)], workouts: [{ ...workout, finishedAt: undefined }], pelvicFloorSessions: [], weights: [] }, '2026-09-23')
    expect(result).toEqual([])
  })
})
