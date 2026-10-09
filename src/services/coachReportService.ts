import { db, type FitLogDatabase } from '../db/database'
import { readDailyRecordsSource, dailyRecordTables } from './dailyRecordsSummary'
import { aggregateReport, getReportRange, getWeekRange, type ReportMode } from '../utils/reporting'
import { analyzeCoachReport } from '../utils/coachReportAnalysis'
import { getLocalDateString } from '../utils/date'
/** Single consistent readonly transaction; history fetched once, grouped once, never queried per action. */
export async function loadCoachReport(mode:ReportMode,anchor:string,today=getLocalDateString(),database:FitLogDatabase=db) {
  const {start,end}=getReportRange(mode,anchor),last=end<today?end:today
  return database.transaction('r',dailyRecordTables.map(t=>database.table(t)),async()=>{
    const source=await readDailyRecordsSource(start,last,database,true)
    const history=await database.workouts.where('date').belowOrEqual(last).toArray()
    const report=aggregateReport(source,mode,anchor,today)
    const habitContext=getWeekRange(start).start>last?[]:await database.habitCheckIns.where('date').between(getWeekRange(start).start,last,true,true).toArray()
    return {report,analysis:analyzeCoachReport({...source,workouts:history,habitCheckIns:habitContext},report)}
  })
}
export type CoachReport=Awaited<ReturnType<typeof loadCoachReport>>
