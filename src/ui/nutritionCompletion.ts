import type { NutritionCompletionKey, NutritionCompletionSummary } from '../utils/nutritionCompletion'
import { formatNumber } from '../utils/nutrition'
export const completionLabels = { calories: '热量', protein: '蛋白质', carbs: '碳水', fat: '脂肪' } as const
export function completionGapText(summary: NutritionCompletionSummary, key: NutritionCompletionKey): string {
  if (summary.uncertainKeys.includes(key)) return '数据不完整'
  const gap = summary.gap[key]
  if (gap === undefined) return '未设置目标'
  const unit = key === 'calories' ? 'kcal' : 'g'
  return gap < 0 ? `已超 ${formatNumber(-gap)} ${unit}` : gap > 0 ? `还差 ${formatNumber(gap)} ${unit}` : '已达目标'
}
export function completionDateLabel(date: string, today: string, button = false): string {
  return date > today ? '预览补齐方案' : date < today ? '补齐当日营养' : button ? '帮我补齐' : '补齐今日营养'
}
