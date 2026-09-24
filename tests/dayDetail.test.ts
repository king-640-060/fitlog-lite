import { describe, expect, it } from 'vitest'
import type { CardioSession, PelvicFloorSession, Workout } from '../src/db/types'
import type { CalendarDaySummary } from '../src/ui/calendarPage'
import { buildCalendarDayDetailRows } from '../src/ui/dayDetail'

const at = '2026-09-24T08:00:00.000Z'
const empty: CalendarDaySummary = {
  date: '2026-09-24', foodLogCount: 0, hasWorkout: false, workoutCount: 0, setCount: 0,
  cardioCount: 0, cardioMinutes: 0, pelvicFloorSessionCount: 0, pelvicFloorContractions: 0, pelvicFloorSeconds: 0,
}
const workout = (id: string, setCount: number): Workout => ({
  id, date: empty.date, startedAt: at, finishedAt: '2026-09-24T09:00:00.000Z',
  exercises: [{ id: id + '-exercise', exerciseName: '深蹲', sets: Array.from({ length: setCount }, (_, index) => ({ id: id + '-set-' + index, weightKg: 80, reps: 8, rpe: 9 })) }],
  createdAt: at, updatedAt: at,
})
const cardio = (id: string, minutes: number): CardioSession => ({
  id, date: empty.date, durationMinutes: minutes, speed: 6.5, createdAt: at, updatedAt: at,
})
const pelvic = (id: string, seconds: number, name = '标准阶段'): PelvicFloorSession => ({
  id, date: empty.date, startedAt: at, finishedAt: new Date(Date.parse(at) + seconds * 1000).toISOString(),
  phases: [], repetitions: 1, completedRepetitions: 1,
  routine: { id: 'plan-standard', name, description: '', exercises: [] }, createdAt: at, updatedAt: at,
})
const rows = (summary: CalendarDaySummary | undefined = empty, workouts: Workout[] = [], cardioSessions: CardioSession[] = [], pelvicSessions: PelvicFloorSession[] = []) =>
  buildCalendarDayDetailRows(summary, workouts, cardioSessions, pelvicSessions)

describe('Calendar 日期详情统一信息模型', () => {
  it('五类空状态共用相同的类别、主值、次级信息结构', () => {
    const result = rows()
    expect(result.map(({ key, label, primary, secondary, empty: isEmpty }) => [key, label, primary, secondary, isEmpty])).toEqual([
      ['food', '饮食', '未记录', [], true],
      ['strength', '无氧训练', '未训练', [], true],
      ['cardio', '有氧训练', '未训练', [], true],
      ['pelvic', '凯格尔训练', '未训练', [], true],
      ['weight', '体重', '未记录', [], true],
    ])
    expect(result.map((item) => item.accessibleLabel)).toEqual(['饮食，未记录', '无氧训练，未训练', '有氧训练，未训练', '凯格尔训练，未训练', '体重，未记录'])
  })

  it('饮食和营养目标独立表达，包括只有目标与两者都有', () => {
    expect(rows({ ...empty, nutritionTarget: { id: 'target', date: empty.date, calories: 2300, createdAt: at, updatedAt: at } })[0]).toMatchObject({
      primary: '未记录', secondary: ['目标 2300 kcal'],
    })
    const food = rows({ ...empty, foodLogCount: 1, calories: 2180, protein: 145, carbs: 220, fat: 68 })[0]!
    expect(food.primary).toBe('2180 kcal')
    expect(food.secondary[0]?.replaceAll('\u00a0', ' ')).toBe('蛋白质 145g · 碳水 220g · 脂肪 68g')
    expect(food.accessibleLabel).toContain('蛋白质 145 克')
    expect(rows({ ...empty, foodLogCount: 1, calories: 2180, nutritionTarget: { id: 'target', date: empty.date, calories: 2300, createdAt: at, updatedAt: at } })[0]?.secondary).toEqual(['目标 2300 kcal'])
  })

  it('力量只显示动作和组数，单次及多次都不显示 elapsed duration 或旧 RPE', () => {
    const single = rows(empty, [workout('a', 3)])[1]!
    expect(single).toMatchObject({ primary: '3 组', secondary: ['1 个动作'] })
    const multi = rows(empty, [workout('a', 3), workout('b', 2)])[1]!
    expect(multi).toMatchObject({ primary: '2 次', secondary: ['5 组 · 2 个动作'] })
    expect(JSON.stringify([single, multi])).not.toMatch(/分钟|RPE|rpe|9:00/)
  })

  it('有氧显示真实手工记录的时间和速度，多条显示总时间', () => {
    expect(rows(empty, [], [cardio('a', 25)])[2]).toMatchObject({ primary: '25 分钟', secondary: ['速度 6.5'] })
    expect(rows(empty, [], [cardio('a', 25), cardio('b', 20)])[2]).toMatchObject({ primary: '2 次', secondary: ['共 45 分钟'] })
  })

  it('凯格尔显示真实 routine 和 session 时长，多条显示累计时长', () => {
    expect(rows(empty, [], [], [pelvic('a', 235)])[3]).toMatchObject({ primary: '标准阶段', secondary: ['3:55'], accessibleLabel: '凯格尔训练，标准阶段，3 分 55 秒' })
    expect(rows(empty, [], [], [pelvic('a', 235), pelvic('b', 240, '耐力保持')])[3]).toMatchObject({ primary: '2 次', secondary: ['累计 7:55'] })
  })

  it('体重仅显示当日公斤值，所有数据齐全时仍只有五行', () => {
    const result = rows({ ...empty, foodLogCount: 1, calories: 2180, weightKg: 72.4 }, [workout('a', 3)], [cardio('a', 25)], [pelvic('a', 235)])
    expect(result).toHaveLength(5)
    expect(result[4]).toMatchObject({ primary: '72.4 kg', secondary: [], accessibleLabel: '体重，72.4 千克' })
  })
})
