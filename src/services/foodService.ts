import type { Food, FoodLog, MealType } from '../db/types'
import { db, type FitLogDatabase } from '../db/database'
import { createFoodLogSnapshot } from '../utils/nutrition'
import { isMealType } from '../utils/foodMeals'
import { finiteNumber, optionalNumber, requiredText } from '../utils/validation'
import { getLocalDateString } from '../utils/date'

export type FoodInput = Pick<Food, 'name' | 'brand' | 'referenceGrams' | 'servingGrams' | 'calories' | 'protein' | 'carbs' | 'fat'>

export function validateFoodInput(input: Partial<FoodInput>): FoodInput {
  const brand = String(input.brand ?? '').trim() || undefined
  return {
    name: requiredText(input.name, '食物名称'), brand,
    referenceGrams: finiteNumber(input.referenceGrams, '基准重量', 0.000001),
    servingGrams: optionalNumber(input.servingGrams, '每份克数', Number.MIN_VALUE),
    calories: finiteNumber(input.calories, '热量', 0),
    protein: optionalNumber(input.protein, '蛋白质', 0),
    carbs: optionalNumber(input.carbs, '碳水', 0),
    fat: optionalNumber(input.fat, '脂肪', 0),
  }
}

export async function deleteFoodLog(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.foodLogs.delete(id)
}

/** Undefined meal means only unclassified records. The preview IDs guard concurrent changes. */
export async function deleteFoodLogsForMeal(date: string, meal?: MealType, database: FitLogDatabase = db, expectedIds?: readonly string[]): Promise<number> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || getLocalDateString(new Date(`${date}T12:00:00`)) !== date) throw new Error('日期不合法')
  if (meal !== undefined && !isMealType(meal)) throw new Error('餐次不合法')
  return database.transaction('rw', database.foodLogs, async () => {
    const records = (await database.foodLogs.where('date').equals(date).toArray()).filter(log => meal === undefined ? !isMealType(log.meal) : log.meal === meal)
    const ids = records.map(log => log.id).sort()
    if (expectedIds && JSON.stringify(ids) !== JSON.stringify([...expectedIds].sort())) throw new Error('本餐记录已变化，请重新查看后清空')
    await database.foodLogs.bulkDelete(ids)
    return ids.length
  })
}

export async function saveFood(input: Partial<FoodInput>, id?: string, database: FitLogDatabase = db): Promise<Food> {
  const value = validateFoodInput(input)
  const now = new Date().toISOString()
  const existing = id ? await database.foods.get(id) : undefined
  const food: Food = { ...value, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
  await database.foods.put(food)
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
