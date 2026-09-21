import type {
  DietTemplate, DietTemplateFallback, DietTemplateItem, Food, FoodLog, NutritionGoal, Workout, WorkoutTemplate,
  WorkoutTemplateExercise, WorkoutTemplateSet,
} from '../db/types'
import { db, type FitLogDatabase } from '../db/database'
import { createFoodLogSnapshot } from '../utils/nutrition'
import { finiteNumber, optionalNumber, requiredText } from '../utils/validation'
import { createNutritionTarget, normalizeNutritionGoal } from './nutritionTargetService'

function optionalText(value: unknown): string | undefined {
  return String(value ?? '').trim() || undefined
}

function cloneWorkoutSet(set: Partial<WorkoutTemplateSet>): WorkoutTemplateSet {
  return {
    id: set.id ?? crypto.randomUUID(),
    weightKg: optionalNumber(set.weightKg, '重量', 0),
    reps: finiteNumber(set.reps, '次数', 1, true),
    rpe: optionalNumber(set.rpe, 'RPE', 1, 10),
    note: optionalText(set.note),
  }
}

function cloneWorkoutExercise(exercise: Partial<WorkoutTemplateExercise>): WorkoutTemplateExercise {
  if (!Array.isArray(exercise.sets)) throw new Error('模板动作缺少组数')
  return {
    id: exercise.id ?? crypto.randomUUID(),
    exerciseId: optionalText(exercise.exerciseId),
    exerciseName: requiredText(exercise.exerciseName, '动作名称'),
    sets: exercise.sets.map(cloneWorkoutSet),
    note: optionalText(exercise.note),
  }
}

export function normalizeWorkoutTemplate(template: Partial<WorkoutTemplate>): WorkoutTemplate {
  const now = new Date().toISOString()
  if (!Array.isArray(template.exercises)) throw new Error('训练模板缺少动作列表')
  return {
    id: template.id ?? crypto.randomUUID(),
    name: requiredText(template.name, '模板名称'),
    description: optionalText(template.description),
    exercises: template.exercises.map(cloneWorkoutExercise),
    createdAt: template.createdAt ?? now,
    updatedAt: now,
    lastUsedAt: template.lastUsedAt,
  }
}

export async function saveWorkoutTemplate(template: Partial<WorkoutTemplate>, database: FitLogDatabase = db): Promise<WorkoutTemplate> {
  const normalized = normalizeWorkoutTemplate(template)
  await database.workoutTemplates.put(normalized)
  return normalized
}

export function workoutTemplateFromWorkout(workout: Workout, name: string): WorkoutTemplate {
  return normalizeWorkoutTemplate({
    name,
    exercises: workout.exercises.map((exercise) => ({
      id: crypto.randomUUID(), exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({ ...set, id: crypto.randomUUID() })),
    })),
  })
}

export function duplicateWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
  const now = new Date().toISOString()
  return {
    ...template, id: crypto.randomUUID(), name: `${template.name} 副本`, createdAt: now, updatedAt: now, lastUsedAt: undefined,
    exercises: template.exercises.map((exercise) => ({
      ...exercise, id: crypto.randomUUID(), sets: exercise.sets.map((set) => ({ ...set, id: crypto.randomUUID() })),
    })),
  }
}

export async function startWorkoutFromTemplate(template: WorkoutTemplate, date: string, database: FitLogDatabase = db): Promise<Workout> {
  const open = (await database.workouts.where('date').equals(date).toArray()).find((item) => !item.finishedAt)
  if (open) throw new Error('这一天已有未完成训练，请先继续或完成它')
  const exerciseIds = template.exercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))
  const exerciseMap = new Map((await database.exercises.bulkGet(exerciseIds)).filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => [item.id, item]))
  const now = new Date().toISOString()
  const workout: Workout = {
    id: crypto.randomUUID(), date, startedAt: now, createdAt: now, updatedAt: now,
    exercises: template.exercises.map((exercise) => {
      const current = exercise.exerciseId ? exerciseMap.get(exercise.exerciseId) : undefined
      return {
        id: crypto.randomUUID(), exerciseId: current?.id, exerciseName: current?.name ?? exercise.exerciseName,
        sets: exercise.sets.map((set) => ({ ...set, id: crypto.randomUUID() })),
      }
    }),
  }
  await database.transaction('rw', [database.workouts, database.workoutTemplates], async () => {
    await database.workouts.add(workout)
    await database.workoutTemplates.update(template.id, { lastUsedAt: now })
  })
  return workout
}

function normalizeFallback(value: Partial<DietTemplateFallback>): DietTemplateFallback {
  return {
    referenceGrams: finiteNumber(value.referenceGrams, '基准重量', Number.EPSILON),
    calories: finiteNumber(value.calories, '热量', 0),
    protein: optionalNumber(value.protein, '蛋白质', 0),
    carbs: optionalNumber(value.carbs, '碳水', 0),
    fat: optionalNumber(value.fat, '脂肪', 0),
  }
}

function cloneDietItem(item: Partial<DietTemplateItem>): DietTemplateItem {
  if (!item.fallback) throw new Error('饮食模板项目缺少营养快照')
  return {
    id: item.id ?? crypto.randomUUID(), foodId: optionalText(item.foodId),
    foodName: requiredText(item.foodName, '食物名称'), brand: optionalText(item.brand),
    grams: finiteNumber(item.grams, '克数', Number.EPSILON), fallback: normalizeFallback(item.fallback),
  }
}

export function normalizeDietTemplate(template: Partial<DietTemplate>): DietTemplate {
  const now = new Date().toISOString()
  if (!Array.isArray(template.items)) throw new Error('饮食模板缺少食物列表')
  return {
    id: template.id ?? crypto.randomUUID(), name: requiredText(template.name, '模板名称'),
    description: optionalText(template.description), items: template.items.map(cloneDietItem),
    nutritionGoal: normalizeNutritionGoal(template.nutritionGoal),
    createdAt: template.createdAt ?? now, updatedAt: now, lastUsedAt: template.lastUsedAt,
  }
}

export async function saveDietTemplate(template: Partial<DietTemplate>, database: FitLogDatabase = db): Promise<DietTemplate> {
  const normalized = normalizeDietTemplate(template)
  await database.dietTemplates.put(normalized)
  return normalized
}

export function dietTemplateItemFromFood(food: Food, grams: number): DietTemplateItem {
  return {
    id: crypto.randomUUID(), foodId: food.id, foodName: food.name, brand: food.brand,
    grams: finiteNumber(grams, '克数', Number.EPSILON),
    fallback: { referenceGrams: food.referenceGrams, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
  }
}

export function dietTemplateFromLogs(logs: FoodLog[], name: string, nutritionGoal?: NutritionGoal): DietTemplate {
  return normalizeDietTemplate({
    name,
    nutritionGoal,
    items: logs.map((log) => ({
      id: crypto.randomUUID(), foodId: log.foodId, foodName: log.foodName, brand: log.brand, grams: log.grams,
      fallback: { referenceGrams: log.referenceGrams, calories: log.caloriesPerReference, protein: log.proteinPerReference, carbs: log.carbsPerReference, fat: log.fatPerReference },
    })),
  })
}

export function duplicateDietTemplate(template: DietTemplate): DietTemplate {
  const now = new Date().toISOString()
  return {
    ...template, id: crypto.randomUUID(), name: `${template.name} 副本`, createdAt: now, updatedAt: now, lastUsedAt: undefined,
    nutritionGoal: template.nutritionGoal ? { ...template.nutritionGoal } : undefined,
    items: template.items.map((item) => ({ ...item, id: crypto.randomUUID(), fallback: { ...item.fallback } })),
  }
}

function fallbackFood(item: DietTemplateItem): Food {
  return {
    id: item.foodId ?? crypto.randomUUID(), name: item.foodName, brand: item.brand, ...item.fallback,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

export async function resolveDietTemplateFoods(template: DietTemplate, database: FitLogDatabase = db): Promise<Array<{ item: DietTemplateItem, food: Food, missing: boolean }>> {
  const ids = template.items.map((item) => item.foodId).filter((id): id is string => Boolean(id))
  const foodMap = new Map((await database.foods.bulkGet(ids)).filter((item): item is Food => Boolean(item)).map((item) => [item.id, item]))
  return template.items.map((item) => {
    const current = item.foodId ? foodMap.get(item.foodId) : undefined
    return { item, food: current ?? fallbackFood(item), missing: !current }
  })
}

export class NutritionTargetConflictError extends Error {
  constructor() {
    super('这一天已经有营养目标')
    this.name = 'NutritionTargetConflictError'
  }
}

export async function applyDietTemplate(
  template: DietTemplate,
  date: string,
  database: FitLogDatabase = db,
  options: { replaceNutritionTarget?: boolean, preserveNutritionTarget?: boolean } = {},
): Promise<FoodLog[]> {
  const resolved = await resolveDietTemplateFoods(template, database)
  const logs = resolved.map(({ item, food, missing }) => {
    const log = createFoodLogSnapshot(food, item.grams, date)
    if (missing) log.foodId = undefined
    return log
  })
  const now = new Date().toISOString()
  await database.transaction('rw', [database.foodLogs, database.dietTemplates, database.nutritionTargets], async () => {
    const existingTarget = template.nutritionGoal
      ? await database.nutritionTargets.where('date').equals(date).first()
      : undefined
    if (existingTarget && !options.replaceNutritionTarget && !options.preserveNutritionTarget) throw new NutritionTargetConflictError()
    await database.foodLogs.bulkAdd(logs)
    await database.dietTemplates.update(template.id, { lastUsedAt: now })
    if (template.nutritionGoal && !(existingTarget && options.preserveNutritionTarget)) {
      const target = createNutritionTarget(date, template.nutritionGoal, existingTarget, template.id)
      await database.nutritionTargets.put(target)
    }
  })
  return logs
}

export function sortTemplates<T extends { name: string, updatedAt: string, lastUsedAt?: string }>(templates: T[]): T[] {
  return [...templates].sort((a, b) => {
    if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt) || a.name.localeCompare(b.name, 'zh-CN')
    if (a.lastUsedAt) return -1
    if (b.lastUsedAt) return 1
    return b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'zh-CN')
  })
}
