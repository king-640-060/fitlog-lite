import { completionKeys, type NutritionCompletionSummary } from '../utils/nutritionCompletion'
import { completionGapText, completionLabels } from './nutritionCompletion'

/** Each dimension has its own independent known/unset/reached/over state. */
export function remainingNutritionGoalsHtml(summary: NutritionCompletionSummary): string {
  return `<div class="remaining-goals-grid">${completionKeys.map(key => `<div class="remaining-goal ${key}"><span>${completionLabels[key]}</span><strong>${completionGapText(summary, key)}</strong></div>`).join('')}</div>`
}
