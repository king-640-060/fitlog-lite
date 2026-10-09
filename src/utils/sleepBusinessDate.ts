import type { SleepSession } from '../db/types'
import { getLocalDateString, shiftLocalDate } from './date'
export interface SleepAttribution { sleepNightDate:string; sleepNightDateSource:'auto'|'manual'; sleepStartLocalDate:string }
/** Device-local default, not a classification of sleep type. */
export function getSleepBusinessDate(startTime:string,options:{startLocalDate?:string;hour?:number}={}):string {
  const instant=new Date(startTime)
  if(!Number.isFinite(instant.getTime()))throw new Error('开始时间无效')
  const date=options.startLocalDate??getLocalDateString(instant),hour=options.hour??instant.getHours()
  return hour<6?shiftLocalDate(date,-1):date
}
export function resolveSleepBusinessDate(session:SleepSession):string {return session.sleepNightDate??getSleepBusinessDate(session.startTime)}
export function sleepAttribution(startTime:string):SleepAttribution {
  return {sleepNightDate:getSleepBusinessDate(startTime),sleepNightDateSource:'auto',sleepStartLocalDate:getLocalDateString(new Date(startTime))}
}
export function sleepAttributionDates(startDate:string):string[]{return [shiftLocalDate(startDate,-1),startDate]}
export function sleepNightLabel(date:string):string {return `${Number(date.slice(0,4))}年${Number(date.slice(5,7))}月${Number(date.slice(8))}日晚`}
/** A two-day guard covers ISO offsets, local timezone extremes and previous-night attribution. */
export function sleepQueryWindow(start:string,end:string):[string,string] {return [shiftLocalDate(start,-2),shiftLocalDate(end,3)]}
