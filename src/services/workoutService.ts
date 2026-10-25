import { db, type FitLogDatabase } from '../db/database'
import type { Exercise, Workout, WorkoutSet } from '../db/types'
import { normalizeWorkoutName, WORKOUT_NAME_MAX_LENGTH } from '../utils/workoutName'
import { finiteNumber, optionalNumber, requiredText } from '../utils/validation'

export const TRAINING_JOURNAL_MAX_LENGTH = 2000
export function normalizeTrainingJournal(value: unknown): string | undefined {
  if (value !== undefined && typeof value !== 'string') throw new Error('训练日志格式不正确')
  const text = String(value ?? '').trim()
  if (text.length > TRAINING_JOURNAL_MAX_LENGTH) throw new Error(`训练日志最多 ${TRAINING_JOURNAL_MAX_LENGTH} 个字符`)
  return text || undefined
}

export async function saveExercise(nameValue: unknown, notesValue?: unknown, id?: string, database: FitLogDatabase = db): Promise<Exercise> {
  const name = requiredText(nameValue, '动作名称')
  const notes = String(notesValue ?? '').trim() || undefined
  const now = new Date().toISOString()
  const existing = id ? await database.exercises.get(id) : undefined
  const exercise: Exercise = { id: id ?? crypto.randomUUID(), name, notes, createdAt: existing?.createdAt ?? now, updatedAt: now }
  await database.exercises.put(exercise)
  return exercise
}

export function validateWorkoutSet(input: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: input.id ?? crypto.randomUUID(),
    weightKg: optionalNumber(input.weightKg, '重量', 0),
    reps: finiteNumber(input.reps, '次数', 1, true),
    rpe: optionalNumber(input.rpe, 'RPE', 1, 10),
    note: String(input.note ?? '').trim() || undefined,
  }
}

function isBlankWorkoutSet(set: WorkoutSet): boolean {
  return set.reps === 0
    && set.weightKg === undefined
    && set.rpe === undefined
    && !String(set.note ?? '').trim()
}

export function normalizeWorkoutForSave(workout: Workout): Workout {
  return {
    ...workout,
    ...(workout.name === undefined ? {} : { name: normalizeWorkoutName(workout.name) }),
    note: normalizeTrainingJournal(workout.note),
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.flatMap((set) => {
        if (isBlankWorkoutSet(set)) return []
        if (!Number.isInteger(set.reps) || set.reps < 1) throw new Error('请填写次数或删除未完成的组')
        return [validateWorkoutSet(set)]
      }),
    })),
  }
}

export async function createWorkout(date: string, database: FitLogDatabase = db): Promise<Workout> {
  const now = new Date().toISOString()
  const workout: Workout = { id: crypto.randomUUID(), date, startedAt: now, exercises: [], createdAt: now, updatedAt: now }
  await database.transaction('rw', database.workouts, async () => {
    if ((await database.workouts.where('date').equals(date).toArray()).some(row => !row.finishedAt)) throw new Error('这一天已有未完成训练，请先继续或完成它')
    await database.workouts.add(workout)
  })
  return workout
}

export interface WorkoutSaveOptions { requireExisting?: boolean; expectedFingerprint?: string }
export function workoutFingerprint(workout: Workout): string { return JSON.stringify(workout) }
async function persistWorkout(normalized: Workout, database: FitLogDatabase, options: WorkoutSaveOptions): Promise<Workout> {
  if (!options.requireExisting && options.expectedFingerprint === undefined) { await database.workouts.put(normalized); return normalized }
  return database.transaction('rw', database.workouts, async () => {
    const existing = await database.workouts.get(normalized.id)
    if (options.requireExisting && !existing) throw new Error('这条训练记录已删除；草稿未重新创建，请返回查看现有记录')
    if (options.expectedFingerprint !== undefined && (!existing || workoutFingerprint(existing) !== options.expectedFingerprint)) throw new Error('训练记录已变化，请重新打开；当前草稿未覆盖已保存记录')
    await database.workouts.put(normalized)
    return normalized
  })
}
/** Name-only edit intentionally bypasses set/journal normalization. */
export async function saveWorkoutName(id: string, value: unknown, expectedFingerprint: string, database: FitLogDatabase = db): Promise<Workout> {
  const name = normalizeWorkoutName(value)
  return database.transaction('rw', database.workouts, async () => {
    const current = await database.workouts.get(id)
    if (!current || workoutFingerprint(current) !== expectedFingerprint) throw new Error('训练记录已变化，请重新打开；名称未保存')
    if (name === current.name) return current
    if (name && name.length > WORKOUT_NAME_MAX_LENGTH) throw new Error(`本次训练名称最多 ${WORKOUT_NAME_MAX_LENGTH} 个字符`)
    const saved = { ...current, updatedAt: new Date().toISOString() }
    if (name) saved.name = name
    else delete saved.name
    await database.workouts.put(saved)
    return saved
  })
}
export async function saveWorkout(workout: Workout, database: FitLogDatabase = db, options: WorkoutSaveOptions = {}): Promise<Workout> {
  const normalized = normalizeWorkoutForSave(workout)
  normalized.updatedAt = new Date().toISOString()
  return persistWorkout(normalized, database, options)
}
export async function finishWorkout(workout: Workout, database: FitLogDatabase = db, options: WorkoutSaveOptions = {}): Promise<Workout> {
  const normalized = normalizeWorkoutForSave(workout)
  if (!normalized.exercises.length || !normalized.exercises.some(exercise => exercise.sets.length)) throw new Error('请至少添加一个动作和有效组数')
  normalized.finishedAt = new Date().toISOString()
  normalized.updatedAt = normalized.finishedAt
  return persistWorkout(normalized, database, options)
}

export async function findOpenWorkout(date: string): Promise<Workout | undefined> {
  const workouts = await db.workouts.where('date').equals(date).toArray()
  return workouts.find((item) => !item.finishedAt)
}

export type WorkoutAutosaveState = 'pending' | 'saving' | 'saved' | 'error'

export class WorkoutAutosaveController {
  private timer: ReturnType<typeof setTimeout> | undefined
  private pendingWorkout: Workout | undefined
  private inFlight: Promise<void> | undefined
  private readonly persist: (workout: Workout) => Promise<unknown>
  private readonly delay: number
  private readonly onState: ((state: WorkoutAutosaveState, error?: unknown) => void) | undefined

  constructor(
    persist: (workout: Workout) => Promise<unknown>,
    delay = 400,
    onState?: (state: WorkoutAutosaveState, error?: unknown) => void,
  ) {
    this.persist = persist
    this.delay = delay
    this.onState = onState
  }

  schedule(workout: Workout): void {
    this.pendingWorkout = workout
    if (this.timer) clearTimeout(this.timer)
    this.onState?.('pending')
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.persistPending().catch(() => undefined)
    }, this.delay)
  }

  async flush(workout?: Workout): Promise<void> {
    if (workout) this.pendingWorkout = workout
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    if (this.inFlight) {
      try { await this.inFlight } catch (error) { if (!this.pendingWorkout) throw error }
    }
    await this.persistPending()
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.pendingWorkout = undefined
  }

  private async persistPending(): Promise<void> {
    const workout = this.pendingWorkout
    if (!workout) return
    this.pendingWorkout = undefined
    this.onState?.('saving')
    const operation = Promise.resolve(this.persist(workout)).then(() => undefined)
    this.inFlight = operation
    try {
      await operation
      this.onState?.('saved')
    } catch (error) {
      if (!this.pendingWorkout) this.pendingWorkout = workout
      this.onState?.('error', error)
      throw error
    } finally {
      if (this.inFlight === operation) this.inFlight = undefined
    }
  }
}
