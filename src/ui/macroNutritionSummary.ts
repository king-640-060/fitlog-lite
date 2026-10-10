import type { DailyNutritionSummary } from '../services/dailyNutritionSummary'
import { formatNumber } from '../utils/nutrition'
import { macroPerKg } from '../utils/recovery'
import { getGoalProgress } from './progressRing'

export interface MacroNutritionSummaryProps {
  proteinConsumed: number; proteinTarget?: number
  carbConsumed: number; carbTarget?: number
  fatConsumed: number; fatTarget?: number
  effectiveWeight?: number; selectedDate: string
  proteinComplete?: boolean; carbComplete?: boolean; fatComplete?: boolean
}
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Complete shared visual primitive. Columns switch together when text cannot fit. */
export function macroNutritionSummaryHtml(props: MacroNutritionSummaryProps): string {
  const rows = [
    { key: 'protein', label: '蛋白质', actual: props.proteinConsumed, target: props.proteinTarget, complete: props.proteinComplete },
    { key: 'carbs', label: '碳水', actual: props.carbConsumed, target: props.carbTarget, complete: props.carbComplete },
    { key: 'fat', label: '脂肪', actual: props.fatConsumed, target: props.fatTarget, complete: props.fatComplete },
  ].map(row => ({ ...row, consumed: row.complete === false ? '数据不完整' : `${formatNumber(row.actual)}g`, goal: row.target === undefined ? '未设目标' : `/ ${formatNumber(row.target)}g`, perKg: macroPerKg(row.actual, props.effectiveWeight, row.complete) }))
  const minCell = Math.max(3.8, ...rows.flatMap(row => [row.complete === false ? 6.25 : row.consumed.length * 1.25 * .54, row.goal.length * .8 * .61, (row.perKg?.length ?? 0) * .8 * .55]))
  return `<div class="macro-nutrition-summary nutrition-tiles" data-macro-date="${escape(props.selectedDate)}" role="group" aria-label="营养素摄入汇总" style="--macro-row-min:calc(${minCell * 3}rem + 58px)">${rows.map(row => `<div class="nutrition-metric ${row.key} ${getGoalProgress(row.actual, row.target).state}" role="group" data-progress-key="${row.key}" data-actual="${row.actual}" ${row.target === undefined ? '' : `data-goal="${row.target}"`} aria-label="${row.label} 摄入 ${row.consumed}，${row.target === undefined ? row.goal : `目标 ${formatNumber(row.target)}g`}${row.perKg ? `，${row.perKg}` : ''}"><span class="macro-label">${row.label}</span><strong class="macro-value" aria-hidden="true">${row.consumed}</strong><span class="macro-target" aria-hidden="true">${row.goal}</span><div class="macro-mini-track" aria-hidden="true"><i style="width:${row.complete === false ? 0 : getGoalProgress(row.actual, row.target).main * 100}%"></i></div>${row.perKg ? `<small class="macro-per-kg" aria-hidden="true">${row.perKg}</small>` : ''}</div>`).join('')}</div>`
}

export function macroNutritionSummaryForDay(day: DailyNutritionSummary): string {
  return macroNutritionSummaryHtml({
    proteinConsumed: day.totals.protein, proteinTarget: day.target?.protein,
    carbConsumed: day.totals.carbs, carbTarget: day.target?.carbs,
    fatConsumed: day.totals.fat, fatTarget: day.target?.fat,
    effectiveWeight: day.effectiveWeight, selectedDate: day.date,
    proteinComplete: day.logs.every(log => log.totalProtein !== undefined && Number.isFinite(log.totalProtein) && log.totalProtein! >= 0),
    carbComplete: day.logs.every(log => log.totalCarbs !== undefined && Number.isFinite(log.totalCarbs) && log.totalCarbs! >= 0),
    fatComplete: day.logs.every(log => log.totalFat !== undefined && Number.isFinite(log.totalFat) && log.totalFat! >= 0),
  })
}
