import { db, type FitLogDatabase } from '../db/database'
import type { TaskTag } from '../db/types'
import { normalizeTaskTagName, validateTaskTagName } from '../utils/taskTags'

export async function createTaskTag(value: string, database: FitLogDatabase = db): Promise<TaskTag> {
  const name = validateTaskTagName(value)
  const normalizedName = normalizeTaskTagName(name)
  return database.transaction('rw', database.taskTags, async () => {
    if (await database.taskTags.where('normalizedName').equals(normalizedName).first()) throw new Error('标签名称已存在')
    const now = new Date().toISOString()
    const tag = { id: crypto.randomUUID(), name, normalizedName, createdAt: now, updatedAt: now }
    await database.taskTags.add(tag)
    return tag
  })
}

export async function updateTaskTag(id: string, value: string, database: FitLogDatabase = db): Promise<TaskTag> {
  const name = validateTaskTagName(value)
  const normalizedName = normalizeTaskTagName(name)
  return database.transaction('rw', database.taskTags, async () => {
    const current = await database.taskTags.get(id)
    if (!current) throw new Error('找不到标签')
    const duplicate = await database.taskTags.where('normalizedName').equals(normalizedName).first()
    if (duplicate && duplicate.id !== id) throw new Error('标签名称已存在')
    const updated = { ...current, name, normalizedName, updatedAt: new Date().toISOString() }
    await database.taskTags.put(updated)
    return updated
  })
}

export async function getTaskTagUsageCount(id: string, database: FitLogDatabase = db): Promise<number> {
  return database.tasks.where('tagIds').equals(id).count()
}

export async function deleteTaskTag(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', database.taskTags, database.tasks, async () => {
    if (!await database.taskTags.get(id)) throw new Error('找不到标签')
    const tasks = await database.tasks.where('tagIds').equals(id).toArray()
    const now = new Date().toISOString()
    await database.tasks.bulkPut(tasks.map((task) => ({ ...task, tagIds: task.tagIds.filter((tagId) => tagId !== id), updatedAt: now })))
    await database.taskTags.delete(id)
  })
}

export async function getTaskTags(database: FitLogDatabase = db): Promise<TaskTag[]> {
  return (await database.taskTags.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id))
}
