import { dietEventContext } from '../../services/dietEventService'
import type { EntityTable } from 'dexie'
import { defineTool, arraySchema, booleanSchema, dateSchema, enumSchema, numberSchema, objectSchema, rangeSchema, stringSchema } from './types'
import { AiError } from '../security'
import { validateHabitDate } from '../../services/habitService'
import { loadReport } from '../../services/reportService'
import { sortTasksForPlan } from '../../services/taskService'
import { getNutritionCompletionSummary } from '../../utils/nutritionCompletion'
import { shiftLocalDate } from '../../utils/date'
import { getCardioActivityType } from '../../utils/cardio'
import { mealTypes } from '../../utils/foodMeals'
import { buildWorkoutAnalysisSummary } from '../workoutAnalysis'
import { nutritionPlanSource } from '../nutritionPlans'
import type { AiTool, AiToolEnvironment } from './types'
import type { FoodLog } from '../../db/types'

export function requireAiDate(date: string): void { try { validateHabitDate(date) } catch { throw new AiError('invalid_arguments', '请使用有效的设备本地 YYYY-MM-DD 日期') } }
export function requireAiRange(start: string, end: string, maximumDays: number): string[] {
  requireAiDate(start); requireAiDate(end)
  if (start > end) throw new AiError('invalid_arguments', '开始日期需要早于或等于结束日期')
  const days: string[] = []
  for (let date = start; date <= end && days.length <= maximumDays; date = shiftLocalDate(date, 1)) days.push(date)
  if (days.length > maximumDays) throw new AiError('range_limit', `请将日期范围缩小到 ${maximumDays} 天以内`)
  return days
}
function snapshotNutrition(logs: FoodLog[], target = {}) {
  const summary = getNutritionCompletionSummary(target, logs)
  return { ...summary, unknownMacros: (['protein', 'carbs', 'fat'] as const).filter(key => summary.actual[key] === undefined), recordCount: logs.length }
}
async function nutritionDay(date: string, env: AiToolEnvironment) {
  requireAiDate(date)
  const [logs, target] = await Promise.all([env.database.foodLogs.where('date').equals(date).sortBy('createdAt'), env.database.nutritionTargets.where('date').equals(date).first()])
  return { date, dietEvents: dietEventContext(await env.database.dietEvents.where('date').equals(date).limit(11).toArray()), ...snapshotNutrition(logs, target), target: target ?? null, meals: [...mealTypes, 'unassigned'].map(meal => ({ meal, ...snapshotNutrition(logs.filter(log => meal === 'unassigned' ? !log.meal : log.meal === meal)), items: logs.filter(log => meal === 'unassigned' ? !log.meal : log.meal === meal).slice(0, 50).map(log => ({ id: log.id, foodName: log.foodName, brand: log.brand, grams: log.grams, calories: log.totalCalories, protein: log.totalProtein, carbs: log.totalCarbs, fat: log.totalFat })) })), ...(logs.length > 50 ? { truncated: true } : {}) }
}
const range = <T extends { id: string }>(table: EntityTable<T, 'id'>, start: string, end: string) => table.where('date').between(start, end, true, true).toArray()
type RangeArgs = { start: string; end: string }
export const readTools: AiTool[] = [
  defineTool('get_current_context', '读取当前日期与页面', 'READ', [], objectSchema({}), (_args, env) => env.context()),
  defineTool<{ query: string; limit?: number }>('search_foods', '搜索食物库', 'READ', ['food'], objectSchema({ query: stringSchema(120), limit: { ...numberSchema(1, 20), type: 'integer' } }, ['query']), async ({ query, limit = 10 }, env) => {
    const normalized = query.trim().normalize('NFKC').toLocaleLowerCase()
    if (!normalized) throw new AiError('invalid_arguments', '请填写食物搜索词')
    const found = await env.database.foods.filter(food => `${food.name} ${food.brand ?? ''}`.normalize('NFKC').toLocaleLowerCase().includes(normalized)).toArray()
    const sorted = found.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || (a.brand ?? '').localeCompare(b.brand ?? '', 'zh-CN') || a.id.localeCompare(b.id))
    return { count: found.length, truncated: found.length > limit, foods: sorted.slice(0, limit).map(({ id, name, brand, referenceGrams, servingGrams, calories, protein, carbs, fat, updatedAt }) => ({ id, name, brand, referenceGrams, servingGrams, calories, protein, carbs, fat, updatedAt })) }
  }),
  defineTool<{ date: string }>('get_nutrition_day', '读取当日饮食与目标', 'READ', ['food', 'nutritionTargets'], objectSchema({ date: dateSchema }), ({ date }, env) => nutritionDay(date, env)),
  defineTool<RangeArgs>('get_nutrition_range', '读取饮食区间摘要', 'READ', ['food', 'nutritionTargets'], rangeSchema, async ({ start, end }, env) => {
    const days = requireAiRange(start, end, 31)
    const [logs, targets, events] = await Promise.all([range(env.database.foodLogs, start, end), range(env.database.nutritionTargets, start, end), range(env.database.dietEvents, start, end)])
    return { start, end, days: days.map(date => ({ date, dietEvents: dietEventContext(events.filter(event => event.date === date)), ...snapshotNutrition(logs.filter(log => log.date === date), targets.find(target => target.date === date)), target: targets.find(target => target.date === date) ?? null })) }
  }),
  defineTool<{ start?: string; end?: string; includeInbox?: boolean; includeCompleted?: boolean }>('get_tasks', '读取计划任务', 'READ', ['plan'], objectSchema({ start: dateSchema, end: dateSchema, includeInbox: booleanSchema, includeCompleted: booleanSchema }, []), async ({ start, end, includeInbox = false, includeCompleted = false }, env) => {
    const first = start ?? env.context().today, last = end ?? shiftLocalDate(first, 30); requireAiRange(first, last, 31)
    const [dated, inbox, tags] = await Promise.all([range(env.database.tasks, first, last), includeInbox ? env.database.tasks.filter(task => !task.date).limit(201).toArray() : [], env.database.taskTags.toArray()])
    const records = sortTasksForPlan([...dated, ...inbox].filter(task => includeCompleted || !task.completedAt))
    return { start: first, end: last, count: records.length, truncated: records.length > 200 || inbox.length > 200, tasks: records.slice(0, 200).map(task => ({ ...task, tags: task.tagIds.map(id => ({ id, name: tags.find(tag => tag.id === id)?.name ?? '未知标签' })) })) }
  }),
  defineTool('get_task_tags', '读取任务标签', 'READ', ['plan'], objectSchema({}), async (_args, env) => { const tags = await env.database.taskTags.orderBy('name').limit(201).toArray(); return { tags: tags.slice(0, 200).map(({ id, name }) => ({ id, name })), truncated: tags.length > 200 } }),
  defineTool<RangeArgs>('get_weight_trend', '读取体重趋势', 'READ', ['weight'], rangeSchema, async ({ start, end }, env) => {
    requireAiRange(start, end, 365)
    const points = (await range(env.database.weights, start, end)).sort((a, b) => a.date.localeCompare(b.date)).map(({ date, weightKg }) => ({ date, weightKg }))
    return { start, end, points, first: points[0] ?? null, last: points.at(-1) ?? null, changeKg: points.length >= 2 ? points.at(-1)!.weightKg - points[0].weightKg : null }
  }),
  defineTool<RangeArgs>('get_workout_summary', '读取力量训练摘要', 'READ', ['training'], rangeSchema, async ({ start, end }, env) => { requireAiRange(start, end, 90); const workouts = await range(env.database.workouts, start, end); return { start, end, ...buildWorkoutAnalysisSummary(workouts), journals: workouts.filter(workout => workout.note).slice(0, 50).map(workout => ({ date: workout.date, workoutId: workout.id, journal: workout.note, authoredBy: 'user-authored journal', subjective: true })) } }),
  defineTool<RangeArgs>('get_cardio_summary', '读取有氧训练摘要', 'READ', ['training'], rangeSchema, async ({ start, end }, env) => {
    requireAiRange(start, end, 90)
    const sessions = (await range(env.database.cardioSessions, start, end)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    return { start, end, count: sessions.length, minutes: sessions.reduce((sum, session) => sum + session.durationMinutes, 0), byActivity: ['stair_climber', 'treadmill'].map(activityType => { const rows = sessions.filter(session => getCardioActivityType(session) === activityType); return { activityType, count: rows.length, minutes: rows.reduce((sum, session) => sum + session.durationMinutes, 0) } }), recent: sessions.slice(-20).map(session => ({ ...session, activityType: getCardioActivityType(session), ...(session.note ? { journal: session.note, journalAuthorship: 'user-authored journal', subjective: true } : {}) })), journals: sessions.filter(session => session.note).slice(0, 50).map(session => ({ date: session.date, sessionId: session.id, journal: session.note, authoredBy: 'user-authored journal', subjective: true })), truncated: sessions.length > 20 }
  }),
  defineTool<RangeArgs>('get_habit_summary', '读取习惯打卡摘要', 'READ', ['habit'], rangeSchema, async ({ start, end }, env) => {
    requireAiRange(start, end, 31)
    const [habits, checkIns] = await Promise.all([env.database.habits.orderBy('sortOrder').toArray(), range(env.database.habitCheckIns, start, end)])
    return { start, end, totalCheckIns: checkIns.length, truncated: habits.length > 100, habits: habits.slice(0, 100).map(habit => ({ ...habit, completedDates: checkIns.filter(record => record.habitId === habit.id).map(record => record.date).sort(), count: checkIns.filter(record => record.habitId === habit.id).length })) }
  }),
  defineTool<{ mode: 'weekly' | 'monthly'; anchor: string }>('get_report', '读取周报或月报', 'READ', ['food', 'nutritionTargets', 'training', 'weight', 'habit'], objectSchema({ mode: enumSchema('weekly', 'monthly'), anchor: dateSchema }), async ({ mode, anchor }, env) => { requireAiDate(anchor); return loadReport(mode === 'weekly' ? 'week' : 'month', anchor, env.context().today, env.database) }),
  defineTool<{ date: string; allowedFoodIds?: string[]; excludedFoodIds?: string[] }>('get_nutrition_completion', '本地计算营养补全方案', 'READ', ['food', 'nutritionTargets'], objectSchema({ date: dateSchema, allowedFoodIds: arraySchema(stringSchema(), 100, 0), excludedFoodIds: arraySchema(stringSchema(), 100, 0) }, ['date']), async ({ date, allowedFoodIds, excludedFoodIds }, env) => {
    requireAiDate(date)
    return env.database.transaction('r', env.database.foods, env.database.foodLogs, env.database.nutritionTargets, async () => ({ date, futurePreviewOnly: date > env.context().today, ...env.plans.generate(date, await nutritionPlanSource(env.database, date), allowedFoodIds, excludedFoodIds) }))
  }),
]
