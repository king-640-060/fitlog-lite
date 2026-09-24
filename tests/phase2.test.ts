import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase, STARTER_EXERCISE_NAMES } from '../src/db/database'
import type { BackupDataV1, BackupDataV2, DietTemplate, Food, Workout, WorkoutTemplate } from '../src/db/types'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import {
  applyDietTemplate, dietTemplateFromLogs, dietTemplateItemFromFood, duplicateDietTemplate, duplicateWorkoutTemplate,
  saveDietTemplate, saveWorkoutTemplate, startWorkoutFromTemplate, workoutTemplateFromWorkout,
} from '../src/services/templateService'

const databases: FitLogDatabase[] = []
const now = '2026-09-17T02:00:00.000Z'

function newDatabase(name = `fitlog-phase2-${crypto.randomUUID()}`): FitLogDatabase {
  const database = new FitLogDatabase(name)
  databases.push(database)
  return database
}

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'food-1', name: '鸡胸肉', referenceGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, createdAt: now, updatedAt: now, ...overrides }
}

function workoutTemplate(): WorkoutTemplate {
  return {
    id: 'workout-template-1', name: 'Push Day', createdAt: now, updatedAt: now,
    exercises: [{ id: 'template-exercise-1', exerciseId: 'exercise-1', exerciseName: '杠铃卧推', sets: [{ id: 'template-set-1', weightKg: 80, reps: 10, rpe: 8 }] }],
  }
}

function dietTemplate(): DietTemplate {
  return {
    id: 'diet-template-1', name: '训练日早餐', createdAt: now, updatedAt: now,
    items: [dietTemplateItemFromFood(food(), 200)],
  }
}

function v1Backup(): BackupDataV1 {
  return {
    app: 'FitLog Lite', schemaVersion: 1, exportedAt: now,
    data: {
      foods: [food()], foodLogs: [],
      exercises: [{ id: 'exercise-1', name: '杠铃卧推', createdAt: now, updatedAt: now }],
      workouts: [], weights: [{ id: 'weight-1', date: '2026-09-17', weightKg: 72.3, createdAt: now, updatedAt: now }],
    },
  }
}

function v2Backup(): BackupDataV2 {
  const old = v1Backup()
  return { ...old, schemaVersion: 2, data: { ...old.data, workoutTemplates: [workoutTemplate()], dietTemplates: [dietTemplate()] } }
}

afterEach(async () => {
  vi.restoreAllMocks()
  for (const database of databases.splice(0)) {
    database.close()
    await database.delete()
  }
})

describe('Exercise starter data lifecycle', () => {
  it('首次创建数据库时自动加入 7 个默认动作', async () => {
    const database = newDatabase()
    await database.open()

    const names = (await database.exercises.toArray()).map((exercise) => exercise.name)
    expect(names).toHaveLength(STARTER_EXERCISE_NAMES.length)
    expect(new Set(names)).toEqual(new Set(STARTER_EXERCISE_NAMES))
  })

  it('删除一个默认动作后 close/reopen 不会重新出现', async () => {
    const database = newDatabase()
    await database.open()
    const deleted = await database.exercises.where('name').equals(STARTER_EXERCISE_NAMES[0]).first()
    await database.exercises.delete(deleted!.id)
    database.close()

    await database.open()
    expect(await database.exercises.where('name').equals(STARTER_EXERCISE_NAMES[0]).count()).toBe(0)
    expect(await database.exercises.count()).toBe(STARTER_EXERCISE_NAMES.length - 1)
  })

  it('删除全部默认动作后 close/reopen 仍保持为空', async () => {
    const database = newDatabase()
    await database.open()
    await database.exercises.clear()
    database.close()

    await database.open()
    expect(await database.exercises.count()).toBe(0)
  })

  it('已经存在且动作列表为空的 V2 DB 不会 seed', async () => {
    const name = `fitlog-existing-empty-${crypto.randomUUID()}`
    const existing = new Dexie(name)
    existing.version(2).stores({
      foods: 'id, name, brand, [name+brand], createdAt',
      foodLogs: 'id, date, foodId, createdAt',
      exercises: 'id, name, createdAt',
      workouts: 'id, date, finishedAt, createdAt',
      weights: 'id, &date, createdAt',
      workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
      dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
    })
    await existing.open()
    existing.close()

    const database = newDatabase(name)
    await database.open()
    expect(await database.exercises.count()).toBe(0)
  })

  it('Restore 空 Exercise 列表后 close/reopen 仍保持为空', async () => {
    const database = newDatabase()
    await database.open()
    const backup = v1Backup()
    backup.data.exercises = []
    await restoreBackup(backup, database)
    database.close()

    await database.open()
    expect(await database.exercises.count()).toBe(0)
  })
})

describe('数据库 V2 migration', () => {
  it('从 V1 升级后保留旧五表并创建模板 stores', async () => {
    const name = `fitlog-migration-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({ foods: 'id, name', foodLogs: 'id, date', exercises: 'id, name', workouts: 'id, date', weights: 'id, &date' })
    await legacy.open()
    await legacy.table('foods').add(food())
    await legacy.table('foodLogs').add({ id: 'log-1', date: '2026-09-17', foodName: '鸡胸肉', grams: 100, referenceGrams: 100, caloriesPerReference: 165, totalCalories: 165, createdAt: now, updatedAt: now })
    await legacy.table('exercises').add({ id: 'exercise-1', name: '杠铃卧推', createdAt: now, updatedAt: now })
    await legacy.table('workouts').add({ id: 'workout-1', date: '2026-09-17', startedAt: now, exercises: [], createdAt: now, updatedAt: now })
    await legacy.table('weights').add({ id: 'weight-1', date: '2026-09-17', weightKg: 72, createdAt: now, updatedAt: now })
    legacy.close()

    const database = newDatabase(name)
    await database.open()
    expect(await Promise.all([database.foods.count(), database.foodLogs.count(), database.exercises.count(), database.workouts.count(), database.weights.count()])).toEqual([1, 1, 1, 1, 1])
    expect(await Promise.all([database.workoutTemplates.count(), database.dietTemplates.count()])).toEqual([0, 0])
  })
})

describe('Workout Templates', () => {
  it('创建并验证训练模板', async () => {
    const database = newDatabase()
    const saved = await saveWorkoutTemplate(workoutTemplate(), database)
    expect(saved.name).toBe('Push Day')
    expect(await database.workoutTemplates.count()).toBe(1)
  })

  it('复制模板会刷新全部嵌套 ID', () => {
    const source = workoutTemplate(); const copy = duplicateWorkoutTemplate(source)
    expect(copy.id).not.toBe(source.id)
    expect(copy.exercises[0]!.id).not.toBe(source.exercises[0]!.id)
    expect(copy.exercises[0]!.sets[0]!.id).not.toBe(source.exercises[0]!.sets[0]!.id)
  })

  it('模板生成 Workout 时 deep clone，互不影响', async () => {
    const database = newDatabase(); const template = workoutTemplate()
    await database.exercises.add({ id: 'exercise-1', name: '卧推（最新）', createdAt: now, updatedAt: now })
    await database.workoutTemplates.add(template)
    const generated = await startWorkoutFromTemplate(template, '2026-09-14', database)
    expect(generated.date).toBe('2026-09-14')
    expect(generated.exercises[0]!.exerciseName).toBe('卧推（最新）')
    expect(generated.exercises[0]!.id).not.toBe(template.exercises[0]!.id)
    expect(generated.exercises[0]!.sets[0]!.id).not.toBe(template.exercises[0]!.sets[0]!.id)
    expect(generated.exercises[0]!.sets[0]!.rpe).toBe(8)
    generated.exercises[0]!.sets[0]!.weightKg = 82.5
    await database.workouts.put(generated)
    expect((await database.workoutTemplates.get(template.id))!.exercises[0]!.sets[0]!.weightKg).toBe(80)
    template.exercises[0]!.sets[0]!.reps = 5
    await database.workoutTemplates.put(template)
    expect((await database.workouts.get(generated.id))!.exercises[0]!.sets[0]!.reps).toBe(10)
  })

  it('删除模板不删除历史 Workout', async () => {
    const database = newDatabase(); const template = workoutTemplate()
    await database.workoutTemplates.add(template)
    await database.exercises.add({ id: 'exercise-1', name: '杠铃卧推', createdAt: now, updatedAt: now })
    const generated = await startWorkoutFromTemplate(template, '2026-09-17', database)
    await database.workoutTemplates.delete(template.id)
    expect(await database.workouts.get(generated.id)).toBeTruthy()
  })

  it('动作删除后使用 exerciseName 快照且清除 exerciseId', async () => {
    const database = newDatabase(); const template = workoutTemplate()
    await database.workoutTemplates.add(template)
    const generated = await startWorkoutFromTemplate(template, '2026-09-17', database)
    expect(generated.exercises[0]).toMatchObject({ exerciseId: undefined, exerciseName: '杠铃卧推' })
  })

  it('拒绝 reps 0', async () => {
    const database = newDatabase(); const template = workoutTemplate(); template.exercises[0]!.sets[0]!.reps = 0
    await expect(saveWorkoutTemplate(template, database)).rejects.toThrow('次数')
    expect(await database.workoutTemplates.count()).toBe(0)
  })

  it('可从历史 Workout 创建独立模板', () => {
    const workout: Workout = { id: 'workout-1', date: '2026-09-17', startedAt: now, exercises: [{ id: 'entry-1', exerciseName: '深蹲', sets: [{ id: 'set-1', weightKg: 100, reps: 5 }] }], createdAt: now, updatedAt: now }
    const template = workoutTemplateFromWorkout(workout, '腿部')
    expect(template.exercises[0]!.id).not.toBe('entry-1')
    expect(template.exercises[0]!.sets[0]!.id).not.toBe('set-1')
  })
})

describe('Diet Templates', () => {
  it('创建和复制饮食模板会生成独立 ID', async () => {
    const database = newDatabase(); const template = dietTemplate()
    await saveDietTemplate(template, database)
    const copy = duplicateDietTemplate(template)
    expect(copy.id).not.toBe(template.id)
    expect(copy.items[0]!.id).not.toBe(template.items[0]!.id)
    expect(await database.dietTemplates.count()).toBe(1)
  })

  it('应用时使用 Food 当前营养，旧 FoodLog 快照不变', async () => {
    const database = newDatabase(); const template = dietTemplate()
    await database.foods.add(food()); await database.dietTemplates.add(template)
    const [oldLog] = await applyDietTemplate(template, '2026-09-16', database)
    await database.foods.update('food-1', { calories: 200, name: '鸡胸肉（新）', updatedAt: new Date().toISOString() })
    const [newLog] = await applyDietTemplate(template, '2026-09-17', database)
    expect(oldLog!.totalCalories).toBe(330)
    expect((await database.foodLogs.get(oldLog!.id))!.foodName).toBe('鸡胸肉')
    expect(newLog).toMatchObject({ foodName: '鸡胸肉（新）', totalCalories: 400 })
  })

  it('Food 删除后 fallback 仍生成 FoodLog', async () => {
    const database = newDatabase(); const template = dietTemplate(); await database.dietTemplates.add(template)
    const [log] = await applyDietTemplate(template, '2026-09-17', database)
    expect(log).toMatchObject({ foodId: undefined, foodName: '鸡胸肉', totalCalories: 330 })
  })

  it('每次应用都生成新 FoodLog ID，并追加而非覆盖', async () => {
    const database = newDatabase(); const template = dietTemplate(); await database.foods.add(food()); await database.dietTemplates.add(template)
    const first = await applyDietTemplate(template, '2026-09-17', database)
    const second = await applyDietTemplate(template, '2026-09-17', database)
    expect(first[0]!.id).not.toBe(second[0]!.id)
    expect(await database.foodLogs.count()).toBe(2)
  })

  it('批量 transaction 失败不会写入部分记录', async () => {
    const database = newDatabase(); const template = dietTemplate(); template.items.push({ ...template.items[0]!, id: 'item-2', foodName: '鸡蛋' })
    await database.foods.add(food()); await database.dietTemplates.add(template)
    vi.spyOn(database.foodLogs, 'bulkAdd').mockRejectedValueOnce(new Error('模拟失败'))
    await expect(applyDietTemplate(template, '2026-09-17', database)).rejects.toThrow('模拟失败')
    expect(await database.foodLogs.count()).toBe(0)
    expect((await database.dietTemplates.get(template.id))!.lastUsedAt).toBeUndefined()
  })

  it('从当天 FoodLog 保存模板时保留营养 fallback', () => {
    const template = dietTemplateFromLogs([{ id: 'log-1', date: '2026-09-17', foodId: 'food-1', foodName: '燕麦', grams: 80, referenceGrams: 100, caloriesPerReference: 380, proteinPerReference: 13, totalCalories: 304, totalProtein: 10.4, createdAt: now, updatedAt: now }], '早餐')
    expect(template.items[0]).toMatchObject({ foodName: '燕麦', grams: 80, fallback: { calories: 380, protein: 13 } })
  })
})

describe('Backup template compatibility', () => {
  it('V3 导出包含两个模板 stores，并可完整恢复', async () => {
    const source = newDatabase(); await source.foods.add(food()); await source.workoutTemplates.add(workoutTemplate()); await source.dietTemplates.add(dietTemplate())
    const backup = await exportBackup(source)
    expect(backup.schemaVersion).toBe(4)
    expect(backup.data.workoutTemplates).toHaveLength(1)
    expect(backup.data.dietTemplates).toHaveLength(1)
    const target = newDatabase(); await restoreBackup(backup, target)
    expect(await Promise.all([target.workoutTemplates.count(), target.dietTemplates.count()])).toEqual([1, 1])
    const restoredTemplate = (await target.workoutTemplates.get('workout-template-1'))!
    expect(restoredTemplate.exercises[0]!.sets[0]!.rpe).toBe(8)
    const launched = await startWorkoutFromTemplate(restoredTemplate, '2026-09-17', target)
    expect(launched.exercises[0]!.sets[0]!.rpe).toBe(8)
  })

  it('拒绝 malformed WorkoutTemplate 与 DietTemplate', () => {
    const workoutInvalid = v2Backup(); workoutInvalid.data.workoutTemplates[0]!.exercises[0]!.sets[0]!.reps = 0
    expect(() => validateBackup(workoutInvalid)).toThrow('训练模板第 1 项')
    const dietInvalid = v2Backup(); dietInvalid.data.dietTemplates[0]!.items[0]!.grams = 0
    expect(() => validateBackup(dietInvalid)).toThrow('饮食模板第 1 项')
  })

  it('接受 V1 并恢复为空模板 stores', async () => {
    const database = newDatabase(); await database.workoutTemplates.add(workoutTemplate()); await database.dietTemplates.add(dietTemplate())
    await restoreBackup(v1Backup(), database)
    expect(await database.foods.count()).toBe(1)
    expect(await Promise.all([database.workoutTemplates.count(), database.dietTemplates.count()])).toEqual([0, 0])
  })

  it('V2 restore 写入失败时七个 stores 一起 rollback', async () => {
    const database = newDatabase(); const oldTemplate = { ...workoutTemplate(), id: 'old-template', name: '原模板' }
    await database.workoutTemplates.add(oldTemplate)
    vi.spyOn(database.dietTemplates, 'bulkAdd').mockRejectedValueOnce(new Error('模板写入失败'))
    await expect(restoreBackup(v2Backup(), database)).rejects.toThrow('模板写入失败')
    expect(await database.workoutTemplates.toArray()).toEqual([oldTemplate])
    expect(await database.foods.count()).toBe(0)
  })
})
