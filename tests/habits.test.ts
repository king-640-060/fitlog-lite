import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { createHabit, deleteHabitWithHistory, deleteUnusedHabit, getActiveHabits, getHabitCheckInsBetween, getHabitCheckInsByDate, reorderHabits, setHabitActive, toggleHabitCheckIn, updateHabit, validateHabitInput } from '../src/services/habitService'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { getLocalDateString } from '../src/utils/date'

const stamp = '2026-09-27T08:00:00.000Z'
const databases: FitLogDatabase[] = []
const database = (name = `habit-${crypto.randomUUID()}`) => { const result = new FitLogDatabase(name); databases.push(result); return result }
afterEach(async () => { for (const item of databases.splice(0)) { item.close(); await item.delete() } })

describe('习惯定义与本地打卡', () => {
  it('自由习惯无默认计划，名称和备注归一化', async () => {
    const db = database(); const habit = await createHabit({ name: '  面部肌肉松解  ', note: ' 轻做 ' }, db)
    expect(habit).toMatchObject({ name: '面部肌肉松解', note: '轻做', active: true, sortOrder: 0 })
    expect(habit.weekdays).toBeUndefined(); expect(habit.targetPerWeek).toBeUndefined()
    expect(await db.habits.count()).toBe(1)
  })
  it('计划日去重排序；非法日期和周目标拒绝', () => {
    expect(validateHabitInput({ name: '肩颈', weekdays: [5, 1, 5, 3], targetPerWeek: 7 })).toMatchObject({ weekdays: [1, 3, 5], targetPerWeek: 7 })
    for (const weekdays of [[0], [8], [1.5]]) expect(() => validateHabitInput({ name: '肩颈', weekdays })).toThrow('计划日')
    for (const targetPerWeek of [0, 8, 1.5]) expect(() => validateHabitInput({ name: '肩颈', targetPerWeek })).toThrow('周目标')
    expect(() => validateHabitInput({ name: ' '.repeat(3) })).toThrow('名称')
  })
  it('每习惯每日最多一次，切换可撤销，不同日期和习惯独立', async () => {
    const db = database(); const a = await createHabit({ name: 'A' }, db); const b = await createHabit({ name: 'B' }, db)
    expect(await toggleHabitCheckIn(a.id, '2026-09-27', db)).toBe(true)
    expect(await toggleHabitCheckIn(b.id, '2026-09-27', db)).toBe(true)
    expect(await toggleHabitCheckIn(a.id, '2026-09-26', db)).toBe(true)
    expect(await getHabitCheckInsByDate('2026-09-27', db)).toHaveLength(2)
    expect(await getHabitCheckInsBetween('2026-09-26', '2026-09-27', db)).toHaveLength(3)
    expect(await toggleHabitCheckIn(a.id, '2026-09-27', db)).toBe(false)
    expect(await getHabitCheckInsByDate('2026-09-27', db)).toHaveLength(1)
    await expect(toggleHabitCheckIn(a.id, '2026-02-30', db)).rejects.toThrow('本地日期')
    expect(getLocalDateString(new Date(2026, 8, 27, 23, 30))).toBe('2026-09-27')
  })
  it('计划日不是打卡限制；停用保留历史；重启与排序', async () => {
    const db = database(); const a = await createHabit({ name: 'A', weekdays: [1] }, db); const b = await createHabit({ name: 'B' }, db)
    await toggleHabitCheckIn(a.id, '2026-09-22', db) // Tuesday
    await reorderHabits([b.id, a.id], db)
    expect((await getActiveHabits(db)).map((item) => item.id)).toEqual([b.id, a.id])
    await setHabitActive(a.id, false, db)
    expect((await getActiveHabits(db)).map((item) => item.id)).toEqual([b.id])
    expect(await getHabitCheckInsByDate('2026-09-22', db)).toHaveLength(1)
    await expect(toggleHabitCheckIn(a.id, '2026-09-23', db)).rejects.toThrow('未启用')
    await expect(deleteUnusedHabit(a.id, db)).rejects.toThrow('停用')
    await setHabitActive(a.id, true, db)
    expect((await getActiveHabits(db)).map((item) => item.id)).toEqual([b.id, a.id])
    await updateHabit(b.id, { name: ' B 新 ' }, db)
    expect((await db.habits.get(b.id))?.name).toBe('B 新')
    await deleteUnusedHabit(b.id, db)
    expect(await db.habits.get(b.id)).toBeUndefined()
  })
  it('数据库复合唯一索引防止重复打卡', async () => {
    const db = database(); const habit = await createHabit({ name: 'A' }, db); await toggleHabitCheckIn(habit.id, '2026-09-27', db)
    const first = (await db.habitCheckIns.toArray())[0]!
    await expect(db.habitCheckIns.add({ ...first, id: crypto.randomUUID() })).rejects.toThrow()
    expect(await db.habitCheckIns.count()).toBe(1)
  })
})

describe('V5 → V6 与备份', () => {
  it('升级保留十个旧 store，只增加空习惯 store', async () => {
    const name = `habit-migrate-${crypto.randomUUID()}`; const legacy = new Dexie(name)
    legacy.version(5).stores({ foods: 'id, name, brand, [name+brand], createdAt', foodLogs: 'id, date, foodId, createdAt', exercises: 'id, name, createdAt', workouts: 'id, date, finishedAt, createdAt', weights: 'id, &date, createdAt', workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', nutritionTargets: 'id, &date, sourceTemplateId, createdAt', pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt', cardioSessions: 'id, date, createdAt' })
    await legacy.open(); for (const store of legacy.tables) await store.add({ id: `${store.name}-old`, date: '2026-09-27' }); legacy.close()
    const db = database(name); await db.open()
    expect(db.verno).toBe(10); expect(db.tables).toHaveLength(18)
    for (const store of ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions', 'cardioSessions']) expect(await db.table(store).get(`${store}-old`)).toBeDefined()
    expect(await db.habits.count()).toBe(0); expect(await db.habitCheckIns.count()).toBe(0)
  })
  it('V6 往返保留停用习惯和历史打卡；V5 恢复清空习惯', async () => {
    const source = database(); const habit = await createHabit({ name: '拉伸', targetPerWeek: 3 }, source)
    await toggleHabitCheckIn(habit.id, '2026-09-27', source); await setHabitActive(habit.id, false, source)
    const backup = await exportBackup(source); expect(backup.schemaVersion).toBe(10)
    const target = database(); await restoreBackup(backup, target)
    expect(await target.habits.get(habit.id)).toMatchObject({ active: false, targetPerWeek: 3 })
    expect(await target.habitCheckIns.count()).toBe(1)
    const v5 = { ...backup, schemaVersion: 5, data: Object.fromEntries(Object.entries(backup.data).filter(([key]) => !['habits', 'habitCheckIns'].includes(key))) }
    expect(validateBackup(v5).data.habits).toEqual([])
    await restoreBackup(v5, target)
    expect(await target.habits.count()).toBe(0); expect(await target.habitCheckIns.count()).toBe(0)
  })
  it('V1–V5 恢复都不制造习惯或打卡', async () => {
    const db = database(); const habit = await createHabit({ name: '原有' }, db)
    await toggleHabitCheckIn(habit.id, '2026-09-27', db)
    const latest = await exportBackup(db)
    const byVersion: Record<number, string[]> = {
      1: ['foods', 'foodLogs', 'exercises', 'workouts', 'weights'],
      2: ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates'],
      3: ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions'],
      4: ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions', 'cardioSessions'],
      5: ['foods', 'foodLogs', 'exercises', 'workouts', 'weights', 'workoutTemplates', 'dietTemplates', 'nutritionTargets', 'pelvicFloorSessions', 'cardioSessions'],
    }
    for (const version of [1, 2, 3, 4, 5]) {
      const backup = { ...latest, schemaVersion: version, data: Object.fromEntries(Object.entries(latest.data).filter(([key]) => byVersion[version]!.includes(key))) }
      expect(validateBackup(backup).data).toMatchObject({ habits: [], habitCheckIns: [] })
      await restoreBackup(backup, db)
      expect(await db.habits.count()).toBe(0)
      expect(await db.habitCheckIns.count()).toBe(0)
      await db.habits.add(habit)
      await db.habitCheckIns.add({ id: `again-${version}`, habitId: habit.id, date: '2026-09-27', completedAt: stamp, createdAt: stamp, updatedAt: stamp })
    }
  })
  it('拒绝重复 habit/date 与 orphan，旧数据保持原状', async () => {
    const db = database(); const habit = await createHabit({ name: '原有' }, db)
    const backup = await exportBackup(db)
    const now = new Date().toISOString()
    const checkIn = { id: 'c1', habitId: habit.id, date: '2026-09-27', completedAt: now, createdAt: now, updatedAt: now }
    backup.data.habitCheckIns = [checkIn, { ...checkIn, id: 'c2' }]
    await expect(restoreBackup(backup, db)).rejects.toThrow('重复')
    backup.data.habitCheckIns = [{ ...checkIn, habitId: 'missing' }]
    await expect(restoreBackup(backup, db)).rejects.toThrow('habitId')
    expect(await db.habits.get(habit.id)).toBeDefined()
  })
  it('V6 在清库前拒绝无效习惯字段与打卡日期', async () => {
    const db = database(); await createHabit({ name: '原有' }, db)
    const backup = await exportBackup(db)
    backup.data.habits[0]!.weekdays = [0]
    await expect(restoreBackup(backup, db)).rejects.toThrow('weekdays')
    backup.data.habits[0]!.weekdays = [1]
    backup.data.habitCheckIns.push({ id: 'bad', habitId: backup.data.habits[0]!.id, date: '2026-02-30', completedAt: stamp, createdAt: stamp, updatedAt: stamp })
    await expect(restoreBackup(backup, db)).rejects.toThrow('date')
    expect(await db.habits.count()).toBe(1)
  })
})


describe('manual permanent deletion', () => {
  it('deletes all owned records atomically; unrelated records remain', async () => {
    const db=database(), a=await createHabit({name:'A'},db), b=await createHabit({name:'B'},db)
    for (const date of ['2026-09-27','2026-09-28']) await toggleHabitCheckIn(a.id,date,db)
    await toggleHabitCheckIn(b.id,'2026-09-27',db)
    await deleteHabitWithHistory(a.id,db,2)
    expect(await db.habits.get(a.id)).toBeUndefined();expect(await db.habitCheckIns.where('habitId').equals(a.id).count()).toBe(0)
    expect(await db.habits.get(b.id)).toBeDefined();expect(await db.habitCheckIns.count()).toBe(1)
  })
  it('injected Habit deletion failure rolls back already deleted check-ins', async () => {
    const db=database(), a=await createHabit({name:'A'},db);await toggleHabitCheckIn(a.id,'2026-09-27',db)
    const before=await exportBackup(db), injected=vi.spyOn(db.habits,'delete').mockRejectedValueOnce(new Error('injected'))
    await expect(deleteHabitWithHistory(a.id,db)).rejects.toThrow('injected');injected.mockRestore()
    expect((await exportBackup(db)).data).toEqual(before.data)
  })
  it('missing Habit and stale count abort without deleting data', async () => {
    const db=database(), a=await createHabit({name:'A'},db);await toggleHabitCheckIn(a.id,'2026-09-27',db)
    await expect(deleteHabitWithHistory('missing',db)).rejects.toThrow()
    await expect(deleteHabitWithHistory(a.id,db,0)).rejects.toThrow('重新确认')
    expect(await db.habits.count()).toBe(1);expect(await db.habitCheckIns.count()).toBe(1)
  })
})
