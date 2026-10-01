import { describe, expect, it } from 'vitest'
import type { Food, NutritionGoal } from '../src/db/types'
import { completeNutrition, completionBounds, getNutritionCompletionSummary, isFutureBusinessDate } from '../src/utils/nutritionCompletion'
import { createFoodLogSnapshot } from '../src/utils/nutrition'
const food = (id: string, calories: number, protein: number | undefined = 0, carbs: number | undefined = 0, fat: number | undefined = 0): Food => ({ id, name: id, referenceGrams: 100, calories, protein, carbs, fat, createdAt: '', updatedAt: '' })
const solve = (target: NutritionGoal, foods: Food[]) => completeNutrition(target, [], foods)
const lean = food('lean', 100, 20), rice = food('rice', 120, 0, 30), oil = food('oil', 900, 0, 0, 100)

describe('本地确定性营养补齐', () => {
  it('单食物接近目标，热量独立于宏量计算，支持非100g基准', () => {
    const f = { ...food('single', 150, 10), referenceGrams: 50 }
    const plan = solve({ calories: 300, protein: 20 }, [f]).plans[0]!
    expect(plan.items[0]!.grams).toBe(100); expect(plan.added.calories).toBe(300); expect(plan.closeEnough).toBe(true)
  })
  it('两种互补食物优于单种', () => {
    const target = { protein: 40, carbs: 60 }
    expect(solve(target, [lean]).plans[0]!.closeEnough).toBe(false)
    const plan = solve(target, [lean, rice]).plans[0]!
    expect(plan.items).toHaveLength(2); expect(plan.closeEnough).toBe(true)
  })
  it('三种互补食物可组合，所有输出遵守份量边界', () => {
    const result = solve({ protein: 40, carbs: 60, fat: 10 }, [lean, rice, oil])
    expect(result.plans[0]!.items).toHaveLength(3); expect(result.plans[0]!.closeEnough).toBe(true)
    for (const plan of result.plans) {
      expect(plan.items.length).toBeLessThanOrEqual(4)
      expect(plan.items.reduce((s, item) => s + item.grams, 0)).toBeLessThanOrEqual(800)
      for (const item of plan.items) { expect(item.grams).toBeGreaterThan(0); expect(item.grams % 5).toBe(0); expect(item.grams).toBeLessThanOrEqual(400) }
      expect(Object.values(plan.added).filter(v => v !== undefined).every(Number.isFinite)).toBe(true)
    }
  })
  it('重复运行及食物库顺序变化得到完全相同结果', () => {
    const target = { calories: 750, protein: 75, carbs: 60, fat: 23 }, foods = [lean, rice, oil, food('yogurt', 90, 8, 5, 3)]
    const a = solve(target, foods)
    expect(solve(target, foods)).toEqual(a); expect(solve(target, [...foods].reverse())).toEqual(a)
  })
  it('实际摄入只取历史快照，不受当前食物库修改影响', () => {
    const original = food('original', 100, 20, 10, 4), log = createFoodLogSnapshot(original, 100, '2026-09-01')
    original.calories = 500; original.protein = 99
    expect(getNutritionCompletionSummary({ calories: 300, protein: 50 }, [log])).toMatchObject({ actual: { calories: 100, protein: 20 }, gap: { calories: 200, protein: 30 } })
  })
  it('脂肪已超时明显偏向低脂蛋白质，不丢弃已超维度', () => {
    const log = createFoodLogSnapshot(food('past', 200, 20, 0, 30), 100, '2026-09-01')
    const result = completeNutrition({ protein: 60, fat: 20 }, [log], [food('high-fat', 300, 20, 0, 20), lean])
    expect(result.gap.fat).toBe(-10); expect(result.activeKeys).toContain('fat')
    expect(result.plans[0]!.items.map(i => i.food.id)).toEqual(['lean']); expect(result.plans[0]!.added.fat).toBe(0)
  })
  it('缺失active macro的食物被排除，显式零仍有效', () => {
    const missing = food('missing', 100, 30); delete missing.fat
    const result = solve({ protein: 40, fat: 10 }, [missing, lean, oil])
    expect(result.excludedFoodCount).toBe(1); expect(result.plans.every(p => p.items.every(i => i.food.id !== 'missing'))).toBe(true)
  })
  it('任一FoodLog缺失macro使该维度未知，其他目标继续计算', () => {
    const f = food('unknown', 100, 10); delete f.fat
    const log = createFoodLogSnapshot(f, 100, '2026-09-01')
    const result = completeNutrition({ protein: 40, fat: 20 }, [log], [lean])
    expect(result.uncertainKeys).toEqual(['fat']); expect(result.activeKeys).toEqual(['protein'])
    expect(result.actual.fat).toBeUndefined(); expect(result.gap.fat).toBeUndefined(); expect(result.plans[0]!.projected.fat).toBeUndefined()
  })
  it('部分目标允许候选缺失未参与优化的macro，补充量仍标未知', () => {
    const f = food('partial', 100, 20); delete f.carbs; delete f.fat
    const r = solve({ calories: 200, protein: 40 }, [f])
    expect(r.excludedFoodCount).toBe(0); expect(r.plans[0]!.closeEnough).toBe(true); expect(r.plans[0]!.added.fat).toBeUndefined()
  })
  it('无记录时完整目标从零开始，不把空日视为未知', () => {
    const r = getNutritionCompletionSummary({ calories: 500, fat: 20 }, [])
    expect(r.actual.fat).toBe(0); expect(r.gap.fat).toBe(20); expect(r.uncertainKeys).toEqual([])
  })
  it('全部达到或超过时不推荐；零目标不产生Infinity', () => {
    const log = createFoodLogSnapshot(food('past', 100, 20), 100, '2026-09-01')
    const r = completeNutrition({ calories: 100, protein: 10, fat: 0 }, [log], [lean])
    expect(r.nothingToComplete).toBe(true); expect(r.plans).toEqual([])
    expect(solve({ calories: 0 }, [lean]).plans).toEqual([])
  })
  it('未知目标不会被宣称已补齐，只有可确定维度参与', () => {
    const f = food('missing', 100); delete f.protein
    const r = completeNutrition({ protein: 40 }, [createFoodLogSnapshot(f, 100, '2026-09-01')], [lean])
    expect(r.uncertainKeys).toEqual(['protein']); expect(r.activeKeys).toEqual([]); expect(r.plans).toEqual([])
  })
  it('不可能同时满足时提供单食物近似方案', () => {
    const r = solve({ calories: 250, protein: 60, carbs: 40, fat: 10 }, [lean])
    expect(r.plans).toHaveLength(1); expect(r.plans[0]!.closeEnough).toBe(false)
  })
  it('不同方案使用不同食物组合，不用5g微调凑三套', () => {
    const r = solve({ calories: 200 }, [food('a', 100), food('b', 100), food('c', 100)])
    expect(r.plans).toHaveLength(3)
    expect(new Set(r.plans.map(p => p.items.map(i => i.food.id).sort().join(','))).size).toBe(3)
  })
  it('空库及完全不完整的库返回友好空结果；可预留排除食物', () => {
    expect(solve({ calories: 200 }, []).plans).toEqual([])
    expect(completeNutrition({ protein: 40 }, [], [lean], new Set(['lean'])).plans).toEqual([])
  })
  it('无效数值不进入方案，非法目标被拒绝', () => {
    expect(solve({ calories: 200 }, [food('nan', NaN), { ...lean, referenceGrams: 0 }]).plans).toEqual([])
    expect(() => solve({ calories: Infinity }, [lean])).toThrow()
    expect(solve({ calories: 200, fat: 0 }, [lean]).plans.every(p => Object.values(p.difference).every(Number.isFinite))).toBe(true)
  })
  it('100项库有固定搜索界限，不枚举全库组合', () => {
    const foods = Array.from({ length: 100 }, (_, i) => food(`f-${String(i).padStart(3, '0')}`, 90 + i, 10 + i % 20, 5, 2))
    const r = solve({ calories: 750, protein: 70, carbs: 40, fat: 20 }, foods)
    expect(r.plans.length).toBeGreaterThan(0); expect(r.plans.length).toBeLessThanOrEqual(3)
    expect(completionBounds.candidateLimit).toBe(12); expect(completionBounds.maxTotalGrams / completionBounds.gramStep).toBe(160)
  })
  it('本地日期区分过去、今天、未来，可跨年', () => {
    expect(isFutureBusinessDate('2026-12-31', '2026-12-31')).toBe(false)
    expect(isFutureBusinessDate('2026-12-30', '2026-12-31')).toBe(false)
    expect(isFutureBusinessDate('2027-01-01', '2026-12-31')).toBe(true)
  })
})
