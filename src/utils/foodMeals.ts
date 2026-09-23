import type { FoodLog, MealType } from '../db/types'

export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const mealNames: Record<MealType, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
}

export function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && mealTypes.includes(value as MealType)
}

export interface FoodMealGroup {
  meal?: MealType
  name: string
  logs: FoodLog[]
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function groupFoodLogs(logs: FoodLog[]): FoodMealGroup[] {
  const groups: FoodMealGroup[] = mealTypes.map((meal) => ({
    meal, name: mealNames[meal], logs: [], calories: 0, protein: 0, carbs: 0, fat: 0,
  }))
  const unclassified: FoodMealGroup = { name: '未分类', logs: [], calories: 0, protein: 0, carbs: 0, fat: 0 }
  for (const log of logs) {
    const group = isMealType(log.meal) ? groups[mealTypes.indexOf(log.meal)]! : unclassified
    group.logs.push(log)
    group.calories += log.totalCalories
    group.protein += log.totalProtein ?? 0
    group.carbs += log.totalCarbs ?? 0
    group.fat += log.totalFat ?? 0
  }
  return unclassified.logs.length ? [...groups, unclassified] : groups
}
