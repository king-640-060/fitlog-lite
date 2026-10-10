import { completionKeys, type NutritionCompletionSummary } from '../utils/nutritionCompletion'
import { completionGapText, completionLabels } from './nutritionCompletion'

type RemainingSurface = 'today' | 'food'

/** Shared real facts; the approved prototype owns only the two presentation variants. */
export function remainingNutritionGoalsHtml(summary: NutritionCompletionSummary, surface: RemainingSurface = 'food'): string {
  const compact = surface === 'today'
  return `<div class="remaining-goals-grid ${compact ? 'goal-mini-grid' : 'gap-grid'}">${completionKeys.map(key => {
    const text = completionGapText(summary, key)
    const above = !summary.uncertainKeys.includes(key) && (summary.gap[key] ?? 0) < 0
    const value = compact ? text.replace(/^还差 /, '差 ').replace(/^已超 /, '超 ').replace('已达目标', '已达标') : text
    const label = compact ? `<span class="goal-mini-label"><i aria-hidden="true" class="goal-mini-dot ${key}"></i>${completionLabels[key]}</span>` : `<small>${completionLabels[key]}</small>`
    return `<div class="remaining-goal ${key} ${compact ? 'goal-mini-item' : 'gap-item'}${above ? ' is-above' : ''}" data-gap-text="${text}">${label}<strong title="${text}" aria-label="${completionLabels[key]}：${text}">${value}</strong></div>`
  }).join('')}</div>`
}

export function remainingNutritionSummaryHtml(date: string, summary: NutritionCompletionSummary, surface: RemainingSurface): string {
  const compact = surface === 'today'
  const heading = compact
    ? `<div class="goal-compact-top"><div class="goal-compact-heading"><h3 class="remaining-title">剩余目标</h3><small>按当日实际记录计算</small></div><button type="button" class="text-btn remaining-compact-action" data-today-completion="${date}" aria-label="前往饮食页面补齐营养">去补齐 <span aria-hidden="true">›</span></button></div>`
    : '<div class="remaining-heading"><h3 class="remaining-title">剩余目标</h3><span class="remaining-caption">按实际记录计算 · 点击选择补齐方式</span></div>'
  const actions = compact ? '' : '<div class="remaining-actions completion-entry-actions"><button type="button" class="text-btn remaining-action" id="food-completion-open"><span aria-hidden="true">✧</span>智能补齐<span aria-hidden="true">›</span></button><button type="button" class="text-btn remaining-action" id="food-completion-custom"><span aria-hidden="true">≡</span>指定食物<span aria-hidden="true">›</span></button></div>'
  return `<section class="food-completion-strip remaining ${compact ? 'today-remaining remaining-compact' : 'food-remaining'}" aria-label="剩余营养目标">${heading}${remainingNutritionGoalsHtml(summary, surface)}${actions}</section>`
}
