import type { CardioSession, PelvicFloorSession, Workout } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from '../services/pelvicFloorService'
import { formatNumber } from '../utils/nutrition'
import type { CalendarDaySummary } from './calendarPage'

export interface CalendarDayDetailRow {
  key: 'food' | 'strength' | 'cardio' | 'pelvic' | 'weight'
  label: string
  primary: string
  secondary: string[]
  accessibleLabel: string
  empty: boolean
}

function duration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function spokenDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
}

function row(key: CalendarDayDetailRow['key'], label: string, primary: string, secondary: string[] = [], empty = false, spoken?: string): CalendarDayDetailRow {
  return { key, label, primary, secondary, accessibleLabel: [label, spoken ?? primary, ...secondary].join('，'), empty }
}

export function buildCalendarDayDetailRows(
  summary: CalendarDaySummary | undefined,
  workouts: Workout[],
  cardioSessions: CardioSession[],
  pelvicSessions: PelvicFloorSession[],
): CalendarDayDetailRow[] {
  const target = summary?.nutritionTarget
  const macros = [
    summary?.protein === undefined ? undefined : `蛋白质\u00a0${formatNumber(summary.protein)}g`,
    summary?.carbs === undefined ? undefined : `碳水\u00a0${formatNumber(summary.carbs)}g`,
    summary?.fat === undefined ? undefined : `脂肪\u00a0${formatNumber(summary.fat)}g`,
  ].filter((value): value is string => Boolean(value))
  const spokenMacros = [
    summary?.protein === undefined ? undefined : `蛋白质 ${formatNumber(summary.protein)} 克`,
    summary?.carbs === undefined ? undefined : `碳水 ${formatNumber(summary.carbs)} 克`,
    summary?.fat === undefined ? undefined : `脂肪 ${formatNumber(summary.fat)} 克`,
  ].filter((value): value is string => Boolean(value))
  const targetDetails = [
    target?.calories === undefined ? undefined : `${formatNumber(target.calories)} kcal`,
    target?.protein === undefined ? undefined : `蛋白质 ${formatNumber(target.protein)}g`,
    target?.carbs === undefined ? undefined : `碳水 ${formatNumber(target.carbs)}g`,
    target?.fat === undefined ? undefined : `脂肪 ${formatNumber(target.fat)}g`,
  ].filter((value): value is string => Boolean(value))
  const targetLine = targetDetails.length ? `目标 ${targetDetails.join(' · ')}` : undefined
  const foodRecorded = Boolean(summary?.foodLogCount)
  const foodPrimary = foodRecorded ? `${formatNumber(summary?.calories ?? 0)} kcal` : '未记录'
  const foodSecondary = [...(foodRecorded && macros.length ? [macros.join(' · ')] : []), ...(targetLine ? [targetLine] : [])]
  const food = row('food', '饮食', foodPrimary, foodSecondary, !foodRecorded)
  food.accessibleLabel = ['饮食', foodRecorded ? `${formatNumber(summary?.calories ?? 0)} 千卡` : '未记录', ...(foodRecorded ? spokenMacros : []), ...(targetLine ? [targetLine.replace('kcal', '千卡').replaceAll('g', '克')] : [])].join('，')

  const exerciseCount = workouts.reduce((total, workout) => total + workout.exercises.length, 0)
  const setCount = workouts.reduce((total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 0)
  const strength = workouts.length === 0
    ? row('strength', '无氧训练', '未训练', [], true)
    : workouts.length === 1
      ? row('strength', '无氧训练', `${setCount} 组`, [`${exerciseCount} 个动作`])
      : row('strength', '无氧训练', `${workouts.length} 次`, [`${setCount} 组 · ${exerciseCount} 个动作`])

  const cardio = cardioSessions.length === 0
    ? row('cardio', '有氧训练', '未训练', [], true)
    : cardioSessions.length === 1
      ? row('cardio', '有氧训练', `${formatNumber(cardioSessions[0]!.durationMinutes)} 分钟`, [`速度 ${formatNumber(cardioSessions[0]!.speed)}`])
      : row('cardio', '有氧训练', `${cardioSessions.length} 次`, [`共 ${formatNumber(cardioSessions.reduce((total, session) => total + session.durationMinutes, 0))} 分钟`])

  const pelvicSeconds = pelvicSessions.reduce((total, session) => total + pelvicFloorSessionDurationSeconds(session), 0)
  const pelvic = pelvicSessions.length === 0
    ? row('pelvic', '凯格尔训练', '未训练', [], true)
    : pelvicSessions.length === 1
      ? row('pelvic', '凯格尔训练', pelvicSessions[0]!.routine?.name ?? '基础训练', [duration(pelvicSeconds)])
      : row('pelvic', '凯格尔训练', `${pelvicSessions.length} 次`, [`累计 ${duration(pelvicSeconds)}`])
  if (pelvicSessions.length) pelvic.accessibleLabel = ['凯格尔训练', pelvicSessions.length === 1 ? pelvic.primary : `${pelvicSessions.length} 次`, ...(pelvicSessions.length === 1 ? [spokenDuration(pelvicSeconds)] : [`累计 ${spokenDuration(pelvicSeconds)}`])].join('，')

  const weight = summary?.weightKg === undefined
    ? row('weight', '体重', '未记录', [], true)
    : row('weight', '体重', `${formatNumber(summary.weightKg)} kg`, [], false, `${formatNumber(summary.weightKg)} 千克`)
  return [food, strength, cardio, pelvic, weight]
}
