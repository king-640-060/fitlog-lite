import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, Food, FoodLog, WeightLog, Workout } from './types'

export class FitLogDatabase extends Dexie {
  foods!: EntityTable<Food, 'id'>
  foodLogs!: EntityTable<FoodLog, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  weights!: EntityTable<WeightLog, 'id'>

  constructor(name = 'fitlog-lite-db') {
    super(name)
    this.version(1).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
    })
  }
}

export const db = new FitLogDatabase()

export async function seedExercises(): Promise<void> {
  if ((await db.exercises.count()) > 0) return
  const now = new Date().toISOString()
  await db.exercises.bulkAdd(
    ['杠铃卧推', '深蹲', '硬拉', '引体向上', '哑铃弯举', '杠铃划船', '哑铃侧平举'].map((name) => ({
      id: crypto.randomUUID(), name, createdAt: now, updatedAt: now,
    })),
  )
}
