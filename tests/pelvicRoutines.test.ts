import { describe, expect, it } from 'vitest'
import {
  advancePelvicFloorTimer, createPelvicFloorTimer, getPelvicFloorRoutineDurationSeconds,
  pausePelvicFloorTimer, pelvicFloorRoutines, resumePelvicFloorTimer, startPelvicFloorTimer,
} from '../src/services/pelvicFloorTimer'

describe('pelvic floor routine presets', () => {
  const expected = [
    ['standard', '标准训练', 160],
    ['foundation', '基础控制', 120],
    ['endurance', '耐力保持', 180],
    ['pulse', '快速脉冲', 50],
    ['combined', '综合训练', 230],
  ] as const

  it.each(expected)('%s keeps valid phases, displays its derived duration, and completes with the existing timer', (id, name, seconds) => {
    const routine = pelvicFloorRoutines.find((item) => item.id === id)!
    expect(routine.name).toBe(name)
    expect(routine.exercises.every((exercise) => exercise.repetitions > 0 && exercise.phases.length > 0 && exercise.phases.every((phase) => phase.durationSeconds > 0))).toBe(true)
    expect(getPelvicFloorRoutineDurationSeconds(routine)).toBe(seconds)
    const started = startPelvicFloorTimer(createPelvicFloorTimer(routine), 0)
    expect(started.status).toBe('running')
    const paused = pausePelvicFloorTimer(started, 500)
    expect(paused.status).toBe('paused')
    const resumed = resumePelvicFloorTimer(paused, 1000)
    expect(resumed.status).toBe('running')
    expect(advancePelvicFloorTimer(resumed, (seconds + 1) * 1000)).toMatchObject({
      status: 'completed', finishedAtMs: seconds * 1000 + 500,
    })
  })

  it('counts set rests and only rests between exercises', () => {
    expect(getPelvicFloorRoutineDurationSeconds({ id: 'sets', name: '组', description: '', exercises: [
      { id: 'a', name: '动作', repetitions: 2, sets: 3, restBetweenSetsSeconds: 4, restAfterSeconds: 7, phases: [
        { type: 'contract', durationSeconds: 2 }, { type: 'relax', durationSeconds: 3 },
      ] },
      { id: 'b', name: '末尾', repetitions: 1, restAfterSeconds: 99, phases: [{ type: 'relax', durationSeconds: 1 }] },
    ] })).toBe(46)
  })

  it('keeps legacy routine names for existing session snapshots', () => {
    expect(pelvicFloorRoutines.slice(0, 3).map((routine) => routine.name)).toEqual(['慢速耐力', '快速收缩', '混合训练'])
    const legacy = createPelvicFloorTimer({ contractSeconds: 3, relaxSeconds: 3, repetitions: 10 })
    expect(legacy.routine.name).toBe('基础训练')
    expect(createPelvicFloorTimer(pelvicFloorRoutines[0]!).routine.name).toBe('慢速耐力')
  })
})
