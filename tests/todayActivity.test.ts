import { describe, expect, it } from 'vitest'
import type { PelvicFloorSession, WeightLog } from '../src/db/types'
import { getTodayPelvicState, getTodayWeightState } from '../src/utils/todayActivity'
const stamp = '2026-09-27T08:00:00.000Z'
const weight = (date: string, weightKg: number): WeightLog => ({ id: date, date, weightKg, createdAt: stamp, updatedAt: stamp })
const pelvic = (id: string, seconds: number): PelvicFloorSession => ({ id, date: '2026-09-27', startedAt: stamp, finishedAt: new Date(Date.parse(stamp) + seconds * 1000).toISOString(), phases: [{ type: 'contract', durationSeconds: 1 }], repetitions: 1, completedRepetitions: 1, createdAt: stamp, updatedAt: stamp })

describe('Today compact activity states', () => {
  it('体重无历史与只有旧记录时状态和操作正确，未来记录不影响 Today', () => {
    expect(getTodayWeightState([], '2026-09-27')).toEqual({ status: '今日尚未记录', meta: '暂无历史记录', action: '记录体重' })
    expect(getTodayWeightState([weight('2026-09-26', 74.6), weight('2026-09-28', 90)], '2026-09-27')).toEqual({ status: '今日尚未记录', meta: '最近 74.6 kg · 09-26', action: '记录体重' })
  })
  it('今日体重仅对比最近一个更早的记录，支持更新', () => {
    expect(getTodayWeightState([weight('2026-08-01', 80), weight('2026-09-26', 74.6), weight('2026-09-27', 74.3), weight('2026-09-28', 99)], '2026-09-27')).toEqual({ status: '74.3 kg', meta: '较上次 -0.3 kg', action: '更新体重' })
    expect(getTodayWeightState([weight('2026-09-27', 74.3)], '2026-09-27').meta).toBe('今日已记录')
  })
  it('凯格尔未完成、完成一次与多次的状态和累计时长', () => {
    expect(getTodayPelvicState([], '基础阶段', '约 3 分钟')).toEqual({ status: '今日尚未完成', meta: '基础阶段 · 约 3 分钟', action: '开始训练' })
    expect(getTodayPelvicState([pelvic('a', 182)], '基础阶段', '约 3 分钟')).toEqual({ status: '今日已完成 1 次', meta: '基础阶段 · 累计 3:02', action: '再练一次' })
    expect(getTodayPelvicState([pelvic('a', 182), pelvic('b', 65)], '基础阶段', '约 3 分钟')).toEqual({ status: '今日已完成 2 次', meta: '基础阶段 · 累计 4:07', action: '再练一次' })
  })
})
