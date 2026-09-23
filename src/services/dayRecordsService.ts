import { db, type FitLogDatabase } from '../db/database'

export async function clearDayRecords(date: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', [
    database.foodLogs, database.workouts, database.pelvicFloorSessions, database.weights, database.nutritionTargets,
  ], async () => {
    await database.foodLogs.where('date').equals(date).delete()
    await database.workouts.where('date').equals(date).delete()
    await database.pelvicFloorSessions.where('date').equals(date).delete()
    await database.weights.where('date').equals(date).delete()
    await database.nutritionTargets.where('date').equals(date).delete()
  })
}
