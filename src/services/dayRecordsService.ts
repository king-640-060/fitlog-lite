import { db, type FitLogDatabase } from '../db/database'

export async function clearDayRecords(date: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', [
    database.dietEvents, database.foodLogs, database.workouts, database.cardioSessions, database.pelvicFloorSessions, database.weights, database.nutritionTargets,
  ], async () => {
    await database.dietEvents.where('date').equals(date).delete()
    await database.foodLogs.where('date').equals(date).delete()
    await database.workouts.where('date').equals(date).delete()
    await database.cardioSessions.where('date').equals(date).delete()
    await database.pelvicFloorSessions.where('date').equals(date).delete()
    await database.weights.where('date').equals(date).delete()
    await database.nutritionTargets.where('date').equals(date).delete()
  })
}

/** Controlled ten-domain deletion. The legacy seven-store API above keeps its contract. */
export const dayDeletionSources = {
  food: 'foodLogs', strength: 'workouts', cardio: 'cardioSessions', pelvic: 'pelvicFloorSessions',
  weight: 'weights', dietEvent: 'dietEvents', habit: 'habitCheckIns', sleep: 'sleepSessions', water: 'waterLogs', plan: 'tasks',
} as const
export type DayDeletionCategory = keyof typeof dayDeletionSources
export interface DayDeletionPreview {
  date: string; categories: DayDeletionCategory[]; includeNutritionTarget: boolean
  counts: Partial<Record<DayDeletionCategory | 'nutritionTarget', number>>
  signature: string
}
import { readDailyRecords, dailyRecordTables } from './dailyRecordsSummary'
import { validateHabitDate } from './habitService'

export async function previewDayDeletion(date: string, categories: DayDeletionCategory[], includeNutritionTarget = false, database: FitLogDatabase = db): Promise<DayDeletionPreview> {
  validateHabitDate(date)
  if (!Array.isArray(categories) || categories.some(c => !Object.hasOwn(dayDeletionSources, c)) || typeof includeNutritionTarget !== 'boolean') throw new Error('删除范围不合法')
  const selected = (Object.keys(dayDeletionSources) as DayDeletionCategory[]).filter(c=>categories.includes(c))
  const records = (await readDailyRecords(date, database)).source
  const facts: Array<[string, unknown[]]> = selected.map(c=>[c, (records[dayDeletionSources[c]] ?? []).slice().sort((a,b)=>a.id.localeCompare(b.id))])
  if (includeNutritionTarget) facts.push(['nutritionTarget', records.nutritionTargets])
  return { date, categories:selected, includeNutritionTarget, counts:Object.fromEntries(facts.map(([key,rows])=>[key,(rows as unknown[]).length])), signature:JSON.stringify(facts) }
}
export async function deleteDayRecords(preview: DayDeletionPreview, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', dailyRecordTables.map(t=>database.table(t)), async()=>{
    const current = await previewDayDeletion(preview.date, preview.categories, preview.includeNutritionTarget, database)
    if (current.signature !== preview.signature) throw new Error('当天记录已变化，请重新预览并确认删除')
    const records = (await readDailyRecords(preview.date,database)).source
    for (const category of current.categories) {
      const store = dayDeletionSources[category]
      await database[store].bulkDelete((records[store] ?? []).map(r=>r.id))
    }
    if (current.includeNutritionTarget) await database.nutritionTargets.bulkDelete(records.nutritionTargets.map(r=>r.id))
  })
}
