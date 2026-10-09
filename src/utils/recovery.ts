import { resolveSleepBusinessDate, sleepAttributionDates } from './sleepBusinessDate'
import type { SleepSession, WaterLog, WeightLog } from '../db/types'
import { getLocalDateString, shiftLocalDate } from './date'
export function sleepMinutes(start: string, end: string): number {
  const a = Date.parse(start), b = Date.parse(end)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) throw new Error('结束时间必须晚于开始时间')
  return Math.round((b - a) / 60000)
}
export function validateSleepSession(value: unknown): asserts value is SleepSession {
  const r = value as SleepSession
  if (!r || typeof r.id !== 'string' || !r.id || !validInstant(r.startTime) || !validInstant(r.createdAt) || !validInstant(r.updatedAt)) throw new Error('睡眠记录格式不合法')
  const attribution=[r.sleepNightDate,r.sleepNightDateSource,r.sleepStartLocalDate]
  if(attribution.some(v=>v!==undefined)&&(!validDate(r.sleepNightDate)||!validDate(r.sleepStartLocalDate)||!['auto','manual'].includes(r.sleepNightDateSource??'')||!sleepAttributionDates(r.sleepStartLocalDate!).includes(r.sleepNightDate!)))throw new Error('睡眠所属夜晚必须为开始当天或前一晚')
  if(r.sleepStartLocalDate){const offset=Date.parse(r.startTime)-Date.parse(r.sleepStartLocalDate+'T00:00:00Z');if(offset< -14*3600000||offset>=36*3600000)throw new Error('睡眠开始本地日期与真实时间不一致')}
  if (r.endTime === undefined) {
    if (r.activeKey !== 'active' || r.durationMinutes !== undefined || r.recordDate !== undefined) throw new Error('进行中的睡眠记录格式不合法')
  } else if (r.activeKey !== undefined || !validInstant(r.endTime) || r.durationMinutes !== sleepMinutes(r.startTime, r.endTime) || !validDate(r.recordDate)) throw new Error('已结束睡眠的日期或时长不合法')
}
function validInstant(v: unknown): v is string { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v)) }
function validDate(v: unknown): v is string { if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))return false; const d=new Date(v+'T12:00:00');return Number.isFinite(d.getTime())&&getLocalDateString(d)===v }
export function validateWaterLog(value: unknown): asserts value is WaterLog {
  const r=value as WaterLog
  if(!r||typeof r.id!=='string'||!r.id||!validDate(r.date)||!validInstant(r.timestamp)||!validInstant(r.createdAt)||!validInstant(r.updatedAt)||!Number.isSafeInteger(r.amountMl)||r.amountMl<=0||r.amountMl>100000)throw new Error('饮水量需为 1–100000 ml 的整数，日期和时间必须有效')
}
export function formatSleepDuration(minutes: number): string { const n=Math.max(0,Math.round(minutes));return `${Math.floor(n/60)}小时${n%60}分钟` }
export function localClock(instant: string): string { const d=new Date(instant);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
export function latestValidDayWeight(records: WeightLog[], date: string): number | undefined {
  return records.filter(r=>r.date===date&&Number.isFinite(r.weightKg)&&r.weightKg>0).sort((a,b)=>Date.parse(b.updatedAt||b.createdAt)-Date.parse(a.updatedAt||a.createdAt)||b.id.localeCompare(a.id))[0]?.weightKg
}
export function macroPerKg(actual: number, weight: number | undefined, complete = true): string | undefined { return complete&&weight!==undefined&&weight>0&&Number.isFinite(weight)&&Number.isFinite(actual)?`${(actual/weight).toFixed(2)} g/kg`:undefined }
/** Circular clock average keeps 23:50 + 00:10 around midnight, not noon. */
export function averageClock(instants: string[]): string | undefined {
  if(!instants.length)return undefined
  const angles=instants.map(t=>{const d=new Date(t);return(d.getHours()*60+d.getMinutes())/1440*Math.PI*2})
  const x=angles.reduce((s,a)=>s+Math.cos(a),0), y=angles.reduce((s,a)=>s+Math.sin(a),0)
  if(Math.hypot(x,y)<1e-8)return undefined
  const minute=Math.round(((Math.atan2(y,x)/(Math.PI*2)+1)%1)*1440)%1440
  return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`
}
export function recoveryDayFacts(sleep:SleepSession[],water:WaterLog[],date:string) {
  const sessions=sleep.filter(s=>s.endTime&&resolveSleepBusinessDate(s)===date),drinks=water.filter(w=>w.date===date)
  return {date,sessions,drinks,minutes:sessions.length?sessions.reduce((n,s)=>n+s.durationMinutes!,0):undefined,waterMl:drinks.length?drinks.reduce((n,w)=>n+w.amountMl,0):undefined}
}
export function recoveryRangeSummary(sleep:SleepSession[],water:WaterLog[],start:string,end:string) {
  const daily=[]
  for(let date=start;date<=end;date=shiftLocalDate(date,1))daily.push(recoveryDayFacts(sleep,water,date))
  const recorded=daily.filter(d=>d.minutes!==undefined)
  const main=recorded.map(d=>[...d.sessions].sort((a,b)=>b.durationMinutes!-a.durationMinutes!||a.id.localeCompare(b.id))[0]!)
  return {daily,recordedDays:recorded.length,averageMinutes:recorded.length?recorded.reduce((n,d)=>n+d.minutes!,0)/recorded.length:undefined,averageStart:averageClock(main.map(s=>s.startTime)),averageEnd:averageClock(main.map(s=>s.endTime!))}
}
export function recoverySummary(sleep:SleepSession[],water:WaterLog[],today:string,days:7|30|90) {
  return recoveryRangeSummary(sleep,water,shiftLocalDate(today,1-days),today)
}
