import { db, type FitLogDatabase } from '../db/database'
import type { PelvicFloorSession } from '../db/types'
import type { PelvicFloorTimerState } from './pelvicFloorTimer'

export function sessionFromPelvicFloorTimer(state: PelvicFloorTimerState, date: string, completionType: 'completed' | 'manual'): PelvicFloorSession {
  if (state.startedAtMs === undefined || state.finishedAtMs === undefined) throw new Error('训练尚未结束')
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), date,
    startedAt: new Date(state.startedAtMs).toISOString(), finishedAt: new Date(state.finishedAtMs).toISOString(),
    phases: structuredClone(state.routine.exercises[0]!.phases),
    repetitions: state.repetitions, completedRepetitions: state.completedRepetitions, completionType,
    routine: structuredClone(state.routine),
    createdAt: now, updatedAt: now,
  }
}

export async function savePelvicFloorSession(session: PelvicFloorSession, database: FitLogDatabase = db): Promise<PelvicFloorSession> {
  return database.transaction('rw',database.pelvicFloorSessions,async()=>{
    const existing=await database.pelvicFloorSessions.get(session.id)
    if(existing){if(JSON.stringify(existing)!==JSON.stringify(session))throw new Error('训练记录身份冲突，请保留结果并重试');return existing}
    await database.pelvicFloorSessions.add(session);return session
  })
}

export async function deletePelvicFloorSession(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.pelvicFloorSessions.delete(id)
}

export function pelvicFloorSessionDurationSeconds(session: PelvicFloorSession): number {
  return Math.max(0, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
}
