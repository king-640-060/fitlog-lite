import { db } from '../db/database'
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

export async function createWorkout(date: string): Promise<Workout> {
  const now = new Date().toISOString()
  const workout: Workout = { id: crypto.randomUUID(), date, startedAt: now, exercises: [], createdAt: now, updatedAt: now }
  await db.workouts.add(workout)
  return workout
}

export async function saveWorkout(workout: Workout): Promise<void> {
  workout.updatedAt = new Date().toISOString()
  await db.workouts.put(workout)
}

export async function findOpenWorkout(date: string): Promise<Workout | undefined> {
  const workouts = await db.workouts.where('date').equals(date).toArray()
  return workouts.find((item) => !item.finishedAt)
}
