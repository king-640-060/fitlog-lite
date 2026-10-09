import type { Workout } from '../db/types'
import { completedWorkout, validRecordedSet } from './exercisePerformanceAnalysis'
import type { ReportRange } from './reporting'
export function trainingVolumeAnalysis(workouts:Workout[],range:ReportRange) {
  const sessions=workouts.filter(w=>completedWorkout(w)&&w.date>=range.start&&w.date<=range.end)
  const sets=sessions.flatMap(w=>w.exercises.flatMap(e=>e.sets)),valid=sets.filter(validRecordedSet),weighted=valid.filter(s=>s.weightKg!==undefined)
  const dates=[...new Set(sessions.map(w=>w.date))].sort()
  return {sessions:sessions.length,dates,days:dates.length,recordedSets:valid.length,weightedSets:weighted.length,omittedSets:sets.length-valid.length,volume:weighted.length?weighted.reduce((n,s)=>n+s.weightKg!*s.reps,0):undefined}
}
