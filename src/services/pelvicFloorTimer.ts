import type { PelvicFloorPhase } from '../db/types'

export interface PelvicFloorExercise {
  id: string
  name: string
  phases: PelvicFloorPhase[]
  repetitions: number
  sets?: number
  restBetweenSetsSeconds?: number
  restAfterSeconds?: number
}

export interface PelvicFloorRoutine {
  id: string
  name: string
  description: string
  exercises: PelvicFloorExercise[]
}

export const pelvicFloorRoutines: PelvicFloorRoutine[] = [
  { id: 'slow', name: '慢速耐力', description: '练习逐步收紧与充分放松', exercises: [
    { id: 'slow', name: '慢速耐力', repetitions: 10, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 5 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 5 },
    ] },
  ] },
  { id: 'quick', name: '快速收缩', description: '练习快速收紧与完全放松', exercises: [
    { id: 'quick', name: '快速收缩', repetitions: 12, phases: [
      { type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 },
    ] },
  ] },
  { id: 'mixed', name: '混合训练', description: '慢速与快速练习组合', exercises: [
    { id: 'slow', name: '慢速耐力', repetitions: 10, restAfterSeconds: 10, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 5 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 5 },
    ] },
    { id: 'quick', name: '快速收缩', repetitions: 12, phases: [
      { type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 },
    ] },
  ] },
  { id: 'standard', name: '标准训练', description: '耐力保持与快速脉冲，适合日常练习', exercises: [
    { id: 'endurance', name: '耐力保持', repetitions: 8, restAfterSeconds: 10, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 6 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 5 },
    ] },
    { id: 'pulse', name: '快速脉冲', repetitions: 15, phases: [
      { type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 },
    ] },
  ] },
  { id: 'foundation', name: '基础控制', description: '完整收紧与放松', exercises: [
    { id: 'foundation', name: '基础控制', repetitions: 12, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 2 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 4 },
    ] },
  ] },
  { id: 'endurance', name: '耐力保持', description: '持续保持控制', exercises: [
    { id: 'endurance', name: '耐力保持', repetitions: 12, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 6 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 5 },
    ] },
  ] },
  { id: 'pulse', name: '快速脉冲', description: '快速收放练习', exercises: [
    { id: 'pulse', name: '快速脉冲', repetitions: 25, phases: [
      { type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 },
    ] },
  ] },
  { id: 'combined', name: '综合训练', description: '多节奏组合', exercises: [
    { id: 'foundation', name: '基础控制', repetitions: 8, restAfterSeconds: 10, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 2 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 4 },
    ] },
    { id: 'endurance', name: '耐力保持', repetitions: 6, restAfterSeconds: 10, phases: [
      { type: 'contract', durationSeconds: 2 }, { type: 'hold', durationSeconds: 6 },
      { type: 'release', durationSeconds: 2 }, { type: 'relax', durationSeconds: 5 },
    ] },
    { id: 'pulse', name: '快速脉冲', repetitions: 20, phases: [
      { type: 'contract', durationSeconds: 1 }, { type: 'relax', durationSeconds: 1 },
    ] },
  ] },
]

export function getPelvicFloorRoutineDurationSeconds(routine: PelvicFloorRoutine): number {
  return routine.exercises.reduce((total, exercise, index) => total
    + exercise.phases.reduce((seconds, phase) => seconds + phase.durationSeconds, 0) * exercise.repetitions * (exercise.sets ?? 1)
    + Math.max(0, (exercise.sets ?? 1) - 1) * (exercise.restBetweenSetsSeconds ?? 0)
    + (index < routine.exercises.length - 1 ? exercise.restAfterSeconds ?? 0 : 0), 0)
}

export type PelvicFloorTimerStatus = 'ready' | 'running' | 'paused' | 'completed'
export type PelvicFloorActivePhase = PelvicFloorPhase['type']
export interface PelvicFloorTimerConfig { contractSeconds: number; relaxSeconds: number; repetitions: number }

export interface PelvicFloorTimerState {
  routine: PelvicFloorRoutine
  status: PelvicFloorTimerStatus
  activePhase?: PelvicFloorActivePhase
  exerciseIndex: number
  setIndex: number
  repetitionIndex: number
  phaseIndex: number
  restKind?: 'set' | 'exercise'
  completedRepetitions: number
  repetitions: number
  startedAtMs?: number
  finishedAtMs?: number
  deadlineMs?: number
  pausedRemainingMs?: number
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label}必须是大于 0 的整数`)
  return value
}

function validateRoutine(routine: PelvicFloorRoutine): PelvicFloorRoutine {
  if (!routine.exercises.length) throw new Error('训练方案至少需要一个动作')
  for (const exercise of routine.exercises) {
    positiveInteger(exercise.repetitions, '重复次数')
    if (exercise.sets !== undefined) positiveInteger(exercise.sets, '组数')
    if (exercise.restBetweenSetsSeconds !== undefined) positiveInteger(exercise.restBetweenSetsSeconds, '组间休息')
    if (exercise.restAfterSeconds !== undefined) positiveInteger(exercise.restAfterSeconds, '动作间休息')
    if (!exercise.phases.length) throw new Error('动作至少需要一个阶段')
    exercise.phases.forEach((phase) => positiveInteger(phase.durationSeconds, '阶段时间'))
  }
  return structuredClone(routine)
}

export function createPelvicFloorTimer(config: PelvicFloorRoutine | PelvicFloorTimerConfig): PelvicFloorTimerState {
  const routine = 'exercises' in config ? config : {
    id: 'basic', name: '基础训练', description: '收缩与放松', exercises: [{
      id: 'basic', name: '基础训练', repetitions: positiveInteger(config.repetitions, '重复次数'), phases: [
        { type: 'contract' as const, durationSeconds: positiveInteger(config.contractSeconds, '收缩时间') },
        { type: 'relax' as const, durationSeconds: positiveInteger(config.relaxSeconds, '放松时间') },
      ],
    }],
  }
  const validated = validateRoutine(routine)
  return { routine: validated, status: 'ready', exerciseIndex: 0, setIndex: 0, repetitionIndex: 0, phaseIndex: 0,
    completedRepetitions: 0, repetitions: validated.exercises.reduce((total, item) => total + item.repetitions * (item.sets ?? 1), 0) }
}

function currentDurationMs(state: PelvicFloorTimerState): number {
  const exercise = state.routine.exercises[state.exerciseIndex]!
  if (state.restKind === 'set') return (exercise.restBetweenSetsSeconds ?? 0) * 1000
  if (state.restKind === 'exercise') return (exercise.restAfterSeconds ?? 0) * 1000
  return exercise.phases[state.phaseIndex]!.durationSeconds * 1000
}

export function startPelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if (state.status !== 'ready') return state
  return { ...state, status: 'running', activePhase: state.routine.exercises[0]!.phases[0]!.type,
    startedAtMs: nowMs, deadlineMs: nowMs + currentDurationMs(state) }
}

export function advancePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if (state.status !== 'running' || state.deadlineMs === undefined) return state
  let next = state
  while (next.status === 'running' && next.deadlineMs !== undefined && nowMs >= next.deadlineMs) {
    const boundary = next.deadlineMs
    const exercise = next.routine.exercises[next.exerciseIndex]!
    if (next.restKind === 'set') {
      next = { ...next, restKind: undefined, setIndex: next.setIndex + 1, repetitionIndex: 0, phaseIndex: 0, activePhase: exercise.phases[0]!.type }
    } else if (next.restKind === 'exercise') {
      const nextExerciseIndex = next.exerciseIndex + 1
      next = { ...next, restKind: undefined, exerciseIndex: nextExerciseIndex, setIndex: 0, repetitionIndex: 0, phaseIndex: 0,
        activePhase: next.routine.exercises[nextExerciseIndex]!.phases[0]!.type }
    } else if (next.phaseIndex + 1 < exercise.phases.length) {
      const phaseIndex = next.phaseIndex + 1
      next = { ...next, phaseIndex, activePhase: exercise.phases[phaseIndex]!.type }
    } else {
      const completedRepetitions = next.completedRepetitions + 1
      if (next.repetitionIndex + 1 < exercise.repetitions) {
        next = { ...next, completedRepetitions, repetitionIndex: next.repetitionIndex + 1, phaseIndex: 0, activePhase: exercise.phases[0]!.type }
      } else if (next.setIndex + 1 < (exercise.sets ?? 1)) {
        if (exercise.restBetweenSetsSeconds) next = { ...next, completedRepetitions, restKind: 'set', activePhase: 'rest' }
        else next = { ...next, completedRepetitions, setIndex: next.setIndex + 1, repetitionIndex: 0, phaseIndex: 0, activePhase: exercise.phases[0]!.type }
      } else if (next.exerciseIndex + 1 < next.routine.exercises.length) {
        if (exercise.restAfterSeconds) next = { ...next, completedRepetitions, restKind: 'exercise', activePhase: 'rest' }
        else next = { ...next, completedRepetitions, exerciseIndex: next.exerciseIndex + 1, setIndex: 0, repetitionIndex: 0, phaseIndex: 0, activePhase: next.routine.exercises[next.exerciseIndex + 1]!.phases[0]!.type }
      } else return { ...next, completedRepetitions, status: 'completed', activePhase: undefined, deadlineMs: undefined, finishedAtMs: boundary }
    }
    next = { ...next, deadlineMs: boundary + currentDurationMs(next) }
  }
  return next
}

export function pausePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  const corrected = advancePelvicFloorTimer(state, nowMs)
  if (corrected.status !== 'running' || corrected.deadlineMs === undefined) return corrected
  return { ...corrected, status: 'paused', pausedRemainingMs: Math.max(0, corrected.deadlineMs - nowMs), deadlineMs: undefined }
}

export function resumePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if (state.status !== 'paused' || state.pausedRemainingMs === undefined) return state
  return { ...state, status: 'running', deadlineMs: nowMs + state.pausedRemainingMs, pausedRemainingMs: undefined }
}

export function finishPelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  const corrected = advancePelvicFloorTimer(state, nowMs)
  if (corrected.status === 'ready' || corrected.status === 'completed') return corrected
  return { ...corrected, status: 'completed', activePhase: undefined, deadlineMs: undefined, pausedRemainingMs: undefined, finishedAtMs: nowMs }
}

export function getPelvicFloorRemainingSeconds(state: PelvicFloorTimerState, nowMs: number): number {
  if (state.status === 'paused') return Math.max(0, Math.ceil((state.pausedRemainingMs ?? 0) / 1000))
  if (state.status === 'running' && state.deadlineMs !== undefined) return Math.max(0, Math.ceil((state.deadlineMs - nowMs) / 1000))
  if (state.status === 'ready') return state.routine.exercises[0]!.phases[0]!.durationSeconds
  return 0
}

export function getPelvicFloorPhaseProgress(state: PelvicFloorTimerState, nowMs: number): number {
  if (state.status !== 'running' && state.status !== 'paused') return 0
  const durationMs = currentDurationMs(state)
  const remainingMs = state.status === 'paused' ? state.pausedRemainingMs ?? durationMs : Math.max(0, (state.deadlineMs ?? nowMs) - nowMs)
  return Math.max(0, Math.min(1, 1 - remainingMs / durationMs))
}
