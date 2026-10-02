import type { FitLogDatabase } from '../db/database'
import type { Food, FoodLog, NutritionTarget } from '../db/types'
import { completeNutrition, type NutritionCompletionPlan } from '../utils/nutritionCompletion'
import { AiError } from './security'

export function canonicalAiSource(value: unknown): string {
  const normalized = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalized)
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalized(child)]))
    return item
  }
  return JSON.stringify(normalized(value)) ?? 'undefined'
}
export async function nutritionPlanSource(database: FitLogDatabase, date: string) {
  const [foods, logs, target] = await Promise.all([database.foods.toArray(), database.foodLogs.where('date').equals(date).sortBy('id'), database.nutritionTargets.where('date').equals(date).first()])
  return { foods: foods.sort((a, b) => a.id.localeCompare(b.id)), logs, target }
}
export interface StoredAiNutritionPlan { id: string; date: string; plan: NutritionCompletionPlan; sourceFingerprint: string }
export class AiNutritionPlans {
  private plans = new Map<string, StoredAiNutritionPlan>()
  clear(): void { this.plans.clear() }
  get(id: string): StoredAiNutritionPlan {
    const plan = this.plans.get(id)
    if (!plan) throw new AiError('plan_expired', '这份营养方案已失效，请重新计算')
    return structuredClone(plan)
  }
  generate(date: string, source: { foods: Food[]; logs: FoodLog[]; target?: NutritionTarget }, allowedFoodIds?: string[], excludedFoodIds: string[] = []) {
    const ids = new Set(source.foods.map(food => food.id))
    if ([...(allowedFoodIds ?? []), ...excludedFoodIds].some(id => !ids.has(id))) throw new AiError('invalid_arguments', '食物偏好需要使用当前食物库中的 ID，请先搜索食物')
    const foods = allowedFoodIds ? source.foods.filter(food => allowedFoodIds.includes(food.id)) : source.foods
    const result = completeNutrition(source.target ?? {}, source.logs, foods, new Set(excludedFoodIds))
    const plans = result.plans.map(plan => {
      const id = crypto.randomUUID()
      this.plans.set(id, { id, date, plan: structuredClone(plan), sourceFingerprint: canonicalAiSource(source) })
      return { planId: id, ...plan }
    })
    while (this.plans.size > 24) this.plans.delete(this.plans.keys().next().value!)
    return { ...result, plans }
  }
}
