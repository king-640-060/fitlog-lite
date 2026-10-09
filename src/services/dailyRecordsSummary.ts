import { resolveSleepBusinessDate, sleepQueryWindow } from '../utils/sleepBusinessDate'
import { db, type FitLogDatabase } from '../db/database'
import type { FoodLog, NutritionTarget, Workout, CardioSession, PelvicFloorSession, WeightLog, DietEvent, Habit, HabitCheckIn, SleepSession, WaterLog } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from './pelvicFloorService'
import { shiftLocalDate } from '../utils/date'
import { latestValidDayWeight, recoveryDayFacts } from '../utils/recovery'

export interface DailyRecordsSource {
  foodLogs: FoodLog[]; nutritionTargets: NutritionTarget[]; workouts: Workout[]; cardioSessions: CardioSession[]
  pelvicFloorSessions: PelvicFloorSession[]; weights: WeightLog[]; dietEvents: DietEvent[]
  habits: Habit[]; habitCheckIns: HabitCheckIn[]; sleepSessions: SleepSession[]; waterLogs: WaterLog[]
}
export interface DailyRecordsSummary {
  date: string; dietEvents?: DietEvent[]; foodLogCount: number; calories?: number; protein?: number; carbs?: number; fat?: number
  nutritionTarget?: NutritionTarget; hasWorkout: boolean; workoutCount: number; setCount: number
  cardioCount: number; cardioMinutes: number; pelvicFloorSessionCount: number; pelvicFloorContractions: number; pelvicFloorSeconds: number
  weightKg?: number; habitCount?: number; sleepCount?: number; sleepMinutes?: number; waterCount?: number; waterMl?: number
}
export interface DailyRecords { date: string; source: DailyRecordsSource; summary: DailyRecordsSummary }
export const dailyRecordTables = ['foodLogs','nutritionTargets','workouts','cardioSessions','pelvicFloorSessions','weights','dietEvents','habits','habitCheckIns','sleepSessions','waterLogs'] as const
/** Bounded business-date reads; no library join or historical snapshot recalculation. */
export async function readDailyRecordsSource(start: string, end: string, database: FitLogDatabase = db, allHabitDefinitions = false): Promise<DailyRecordsSource> {
  return database.transaction('r', dailyRecordTables.map(t=>database.table(t)), async()=>{
    const result = {} as DailyRecordsSource
    for(const table of dailyRecordTables) {
      if(table==='habits')continue
      if(table==='sleepSessions'){result.sleepSessions=start>end?[]:await readSleepBusinessRange(start,end,database);continue}
      const index='date'
      ;(result as unknown as Record<string,unknown>)[table]=start>end?[]:await database.table(table).where(index).between(start,end,true,true).toArray()
    }
    const ids=[...new Set(result.habitCheckIns.map(c=>c.habitId))]
    result.habits=allHabitDefinitions?await database.habits.toArray():(await database.habits.bulkGet(ids)).filter((h):h is Habit=>!!h)
    return result
  })
}
export function buildDailyRecords(source: DailyRecordsSource, date: string): DailyRecords {
  const day={} as DailyRecordsSource
  for(const table of dailyRecordTables) {
    if(table==='habits')continue
    ;(day as unknown as Record<string,unknown>)[table]=(source[table] as Array<{date?:string;recordDate?:string;endTime?:string}>).filter(r=>table==='sleepSessions'?!!r.endTime&&resolveSleepBusinessDate(r as SleepSession)===date:r.date===date)
  }
  day.habits=source.habits.filter(h=>day.habitCheckIns.some(c=>c.habitId===h.id))
  const food=day.foodLogs, recovery=recoveryDayFacts(day.sleepSessions,day.waterLogs,date)
  const macro=(key:'totalProtein'|'totalCarbs'|'totalFat')=>food.length&&food.every(l=>l[key]!==undefined)?food.reduce((n,l)=>n+l[key]!,0):undefined
  const summary:DailyRecordsSummary={date,dietEvents:day.dietEvents,foodLogCount:food.length,calories:food.length?food.reduce((n,l)=>n+l.totalCalories,0):undefined,protein:macro('totalProtein'),carbs:macro('totalCarbs'),fat:macro('totalFat'),nutritionTarget:day.nutritionTargets[0],hasWorkout:!!day.workouts.length,workoutCount:day.workouts.length,setCount:day.workouts.reduce((n,w)=>n+w.exercises.reduce((s,e)=>s+e.sets.length,0),0),cardioCount:day.cardioSessions.length,cardioMinutes:day.cardioSessions.reduce((n,c)=>n+c.durationMinutes,0),pelvicFloorSessionCount:day.pelvicFloorSessions.length,pelvicFloorContractions:day.pelvicFloorSessions.reduce((n,s)=>n+s.completedRepetitions,0),pelvicFloorSeconds:day.pelvicFloorSessions.reduce((n,s)=>n+pelvicFloorSessionDurationSeconds(s),0),weightKg:latestValidDayWeight(day.weights,date),habitCount:day.habitCheckIns.length,sleepCount:recovery.sessions.length,sleepMinutes:recovery.minutes,waterCount:recovery.drinks.length,waterMl:recovery.waterMl}
  return {date,source:day,summary}
}
export async function readDailyRecords(date:string,database:FitLogDatabase=db):Promise<DailyRecords>{return buildDailyRecords(await readDailyRecordsSource(date,date,database),date)}
export async function readDailyRecordsRange(start:string,end:string,database:FitLogDatabase=db):Promise<Map<string,DailyRecordsSummary>> {
  const source=await readDailyRecordsSource(start,end,database),map=new Map<string,DailyRecordsSummary>()
  for(let date=start;date<=end;date=shiftLocalDate(date,1))map.set(date,buildDailyRecords(source,date).summary)
  return map
}
/** Recovery surfaces read only the current bounded range plus the independent active session. */
export async function readRecoveryRecords(start:string,end:string,database:FitLogDatabase=db) {
  return database.transaction('r',database.sleepSessions,database.waterLogs,async()=>{
    const [completed,active,water]=await Promise.all([readSleepBusinessRange(start,end,database),database.sleepSessions.where('activeKey').equals('active').toArray(),database.waterLogs.where('date').between(start,end,true,true).toArray()])
    const newest=await database.sleepSessions.where('recordDate').above('').reverse().first()
    const recent=newest?.recordDate?await database.sleepSessions.where('recordDate').between(shiftLocalDate(newest.recordDate,-2),newest.recordDate,true,true).toArray():[]
    const latestCompleted=recent.filter(s=>s.endTime).sort((a,b)=>Date.parse(b.endTime!)-Date.parse(a.endTime!))[0]
    return {sleep:[...completed,...active],water,latestCompleted}
  })
}

export async function readSleepBusinessRange(start:string,end:string,database:FitLogDatabase=db):Promise<SleepSession[]> {
  const [from,to]=sleepQueryWindow(start,end)
  return (await database.sleepSessions.where('startTime').between(from,to,true,false).toArray()).filter(s=>!!s.endTime&&resolveSleepBusinessDate(s)>=start&&resolveSleepBusinessDate(s)<=end)
}
