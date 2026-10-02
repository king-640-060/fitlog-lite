import { db, type FitLogDatabase } from '../db/database'
import type { Task } from '../db/types'

export type TaskInput = Pick<Task, 'title' | 'tagIds'> & Partial<Pick<Task, 'note' | 'date' | 'startTime' | 'endTime'>>

export function validateTaskDate(value: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('任务日期必须是有效的 YYYY-MM-DD')
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('任务日期必须是有效的 YYYY-MM-DD')
}

export function validateTaskInput(input: TaskInput): TaskInput {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 120) throw new Error('任务标题需为 1–120 字符')
  if (input.note !== undefined && typeof input.note !== 'string') throw new Error('备注格式不正确')
  const note = input.note?.trim()
  if (note && note.length > 2000) throw new Error('备注不能超过 2000 字符')
  if (input.date !== undefined) validateTaskDate(input.date)
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
  if (input.startTime !== undefined && !timePattern.test(input.startTime)) throw new Error('开始时间格式应为 HH:mm')
  if (input.endTime !== undefined && !timePattern.test(input.endTime)) throw new Error('结束时间格式应为 HH:mm')
  if (input.startTime !== undefined && !input.date) throw new Error('设置时间前请先选择日期')
  if (input.endTime !== undefined && !input.startTime) throw new Error('结束时间需要开始时间')
  if (input.startTime && input.endTime && input.endTime <= input.startTime) throw new Error('结束时间必须晚于开始时间')
  if (!Array.isArray(input.tagIds) || input.tagIds.some((id) => typeof id !== 'string' || !id.trim())) throw new Error('任务标签格式不正确')
  if (new Set(input.tagIds).size !== input.tagIds.length) throw new Error('任务标签不能重复')
  return { title, tagIds: [...input.tagIds], ...(note ? { note } : {}), ...(input.date ? { date: input.date } : {}), ...(input.startTime ? { startTime: input.startTime } : {}), ...(input.endTime ? { endTime: input.endTime } : {}) }
}

async function ensureTaskTagsExist(tagIds: string[], database: FitLogDatabase): Promise<void> {
  if (!tagIds.length) return
  const tags = await database.taskTags.bulkGet(tagIds)
  if (tags.some((tag) => !tag)) throw new Error('任务引用了不存在的标签')
}

export async function createTask(input: TaskInput, database: FitLogDatabase = db): Promise<Task> {
  const values = validateTaskInput(input)
  return database.transaction('rw', database.tasks, database.taskTags, async () => {
    await ensureTaskTagsExist(values.tagIds, database)
    const now = new Date().toISOString()
    const task: Task = { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await database.tasks.add(task)
    return task
  })
}

export async function updateTask(id: string, input: TaskInput, database: FitLogDatabase = db): Promise<Task> {
  const values = validateTaskInput(input)
  return database.transaction('rw', database.tasks, database.taskTags, async () => {
    const current = await database.tasks.get(id)
    if (!current) throw new Error('找不到任务')
    await ensureTaskTagsExist(values.tagIds, database)
    const updated: Task = { id, ...values, createdAt: current.createdAt, updatedAt: new Date().toISOString(), ...(current.completedAt ? { completedAt: current.completedAt } : {}) }
    await database.tasks.put(updated)
    return updated
  })
}

export async function deleteTask(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.tasks.delete(id)
}

export async function toggleTaskCompletion(id: string, database: FitLogDatabase = db): Promise<Task> {
  return database.transaction('rw', database.tasks, async () => {
    const task = await database.tasks.get(id)
    if (!task) throw new Error('找不到任务')
    const updated = { ...task, updatedAt: new Date().toISOString(), ...(task.completedAt ? {} : { completedAt: new Date().toISOString() }) }
    if (task.completedAt) delete updated.completedAt
    await database.tasks.put(updated)
    return updated
  })
}

/** Desired state for explicit proposals; repeating a request never flips completion. */
export async function setTaskCompletionState(id: string, completed: boolean, database: FitLogDatabase = db): Promise<Task> {
  if (typeof completed !== 'boolean') throw new Error('任务状态不合法')
  return database.transaction('rw', database.tasks, async () => {
    const task = await database.tasks.get(id)
    if (!task) throw new Error('找不到任务')
    if (Boolean(task.completedAt) === completed) return task
    const now = new Date().toISOString(), updated = { ...task, updatedAt: now }
    if (completed) updated.completedAt = now
    else delete updated.completedAt
    await database.tasks.put(updated)
    return updated
  })
}

export const getTask = (id: string, database: FitLogDatabase = db): Promise<Task | undefined> => database.tasks.get(id)

export async function getTasksByDate(date: string, database: FitLogDatabase = db): Promise<Task[]> {
  validateTaskDate(date)
  return database.tasks.where('date').equals(date).toArray()
}

export async function getUpcomingTasks(today: string, database: FitLogDatabase = db): Promise<Task[]> {
  validateTaskDate(today)
  return database.tasks.where('date').above(today).toArray()
}

export async function getInboxTasks(database: FitLogDatabase = db): Promise<Task[]> {
  return (await database.tasks.toArray()).filter((task) => !task.date)
}

export function sortTasksForPlan(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1
    if (Boolean(a.startTime) !== Boolean(b.startTime)) return a.startTime ? -1 : 1
    return (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
}
