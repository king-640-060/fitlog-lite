import type { Workout, WorkoutSet } from '../db/types'
/** Saved exercise names and sets only; unknown loads remain unknown. */
export function buildWorkoutAnalysisSummary(workouts: readonly Workout[]) {
  const rows = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const exercises = new Map<string, { exerciseName: string; sessionIds: Set<string>; totalSets: number; totalRepsKnown: number; weightedSetCount: number; volumeKgKnown: number; firstDate: string; lastDate: string; recentSets: { date: string; sets: Pick<WorkoutSet, 'weightKg' | 'reps' | 'note'>[] }[] }>()
  for (const workout of rows) for (const exercise of workout.exercises) {
    const summary = exercises.get(exercise.exerciseName) ?? { exerciseName: exercise.exerciseName, sessionIds: new Set<string>(), totalSets: 0, totalRepsKnown: 0, weightedSetCount: 0, volumeKgKnown: 0, firstDate: workout.date, lastDate: workout.date, recentSets: [] }
    summary.sessionIds.add(workout.id); summary.lastDate = workout.date; summary.totalSets += exercise.sets.length
    for (const set of exercise.sets) {
      const knownReps = Number.isFinite(set.reps) && set.reps > 0
      if (knownReps) summary.totalRepsKnown += set.reps
      if (set.weightKg !== undefined && Number.isFinite(set.weightKg)) { summary.weightedSetCount++; if (knownReps) summary.volumeKgKnown += set.weightKg * set.reps }
    }
    summary.recentSets.push({ date: workout.date, sets: exercise.sets.slice(-20).map(set => ({ weightKg: set.weightKg, reps: set.reps, note: set.note })) }); summary.recentSets = summary.recentSets.slice(-5)
    exercises.set(exercise.exerciseName, summary)
  }
  return { sessions: rows.length, trainingDays: new Set(rows.map(row => row.date)).size, firstDate: rows[0]?.date, lastDate: rows.at(-1)?.date,
    exercises: [...exercises.values()].map(({ sessionIds, ...value }) => ({ ...value, sessions: sessionIds.size, unknownWeightSetCount: value.totalSets - value.weightedSetCount })) }
}
