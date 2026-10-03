import { db, type FitLogDatabase } from '../db/database'
import type { DietEvent } from '../db/types'
import { validateHabitDate } from './habitService'
import { isMealType, mealNames } from '../utils/foodMeals'
import { formatEnergyInputValue } from '../utils/energy'

export type DietEventInput = Omit<DietEvent, 'id' | 'kind' | 'createdAt' | 'updatedAt'>
const allowed = ['id', 'date', 'kind', 'scope', 'note', 'estimatedCalories', 'estimatedCaloriesLow', 'estimatedCaloriesHigh', 'estimateSource', 'createdAt', 'updatedAt']
export function validateDietEvent(value: unknown): asserts value is DietEvent {
  const fail = () => { throw new Error('特殊饮食记录格式或范围不合法') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const v = value as Record<string, unknown>
  if (Object.keys(v).some(key => !allowed.includes(key)) || typeof v.id !== 'string' || !v.id.trim() || v.id.length > 200 || v.kind !== 'indulgence' || (v.scope !== 'day' && !isMealType(v.scope))) return fail()
  if (typeof v.date !== 'string') return fail()
  validateHabitDate(v.date)
  for (const key of ['createdAt', 'updatedAt']) if (typeof v[key] !== 'string' || !Number.isFinite(Date.parse(v[key] as string))) return fail()
  if (v.note !== undefined && (typeof v.note !== 'string' || v.note.length > 1000)) return fail()
  for (const key of ['estimatedCalories', 'estimatedCaloriesLow', 'estimatedCaloriesHigh']) if (v[key] !== undefined && (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || (v[key] as number) < 0 || (v[key] as number) > 100000)) return fail()
  if (v.estimateSource !== undefined && !['manual', 'photo'].includes(v.estimateSource as string)) return fail()
  if ((v.estimatedCalories !== undefined) !== (v.estimateSource !== undefined)) return fail()
  if (v.estimateSource === 'photo') {
    if (v.scope === 'day' || typeof v.estimatedCaloriesLow !== 'number' || typeof v.estimatedCaloriesHigh !== 'number' || v.estimatedCaloriesLow > v.estimatedCaloriesHigh) return fail()
  } else if (v.estimatedCaloriesLow !== undefined || v.estimatedCaloriesHigh !== undefined) return fail()
}
export async function saveDietEvent(input: DietEventInput, id: string = crypto.randomUUID(), database: FitLogDatabase = db): Promise<DietEvent> {
  return database.transaction('rw', database.dietEvents, async () => {
    const old = await database.dietEvents.get(id), now = new Date().toISOString()
    const value: DietEvent = { ...input, id, kind: 'indulgence', createdAt: old?.createdAt ?? now, updatedAt: now }
    validateDietEvent(value)
    await database.dietEvents.put(value)
    return value
  })
}
export async function deleteDietEvent(id: string, database: FitLogDatabase = db): Promise<void> { await database.dietEvents.delete(id) }
export function dietEventTitle(event: Pick<DietEvent, 'scope'>): string { return event.scope === 'day' ? '放纵日' : `放纵餐 · ${mealNames[event.scope]}` }
export function dietEventEstimate(event: DietEvent): string {
  return event.estimatedCalories === undefined ? '仅作备注，不计入营养总计' : `约 ${formatEnergyInputValue(event.estimatedCalories)} kcal · 仅作备注，不计入营养总计`
}
export function dietEventContext(events: DietEvent[]) {
  return { count: events.length, truncated: events.length > 10, contextualOnly: true, possibleOverlapWithFoodLogs: true, events: events.slice(0, 10).map(({ id, date, scope, note, estimatedCalories, estimatedCaloriesLow, estimatedCaloriesHigh, estimateSource }) => ({ id, date, scope, ...(note ? { note: note.slice(0, 240) } : {}), estimatedCalories, estimatedCaloriesLow, estimatedCaloriesHigh, estimateSource })) }
}
