export type PelvicFloorTimerStatus = 'ready' | 'contract' | 'relax' | 'paused' | 'completed'
export type PelvicFloorActivePhase = 'contract' | 'relax'

export interface PelvicFloorTimerConfig {
  contractSeconds: number
  relaxSeconds: number
  repetitions: number
}

export interface PelvicFloorTimerState extends PelvicFloorTimerConfig {
  status: PelvicFloorTimerStatus
  activePhase?: PelvicFloorActivePhase
  completedRepetitions: number
  startedAtMs?: number
  finishedAtMs?: number
  deadlineMs?: number
  pausedRemainingMs?: number
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label}必须是大于 0 的整数`)
  return value
}

export function createPelvicFloorTimer(config: PelvicFloorTimerConfig): PelvicFloorTimerState {
  return {
    contractSeconds: positiveInteger(config.contractSeconds, '收缩时间'),
    relaxSeconds: positiveInteger(config.relaxSeconds, '放松时间'),
    repetitions: positiveInteger(config.repetitions, '重复次数'),
    status: 'ready', completedRepetitions: 0,
  }
}

export function startPelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if (state.status !== 'ready') return state
  return { ...state, status: 'contract', activePhase: 'contract', startedAtMs: nowMs, deadlineMs: nowMs + state.contractSeconds * 1000 }
}

export function advancePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if ((state.status !== 'contract' && state.status !== 'relax') || state.deadlineMs === undefined) return state
  let next = { ...state }
  while ((next.status === 'contract' || next.status === 'relax') && next.deadlineMs !== undefined && nowMs >= next.deadlineMs) {
    if (next.status === 'contract') {
      next = { ...next, status: 'relax', activePhase: 'relax', deadlineMs: next.deadlineMs + next.relaxSeconds * 1000 }
      continue
    }
    const completedRepetitions = next.completedRepetitions + 1
    if (completedRepetitions >= next.repetitions) {
      return { ...next, status: 'completed', activePhase: undefined, completedRepetitions, deadlineMs: undefined, finishedAtMs: next.deadlineMs }
    }
    next = { ...next, status: 'contract', activePhase: 'contract', completedRepetitions, deadlineMs: next.deadlineMs + next.contractSeconds * 1000 }
  }
  return next
}

export function pausePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  const corrected = advancePelvicFloorTimer(state, nowMs)
  if ((corrected.status !== 'contract' && corrected.status !== 'relax') || corrected.deadlineMs === undefined) return corrected
  return {
    ...corrected, status: 'paused', activePhase: corrected.status,
    pausedRemainingMs: Math.max(0, corrected.deadlineMs - nowMs), deadlineMs: undefined,
  }
}

export function resumePelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  if (state.status !== 'paused' || !state.activePhase || state.pausedRemainingMs === undefined) return state
  return { ...state, status: state.activePhase, deadlineMs: nowMs + state.pausedRemainingMs, pausedRemainingMs: undefined }
}

export function finishPelvicFloorTimer(state: PelvicFloorTimerState, nowMs: number): PelvicFloorTimerState {
  const corrected = advancePelvicFloorTimer(state, nowMs)
  if (corrected.status === 'ready' || corrected.status === 'completed') return corrected
  return { ...corrected, status: 'completed', activePhase: undefined, deadlineMs: undefined, pausedRemainingMs: undefined, finishedAtMs: nowMs }
}

export function getPelvicFloorRemainingSeconds(state: PelvicFloorTimerState, nowMs: number): number {
  if (state.status === 'paused') return Math.max(0, Math.ceil((state.pausedRemainingMs ?? 0) / 1000))
  if ((state.status === 'contract' || state.status === 'relax') && state.deadlineMs !== undefined) {
    return Math.max(0, Math.ceil((state.deadlineMs - nowMs) / 1000))
  }
  if (state.status === 'ready') return state.contractSeconds
  return 0
}

export function getPelvicFloorPhaseProgress(state: PelvicFloorTimerState, nowMs: number): number {
  const durationMs = (state.activePhase === 'relax' ? state.relaxSeconds : state.contractSeconds) * 1000
  if (!durationMs || !state.activePhase) return 0
  const remainingMs = state.status === 'paused'
    ? state.pausedRemainingMs ?? durationMs
    : state.deadlineMs === undefined ? durationMs : Math.max(0, state.deadlineMs - nowMs)
  return Math.max(0, Math.min(1, 1 - remainingMs / durationMs))
}
