import { validateSleepSession, validateWaterLog } from '../utils/recovery'
import { validateDietEvent } from './dietEventService'
import type { BackupData, BackupDataV11 } from '../db/types'
import { db, type FitLogDatabase } from '../db/database'
import { isMealType } from '../utils/foodMeals'
import { getCardioActivityType } from '../utils/cardio'
import { normalizeTaskTagName, validateTaskTagName } from '../utils/taskTags'
import { validateTaskInput } from './taskService'

type UnknownRecord = Record<string, unknown>

const storeLabels = {
  sleepSessions: '睡眠', waterLogs: '饮水', dietEvents: '特殊饮食', foods: '食物', foodLogs: '饮食记录', exercises: '动作', workouts: '训练记录', weights: '体重记录',
  workoutTemplates: '训练模板', dietTemplates: '饮食模板', nutritionTargets: '营养目标', pelvicFloorSessions: '凯格尔训练', cardioSessions: '有氧训练', habits: '习惯', habitCheckIns: '习惯打卡', tasks: '任务', taskTags: '标签', nutritionStrategyTemplates: '营养模板', nutritionStrategyVariants: '营养日方案', nutritionStrategyPhases: '营养阶段',
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
  optionalFinite(record.servingGrams, `${location} servingGrams`, Number.MIN_VALUE)
  finite(record.calories, `${location} calories`, 0)
  optionalFinite(record.protein, `${location} protein`, 0)
  optionalFinite(record.carbs, `${location} carbs`, 0)
  optionalFinite(record.fat, `${location} fat`, 0)
  validateTimestamps(record, location)
}

function validateFoodLog(record: UnknownRecord, index: number): void {
  const location = `饮食记录第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  if (record.meal !== undefined && !isMealType(record.meal)) throw new Error(`${location} meal：餐次不合法`)
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
  if (record.strategySelection !== undefined) {
    if (record.sourceTemplateId !== undefined) throw new Error(`${location}：目标来源不能同时为饮食模板和营养模板`)
    const selection = objectValue(record.strategySelection, `${location} 来源`)
    for (const key of ['templateId', 'variantId', 'phaseId', 'templateName', 'variantName']) nonEmptyString(selection[key], `${location} 来源 ${key}`)
  }
  validateTimestamps(record, location)
  return date
}

function validatePelvicFloorSession(record: UnknownRecord, index: number): void {
  const location = `凯格尔训练第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  timestamp(record.startedAt, `${location} startedAt`)
  timestamp(record.finishedAt, `${location} finishedAt`)
  if (Date.parse(String(record.finishedAt)) < Date.parse(String(record.startedAt))) throw new Error(`${location}：finishedAt 不能早于 startedAt`)
  finite(record.repetitions, `${location} repetitions`, 1, true)
  const completed = finite(record.completedRepetitions, `${location} completedRepetitions`, 0, true)
  if (completed > Number(record.repetitions)) throw new Error(`${location}：completedRepetitions 不能大于 repetitions`)
  if (record.completionType !== undefined && record.completionType !== 'completed' && record.completionType !== 'manual') throw new Error(`${location} completionType：无效完成类型`)
  if (!Array.isArray(record.phases) || !record.phases.length) throw new Error(`${location} phases：必须是非空 array`)
  const validatePhases = (phases: unknown[], prefix: string): void => phases.forEach((phaseValue, phaseIndex) => {
    const phaseLocation = `${prefix}，第 ${phaseIndex + 1} 个阶段`
    const phase = objectValue(phaseValue, phaseLocation)
    if (!['prepare', 'contract', 'hold', 'release', 'relax', 'rest'].includes(String(phase.type))) throw new Error(`${phaseLocation} type：无效阶段`)
    finite(phase.durationSeconds, `${phaseLocation} durationSeconds`, 1, true)
  })
  validatePhases(record.phases, location)
  if (record.routine !== undefined) {
    const routine = objectValue(record.routine, `${location} routine`)
    nonEmptyString(routine.id, `${location} routine id`)
    nonEmptyString(routine.name, `${location} routine name`)
    if (typeof routine.description !== 'string') throw new Error(`${location} routine description：必须是 string`)
    if (!Array.isArray(routine.exercises) || !routine.exercises.length) throw new Error(`${location} routine exercises：必须是非空 array`)
    let totalRepetitions = 0
    routine.exercises.forEach((value, exerciseIndex) => {
      const prefix = `${location}，动作 ${exerciseIndex + 1}`
      const exercise = objectValue(value, prefix)
      nonEmptyString(exercise.id, `${prefix} id`)
      nonEmptyString(exercise.name, `${prefix} name`)
      const repetitions = finite(exercise.repetitions, `${prefix} repetitions`, 1, true)
      const sets = exercise.sets === undefined ? 1 : finite(exercise.sets, `${prefix} sets`, 1, true)
      if (exercise.restBetweenSetsSeconds !== undefined) finite(exercise.restBetweenSetsSeconds, `${prefix} restBetweenSetsSeconds`, 1, true)
      if (exercise.restAfterSeconds !== undefined) finite(exercise.restAfterSeconds, `${prefix} restAfterSeconds`, 1, true)
      if (!Array.isArray(exercise.phases) || !exercise.phases.length) throw new Error(`${prefix} phases：必须是非空 array`)
      validatePhases(exercise.phases, prefix)
      totalRepetitions += repetitions * sets
    })
    if (totalRepetitions !== record.repetitions) throw new Error(`${location} routine repetitions：与总次数不一致`)
  }
  validateTimestamps(record, location)
}

function validateLegacyCardioSession(record: UnknownRecord, index: number): void {
  const location = `有氧训练第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  finite(record.durationMinutes, `${location} durationMinutes`, Number.EPSILON)
  finite(record.speed, `${location} speed`, Number.EPSILON)
  optionalString(record.note, `${location} note`)
  validateTimestamps(record, location)
}

function validateTypedCardioSession(record: UnknownRecord, index: number): void {
  const location = `有氧训练第 ${index + 1} 项`
  dateString(record.date, `${location} date`)
  finite(record.durationMinutes, `${location} durationMinutes`, Number.EPSILON)
  if (record.activityType !== 'stair_climber' && record.activityType !== 'treadmill') throw new Error(`${location} activityType：训练类型不合法`)
  if (record.activityType === 'stair_climber') {
    finite(record.speed, `${location} speed`, Number.EPSILON)
    if (record.inclinePercent !== undefined) throw new Error(`${location} inclinePercent：楼梯机不支持坡度`)
  } else {
    optionalFinite(record.speed, `${location} speed`, Number.EPSILON)
    optionalFinite(record.inclinePercent, `${location} inclinePercent`, 0)
    if (record.speed === undefined && record.inclinePercent === undefined) throw new Error(`${location}：跑步机请至少填写速度或坡度`)
  }
  optionalString(record.note, `${location} note`)
  validateTimestamps(record, location)
}

function validateHabit(record: UnknownRecord, index: number): void {
  const location = `习惯第 ${index + 1} 项`
  const name = nonEmptyString(record.name, `${location} name`)
  if (name.trim().length > 40) throw new Error(`${location} name：不能超过 40 字符`)
  optionalString(record.note, `${location} note`)
  if (record.weekdays !== undefined) {
    if (!Array.isArray(record.weekdays) || record.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7) || new Set(record.weekdays).size !== record.weekdays.length) throw new Error(`${location} weekdays：计划日不合法`)
  }
  if (record.targetPerWeek !== undefined && (!Number.isInteger(record.targetPerWeek) || Number(record.targetPerWeek) < 1 || Number(record.targetPerWeek) > 7)) throw new Error(`${location} targetPerWeek：必须为 1–7`)
  if (typeof record.active !== 'boolean') throw new Error(`${location} active：必须是 boolean`)
  finite(record.sortOrder, `${location} sortOrder`, 0, true)
  validateTimestamps(record, location)
}

function validateHabitCheckIn(record: UnknownRecord, index: number): string {
  const location = `习惯打卡第 ${index + 1} 项`
  nonEmptyString(record.habitId, `${location} habitId`)
  const date = dateString(record.date, `${location} date`)
  timestamp(record.completedAt, `${location} completedAt`)
  validateTimestamps(record, location)
  return date
}

export interface ValidatedBackup {
  app: 'FitLog Lite'
  schemaVersion: 11
  exportedAt: string
  data: BackupDataV11['data']
}

export function validateBackup(value: unknown): ValidatedBackup {
  if (!value || typeof value !== 'object') throw new Error('备份文件格式不正确')
  const backup = value as Partial<BackupData>
  if (backup.app !== 'FitLog Lite' || (backup.schemaVersion !== 1 && backup.schemaVersion !== 2 && backup.schemaVersion !== 3 && backup.schemaVersion !== 4 && backup.schemaVersion !== 5 && backup.schemaVersion !== 6 && backup.schemaVersion !== 7 && backup.schemaVersion !== 8 && backup.schemaVersion !== 9 && backup.schemaVersion !== 10 && backup.schemaVersion !== 11)) throw new Error('不是兼容的 FitLog Lite 备份')
  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) throw new Error('备份 data 必须是 object')
  const data = backup.data as Partial<BackupDataV11['data']>
  timestamp(backup.exportedAt, '备份 exportedAt')
  const keys = ['foods', 'foodLogs', 'exercises', 'workouts', 'weights'] as const
  for (const key of keys) if (!Array.isArray(backup.data[key])) throw new Error(`备份缺少 ${key} 数据`)
  const sleepSessions = backup.schemaVersion >= 11 ? data.sleepSessions : []
  const waterLogs = backup.schemaVersion >= 11 ? data.waterLogs : []
  if (!Array.isArray(sleepSessions) || !Array.isArray(waterLogs)) throw new Error('备份缺少睡眠或饮水数据')
  validateIds(sleepSessions, 'sleepSessions').forEach(validateSleepSession)
  if (sleepSessions.filter(s => !s.endTime).length > 1) throw new Error('只能有一条进行中的睡眠记录')
  validateIds(waterLogs, 'waterLogs').forEach(validateWaterLog)
  const dietEvents = backup.schemaVersion >= 10 ? data.dietEvents : []
  if (!Array.isArray(dietEvents)) throw new Error('备份缺少 dietEvents 数据')
  validateIds(dietEvents, 'dietEvents').forEach(validateDietEvent)
  const workoutTemplates = backup.schemaVersion >= 2 ? data.workoutTemplates : []
  const dietTemplates = backup.schemaVersion >= 2 ? data.dietTemplates : []
  const nutritionTargets = backup.schemaVersion >= 3 ? data.nutritionTargets : []
  const pelvicFloorSessions = backup.schemaVersion >= 3 ? data.pelvicFloorSessions : []
  const cardioSessions = backup.schemaVersion >= 4 ? data.cardioSessions : []
  const habits = backup.schemaVersion >= 6 ? data.habits : []
  const habitCheckIns = backup.schemaVersion >= 6 ? data.habitCheckIns : []
  const tasks = backup.schemaVersion >= 7 ? data.tasks : []
  const taskTags = backup.schemaVersion >= 7 ? data.taskTags : []
  const nutritionStrategyTemplates = backup.schemaVersion >= 8 ? data.nutritionStrategyTemplates : []
  const nutritionStrategyVariants = backup.schemaVersion >= 8 ? data.nutritionStrategyVariants : []
  const nutritionStrategyPhases = backup.schemaVersion >= 8 ? data.nutritionStrategyPhases : []
  if (!Array.isArray(nutritionStrategyTemplates) || !Array.isArray(nutritionStrategyVariants) || !Array.isArray(nutritionStrategyPhases)) throw new Error('备份缺少营养模板、日方案或阶段数据')
  if (!Array.isArray(workoutTemplates)) throw new Error('备份缺少 workoutTemplates 数据')
  if (!Array.isArray(dietTemplates)) throw new Error('备份缺少 dietTemplates 数据')
  if (!Array.isArray(nutritionTargets)) throw new Error('备份缺少 nutritionTargets 数据')
  if (!Array.isArray(pelvicFloorSessions)) throw new Error('备份缺少 pelvicFloorSessions 数据')
  if (!Array.isArray(cardioSessions)) throw new Error('备份缺少 cardioSessions 数据')
  if (!Array.isArray(habits)) throw new Error('备份缺少 habits 数据')
  if (!Array.isArray(habitCheckIns)) throw new Error('备份缺少 habitCheckIns 数据')
  if (!Array.isArray(tasks)) throw new Error('备份缺少 tasks 数据')
  if (!Array.isArray(taskTags)) throw new Error('备份缺少 taskTags 数据')

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
  const checkedCardioSessions = validateIds(cardioSessions, 'cardioSessions')
  checkedCardioSessions.forEach(backup.schemaVersion >= 5 ? validateTypedCardioSession : validateLegacyCardioSession)
  const checkedHabits = validateIds(habits, 'habits'); checkedHabits.forEach(validateHabit)
  const habitIds = new Set(checkedHabits.map((habit) => String(habit.id)))
  const checkedCheckIns = validateIds(habitCheckIns, 'habitCheckIns')
  const habitDates = new Set<string>()
  checkedCheckIns.forEach((record, index) => {
    const date = validateHabitCheckIn(record, index)
    if (!habitIds.has(String(record.habitId))) throw new Error(`习惯打卡第 ${index + 1} 项：habitId 不存在`)
    const key = `${record.habitId}\0${date}`
    if (habitDates.has(key)) throw new Error(`习惯打卡第 ${index + 1} 项：habitId 和 date 重复`)
    habitDates.add(key)
  })
  const checkedTags = validateIds(taskTags, 'taskTags')
  const normalizedNames = new Set<string>()
  checkedTags.forEach((record, index) => {
    const location = `标签第 ${index + 1} 项`
    let name: string
    try { name = validateTaskTagName(record.name) } catch (error) { throw new Error(`${location} name：${error instanceof Error ? error.message : '不合法'}`) }
    const normalizedName = normalizeTaskTagName(name)
    if (record.normalizedName !== normalizedName) throw new Error(`${location} normalizedName：与名称不一致`)
    if (normalizedNames.has(normalizedName)) throw new Error(`${location} normalizedName：重复`)
    normalizedNames.add(normalizedName)
    validateTimestamps(record, location)
  })
  const tagIds = new Set(checkedTags.map((tag) => String(tag.id)))
  const checkedTasks = validateIds(tasks, 'tasks')
  checkedTasks.forEach((record, index) => {
    const location = `任务第 ${index + 1} 项`
    try { validateTaskInput(record as unknown as Parameters<typeof validateTaskInput>[0]) } catch (error) { throw new Error(`${location}：${error instanceof Error ? error.message : '数据不合法'}`) }
    for (const tagId of record.tagIds as string[]) if (!tagIds.has(tagId)) throw new Error(`${location} tagIds：引用了不存在的标签`)
    if (record.completedAt !== undefined) timestamp(record.completedAt, `${location} completedAt`)
    validateTimestamps(record, location)
  })
  const checkedStrategies = validateIds(nutritionStrategyTemplates, 'nutritionStrategyTemplates')
  checkedStrategies.forEach((record, index) => {
    const location = `营养模板第 ${index + 1} 项`
    if (nonEmptyString(record.name, `${location} name`).length > 80) throw new Error(`${location}：名称过长`)
    validateTimestamps(record, location)
    if (record.archivedAt !== undefined) timestamp(record.archivedAt, `${location} archivedAt`)
  })
  const strategyIds = new Set(checkedStrategies.map(r => String(r.id)))
  const checkedVariants = validateIds(nutritionStrategyVariants, 'nutritionStrategyVariants')
  const orders = new Set<string>()
  checkedVariants.forEach((record, index) => {
    const location = `营养日方案第 ${index + 1} 项`
    if (!strategyIds.has(nonEmptyString(record.templateId, `${location} templateId`))) throw new Error(`${location}：模板不存在`)
    if (nonEmptyString(record.name, `${location} name`).length > 80) throw new Error(`${location}：名称过长`)
    finite(record.sortOrder, `${location} sortOrder`, 0, true)
    const order = `${record.templateId}\0${record.sortOrder}`
    if (orders.has(order)) throw new Error(`${location}：顺序重复`)
    orders.add(order)
    let hasValue = false
    for (const key of ['calories', 'protein', 'carbs', 'fat']) { optionalFinite(record[key], `${location} ${key}`, 0); if (record[key] !== undefined) hasValue = true }
    if (!hasValue) throw new Error(`${location}：至少需要一项目标`)
    validateTimestamps(record, location)
  })
  for (const template of checkedStrategies) {
    const count = checkedVariants.filter(v => v.templateId === template.id).length
    if (count < 1 || count > 32) throw new Error('营养模板需要 1–32 个日方案')
  }
  const checkedPhases = validateIds(nutritionStrategyPhases, 'nutritionStrategyPhases')
  checkedPhases.forEach((record, index) => {
    const location = `营养阶段第 ${index + 1} 项`
    if (!strategyIds.has(nonEmptyString(record.templateId, `${location} templateId`))) throw new Error(`${location}：模板不存在`)
    if (record.endDate === undefined && checkedStrategies.find(t => t.id === record.templateId)?.archivedAt) throw new Error(`${location}：当前模板不能已归档`)
    nonEmptyString(record.templateName, `${location} templateName`)
    const start = dateString(record.startDate, `${location} startDate`)
    if (record.endDate !== undefined && dateString(record.endDate, `${location} endDate`) < start) throw new Error(`${location}：结束日期早于开始日期`)
    timestamp(record.createdAt, `${location} createdAt`)
  })
  const sortedPhases = [...checkedPhases].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
  for (let i = 1; i < sortedPhases.length; i++) {
    const previous = sortedPhases[i - 1]!
    if (!previous.endDate || String(previous.endDate) >= String(sortedPhases[i]!.startDate)) throw new Error('营养阶段重叠或存在多个当前阶段')
  }
  for (const target of checkedNutritionTargets) {
    if (target.strategySelection === undefined) continue
    const selection = target.strategySelection as UnknownRecord
    const phase = checkedPhases.find(p => p.id === selection.phaseId)
    if (!phase || phase.templateId !== selection.templateId) throw new Error('每日目标的营养阶段来源无效')
    const variant = checkedVariants.find(v => v.id === selection.variantId)
    // Removed variants intentionally remain explainable through name/value snapshots.
    if (variant && variant.templateId !== selection.templateId) throw new Error('每日目标的日方案来源无效')
  }
  return {
    app: 'FitLog Lite', schemaVersion: 11, exportedAt: backup.exportedAt!,
    data: {
      foods: backup.data.foods, foodLogs: backup.data.foodLogs, exercises: backup.data.exercises,
      workouts: backup.data.workouts, weights: backup.data.weights,
      workoutTemplates, dietTemplates,
      sleepSessions, waterLogs, dietEvents, nutritionTargets, pelvicFloorSessions, cardioSessions, habits, habitCheckIns, tasks, taskTags, nutritionStrategyTemplates, nutritionStrategyVariants, nutritionStrategyPhases,
    },
  } as ValidatedBackup
}

export async function exportBackup(database: FitLogDatabase = db): Promise<BackupDataV11> {
  return database.transaction('r', database.tables, async () => ({
    app: 'FitLog Lite' as const, schemaVersion: 11 as const, exportedAt: new Date().toISOString(),
    data: {
      sleepSessions: await database.sleepSessions.toArray(), waterLogs: await database.waterLogs.toArray(),
      dietEvents: await database.dietEvents.toArray(),
      foods: await database.foods.toArray(), foodLogs: await database.foodLogs.toArray(), exercises: await database.exercises.toArray(),
      workouts: await database.workouts.toArray(), weights: await database.weights.toArray(),
      workoutTemplates: await database.workoutTemplates.toArray(), dietTemplates: await database.dietTemplates.toArray(),
      nutritionTargets: await database.nutritionTargets.toArray(), pelvicFloorSessions: await database.pelvicFloorSessions.toArray(),
      cardioSessions: (await database.cardioSessions.toArray()).map((session) => ({ ...session, activityType: getCardioActivityType(session) })),
      habits: await database.habits.toArray(), habitCheckIns: await database.habitCheckIns.toArray(),
      tasks: await database.tasks.toArray(), taskTags: await database.taskTags.toArray(),
      nutritionStrategyTemplates: await database.nutritionStrategyTemplates.toArray(),
      nutritionStrategyVariants: await database.nutritionStrategyVariants.toArray(),
      nutritionStrategyPhases: await database.nutritionStrategyPhases.toArray(),
    },
  }))
}

export async function restoreBackup(backup: BackupData | unknown, database: FitLogDatabase = db): Promise<void> {
  const validated = validateBackup(backup)
  await database.transaction('rw', [database.sleepSessions, database.waterLogs, database.dietEvents, database.foods, database.foodLogs, database.exercises, database.workouts, database.weights, database.workoutTemplates, database.dietTemplates, database.nutritionTargets, database.pelvicFloorSessions, database.cardioSessions, database.habits, database.habitCheckIns, database.tasks, database.taskTags, database.nutritionStrategyTemplates, database.nutritionStrategyVariants, database.nutritionStrategyPhases], async () => {
    await Promise.all([database.sleepSessions.clear(), database.waterLogs.clear(), database.dietEvents.clear(), database.foods.clear(), database.foodLogs.clear(), database.exercises.clear(), database.workouts.clear(), database.weights.clear(), database.workoutTemplates.clear(), database.dietTemplates.clear(), database.nutritionTargets.clear(), database.pelvicFloorSessions.clear(), database.cardioSessions.clear(), database.habits.clear(), database.habitCheckIns.clear(), database.tasks.clear(), database.taskTags.clear(), database.nutritionStrategyTemplates.clear(), database.nutritionStrategyVariants.clear(), database.nutritionStrategyPhases.clear()])
    await database.sleepSessions.bulkAdd(validated.data.sleepSessions)
    await database.waterLogs.bulkAdd(validated.data.waterLogs)
    await database.dietEvents.bulkAdd(validated.data.dietEvents)
    await database.foods.bulkAdd(validated.data.foods)
    await database.foodLogs.bulkAdd(validated.data.foodLogs)
    await database.exercises.bulkAdd(validated.data.exercises)
    await database.workouts.bulkAdd(validated.data.workouts)
    await database.weights.bulkAdd(validated.data.weights)
    await database.workoutTemplates.bulkAdd(validated.data.workoutTemplates)
    await database.dietTemplates.bulkAdd(validated.data.dietTemplates)
    await database.nutritionTargets.bulkAdd(validated.data.nutritionTargets)
    await database.pelvicFloorSessions.bulkAdd(validated.data.pelvicFloorSessions)
    await database.cardioSessions.bulkAdd(validated.data.cardioSessions)
    await database.habits.bulkAdd(validated.data.habits)
    await database.habitCheckIns.bulkAdd(validated.data.habitCheckIns)
    await database.taskTags.bulkAdd(validated.data.taskTags)
    await database.tasks.bulkAdd(validated.data.tasks)
    await database.nutritionStrategyTemplates.bulkAdd(validated.data.nutritionStrategyTemplates)
    await database.nutritionStrategyVariants.bulkAdd(validated.data.nutritionStrategyVariants)
    await database.nutritionStrategyPhases.bulkAdd(validated.data.nutritionStrategyPhases)
  })
}
