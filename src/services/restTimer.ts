export interface RestTimerState {
  status: 'running' | 'paused' | 'complete'
  durationMs: number
  deadlineMs?: number
  pausedRemainingMs?: number
}

export function startRestTimer(nowMs: number, durationMs = 60_000): RestTimerState {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('休息时间必须大于 0')
  return { status: 'running', durationMs, deadlineMs: nowMs + durationMs }
}

export function getRestRemainingMs(state: RestTimerState, nowMs: number): number {
  if (state.status === 'paused') return Math.max(0, state.pausedRemainingMs ?? 0)
  if (state.status === 'running') return Math.max(0, (state.deadlineMs ?? nowMs) - nowMs)
  return 0
}

export function pauseRestTimer(state: RestTimerState, nowMs: number): RestTimerState {
  if (state.status !== 'running') return state
  return { status: 'paused', durationMs: state.durationMs, pausedRemainingMs: getRestRemainingMs(state, nowMs) }
}

export function resumeRestTimer(state: RestTimerState, nowMs: number): RestTimerState {
  if (state.status !== 'paused') return state
  return { status: 'running', durationMs: state.durationMs, deadlineMs: nowMs + (state.pausedRemainingMs ?? 0) }
}

export function extendRestTimer(state: RestTimerState, nowMs: number, addedMs = 30_000): RestTimerState {
  if (state.status === 'complete' || addedMs <= 0) return state
  const remaining = getRestRemainingMs(state, nowMs) + addedMs
  return state.status === 'paused'
    ? { status: 'paused', durationMs: state.durationMs + addedMs, pausedRemainingMs: remaining }
    : { status: 'running', durationMs: state.durationMs + addedMs, deadlineMs: nowMs + remaining }
}
