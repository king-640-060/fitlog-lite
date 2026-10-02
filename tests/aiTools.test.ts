import { afterEach, describe, expect, it } from 'vitest'
import { aiEnvironment, aiFood } from './helpers/ai'
import { logFood } from '../src/services/foodService'
import { createTask } from '../src/services/taskService'
import { createTaskTag } from '../src/services/taskTagService'
import { upsertWeight } from '../src/services/weightService'
import { loadReport } from '../src/services/reportService'
import { saveNutritionTarget } from '../src/services/nutritionTargetService'
import { buildWorkoutAnalysisSummary } from '../src/ai/workoutAnalysis'
const environments: ReturnType<typeof aiEnvironment>[] = []
const setup = () => { const result = aiEnvironment(); environments.push(result); return result }
afterEach(async () => { for (const env of environments.splice(0)) { env.database.close(); await env.database.delete() } })
describe('bounded AI reads', () => {
  it('reads historical nutrition snapshots, independent calories and unknown macros after food library edits', async () => {
    const env = setup(), food = aiFood('蛋白粉', { calories: 317, protein: undefined })
    await env.database.foods.add(food); await logFood(food, 150, '2026-09-29', 'dinner', env.database)
    await logFood(aiFood('米饭'), 100, '2026-09-29', 'lunch', env.database)
    await env.database.foods.put({ ...food, calories: 999, protein: 50 })
    await saveNutritionTarget('2026-09-29', { calories: 1800, protein: 100 }, env.database)
    const day = await env.execute('get_nutrition_day', { date: '2026-09-29' })
    expect(day.actual.calories).toBe(675.5); expect(day.actual.protein).toBeUndefined(); expect(day.unknownMacros).toContain('protein')
    expect(day.meals.find((meal: { meal: string }) => meal.meal === 'dinner').items[0].calories).toBe(475.5)
    const range = await env.execute('get_nutrition_range', { start: '2026-09-29', end: '2026-09-30' })
    expect(range.days[0].actual).toEqual(day.actual); expect(range.days[1].recordCount).toBe(0)
    expect((await env.execute('get_nutrition_day', { date: '2026-02-30' })).error).toBe('invalid_arguments')
  })
  it('bounds ranges and search, returns local context and bounded plans/tasks/tags/weight facts', async () => {
    const env = setup()
    await env.database.foods.bulkAdd([aiFood('rice-a', { name: '米饭', brand: 'A' }), aiFood('rice-b', { name: '米饭', brand: 'B' })])
    expect(await env.execute('search_foods', { query: '米饭', limit: 1 })).toMatchObject({ count: 2, truncated: true })
    expect((await env.execute('search_foods', { query: '米饭', limit: 21 })).error).toBe('invalid_arguments')
    const tag = await createTaskTag('旅行', env.database)
    await createTask({ title: '明天安排', date: '2026-10-03', tagIds: [tag.id] }, env.database)
    await createTask({ title: '收件箱', tagIds: [] }, env.database)
    expect((await env.execute('get_tasks', { includeInbox: true })).tasks).toHaveLength(2)
    expect((await env.execute('get_task_tags', {})).tags[0].name).toBe('旅行')
    await upsertWeight('2026-09-29', 72, env.database); await upsertWeight('2026-09-30', 71.5, env.database)
    expect(await env.execute('get_weight_trend', { start: '2026-09-29', end: '2026-09-30' })).toMatchObject({ changeKg: -.5 })
    expect(await env.execute('get_current_context', {})).toEqual(env.context)
    for (const [name, end] of [['get_nutrition_range', '2026-11-03'], ['get_habit_summary', '2026-11-03'], ['get_tasks', '2026-11-03'], ['get_workout_summary', '2027-02-01'], ['get_cardio_summary', '2027-02-01'], ['get_weight_trend', '2028-01-01']]) expect((await env.execute(name, { start: '2026-10-01', end })).error).toBe('range_limit')
  })
  it('uses saved workout names/sets and known weight volume only, and returns the existing weekly/monthly report', async () => {
    const env = setup(), workout = { id: 'w1', date: '2026-09-29', startedAt: '', finishedAt: '', createdAt: '', updatedAt: '', exercises: [{ id: 'ex', exerciseName: '卧推旧名', sets: [{ id: 's1', reps: 8, weightKg: 50 }, { id: 's2', reps: 10 }] }] }
    await env.database.workouts.add(workout)
    const summary = buildWorkoutAnalysisSummary([workout])
    expect(summary.exercises[0]).toMatchObject({ exerciseName: '卧推旧名', totalSets: 2, totalRepsKnown: 18, weightedSetCount: 1, unknownWeightSetCount: 1, volumeKgKnown: 400 })
    expect((await env.execute('get_workout_summary', { start: '2026-09-28', end: '2026-10-02' })).exercises[0].volumeKgKnown).toBe(400)
    for (const mode of ['weekly', 'monthly'] as const) {
      const report = await env.execute('get_report', { mode, anchor: '2026-09-29' })
      const expected = await loadReport(mode === 'weekly' ? 'week' : 'month', '2026-09-29', env.context.today, env.database)
      expect(report).toEqual(JSON.parse(JSON.stringify(expected, (_key, value) => value instanceof Set ? [...value] : value)))
    }
  })
  it('actually enforces scopes and write permission even for direct model calls; has no destructive or arbitrary tools', async () => {
    const env = setup(); env.permissions.read.weight = false
    expect(env.registry.definitions().map(tool => tool.function.name)).not.toContain('get_weight_trend')
    expect(env.registry.definitions().map(tool => tool.function.name)).not.toContain('get_report')
    expect((await env.execute('get_weight_trend', { start: '2026-10-01', end: '2026-10-02' })).error).toBe('permission_denied')
    env.permissions.writeProposals = false
    expect(env.registry.definitions().some(tool => tool.function.name.startsWith('propose_'))).toBe(false)
    expect((await env.execute('propose_weight', { date: '2026-10-02', weightKg: 70 })).error).toBe('permission_denied')
    expect((await env.execute('delete_task', {})).error).toBe('unknown_tool')
    expect(env.registry.definitions().map(tool => tool.function.name).join(' ')).not.toMatch(/delete|clear|restore|export|fetch|http|backup|sync/)
    env.permissions.writeProposals = true; env.permissions.read.weight = true
    expect((await env.execute('propose_tasks', { tasks: [{ title: 'known-github-secret' }] })).error).toBe('secret_detected')
    expect((await env.execute('propose_weight', { date: '2026-10-02', weightKg: '70' })).error).toBe('invalid_arguments')
  })
})
