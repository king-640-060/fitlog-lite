import { db, type FitLogDatabase } from '../db/database'
import type { Exercise, Workout, WorkoutSet } from '../db/types'
import { finiteNumber, optionalNumber, requiredText } from '../utils/validation'

export async function saveExercise(nameValue: unknown, notesValue?: unknown, id?: string): Promise<Exercise> {
  const name = requiredText(nameValue, '动作名称')
  const notes = String(notesValue ?? '').trim() || undefined
  const now = new Date().toISOString()
  const existing = id ? await db.exercises.get(id) : undefined
  const exercise: Exercise = { id: id ?? crypto.randomUUID(), name, notes, createdAt: existing?.createdAt ?? now, updatedAt: now }
  await db.exercises.put(exercise)
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
    note: String(workout.note ?? '').trim() || undefined,
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

export async function createWorkout(date: string): Promise<Workout> {
  const now = new Date().toISOString()
  const workout: Workout = { id: crypto.randomUUID(), date, startedAt: now, exercises: [], createdAt: now, updatedAt: now }
  await db.workouts.add(workout)
  return workout
}

export async function saveWorkout(workout: Workout, database: FitLogDatabase = db): Promise<Workout> {
  const normalized = normalizeWorkoutForSave(workout)
  normalized.updatedAt = new Date().toISOString()
  await database.workouts.put(normalized)
  return normalized
}

export async function finishWorkout(workout: Workout, database: FitLogDatabase = db): Promise<Workout> {
  const normalized = normalizeWorkoutForSave(workout)
  if (!normalized.exercises.length) throw new Error('请至少添加一个动作')
  normalized.finishedAt = new Date().toISOString()
  normalized.updatedAt = normalized.finishedAt
  await database.workouts.put(normalized)
  return normalized
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
