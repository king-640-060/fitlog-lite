import { describe, expect, it } from 'vitest'
import type { PelvicFloorSession } from '../src/db/types'
import { getPelvicFloorPlanProgress, pelvicFloorPlanLevels } from '../src/services/pelvicFloorPlan'
import { createPelvicFloorTimer, finishPelvicFloorTimer, pelvicFloorRoutines, startPelvicFloorTimer } from '../src/services/pelvicFloorTimer'
import { sessionFromPelvicFloorTimer } from '../src/services/pelvicFloorService'

const date = (day: number) => `2026-09-${String(day).padStart(2, '0')}`
function record(id: string, day: number, routineId = 'plan-foundation', completionType: 'completed' | 'manual' = 'completed'): PelvicFloorSession {
  const routine = pelvicFloorRoutines.find((item) => item.id === routineId)!
  const repetitions = routine.exercises.reduce((sum, item) => sum + item.repetitions * (item.sets ?? 1), 0)
  return {
    id, date: date(day), startedAt: `${date(day)}T08:00:00.000Z`, finishedAt: `${date(day)}T08:05:00.000Z`,
    phases: routine.exercises[0]!.phases, repetitions, completedRepetitions: repetitions,
    completionType, routine, createdAt: `${date(day)}T08:05:00.000Z`, updatedAt: `${date(day)}T08:05:00.000Z`,
  }
}

describe('pelvic floor progressive plan', () => {
  it('starts with Foundation only and requires seven distinct completed Foundation dates', () => {
    expect(getPelvicFloorPlanProgress([])).toMatchObject({
      foundationDays: 0, standardDays: 0, advancedDays: 0, totalDays: 0,
      unlockedLevels: ['foundation'], currentLevel: 'foundation', nextUnlock: { level: 'standard', remainingDays: 7 },
    })
    const six = Array.from({ length: 6 }, (_, index) => record(`f${index}`, index + 1))
    expect(getPelvicFloorPlanProgress(six).nextUnlock).toEqual({ level: 'standard', remainingDays: 1 })
    const seven = [...six, record('f7', 7)]
    expect(getPelvicFloorPlanProgress(seven).unlockedLevels).toEqual(['foundation', 'standard'])
    expect(getPelvicFloorPlanProgress(seven).currentLevel).toBe('foundation')
    expect(getPelvicFloorPlanProgress(seven).nextUnlock).toEqual({ level: 'advanced', remainingDays: 7 })
  })

  it('counts at most one plan session per business date, and excludes manual, specialty, and legacy sessions', () => {
    const records = [record('first', 1), record('repeat', 1), record('standard-same-day', 1, 'plan-standard'),
      record('manual', 2, 'plan-foundation', 'manual'), record('specialty', 3, 'foundation'), record('legacy', 4, 'slow')]
    expect(getPelvicFloorPlanProgress(records)).toMatchObject({ foundationDays: 1, standardDays: 0, totalDays: 1 })
    expect(getPelvicFloorPlanProgress([...records, { ...record('incomplete', 5), completedRepetitions: 1 }]).totalDays).toBe(1)
    expect(getPelvicFloorPlanProgress([{ ...record('old-name', 5, 'standard'), completionType: undefined }]).totalDays).toBe(0)
  })

  it('unlocks Advanced after seven more distinct Standard dates and leaves every unlocked stage selectable', () => {
    const foundation = Array.from({ length: 7 }, (_, index) => record(`f${index}`, index + 1))
    const standardSix = Array.from({ length: 6 }, (_, index) => record(`s${index}`, index + 8, 'plan-standard'))
    expect(getPelvicFloorPlanProgress([...foundation, ...standardSix]).nextUnlock).toEqual({ level: 'advanced', remainingDays: 1 })
    const completed = [...foundation, ...standardSix, record('s7', 14, 'plan-standard')]
    const progress = getPelvicFloorPlanProgress(completed)
    expect(progress).toMatchObject({ foundationDays: 7, standardDays: 7, advancedDays: 0, totalDays: 14, currentLevel: 'standard' })
    expect(progress.unlockedLevels).toEqual([...pelvicFloorPlanLevels])
    expect(progress.nextUnlock).toBeUndefined()
    expect(getPelvicFloorPlanProgress([...completed, record('a1', 15, 'plan-advanced')]).currentLevel).toBe('advanced')
  })

  it('retains the manually ended plan snapshot but marks it ineligible', () => {
    const routine = pelvicFloorRoutines.find((item) => item.id === 'plan-foundation')!
    const state = finishPelvicFloorTimer(startPelvicFloorTimer(createPelvicFloorTimer(routine), 0), 3000)
    const session = sessionFromPelvicFloorTimer(state, date(1), 'manual')
    expect(session).toMatchObject({ completionType: 'manual', routine: { id: 'plan-foundation', name: '基础阶段' } })
    expect(getPelvicFloorPlanProgress([session]).foundationDays).toBe(0)
  })
})
