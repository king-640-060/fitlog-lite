import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { FoodVisionWrite, logReviewedVisionFood, validateVisionIntake } from '../src/services/foodVisionImportService'
import { exportBackup, restoreBackup } from '../src/services/backupService'
const databases: FitLogDatabase[] = []
const setup = () => { const database = new FitLogDatabase(`vision-${crypto.randomUUID()}`); databases.push(database); return database }
const input = { name: '包装食品', referenceGrams: 30, calories: 1980 / 4.184, protein: 9.2, carbs: 20, fat: undefined }
const actual = { date: '2026-09-29', meal: 'dinner' as const, grams: 15 }
afterEach(async () => { vi.restoreAllMocks(); for (const database of databases.splice(0)) { database.close(); await database.delete() } })
describe('reviewed food packaging writes', () => {
  it('does not write before confirmation or after cancellation; confirms once even on simultaneous/repeated calls', async () => {
    const database = setup(), cancelled = new FoodVisionWrite(input, actual, database)
    expect(await database.foods.count()).toBe(0); expect(await database.foodLogs.count()).toBe(0)
    cancelled.cancel(); await expect(cancelled.confirm()).rejects.toThrow('取消')
    const write = new FoodVisionWrite(input, actual, database), mutable = { ...input }, preview = new FoodVisionWrite(mutable, undefined, database)
    mutable.calories = 999; expect(preview.food.calories).toBe(input.calories)
    const [a, b] = await Promise.all([write.confirm(), write.confirm()]); expect(a).toEqual(b); expect(await database.foods.count()).toBe(1); expect(await database.foodLogs.count()).toBe(1)
    await write.confirm(); expect(await database.foodLogs.count()).toBe(1)
    expect(a.log).toMatchObject({ date: actual.date, meal: 'dinner', grams: 15, referenceGrams: 30, caloriesPerReference: input.calories, totalCalories: input.calories / 2 })
    expect(a.log?.fatPerReference).toBeUndefined(); expect(a.log?.totalFat).toBeUndefined()
  })
  it('rolls back the newly saved Food when the actual FoodLog add fails', async () => {
    const database = setup(), write = new FoodVisionWrite(input, actual, database)
    vi.spyOn(database.foodLogs, 'add').mockRejectedValueOnce(new Error('write failed'))
    await expect(write.confirm()).rejects.toThrow('write failed'); expect(await database.foods.count()).toBe(0); expect(await database.foodLogs.count()).toBe(0)
    await write.confirm(); expect(await database.foods.count()).toBe(1); expect(await database.foodLogs.count()).toBe(1)
  })
  it('can save without a log, then record exact reviewed snapshots; rejects changed/deleted current sources', async () => {
    const database = setup(), { food } = await new FoodVisionWrite(input, undefined, database).confirm()
    expect(await database.foodLogs.count()).toBe(0)
    const log = await logReviewedVisionFood(food, actual, database)
    await database.foods.update(food.id, { calories: 999, name: '后来编辑' })
    await expect(logReviewedVisionFood(food, actual, database)).rejects.toThrow('修改')
    expect(await database.foodLogs.get(log.id)).toEqual(log)
    await database.foods.delete(food.id); await expect(logReviewedVisionFood(food, actual, database)).rejects.toThrow('删除')
    expect(await database.foodLogs.get(log.id)).toEqual(log)
  })
  it('rejects future/invalid dates and missing meal or grams without making a factual record', async () => {
    for (const item of [{ ...actual, date: '2026-02-30' }, { ...actual, date: '2099-01-01' }, { ...actual, meal: '' }, { ...actual, grams: 0 }, { ...actual, grams: NaN }]) expect(() => validateVisionIntake(item as typeof actual)).toThrow()
    const database = setup(); expect(() => new FoodVisionWrite(input, { ...actual, date: '2026-10-03' }, database, () => '2026-10-02')).toThrow('未来')
    expect(await database.foods.count()).toBe(0); expect(await database.foodLogs.count()).toBe(0)
  })
  it('exports only ordinary V7 Food/FoodLog values, retains all 14 stores and restores snapshots unchanged', async () => {
    const database = setup(); const result = await new FoodVisionWrite(input, actual, database).confirm()
    const backup = await exportBackup(database); expect(backup.schemaVersion).toBe(7); expect(database.verno).toBe(7); expect(Object.keys(backup.data)).toHaveLength(14)
    expect(JSON.stringify(backup)).not.toMatch(/data:image|evidence|food-label|visionCapability|apiKey|extraction/)
    const target = setup(); await restoreBackup(backup, target)
    expect(await target.foodLogs.get(result.log!.id)).toEqual(result.log); expect(await target.foods.get(result.food.id)).toEqual(result.food)
  })
})
