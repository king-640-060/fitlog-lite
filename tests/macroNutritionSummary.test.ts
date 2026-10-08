import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { readDailyNutritionSummary, observeDailyNutritionSummary } from '../src/services/dailyNutritionSummary'
import { macroNutritionSummaryForDay } from '../src/ui/macroNutritionSummary'
import fixture from './fixtures/legacyV11Data.json'
const databases: FitLogDatabase[] = []
const make = (name = `macro-${crypto.randomUUID()}`) => { const d = new FitLogDatabase(name); databases.push(d); return d }
afterEach(async () => { for (const d of databases.splice(0)) { d.close(); await Dexie.delete(d.name) } })
const date = '2026-10-09', stamp = '2026-10-09T00:00:00Z'
const log = { ...fixture.foodLogs[0]!, date, totalCalories: 1890.123, totalProtein: 159.8, totalCarbs: 218.7, totalFat: 45.5 }
const weight = (id: string, weightKg: number, updatedAt = stamp) => ({ id, date, weightKg, createdAt: stamp, updatedAt })
it('reads saved snapshots without recomputing or mutating facts; latest valid same-day weight', async () => {
  const d = make(); await d.foodLogs.put(log)
  await d.weights.bulkPut([weight('b', 86.4, '2026-10-09T01:00:00Z'), { ...weight('other', 99), date: '2026-10-08' }])
  const initial = await d.foodLogs.toArray(), day = await readDailyNutritionSummary(date, d)
  expect(day.totals).toEqual({ calories: 1890.123, protein: 159.8, carbs: 218.7, fat: 45.5 })
  expect(day.effectiveWeight).toBe(86.4)
  const html = macroNutritionSummaryForDay(day)
  expect(html).toContain('1.85 g/kg'); expect(html).toContain('2.53 g/kg'); expect(html).toContain('0.53 g/kg')
  expect(html.indexOf('蛋白质')).toBeLessThan(html.indexOf('碳水')); expect(html.indexOf('碳水')).toBeLessThan(html.indexOf('脂肪'))
  expect(html).not.toMatch(/metric-excess|已达目标/)
  expect(await d.foodLogs.toArray()).toEqual(initial)
})
it('hides ratios with only historical weights, and hides only unknown macro dimensions', async () => {
  const d = make(); await d.foodLogs.put({ ...log, totalFat: undefined }); await d.weights.put({ ...weight('old', 86), date: '2026-10-08' })
  expect(macroNutritionSummaryForDay(await readDailyNutritionSummary(date, d))).not.toContain('g/kg')
  await d.weights.put(weight('today', 86)); const html = macroNutritionSummaryForDay(await readDailyNutritionSummary(date, d))
  expect(html.match(/class="macro-per-kg"/g)).toHaveLength(2)
  expect(await readDailyNutritionSummary('2026-10-07', d)).toMatchObject({ logs: [], target: undefined, effectiveWeight: undefined })
})
it('refreshes both consumers after a second connection commits and unsubscribes cleanly', async () => {
  const d = make(); await d.foodLogs.put(log); const other = make(d.name), initial = await readDailyNutritionSummary(date, d)
  const today = vi.fn(), food = vi.fn(), error = vi.fn()
  const stopToday = observeDailyNutritionSummary(date, initial, today, error, d)
  const stopFood = observeDailyNutritionSummary(date, initial, food, error, d)
  await other.weights.put(weight('new', 80))
  await vi.waitFor(() => { expect(today).toHaveBeenCalled(); expect(food).toHaveBeenCalled() })
  expect(macroNutritionSummaryForDay(today.mock.lastCall![0])).toEqual(macroNutritionSummaryForDay(food.mock.lastCall![0]))
  stopToday(); stopFood(); const calls = today.mock.calls.length
  await other.weights.update('new', { weightKg: 90 }); await new Promise(resolve => setTimeout(resolve, 40))
  expect(today).toHaveBeenCalledTimes(calls); expect(error).not.toHaveBeenCalled()
})
