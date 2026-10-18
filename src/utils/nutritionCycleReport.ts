import type { NutritionCycle, NutritionCycleDay, WeightLog } from '../db/types'
import { aggregateReport, type ReportSource } from './reporting'
import { analyzeCoachReport } from './coachReportAnalysis'
export function analyzeNutritionCycleReport(cycle:NutritionCycle,days:NutritionCycleDay[],source:ReportSource,today:string) {
  const report=aggregateReport(source,'month',cycle.startDate,today,{start:cycle.startDate,end:cycle.endDate}),analysis=analyzeCoachReport(source,report)
  const elapsed=report.days.filter(day=>!day.future),end=elapsed.at(-1)?.date
  const qualified=source.cardioSessions.filter(s=>s.date>=cycle.startDate&&s.date<=(end??'')&&Number.isFinite(s.durationMinutes)&&s.durationMinutes>0)
  const byDate=new Map<string,WeightLog>();for(const row of analysis.weights){const old=byDate.get(row.date);if(!old||Date.parse(row.updatedAt)>Date.parse(old.updatedAt)||Date.parse(row.updatedAt)===Date.parse(old.updatedAt)&&row.id>old.id)byDate.set(row.date,row)}
  const weights=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)),first=weights[0],last=weights.at(-1)
  const variants=new Map<string,{name:string;planned:number;elapsed:number;recorded:number;matched:number}>()
  for(const day of days.filter(day=>day.cycleId===cycle.id&&day.date>=cycle.startDate&&day.date<=cycle.endDate&&day.nutrition)){
    const key=day.nutrition!.variantId,row=variants.get(key)??{name:day.nutrition!.variantName,planned:0,elapsed:0,recorded:0,matched:0};row.planned++
    if(day.date<=today){row.elapsed++;const logs=source.foodLogs.filter(l=>l.date===day.date);if(logs.length)row.recorded++;const target=source.nutritionTargets.find(t=>t.date===day.date);if(logs.length&&target&&Number.isFinite(target.calories)&&target.calories!>0&&logs.every(l=>Number.isFinite(l.totalCalories)&&l.totalCalories>=0))row.matched++}
    variants.set(key,row)
  }
  return {range:report.range,totalDays:report.days.length,elapsedDays:elapsed.length,futureDays:report.days.length-elapsed.length,foodDays:analysis.foodDays,nutrition:analysis.nutrition,strength:analysis.training,cardioCount:qualified.length,cardioMinutes:qualified.reduce((n,s)=>n+s.durationMinutes,0),weights,first,last,weightDelta:weights.length>=2?last!.weightKg-first!.weightKg:undefined,variants:[...variants.values()]}
}
