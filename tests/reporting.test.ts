import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { loadReport } from '../src/services/reportService'
import type { CardioSession, FoodLog, Habit, HabitCheckIn, NutritionTarget, PelvicFloorSession, WeightLog, Workout } from '../src/db/types'
import { aggregateReport, getMonthRange, getWeekRange, monthWeekBuckets, reportPeriodDays, shiftReportPeriod, type ReportSource } from '../src/utils/reporting'
const stamp = '2026-09-20T08:00:00.000Z'
const source = (): ReportSource => ({ foodLogs: [], nutritionTargets: [], workouts: [], cardioSessions: [], pelvicFloorSessions: [], weights: [], habits: [], habitCheckIns: [] })
const habit = (id = 'h', createdAt = stamp, active = true): Habit => ({ id, name: id, active, sortOrder: 0, createdAt, updatedAt: createdAt })
const check = (habitId: string, date: string): HabitCheckIn => ({ id: `${habitId}-${date}`, habitId, date, completedAt: stamp, createdAt: stamp, updatedAt: stamp })
const food = (id: string, date: string, calories: number, protein?: number): FoodLog => ({ id, date, foodName: id, grams: 100, referenceGrams: 100, caloriesPerReference: calories, totalCalories: calories, ...(protein === undefined ? {} : { totalProtein: protein }), createdAt: stamp, updatedAt: stamp })
const weight = (date: string, kg: number): WeightLog => ({ id: date, date, weightKg: kg, createdAt: stamp, updatedAt: stamp })
const databases: FitLogDatabase[] = []
afterEach(async () => { for (const db of databases.splice(0)) { db.close(); await db.delete() } })

describe('报告本地日期范围', () => {
  it('周一开始、周日结束，跨月和跨年', () => {
    expect(getWeekRange('2026-09-27')).toEqual({ start: '2026-09-21', end: '2026-09-27' })
    expect(getWeekRange('2026-10-01')).toEqual({ start: '2026-09-28', end: '2026-10-04' })
    expect(getWeekRange('2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' })
  })
  it('二月、闰年、跨年月份平移', () => {
    expect(getMonthRange('2028-02-15')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(getMonthRange('2027-02-15').end).toBe('2027-02-28')
    expect(shiftReportPeriod('month', '2026-12-29', 1)).toBe('2027-01-01')
    expect(shiftReportPeriod('week', '2026-12-28', 1)).toBe('2027-01-04')
  })
  it('未来日期明确标记，月内自然周切成 4–6 段', () => {
    const days = reportPeriodDays(getWeekRange('2026-09-23'), '2026-09-23')
    expect(days.filter((day) => day.future)).toHaveLength(4)
    expect(monthWeekBuckets(getMonthRange('2026-09-15')).map((bucket) => [bucket.start, bucket.end])).toEqual([
      ['2026-09-01', '2026-09-06'], ['2026-09-07', '2026-09-13'], ['2026-09-14', '2026-09-20'], ['2026-09-21', '2026-09-27'], ['2026-09-28', '2026-09-30'],
    ])
  })
})

describe('报告只聚合实际记录', () => {
  it('食物先按日求和，计记录日；macro 缺失不是零，目标仅同日配对', () => {
    const data = source()
    data.foodLogs = [food('a', '2026-09-21', 100, 10), food('b', '2026-09-21', 200, 20), food('c', '2026-09-22', 500), food('d', '2026-09-23', 300, 30)]
    data.nutritionTargets = [{ id: 't', date: '2026-09-21', calories: 400, protein: 40, createdAt: stamp, updatedAt: stamp } as NutritionTarget]
    const result = aggregateReport(data, 'week', '2026-09-23', '2026-09-23')
    expect(result.summary.foodDays).toBe(3)
    expect(result.nutrition.calories).toMatchObject({ actual: 300, target: 400, matchedDays: 1, recordedDays: 3 })
    expect(result.nutrition.protein).toMatchObject({ actual: 30, target: 40, matchedDays: 1, recordedDays: 2 })
    expect(result.nutrition.carbs.actual).toBeUndefined()
    data.nutritionTargets = []
    expect(aggregateReport(data, 'week', '2026-09-23', '2026-09-23').nutrition.calories.actual).toBeCloseTo(1100 / 3)
  })
  it('训练按唯一日期计，力量组、有氧分钟和类型、凯格尔时长独立汇总', () => {
    const data = source()
    data.workouts = [{ id: 'w', date: '2026-09-21', exercises: [{ id: 'e', exerciseName: '深蹲', sets: [{ id: 's1', reps: 5 }, { id: 's2', reps: 5 }] }], startedAt: stamp, createdAt: stamp, updatedAt: stamp } as Workout]
    data.cardioSessions = [{ id: 'c1', date: '2026-09-21', durationMinutes: 25, speed: 6, createdAt: stamp, updatedAt: stamp }, { id: 'c2', date: '2026-09-22', activityType: 'treadmill', durationMinutes: 40, inclinePercent: 8, createdAt: stamp, updatedAt: stamp }] as CardioSession[]
    data.pelvicFloorSessions = [{ id: 'p', date: '2026-09-22', startedAt: '2026-09-22T08:00:00.000Z', finishedAt: '2026-09-22T08:03:00.000Z', phases: [{ type: 'contract', durationSeconds: 1 }], repetitions: 1, completedRepetitions: 1, createdAt: stamp, updatedAt: stamp }] as PelvicFloorSession[]
    const result = aggregateReport(data, 'week', '2026-09-23', '2026-09-23')
    expect(result.summary).toMatchObject({ trainingDays: 2, strengthSets: 2, cardioMinutes: 65, stairSessions: 1, treadmillSessions: 1, pelvicMinutes: 3 })
    expect(result.training[0]).toMatchObject({ strengthSets: 2, cardioMinutes: 25 })
    expect(result.training[1]).toMatchObject({ cardioMinutes: 40, pelvicMinutes: 3 })
  })
  it('体重 0/1/2 条语义，首末净变化，未来记录排除', () => {
    const data = source()
    expect(aggregateReport(data, 'week', '2026-09-23', '2026-09-23').weights).toHaveLength(0)
    data.weights = [weight('2026-09-21', 74.8)]
    expect(aggregateReport(data, 'week', '2026-09-23', '2026-09-23').weights).toHaveLength(1)
    data.weights.push(weight('2026-09-23', 74.3), weight('2026-09-25', 80))
    const result = aggregateReport(data, 'week', '2026-09-23', '2026-09-23')
    expect(result.weights.map((item) => item.weightKg)).toEqual([74.8, 74.3])
    expect(result.text).toContain('74.8 kg 变化到 74.3 kg')
  })
  it('自由习惯、周目标 3/5、停用历史和创建前历史正确', () => {
    const data = source()
    data.habits = [habit('free'), { ...habit('goal'), targetPerWeek: 5 }, habit('old-inactive', stamp, false), habit('new', '2026-10-01T08:00:00.000Z')]
    data.habitCheckIns = [check('free', '2026-09-21'), check('goal', '2026-09-21'), check('goal', '2026-09-22'), check('goal', '2026-09-23'), check('old-inactive', '2026-09-22'), check('goal', '2026-09-25')]
    const result = aggregateReport(data, 'week', '2026-09-23', '2026-09-23')
    expect(result.summary.habitCheckIns).toBe(5)
    expect(result.habits.map((item) => [item.habit.id, item.count])).toEqual([['free', 1], ['goal', 3], ['old-inactive', 1]])
    expect(result.habits[0]!.habit.targetPerWeek).toBeUndefined()
    expect(result.text).toContain('习惯共完成 5 次')
  })
  it('月内按周段统计，空期有明确状态', () => {
    const data = source(); data.habits = [habit('h')]; data.habitCheckIns = [check('h', '2026-09-01'), check('h', '2026-09-07'), check('h', '2026-09-09')]
    const result = aggregateReport(data, 'month', '2026-09-12', '2026-09-12')
    expect(result.buckets).toHaveLength(5)
    expect(result.habits[0]!.count).toBe(3)
    expect(aggregateReport(source(), 'week', '2026-09-23', '2026-09-23')).toMatchObject({ empty: true, text: '这段时间还没有记录。' })
  })
  it('Report Service 按所选日期索引读取，排除范围外与未来记录', async () => {
    const db = new FitLogDatabase(`report-${crypto.randomUUID()}`); databases.push(db)
    await db.foodLogs.bulkAdd([food('in', '2026-09-22', 250), food('outside', '2026-09-15', 900), food('future', '2026-09-25', 800)])
    const report = await loadReport('week', '2026-09-23', '2026-09-23', db)
    expect(report.summary.foodDays).toBe(1)
    expect(report.nutrition.calories.actual).toBe(250)
  })
})
