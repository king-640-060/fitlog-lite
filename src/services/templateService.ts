import { isMealType } from '../utils/foodMeals'
import { getLocalDateString } from '../utils/date'
import { strategyBusinessDate } from './nutritionStrategyService'
import type {
  MealType, DietTemplate, DietTemplateFallback, DietTemplateItem, Food, FoodLog, NutritionGoal, Workout, WorkoutTemplate,
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
  if (item.meal !== undefined && !isMealType(item.meal)) throw new Error('模板餐次不合法')
  return {
    id: item.id ?? crypto.randomUUID(), foodId: optionalText(item.foodId),
    foodName: requiredText(item.foodName, '食物名称'), brand: optionalText(item.brand),
    ...(item.meal === undefined ? {} : { meal: item.meal }),
    grams: finiteNumber(item.grams, '克数', Number.EPSILON), fallback: normalizeFallback(item.fallback),
  }
}

export function normalizeDietTemplate(template: Partial<DietTemplate>): DietTemplate {
  const now = new Date().toISOString()
  if (!Array.isArray(template.items)) throw new Error('饮食模板缺少食物列表')
  if (template.mode !== undefined && !['combo','day'].includes(template.mode)) throw new Error('模板类型不合法')
  const items=template.items.map(cloneDietItem)
  if(new Set(items.map(i=>i.id)).size!==items.length)throw new Error('模板食物标识重复')
  return {
    id: template.id ?? crypto.randomUUID(), name: requiredText(template.name, '模板名称'),
    description: optionalText(template.description), items,
    ...(template.mode === undefined ? {} : { mode: template.mode }),
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
    name, mode: 'day',
    nutritionGoal,
    items: logs.map((log) => ({
      id: crypto.randomUUID(), foodId: log.foodId, foodName: log.foodName, brand: log.brand, grams: log.grams, ...(log.meal ? {meal:log.meal}:{}),
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
  if(!item.fallback)throw new Error('食物已删除且模板缺少营养快照')
  const fallback=normalizeFallback(item.fallback)
  return {
    id: item.foodId ?? crypto.randomUUID(), name: item.foodName, brand: item.brand, ...fallback,
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
  options: { replaceNutritionTarget?: boolean, preserveNutritionTarget?: boolean, meal?: MealType, expectedTemplate?: string, expectedTarget?: string, expectedFoods?: string } = {},
): Promise<FoodLog[]> {
  strategyBusinessDate(date)
  if(date>getLocalDateString())throw new Error('未来日期只能预览，不能确认实际摄入')
  if(options.meal!==undefined&&!isMealType(options.meal))throw new Error('餐次不合法')
  // Resolve and recheck in the same write transaction; no source can change after preview.
  return database.transaction('rw', [database.foods, database.foodLogs, database.dietTemplates, database.nutritionTargets], async () => {
    if(options.expectedTemplate!==undefined&&JSON.stringify(await database.dietTemplates.get(template.id))!==options.expectedTemplate)throw new Error('饮食模板已变化，请重新预览')
    if(template.mode!==undefined&&!['combo','day'].includes(template.mode))throw new Error('模板类型不合法')
    if(new Set(template.items.map(i=>i.id)).size!==template.items.length)throw new Error('模板食物标识重复')
    for(const item of template.items){finiteNumber(item.grams,'克数',Number.EPSILON);if(item.meal!==undefined&&!isMealType(item.meal))throw new Error('模板餐次不合法')}
    const resolved=await resolveDietTemplateFoods(template,database)
    if(options.expectedFoods!==undefined&&dietFoodsFingerprint(resolved)!==options.expectedFoods)throw new Error('食物资料已变化，请重新预览')
    const actualTarget=await database.nutritionTargets.where('date').equals(date).first()
    if(options.expectedTarget!==undefined&&JSON.stringify(actualTarget??null)!==options.expectedTarget)throw new Error('当天目标已变化，请重新预览')
    const existingTarget=template.nutritionGoal?actualTarget:undefined
    if(existingTarget&&!options.replaceNutritionTarget&&!options.preserveNutritionTarget)throw new NutritionTargetConflictError()
    const logs=resolved.map(({item,food,missing})=>{
      const log=createFoodLogSnapshot(food,item.grams,date,template.mode==='day'?item.meal:(options.meal??item.meal))
      if(missing)log.foodId=undefined
      return log
    })
    await database.foodLogs.bulkAdd(logs)
    await database.dietTemplates.update(template.id,{lastUsedAt:new Date().toISOString()})
    if(template.nutritionGoal&&!(existingTarget&&options.preserveNutritionTarget))await database.nutritionTargets.put(createNutritionTarget(date,template.nutritionGoal,existingTarget,template.id))
    return logs
  })
}
export function dietFoodsFingerprint(resolved:Awaited<ReturnType<typeof resolveDietTemplateFoods>>):string {
  return JSON.stringify(resolved.map(({item,food,missing})=>({item,missing,food:missing?item.fallback:food})))
}

export function sortTemplates<T extends { name: string, updatedAt: string, lastUsedAt?: string }>(templates: T[]): T[] {
  return [...templates].sort((a, b) => {
    if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt) || a.name.localeCompare(b.name, 'zh-CN')
    if (a.lastUsedAt) return -1
    if (b.lastUsedAt) return 1
    return b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'zh-CN')
  })
}

/** Move only among visible meal peers in day mode; legacy combinations retain flat ordering. */
export function moveDietTemplateItem(items:DietTemplateItem[],id:string,direction:number,mode?:DietTemplate['mode']):DietTemplateItem[]{
  if(direction!==-1&&direction!==1)throw new Error('移动方向不合法')
  const index=items.findIndex(item=>item.id===id),next=[...items]
  if(index<0)return next
  const peers=items.map((item,index)=>({item,index})).filter(p=>mode!=='day'||p.item.meal===items[index]!.meal)
  const peer=peers.findIndex(p=>p.index===index),destination=peers[peer+direction]?.index
  if(destination===undefined)return next
  ;[next[index],next[destination]]=[next[destination]!,next[index]!]
  return next
}
