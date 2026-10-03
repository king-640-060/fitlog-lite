import { db, type FitLogDatabase } from '../db/database'
import type { NutritionGoal, NutritionStrategyTemplate, NutritionStrategyVariant, NutritionStrategyPhase, NutritionTarget } from '../db/types'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { requiredText } from '../utils/validation'
import { createNutritionTarget, normalizeNutritionGoal } from './nutritionTargetService'
import { getWeightsInRange } from './weightService'

export interface NutritionStrategyDefinition { template: NutritionStrategyTemplate; variants: NutritionStrategyVariant[] }
export interface NutritionStrategyContext extends NutritionStrategyDefinition { phase: NutritionStrategyPhase }
export interface StrategyDraft { id?: string; name: string; variants: Array<Partial<NutritionStrategyVariant> & NutritionGoal> }

export function strategyBusinessDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || getLocalDateString(parsed) !== value) throw new Error('请选择有效日期')
  return value
}
function strategyName(value: unknown, label: string): string {
  const name = requiredText(value, label)
  if (name.length > 80) throw new Error(`${label}请控制在 80 字以内`)
  return name
}

export async function getNutritionStrategy(templateId: string, database: FitLogDatabase = db): Promise<NutritionStrategyDefinition | undefined> {
  const template = await database.nutritionStrategyTemplates.get(templateId)
  if (!template) return undefined
  const variants = (await database.nutritionStrategyVariants.where('templateId').equals(templateId).toArray()).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  return { template, variants }
}
export async function getNutritionStrategyForDate(date: string, database: FitLogDatabase = db): Promise<NutritionStrategyContext | undefined> {
  strategyBusinessDate(date)
  const phases = await database.nutritionStrategyPhases.toArray()
  const phase = phases.find(p => p.startDate <= date && (!p.endDate || p.endDate >= date))
  if (!phase) return undefined
  const definition = await getNutritionStrategy(phase.templateId, database)
  return definition ? { ...definition, phase } : undefined
}

export async function saveNutritionStrategy(draft: StrategyDraft, database: FitLogDatabase = db): Promise<NutritionStrategyDefinition> {
  draft = structuredClone(draft)
  if (!Array.isArray(draft.variants) || draft.variants.length < 1 || draft.variants.length > 32) throw new Error('请添加 1–32 个日方案')
  const name = strategyName(draft.name, '模板名称'), id = draft.id ?? crypto.randomUUID(), now = new Date().toISOString()
  return database.transaction('rw', [database.nutritionStrategyTemplates, database.nutritionStrategyVariants], async () => {
    const existing = await database.nutritionStrategyTemplates.get(id)
    if (existing?.archivedAt) throw new Error('已归档模板请先复制为新模板')
    const seen = new Set<string>()
    const variants: NutritionStrategyVariant[] = []
    for (const [sortOrder, input] of draft.variants.entries()) {
      const variantId = input.id ?? crypto.randomUUID()
      if (seen.has(variantId)) throw new Error('日方案标识重复')
      seen.add(variantId)
      const old = await database.nutritionStrategyVariants.get(variantId)
      if (old && old.templateId !== id) throw new Error('日方案属于其他模板')
      const goal = normalizeNutritionGoal(input)
      if (!goal) throw new Error('每个日方案请至少填写一项营养目标')
      variants.push({ id: variantId, templateId: id, name: strategyName(input.name, '方案名称'), ...goal, sortOrder, createdAt: old?.createdAt ?? now, updatedAt: now })
    }
    const template: NutritionStrategyTemplate = { id, name, createdAt: existing?.createdAt ?? now, updatedAt: now }
    await database.nutritionStrategyTemplates.put(template)
    await database.nutritionStrategyVariants.where('templateId').equals(id).delete()
    await database.nutritionStrategyVariants.bulkAdd(variants)
    return { template, variants }
  })
}
export function duplicateNutritionStrategy(source: NutritionStrategyDefinition): StrategyDraft {
  return { id: crypto.randomUUID(), name: `${source.template.name} 副本`.slice(0, 80), variants: source.variants.map(v => ({ id: crypto.randomUUID(), name: v.name, calories: v.calories, protein: v.protein, carbs: v.carbs, fat: v.fat })) }
}
export async function archiveNutritionStrategy(id: string, database: FitLogDatabase = db): Promise<void> {
  await database.transaction('rw', [database.nutritionStrategyTemplates, database.nutritionStrategyPhases], async () => {
    if ((await database.nutritionStrategyPhases.where('templateId').equals(id).toArray()).some(p => !p.endDate)) throw new Error('当前模板请先切换到另一个模板，再归档')
    const template = await database.nutritionStrategyTemplates.get(id)
    if (!template) throw new Error('模板不存在')
    const now = new Date().toISOString()
    await database.nutritionStrategyTemplates.update(id, { archivedAt: template.archivedAt ?? now, updatedAt: now })
  })
}
export async function activateNutritionStrategy(id: string, startDate: string, database: FitLogDatabase = db, expected?: { activePhaseId: string | null; templateUpdatedAt: string }): Promise<NutritionStrategyPhase> {
  strategyBusinessDate(startDate)
  if (startDate > getLocalDateString()) throw new Error('开始日期不能晚于今天；营养模板不自动排程')
  return database.transaction('rw', [database.nutritionStrategyTemplates, database.nutritionStrategyVariants, database.nutritionStrategyPhases], async () => {
    const template = await database.nutritionStrategyTemplates.get(id)
    if (!template || template.archivedAt) throw new Error('模板不存在或已归档')
    if (!await database.nutritionStrategyVariants.where('templateId').equals(id).count()) throw new Error('模板需要至少一个日方案')
    const phases = (await database.nutritionStrategyPhases.toArray()).sort((a, b) => a.startDate.localeCompare(b.startDate))
    const active = phases.filter(p => !p.endDate)
    if (active.length > 1) throw new Error('阶段数据不一致，请检查备份')
    const current = active[0]
    if (expected && ((current?.id ?? null) !== expected.activePhaseId || template.updatedAt !== expected.templateUpdatedAt)) throw new Error('模板或阶段已变化，请重新查看后启用')
    if (current?.templateId === id) throw new Error('这个模板已在使用中')
    const latest = phases.at(-1)
    if (latest && startDate <= (latest.endDate ?? latest.startDate)) throw new Error(`开始日期须晚于 ${latest.endDate ?? latest.startDate}，以保留已有阶段`)
    if (current) await database.nutritionStrategyPhases.update(current.id, { endDate: shiftLocalDate(startDate, -1) })
    const phase: NutritionStrategyPhase = { id: crypto.randomUUID(), templateId: id, templateName: template.name, startDate, createdAt: new Date().toISOString() }
    await database.nutritionStrategyPhases.add(phase)
    return phase
  })
}

export interface StrategySelectionPreview { context: NutritionStrategyContext; variant: NutritionStrategyVariant; existing?: NutritionTarget }
export async function applyNutritionStrategyVariant(date: string, variantId: string, database: FitLogDatabase = db, preview?: StrategySelectionPreview): Promise<NutritionTarget> {
  strategyBusinessDate(date)
  return database.transaction('rw', [database.nutritionStrategyTemplates, database.nutritionStrategyVariants, database.nutritionStrategyPhases, database.nutritionTargets], async () => {
    const context = await getNutritionStrategyForDate(date, database)
    const variant = context?.variants.find(v => v.id === variantId)
    if (!context || context.template.archivedAt || !variant) throw new Error('这个日期的模板或日方案已变化，请重新选择')
    const existing = await database.nutritionTargets.where('date').equals(date).first()
    if (preview && (JSON.stringify(context) !== JSON.stringify(preview.context) || JSON.stringify(variant) !== JSON.stringify(preview.variant) || JSON.stringify(existing) !== JSON.stringify(preview.existing))) throw new Error('方案或当天目标已变化，请重新查看后应用')
    const target = createNutritionTarget(date, variant, existing)
    target.strategySelection = { templateId: context.template.id, variantId: variant.id, phaseId: context.phase.id, templateName: context.template.name, variantName: variant.name }
    await database.nutritionTargets.put(target)
    return target
  })
}

export function nutritionPhaseDays(phase: NutritionStrategyPhase, today = getLocalDateString()): number {
  strategyBusinessDate(phase.startDate); strategyBusinessDate(today)
  const end = phase.endDate && phase.endDate < today ? phase.endDate : today
  if (end < phase.startDate) return 0
  // Calendar ordinals, not elapsed local hours: daylight-saving changes do not alter day counts.
  const ordinal = (date: string) => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y!, m! - 1, d!) / 86400000 }
  return ordinal(end) - ordinal(phase.startDate) + 1
}
export async function getNutritionPhaseSummary(phase: NutritionStrategyPhase, database: FitLogDatabase = db, today = getLocalDateString()) {
  const end = phase.endDate && phase.endDate < today ? phase.endDate : today
  const weights = end < phase.startDate ? [] : await getWeightsInRange(phase.startDate, end, database)
  return { days: nutritionPhaseDays(phase, today), end, count: weights.length, first: weights[0], last: weights.at(-1), change: weights.length > 1 ? weights.at(-1)!.weightKg - weights[0]!.weightKg : undefined }
}
