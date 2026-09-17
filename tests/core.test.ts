import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { Food, Workout } from '../src/db/types'
import { validateBackup } from '../src/services/backupService'
import { buildImportPreview, parseFoodCsv } from '../src/services/importService'
import { upsertWeight } from '../src/services/weightService'
import { getMonthGridDays, loadMonthSummaries } from '../src/ui/calendarPage'
import { getLocalDateString } from '../src/utils/date'
import { calculateNutrition, createFoodLogSnapshot } from '../src/utils/nutrition'

const databases: FitLogDatabase[] = []
const newDatabase = (): FitLogDatabase => {
  const database = new FitLogDatabase(`fitlog-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close()
    await database.delete()
  }
})

describe('日期', () => {
  it('通过本地年月日生成业务日期，不经过 UTC', () => {
    const localMidnight = new Date(2026, 8, 16, 0, 5)
    expect(getLocalDateString(localMidnight)).toBe('2026-09-16')
  })

  it('生成周一开始的固定 6 周月历网格', () => {
    const days = getMonthGridDays(2026, 8)
    expect(days).toHaveLength(42)
    expect(days[0]).toMatchObject({ date: '2026-08-31', isCurrentMonth: false })
    expect(days[1]).toMatchObject({ date: '2026-09-01', isCurrentMonth: true })
    expect(days.at(-1)).toMatchObject({ date: '2026-10-11', isCurrentMonth: false })
  })

  it('按月聚合饮食、训练和体重摘要', async () => {
    const database = newDatabase()
    const now = new Date().toISOString()
    await database.foodLogs.bulkAdd([
      { id: 'log-1', date: '2026-09-16', foodName: '鸡胸肉', grams: 100, referenceGrams: 100, caloriesPerReference: 165, totalCalories: 165, createdAt: now, updatedAt: now },
      { id: 'log-2', date: '2026-09-16', foodName: '米饭', grams: 200, referenceGrams: 100, caloriesPerReference: 116, totalCalories: 232, createdAt: now, updatedAt: now },
    ])
    await database.workouts.add({ id: 'workout-calendar', date: '2026-09-16', startedAt: now, finishedAt: now, exercises: [{ id: 'entry-calendar', exerciseName: '杠铃卧推', sets: [{ id: 'set-1', weightKg: 80, reps: 10 }, { id: 'set-2', weightKg: 80, reps: 9 }] }], createdAt: now, updatedAt: now })
    await upsertWeight('2026-09-16', 72.4, database)

    expect((await loadMonthSummaries(2026, 8, database)).get('2026-09-16')).toMatchObject({ calories: 397, hasWorkout: true, workoutCount: 1, setCount: 2, weightKg: 72.4 })
  })
})

describe('营养计算', () => {
  it('计算饮食热量', () => {
    expect(calculateNutrition({ referenceGrams: 100, calories: 165 }, 230).calories).toBeCloseTo(379.5)
  })

  it('正确处理非 100 克基准', () => {
    expect(calculateNutrition({ referenceGrams: 50, calories: 220 }, 75).calories).toBeCloseTo(330)
  })

  it('计算三大营养素', () => {
    const totals = calculateNutrition({ referenceGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 }, 230)
    expect(totals.calories).toBeCloseTo(379.5)
    expect(totals.protein).toBeCloseTo(71.3)
    expect(totals.carbs).toBe(0)
    expect(totals.fat).toBeCloseTo(8.28)
  })
})

describe('食物导入', () => {
  it('映射中文 CSV header', () => {
    const rows = parseFoodCsv('名称,品牌,基准克数,热量,蛋白质,碳水,脂肪\n鸡胸肉,,100,165,31,0,3.6').rows
    const preview = buildImportPreview(rows, [])
    expect(preview.valid[0]).toMatchObject({ name: '鸡胸肉', referenceGrams: 100, calories: 165, protein: 31 })
  })

  it('映射英文 CSV header', () => {
    const rows = parseFoodCsv('name,brand,reference_g,calories,protein,carbs,fat\nrice,,100,116,2.6,25.9,0.3').rows
    expect(buildImportPreview(rows, []).valid[0]).toMatchObject({ name: 'rice', calories: 116, carbs: 25.9 })
  })

  it('reference_g 为空时默认 100', () => {
    const rows = parseFoodCsv('name,calories\nrice,116').rows
    expect(buildImportPreview(rows, []).valid[0]?.referenceGrams).toBe(100)
  })

  it('拒绝非法 calories', () => {
    const rows = parseFoodCsv('name,calories\nrice,abc').rows
    const preview = buildImportPreview(rows, [])
    expect(preview.valid).toHaveLength(0)
    expect(preview.errors[0]?.reason).toContain('热量')
  })
})

describe('体重', () => {
  it('同一天只保留一条记录', async () => {
    const database = newDatabase()
    await upsertWeight('2026-09-16', 72.4, database)
    await upsertWeight('2026-09-16', 72.1, database)
    expect(await database.weights.count()).toBe(1)
    expect((await database.weights.where('date').equals('2026-09-16').first())?.weightKg).toBe(72.1)
  })
})

describe('备份', () => {
  it('验证备份 schema', () => {
    const backup = { app: 'FitLog Lite', schemaVersion: 1, exportedAt: new Date().toISOString(), data: { foods: [], foodLogs: [], exercises: [], workouts: [], weights: [] } }
    expect(validateBackup(backup)).toEqual(backup)
    expect(() => validateBackup({ ...backup, schemaVersion: 2 })).toThrow()
  })
})

describe('历史快照', () => {
  it('Food 修改后旧 FoodLog 不变', () => {
    const now = new Date().toISOString()
    const food: Food = { id: 'food-1', name: '鸡胸肉', referenceGrams: 100, calories: 165, protein: 31, createdAt: now, updatedAt: now }
    const snapshot = createFoodLogSnapshot(food, 230, '2026-09-16')
    food.calories = 200
    food.name = '新名称'
    expect(snapshot.foodName).toBe('鸡胸肉')
    expect(snapshot.totalCalories).toBeCloseTo(379.5)
  })

  it('Exercise 修改后旧 Workout 名称不变', async () => {
    const database = newDatabase()
    const now = new Date().toISOString()
    await database.exercises.add({ id: 'exercise-1', name: '杠铃卧推', createdAt: now, updatedAt: now })
    const workout: Workout = { id: 'workout-1', date: '2026-09-16', startedAt: now, finishedAt: now, exercises: [{ id: 'entry-1', exerciseId: 'exercise-1', exerciseName: '杠铃卧推', sets: [] }], createdAt: now, updatedAt: now }
    await database.workouts.add(workout)
    await database.exercises.update('exercise-1', { name: '卧推（新名称）' })
    expect((await database.workouts.get('workout-1'))?.exercises[0]?.exerciseName).toBe('杠铃卧推')
  })
})
