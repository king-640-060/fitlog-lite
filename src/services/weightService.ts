import type { WeightLog } from '../db/types'
import type { FitLogDatabase } from '../db/database'
import { db } from '../db/database'
import { finiteNumber } from '../utils/validation'

export async function upsertWeight(date: string, value: unknown, database: FitLogDatabase = db): Promise<WeightLog> {
  const weightKg = finiteNumber(value, '体重', 0.000001)
  return database.transaction('rw',database.weights,async()=>{
    const existing=(await database.weights.where('date').equals(date).toArray()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id))[0]
    const now=new Date().toISOString(),log:WeightLog={id:existing?.id??crypto.randomUUID(),date,weightKg,createdAt:existing?.createdAt??now,updatedAt:now}
    await database.weights.put(log);return log
  })
}

/** Actual saved records only; range inclusive and ordered by local business date. */
export async function getWeightsInRange(startDate: string, endDate: string, database: FitLogDatabase = db): Promise<WeightLog[]> {
  return (await database.weights.where('date').between(startDate, endDate, true, true).toArray()).sort((a,b)=>a.date.localeCompare(b.date)||a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id))
}

/** History edits address the actual record, including multiple records on one date. */
export async function editWeight(id:string,value:unknown,database:FitLogDatabase=db,expected?:string):Promise<WeightLog> {
  const weightKg=finiteNumber(value,'体重',0.000001)
  return database.transaction('rw',database.weights,async()=>{const old=await database.weights.get(id);if(!old)throw new Error('体重记录已不存在');if(expected!==undefined&&JSON.stringify(old)!==expected)throw new Error('记录已变化，请重新确认');const saved={...old,weightKg,updatedAt:new Date().toISOString()};await database.weights.put(saved);return saved})
}
export async function deleteWeight(id:string,database:FitLogDatabase=db,expected?:string):Promise<void>{await database.transaction('rw',database.weights,async()=>{const old=await database.weights.get(id);if(expected!==undefined&&JSON.stringify(old)!==expected)throw new Error('记录已变化，请重新确认');await database.weights.delete(id)})}
