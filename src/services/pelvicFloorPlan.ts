import type { PelvicFloorSession } from '../db/types'

export const pelvicFloorPlanLevels = ['foundation', 'standard', 'advanced'] as const
export type PelvicFloorPlanLevel = typeof pelvicFloorPlanLevels[number]

const planIds: Record<PelvicFloorPlanLevel, string> = {
  foundation: 'plan-foundation', standard: 'plan-standard', advanced: 'plan-advanced',
}

export function pelvicFloorPlanLevelFromId(id: string | undefined): PelvicFloorPlanLevel | undefined {
  return pelvicFloorPlanLevels.find((level) => planIds[level] === id)
}

export function pelvicFloorPlanRoutineId(level: PelvicFloorPlanLevel): string {
  return planIds[level]
}

export interface PelvicFloorPlanProgress {
  foundationDays: number
  standardDays: number
  advancedDays: number
  totalDays: number
  unlockedLevels: PelvicFloorPlanLevel[]
  currentLevel: PelvicFloorPlanLevel
  nextUnlock?: { level: 'standard' | 'advanced'; remainingDays: number }
}

export function getPelvicFloorPlanProgress(sessions: readonly PelvicFloorSession[]): PelvicFloorPlanProgress {
  const completed = sessions
    .filter((session) => session.completionType === 'completed'
      && session.completedRepetitions === session.repetitions
      && pelvicFloorPlanLevelFromId(session.routine?.id) !== undefined)
    .sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.id.localeCompare(b.id))
  const countedDates = new Set<string>()
  const days = { foundation: 0, standard: 0, advanced: 0 }
  for (const session of completed) {
    if (countedDates.has(session.date)) continue
    countedDates.add(session.date)
    days[pelvicFloorPlanLevelFromId(session.routine!.id)!] += 1
  }
  const unlockedLevels: PelvicFloorPlanLevel[] = ['foundation']
  if (days.foundation >= 7) unlockedLevels.push('standard')
  if (days.foundation >= 7 && days.standard >= 7) unlockedLevels.push('advanced')
  const latest = completed.at(-1)
  const latestLevel = pelvicFloorPlanLevelFromId(latest?.routine?.id)
  const currentLevel = latestLevel && unlockedLevels.includes(latestLevel) ? latestLevel : 'foundation'
  const nextUnlock = days.foundation < 7
    ? { level: 'standard' as const, remainingDays: 7 - days.foundation }
    : days.standard < 7
      ? { level: 'advanced' as const, remainingDays: 7 - days.standard }
      : undefined
  return {
    foundationDays: days.foundation, standardDays: days.standard, advancedDays: days.advanced,
    totalDays: countedDates.size, unlockedLevels, currentLevel, nextUnlock,
  }
}
