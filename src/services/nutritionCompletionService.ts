import { db, type FitLogDatabase } from '../db/database'
import type { Food, FoodLog, MealType } from '../db/types'
import { logFood, validateFoodInput } from './foodService'
import { completionBounds, isFutureBusinessDate } from '../utils/nutritionCompletion'
import { getLocalDateString } from '../utils/date'
import { isMealType } from '../utils/foodMeals'

export async function readNutritionCompletionSource(date: string, database: FitLogDatabase = db) {
  return database.transaction('r', database.foods, database.foodLogs, database.nutritionTargets, async () => {
    const [foods, logs, target] = await Promise.all([database.foods.toArray(), database.foodLogs.where('date').equals(date).toArray(), database.nutritionTargets.where('date').equals(date).first()])
    return { foods, logs, target }
  })
}
export function nutritionCompletionSourceSignature(source: Awaited<ReturnType<typeof readNutritionCompletionSource>>): string {
  return JSON.stringify({ target: source.target, logs: [...source.logs].sort((a, b) => a.id.localeCompare(b.id)), foods: [...source.foods].sort((a, b) => a.id.localeCompare(b.id)) })
}
export interface CompletionSourceGuard { signature: string; allowedFoodIds?: readonly string[] }

export async function applyNutritionCompletionPlan(date: string, meal: MealType | undefined, items: readonly { food: Food; grams: number }[], database: FitLogDatabase = db, guard?: CompletionSourceGuard): Promise<FoodLog[]> {
  const parsed = new Date(`${date}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || getLocalDateString(parsed) !== date) throw new Error('记录日期不合法')
  if (isFutureBusinessDate(date)) throw new Error('未来日期仅可预览，请在实际吃下后记录')
  if (meal !== undefined && !isMealType(meal)) throw new Error('餐次不合法')
  if (!items.length || items.length > completionBounds.maxFoods || new Set(items.map((item) => item.food.id)).size !== items.length) throw new Error('方案食物不合法')
  if (items.reduce((sum, item) => sum + item.grams, 0) > completionBounds.maxTotalGrams) throw new Error('方案克数不合法')
  for (const item of items) {
    if (!Number.isFinite(item.grams) || item.grams <= 0 || item.grams > completionBounds.maxFoodGrams || item.grams % completionBounds.gramStep !== 0) throw new Error('方案克数不合法')
    validateFoodInput(item.food)
  }
  return database.transaction('rw', database.foodLogs, database.foods, database.nutritionTargets, async () => {
    if (guard) {
      const source = await readNutritionCompletionSource(date, database)
      if (nutritionCompletionSourceSignature(source) !== guard.signature) throw new Error('数据已变化，请重新计算建议。')
      if (guard.allowedFoodIds && (guard.allowedFoodIds.length > completionBounds.maxFoods || items.some(item => !guard.allowedFoodIds!.includes(item.food.id)))) throw new Error('方案包含未指定的食物，请重新计算。')
      if (items.some(item => !source.foods.some(food => food.id === item.food.id && JSON.stringify(food) === JSON.stringify(item.food)))) throw new Error('食物数据已变化，请重新计算建议。')
    }
    const logs: FoodLog[] = []
    for (const item of items) logs.push(await logFood(item.food, item.grams, date, meal, database))
    return logs
  })
}
