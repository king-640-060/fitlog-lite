import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { clearDayRecords } from '../src/services/dayRecordsService'
import { hasDayRecords, loadMonthSummaries } from '../src/ui/calendarPage'

const day = '2026-09-22'
const otherDay = '2026-09-23'
const now = '2026-09-22T08:00:00.000Z'
const databases: FitLogDatabase[] = []
const makeDatabase = () => {
  const database = new FitLogDatabase(`day-records-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close()
    await database.delete()
  }
})

async function seedDay(database: FitLogDatabase, date = day): Promise<void> {
  await database.foodLogs.add({ id: `food-${date}`, date, foodName: '无热量食物', grams: 1, referenceGrams: 1, caloriesPerReference: 0, totalCalories: 0, createdAt: now, updatedAt: now })
  await database.workouts.add({ id: `workout-${date}`, date, startedAt: now, exercises: [], createdAt: now, updatedAt: now })
  await database.pelvicFloorSessions.add({ id: `kegel-${date}`, date, startedAt: now, finishedAt: now, phases: [{ type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 }], repetitions: 1, completedRepetitions: 1, createdAt: now, updatedAt: now })
  await database.weights.add({ id: `weight-${date}`, date, weightKg: 72, createdAt: now, updatedAt: now })
  await database.nutritionTargets.add({ id: `target-${date}`, date, calories: 2200, createdAt: now, updatedAt: now })
}

describe('实际记录日语义', () => {
  it('仅营养目标不算记录日；零热量 FoodLog 仍算记录日', async () => {
    const database = makeDatabase()
    await database.nutritionTargets.add({ id: 'target', date: day, calories: 2200, createdAt: now, updatedAt: now })
    let summary = (await loadMonthSummaries(2026, 8, database)).get(day)
    expect(summary?.nutritionTarget?.calories).toBe(2200)
    expect(hasDayRecords(summary)).toBe(false)
    await database.foodLogs.add({ id: 'food', date: day, foodName: '零热量', grams: 1, referenceGrams: 1, caloriesPerReference: 0, totalCalories: 0, createdAt: now, updatedAt: now })
    summary = (await loadMonthSummaries(2026, 8, database)).get(day)
    expect(summary).toMatchObject({ foodLogCount: 1, calories: 0 })
    expect(hasDayRecords(summary)).toBe(true)
  })

  it.each(['workout', 'kegel', 'weight'] as const)('仅 %s 也算记录日', async (kind) => {
    const database = makeDatabase()
    if (kind === 'workout') await database.workouts.add({ id: 'workout', date: day, startedAt: now, exercises: [], createdAt: now, updatedAt: now })
    if (kind === 'kegel') await database.pelvicFloorSessions.add({ id: 'kegel', date: day, startedAt: now, finishedAt: now, phases: [{ type: 'contract', durationSeconds: 1 }], repetitions: 1, completedRepetitions: 0, createdAt: now, updatedAt: now })
    if (kind === 'weight') await database.weights.add({ id: 'weight', date: day, weightKg: 72, createdAt: now, updatedAt: now })
    expect(hasDayRecords((await loadMonthSummaries(2026, 8, database)).get(day))).toBe(true)
  })
})

describe('清空指定业务日期', () => {
  it('原子清空五类数据，其他日期与资料库、模板保持不变，并重新聚合', async () => {
    const database = makeDatabase()
    await seedDay(database)
    await seedDay(database, otherDay)
    await database.foods.add({ id: 'library-food', name: '米饭', referenceGrams: 100, calories: 116, createdAt: now, updatedAt: now })
    expect([...((await loadMonthSummaries(2026, 8, database)).values())].filter(hasDayRecords)).toHaveLength(2)
    await clearDayRecords(day, database)
    expect(await Promise.all([
      database.foodLogs.where('date').equals(day).count(), database.workouts.where('date').equals(day).count(),
      database.pelvicFloorSessions.where('date').equals(day).count(), database.weights.where('date').equals(day).count(),
      database.nutritionTargets.where('date').equals(day).count(),
    ])).toEqual([0, 0, 0, 0, 0])
    expect(await Promise.all([
      database.foodLogs.where('date').equals(otherDay).count(), database.workouts.where('date').equals(otherDay).count(),
      database.pelvicFloorSessions.where('date').equals(otherDay).count(), database.weights.where('date').equals(otherDay).count(),
      database.nutritionTargets.where('date').equals(otherDay).count(), database.foods.count(),
    ])).toEqual([1, 1, 1, 1, 1, 1])
    const summaries = await loadMonthSummaries(2026, 8, database)
    expect(summaries.has(day)).toBe(false)
    expect([...summaries.values()].filter(hasDayRecords)).toHaveLength(1)
    expect(summaries.get(otherDay)).toMatchObject({ foodLogCount: 1, workoutCount: 1, pelvicFloorSessionCount: 1, weightKg: 72 })
  })

  it('中途删除失败时五类数据全部回滚', async () => {
    const database = makeDatabase()
    await seedDay(database)
    database.weights.hook('deleting', () => { throw new Error('模拟体重删除失败') })
    await expect(clearDayRecords(day, database)).rejects.toThrow('模拟体重删除失败')
    expect(await Promise.all([
      database.foodLogs.count(), database.workouts.count(), database.pelvicFloorSessions.count(),
      database.weights.count(), database.nutritionTargets.count(),
    ])).toEqual([1, 1, 1, 1, 1])
  })
})
