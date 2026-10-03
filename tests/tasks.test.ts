import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { createTask, deleteTask, getInboxTasks, getTasksByDate, getUpcomingTasks, sortTasksForPlan, toggleTaskCompletion, updateTask } from '../src/services/taskService'
import { createTaskTag, deleteTaskTag, getTaskTags, getTaskTagUsageCount, updateTaskTag } from '../src/services/taskTagService'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { findActiveHashtagQuery, normalizeTaskTagName, replaceActiveHashtagQuery } from '../src/utils/taskTags'

const databases: FitLogDatabase[] = []
const database = (name = `tasks-${crypto.randomUUID()}`) => { const result = new FitLogDatabase(name); databases.push(result); return result }
afterEach(async () => { for (const item of databases.splice(0)) { item.close(); await item.delete() } })

describe('Task and Tag services', () => {
  it('creates inbox, dated, and timed tasks with exact date queries and stable sorting', async () => {
    const db = database()
    expect(await db.taskTags.count()).toBe(0)
    const inbox = await createTask({ title: ' 买牙膏 ', tagIds: [] }, db)
    const day = await createTask({ title: '回复邮件', date: '2026-09-28', tagIds: [] }, db)
    const timed = await createTask({ title: '会议', date: '2026-09-28', startTime: '09:30', endTime: '10:30', tagIds: [] }, db)
    const future = await createTask({ title: '体检', date: '2026-10-01', startTime: '08:00', tagIds: [] }, db)
    expect(inbox).toMatchObject({ title: '买牙膏', tagIds: [] })
    expect(await getInboxTasks(db)).toHaveLength(1)
    expect((await getTasksByDate('2026-09-28', db)).map((task) => task.id).sort()).toEqual([day.id, timed.id].sort())
    expect((await getUpcomingTasks('2026-09-28', db)).map((task) => task.id)).toEqual([future.id])
    expect(sortTasksForPlan([day, timed]).map((task) => task.id)).toEqual([timed.id, day.id])
  })

  it('rejects invalid title, date, time, and missing or duplicate tags', async () => {
    const db = database(); const tag = await createTaskTag('旅行', db)
    const valid = { title: '安排', tagIds: [tag.id] }
    await expect(createTask({ ...valid, title: '  ' }, db)).rejects.toThrow('标题')
    await expect(createTask({ ...valid, date: '2026-02-30' }, db)).rejects.toThrow('日期')
    await expect(createTask({ ...valid, startTime: '09:30' }, db)).rejects.toThrow('日期')
    await expect(createTask({ ...valid, date: '2026-09-28', endTime: '10:30' }, db)).rejects.toThrow('开始时间')
    await expect(createTask({ ...valid, date: '2026-09-28', startTime: '23:00', endTime: '01:00' }, db)).rejects.toThrow('晚于')
    await expect(createTask({ ...valid, date: '2026-09-28', startTime: '09:30', endTime: '09:30' }, db)).rejects.toThrow('晚于')
    await expect(createTask({ ...valid, tagIds: [tag.id, tag.id] }, db)).rejects.toThrow('重复')
    await expect(createTask({ ...valid, tagIds: ['missing'] }, db)).rejects.toThrow('不存在')
  })

  it('completes reversibly, moves dated tasks to inbox, and deletes only the task', async () => {
    const db = database(); const tag = await createTaskTag('项目A', db)
    const task = await createTask({ title: '会议', date: '2026-09-30', startTime: '09:00', endTime: '10:00', tagIds: [tag.id] }, db)
    expect((await toggleTaskCompletion(task.id, db)).completedAt).toBeTruthy()
    expect((await toggleTaskCompletion(task.id, db)).completedAt).toBeUndefined()
    const moved = await updateTask(task.id, { title: '资料', tagIds: [tag.id] }, db)
    expect(moved).not.toHaveProperty('date')
    expect(moved).not.toHaveProperty('startTime')
    expect(moved).not.toHaveProperty('endTime')
    expect((await getInboxTasks(db)).map((item) => item.id)).toEqual([task.id])
    await deleteTask(task.id, db)
    expect(await db.tasks.get(task.id)).toBeUndefined()
    expect(await db.taskTags.get(tag.id)).toBeDefined()
  })

  it('renames tags by ID and atomically detaches a deleted tag from tasks', async () => {
    const db = database(); const a = await createTaskTag('Travel', db); const b = await createTaskTag('财务', db)
    await expect(createTaskTag('travel', db)).rejects.toThrow('已存在')
    await expect(createTaskTag('#旅行', db)).rejects.toThrow('不用输入 #')
    await expect(createTaskTag('项目 A', db)).rejects.toThrow('空格')
    const task = await createTask({ title: '订票', tagIds: [a.id, b.id] }, db)
    await updateTaskTag(a.id, '日本旅行', db)
    expect((await db.tasks.get(task.id))?.tagIds).toEqual([a.id, b.id])
    expect((await getTaskTags(db)).map((tag) => tag.name)).toContain('日本旅行')
    expect(await getTaskTagUsageCount(a.id, db)).toBe(1)
    await deleteTaskTag(a.id, db)
    expect((await db.tasks.get(task.id))?.tagIds).toEqual([b.id])
    expect(await db.tasks.count()).toBe(1)
    await deleteTaskTag(b.id, db)
    expect((await db.tasks.get(task.id))?.tagIds).toEqual([])
    const unused = await createTaskTag('临时', db)
    await deleteTaskTag(unused.id, db)
    expect(await db.taskTags.get(unused.id)).toBeUndefined()
  })
})

describe('hashtag input helpers', () => {
  it('finds the current token at the caret and replaces only that token', () => {
    expect(findActiveHashtagQuery('#', 1)).toEqual({ query: '', start: 0, end: 1 })
    expect(findActiveHashtagQuery('#旅', 2)).toEqual({ query: '旅', start: 0, end: 2 })
    const text = '整理资料 #旅 行程'
    expect(findActiveHashtagQuery(text, 7)).toEqual({ query: '旅', start: 5, end: 7 })
    expect(replaceActiveHashtagQuery(text, { query: '旅', start: 5, end: 7 }).text).toBe('整理资料 行程')
    expect(findActiveHashtagQuery('A#旅', 3)).toBeUndefined()
    expect(findActiveHashtagQuery('#旅 ', 3)).toBeUndefined()
    expect(findActiveHashtagQuery('先 #财 再 #项', 9)?.query).toBe('项')
    expect(findActiveHashtagQuery('计划 #旅行资料', 5)).toEqual({ query: '旅', start: 3, end: 8 })
    expect(normalizeTaskTagName('ＴＲＡＶＥＬ')).toBe('travel')
  })
})

describe('Dexie V7 and Backup V7', () => {
  it('upgrades V6 without changing any of its 12 stores', async () => {
    const name = `task-migration-${crypto.randomUUID()}`; const legacy = new Dexie(name)
    legacy.version(6).stores({ foods: 'id, name, brand, [name+brand], createdAt', foodLogs: 'id, date, foodId, createdAt', exercises: 'id, name, createdAt', workouts: 'id, date, finishedAt, createdAt', weights: 'id, &date, createdAt', workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', nutritionTargets: 'id, &date, sourceTemplateId, createdAt', pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt', cardioSessions: 'id, date, createdAt', habits: 'id, sortOrder, createdAt', habitCheckIns: 'id, habitId, date, &[habitId+date], completedAt' })
    await legacy.open(); for (const store of legacy.tables) await store.add({ id: `${store.name}-old`, date: '2026-09-28' }); legacy.close()
    const db = database(name); await db.open()
    expect(db.verno).toBe(9); expect(db.tables).toHaveLength(17)
    for (const store of legacy.tables) expect(await db.table(store.name).get(`${store.name}-old`)).toBeDefined()
    expect(await db.tasks.count()).toBe(0); expect(await db.taskTags.count()).toBe(0)
  })

  it('round trips tags and tasks; V6 restore normalizes the new stores to empty', async () => {
    const source = database(); const tag = await createTaskTag('旅行', source)
    const task = await createTask({ title: '订票', date: '2026-09-30', tagIds: [tag.id] }, source)
    await toggleTaskCompletion(task.id, source)
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(9)
    const target = database(); await restoreBackup(backup, target)
    expect(await target.taskTags.get(tag.id)).toMatchObject({ name: '旅行' })
    expect(await target.tasks.get(task.id)).toMatchObject({ date: '2026-09-30', tagIds: [tag.id] })
    const old = { ...backup, schemaVersion: 6, data: Object.fromEntries(Object.entries(backup.data).filter(([key]) => !['tasks', 'taskTags'].includes(key))) }
    expect(validateBackup(old).data).toMatchObject({ tasks: [], taskTags: [] })
    await restoreBackup(old, target)
    expect(await target.tasks.count()).toBe(0); expect(await target.taskTags.count()).toBe(0)
  })

  it('all V1–V6 backups normalize tasks and tags to empty', async () => {
    const db = database(); const latest = await exportBackup(db)
    const base = ['foods', 'foodLogs', 'exercises', 'workouts', 'weights']
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const keys = [...base, ...(version >= 2 ? ['workoutTemplates', 'dietTemplates'] : []), ...(version >= 3 ? ['nutritionTargets', 'pelvicFloorSessions'] : []), ...(version >= 4 ? ['cardioSessions'] : []), ...(version >= 6 ? ['habits', 'habitCheckIns'] : [])]
      const old = { ...latest, schemaVersion: version, data: Object.fromEntries(Object.entries(latest.data).filter(([key]) => keys.includes(key))) }
      expect(validateBackup(old).data).toMatchObject({ tasks: [], taskTags: [] })
    }
  })

  it('rejects orphan IDs, duplicate normalized tags, and invalid task times before clearing', async () => {
    const db = database(); const existing = await createTask({ title: '保留', tagIds: [] }, db)
    const backup = await exportBackup(db)
    backup.data.tasks[0]!.tagIds = ['missing']
    await expect(restoreBackup(backup, db)).rejects.toThrow('不存在')
    backup.data.tasks[0]!.tagIds = []
    backup.data.tasks[0]!.date = '2026-09-28'; backup.data.tasks[0]!.startTime = '23:00'; backup.data.tasks[0]!.endTime = '01:00'
    await expect(restoreBackup(backup, db)).rejects.toThrow('晚于')
    delete backup.data.tasks[0]!.startTime; delete backup.data.tasks[0]!.endTime
    const tag = await createTaskTag('Travel', db); backup.data.taskTags.push(tag, { ...tag, id: 'other', name: 'travel' })
    await expect(restoreBackup(backup, db)).rejects.toThrow('重复')
    backup.data.taskTags = [{ ...tag, normalizedName: 'wrong' }]
    await expect(restoreBackup(backup, db)).rejects.toThrow('normalizedName')
    backup.data.taskTags = [tag]
    backup.data.tasks[0]!.tagIds = [tag.id, tag.id]
    await expect(restoreBackup(backup, db)).rejects.toThrow('重复')
    expect(await db.tasks.get(existing.id)).toBeDefined()
  })
})
