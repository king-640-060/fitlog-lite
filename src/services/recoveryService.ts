import { db, type FitLogDatabase } from '../db/database'
import type { SleepSession, WaterLog } from '../db/types'
import { getLocalDateString } from '../utils/date'
import { sleepMinutes, validateSleepSession, validateWaterLog } from '../utils/recovery'
export async function startSleep(database: FitLogDatabase=db, now=new Date()): Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const active=await database.sleepSessions.where('activeKey').equals('active').first()
    if(active)return active
    const stamp=now.toISOString(),record:SleepSession={id:crypto.randomUUID(),startTime:stamp,activeKey:'active',createdAt:stamp,updatedAt:stamp}
    validateSleepSession(record);await database.sleepSessions.add(record);return record
  })
}
export async function finishSleep(id:string,database:FitLogDatabase=db,now=new Date()):Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const record=await database.sleepSessions.get(id);if(!record)throw new Error('睡眠记录已不存在')
    if(record.endTime)return record
    const end=now.toISOString(),{activeKey:_,...rest}=record
    const saved={...rest,endTime:end,durationMinutes:sleepMinutes(record.startTime,end),recordDate:getLocalDateString(now),updatedAt:end}
    validateSleepSession(saved);await database.sleepSessions.put(saved);return saved
  })
}
export async function editSleep(id:string,startTime:string,endTime:string|undefined,database:FitLogDatabase=db,now=new Date()):Promise<SleepSession> {
  return database.transaction('rw',database.sleepSessions,async()=>{
    const record=await database.sleepSessions.get(id);if(!record)throw new Error('睡眠记录已不存在')
    if(Boolean(record.endTime)!==Boolean(endTime))throw new Error('请通过“我醒了”结束进行中的睡眠')
    if(Date.parse(startTime)>now.getTime()||(endTime&&Date.parse(endTime)>now.getTime()))throw new Error('睡眠时间不能晚于当前时间')
    const saved:SleepSession={id,createdAt:record.createdAt,updatedAt:now.toISOString(),startTime,...(endTime?{endTime,durationMinutes:sleepMinutes(startTime,endTime),recordDate:getLocalDateString(new Date(endTime))}:{activeKey:'active' as const})}
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
