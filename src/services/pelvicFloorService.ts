import { db, type FitLogDatabase } from '../db/database'
import type { PelvicFloorSession } from '../db/types'
import type { PelvicFloorTimerState } from './pelvicFloorTimer'

export function sessionFromPelvicFloorTimer(state: PelvicFloorTimerState, date: string): PelvicFloorSession {
  if (state.startedAtMs === undefined || state.finishedAtMs === undefined) throw new Error('训练尚未结束')
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), date,
    startedAt: new Date(state.startedAtMs).toISOString(), finishedAt: new Date(state.finishedAtMs).toISOString(),
    phases: [
      { type: 'contract', durationSeconds: state.contractSeconds },
      { type: 'relax', durationSeconds: state.relaxSeconds },
    ],
    repetitions: state.repetitions, completedRepetitions: state.completedRepetitions,
    createdAt: now, updatedAt: now,
  }
}

export async function savePelvicFloorSession(session: PelvicFloorSession, database: FitLogDatabase = db): Promise<void> {
  await database.pelvicFloorSessions.add(session)
}

export function pelvicFloorSessionDurationSeconds(session: PelvicFloorSession): number {
  return Math.max(0, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
}
