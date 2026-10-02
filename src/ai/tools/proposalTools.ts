import type { CardioSessionInput } from '../../services/cardioService'
import type { HabitInput } from '../../services/habitService'
import type { TaskInput } from '../../services/taskService'
import type { Food, MealType, NutritionGoal } from '../../db/types'
import { saveCardioSession, validateCardioInput } from '../../services/cardioService'
import { logFood, validateFoodInput } from '../../services/foodService'
import { createTask, setTaskCompletionState, validateTaskInput } from '../../services/taskService'
import { createTaskTag } from '../../services/taskTagService'
import { createHabit, setHabitCheckInState, validateHabitInput } from '../../services/habitService'
import { upsertWeight } from '../../services/weightService'
import { normalizeNutritionGoal, saveNutritionTarget } from '../../services/nutritionTargetService'
import { applyNutritionCompletionPlan } from '../../services/nutritionCompletionService'
import { calculateNutrition } from '../../utils/nutrition'
import { normalizeTaskTagName, validateTaskTagName } from '../../utils/taskTags'
import { AiError } from '../security'
import { canonicalAiSource, nutritionPlanSource } from '../nutritionPlans'
import { requireAiDate } from './readTools'
import { arraySchema, booleanSchema, dateSchema, defineTool, enumSchema, numberSchema, objectSchema, stringSchema } from './types'
import type { AiTool, AiToolEnvironment } from './types'
import type { AiProposalSpec } from '../proposals'

const mealSchema = enumSchema('breakfast', 'lunch', 'dinner', 'snack')
const idSchema = stringSchema(200)
const noteSchema = stringSchema(2000)
function create(env: AiToolEnvironment, spec: AiProposalSpec) {
  const proposal = env.proposals.create(spec)
  return { proposalId: proposal.id, title: proposal.title, preview: proposal.preview, status: 'pending', message: '建议尚未写入。需要用户在 FitLog 卡片中明确确认；不能把提案称为已保存。' }
}
function previewTransaction(env: AiToolEnvironment, tables: string[], build: () => Promise<unknown>) { return env.database.transaction('r', tables.map(name => env.database.table(name)), build) }
function forbidFutureFood(date: string, today: string): void { requireAiDate(date); if (date > today) throw new AiError('future_factual_log', '未来日期只能预览营养方案，不能记录尚未发生的饮食；可创建计划任务') }
type FoodArgs = { date: string; meal: MealType; items: { foodId: string; grams: number }[] }
type TaskArgs = { tasks: (Omit<TaskInput, 'tagIds'> & { tagNames?: string[] })[] }
export const proposalTools: AiTool[] = [
  defineTool<FoodArgs>('propose_food_logs', '生成饮食记录建议', 'PROPOSAL', ['food'], objectSchema({ date: dateSchema, meal: mealSchema, items: arraySchema(objectSchema({ foodId: idSchema, grams: numberSchema(.01, 10000) }), 20) }), async (input, env) => {
    const args = structuredClone(input), tables = ['foods', 'foodLogs']
    forbidFutureFood(args.date, env.context().today)
    return previewTransaction(env, tables, async () => {
      const readSource = async () => ({ foods: await env.database.foods.bulkGet(args.items.map(item => item.foodId)), logs: await env.database.foodLogs.where('date').equals(args.date).sortBy('id') })
      const source = await readSource()
      if (source.foods.some(food => !food)) throw new AiError('food_not_found', '食物不在当前食物库，请先搜索；缺少食物时请在食物库添加，不能编造营养数据')
      const foods = source.foods as Food[]
      foods.forEach(validateFoodInput)
      const items = args.items.map((item, index) => ({ foodId: item.foodId, foodName: foods[index].name, brand: foods[index].brand, grams: item.grams, ...calculateNutrition(foods[index], item.grams) }))
      const totals: NutritionGoal = { calories: items.reduce((sum, item) => sum + item.calories, 0) }
      for (const key of ['protein', 'carbs', 'fat'] as const) totals[key] = items.every(item => item[key] !== undefined) ? items.reduce((sum, item) => sum + item[key]!, 0) : undefined
      return create(env, { title: '记录饮食', domain: 'food', scopes: ['food'], tables, source, readSource, preview: { date: args.date, meal: args.meal, items, totals }, apply: async () => { forbidFutureFood(args.date, env.context().today); const logs = []; for (const [index, item] of args.items.entries()) logs.push(await logFood(foods[index], item.grams, args.date, args.meal, env.database)); return { count: logs.length, date: args.date, recordIds: logs.map(log => log.id) } } })
    })
  }),
  defineTool<TaskArgs>('propose_tasks', '生成计划任务建议', 'PROPOSAL', ['plan'], objectSchema({ tasks: arraySchema(objectSchema({ title: stringSchema(120), note: noteSchema, date: dateSchema, startTime: stringSchema(5), endTime: stringSchema(5), tagNames: arraySchema(stringSchema(24), 8, 0) }, ['title']), 20) }), async (input, env) => {
    const tasks = structuredClone(input.tasks).map(task => ({ values: validateTaskInput({ title: task.title, note: task.note, date: task.date, startTime: task.startTime, endTime: task.endTime, tagIds: [] }), tagNames: [...new Map((task.tagNames ?? []).map(value => { const name = validateTaskTagName(value); return [normalizeTaskTagName(name), name] })).values()] }))
    const tables = ['tasks', 'taskTags']
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.taskTags.orderBy('id').toArray(), source = await readSource()
      const newNames = [...new Map(tasks.flatMap(task => task.tagNames).filter(name => !source.some(tag => tag.normalizedName === normalizeTaskTagName(name))).map(name => [normalizeTaskTagName(name), name])).values()]
      const preview = { tasks: tasks.map(task => ({ ...task.values, tagNames: task.tagNames })), newTags: newNames.map(name => `将创建标签 #${name}`) }
      return create(env, { title: `创建 ${tasks.length} 项任务`, domain: 'plan', scopes: ['plan'], tables, source, readSource, preview, apply: async () => {
        const tags = new Map(source.map(tag => [tag.normalizedName, tag.id]))
        for (const name of newNames) tags.set(normalizeTaskTagName(name), (await createTaskTag(name, env.database)).id)
        const records = []
        for (const task of tasks) records.push(await createTask({ ...task.values, tagIds: task.tagNames.map(name => tags.get(normalizeTaskTagName(name))!) }, env.database))
        return { count: records.length, recordIds: records.map(record => record.id) }
      } })
    })
  }),
  defineTool<{ taskId: string; completed: boolean }>('propose_set_task_completion', '生成任务状态建议', 'PROPOSAL', ['plan'], objectSchema({ taskId: idSchema, completed: booleanSchema }), async ({ taskId, completed }, env) => {
    const tables = ['tasks']
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.tasks.get(taskId), source = await readSource()
      if (!source) throw new AiError('task_not_found', '任务已不存在，请重新查询')
      return create(env, { title: '更新任务状态', domain: 'plan', scopes: ['plan'], tables, source, readSource, preview: { taskId, title: source.title, date: source.date, before: Boolean(source.completedAt), completed }, apply: async () => { const task = await setTaskCompletionState(taskId, completed, env.database); return { taskId, completed: Boolean(task.completedAt) } } })
    })
  }),
  defineTool<{ date: string; weightKg: number }>('propose_weight', '生成体重记录建议', 'PROPOSAL', ['weight'], objectSchema({ date: dateSchema, weightKg: numberSchema(.01, 1000) }), async ({ date, weightKg }, env) => {
    requireAiDate(date); const tables = ['weights']
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.weights.where('date').equals(date).first(), source = await readSource()
      return create(env, { title: '记录体重', domain: 'weight', scopes: ['weight'], tables, source, readSource, preview: { date, beforeWeightKg: source?.weightKg, weightKg, replacesExisting: Boolean(source) }, apply: async () => { const record = await upsertWeight(date, weightKg, env.database); return { date, weightKg, recordId: record.id } } })
    })
  }),
  defineTool<{ date: string } & NutritionGoal>('propose_nutrition_target', '生成营养目标建议', 'PROPOSAL', ['nutritionTargets'], objectSchema({ date: dateSchema, calories: numberSchema(0, 100000), protein: numberSchema(0, 10000), carbs: numberSchema(0, 10000), fat: numberSchema(0, 10000) }, ['date']), async (args, env) => {
    requireAiDate(args.date)
    const date = args.date, goal = normalizeNutritionGoal({ calories: args.calories, protein: args.protein, carbs: args.carbs, fat: args.fat }), tables = ['nutritionTargets']
    if (!goal) throw new AiError('invalid_arguments', '请至少填写一项营养目标')
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.nutritionTargets.where('date').equals(date).first(), source = await readSource()
      return create(env, { title: '设置营养目标', domain: 'nutritionTargets', scopes: ['nutritionTargets'], tables, source, readSource, preview: { date, before: source ?? null, after: goal, note: '未提供的营养项保持未设置，热量与宏量独立保存' }, apply: async () => { const record = await saveNutritionTarget(date, goal, env.database); return { date, recordId: record.id } } })
    })
  }),
  defineTool<HabitInput>('propose_habit', '生成新习惯建议', 'PROPOSAL', ['habit'], objectSchema({ name: stringSchema(40), note: noteSchema, weekdays: arraySchema({ type: 'integer', minimum: 1, maximum: 7 }, 7, 0), targetPerWeek: { type: 'integer', minimum: 1, maximum: 7 } }, ['name']), async (args, env) => {
    const values = validateHabitInput(args), tables = ['habits']
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.habits.orderBy('id').toArray(), source = await readSource()
      return create(env, { title: '创建习惯', domain: 'habit', scopes: ['habit'], tables, source, readSource, preview: values, apply: async () => { const record = await createHabit(values, env.database); return { habitId: record.id, name: record.name } } })
    })
  }),
  defineTool<{ habitId: string; date: string; completed: boolean }>('propose_set_habit_checkin', '生成习惯打卡建议', 'PROPOSAL', ['habit'], objectSchema({ habitId: idSchema, date: dateSchema, completed: booleanSchema }), async ({ habitId, date, completed }, env) => {
    requireAiDate(date); const tables = ['habits', 'habitCheckIns']
    return previewTransaction(env, tables, async () => {
      const readSource = async () => ({ habit: await env.database.habits.get(habitId), checkIn: await env.database.habitCheckIns.where('[habitId+date]').equals([habitId, date]).first() }), source = await readSource()
      if (!source.habit?.active) throw new AiError('habit_inactive', '习惯已不存在或未启用，请重新查询')
      return create(env, { title: '更新习惯打卡', domain: 'habit', scopes: ['habit'], tables, source, readSource, preview: { habitId, name: source.habit.name, date, before: Boolean(source.checkIn), completed }, apply: async () => ({ habitId, date, completed: await setHabitCheckInState(habitId, date, completed, env.database) }) })
    })
  }),
  defineTool<CardioSessionInput>('propose_cardio_session', '生成有氧记录建议', 'PROPOSAL', ['training'], objectSchema({ date: dateSchema, activityType: enumSchema('stair_climber', 'treadmill'), durationMinutes: numberSchema(.01, 1440), speed: numberSchema(.01, 1000), inclinePercent: numberSchema(0, 100), note: noteSchema }, ['date', 'activityType', 'durationMinutes']), async (args, env) => {
    const values = validateCardioInput(args), tables = ['cardioSessions']
    return previewTransaction(env, tables, async () => {
      const readSource = () => env.database.cardioSessions.where('date').equals(values.date).sortBy('id'), source = await readSource()
      return create(env, { title: '记录有氧训练', domain: 'training', scopes: ['training'], tables, source, readSource, preview: values, apply: async () => { const record = await saveCardioSession(values, env.database); return { date: values.date, recordId: record.id } } })
    })
  }),
  defineTool<{ planId: string; meal: MealType }>('propose_adopt_nutrition_plan', '生成营养方案采纳建议', 'PROPOSAL', ['food', 'nutritionTargets'], objectSchema({ planId: idSchema, meal: mealSchema }), async ({ planId, meal }, env) => {
    const stored = env.plans.get(planId), tables = ['foods', 'foodLogs', 'nutritionTargets']
    forbidFutureFood(stored.date, env.context().today)
    return previewTransaction(env, tables, async () => {
      const readSource = () => nutritionPlanSource(env.database, stored.date), source = await readSource()
      if (canonicalAiSource(source) !== stored.sourceFingerprint) throw new AiError('stale_plan', '营养方案的来源数据已变化，请重新计算')
      return create(env, { title: '采纳营养方案', domain: 'food', scopes: ['food', 'nutritionTargets'], tables, source, readSource, preview: { date: stored.date, meal, items: stored.plan.items.map(item => ({ foodName: item.food.name, brand: item.food.brand, grams: item.grams, ...item.added })), added: stored.plan.added, projected: stored.plan.projected }, apply: async () => { forbidFutureFood(stored.date, env.context().today); const logs = await applyNutritionCompletionPlan(stored.date, meal, stored.plan.items, env.database); return { date: stored.date, count: logs.length, recordIds: logs.map(log => log.id) } } })
    })
  }),
]
