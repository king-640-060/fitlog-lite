import type { Food, FoodLog, MealType } from '../db/types'

export interface NutritionTotals {
  calories: number
  protein?: number
  carbs?: number
  fat?: number
}

const multiply = (value: number | undefined, ratio: number): number | undefined =>
  value === undefined ? undefined : value * ratio

export function calculateNutrition(food: Pick<Food, 'referenceGrams' | 'calories' | 'protein' | 'carbs' | 'fat'>, grams: number): NutritionTotals {
  const ratio = grams / food.referenceGrams
  return {
    calories: food.calories * ratio,
    protein: multiply(food.protein, ratio),
    carbs: multiply(food.carbs, ratio),
    fat: multiply(food.fat, ratio),
  }
}

export function createFoodLogSnapshot(food: Food, grams: number, date: string, meal?: MealType): FoodLog {
  const now = new Date().toISOString()
  const totals = calculateNutrition(food, grams)
  return {
    id: crypto.randomUUID(), date, ...(meal ? { meal } : {}), foodId: food.id, foodName: food.name, brand: food.brand,
    grams, referenceGrams: food.referenceGrams, caloriesPerReference: food.calories,
    proteinPerReference: food.protein, carbsPerReference: food.carbs, fatPerReference: food.fat,
    totalCalories: totals.calories, totalProtein: totals.protein, totalCarbs: totals.carbs,
    totalFat: totals.fat, createdAt: now, updatedAt: now,
  }
}

const displayNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, useGrouping: false })
export const formatNumber = (value: number): string => displayNumber.format(Object.is(value, -0) || Math.abs(value) < 0.05 ? 0 : value)
