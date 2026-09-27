import { db, type FitLogDatabase } from '../db/database'
import type { Habit, HabitCheckIn } from '../db/types'
import { getLocalDateString } from '../utils/date'

export type HabitInput = Pick<Habit, 'name'> & Partial<Pick<Habit, 'note' | 'weekdays' | 'targetPerWeek'>>

export function validateHabitInput(input: HabitInput): HabitInput {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 40) throw new Error('习惯名称需为 1–40 字符')
  if (input.note !== undefined && typeof input.note !== 'string') throw new Error('说明格式不正确')
  let weekdays: number[] | undefined
  if (input.weekdays !== undefined) {
    if (!Array.isArray(input.weekdays) || input.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error('计划日必须是一至日')
    weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b)
  }
  if (input.targetPerWeek !== undefined && (!Number.isInteger(input.targetPerWeek) || input.targetPerWeek < 1 || input.targetPerWeek > 7)) throw new Error('周目标必须为 1–7 次')
  return { name, ...(input.note?.trim() ? { note: input.note.trim() } : {}), ...(weekdays?.length ? { weekdays } : {}), ...(input.targetPerWeek === undefined ? {} : { targetPerWeek: input.targetPerWeek }) }
}

export function validateHabitDate(date: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match || getLocalDateString(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)) !== date) throw new Error('打卡日期必须是有效的本地日期')
}

export async function createHabit(input: HabitInput, database: FitLogDatabase = db): Promise<Habit> {
  const values = validateHabitInput(input)
  const now = new Date().toISOString()
  const max = (await database.habits.orderBy('sortOrder').last())?.sortOrder ?? -1
  const habit: Habit = { ...values, id: crypto.randomUUID(), active: true, sortOrder: max + 1, createdAt: now, updatedAt: now }
  await database.habits.add(habit)
  return habit
}

export async function updateHabit(id: string, input: HabitInput, database: FitLogDatabase = db): Promise<Habit> {
  const values = validateHabitInput(input)
  return database.transaction('rw', database.habits, async () => {
    const current = await database.habits.get(id)
    if (!current) throw new Error('找不到习惯')
    const updated: Habit = { ...current, ...values, updatedAt: new Date().toISOString() }
    if (!values.note) delete updated.note
    if (!values.weekdays) delete updated.weekdays
    if (values.targetPerWeek === undefined) delete updated.targetPerWeek
    await database.habits.put(updated)
    return updated
  })
}

export async function setHabitActive(id: string, active: boolean, database: FitLogDatabase = db): Promise<void> {
  if (typeof active !== 'boolean') throw new Error('习惯状态不合法')
  await database.transaction('rw', database.habits, async () => {
    const habit = await database.habits.get(id)
    if (!habit) throw new Error('找不到习惯')
    if (habit.active === active) return
    const max = active ? (await database.habits.orderBy('sortOrder').last())?.sortOrder ?? -1 : habit.sortOrder
    await database.habits.put({ ...habit, active, sortOrder: active ? max + 1 : habit.sortOrder, updatedAt: new Date().toISOString() })
  })
}

export async function reorderHabits(ids: string[], database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', database.habits, async () => {
    const active = (await database.habits.toArray()).filter((habit) => habit.active)
    if (ids.length !== active.length || new Set(ids).size !== ids.length || ids.some((id) => !active.some((habit) => habit.id === id))) throw new Error('习惯排序数据不完整')
    const now = new Date().toISOString()
    await database.habits.bulkPut(ids.map((id, index) => ({ ...active.find((habit) => habit.id === id)!, sortOrder: index, updatedAt: now })))
  })
}

export async function getActiveHabits(database: FitLogDatabase = db): Promise<Habit[]> {
  return (await database.habits.orderBy('sortOrder').toArray()).filter((habit) => habit.active)
}

export async function getHabitCheckInsByDate(date: string, database: FitLogDatabase = db): Promise<HabitCheckIn[]> {
  validateHabitDate(date)
  return database.habitCheckIns.where('date').equals(date).toArray()
}

export async function getHabitCheckInsBetween(start: string, end: string, database: FitLogDatabase = db): Promise<HabitCheckIn[]> {
  validateHabitDate(start); validateHabitDate(end)
  if (start > end) throw new Error('打卡日期范围不合法')
  return database.habitCheckIns.where('date').between(start, end, true, true).toArray()
}

export async function toggleHabitCheckIn(habitId: string, date: string, database: FitLogDatabase = db): Promise<boolean> {
  validateHabitDate(date)
  return database.transaction('rw', database.habits, database.habitCheckIns, async () => {
    const habit = await database.habits.get(habitId)
    if (!habit?.active) throw new Error('习惯未启用')
    const existing = await database.habitCheckIns.where('[habitId+date]').equals([habitId, date]).first()
    if (existing) { await database.habitCheckIns.delete(existing.id); return false }
    const now = new Date().toISOString()
    await database.habitCheckIns.add({ id: crypto.randomUUID(), habitId, date, completedAt: now, createdAt: now, updatedAt: now })
    return true
  })
}

export async function deleteUnusedHabit(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', database.habits, database.habitCheckIns, async () => {
    if (await database.habitCheckIns.where('habitId').equals(id).count()) throw new Error('已有打卡历史，请停用习惯')
    await database.habits.delete(id)
  })
}
