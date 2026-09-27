import type { PelvicFloorSession, WeightLog } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from '../services/pelvicFloorService'
import { formatShortDate } from './date'
import { formatNumber } from './nutrition'

export interface TodayActivityState { status: string; meta: string; action: string }
export function getTodayWeightState(weights: WeightLog[], today: string): TodayActivityState {
  const eligible = weights.filter((item) => item.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  const current = eligible.find((item) => item.date === today)
  const previous = eligible.find((item) => item.date < today)
  if (!current) return { status: '今日尚未记录', meta: previous ? `最近 ${formatNumber(previous.weightKg)} kg · ${formatShortDate(previous.date)}` : '暂无历史记录', action: '记录体重' }
  const delta = previous ? Math.round((current.weightKg - previous.weightKg) * 10) / 10 : undefined
  return { status: `${formatNumber(current.weightKg)} kg`, meta: delta === undefined ? '今日已记录' : `较上次 ${delta > 0 ? '+' : ''}${formatNumber(delta)} kg`, action: '更新体重' }
}

export function getTodayPelvicState(sessions: PelvicFloorSession[], routineName: string, routineMinutes: string): TodayActivityState {
  if (!sessions.length) return { status: '今日尚未完成', meta: `${routineName} · ${routineMinutes}`, action: '开始训练' }
  const seconds = sessions.reduce((sum, session) => sum + pelvicFloorSessionDurationSeconds(session), 0)
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return { status: `今日已完成 ${sessions.length} 次`, meta: `${routineName} · 累计 ${minutes}:${remainder}`, action: '再练一次' }
}
