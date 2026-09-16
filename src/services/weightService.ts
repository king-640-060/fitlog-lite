import type { WeightLog } from '../db/types'
import type { FitLogDatabase } from '../db/database'
import { db } from '../db/database'
import { finiteNumber } from '../utils/validation'

export async function upsertWeight(date: string, value: unknown, database: FitLogDatabase = db): Promise<WeightLog> {
  const weightKg = finiteNumber(value, '体重', 0.000001)
  const existing = await database.weights.where('date').equals(date).first()
  const now = new Date().toISOString()
  const log: WeightLog = {
    id: existing?.id ?? crypto.randomUUID(), date, weightKg,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  }
  await database.weights.put(log)
  return log
}
