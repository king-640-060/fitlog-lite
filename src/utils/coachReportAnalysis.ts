import type { Habit } from '../db/types'
import type { ReportResult, ReportSource } from './reporting'
import { getWeekRange } from './reporting'
import { getLocalDateString, shiftLocalDate } from './date'
import { latestValidDayWeight } from './recovery'
import { analyzeExercisePerformance } from './exercisePerformanceAnalysis'
import { trainingVolumeAnalysis } from './trainingVolumeAnalysis'
export type CoachFocus='all'|'strength'|'hypertrophy'|'fat-loss'
export type MacroKey='calories'|'protein'|'carbs'|'fat'
export interface CoachNutrition {actual?:number;target?:number;pairedActual?:number;achievement?:number;completeDays:number;partialDays:number;matchedDays:number;gkg?:number}
export type HabitCell='done'|'missing'|'off'|'future'|'before'|'unknown'
export function habitPlanKnown(habit:Habit,start:string):boolean {
  return habit.active&&getLocalDateString(new Date(habit.createdAt))<=start&&getLocalDateString(new Date(habit.updatedAt))<=start
}
export function analyzeCoachReport(source:ReportSource,report:ReportResult) {
  const end=report.days.filter(d=>!d.future).at(-1)?.date??shiftLocalDate(report.range.start,-1)
  const range={start:report.range.start,end},groups=analyzeExercisePerformance(source.workouts,range)
  const nutrition={} as Record<MacroKey,CoachNutrition>,logs=source.foodLogs.filter(l=>l.date>=range.start&&l.date<=end),byDay=new Map<string,typeof logs>()
  for(const log of logs)byDay.set(log.date,[...(byDay.get(log.date)??[]),log])
  for(const key of ['calories','protein','carbs','fat'] as const){
    const field=key==='calories'?'totalCalories':key==='protein'?'totalProtein':key==='carbs'?'totalCarbs':'totalFat'
    const complete=[...byDay].flatMap(([date,rows])=>rows.every(l=>typeof l[field]==='number'&&Number.isFinite(l[field])&&l[field]!>=0)?[{date,value:rows.reduce((n,l)=>n+l[field]!,0)}]:[])
    const paired=complete.flatMap(d=>{const target=source.nutritionTargets.find(t=>t.date===d.date)?.[key];return typeof target==='number'&&Number.isFinite(target)&&target>0?[{...d,target}]:[]})
    const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:undefined
    const actual=avg(complete.map(d=>d.value)),target=avg(paired.map(d=>d.target)),pairedActual=avg(paired.map(d=>d.value)),day=report.range.start===report.range.end?complete.find(d=>d.date===report.range.start):undefined
    const weight=day?latestValidDayWeight(source.weights,day.date):undefined
    nutrition[key]={actual,target,pairedActual,achievement:target!==undefined&&pairedActual!==undefined?pairedActual/target*100:undefined,completeDays:complete.length,partialDays:byDay.size-complete.length,matchedDays:paired.length,...(key!=='calories'&&day&&weight?{gkg:day.value/weight}:{})}
  }
  const habits=report.habits.map(row=>{
    const created=getLocalDateString(new Date(row.habit.createdAt)),dates=new Set([...row.dates].filter(d=>d<=end))
    const cells=report.days.map(({date,future}):HabitCell=>future?'future':dates.has(date)?'done':date<created?'before':!habitPlanKnown(row.habit,getWeekRange(date).start)?'unknown':row.habit.targetPerWeek?'off':row.habit.weekdays?.length?(row.habit.weekdays.includes((new Date(date+'T12:00:00').getDay()+6)%7+1)?'missing':'off'):'off')
    const weeks=(report.buckets.length?report.buckets:[{...report.range,label:'本周'}]).map(bucket=>{
      const natural=getWeekRange(bucket.start),known=habitPlanKnown(row.habit,natural.start),future=natural.start>end
      const allDates=new Set(source.habitCheckIns.filter(c=>c.habitId===row.habit.id&&c.date<=end).map(c=>c.date)),completed=[...allDates].filter(d=>d>=natural.start&&d<=natural.end).length,periodCompleted=[...dates].filter(d=>d>=bucket.start&&d<=bucket.end).length
      const target=known&&natural.start<=end?(row.habit.targetPerWeek??(row.habit.weekdays?.length||undefined)):undefined
      const partial=bucket.start!==natural.start||bucket.end!==natural.end||end<bucket.end
      return {...bucket,naturalStart:natural.start,naturalEnd:natural.end,future,completed,periodCompleted,target,partial,achieved:target!==undefined&&completed>=target,ratio:target===undefined?undefined:Math.min(1,completed/target)}
    })
    return {...row,dates,count:dates.size,cells,weeks}
  })
  const weights=source.weights.filter(w=>w.date>=range.start&&w.date<=end&&Number.isFinite(w.weightKg)&&w.weightKg>0).sort((a,b)=>a.date.localeCompare(b.date)||a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id))
  const first=weights[0],last=weights.at(-1)
  return {groups,training:trainingVolumeAnalysis(source.workouts,range),weeklyTraining:report.buckets.map(bucket=>({...bucket,...trainingVolumeAnalysis(source.workouts,{start:bucket.start,end:bucket.end<end?bucket.end:end})})),nutrition,habits,weights,weightDelta:first&&last&&first!==last?last.weightKg-first.weightKg:undefined,foodDays:byDay.size,elapsedDays:report.days.filter(d=>!d.future).length}
}
export type CoachReportAnalysis=ReturnType<typeof analyzeCoachReport>
