import type { Food } from '../db/types'
import { finiteNumber } from './validation'

export type FoodQuantityMode = 'grams' | 'servings'
/** Convert input once, then use the existing grams-based nutrition/snapshot path. */
export function foodQuantityGrams(value: unknown, mode: FoodQuantityMode, food: Pick<Food, 'servingGrams'>): number {
  const amount = finiteNumber(value, mode === 'servings' ? '份数' : '克数', Number.MIN_VALUE)
  if (mode === 'grams') return amount
  const serving = finiteNumber(food.servingGrams, '每份克数', Number.MIN_VALUE)
  return finiteNumber(amount * serving, '换算克数', Number.MIN_VALUE)
}
