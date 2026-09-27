import { db, type FitLogDatabase } from '../db/database'
import type { CardioActivityType, CardioSession } from '../db/types'
import { getLocalDateString } from '../utils/date'

export interface CardioSessionInput {
  date: string
  activityType: CardioActivityType
  durationMinutes: number
  speed?: number
  inclinePercent?: number
  note?: string
}

export function validateCardioInput(input: CardioSessionInput): CardioSessionInput {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date)
  if (!match || getLocalDateString(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)) !== input.date) {
    throw new Error('训练日期必须是有效的本地日期')
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) throw new Error('时间必须大于 0')
  if (input.activityType !== 'stair_climber' && input.activityType !== 'treadmill') throw new Error('训练类型不合法')
  if (input.activityType === 'stair_climber' || input.speed !== undefined) {
    if (!Number.isFinite(input.speed) || input.speed === undefined || input.speed <= 0) throw new Error('速度必须大于 0')
  }
  if (input.activityType === 'treadmill') {
    if (input.inclinePercent !== undefined && (!Number.isFinite(input.inclinePercent) || input.inclinePercent < 0)) throw new Error('坡度必须大于等于 0')
    if (input.speed === undefined && input.inclinePercent === undefined) throw new Error('跑步机请至少填写速度或坡度')
  }
  if (input.note !== undefined && typeof input.note !== 'string') throw new Error('备注格式不正确')
  return {
    date: input.date, activityType: input.activityType, durationMinutes: input.durationMinutes,
    ...(input.speed === undefined ? {} : { speed: input.speed }),
    ...(input.activityType === 'treadmill' && input.inclinePercent !== undefined ? { inclinePercent: input.inclinePercent } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  }
}

export async function saveCardioSession(input: CardioSessionInput, database: FitLogDatabase = db): Promise<CardioSession> {
  const values = validateCardioInput(input)
  const now = new Date().toISOString()
  const session: CardioSession = { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await database.cardioSessions.add(session)
  return session
}

export async function updateCardioSession(id: string, input: CardioSessionInput, database: FitLogDatabase = db): Promise<CardioSession> {
  const values = validateCardioInput(input)
  const existing = await database.cardioSessions.get(id)
  if (!existing) throw new Error('找不到这条有氧训练记录')
  const updated: CardioSession = { ...existing, ...values, updatedAt: new Date().toISOString() }
  if (values.speed === undefined) delete updated.speed
  if (values.inclinePercent === undefined) delete updated.inclinePercent
  if (values.note === undefined) delete updated.note
  await database.cardioSessions.put(updated)
  return updated
}

export async function deleteCardioSession(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.cardioSessions.delete(id)
}

export async function getCardioSessionsByDate(date: string, database: FitLogDatabase = db): Promise<CardioSession[]> {
  return database.cardioSessions.where('date').equals(date).toArray()
}
