import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { Food } from '../src/db/types'
import { applyNutritionCompletionPlan } from '../src/services/nutritionCompletionService'
const databases: FitLogDatabase[] = []
const fresh = () => { const d = new FitLogDatabase(`completion-${crypto.randomUUID()}`); databases.push(d); return d }
const food = (id: string): Food => ({ id, name: id, referenceGrams: 50, calories: 100, protein: 10, carbs: 5, fat: 2, createdAt: '', updatedAt: '' })
afterEach(async () => { vi.restoreAllMocks(); for (const d of databases.splice(0)) { d.close(); await d.delete() } })
describe('补齐方案实际记录', () => {
  it('整套方案写为独立快照，保留日期餐次克数及独立热量', async () => {
    const d = fresh(), items = [{ food: food('a'), grams: 100 }, { food: food('b'), grams: 150 }, { food: food('c'), grams: 50 }]
    const logs = await applyNutritionCompletionPlan('2026-01-01', 'dinner', items, d)
    expect(await d.foodLogs.count()).toBe(3); expect(new Set(logs.map(l => l.id)).size).toBe(3)
    expect(logs.map(l => l.meal)).toEqual(['dinner', 'dinner', 'dinner']); expect(logs.every(l => l.date === '2026-01-01')).toBe(true)
    expect(logs.map(l => l.totalCalories)).toEqual([200, 300, 100]); expect(logs.map(l => l.totalProtein)).toEqual([20, 30, 10])
    items[0]!.food.calories = 999; expect((await d.foodLogs.get(logs[0]!.id))!.totalCalories).toBe(200)
  })
  it('未分类及缺失macro保持undefined，不修改目标', async () => {
    const d = fresh(), f = food('a'); delete f.fat
    const [log] = await applyNutritionCompletionPlan('2026-01-01', undefined, [{ food: f, grams: 50 }], d)
    expect(log!.meal).toBeUndefined(); expect(log!.totalFat).toBeUndefined(); expect(await d.nutritionTargets.count()).toBe(0)
  })
  it('第二条写入失败时第一条也回滚，已有记录保留', async () => {
    const d = fresh(); await applyNutritionCompletionPlan('2026-01-01', 'breakfast', [{ food: food('old'), grams: 50 }], d)
    const original = d.foodLogs.add.bind(d.foodLogs); let calls = 0
    vi.spyOn(d.foodLogs, 'add').mockImplementation(async (...args) => { if (++calls === 2) throw new Error('写入失败'); return original(...args) })
    await expect(applyNutritionCompletionPlan('2026-01-01', 'dinner', [{ food: food('a'), grams: 50 }, { food: food('b'), grams: 50 }], d)).rejects.toThrow('写入失败')
    expect(await d.foodLogs.count()).toBe(1)
  })
  it('服务层也拒绝未来日期，不仅依靠隐藏按钮', async () => {
    const d = fresh()
    await expect(applyNutritionCompletionPlan('9999-12-31', 'dinner', [{ food: food('a'), grams: 50 }], d)).rejects.toThrow('未来')
    expect(await d.foodLogs.count()).toBe(0)
  })
  it('拒绝非法日期、餐次、重复食物和不合法份量，均不留下记录', async () => {
    const d = fresh(), item = { food: food('a'), grams: 50 }
    for (const date of ['2026-02-30', 'bad']) await expect(applyNutritionCompletionPlan(date, undefined, [item], d)).rejects.toThrow()
    await expect(applyNutritionCompletionPlan('2026-01-01', 'bad' as never, [item], d)).rejects.toThrow()
    await expect(applyNutritionCompletionPlan('2026-01-01', undefined, [item, item], d)).rejects.toThrow()
    for (const grams of [0, -5, 7, 405, NaN]) await expect(applyNutritionCompletionPlan('2026-01-01', undefined, [{ ...item, grams }], d)).rejects.toThrow()
    expect(await d.foodLogs.count()).toBe(0)
  })
})
