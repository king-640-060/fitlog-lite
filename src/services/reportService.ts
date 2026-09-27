import { db, type FitLogDatabase } from '../db/database'
import { aggregateReport, getReportRange, type ReportMode, type ReportResult } from '../utils/reporting'
import { getLocalDateString } from '../utils/date'
import type { EntityTable } from 'dexie'

export async function loadReport(mode: ReportMode, anchor: string, today = getLocalDateString(), database: FitLogDatabase = db): Promise<ReportResult> {
  const { start, end } = getReportRange(mode, anchor)
  const last = end < today ? end : today
  const between = <T extends { id: string }>(table: EntityTable<T, 'id'>): Promise<T[]> => start > last ? Promise.resolve([]) : table.where('date').between(start, last, true, true).toArray()
  const [foodLogs, nutritionTargets, workouts, cardioSessions, pelvicFloorSessions, weights, habits, habitCheckIns] = await Promise.all([
    between(database.foodLogs), between(database.nutritionTargets), between(database.workouts), between(database.cardioSessions),
    between(database.pelvicFloorSessions), between(database.weights), database.habits.toArray(), between(database.habitCheckIns),
  ])
  return aggregateReport({ foodLogs, nutritionTargets, workouts, cardioSessions, pelvicFloorSessions, weights, habits, habitCheckIns }, mode, anchor, today)
}
