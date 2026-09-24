import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { BackupDataV1, BackupDataV2, BackupDataV3, CardioSession } from '../src/db/types'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { deleteCardioSession, getCardioSessionsByDate, saveCardioSession, updateCardioSession } from '../src/services/cardioService'
import { getLocalDateString } from '../src/utils/date'

const date = '2026-09-24'
const now = '2026-09-24T08:00:00.000Z'
const databases: FitLogDatabase[] = []
const newDatabase = (name = `cardio-${crypto.randomUUID()}`) => {
  const database = new FitLogDatabase(name)
  databases.push(database)
  return database
}
const record = (id = 'cardio-1'): CardioSession => ({ id, date, durationMinutes: 25, speed: 6.5, createdAt: now, updatedAt: now })

afterEach(async () => {
  for (const database of databases.splice(0)) { database.close(); await database.delete() }
})

describe('楼梯机记录', () => {
  it('新增、按日期读取、编辑及删除指定记录', async () => {
    const database = newDatabase()
    const created = await saveCardioSession({ date, durationMinutes: 25, speed: 6.5, note: '轻松' }, database)
    await database.cardioSessions.add({ ...record('untouched'), date: '2026-09-23' })
    expect(await getCardioSessionsByDate(date, database)).toEqual([created])
    const updated = await updateCardioSession(created.id, { date, durationMinutes: 30, speed: 7 }, database)
    expect(updated).toMatchObject({ id: created.id, durationMinutes: 30, speed: 7, createdAt: created.createdAt })
    expect(updated.note).toBeUndefined()
    await deleteCardioSession(created.id, database)
    expect(await database.cardioSessions.get(created.id)).toBeUndefined()
    expect(await database.cardioSessions.get('untouched')).toMatchObject({ durationMinutes: 25, speed: 6.5 })
  })

  it('拒绝非正时间、非正速度和无效业务日期，不写入数据', async () => {
    const database = newDatabase()
    for (const durationMinutes of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(saveCardioSession({ date, durationMinutes, speed: 6.5 }, database)).rejects.toThrow('时间')
    }
    for (const speed of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(saveCardioSession({ date, durationMinutes: 25, speed }, database)).rejects.toThrow('速度')
    }
    await expect(saveCardioSession({ date: '2026-02-30', durationMinutes: 25, speed: 6.5 }, database)).rejects.toThrow('日期')
    expect(await database.cardioSessions.count()).toBe(0)
  })

  it('使用设备本地业务日期，不从 ISO 时间戳截取日期', async () => {
    const database = newDatabase()
    const localDate = getLocalDateString(new Date(2026, 8, 24, 0, 5))
    const created = await saveCardioSession({ date: localDate, durationMinutes: 25, speed: 6.5 }, database)
    expect(created.date).toBe('2026-09-24')
    expect((await database.cardioSessions.get(created.id))?.date).toBe(localDate)
  })
})

describe('Dexie V4 → V5', () => {
  it('保留九个旧 store 的数据，只新增 cardioSessions', async () => {
    const name = `cardio-migration-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(4).stores({
      foods: 'id, name, brand, [name+brand], createdAt', foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt', workouts: 'id, date, finishedAt, createdAt', weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      nutritionTargets: 'id, &date, sourceTemplateId, createdAt', pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt',
    })
    await legacy.open()
    for (const store of ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions']) {
      await legacy.table(store).add({ id: `${store}-old`, date, createdAt: now, updatedAt: now })
    }
    legacy.close()
    const database = newDatabase(name)
    await database.open()
    expect(database.verno).toBe(5)
    for (const store of ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions'] as const) {
      expect(await database.table(store).get(`${store}-old`)).toMatchObject({ id: `${store}-old` })
    }
    expect(await database.cardioSessions.count()).toBe(0)
    await database.cardioSessions.add(record())
    expect(await database.cardioSessions.count()).toBe(1)
  })
})

function oldBackup(version: 1 | 2 | 3): BackupDataV1 | BackupDataV2 | BackupDataV3 {
  const v1: BackupDataV1 = { app: 'FitLog Lite', schemaVersion: 1, exportedAt: now,
    data: { foods: [], foodLogs: [], exercises: [], workouts: [], weights: [] } }
  if (version === 1) return v1
  const v2: BackupDataV2 = { ...v1, schemaVersion: 2,
    data: { ...v1.data, workoutTemplates: [], dietTemplates: [] } }
  if (version === 2) return v2
  return { ...v2, schemaVersion: 3,
    data: { ...v2.data, nutritionTargets: [], pelvicFloorSessions: [] } }
}

describe('Backup V4 / Restore V1–V4', () => {
  it('V4 完整往返楼梯机速度、时间和备注', async () => {
    const source = newDatabase(); await source.cardioSessions.add({ ...record(), note: '晚间' })
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(4)
    expect(backup.data.cardioSessions).toMatchObject([{ durationMinutes: 25, speed: 6.5, note: '晚间' }])
    const target = newDatabase(); await restoreBackup(JSON.parse(JSON.stringify(backup)), target)
    expect(await target.cardioSessions.get('cardio-1')).toMatchObject({ durationMinutes: 25, speed: 6.5, note: '晚间' })
  })

  it.each([1, 2, 3] as const)('Restore V%s 把缺失的 cardioSessions 视为空数组', async (version) => {
    const database = newDatabase(); await database.cardioSessions.add(record())
    expect(validateBackup(oldBackup(version)).data.cardioSessions).toEqual([])
    await restoreBackup(oldBackup(version), database)
    expect(await database.cardioSessions.count()).toBe(0)
  })

  it.each([{ durationMinutes: 0 }, { speed: 0 }, { date: '2026-02-30' }, { note: 3 }])('非法 cardioSessions 在清库前被拒绝：%j', async (change) => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const backup = await exportBackup(database)
    backup.data.cardioSessions = [{ ...record('bad'), ...change } as CardioSession]
    await expect(restoreBackup(backup, database)).rejects.toThrow('有氧训练')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
  })

  it('V4 缺少 cardioSessions 数组时在清库前拒绝', async () => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const backup = await exportBackup(database)
    delete (backup.data as Partial<typeof backup.data>).cardioSessions
    await expect(restoreBackup(backup, database)).rejects.toThrow('cardioSessions')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
  })

  it('有氧 store 写入失败时整个 Restore 回滚', async () => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const backup = await exportBackup(database)
    backup.data.cardioSessions = [record('replacement')]
    vi.spyOn(database.cardioSessions, 'bulkAdd').mockRejectedValueOnce(new Error('有氧写入失败'))
    await expect(restoreBackup(backup, database)).rejects.toThrow('有氧写入失败')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
    expect(await database.cardioSessions.get('replacement')).toBeUndefined()
  })
})
