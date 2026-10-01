import type { Food, FoodLog, NutritionGoal } from '../db/types'
import { calculateNutrition, type NutritionTotals } from './nutrition'
import { getLocalDateString } from './date'

export const completionKeys = ['calories', 'protein', 'carbs', 'fat'] as const
export type NutritionCompletionKey = typeof completionKeys[number]
export const completionBounds = { gramStep: 5, maxFoods: 4, maxFoodGrams: 400, maxTotalGrams: 800, candidateLimit: 12, beamWidth: 100, maxPlans: 3 } as const
export interface NutritionCompletionItem { food: Food; grams: number; added: NutritionTotals }
export interface NutritionCompletionPlan {
  items: NutritionCompletionItem[]
  added: NutritionTotals
  projected: NutritionTotals
  difference: NutritionGoal
  closeEnough: boolean
}
export interface NutritionCompletionSummary {
  actual: NutritionTotals
  target: NutritionGoal
  gap: NutritionGoal
  activeKeys: NutritionCompletionKey[]
  uncertainKeys: NutritionCompletionKey[]
  nothingToComplete: boolean
}
export interface NutritionCompletionResult extends NutritionCompletionSummary {
  excludedFoodCount: number
  plans: NutritionCompletionPlan[]
}
const snapshotKeys = { calories: 'totalCalories', protein: 'totalProtein', carbs: 'totalCarbs', fat: 'totalFat' } as const
const floors = { calories: 200, protein: 20, carbs: 30, fat: 10 }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
export const isFutureBusinessDate = (date: string, today = getLocalDateString()): boolean => date > today
export function completionTolerance(key: NutritionCompletionKey, target: number): number {
  return key === 'calories' ? Math.max(30, target * .02) : Math.max(3, target * .03)
}

/** Actual intake comes only from saved snapshots. Any missing macro makes that total unknown. */
export function getNutritionCompletionSummary(target: NutritionGoal, logs: readonly FoodLog[]): NutritionCompletionSummary {
  const actual: NutritionTotals = { calories: 0 }
  const gap: NutritionGoal = {}, activeKeys: NutritionCompletionKey[] = [], uncertainKeys: NutritionCompletionKey[] = []
  for (const key of completionKeys) {
    const values = logs.map((log) => log[snapshotKeys[key]])
    const total = values.every(finite) ? values.reduce((sum, n) => sum + n!, 0) : undefined
    if (key === 'calories') {
      if (!finite(total)) throw new Error('饮食记录热量数据不合法')
      actual.calories = total
    } else actual[key] = total !== undefined && Number.isFinite(total) ? total : undefined
    if (target[key] === undefined) continue
    if (!finite(target[key])) throw new Error('营养目标不合法')
    if (actual[key] === undefined) uncertainKeys.push(key)
    else { activeKeys.push(key); gap[key] = target[key]! - actual[key]! }
  }
  return { actual, target: { ...target }, gap, activeKeys, uncertainKeys, nothingToComplete: activeKeys.every((key) => gap[key]! <= 0) }
}

interface State { grams: number[]; added: number[]; count: number; score: number; key: string }

/** Finite deterministic beam search. Calories and each macro are independent dimensions. */
export function completeNutrition(target: NutritionGoal, logs: readonly FoodLog[], foods: readonly Food[], excludedFoodIds: ReadonlySet<string> = new Set()): NutritionCompletionResult {
  const summary = getNutritionCompletionSummary(target, logs)
  const result: NutritionCompletionResult = { ...summary, excludedFoodCount: 0, plans: [] }
  if (summary.nothingToComplete) return result
  const keys = summary.activeKeys
  const objective = (added: number[], count: number): number => keys.reduce((sum, key, i) => {
    const error = (summary.actual[key]! + added[i]! - target[key]!) / Math.max(floors[key], target[key]!)
    // Already-full dimensions strongly discourage adding more; never silently drop them.
    const penalty = error > 0 ? (summary.gap[key]! <= 0 ? 8 : 1.8) : 1
    return sum + error * error * penalty
  }, 0) + Math.max(0, count - 1) * .0004
  const baseline = objective(keys.map(() => 0), 0)
  const eligible = foods.filter((food) => {
    if (excludedFoodIds.has(food.id)) return false
    const valid = finite(food.referenceGrams) && food.referenceGrams > 0 && finite(food.calories)
      && completionKeys.every((key) => food[key] === undefined || (finite(food[key]) && Number.isFinite(food[key]! / food.referenceGrams * completionBounds.maxFoodGrams)))
      && keys.every((key) => finite(food[key]))
    if (!valid) result.excludedFoodCount++
    return valid
  })
  const ranked = eligible.map((food) => {
    let best = Infinity
    for (let grams = completionBounds.gramStep; grams <= completionBounds.maxFoodGrams; grams += completionBounds.gramStep) {
      best = Math.min(best, objective(keys.map((key) => food[key]! * (grams / food.referenceGrams)), 1))
    }
    return { food, best }
  }).sort((a, b) => a.best - b.best || compareText(a.food.name, b.food.name) || compareText(a.food.id, b.food.id))
  const candidates = ranked.slice(0, completionBounds.candidateLimit).map((item) => item.food)
  if (!candidates.length) return result
  const increments = candidates.map((food) => keys.map((key) => food[key]! * (completionBounds.gramStep / food.referenceGrams)))
  const order = (a: State, b: State): number => a.score - b.score || a.count - b.count || compareText(a.key, b.key)
  let beam: State[] = [{ grams: candidates.map(() => 0), added: keys.map(() => 0), count: 0, score: baseline, key: '' }]
  // At most 793 food sets for 12 candidates / 4 foods. Keep each set's best portion vector.
  const archive = new Map<string, State>()
  for (let step = 1; step <= completionBounds.maxTotalGrams / completionBounds.gramStep; step++) {
    const next = new Map<string, State>()
    for (const state of beam) for (let i = 0; i < candidates.length; i++) {
      if (state.grams[i]! >= completionBounds.maxFoodGrams || (!state.grams[i] && state.count >= completionBounds.maxFoods)) continue
      const grams = [...state.grams]; grams[i]! += completionBounds.gramStep
      const key = grams.join(',')
      if (next.has(key)) continue
      const count = state.count + (state.grams[i] ? 0 : 1)
      // Recompute from the vector so different paths cannot cause floating-point tie drift.
      const added = keys.map((_, k) => grams.reduce((sum, g, j) => sum + increments[j]![k]! * (g / completionBounds.gramStep), 0))
      next.set(key, { grams, added, count, key, score: objective(added, count) })
    }
    beam = [...next.values()].sort(order).slice(0, completionBounds.beamWidth)
    if (!beam.length) break
    for (const state of beam) {
      const set = state.grams.map((g, i) => g ? i : '').filter((i) => i !== '').join(',')
      const previous = archive.get(set)
      if (state.score < baseline && (!previous || order(state, previous) < 0)) archive.set(set, state)
    }
  }
  const states = [...archive.values()].sort(order)
  const best = states[0]?.score
  // Return genuinely different food sets, with an absolute and relative quality limit.
  for (const state of states) {
    if (result.plans.length >= completionBounds.maxPlans || state.score > best! + .06 || state.score > Math.max(.01, best! * 2 + .01)) break
    const items = state.grams.flatMap((grams, i) => grams ? [{ food: { ...candidates[i]! }, grams, added: calculateNutrition(candidates[i]!, grams) }] : [])
    const added: NutritionTotals = { calories: 0 }, projected: NutritionTotals = { calories: 0 }, difference: NutritionGoal = {}
    for (const key of completionKeys) {
      const amount = items.every((item) => item.added[key] !== undefined) ? items.reduce((sum, item) => sum + item.added[key]!, 0) : undefined
      const total = summary.actual[key] === undefined || amount === undefined ? undefined : summary.actual[key]! + amount
      if (key === 'calories') { added.calories = amount!; projected.calories = total! }
      else { added[key] = amount; projected[key] = total }
      if (keys.includes(key)) difference[key] = projected[key]! - target[key]!
    }
    result.plans.push({ items, added, projected, difference, closeEnough: keys.every((key) => Math.abs(difference[key]!) <= completionTolerance(key, target[key]!)) })
  }
  return result
}
