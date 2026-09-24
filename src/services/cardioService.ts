import { db, type FitLogDatabase } from '../db/database'
import type { CardioSession } from '../db/types'
import { getLocalDateString } from '../utils/date'

export interface CardioSessionInput {
  date: string
  durationMinutes: number
  speed: number
  note?: string
}

function validateInput(input: CardioSessionInput): CardioSessionInput {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date)
  if (!match || getLocalDateString(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)) !== input.date) {
    throw new Error('训练日期必须是有效的本地日期')
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) throw new Error('时间必须大于 0')
  if (!Number.isFinite(input.speed) || input.speed <= 0) throw new Error('速度必须大于 0')
  if (input.note !== undefined && typeof input.note !== 'string') throw new Error('备注格式不正确')
  return { date: input.date, durationMinutes: input.durationMinutes, speed: input.speed, ...(input.note?.trim() ? { note: input.note.trim() } : {}) }
}

export async function saveCardioSession(input: CardioSessionInput, database: FitLogDatabase = db): Promise<CardioSession> {
  const values = validateInput(input)
  const now = new Date().toISOString()
  const session: CardioSession = { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await database.cardioSessions.add(session)
  return session
}

export async function updateCardioSession(id: string, input: CardioSessionInput, database: FitLogDatabase = db): Promise<CardioSession> {
  const values = validateInput(input)
  const existing = await database.cardioSessions.get(id)
  if (!existing) throw new Error('找不到这条有氧训练记录')
  const updated: CardioSession = { ...existing, ...values, note: values.note, updatedAt: new Date().toISOString() }
  await database.cardioSessions.put(updated)
  return updated
}

export async function deleteCardioSession(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.cardioSessions.delete(id)
}

export async function getCardioSessionsByDate(date: string, database: FitLogDatabase = db): Promise<CardioSession[]> {
  return database.cardioSessions.where('date').equals(date).toArray()
}
