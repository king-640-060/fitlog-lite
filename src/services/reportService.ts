import { db, type FitLogDatabase } from '../db/database'
import { readDailyRecordsSource } from './dailyRecordsSummary'
import { aggregateReport, getReportRange, type ReportMode, type ReportResult } from '../utils/reporting'
import { getLocalDateString } from '../utils/date'
export async function loadReport(mode:ReportMode,anchor:string,today=getLocalDateString(),database:FitLogDatabase=db):Promise<ReportResult> {
  const {start,end}=getReportRange(mode,anchor),last=end<today?end:today
  return aggregateReport(await readDailyRecordsSource(start,last,database,true),mode,anchor,today)
}
