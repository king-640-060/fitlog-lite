import { describe, expect, it } from 'vitest'
import { getGoalProgress } from '../src/ui/progressRing'

describe('营养目标圆环状态', () => {
  it('未设置目标不显示完成度', () => expect(getGoalProgress(379)).toMatchObject({ state: 'unset', hasGoal: false, main: 0, outer: 0 }))
  it('目标为零时避免除零与误导性进度', () => {
    expect(getGoalProgress(0, 0)).toMatchObject({ state: 'zero', main: 0, outer: 0 })
    expect(getGoalProgress(12, 0)).toMatchObject({ state: 'above', main: 1, outer: 1, excess: 12 })
  })
  it('正常进度与正好达标', () => {
    expect(getGoalProgress(379, 2200)).toMatchObject({ state: 'below', main: 379 / 2200, outer: 0 })
    expect(getGoalProgress(2200, 2200)).toMatchObject({ state: 'reached', main: 1, outer: 0 })
  })
  it('超过目标时主环保持满圈，外环封顶而精确超出量不封顶', () => {
    expect(getGoalProgress(2350, 2200)).toMatchObject({ state: 'above', main: 1, outer: 150 / 2200, excess: 150 })
    expect(getGoalProgress(4500, 2200)).toMatchObject({ state: 'above', main: 1, outer: 1, excess: 2300 })
  })
})
