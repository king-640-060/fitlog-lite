import Dexie, { type EntityTable } from 'dexie'
import type { DietTemplate, Exercise, Food, FoodLog, NutritionTarget, PelvicFloorSession, WeightLog, Workout, WorkoutTemplate } from './types'

export const STARTER_EXERCISE_NAMES = ['杠铃卧推', '深蹲', '硬拉', '引体向上', '哑铃弯举', '杠铃划船', '哑铃侧平举'] as const

export class FitLogDatabase extends Dexie {
  foods!: EntityTable<Food, 'id'>
  foodLogs!: EntityTable<FoodLog, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  weights!: EntityTable<WeightLog, 'id'>
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  dietTemplates!: EntityTable<DietTemplate, 'id'>
  nutritionTargets!: EntityTable<NutritionTarget, 'id'>
  pelvicFloorSessions!: EntityTable<PelvicFloorSession, 'id'>

  constructor(name = 'fitlog-lite-db') {
    super(name)
    this.version(1).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
    })
    this.version(2).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
    })
    this.version(3).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      nutritionTargets: 'id, &date, sourceTemplateId, createdAt',
      pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt',
    })
    this.version(4).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      nutritionTargets: 'id, &date, sourceTemplateId, createdAt',
      pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt',
    }).upgrade(() => {
      // meal is optional and unindexed. Never infer it for historical FoodLogs.
    })
    this.on('populate', () => {
      const now = new Date().toISOString()
      return this.exercises.bulkAdd(STARTER_EXERCISE_NAMES.map((name) => ({
        id: crypto.randomUUID(), name, createdAt: now, updatedAt: now,
      })))
    })
  }
}

export const db = new FitLogDatabase()
