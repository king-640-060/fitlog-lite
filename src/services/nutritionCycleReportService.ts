import { db, type FitLogDatabase } from '../db/database'
import type {NutritionCycle} from '../db/types'
import { dailyRecordTables, readDailyRecordsSource } from './dailyRecordsSummary'
import { getLocalDateString } from '../utils/date'
import { analyzeNutritionCycleReport } from '../utils/nutritionCycleReport'
import { loadCoachReport } from './coachReportService'
export interface ReportPeriod extends NutritionCycle {kind:'cycle'|'phase'}
export async function loadNutritionCycleReport(id?: string, today=getLocalDateString(), database:FitLogDatabase=db,templateFilter?:string) {
  return database.transaction('r',[...dailyRecordTables.map(name=>database.table(name)),database.nutritionCycles,database.nutritionCycleDays,database.nutritionStrategyPhases,database.nutritionStrategyTemplates],async()=>{
    const templates=await database.nutritionStrategyTemplates.toArray(),owners=new Set(templates.map(t=>t.id))
    if(templateFilter&&!owners.has(templateFilter))templateFilter=undefined
    const cycles:ReportPeriod[]=[...(await database.nutritionCycles.toArray()).filter(c=>owners.has(c.templateId)).map(c=>({...c,kind:'cycle' as const})),...(await database.nutritionStrategyPhases.toArray()).filter(p=>owners.has(p.templateId)).map(p=>({...p,id:'phase:'+p.id,name:p.templateName+' · 使用阶段',endDate:p.endDate??today,revision:0,updatedAt:p.createdAt,kind:'phase' as const}))].filter(p=>!templateFilter||p.templateId===templateFilter).sort((a,b)=>b.startDate.localeCompare(a.startDate)||a.id.localeCompare(b.id))
    const selected=cycles.find(c=>c.id===id)??cycles.find(c=>c.kind==='cycle'&&!c.archivedAt&&c.startDate<=today&&c.endDate>=today)??cycles.find(c=>c.startDate<=today&&c.endDate>=today)??cycles.find(c=>c.startDate<=today)??cycles[0]
    if(!selected)return {templateFilter,templates,cycles,selected:undefined,analysis:undefined,coach:undefined}
    const last=selected.endDate<today?selected.endDate:today
    const [source,days,coach]=await Promise.all([readDailyRecordsSource(selected.startDate,last,database,true),selected.kind==='cycle'?database.nutritionCycleDays.where('cycleId').equals(selected.id).toArray():Promise.resolve([]),loadCoachReport('month',selected.startDate,today,database,{start:selected.startDate,end:selected.endDate})])
    return {templateFilter,templates,cycles,selected,analysis:analyzeNutritionCycleReport(selected,days,source,today),coach}
  })
}
export type NutritionCycleReport=Awaited<ReturnType<typeof loadNutritionCycleReport>>
