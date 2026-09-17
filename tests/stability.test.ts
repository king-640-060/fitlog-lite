import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import type { BackupData, Workout } from '../src/db/types'
import { restoreBackup, validateBackup } from '../src/services/backupService'
import { finishWorkout, saveWorkout, WorkoutAutosaveController } from '../src/services/workoutService'

const databases: FitLogDatabase[] = []
const now = '2026-09-17T02:00:00.000Z'

function newDatabase(): FitLogDatabase {
  const database = new FitLogDatabase(`fitlog-stability-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

function workout(sets: Workout['exercises'][number]['sets']): Workout {
  return {
    id: 'workout-1', date: '2026-09-17', startedAt: now,
    exercises: [{ id: 'entry-1', exerciseId: 'exercise-1', exerciseName: '杠铃卧推', sets }],
    createdAt: now, updatedAt: now,
  }
}

function validBackup(): BackupData {
  return {
    app: 'FitLog Lite', schemaVersion: 1, exportedAt: now,
    data: {
      foods: [{ id: 'food-1', name: '燕麦', referenceGrams: 100, calories: 380, protein: 13, carbs: 68, fat: 7, createdAt: now, updatedAt: now }],
      foodLogs: [{ id: 'log-1', date: '2026-09-17', foodId: 'food-1', foodName: '燕麦', grams: 50, referenceGrams: 100, caloriesPerReference: 380, totalCalories: 190, createdAt: now, updatedAt: now }],
      exercises: [{ id: 'exercise-1', name: '杠铃卧推', createdAt: now, updatedAt: now }],
      workouts: [workout([{ id: 'set-1', weightKg: 80, reps: 10, rpe: 8 }])],
      weights: [{ id: 'weight-1', date: '2026-09-17', weightKg: 72.3, createdAt: now, updatedAt: now }],
    },
  }
}

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const database of databases.splice(0)) {
    database.close()
    await database.delete()
  }
})

describe('Workout 稳定保存', () => {
  it('添加一组后 debounce 会触发保存', async () => {
    const database = newDatabase()
    const value = workout([])
    const autosave = new WorkoutAutosaveController((item) => saveWorkout(item, database), 5)
    value.exercises[0]!.sets.push({ id: 'set-1', weightKg: 80, reps: 10 })
    autosave.schedule(value)

    await new Promise((resolve) => setTimeout(resolve, 25))

    expect((await database.workouts.get(value.id))?.exercises[0]?.sets).toEqual([{ id: 'set-1', weightKg: 80, reps: 10, rpe: undefined, note: undefined }])
  })

  it('有效组写入后可从数据库恢复', async () => {
    const database = newDatabase()
    const value = workout([{ id: 'set-1', weightKg: 80, reps: 10 }, { id: 'set-2', weightKg: 80, reps: 9 }])
    await saveWorkout(value, database)
    database.close()
    await database.open()

    expect((await database.workouts.get(value.id))?.exercises[0]?.sets.map((set) => set.reps)).toEqual([10, 9])
  })

  it('完全空白的新组不会保存为 reps 0', async () => {
    const database = newDatabase()
    const value = workout([{ id: 'blank-set', reps: 0 }])
    await saveWorkout(value, database)

    expect((await database.workouts.get(value.id))?.exercises[0]?.sets).toEqual([])
  })

  it('已填重量但未填次数时拒绝保存且不覆盖原记录', async () => {
    const database = newDatabase()
    const original = workout([{ id: 'set-1', weightKg: 80, reps: 10 }])
    await saveWorkout(original, database)
    const invalid = workout([{ id: 'set-1', weightKg: 80, reps: 0 }])

    await expect(saveWorkout(invalid, database)).rejects.toThrow('请填写次数或删除未完成的组')
    expect((await database.workouts.get(original.id))?.exercises[0]?.sets[0]?.reps).toBe(10)
  })

  it('删除组后 flush 会持久化', async () => {
    const database = newDatabase()
    const value = workout([{ id: 'set-1', reps: 10 }, { id: 'set-2', reps: 9 }])
    await saveWorkout(value, database)
    value.exercises[0]!.sets = value.exercises[0]!.sets.filter((set) => set.id !== 'set-2')
    const autosave = new WorkoutAutosaveController((item) => saveWorkout(item, database))
    autosave.schedule(value)
    await autosave.flush()

    expect((await database.workouts.get(value.id))?.exercises[0]?.sets.map((set) => set.id)).toEqual(['set-1'])
  })

  it('flush 会立即写入尚未到期的 debounce', async () => {
    const database = newDatabase()
    const value = workout([{ id: 'set-1', reps: 12 }])
    const autosave = new WorkoutAutosaveController((item) => saveWorkout(item, database), 400)
    autosave.schedule(value)

    await autosave.flush()

    expect((await database.workouts.get(value.id))?.exercises[0]?.sets[0]?.reps).toBe(12)
  })

  it('完成训练复用相同 validation', async () => {
    const database = newDatabase()
    await expect(finishWorkout(workout([{ id: 'set-1', weightKg: 80, reps: 0 }]), database)).rejects.toThrow('请填写次数或删除未完成的组')

    const finished = await finishWorkout(workout([{ id: 'set-1', weightKg: 80, reps: 10 }]), database)
    expect(finished.finishedAt).toBeTruthy()
    expect((await database.workouts.get(finished.id))?.finishedAt).toBeTruthy()
  })
})

describe('Backup 深度验证与恢复', () => {
  it('正常 backup 可完整恢复', async () => {
    const database = newDatabase()
    await restoreBackup(validBackup(), database)

    expect(await database.foods.count()).toBe(1)
    expect(await database.foodLogs.count()).toBe(1)
    expect(await database.exercises.count()).toBe(1)
    expect(await database.workouts.count()).toBe(1)
    expect(await database.weights.count()).toBe(1)
  })

  it('拒绝 malformed Food', () => {
    const backup = validBackup() as unknown as { data: { foods: Array<Record<string, unknown>> } }
    backup.data.foods[0]!.name = ''
    expect(() => validateBackup(backup)).toThrow('食物第 1 项 name')
  })

  it('拒绝 malformed WorkoutSet', () => {
    const backup = validBackup() as unknown as { data: { workouts: Array<{ exercises: Array<{ sets: unknown[] }> }> } }
    backup.data.workouts[0]!.exercises[0]!.sets = [{}]
    expect(() => validateBackup(backup)).toThrow('第 1 组 id')
  })

  it('拒绝 reps 0 并返回具体位置', () => {
    const backup = validBackup()
    backup.data.workouts[0]!.exercises[0]!.sets[0]!.reps = 0
    expect(() => validateBackup(backup)).toThrow('训练记录第 1 项，第 1 个动作，第 1 组')
  })

  it('拒绝同一 store 的重复 ID', () => {
    const backup = validBackup()
    backup.data.foods.push({ ...backup.data.foods[0]! })
    expect(() => validateBackup(backup)).toThrow('id 重复')
  })

  it('拒绝重复 weight date', () => {
    const backup = validBackup()
    backup.data.weights.push({ ...backup.data.weights[0]!, id: 'weight-2' })
    expect(() => validateBackup(backup)).toThrow('date 重复')
  })

  it('拒绝不存在的日历日期', () => {
    const backup = validBackup()
    backup.data.foodLogs[0]!.date = '2026-02-30'
    expect(() => validateBackup(backup)).toThrow('合法 YYYY-MM-DD')
  })

  it('transaction 中途失败会 rollback', async () => {
    const database = newDatabase()
    const oldFood = { ...validBackup().data.foods[0]!, id: 'old-food', name: '原数据' }
    await database.foods.add(oldFood)
    vi.spyOn(database.workouts, 'bulkAdd').mockRejectedValueOnce(new Error('模拟写入失败'))

    await expect(restoreBackup(validBackup(), database)).rejects.toThrow('模拟写入失败')
    expect(await database.foods.toArray()).toEqual([oldFood])
  })

  it('validation 失败时当前数据库完全不变', async () => {
    const database = newDatabase()
    const oldFood = { ...validBackup().data.foods[0]!, id: 'old-food', name: '原数据' }
    await database.foods.add(oldFood)
    const invalid = validBackup()
    invalid.data.workouts[0]!.exercises[0]!.sets[0]!.reps = 0

    await expect(restoreBackup(invalid, database)).rejects.toThrow('reps')
    expect(await database.foods.toArray()).toEqual([oldFood])
    expect(await database.workouts.count()).toBe(0)
  })
})
