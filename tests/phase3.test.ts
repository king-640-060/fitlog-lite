import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { BackupDataV1, BackupDataV2, BackupDataV3, DietTemplate, Food, PelvicFloorSession } from '../src/db/types'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import {
  NutritionTargetConflictError, applyDietTemplate, dietTemplateItemFromFood, normalizeDietTemplate,
} from '../src/services/templateService'
import {
  advancePelvicFloorTimer, createPelvicFloorTimer, finishPelvicFloorTimer, getPelvicFloorPhaseProgress, getPelvicFloorRemainingSeconds,
  pausePelvicFloorTimer, resumePelvicFloorTimer, startPelvicFloorTimer, pelvicFloorRoutines,
} from '../src/services/pelvicFloorTimer'
import { deletePelvicFloorSession, sessionFromPelvicFloorTimer } from '../src/services/pelvicFloorService'
import { loadMonthSummaries } from '../src/ui/calendarPage'
import { getLocalDateString } from '../src/utils/date'

const databases: FitLogDatabase[] = []
const now = '2026-09-21T08:00:00.000Z'

function newDatabase(name = `fitlog-phase3-${crypto.randomUUID()}`): FitLogDatabase {
  const database = new FitLogDatabase(name)
  databases.push(database)
  return database
}

function food(): Food {
  return { id: 'food-1', name: '燕麦', referenceGrams: 100, calories: 380, protein: 13, carbs: 68, fat: 7, createdAt: now, updatedAt: now }
}

function template(goal = true): DietTemplate {
  return {
    id: 'diet-template-1', name: '早餐', items: [dietTemplateItemFromFood(food(), 50)],
    nutritionGoal: goal ? { calories: 2200, protein: 160 } : undefined,
    createdAt: now, updatedAt: now,
  }
}

function v1Backup(): BackupDataV1 {
  return { app: 'FitLog Lite', schemaVersion: 1, exportedAt: now, data: { foods: [food()], foodLogs: [], exercises: [], workouts: [], weights: [] } }
}

function v2Backup(): BackupDataV2 {
  return { ...v1Backup(), schemaVersion: 2, data: { ...v1Backup().data, workoutTemplates: [], dietTemplates: [template(false)] } }
}

function session(): PelvicFloorSession {
  return {
    id: 'pelvic-1', date: '2026-09-21', startedAt: now, finishedAt: '2026-09-21T08:01:00.000Z',
    phases: [{ type: 'contract', durationSeconds: 3 }, { type: 'relax', durationSeconds: 3 }],
    repetitions: 10, completedRepetitions: 10, createdAt: now, updatedAt: now,
  }
}

function v3Backup(): BackupDataV3 {
  return {
    ...v2Backup(), schemaVersion: 3,
    data: {
      ...v2Backup().data,
      dietTemplates: [template()],
      nutritionTargets: [{ id: 'target-1', date: '2026-09-21', calories: 2200, protein: 160, createdAt: now, updatedAt: now }],
      pelvicFloorSessions: [session()],
    },
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  for (const database of databases.splice(0)) {
    database.close()
    await database.delete()
  }
})

describe('Dexie V3 migration', () => {
  it('从 V2 升级时保留旧数据并创建两个新 stores', async () => {
    const name = `fitlog-v2-to-v3-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(2).stores({
      foods: 'id, name, brand, [name+brand], createdAt', foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt', workouts: 'id, date, finishedAt, createdAt', weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt', dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
    })
    await legacy.open()
    await legacy.table('foods').add(food())
    await legacy.table('foodLogs').add({ id: 'log-1', date: '2026-09-21', foodName: '燕麦', grams: 50, referenceGrams: 100, caloriesPerReference: 380, totalCalories: 190, createdAt: now, updatedAt: now })
    await legacy.table('exercises').add({ id: 'exercise-1', name: '深蹲', createdAt: now, updatedAt: now })
    await legacy.table('workouts').add({ id: 'workout-1', date: '2026-09-21', startedAt: now, finishedAt: now, exercises: [], createdAt: now, updatedAt: now })
    await legacy.table('weights').add({ id: 'weight-1', date: '2026-09-21', weightKg: 72, createdAt: now, updatedAt: now })
    await legacy.table('workoutTemplates').add({ id: 'workout-template-1', name: '腿部', exercises: [], createdAt: now, updatedAt: now })
    await legacy.table('dietTemplates').add(template(false))
    legacy.close()

    const database = newDatabase(name)
    await database.open()
    expect(await Promise.all([
      database.foods.count(), database.foodLogs.count(), database.exercises.count(), database.workouts.count(),
      database.weights.count(), database.workoutTemplates.count(), database.dietTemplates.count(),
    ])).toEqual([1, 1, 1, 1, 1, 1, 1])
    expect(await Promise.all([database.nutritionTargets.count(), database.pelvicFloorSessions.count()])).toEqual([0, 0])
  })
})

describe('DietTemplate nutrition goals', () => {
  it('没有 nutritionGoal 的旧模板仍然有效', () => {
    expect(normalizeDietTemplate(template(false)).nutritionGoal).toBeUndefined()
  })

  it('允许部分目标并拒绝负数，全部为空等价于无目标', () => {
    expect(normalizeDietTemplate({ ...template(false), nutritionGoal: { protein: 160 } }).nutritionGoal).toEqual({ calories: undefined, protein: 160, carbs: undefined, fat: undefined })
    expect(normalizeDietTemplate({ ...template(false), nutritionGoal: {} }).nutritionGoal).toBeUndefined()
    expect(() => normalizeDietTemplate({ ...template(false), nutritionGoal: { calories: -1 } })).toThrow('目标热量')
  })

  it('应用模板在同一事务创建 FoodLog、NutritionTarget 并更新 lastUsedAt', async () => {
    const database = newDatabase(); await database.foods.add(food()); await database.dietTemplates.add(template())
    await applyDietTemplate(template(), '2026-09-21', database)
    expect(await database.foodLogs.count()).toBe(1)
    expect((await database.foodLogs.toCollection().first())?.meal).toBeUndefined()
    expect(await database.nutritionTargets.where('date').equals('2026-09-21').first()).toMatchObject({ calories: 2200, protein: 160, sourceTemplateId: 'diet-template-1' })
    expect((await database.dietTemplates.get('diet-template-1'))?.lastUsedAt).toBeTruthy()
  })

  it('已有目标不会静默覆盖，明确 replace 后才更新', async () => {
    const database = newDatabase(); await database.dietTemplates.add(template())
    await database.nutritionTargets.add({ id: 'existing', date: '2026-09-21', calories: 1800, createdAt: now, updatedAt: now })
    await expect(applyDietTemplate(template(), '2026-09-21', database)).rejects.toBeInstanceOf(NutritionTargetConflictError)
    expect(await database.foodLogs.count()).toBe(0)
    expect((await database.nutritionTargets.get('existing'))?.calories).toBe(1800)
    await applyDietTemplate(template(), '2026-09-21', database, { replaceNutritionTarget: true })
    expect((await database.nutritionTargets.get('existing'))?.calories).toBe(2200)
  })

  it('明确 preserve 时添加 FoodLog 并保留原目标', async () => {
    const database = newDatabase(); await database.dietTemplates.add(template())
    await database.nutritionTargets.add({ id: 'existing', date: '2026-09-21', calories: 1800, createdAt: now, updatedAt: now })
    await applyDietTemplate(template(), '2026-09-21', database, { preserveNutritionTarget: true })
    expect(await database.foodLogs.count()).toBe(1)
    expect((await database.nutritionTargets.get('existing'))?.calories).toBe(1800)
  })

  it('NutritionTarget 写入失败时 FoodLogs 和 lastUsedAt 一起 rollback', async () => {
    const database = newDatabase(); await database.dietTemplates.add(template())
    vi.spyOn(database.nutritionTargets, 'put').mockRejectedValueOnce(new Error('目标写入失败'))
    await expect(applyDietTemplate(template(), '2026-09-21', database)).rejects.toThrow('目标写入失败')
    expect(await database.foodLogs.count()).toBe(0)
    expect((await database.dietTemplates.get('diet-template-1'))?.lastUsedAt).toBeUndefined()
  })
})

describe('Backup V3', () => {
  it('导出并恢复两个新 stores', async () => {
    const source = newDatabase(); await source.nutritionTargets.add(v3Backup().data.nutritionTargets[0]!); await source.pelvicFloorSessions.add(session())
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(4)
    expect(backup.data.nutritionTargets).toHaveLength(1)
    expect(backup.data.pelvicFloorSessions).toHaveLength(1)
    const target = newDatabase(); await restoreBackup(backup, target)
    expect(await Promise.all([target.nutritionTargets.count(), target.pelvicFloorSessions.count()])).toEqual([1, 1])
  })

  it.each([['V1', v1Backup()], ['V2', v2Backup()]])('Restore %s 时新 stores 为空', async (_label, backup) => {
    const database = newDatabase(); await database.nutritionTargets.add(v3Backup().data.nutritionTargets[0]!); await database.pelvicFloorSessions.add(session())
    await restoreBackup(backup, database)
    expect(await Promise.all([database.nutritionTargets.count(), database.pelvicFloorSessions.count()])).toEqual([0, 0])
  })

  it('Restore V3 完整保留新数据', async () => {
    const database = newDatabase(); await restoreBackup(v3Backup(), database)
    expect(await database.nutritionTargets.get('target-1')).toMatchObject({ calories: 2200 })
    expect(await database.pelvicFloorSessions.get('pelvic-1')).toMatchObject({ completedRepetitions: 10 })
  })

  it('非法 NutritionTarget 与 PelvicFloorSession 在 clear 前被拒绝', async () => {
    const database = newDatabase(); await database.foods.add(food())
    const invalidTarget = v3Backup(); invalidTarget.data.nutritionTargets[0]!.calories = -1
    await expect(restoreBackup(invalidTarget, database)).rejects.toThrow('营养目标第 1 项')
    expect(await database.foods.count()).toBe(1)
    const invalidSession = v3Backup(); invalidSession.data.pelvicFloorSessions[0]!.phases[0]!.durationSeconds = 0
    await expect(restoreBackup(invalidSession, database)).rejects.toThrow('凯格尔训练第 1 项')
    expect(await database.foods.count()).toBe(1)
  })

  it('新 store 写入失败时九个 stores 一起 rollback', async () => {
    const database = newDatabase(); await database.foods.add(food())
    vi.spyOn(database.pelvicFloorSessions, 'bulkAdd').mockRejectedValueOnce(new Error('训练写入失败'))
    await expect(restoreBackup(v3Backup(), database)).rejects.toThrow('训练写入失败')
    expect(await database.foods.get('food-1')).toBeTruthy()
    expect(await database.nutritionTargets.count()).toBe(0)
  })

  it('拒绝重复 NutritionTarget date', () => {
    const backup = v3Backup(); backup.data.nutritionTargets.push({ ...backup.data.nutritionTargets[0]!, id: 'target-2' })
    expect(() => validateBackup(backup)).toThrow('date 重复')
  })
})

describe('Pelvic floor timer pure state', () => {
  const config = { contractSeconds: 3, relaxSeconds: 3, repetitions: 2 }

  it('contract → relax → next repetition → completed', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer(config), 1000)
    const relax = advancePelvicFloorTimer(started, 4000)
    expect(relax).toMatchObject({ status: 'running', activePhase: 'relax', completedRepetitions: 0 })
    const next = advancePelvicFloorTimer(relax, 7000)
    expect(next).toMatchObject({ status: 'running', activePhase: 'contract', completedRepetitions: 1 })
    expect(advancePelvicFloorTimer(next, 13000)).toMatchObject({ status: 'completed', completedRepetitions: 2, finishedAtMs: 13000 })
  })

  it('pause / resume 保留剩余时间', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer(config), 1000)
    const paused = pausePelvicFloorTimer(started, 2000)
    expect(paused).toMatchObject({ status: 'paused', activePhase: 'contract', pausedRemainingMs: 2000 })
    const resumed = resumePelvicFloorTimer(paused, 10000)
    expect(resumed).toMatchObject({ status: 'running', activePhase: 'contract', deadlineMs: 12000 })
    expect(getPelvicFloorRemainingSeconds(resumed, 10500)).toBe(2)
    expect(getPelvicFloorPhaseProgress(paused, 10000)).toBeCloseTo(1 / 3)
    expect(getPelvicFloorPhaseProgress(resumed, 10500)).toBeCloseTo(0.5)
  })

  it('finish 保存当前完成次数', () => {
    const running = advancePelvicFloorTimer(startPelvicFloorTimer(createPelvicFloorTimer(config), 0), 6500)
    expect(finishPelvicFloorTimer(running, 7000)).toMatchObject({ status: 'completed', completedRepetitions: 1, finishedAtMs: 7000 })
  })

  it('deadline correction 一次跨过多个阶段，覆盖后台 elapsed time', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer({ ...config, repetitions: 10 }), 0)
    expect(advancePelvicFloorTimer(started, 18_500)).toMatchObject({ status: 'running', activePhase: 'contract', completedRepetitions: 3, deadlineMs: 21_000 })
  })

  it('慢速耐力按 contract → hold → release → relax 推进并重复', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer(pelvicFloorRoutines[0]!), 0)
    expect(started).toMatchObject({ activePhase: 'contract', phaseIndex: 0, deadlineMs: 2000 })
    expect(advancePelvicFloorTimer(started, 2000)).toMatchObject({ activePhase: 'hold', phaseIndex: 1, deadlineMs: 7000 })
    expect(advancePelvicFloorTimer(started, 7000)).toMatchObject({ activePhase: 'release', phaseIndex: 2, deadlineMs: 9000 })
    expect(advancePelvicFloorTimer(started, 9000)).toMatchObject({ activePhase: 'relax', phaseIndex: 3, deadlineMs: 14000 })
    expect(advancePelvicFloorTimer(started, 14000)).toMatchObject({ activePhase: 'contract', phaseIndex: 0, repetitionIndex: 1, completedRepetitions: 1 })
  })

  it('跨组休息后进入下一组，延迟回调能一次追上多个阶段', () => {
    const routine = { id: 'sets', name: '组测试', description: '', exercises: [{ id: 'a', name: '动作', repetitions: 2, sets: 2,
      restBetweenSetsSeconds: 3, phases: [{ type: 'contract' as const, durationSeconds: 1 }, { type: 'relax' as const, durationSeconds: 1 }] }] }
    const started = startPelvicFloorTimer(createPelvicFloorTimer(routine), 0)
    expect(advancePelvicFloorTimer(started, 4000)).toMatchObject({ activePhase: 'rest', restKind: 'set', completedRepetitions: 2, deadlineMs: 7000 })
    expect(advancePelvicFloorTimer(started, 8500)).toMatchObject({ activePhase: 'relax', setIndex: 1, repetitionIndex: 0, deadlineMs: 9000 })
    const completed = advancePelvicFloorTimer(started, 15000)
    expect(completed).toMatchObject({ status: 'completed', completedRepetitions: 4, finishedAtMs: 11000 })
    expect(advancePelvicFloorTimer(completed, 20000)).toBe(completed)
  })

  it('混合训练从慢速动作经休息进入快速动作并完成', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer(pelvicFloorRoutines[2]!), 0)
    expect(advancePelvicFloorTimer(started, 140000)).toMatchObject({ activePhase: 'rest', restKind: 'exercise', exerciseIndex: 0, completedRepetitions: 10 })
    expect(advancePelvicFloorTimer(started, 151000)).toMatchObject({ activePhase: 'relax', exerciseIndex: 1, repetitionIndex: 0, deadlineMs: 152000 })
    expect(advancePelvicFloorTimer(started, 200000)).toMatchObject({ status: 'completed', completedRepetitions: 22, finishedAtMs: 174000 })
  })

  it('暂停时进度精确冻结，恢复后由 deadline 决定状态，与绘制次数无关', () => {
    const started = startPelvicFloorTimer(createPelvicFloorTimer(pelvicFloorRoutines[0]!), 0)
    const paused = pausePelvicFloorTimer(started, 750)
    expect(getPelvicFloorPhaseProgress(paused, 100000)).toBeCloseTo(0.375)
    expect(getPelvicFloorRemainingSeconds(paused, 100000)).toBe(2)
    const resumed = resumePelvicFloorTimer(paused, 100000)
    expect(resumed.deadlineMs).toBe(101250)
    expect(getPelvicFloorPhaseProgress(resumed, 100000)).toBeCloseTo(0.375)
    expect(advancePelvicFloorTimer(resumed, 101250)).toMatchObject({ activePhase: 'hold', deadlineMs: 106250 })
  })
})

describe('Pelvic floor backup compatibility', () => {
  it('V4 可选完成类型往返保留，非法值在清空数据前被拒绝', async () => {
    const routine = pelvicFloorRoutines.find((item) => item.id === 'plan-foundation')!
    const state = advancePelvicFloorTimer(startPelvicFloorTimer(createPelvicFloorTimer(routine), 0), 163000)
    const source = newDatabase()
    await source.pelvicFloorSessions.add(sessionFromPelvicFloorTimer(state, '2026-09-21', 'completed'))
    const backup = await exportBackup(source)
    const target = newDatabase()
    await restoreBackup(backup, target)
    expect((await target.pelvicFloorSessions.toArray())[0]).toMatchObject({ completionType: 'completed', routine: { id: 'plan-foundation' } })
    backup.data.pelvicFloorSessions[0]!.completionType = 'invalid' as 'completed'
    await expect(restoreBackup(backup, target)).rejects.toThrow('completionType')
    expect(await target.pelvicFloorSessions.count()).toBe(1)
  })

  it('旧 contract/relax V3 记录仍能导出、恢复且不被推断为新模式', async () => {
    const source = newDatabase(); await source.pelvicFloorSessions.add(session())
    const backup = await exportBackup(source)
    expect(backup.data.pelvicFloorSessions[0]?.routine).toBeUndefined()
    const target = newDatabase(); await restoreBackup(backup, target)
    expect(await target.pelvicFloorSessions.get('pelvic-1')).toMatchObject({ phases: [{ type: 'contract' }, { type: 'relax' }] })
    expect((await target.pelvicFloorSessions.get('pelvic-1'))?.routine).toBeUndefined()
  })

  it('新混合训练快照通过 V3 backup 验证并往返恢复', async () => {
    const state = advancePelvicFloorTimer(startPelvicFloorTimer(createPelvicFloorTimer(pelvicFloorRoutines[2]!), 0), 174000)
    const source = newDatabase(); await source.pelvicFloorSessions.add(sessionFromPelvicFloorTimer(state, '2026-09-21', 'completed'))
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(4)
    expect(backup.data.pelvicFloorSessions[0]?.routine?.name).toBe('混合训练')
    const target = newDatabase(); await restoreBackup(backup, target)
    expect((await target.pelvicFloorSessions.toArray())[0]?.routine?.exercises).toHaveLength(2)
  })

  it('新训练快照里的无效阶段在清空旧数据前被拒绝', async () => {
    const database = newDatabase(); await database.foods.add(food())
    const state = advancePelvicFloorTimer(startPelvicFloorTimer(createPelvicFloorTimer(pelvicFloorRoutines[2]!), 0), 174000)
    const backup = v3Backup()
    backup.data.pelvicFloorSessions = [sessionFromPelvicFloorTimer(state, '2026-09-21', 'completed')]
    backup.data.pelvicFloorSessions[0]!.routine!.exercises[1]!.phases[0]!.type = 'invalid' as 'contract'
    await expect(restoreBackup(backup, database)).rejects.toThrow('无效阶段')
    expect(await database.foods.count()).toBe(1)
  })
})

describe('Kegel session deletion', () => {
  it('按唯一 ID 删除指定记录，保留其他记录并刷新聚合结果', async () => {
    const database = newDatabase()
    const target = session()
    const untouched = {
      ...session(), id: 'pelvic-2', startedAt: '2026-09-21T09:00:00.000Z', finishedAt: '2026-09-21T09:00:30.000Z',
    }
    await database.pelvicFloorSessions.bulkAdd([target, untouched])

    await deletePelvicFloorSession(target.id, database)

    expect(await database.pelvicFloorSessions.get(target.id)).toBeUndefined()
    expect(await database.pelvicFloorSessions.get(untouched.id)).toMatchObject({ id: untouched.id })
    expect(await database.pelvicFloorSessions.where('date').equals(target.date).count()).toBe(1)
    expect((await loadMonthSummaries(2026, 8, database)).get(target.date)).toMatchObject({ pelvicFloorSessionCount: 1, pelvicFloorContractions: 10, pelvicFloorSeconds: 30 })

    await expect(deletePelvicFloorSession('missing-session', database)).resolves.toBeUndefined()
    expect(await database.pelvicFloorSessions.count()).toBe(1)
  })
})

describe('Calendar V3 aggregation', () => {
  it('聚合 NutritionTarget 和 PelvicFloorSession，并保持本地日期行为', async () => {
    const database = newDatabase()
    await database.nutritionTargets.add(v3Backup().data.nutritionTargets[0]!)
    await database.pelvicFloorSessions.add(session())
    const summary = (await loadMonthSummaries(2026, 8, database)).get('2026-09-21')
    expect(summary).toMatchObject({ nutritionTarget: { calories: 2200 }, pelvicFloorSessionCount: 1, pelvicFloorContractions: 10, pelvicFloorSeconds: 60 })
    expect(getLocalDateString(new Date(2026, 8, 21, 0, 5))).toBe('2026-09-21')
  })
})
