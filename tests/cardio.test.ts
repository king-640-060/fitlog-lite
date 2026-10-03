import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { BackupDataV1, BackupDataV2, BackupDataV3, BackupDataV4, CardioSession, LegacyCardioSessionV4 } from '../src/db/types'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { deleteCardioSession, getCardioSessionsByDate, saveCardioSession, updateCardioSession, validateCardioInput } from '../src/services/cardioService'
import { formatCardioMetrics, getCardioActivityLabel, getCardioActivityType } from '../src/utils/cardio'
import { getLocalDateString } from '../src/utils/date'

const date = '2026-09-24'
const now = '2026-09-24T08:00:00.000Z'
const databases: FitLogDatabase[] = []
const newDatabase = (name = `cardio-${crypto.randomUUID()}`) => {
  const database = new FitLogDatabase(name)
  databases.push(database)
  return database
}
const record = (id = 'cardio-1'): LegacyCardioSessionV4 => ({ id, date, durationMinutes: 25, speed: 6.5, createdAt: now, updatedAt: now })
const stairInput = { date, activityType: 'stair_climber' as const, durationMinutes: 25, speed: 6.5 }
const treadmillInput = { date, activityType: 'treadmill' as const, durationMinutes: 30 }

afterEach(async () => {
  for (const database of databases.splice(0)) { database.close(); await database.delete() }
})

describe('有氧类型与记录', () => {
  it('旧记录没有类型时仍解释为楼梯机，统一格式化真实参数', () => {
    expect(getCardioActivityType(record())).toBe('stair_climber')
    expect(getCardioActivityLabel(record())).toBe('楼梯机')
    expect(formatCardioMetrics(record())).toEqual(['速度 6.5'])
    expect(formatCardioMetrics({ activityType: 'treadmill', speed: 6.5 })).toEqual(['速度 6.5 km/h'])
    expect(formatCardioMetrics({ activityType: 'treadmill', inclinePercent: 8 })).toEqual(['坡度 8%'])
    expect(formatCardioMetrics({ activityType: 'treadmill', speed: 6.5, inclinePercent: 8 })).toEqual(['速度 6.5 km/h', '坡度 8%'])
    expect(formatCardioMetrics({ activityType: 'treadmill', inclinePercent: 0 })).toEqual(['坡度 0%'])
  })

  it('楼梯机新增、按日期读取、编辑及删除，保存时去掉坡度', async () => {
    const database = newDatabase()
    const created = await saveCardioSession({ ...stairInput, inclinePercent: 8, note: '轻松' }, database)
    expect(created).toMatchObject({ activityType: 'stair_climber', speed: 6.5 })
    expect(created.inclinePercent).toBeUndefined()
    await database.cardioSessions.add({ ...record('untouched'), date: '2026-09-23' })
    expect(await getCardioSessionsByDate(date, database)).toEqual([created])
    const updated = await updateCardioSession(created.id, { ...stairInput, durationMinutes: 30, speed: 7 }, database)
    expect(updated).toMatchObject({ id: created.id, durationMinutes: 30, speed: 7, createdAt: created.createdAt })
    expect(updated.note).toBeUndefined()
    await deleteCardioSession(created.id, database)
    expect(await database.cardioSessions.get(created.id)).toBeUndefined()
    expect(await database.cardioSessions.get('untouched')).toMatchObject({ durationMinutes: 25, speed: 6.5 })
  })

  it('楼梯机拒绝缺失或无效速度、非正时间和无效业务日期', async () => {
    const database = newDatabase()
    for (const durationMinutes of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(saveCardioSession({ ...stairInput, durationMinutes }, database)).rejects.toThrow('时间')
    }
    for (const speed of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(saveCardioSession({ ...stairInput, speed }, database)).rejects.toThrow('速度')
    }
    await expect(saveCardioSession({ ...stairInput, date: '2026-02-30' }, database)).rejects.toThrow('日期')
    expect(await database.cardioSessions.count()).toBe(0)
  })

  it('跑步机速度、坡度或两项同时填写均可；坡度 0 合法', async () => {
    const database = newDatabase()
    const speedOnly = await saveCardioSession({ ...treadmillInput, speed: 6.5 }, database)
    const inclineOnly = await saveCardioSession({ ...treadmillInput, inclinePercent: 0 }, database)
    const both = await saveCardioSession({ ...treadmillInput, speed: 7, inclinePercent: 8.5 }, database)
    expect(speedOnly).toMatchObject({ activityType: 'treadmill', speed: 6.5 })
    expect(speedOnly.inclinePercent).toBeUndefined()
    expect(inclineOnly.speed).toBeUndefined()
    expect(inclineOnly.inclinePercent).toBe(0)
    expect(both).toMatchObject({ speed: 7, inclinePercent: 8.5 })
  })

  it('跑步机拒绝时间单独填写、无效速度或负坡度', () => {
    expect(() => validateCardioInput(treadmillInput)).toThrow('至少填写速度或坡度')
    for (const speed of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => validateCardioInput({ ...treadmillInput, speed })).toThrow('速度')
    }
    for (const inclinePercent of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => validateCardioInput({ ...treadmillInput, inclinePercent })).toThrow('坡度')
    }
    expect(() => validateCardioInput({ ...stairInput, activityType: 'unknown' as 'stair_climber' })).toThrow('训练类型')
  })

  it('编辑切换类型时清除不适用字段，只有坡度的跑步机不能直接改楼梯机', async () => {
    const database = newDatabase()
    const created = await saveCardioSession({ ...treadmillInput, speed: 6.5, inclinePercent: 8 }, database)
    const stair = await updateCardioSession(created.id, stairInput, database)
    expect(stair.activityType).toBe('stair_climber')
    expect(stair.inclinePercent).toBeUndefined()
    const inclineOnly = await updateCardioSession(created.id, { ...treadmillInput, inclinePercent: 5 }, database)
    expect(inclineOnly.speed).toBeUndefined()
    await expect(updateCardioSession(created.id, { ...stairInput, speed: undefined }, database)).rejects.toThrow('速度')
    expect((await database.cardioSessions.get(created.id))?.activityType).toBe('treadmill')
  })

  it('使用设备本地业务日期，不从 ISO 时间戳截取日期', async () => {
    const database = newDatabase()
    const localDate = getLocalDateString(new Date(2026, 8, 24, 0, 5))
    const created = await saveCardioSession({ ...stairInput, date: localDate }, database)
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
    expect(database.verno).toBe(8)
    expect(database.tables).toHaveLength(17)
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

function v4Backup(sessions: LegacyCardioSessionV4[] = [record()]): BackupDataV4 {
  const v3 = oldBackup(3) as BackupDataV3
  return { app: 'FitLog Lite', schemaVersion: 4, exportedAt: now, data: { ...v3.data, cardioSessions: sessions } }
}

describe('Backup V5 / Restore V1–V5', () => {
  it('V5 导出旧楼梯机时显式标记类型，不修改数据库原记录', async () => {
    const source = newDatabase(); await source.cardioSessions.add({ ...record(), note: '晚间' })
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(8)
    expect(backup.data.cardioSessions).toMatchObject([{ activityType: 'stair_climber', durationMinutes: 25, speed: 6.5, note: '晚间' }])
    expect((await source.cardioSessions.get('cardio-1'))?.activityType).toBeUndefined()
    const target = newDatabase(); await restoreBackup(JSON.parse(JSON.stringify(backup)), target)
    expect(await target.cardioSessions.get('cardio-1')).toMatchObject({ activityType: 'stair_climber', durationMinutes: 25, speed: 6.5, note: '晚间' })
  })

  it.each([1, 2, 3] as const)('Restore V%s 把缺失的 cardioSessions 视为空数组', async (version) => {
    const database = newDatabase(); await database.cardioSessions.add(record())
    expect(validateBackup(oldBackup(version)).data.cardioSessions).toEqual([])
    await restoreBackup(oldBackup(version), database)
    expect(await database.cardioSessions.count()).toBe(0)
  })

  it('Restore V4 保留旧楼梯机原始对象与速度语义', async () => {
    const database = newDatabase()
    const backup = v4Backup([{ ...record(), note: '旧记录' }])
    expect(validateBackup(backup).data.cardioSessions[0]?.activityType).toBeUndefined()
    await restoreBackup(backup, database)
    expect(await database.cardioSessions.get('cardio-1')).toEqual({ ...record(), note: '旧记录' })
  })

  it.each([{ durationMinutes: 0 }, { speed: 0 }, { date: '2026-02-30' }, { note: 3 }])('V4 非法 cardio 在清库前被拒绝：%j', async (change) => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const backup = v4Backup([{ ...record('bad'), ...change } as LegacyCardioSessionV4])
    await expect(restoreBackup(backup, database)).rejects.toThrow('有氧训练')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
  })

  it.each([
    [{ ...treadmillInput, speed: 6.5 }, 'speed-only'],
    [{ ...treadmillInput, inclinePercent: 8 }, 'incline-only'],
    [{ ...treadmillInput, speed: 6.5, inclinePercent: 8 }, 'both'],
  ] as const)('V5 跑步机 %s 备份可验证并恢复', async (values, label) => {
    const source = newDatabase()
    const session = await saveCardioSession(values, source)
    const backup = await exportBackup(source)
    expect(validateBackup(backup).data.cardioSessions).toHaveLength(1)
    const target = newDatabase(); await restoreBackup(JSON.parse(JSON.stringify(backup)), target)
    expect(await target.cardioSessions.get(session.id)).toMatchObject({ ...values, id: session.id })
    expect(label).toBeTruthy()
  })

  it.each([
    { activityType: undefined }, { activityType: 'unknown' }, { speed: undefined, inclinePercent: undefined },
    { speed: 0 }, { inclinePercent: -1 }, { durationMinutes: 0 },
  ])('V5 非法跑步机在清库前拒绝：%j', async (change) => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const session = { ...record('bad'), activityType: 'treadmill', inclinePercent: 8, ...change }
    const backup = await exportBackup(database)
    backup.data.cardioSessions = [session as CardioSession & { activityType: 'treadmill' }]
    await expect(restoreBackup(backup, database)).rejects.toThrow('有氧训练')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
  })

  it('V4 和 V5 缺少 cardioSessions 数组时都在清库前拒绝', async () => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const v4 = v4Backup(); delete (v4.data as Partial<typeof v4.data>).cardioSessions
    const v5 = await exportBackup(database); delete (v5.data as Partial<typeof v5.data>).cardioSessions
    await expect(restoreBackup(v4, database)).rejects.toThrow('cardioSessions')
    await expect(restoreBackup(v5, database)).rejects.toThrow('cardioSessions')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
  })

  it('有氧 store 写入失败时整个 Restore 回滚', async () => {
    const database = newDatabase(); await database.cardioSessions.add(record('preserved'))
    const backup = await exportBackup(database)
    backup.data.cardioSessions = [{ ...record('replacement'), activityType: 'stair_climber' }]
    vi.spyOn(database.cardioSessions, 'bulkAdd').mockRejectedValueOnce(new Error('有氧写入失败'))
    await expect(restoreBackup(backup, database)).rejects.toThrow('有氧写入失败')
    expect(await database.cardioSessions.get('preserved')).toBeDefined()
    expect(await database.cardioSessions.get('replacement')).toBeUndefined()
  })
})
