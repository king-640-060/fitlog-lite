import { describe, expect, it } from 'vitest'
import { extendRestTimer, getRestRemainingMs, pauseRestTimer, resumeRestTimer, startRestTimer } from '../src/services/restTimer'

describe('休息计时', () => {
  it('按绝对时钟计时，暂停后继续不丢失剩余时间', () => {
    const started = startRestTimer(1000)
    expect(getRestRemainingMs(started, 16_000)).toBe(45_000)
    const paused = pauseRestTimer(started, 16_000)
    expect(getRestRemainingMs(paused, 100_000)).toBe(45_000)
    const resumed = resumeRestTimer(paused, 100_000)
    expect(getRestRemainingMs(resumed, 110_000)).toBe(35_000)
  })

  it('运行和暂停时均可增加 30 秒', () => {
    const running = extendRestTimer(startRestTimer(0), 15_000)
    expect(getRestRemainingMs(running, 15_000)).toBe(75_000)
    const paused = extendRestTimer(pauseRestTimer(running, 20_000), 100_000)
    expect(getRestRemainingMs(paused, 200_000)).toBe(100_000)
  })
})
