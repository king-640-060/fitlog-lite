import { liveQuery } from 'dexie'
import { db, type FitLogDatabase } from '../db/database'
import { latestValidDayWeight } from '../utils/recovery'

/** One read-only snapshot for Today and Food; stored food nutrition remains authoritative. */
export async function readDailyNutritionSummary(date: string, database: FitLogDatabase = db) {
  return database.transaction('r', database.foodLogs, database.nutritionTargets, database.weights, async () => {
    const [logs, target, weights] = await Promise.all([
      database.foodLogs.where('date').equals(date).sortBy('createdAt'),
      database.nutritionTargets.where('date').equals(date).first(),
      database.weights.where('date').equals(date).toArray(),
    ])
    const totals = logs.reduce((sum, log) => ({
      calories: sum.calories + log.totalCalories,
      protein: sum.protein + (log.totalProtein ?? 0),
      carbs: sum.carbs + (log.totalCarbs ?? 0),
      fat: sum.fat + (log.totalFat ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
    return { date, logs, target, totals, effectiveWeight: latestValidDayWeight(weights, date) }
  })
}
export type DailyNutritionSummary = Awaited<ReturnType<typeof readDailyNutritionSummary>>

export function observeDailyNutritionSummary(date: string, initial: DailyNutritionSummary, changed: (value: DailyNutritionSummary) => void, failed: (error: unknown) => void, database: FitLogDatabase = db): () => void {
  let previous = JSON.stringify(initial)
  const subscription = liveQuery(() => readDailyNutritionSummary(date, database)).subscribe({
    next(value) { const signature = JSON.stringify(value); if (signature !== previous) { previous = signature; changed(value) } },
    error: failed,
  })
  return () => subscription.unsubscribe()
}
