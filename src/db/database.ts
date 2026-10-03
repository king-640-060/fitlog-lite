import Dexie, { type EntityTable } from 'dexie'
import type { CardioSession, DietTemplate, Exercise, Food, FoodLog, Habit, HabitCheckIn, NutritionTarget, NutritionStrategyTemplate, NutritionStrategyVariant, NutritionStrategyPhase, PelvicFloorSession, Task, TaskTag, WeightLog, Workout, WorkoutTemplate } from './types'

export const PRODUCTION_DATABASE_NAME = 'fitlog-lite-db'

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
  cardioSessions!: EntityTable<CardioSession, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitCheckIns!: EntityTable<HabitCheckIn, 'id'>
  tasks!: EntityTable<Task, 'id'>
  taskTags!: EntityTable<TaskTag, 'id'>
  nutritionStrategyTemplates!: EntityTable<NutritionStrategyTemplate, 'id'>
  nutritionStrategyVariants!: EntityTable<NutritionStrategyVariant, 'id'>
  nutritionStrategyPhases!: EntityTable<NutritionStrategyPhase, 'id'>

  constructor(name = PRODUCTION_DATABASE_NAME) {
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
    this.version(5).stores({
      cardioSessions: 'id, date, createdAt',
    }).upgrade(() => {
      // Add only the new store. Existing V4 records retain their original meaning.
    })
    this.version(6).stores({
      habits: 'id, sortOrder, createdAt',
      habitCheckIns: 'id, habitId, date, &[habitId+date], completedAt',
    })
    this.version(7).stores({
      tasks: 'id, date, completedAt, createdAt, updatedAt, *tagIds',
      taskTags: 'id, &normalizedName, name, createdAt',
    })
    this.version(8).stores({
      nutritionStrategyTemplates: 'id, name, archivedAt, updatedAt',
      nutritionStrategyVariants: 'id, templateId, [templateId+sortOrder]',
      nutritionStrategyPhases: 'id, templateId, &startDate',
    }).upgrade(() => {
      // Add only three strategy stores. Legacy goals and factual snapshots stay byte-for-byte intact.
      // Optional strategySelection has no inferred backfill; sourceTemplateId remains DietTemplate provenance.
    })
    this.version(9).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
    }).upgrade(() => {
      // servingGrams is optional and unindexed. Preserve every V8 row, including strategy snapshots.
      // No inferred serving mass, FoodLog recalculation or second intermediate schema.
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
