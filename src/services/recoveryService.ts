import { sleepAttribution, sleepAttributionDates } from '../utils/sleepBusinessDate'
import { db, type FitLogDatabase } from '../db/database'
import type { SleepSession, WaterLog } from '../db/types'
import { getLocalDateString } from '../utils/date'
import { sleepMinutes, validateSleepSession, validateWaterLog } from '../utils/recovery'
export async function startSleep(database: FitLogDatabase=db, now=new Date()): Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const active=await database.sleepSessions.where('activeKey').equals('active').first()
    if(active)return active
    const stamp=now.toISOString(),record:SleepSession={id:crypto.randomUUID(),startTime:stamp,...sleepAttribution(stamp),activeKey:'active',createdAt:stamp,updatedAt:stamp}
    validateSleepSession(record);await database.sleepSessions.add(record);return record
  })
}
export async function finishSleep(id:string,database:FitLogDatabase=db,now=new Date()):Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const record=await database.sleepSessions.get(id);if(!record)throw new Error('睡眠记录已不存在')
    if(record.endTime)return record
    const end=now.toISOString(),{activeKey:_,...rest}=record
    const saved={...rest,...(rest.sleepNightDate?{}:sleepAttribution(rest.startTime)),endTime:end,durationMinutes:sleepMinutes(record.startTime,end),recordDate:getLocalDateString(now),updatedAt:end}
    validateSleepSession(saved);await database.sleepSessions.put(saved);return saved
  })
}
export async function editSleep(id:string,startTime:string,endTime:string|undefined,database:FitLogDatabase=db,now=new Date(),attribution?:{source:'auto'|'manual';date?:string}):Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const record=await database.sleepSessions.get(id);if(!record)throw new Error('睡眠记录已不存在')
    if(Boolean(record.endTime)!==Boolean(endTime))throw new Error('请通过“我醒了”结束进行中的睡眠')
    if(Date.parse(startTime)>now.getTime()||(endTime&&Date.parse(endTime)>now.getTime()))throw new Error('睡眠时间不能晚于当前时间')
    const unchanged=Date.parse(startTime)===Date.parse(record.startTime)
    let night=unchanged&&record.sleepNightDate?{sleepNightDate:record.sleepNightDate,sleepNightDateSource:record.sleepNightDateSource!,sleepStartLocalDate:record.sleepStartLocalDate!}:sleepAttribution(startTime)
    if(attribution?.source==='auto')night=unchanged&&record.sleepNightDateSource==='auto'?night:sleepAttribution(startTime)
    if(attribution?.source==='manual'||(!attribution&&record.sleepNightDateSource==='manual')) {
      const date=attribution?.date??record.sleepNightDate!
      if(!sleepAttributionDates(night.sleepStartLocalDate).includes(date))throw new Error('开始日期已变化，请重新选择所属夜晚（开始当天或前一晚）')
      night={...night,sleepNightDate:date,sleepNightDateSource:'manual'}
    }
    const saved:SleepSession={...night,id,createdAt:record.createdAt,updatedAt:now.toISOString(),startTime:unchanged?record.startTime:startTime,...(endTime?{endTime:Date.parse(endTime)===Date.parse(record.endTime!)?record.endTime!:endTime,durationMinutes:sleepMinutes(startTime,endTime),recordDate:Date.parse(endTime)===Date.parse(record.endTime!)?record.recordDate!:getLocalDateString(new Date(endTime))}:{activeKey:'active' as const})}
    validateSleepSession(saved);await database.sleepSessions.put(saved);return saved
  })
}
export async function deleteSleep(id:string,database:FitLogDatabase=db):Promise<void>{await database.sleepSessions.delete(id)}
export async function addWater(amountMl:number,database:FitLogDatabase=db,now=new Date()):Promise<WaterLog>{
  const stamp=now.toISOString(),record={id:crypto.randomUUID(),date:getLocalDateString(now),timestamp:stamp,amountMl,createdAt:stamp,updatedAt:stamp}
  validateWaterLog(record);await database.waterLogs.add(record);return record
}
export async function editWater(id:string,amountMl:number,database:FitLogDatabase=db):Promise<void>{
  await database.transaction('rw',database.waterLogs,async()=>{const old=await database.waterLogs.get(id);if(!old)throw new Error('饮水记录已不存在');const record={...old,amountMl,updatedAt:new Date().toISOString()};validateWaterLog(record);await database.waterLogs.put(record)})
}
export async function deleteWater(id:string,database:FitLogDatabase=db):Promise<void>{await database.waterLogs.delete(id)}
