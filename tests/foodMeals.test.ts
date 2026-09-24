import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { BackupDataV1, BackupDataV2, BackupDataV3, Food, FoodLog, MealType } from '../src/db/types'
import { exportBackup, restoreBackup } from '../src/services/backupService'
import { logFood, updateFoodLogDetails } from '../src/services/foodService'
import { groupFoodLogs } from '../src/utils/foodMeals'
import { createFoodLogSnapshot } from '../src/utils/nutrition'

const now = '2026-09-23T08:00:00.000Z'
const day = '2026-09-23'
const databases: FitLogDatabase[] = []

function newDatabase(name = `fitlog-meal-${crypto.randomUUID()}`): FitLogDatabase {
  const database = new FitLogDatabase(name)
  databases.push(database)
  return database
}

function food(): Food {
  return { id: 'food-1', name: '燕麦', referenceGrams: 100, calories: 380, protein: 13, carbs: 68, fat: 7, createdAt: now, updatedAt: now }
}

function log(meal?: MealType): FoodLog {
  return { ...createFoodLogSnapshot(food(), 100, day, meal), id: `log-${meal ?? 'old'}`, createdAt: '2026-09-23T22:59:00.000Z' }
}

function backup(version: 1 | 2 | 3): BackupDataV1 | BackupDataV2 | BackupDataV3 {
  const base: BackupDataV1 = {
    app: 'FitLog Lite', schemaVersion: 1, exportedAt: now,
    data: { foods: [food()], foodLogs: [log()], exercises: [], workouts: [], weights: [] },
  }
  if (version === 1) return base
  const v2: BackupDataV2 = { ...base, schemaVersion: 2, data: { ...base.data, workoutTemplates: [], dietTemplates: [] } }
  if (version === 2) return v2
  return { ...v2, schemaVersion: 3, data: { ...v2.data, nutritionTargets: [], pelvicFloorSessions: [] } }
}

afterEach(async () => {
  for (const database of databases.splice(0)) { database.close(); await database.delete() }
})

describe('FoodLog 餐次持久化与分组', () => {
  it.each(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[])('新增 %s 后读取仍保留餐次', async (meal) => {
    const database = newDatabase()
    const created = await logFood(food(), 50, day, meal, database)
    expect((await database.foodLogs.get(created.id))?.meal).toBe(meal)
  })

  it('编辑餐次及克数后重新读取保留，并允许改回未分类', async () => {
    const database = newDatabase()
    await database.foodLogs.add(log())
    await updateFoodLogDetails('log-old', 50, 'lunch', database)
    expect(await database.foodLogs.get('log-old')).toMatchObject({ meal: 'lunch', grams: 50, totalCalories: 190, foodName: '燕麦' })
    await updateFoodLogDetails('log-old', 50, undefined, database)
    expect((await database.foodLogs.get('log-old'))?.meal).toBeUndefined()
  })

  it('四餐正确分组，按 snapshot 求和，历史记录不根据 createdAt 猜测', () => {
    const records = [log('breakfast'), log('lunch'), log('dinner'), log('snack'), log()]
    const groups = groupFoodLogs(records)
    expect(groups.map((group) => group.name)).toEqual(['早餐', '午餐', '晚餐', '加餐', '未分类'])
    for (const group of groups) {
      expect(group.logs).toHaveLength(1)
      expect(group).toMatchObject({ calories: 380, protein: 13, carbs: 68, fat: 7 })
    }
    expect(groups[4]?.logs[0]?.meal).toBeUndefined()
    expect(groups[4]?.logs[0]?.createdAt).toContain('22:59')
    expect(groupFoodLogs(records.slice(0, 4))).toHaveLength(4)
  })

  it('删除记录后重新从 FoodLog 汇总，不保留冗余结果', async () => {
    const database = newDatabase()
    await database.foodLogs.bulkAdd([log('breakfast'), { ...log('breakfast'), id: 'second', totalCalories: 100, totalProtein: 2, totalCarbs: 3, totalFat: 4 }])
    const first = groupFoodLogs(await database.foodLogs.where('date').equals(day).toArray())[0]!
    expect(first).toMatchObject({ calories: 480, protein: 15, carbs: 71, fat: 11 })
    await database.foodLogs.delete('second')
    const after = groupFoodLogs(await database.foodLogs.where('date').equals(day).toArray())[0]!
    expect(after).toMatchObject({ calories: 380, protein: 13, carbs: 68, fat: 7 })
  })
})

describe('餐次迁移与 Backup V3 兼容', () => {
  it('Dexie V3 → V4 保留旧 FoodLog 全部数据且不伪造 meal', async () => {
    const name = `fitlog-v3-to-v4-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(3).stores({
      foods: 'id, name, brand, [name+brand], createdAt', foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt', workouts: 'id, date, finishedAt, createdAt', weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      nutritionTargets: 'id, &date, sourceTemplateId, createdAt', pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt',
    })
    await legacy.open()
    const historical = log()
    await legacy.table('foodLogs').add(historical)
    legacy.close()
    const database = newDatabase(name)
    await database.open()
    expect(database.verno).toBe(5)
    expect(await database.foodLogs.get(historical.id)).toEqual(historical)
    expect((await database.foodLogs.get(historical.id))?.meal).toBeUndefined()
  })

  it.each([1, 2, 3] as const)('旧 Backup V%s 缺少 meal 仍可恢复', async (version) => {
    const database = newDatabase()
    await restoreBackup(backup(version), database)
    expect((await database.foodLogs.get('log-old'))?.meal).toBeUndefined()
  })

  it('新 Backup V3 的 meal 完整 round-trip', async () => {
    const source = newDatabase()
    await source.foodLogs.add(log('dinner'))
    const exported = await exportBackup(source)
    expect(exported.schemaVersion).toBe(4)
    expect(exported.data.foodLogs[0]?.meal).toBe('dinner')
    const target = newDatabase()
    await restoreBackup(JSON.parse(JSON.stringify(exported)), target)
    expect((await target.foodLogs.get('log-dinner'))?.meal).toBe('dinner')
  })

  it.each(['breakfasts', '', null, 1])('非法 meal %s 在清库前被拒绝', async (invalid) => {
    const database = newDatabase()
    await database.foodLogs.add(log('breakfast'))
    const bad = backup(3) as BackupDataV3
    ;(bad.data.foodLogs[0] as unknown as Record<string, unknown>).meal = invalid
    await expect(restoreBackup(bad, database)).rejects.toThrow('meal')
    expect((await database.foodLogs.get('log-breakfast'))?.meal).toBe('breakfast')
  })
})
