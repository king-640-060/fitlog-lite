import { db, type FitLogDatabase } from '../db/database'
import { dailyRecordTables, readDailyRecordsSource } from './dailyRecordsSummary'
import { getLocalDateString } from '../utils/date'
import { analyzeNutritionCycleReport } from '../utils/nutritionCycleReport'
export async function loadNutritionCycleReport(id?: string, today=getLocalDateString(), database:FitLogDatabase=db) {
  return database.transaction('r',[...dailyRecordTables.map(name=>database.table(name)),database.nutritionCycles,database.nutritionCycleDays],async()=>{
    const cycles=(await database.nutritionCycles.toArray()).sort((a,b)=>b.startDate.localeCompare(a.startDate)||a.id.localeCompare(b.id))
    const selected=cycles.find(c=>c.id===id)??cycles.find(c=>!c.archivedAt&&c.startDate<=today&&c.endDate>=today)??cycles[0]
    if(!selected)return {cycles,selected:undefined,analysis:undefined}
    const last=selected.endDate<today?selected.endDate:today
    const [source,days]=await Promise.all([readDailyRecordsSource(selected.startDate,last,database,true),database.nutritionCycleDays.where('cycleId').equals(selected.id).toArray()])
    return {cycles,selected,analysis:analyzeNutritionCycleReport(selected,days,source,today)}
  })
}
export type NutritionCycleReport=Awaited<ReturnType<typeof loadNutritionCycleReport>>
