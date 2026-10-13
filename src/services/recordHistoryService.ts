import { db, type FitLogDatabase } from '../db/database'
import type { SleepSession, WaterLog, WeightLog } from '../db/types'
import { resolveSleepBusinessDate, sleepQueryWindow } from '../utils/sleepBusinessDate'
import { shiftLocalDate } from '../utils/date'
export type HistoryKind = 'weight' | 'sleep' | 'water'
export type HistoryRecord = WeightLog | SleepSession | WaterLog
export function historyRecordDate(kind: HistoryKind, row: HistoryRecord): string { return kind === 'sleep' ? resolveSleepBusinessDate(row as SleepSession) : (row as WeightLog | WaterLog).date }
/** Initial reads are capped. Index windows and explicit batches never change stored records. */
export async function readHistoryPage(kind: HistoryKind, end: string, days: number, limit = 25, database: FitLogDatabase = db): Promise<{ rows: HistoryRecord[]; more: boolean; start: string; end: string }> {
  if (![7,30,90].includes(days) || !Number.isInteger(limit) || limit < 1) throw Error('历史范围不合法')
  const start = shiftLocalDate(end, 1-days)
  return database.transaction('r', database.weights, database.sleepSessions, database.waterLogs, async () => {
    let rows: HistoryRecord[]
    if (kind === 'sleep') {
      const [from,to]=sleepQueryWindow(start,end)
      const [captured, legacy] = await Promise.all([
        database.sleepSessions.where('sleepNightDate').between(start,end,true,true).reverse().filter(row=>Boolean(row.endTime)).limit(limit+1).toArray(),
        database.sleepSessions.where('startTime').between(from,to,true,false).reverse().filter(row=>!row.sleepNightDate&&Boolean(row.endTime)&&resolveSleepBusinessDate(row)>=start&&resolveSleepBusinessDate(row)<=end).limit(limit+1).toArray(),
      ])
      rows = [...captured.filter(row=>Boolean(row.endTime)),...legacy].sort((a,b)=>resolveSleepBusinessDate(b).localeCompare(resolveSleepBusinessDate(a)) || b.startTime.localeCompare(a.startTime) || b.id.localeCompare(a.id))
    } else rows = await (kind==='weight'?database.weights:database.waterLogs).where('date').between(start,end,true,true).reverse().limit(limit+1).toArray()
    return { rows: rows.slice(0,limit), more: rows.length>limit, start, end }
  })
}
