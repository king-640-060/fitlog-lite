import type { Workout } from '../db/types'
/** Manual editor limit; full legacy template snapshots remain readable and writable. */
export const WORKOUT_NAME_MAX_LENGTH = 2000
export function normalizeWorkoutName(value: unknown): string | undefined {
  if (value !== undefined && typeof value !== 'string') throw new Error('本次训练名称格式不正确')
  const name = (value ?? '').trim()
  return name || undefined
}
/** Display only: never save an inferred title into an unnamed historic record. */
export function workoutDisplayName(workout: Workout): string {
  return workout.name?.trim() || (workout.exercises.length === 1 ? workout.exercises[0]!.exerciseName : '自由训练')
}

/** Actual saved instants in the current device timezone; never write these labels back. */
export function workoutTimeFacts(workout: Workout): Array<[string,string]> {
  const format=(value:string)=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('zh-CN',{hour12:false}):'时间未知'
  return [['开始时间',format(workout.startedAt)],...(workout.finishedAt?[['完成时间',format(workout.finishedAt)] as [string,string]]:[])]
}
