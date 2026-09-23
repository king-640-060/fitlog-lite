import type { Food, FoodLog, MealType } from '../db/types'
import { db, type FitLogDatabase } from '../db/database'
import { createFoodLogSnapshot } from '../utils/nutrition'
import { isMealType } from '../utils/foodMeals'
import { finiteNumber, optionalNumber, requiredText } from '../utils/validation'

export type FoodInput = Pick<Food, 'name' | 'brand' | 'referenceGrams' | 'calories' | 'protein' | 'carbs' | 'fat'>

export function validateFoodInput(input: Partial<FoodInput>): FoodInput {
  const brand = String(input.brand ?? '').trim() || undefined
  return {
    name: requiredText(input.name, '食物名称'), brand,
    referenceGrams: finiteNumber(input.referenceGrams, '基准重量', 0.000001),
    calories: finiteNumber(input.calories, '热量', 0),
    protein: optionalNumber(input.protein, '蛋白质', 0),
    carbs: optionalNumber(input.carbs, '碳水', 0),
    fat: optionalNumber(input.fat, '脂肪', 0),
  }
}

export async function saveFood(input: Partial<FoodInput>, id?: string): Promise<Food> {
  const value = validateFoodInput(input)
  const now = new Date().toISOString()
  const existing = id ? await db.foods.get(id) : undefined
  const food: Food = { ...value, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
  await db.foods.put(food)
  return food
}

export async function logFood(food: Food, gramsValue: unknown, date: string, meal?: MealType, database: FitLogDatabase = db): Promise<FoodLog> {
  if (meal !== undefined && !isMealType(meal)) throw new Error('餐次不合法')
  const grams = finiteNumber(gramsValue, '克数', 0.000001)
  const log = createFoodLogSnapshot(food, grams, date, meal)
  await database.foodLogs.add(log)
  return log
}

export async function updateFoodLogDetails(id: string, gramsValue: unknown, meal?: MealType, database: FitLogDatabase = db): Promise<void> {
  if (meal !== undefined && !isMealType(meal)) throw new Error('餐次不合法')
  const log = await database.foodLogs.get(id)
  if (!log) throw new Error('找不到该饮食记录')
  const grams = finiteNumber(gramsValue, '克数', 0.000001)
  const ratio = grams / log.referenceGrams
  await database.foodLogs.update(id, {
    grams, meal,
    totalCalories: log.caloriesPerReference * ratio,
    totalProtein: log.proteinPerReference === undefined ? undefined : log.proteinPerReference * ratio,
    totalCarbs: log.carbsPerReference === undefined ? undefined : log.carbsPerReference * ratio,
    totalFat: log.fatPerReference === undefined ? undefined : log.fatPerReference * ratio,
    updatedAt: new Date().toISOString(),
  })
}
