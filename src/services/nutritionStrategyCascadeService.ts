import { db, type FitLogDatabase } from '../db/database'
import type { NutritionStrategyTemplate, NutritionStrategyVariant, NutritionStrategyPhase, NutritionTarget, NutritionCycle, NutritionCycleDay } from '../db/types'
import { validateCycleCollection } from './nutritionCycleService'

/** Explicitly confirmed destructive scope. No health-fact table participates in this transaction. */
export interface Snapshot {
  templates: NutritionStrategyTemplate[]
  variants: NutritionStrategyVariant[]
  phases: NutritionStrategyPhase[]
  targets: NutritionTarget[]
  cycles: NutritionCycle[]
  days: NutritionCycleDay[]
}
export type NutritionCascadeCategory = keyof Snapshot
export const nutritionCascadeLabels: Record<NutritionCascadeCategory, string> = {
  templates: '营养模板', variants: '模板日方案', phases: '营养阶段',
  targets: '来源每日目标', cycles: '营养周期', days: '周期日期排程',
}
const categories = Object.keys(nutritionCascadeLabels) as NutritionCascadeCategory[]
export interface NutritionCascadePreview {
  id: string
  name: string
  counts: Record<NutritionCascadeCategory, number>
  total: number
  fingerprint: string
  conflicts: string[]
  details: Array<{ category: NutritionCascadeCategory; id: string; label: string; date?: string }>
}
function stores(database: FitLogDatabase) {
  return [database.nutritionStrategyTemplates, database.nutritionStrategyVariants, database.nutritionStrategyPhases, database.nutritionTargets, database.nutritionCycles, database.nutritionCycleDays]
}
async function snapshot(database: FitLogDatabase): Promise<Snapshot> {
  const [templates, variants, phases, targets, cycles, days] = await Promise.all([
    database.nutritionStrategyTemplates.orderBy('id').toArray(), database.nutritionStrategyVariants.orderBy('id').toArray(),
    database.nutritionStrategyPhases.orderBy('id').toArray(), database.nutritionTargets.orderBy('id').toArray(),
    database.nutritionCycles.orderBy('id').toArray(), database.nutritionCycleDays.orderBy('id').toArray(),
  ])
  return { templates, variants, phases, targets, cycles, days }
}
/** Stable by ID, category and object keys; malformed numeric values never collide with JSON null. */
export function nutritionCascadeFingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'number' && !Number.isFinite(item)) throw new Error('营养关联数据含无效数值；未删除任何记录，请先核对数据')
    if (item && typeof item === 'object' && !Array.isArray(item)) return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    return item
  })
}
export function planNutritionStrategyCascade(id: string, data: Snapshot): { selected: Snapshot; preview: NutritionCascadePreview } {
  const template = data.templates.find(t => t.id === id)
  if (!template) throw new Error('模板已不存在；未删除任何记录，请返回模板管理')
  const variants = data.variants.filter(v => v.templateId === id), phases = data.phases.filter(p => p.templateId === id), cycles = data.cycles.filter(c => c.templateId === id)
  const variantIds = new Set(variants.map(v => v.id)), phaseIds = new Set(phases.map(p => p.id)), cycleIds = new Set(cycles.map(c => c.id))
  const variantMap = new Map(data.variants.map(v => [v.id, v])), phaseMap = new Map(data.phases.map(p => [p.id, p])), cycleMap = new Map(data.cycles.map(c => [c.id, c]))
  const conflicts: string[] = []
  const targets = data.targets.filter(t => {
    const s = t.strategySelection, c = t.cycleSelection
    const related = s && (s.templateId === id || variantIds.has(s.variantId) || phaseIds.has(s.phaseId)) || c && (c.templateId === id || variantIds.has(c.variantId) || cycleIds.has(c.cycleId))
    if (!related) return false
    const badStrategy = s && (s.templateId !== id || !phaseMap.has(s.phaseId) || phaseMap.get(s.phaseId)!.templateId !== id || !s.variantId || (variantMap.has(s.variantId) && variantMap.get(s.variantId)!.templateId !== id))
    const badCycle = c && (c.templateId !== id || !c.cycleId || !c.variantId || (cycleMap.has(c.cycleId) && cycleMap.get(c.cycleId)!.templateId !== id) || (variantMap.has(c.variantId) && variantMap.get(c.variantId)!.templateId !== id))
    if (t.sourceTemplateId !== undefined || s && c || badStrategy || badCycle) conflicts.push(`每日目标 ${t.date}（${t.id}）的来源混合、缺失或不一致，请核对营养阶段、日方案及周期来源`)
    return true
  })
  const days = data.days.filter(d => cycleIds.has(d.cycleId) || d.nutrition && (d.nutrition.templateId === id || variantIds.has(d.nutrition.variantId)))
  for (const d of days) {
    const owner = cycleMap.get(d.cycleId), n = d.nutrition
    if (!owner || owner.templateId !== id || n && (n.templateId !== id || variantMap.has(n.variantId) && variantMap.get(n.variantId)!.templateId !== id)) {
      conflicts.push(`排程 ${d.date}（${d.id}）与所属周期 ${d.cycleId} 的模板/日方案不一致，不能删除其他模板的周期或留下空排程，请先核对来源`)
    }
  }
  // A foreign-cycle nutrition allocation cannot be stripped legally: this schema requires
  // nutrition.templateId === cycle.templateId and forbids empty persisted days. Never guess a repair.
  try { validateCycleCollection(data.cycles, data.days) } catch (error) {
    conflicts.push(`周期排程不一致：${error instanceof Error ? error.message : '请核对所属周期、日期和分配'}`)
  }
  const selected: Snapshot = { templates: [template], variants, phases, targets, cycles, days }
  const counts = Object.fromEntries(categories.map(k => [k, selected[k].length])) as NutritionCascadePreview['counts']
  const details = [
    ...selected.templates.map(t => ({ category: 'templates' as const, id: t.id, label: t.name })),
    ...variants.map(v => ({ category: 'variants' as const, id: v.id, label: v.name })),
    ...phases.map(p => ({ category: 'phases' as const, id: p.id, label: p.templateName, date: `${p.startDate} — ${p.endDate ?? '至今'}` })),
    ...targets.map(t => ({ category: 'targets' as const, id: t.id, label: '已保存营养目标', date: t.date })),
    ...cycles.map(c => ({ category: 'cycles' as const, id: c.id, label: c.name, date: `${c.startDate} — ${c.endDate}` })),
    ...days.map(d => ({ category: 'days' as const, id: d.id, label: cycleMap.get(d.cycleId)?.name ?? '所属周期缺失', date: d.date })),
  ]
  return { selected, preview: { id, name: template.name, counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0), fingerprint: nutritionCascadeFingerprint(data), conflicts: [...new Set(conflicts)], details } }
}
export async function previewNutritionStrategyCascade(id: string, database: FitLogDatabase = db): Promise<NutritionCascadePreview> {
  return database.transaction('r', stores(database), async () => planNutritionStrategyCascade(id, await snapshot(database)).preview)
}
export async function deleteNutritionStrategyCascade(id: string, expectedFingerprint: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', stores(database), async () => {
    const before = await snapshot(database), { selected, preview } = planNutritionStrategyCascade(id, before)
    if (preview.fingerprint !== expectedFingerprint) throw new Error('模板或关联数据已变化；未删除任何记录，请重新预览并确认')
    if (preview.conflicts.length) throw new Error(`${preview.conflicts.join('；')}。未删除任何记录，请核对来源后重新预览`)
    await database.nutritionTargets.bulkDelete(selected.targets.map(t => t.id))
    await database.nutritionCycleDays.bulkDelete(selected.days.map(d => d.id))
    await database.nutritionCycles.bulkDelete(selected.cycles.map(c => c.id))
    await database.nutritionStrategyPhases.bulkDelete(selected.phases.map(p => p.id))
    await database.nutritionStrategyVariants.bulkDelete(selected.variants.map(v => v.id))
    await database.nutritionStrategyTemplates.delete(id)
    const after = await snapshot(database)
    const expected = Object.fromEntries(categories.map(k => {
      const ids = new Set(selected[k].map(row => row.id))
      return [k, before[k].filter(row => !ids.has(row.id))]
    })) as unknown as Snapshot
    if (nutritionCascadeFingerprint(after) !== nutritionCascadeFingerprint(expected)) throw new Error('删除后的关联数据校验失败；本次事务已回滚，未删除任何记录')
    validateCycleCollection(after.cycles, after.days)
  })
}
