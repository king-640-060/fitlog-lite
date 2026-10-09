import type { Workout, WorkoutSet } from '../db/types'
import type { ReportRange } from './reporting'

export interface PerformanceSession {
  workoutId: string; date: string; finishedAt: string; name: string; sets: WorkoutSet[]
  recordedSets: number; weightedSets: number; omittedSets: number; volume?: number; highestWeight?: number; highestWeightReps?: number
}
export interface PerformanceChange { kind: 'weight'|'reps'; condition: number; previous: number; current: number; delta: number; percentage?: number }
export interface PerformanceRecord { kind: 'load'|'weight'|'reps'; condition?: number; previous?: number; current: number; newRecord: boolean }
export interface ExercisePerformance {
  key: string; name: string; reliable: boolean; history: PerformanceSession[]; current?: PerformanceSession; baseline?: PerformanceSession
  changes: PerformanceChange[]; status: 'first'|'unreliable'|'no-history'|'changed'|'improved'|'stable'|'declined'|'mixed'
  records: PerformanceRecord[]
}
export function validRecordedSet(set: WorkoutSet): boolean {
  return Number.isFinite(set.reps) && Number.isInteger(set.reps) && set.reps > 0 && (set.weightKg === undefined || Number.isFinite(set.weightKg) && set.weightKg >= 0)
}
export function completedWorkout(workout: Workout): boolean {
  return !!workout.finishedAt && Number.isFinite(Date.parse(workout.finishedAt)) && Number.isFinite(Date.parse(workout.startedAt)) && Date.parse(workout.finishedAt) >= Date.parse(workout.startedAt)
}
export function normalizeExerciseName(name: string): string { return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase() }
function best(sets: WorkoutSet[], kind: 'weight'|'reps'): Map<number, number> {
  const result = new Map<number, number>()
  for (const s of sets) if(s.weightKg!==undefined) { const key=kind==='weight'?s.reps:s.weightKg, value=kind==='weight'?s.weightKg:s.reps; result.set(key, Math.max(result.get(key)??-Infinity,value)) }
  return result
}
export function compareSessions(previous: PerformanceSession, current: PerformanceSession): PerformanceChange[] {
  return (['weight','reps'] as const).flatMap(kind=>{
    const a=best(previous.sets,kind),b=best(current.sets,kind)
    return [...b].filter(([condition])=>a.has(condition)).sort(([a],[b])=>b-a).map(([condition,value])=>{
      const before=a.get(condition)!,delta=value-before
      return {kind,condition,previous:before,current:value,delta,...(kind==='weight'&&before>0?{percentage:delta/before*100}:{})}
    })
  })
}
/** One grouping pass over actual history. No name mutation, estimation, or persistence. */
export function analyzeExercisePerformance(workouts: Workout[], range: ReportRange): ExercisePerformance[] {
  const completed=workouts.filter(w=>w.date<=range.end&&completedWorkout(w)).sort((a,b)=>a.date.localeCompare(b.date)||Date.parse(a.finishedAt!)-Date.parse(b.finishedAt!)||a.id.localeCompare(b.id))
  const idsByName=new Map<string, Set<string>>()
  for(const w of completed)for(const e of w.exercises)if(e.exerciseId){const name=normalizeExerciseName(e.exerciseName);let ids=idsByName.get(name);if(!ids)idsByName.set(name,ids=new Set());ids.add(e.exerciseId)}
  const groups=new Map<string, ExercisePerformance>()
  for(const w of completed) {
    const sessions=new Map<string,{name:string;sets:WorkoutSet[];omitted:number;reliable:boolean}>()
    for(const e of w.exercises){
      const name=normalizeExerciseName(e.exerciseName),ids=idsByName.get(name),reliable=!!e.exerciseId||!!name&&(!ids||ids.size<=1)
      const key=e.exerciseId?`id:${e.exerciseId}`:ids?.size===1?`id:${[...ids][0]}`:`legacy:${name}`
      if(!name&&!e.exerciseId)continue
      let session=sessions.get(key);if(!session)sessions.set(key,session={name:e.exerciseName,sets:[],omitted:0,reliable})
      for(const s of e.sets){if(validRecordedSet(s))session.sets.push({...s});else session.omitted++}
    }
    for(const [key,s] of sessions){if(!s.sets.length)continue
      const weighted=s.sets.filter(set=>set.weightKg!==undefined),highestWeight=weighted.length?Math.max(...weighted.map(set=>set.weightKg!)):undefined
      const fact:PerformanceSession={workoutId:w.id,date:w.date,finishedAt:w.finishedAt!,name:s.name,sets:s.sets,recordedSets:s.sets.length,weightedSets:weighted.length,omittedSets:s.omitted,
        ...(weighted.length?{volume:weighted.reduce((n,set)=>n+set.weightKg!*set.reps,0),highestWeight,highestWeightReps:Math.max(...weighted.filter(set=>set.weightKg===highestWeight).map(set=>set.reps))}:{})}
      let group=groups.get(key);if(!group)groups.set(key,group={key,name:s.name,reliable:s.reliable,history:[],changes:[],status:'no-history',records:[]})
      group.name=s.name;group.history.push(fact)
    }
  }
  for(const group of groups.values()) {
    const current=group.history.filter(s=>s.date>=range.start&&s.date<=range.end).at(-1);group.current=current
    if(!current)continue
    const before=group.history.slice(0,group.history.indexOf(current))
    if(!group.reliable){group.status='unreliable';continue}
    if(!before.length){group.status='first'}else{
      const baseline=before.toReversed().find(s=>compareSessions(s,current).length)
      group.baseline=baseline;group.changes=baseline?compareSessions(baseline,current):[]
      if(!baseline)group.status=current.weightedSets&&before.some(s=>s.weightedSets)?'changed':'no-history'
      else {const up=group.changes.some(c=>c.delta>0),down=group.changes.some(c=>c.delta<0);group.status=up&&down?'mixed':up?'improved':down?'declined':'stable'}
    }
    const oldSets=before.flatMap(s=>s.sets).filter(s=>s.weightKg!==undefined),oldLoad=oldSets.length?Math.max(...oldSets.map(s=>s.weightKg!)):undefined
    if(current.highestWeight!==undefined)group.records.push({kind:'load',current:current.highestWeight,previous:oldLoad,newRecord:oldLoad!==undefined&&current.highestWeight>oldLoad})
    for(const kind of ['weight','reps'] as const){const old=best(oldSets,kind),now=best(current.sets,kind);for(const [condition,value] of now){const previous=old.get(condition);group.records.push({kind,condition,current:value,previous,newRecord:previous!==undefined&&value>previous})}}
  }
  return [...groups.values()].sort((a,b)=>Number(!!b.current)-Number(!!a.current)||a.name.localeCompare(b.name))
}
