import type { BackupData } from '../db/types'
import { db } from '../db/database'

export function validateBackup(value: unknown): BackupData {
  if (!value || typeof value !== 'object') throw new Error('备份文件格式不正确')
  const backup = value as Partial<BackupData>
  if (backup.app !== 'FitLog Lite' || backup.schemaVersion !== 1 || !backup.data) throw new Error('不是兼容的 FitLog Lite 备份')
  const keys = ['foods', 'foodLogs', 'exercises', 'workouts', 'weights'] as const
  for (const key of keys) if (!Array.isArray(backup.data[key])) throw new Error(`备份缺少 ${key} 数据`)
  return backup as BackupData
}

export async function exportBackup(): Promise<BackupData> {
  return {
    app: 'FitLog Lite', schemaVersion: 1, exportedAt: new Date().toISOString(),
    data: {
      foods: await db.foods.toArray(), foodLogs: await db.foodLogs.toArray(), exercises: await db.exercises.toArray(),
      workouts: await db.workouts.toArray(), weights: await db.weights.toArray(),
    },
  }
}

export async function restoreBackup(backup: BackupData): Promise<void> {
  await db.transaction('rw', [db.foods, db.foodLogs, db.exercises, db.workouts, db.weights], async () => {
    await Promise.all([db.foods.clear(), db.foodLogs.clear(), db.exercises.clear(), db.workouts.clear(), db.weights.clear()])
    await db.foods.bulkAdd(backup.data.foods)
    await db.foodLogs.bulkAdd(backup.data.foodLogs)
    await db.exercises.bulkAdd(backup.data.exercises)
    await db.workouts.bulkAdd(backup.data.workouts)
    await db.weights.bulkAdd(backup.data.weights)
  })
}
