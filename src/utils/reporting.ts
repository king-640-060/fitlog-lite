import type { DailyRecords } from '../services/dailyRecordsSummary'
import { buildDailyRecords } from '../services/dailyRecordsSummary'
import { recoveryRangeSummary } from './recovery'
import type { DietEvent, SleepSession, WaterLog, CardioSession, FoodLog, Habit, HabitCheckIn, NutritionTarget, PelvicFloorSession, WeightLog, Workout } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from '../services/pelvicFloorService'
import { getCardioActivityType } from './cardio'
import { getLocalDateString, shiftLocalDate } from './date'

export type ReportMode = 'day' | 'week' | 'month'
export interface ReportRange { start: string; end: string }
export interface ReportDay { date: string; future: boolean }
export interface ReportBucket extends ReportRange { label: string }
export interface ReportSource {
  sleepSessions?:SleepSession[]; waterLogs?:WaterLog[]; dietEvents?:DietEvent[]
  foodLogs: FoodLog[]; nutritionTargets: NutritionTarget[]; workouts: Workout[]; cardioSessions: CardioSession[]
  pelvicFloorSessions: PelvicFloorSession[]; weights: WeightLog[]; habits: Habit[]; habitCheckIns: HabitCheckIn[]
}
export interface ReportTrainingDay { date: string; strengthSets: number; cardioMinutes: number; pelvicMinutes: number }
export interface ReportNutritionMetric { actual?: number; target?: number; matchedDays: number; recordedDays: number }
export interface ReportHabit { habit: Habit; dates: Set<string>; count: number }
export interface ReportSummary {
  trainingDays: number; cardioMinutes: number; foodDays: number; habitCheckIns: number
  strengthSessions: number; strengthSets: number; cardioSessions: number; stairSessions: number; treadmillSessions: number
  pelvicSessions: number; pelvicMinutes: number
}
export interface ReportResult {
  daily?:DailyRecords; recovery:ReturnType<typeof recoveryRangeSummary> & {waterRecordedDays:number;waterTotal?:number;waterAverage?:number}
  range: ReportRange; days: ReportDay[]; buckets: ReportBucket[]; training: ReportTrainingDay[]
  habits: ReportHabit[]; nutrition: Record<'calories' | 'protein' | 'carbs' | 'fat', ReportNutritionMetric>
  weights: WeightLog[]; summary: ReportSummary; empty: boolean; text: string
}

function localDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day!, 12)
}
export function getWeekRange(anchor: string): ReportRange {
  const offset = (localDate(anchor).getDay() + 6) % 7
  const start = shiftLocalDate(anchor, -offset)
  return { start, end: shiftLocalDate(start, 6) }
}
export function getMonthRange(anchor: string): ReportRange {
  const date = localDate(anchor)
  return { start: getLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1, 12)), end: getLocalDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)) }
}
export function getReportRange(mode: ReportMode, anchor: string): ReportRange { return mode==='day'?{start:anchor,end:anchor}:mode === 'week' ? getWeekRange(anchor) : getMonthRange(anchor) }
export function shiftReportPeriod(mode: ReportMode, anchor: string, offset: number): string {
  if (mode === 'day') return shiftLocalDate(anchor,offset)
  if (mode === 'week') return shiftLocalDate(anchor, offset * 7)
  const date = localDate(anchor)
  return getLocalDateString(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12))
}
export function reportPeriodDays(range: ReportRange, today = getLocalDateString()): ReportDay[] {
  const days: ReportDay[] = []
  for (let date = range.start; date <= range.end; date = shiftLocalDate(date, 1)) days.push({ date, future: date > today })
  return days
}
export function monthWeekBuckets(range: ReportRange): ReportBucket[] {
  const result: ReportBucket[] = []
  for (let start = range.start; start <= range.end;) {
    const sunday = getWeekRange(start).end
    const end = sunday < range.end ? sunday : range.end
    result.push({ start, end, label: `${Number(start.slice(5, 7))}/${Number(start.slice(8))}–${Number(end.slice(5, 7))}/${Number(end.slice(8))}` })
    start = shiftLocalDate(end, 1)
  }
  return result
}
function average(values: number[]): number | undefined { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined }
function round(value: number): number { return Math.round(value * 10) / 10 }

export function aggregateReport(source: ReportSource, mode: ReportMode, anchor: string, today = getLocalDateString()): ReportResult {
  const range = getReportRange(mode, anchor)
  const days = reportPeriodDays(range, today)
  const eligible = new Set(days.filter((day) => !day.future).map((day) => day.date))
  const within = <T extends { date: string }>(records: T[]): T[] => records.filter((record) => eligible.has(record.date))
  const foodLogs = within(source.foodLogs), targets = within(source.nutritionTargets), workouts = within(source.workouts)
  const cardio = within(source.cardioSessions), pelvic = within(source.pelvicFloorSessions)
  const weights = within(source.weights).sort((a, b) => a.date.localeCompare(b.date))
  const checkIns = within(source.habitCheckIns)
  const foodByDay = new Map<string, FoodLog[]>(), targetByDay = new Map(targets.map((target) => [target.date, target]))
  foodLogs.forEach((log) => foodByDay.set(log.date, [...(foodByDay.get(log.date) ?? []), log]))
  const nutrition = {} as ReportResult['nutrition']
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    const actualKey = key === 'calories' ? 'totalCalories' : key === 'protein' ? 'totalProtein' : key === 'carbs' ? 'totalCarbs' : 'totalFat'
    const daily = [...foodByDay.entries()].flatMap(([date, logs]) => {
      const available = logs.filter((log) => log[actualKey] !== undefined)
      return available.length ? [{ date, actual: available.reduce((sum, log) => sum + Number(log[actualKey]), 0), target: targetByDay.get(date)?.[key] }] : []
    })
    const matched = daily.filter((entry) => entry.target !== undefined)
    nutrition[key] = { actual: average(matched.length ? matched.map((entry) => entry.actual) : daily.map((entry) => entry.actual)), target: average(matched.map((entry) => entry.target!)), matchedDays: matched.length, recordedDays: daily.length }
  }
  const training = days.map(({ date }) => ({
    date,
    strengthSets: workouts.filter((item) => item.date === date).reduce((sum, item) => sum + item.exercises.reduce((count, exercise) => count + exercise.sets.length, 0), 0),
    cardioMinutes: cardio.filter((item) => item.date === date).reduce((sum, item) => sum + item.durationMinutes, 0),
    pelvicMinutes: round(pelvic.filter((item) => item.date === date).reduce((sum, item) => sum + pelvicFloorSessionDurationSeconds(item), 0) / 60),
  }))
  const habits = source.habits.filter((habit) => {
    const createdDate = getLocalDateString(new Date(habit.createdAt))
    return checkIns.some((item) => item.habitId === habit.id) || (habit.active && createdDate <= range.end && createdDate <= today)
  }).sort((a, b) => a.sortOrder - b.sortOrder).map((habit) => {
    const dates = new Set(checkIns.filter((item) => item.habitId === habit.id).map((item) => item.date))
    return { habit, dates, count: dates.size }
  })
  const summary: ReportSummary = {
    trainingDays: new Set([...workouts, ...cardio, ...pelvic].map((item) => item.date)).size,
    cardioMinutes: cardio.reduce((sum, item) => sum + item.durationMinutes, 0),
    foodDays: foodByDay.size, habitCheckIns: checkIns.length,
    strengthSessions: workouts.length, strengthSets: training.reduce((sum, item) => sum + item.strengthSets, 0),
    cardioSessions: cardio.length, stairSessions: cardio.filter((item) => getCardioActivityType(item) === 'stair_climber').length,
    treadmillSessions: cardio.filter((item) => getCardioActivityType(item) === 'treadmill').length,
    pelvicSessions: pelvic.length, pelvicMinutes: round(pelvic.reduce((sum, item) => sum + pelvicFloorSessionDurationSeconds(item), 0) / 60),
  }
  const sleep=(source.sleepSessions??[]).filter(s=>s.endTime&&eligible.has(s.recordDate!)),water=within(source.waterLogs??[]),dietEvents=within(source.dietEvents??[])
  const recoveryFacts=recoveryRangeSummary(sleep,water,range.start,range.end<today?range.end:today),waterDays=recoveryFacts.daily.filter(d=>d.waterMl!==undefined)
  const waterTotal=waterDays.length?waterDays.reduce((n,d)=>n+d.waterMl!,0):undefined
  const recovery={...recoveryFacts,waterRecordedDays:waterDays.length,waterTotal,waterAverage:waterTotal===undefined?undefined:waterTotal/waterDays.length}
  const daily=mode==='day'?buildDailyRecords({...source,sleepSessions:sleep,waterLogs:water,dietEvents},anchor):undefined
  const period = '本期'
  const sentences: string[] = []
  if (summary.trainingDays) sentences.push(`${period}共训练 ${summary.trainingDays} 天，其中有氧 ${round(summary.cardioMinutes)} 分钟`)
  if (summary.foodDays) sentences.push(`饮食记录 ${summary.foodDays} 天`)
  if (summary.habitCheckIns) sentences.push(`习惯共完成 ${summary.habitCheckIns} 次`)
  if (weights.length >= 2) sentences.push(`体重从 ${weights[0]!.weightKg} kg 变化到 ${weights.at(-1)!.weightKg} kg`)
  else if (weights.length === 1) sentences.push(`体重记录 ${weights[0]!.weightKg} kg`)
  if(recovery.recordedDays)sentences.push(`睡眠记录 ${recovery.recordedDays} 天`)
  if(waterDays.length)sentences.push(`饮水记录 ${waterDays.length} 天，共 ${waterTotal} ml`)
  return { daily,recovery,range, days, buckets: mode === 'month' ? monthWeekBuckets(range) : [], training, habits, nutrition, weights, summary,
    empty: !foodLogs.length && !workouts.length && !cardio.length && !pelvic.length && !weights.length && !checkIns.length && !sleep.length && !water.length && !dietEvents.length,
    text: sentences.length ? `${sentences.join('。')}。` : '这段时间还没有记录。' }
}
