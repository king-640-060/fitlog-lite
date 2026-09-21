import type { BackupData, BackupDataV3 } from '../db/types'
import { db, type FitLogDatabase } from '../db/database'

type UnknownRecord = Record<string, unknown>

const storeLabels = {
  foods: '食物', foodLogs: '饮食记录', exercises: '动作', workouts: '训练记录', weights: '体重记录',
  workoutTemplates: '训练模板', dietTemplates: '饮食模板', nutritionTargets: '营养目标', pelvicFloorSessions: '盆底肌训练',
} as const

function objectValue(value: unknown, location: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${location}：必须是 object`)
  return value as UnknownRecord
}

function nonEmptyString(value: unknown, location: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${location}：必须是非空 string`)
  return value
}

function optionalString(value: unknown, location: string): void {
  if (value !== undefined && typeof value !== 'string') throw new Error(`${location}：必须是 string`)
}

function finite(value: unknown, location: string, minimum: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || (integer && !Number.isInteger(value))) {
    throw new Error(`${location}：必须${integer ? '是' : '为'}${minimum === 0 ? '大于等于 0' : '大于 0'}${integer ? '的整数' : ''}`)
  }
  return value
}

function optionalFinite(value: unknown, location: string, minimum: number, maximum?: number): void {
  if (value === undefined) return
  const number = finite(value, location, minimum)
  if (maximum !== undefined && number > maximum) throw new Error(`${location}：不能大于 ${maximum}`)
}

function timestamp(value: unknown, location: string): void {
  const text = nonEmptyString(value, location)
  if (Number.isNaN(Date.parse(text))) throw new Error(`${location}：时间格式不合法`)
}

function dateString(value: unknown, location: string): string {
  const text = nonEmptyString(value, location)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) throw new Error(`${location}：必须是合法 YYYY-MM-DD`)
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${location}：必须是合法 YYYY-MM-DD`)
  }
  return text
}

function validateIds(records: unknown[], store: keyof typeof storeLabels): UnknownRecord[] {
  const ids = new Set<string>()
  return records.map((value, index) => {
    const location = `${storeLabels[store]}第 ${index + 1} 项`
    const record = objectValue(value, location)
    const id = nonEmptyString(record.id, `${location} id`)
    if (ids.has(id)) throw new Error(`${location}：id 重复`)
    ids.add(id)
    return record
  })
}

function validateTimestamps(record: UnknownRecord, location: string): void {
  timestamp(record.createdAt, `${location} createdAt`)
  timestamp(record.updatedAt, `${location} updatedAt`)
}

function validateTemplateTimestamps(record: UnknownRecord, location: string): void {
  validateTimestamps(record, location)
  if (record.lastUsedAt !== undefined) timestamp(record.lastUsedAt, `${location} lastUsedAt`)
}

function validateFood(record: UnknownRecord, index: number): void {
  const location = `食物第 ${index + 1} 项`
  nonEmptyString(record.name, `${location} name`)
  optionalString(record.brand, `${location} brand`)
  finite(record.referenceGrams, `${location} referenceGrams`, Number.EPSILON)
  finite(record.calories, `${location} calories`, 0)
  optionalFinite(record.protein, `${location} protein`, 0)
  optionalFinite(record.carbs, `${location} carbs`, 0)
  optionalFinite(record.fat, `${location} fat`, 0)
  validateTimestamps(record, location)
}

function validateFoodLog(record: UnknownRecord, index: number): void {
  const location = `饮食记录第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  optionalString(record.foodId, `${location} foodId`)
  nonEmptyString(record.foodName, `${location} foodName`)
  optionalString(record.brand, `${location} brand`)
  finite(record.grams, `${location} grams`, Number.EPSILON)
  finite(record.referenceGrams, `${location} referenceGrams`, Number.EPSILON)
  finite(record.caloriesPerReference, `${location} caloriesPerReference`, 0)
  finite(record.totalCalories, `${location} totalCalories`, 0)
  for (const key of ['proteinPerReference', 'carbsPerReference', 'fatPerReference', 'totalProtein', 'totalCarbs', 'totalFat'] as const) {
    optionalFinite(record[key], `${location} ${key}`, 0)
  }
  validateTimestamps(record, location)
}

function validateExercise(record: UnknownRecord, index: number): void {
  const location = `动作第 ${index + 1} 项`
  nonEmptyString(record.name, `${location} name`)
  optionalString(record.notes, `${location} notes`)
  validateTimestamps(record, location)
}

function validateWorkout(record: UnknownRecord, index: number): void {
  const location = `训练记录第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  timestamp(record.startedAt, `${location} startedAt`)
  if (record.finishedAt !== undefined) timestamp(record.finishedAt, `${location} finishedAt`)
  optionalString(record.note, `${location} note`)
  if (!Array.isArray(record.exercises)) throw new Error(`${location} exercises：必须是 array`)
  const exerciseIds = new Set<string>()
  record.exercises.forEach((exerciseValue, exerciseIndex) => {
    const exerciseLocation = `${location}，第 ${exerciseIndex + 1} 个动作`
    const exercise = objectValue(exerciseValue, exerciseLocation)
    const exerciseId = nonEmptyString(exercise.id, `${exerciseLocation} id`)
    if (exerciseIds.has(exerciseId)) throw new Error(`${exerciseLocation}：id 重复`)
    exerciseIds.add(exerciseId)
    if (exercise.exerciseId !== undefined) nonEmptyString(exercise.exerciseId, `${exerciseLocation} exerciseId`)
    nonEmptyString(exercise.exerciseName, `${exerciseLocation} exerciseName`)
    if (!Array.isArray(exercise.sets)) throw new Error(`${exerciseLocation} sets：必须是 array`)
    const setIds = new Set<string>()
    exercise.sets.forEach((setValue, setIndex) => {
      const setLocation = `${exerciseLocation}，第 ${setIndex + 1} 组`
      const set = objectValue(setValue, setLocation)
      const setId = nonEmptyString(set.id, `${setLocation} id`)
      if (setIds.has(setId)) throw new Error(`${setLocation}：id 重复`)
      setIds.add(setId)
      if (typeof set.reps !== 'number' || !Number.isFinite(set.reps) || set.reps < 1 || !Number.isInteger(set.reps)) {
        throw new Error(`${setLocation}：reps 必须大于 0 且为整数`)
      }
      optionalFinite(set.weightKg, `${setLocation} weightKg`, 0)
      optionalFinite(set.rpe, `${setLocation} rpe`, 1, 10)
      optionalString(set.note, `${setLocation} note`)
    })
  })
  validateTimestamps(record, location)
}

function validateWeight(record: UnknownRecord, index: number): string {
  const location = `体重记录第 ${index + 1} 项`
  const date = dateString(record.date, `${location} date`)
  finite(record.weightKg, `${location} weightKg`, Number.EPSILON)
  validateTimestamps(record, location)
  return date
}

function validateWorkoutTemplate(record: UnknownRecord, index: number): void {
  const location = `训练模板第 ${index + 1} 项`
  nonEmptyString(record.name, `${location} name`)
  optionalString(record.description, `${location} description`)
  if (!Array.isArray(record.exercises)) throw new Error(`${location} exercises：必须是 array`)
  const exerciseIds = new Set<string>()
  const nestedSetIds = new Set<string>()
  record.exercises.forEach((exerciseValue, exerciseIndex) => {
    const exerciseLocation = `${location}，第 ${exerciseIndex + 1} 个动作`
    const exercise = objectValue(exerciseValue, exerciseLocation)
    const id = nonEmptyString(exercise.id, `${exerciseLocation} id`)
    if (exerciseIds.has(id)) throw new Error(`${exerciseLocation}：id 重复`)
    exerciseIds.add(id)
    if (exercise.exerciseId !== undefined) nonEmptyString(exercise.exerciseId, `${exerciseLocation} exerciseId`)
    nonEmptyString(exercise.exerciseName, `${exerciseLocation} exerciseName`)
    optionalString(exercise.note, `${exerciseLocation} note`)
    if (!Array.isArray(exercise.sets)) throw new Error(`${exerciseLocation} sets：必须是 array`)
    exercise.sets.forEach((setValue, setIndex) => {
      const setLocation = `${exerciseLocation}，第 ${setIndex + 1} 组`
      const set = objectValue(setValue, setLocation)
      const setId = nonEmptyString(set.id, `${setLocation} id`)
      if (nestedSetIds.has(setId)) throw new Error(`${setLocation}：id 重复`)
      nestedSetIds.add(setId)
      finite(set.reps, `${setLocation} reps`, 1, true)
      optionalFinite(set.weightKg, `${setLocation} weightKg`, 0)
      optionalFinite(set.rpe, `${setLocation} rpe`, 1, 10)
      optionalString(set.note, `${setLocation} note`)
    })
  })
  validateTemplateTimestamps(record, location)
}

function validateDietTemplate(record: UnknownRecord, index: number): void {
  const location = `饮食模板第 ${index + 1} 项`
  nonEmptyString(record.name, `${location} name`)
  optionalString(record.description, `${location} description`)
  if (!Array.isArray(record.items)) throw new Error(`${location} items：必须是 array`)
  const itemIds = new Set<string>()
  record.items.forEach((itemValue, itemIndex) => {
    const itemLocation = `${location}，第 ${itemIndex + 1} 个食物`
    const item = objectValue(itemValue, itemLocation)
    const id = nonEmptyString(item.id, `${itemLocation} id`)
    if (itemIds.has(id)) throw new Error(`${itemLocation}：id 重复`)
    itemIds.add(id)
    if (item.foodId !== undefined) nonEmptyString(item.foodId, `${itemLocation} foodId`)
    nonEmptyString(item.foodName, `${itemLocation} foodName`)
    optionalString(item.brand, `${itemLocation} brand`)
    finite(item.grams, `${itemLocation} grams`, Number.EPSILON)
    const fallback = objectValue(item.fallback, `${itemLocation} fallback`)
    finite(fallback.referenceGrams, `${itemLocation} fallback.referenceGrams`, Number.EPSILON)
    finite(fallback.calories, `${itemLocation} fallback.calories`, 0)
    optionalFinite(fallback.protein, `${itemLocation} fallback.protein`, 0)
    optionalFinite(fallback.carbs, `${itemLocation} fallback.carbs`, 0)
    optionalFinite(fallback.fat, `${itemLocation} fallback.fat`, 0)
  })
  if (record.nutritionGoal !== undefined) {
    const goal = objectValue(record.nutritionGoal, `${location} nutritionGoal`)
    for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
      optionalFinite(goal[key], `${location} nutritionGoal.${key}`, 0)
    }
  }
  validateTemplateTimestamps(record, location)
}

function validateNutritionTarget(record: UnknownRecord, index: number): string {
  const location = `营养目标第 ${index + 1} 项`
  const date = dateString(record.date, `${location} date`)
  if (record.sourceTemplateId !== undefined) nonEmptyString(record.sourceTemplateId, `${location} sourceTemplateId`)
  let hasValue = false
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    optionalFinite(record[key], `${location} ${key}`, 0)
    if (record[key] !== undefined) hasValue = true
  }
  if (!hasValue) throw new Error(`${location}：至少需要一项目标`)
  validateTimestamps(record, location)
  return date
}

function validatePelvicFloorSession(record: UnknownRecord, index: number): void {
  const location = `盆底肌训练第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  timestamp(record.startedAt, `${location} startedAt`)
  timestamp(record.finishedAt, `${location} finishedAt`)
  if (Date.parse(String(record.finishedAt)) < Date.parse(String(record.startedAt))) throw new Error(`${location}：finishedAt 不能早于 startedAt`)
  finite(record.repetitions, `${location} repetitions`, 1, true)
  const completed = finite(record.completedRepetitions, `${location} completedRepetitions`, 0, true)
  if (completed > Number(record.repetitions)) throw new Error(`${location}：completedRepetitions 不能大于 repetitions`)
  if (!Array.isArray(record.phases) || !record.phases.length) throw new Error(`${location} phases：必须是非空 array`)
  record.phases.forEach((phaseValue, phaseIndex) => {
    const phaseLocation = `${location}，第 ${phaseIndex + 1} 个阶段`
    const phase = objectValue(phaseValue, phaseLocation)
    if (phase.type !== 'contract' && phase.type !== 'relax') throw new Error(`${phaseLocation} type：必须是 contract 或 relax`)
    finite(phase.durationSeconds, `${phaseLocation} durationSeconds`, 1, true)
  })
  validateTimestamps(record, location)
}

export function validateBackup(value: unknown): BackupDataV3 {
  if (!value || typeof value !== 'object') throw new Error('备份文件格式不正确')
  const backup = value as Partial<BackupData>
  if (backup.app !== 'FitLog Lite' || (backup.schemaVersion !== 1 && backup.schemaVersion !== 2 && backup.schemaVersion !== 3)) throw new Error('不是兼容的 FitLog Lite 备份')
  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) throw new Error('备份 data 必须是 object')
  const data = backup.data as Partial<BackupDataV3['data']>
  timestamp(backup.exportedAt, '备份 exportedAt')
  const keys = ['foods', 'foodLogs', 'exercises', 'workouts', 'weights'] as const
  for (const key of keys) if (!Array.isArray(backup.data[key])) throw new Error(`备份缺少 ${key} 数据`)
  const workoutTemplates = backup.schemaVersion >= 2 ? data.workoutTemplates : []
  const dietTemplates = backup.schemaVersion >= 2 ? data.dietTemplates : []
  const nutritionTargets = backup.schemaVersion === 3 ? data.nutritionTargets : []
  const pelvicFloorSessions = backup.schemaVersion === 3 ? data.pelvicFloorSessions : []
  if (!Array.isArray(workoutTemplates)) throw new Error('备份缺少 workoutTemplates 数据')
  if (!Array.isArray(dietTemplates)) throw new Error('备份缺少 dietTemplates 数据')
  if (!Array.isArray(nutritionTargets)) throw new Error('备份缺少 nutritionTargets 数据')
  if (!Array.isArray(pelvicFloorSessions)) throw new Error('备份缺少 pelvicFloorSessions 数据')

  const foods = validateIds(backup.data.foods, 'foods'); foods.forEach(validateFood)
  const foodLogs = validateIds(backup.data.foodLogs, 'foodLogs'); foodLogs.forEach(validateFoodLog)
  const exercises = validateIds(backup.data.exercises, 'exercises'); exercises.forEach(validateExercise)
  const workouts = validateIds(backup.data.workouts, 'workouts'); workouts.forEach(validateWorkout)
  const weights = validateIds(backup.data.weights, 'weights')
  const weightDates = new Set<string>()
  weights.forEach((record, index) => {
    const date = validateWeight(record, index)
    if (weightDates.has(date)) throw new Error(`体重记录第 ${index + 1} 项：date 重复`)
    weightDates.add(date)
  })
  const checkedWorkoutTemplates = validateIds(workoutTemplates, 'workoutTemplates'); checkedWorkoutTemplates.forEach(validateWorkoutTemplate)
  const checkedDietTemplates = validateIds(dietTemplates, 'dietTemplates'); checkedDietTemplates.forEach(validateDietTemplate)
  const checkedNutritionTargets = validateIds(nutritionTargets, 'nutritionTargets')
  const nutritionTargetDates = new Set<string>()
  checkedNutritionTargets.forEach((record, index) => {
    const date = validateNutritionTarget(record, index)
    if (nutritionTargetDates.has(date)) throw new Error(`营养目标第 ${index + 1} 项：date 重复`)
    nutritionTargetDates.add(date)
  })
  const checkedPelvicFloorSessions = validateIds(pelvicFloorSessions, 'pelvicFloorSessions'); checkedPelvicFloorSessions.forEach(validatePelvicFloorSession)
  return {
    app: 'FitLog Lite', schemaVersion: 3, exportedAt: backup.exportedAt!,
    data: {
      foods: backup.data.foods, foodLogs: backup.data.foodLogs, exercises: backup.data.exercises,
      workouts: backup.data.workouts, weights: backup.data.weights,
      workoutTemplates, dietTemplates,
      nutritionTargets, pelvicFloorSessions,
    },
  } as BackupDataV3
}

export async function exportBackup(database: FitLogDatabase = db): Promise<BackupDataV3> {
  return {
    app: 'FitLog Lite', schemaVersion: 3, exportedAt: new Date().toISOString(),
    data: {
      foods: await database.foods.toArray(), foodLogs: await database.foodLogs.toArray(), exercises: await database.exercises.toArray(),
      workouts: await database.workouts.toArray(), weights: await database.weights.toArray(),
      workoutTemplates: await database.workoutTemplates.toArray(), dietTemplates: await database.dietTemplates.toArray(),
      nutritionTargets: await database.nutritionTargets.toArray(), pelvicFloorSessions: await database.pelvicFloorSessions.toArray(),
    },
  }
}

export async function restoreBackup(backup: BackupData | unknown, database: FitLogDatabase = db): Promise<void> {
  const validated = validateBackup(backup)
  await database.transaction('rw', [database.foods, database.foodLogs, database.exercises, database.workouts, database.weights, database.workoutTemplates, database.dietTemplates, database.nutritionTargets, database.pelvicFloorSessions], async () => {
    await Promise.all([database.foods.clear(), database.foodLogs.clear(), database.exercises.clear(), database.workouts.clear(), database.weights.clear(), database.workoutTemplates.clear(), database.dietTemplates.clear(), database.nutritionTargets.clear(), database.pelvicFloorSessions.clear()])
    await database.foods.bulkAdd(validated.data.foods)
    await database.foodLogs.bulkAdd(validated.data.foodLogs)
    await database.exercises.bulkAdd(validated.data.exercises)
    await database.workouts.bulkAdd(validated.data.workouts)
    await database.weights.bulkAdd(validated.data.weights)
    await database.workoutTemplates.bulkAdd(validated.data.workoutTemplates)
    await database.dietTemplates.bulkAdd(validated.data.dietTemplates)
    await database.nutritionTargets.bulkAdd(validated.data.nutritionTargets)
    await database.pelvicFloorSessions.bulkAdd(validated.data.pelvicFloorSessions)
  })
}
