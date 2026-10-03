import type { CardioActivityType, CardioSession } from '../db/types'
import { formatNumber } from './nutrition'

export const cardioActivityDefinitions: Record<CardioActivityType, { label: string }> = {
  stair_climber: { label: '楼梯机' },
  treadmill: { label: '跑步机' },
}

export function getCardioActivityType(session: Pick<CardioSession, 'activityType'>): CardioActivityType {
  return session.activityType === 'treadmill' ? 'treadmill' : 'stair_climber'
}

export function getCardioActivityLabel(session: Pick<CardioSession, 'activityType'>): string {
  return cardioActivityDefinitions[getCardioActivityType(session)].label
}

export function formatCardioMetrics(session: Pick<CardioSession, 'activityType' | 'speed' | 'inclinePercent'>): string[] {
  if (getCardioActivityType(session) === 'stair_climber') return session.speed === undefined ? [] : [`速度 ${formatNumber(session.speed)}`]
  return [
    session.speed === undefined ? undefined : `速度 ${formatNumber(session.speed)}`,
    session.inclinePercent === undefined ? undefined : `坡度 ${formatNumber(session.inclinePercent)}`,
  ].filter((value): value is string => value !== undefined)
}
