import type { AiProposal } from '../ai/proposals'
import type { AiUsage, AiProviderProfile } from '../ai/types'
import { getVisionModel } from '../ai/modelRouting'
import { formatNumber } from '../utils/nutrition'
import { mealNames } from '../utils/foodMeals'

/** Editable names identify saved profiles; they are never model routing metadata. */
export function aiProviderLabel(profile: AiProviderProfile): string {
  return profile.preset === 'zhipu' ? '智谱' : profile.name.startsWith('自定义 · ') ? '自定义服务' : profile.name
}
/** The chat/tool model identity. Keep editable profile names out of routing labels. */
export function aiChatModelLabel(profile: AiProviderProfile): string {
  return `${aiProviderLabel(profile)} · ${profile.model}`
}
export function aiModelRouteLabel(profile: AiProviderProfile): string {
  return `${aiProviderLabel(profile)} · ${profile.model}${profile.visionModel ? ` · 图片：${getVisionModel(profile)}` : ''}`
}

export const aiSuggestionPrompts = ['今天吃得怎么样？', '帮我记录晚餐', '这周训练怎么样？', '帮我看看最近体重', '帮我安排明天', '帮我补齐今天营养']
export const aiProposalStatusLabels = { pending: '待确认', processing: '处理中', completed: '已完成', cancelled: '已取消', expired: '已失效' } as const
export function aiUsageText(usage: AiUsage): string {
  if (usage.totalTokens !== undefined) return `${formatNumber(usage.totalTokens)} tokens`
  const values = []
  if (usage.inputTokens !== undefined) values.push(`输入 ${usage.inputTokens}`)
  if (usage.outputTokens !== undefined) values.push(`输出 ${usage.outputTokens}`)
  return values.length ? `${values.join(' · ')} tokens` : ''
}
const nutrientLabels = { calories: '热量', protein: '蛋白质', carbs: '碳水', fat: '脂肪' } as const
function nutrients(value: Record<string, unknown> = {}): string {
  return (Object.keys(nutrientLabels) as (keyof typeof nutrientLabels)[]).map(key => `${nutrientLabels[key]} ${typeof value[key] === 'number' ? `${formatNumber(value[key])} ${key === 'calories' ? 'kcal' : 'g'}` : '未知 / 未设置'}`).join(' · ')
}
/** App-calculated fields only; IDs remain transport details, never the product preview. */
export function aiProposalPreviewLines(proposal: AiProposal): string[] {
  const preview = proposal.preview as Record<string, unknown>, lines: string[] = []
  if (typeof preview.date === 'string') lines.push(preview.date)
  if (typeof preview.meal === 'string') lines.push(mealNames[preview.meal as keyof typeof mealNames] ?? '未分餐')
  if (Array.isArray(preview.items)) for (const item of preview.items as Record<string, unknown>[]) lines.push(`${item.foodName}${item.brand ? ` · ${item.brand}` : ''} · ${formatNumber(Number(item.grams))} g\n${nutrients(item)}`)
  if (preview.totals) lines.push(`合计：${nutrients(preview.totals as Record<string, unknown>)}`)
  if (preview.added) lines.push(`新增：${nutrients(preview.added as Record<string, unknown>)}`)
  if (preview.projected) lines.push(`记录后：${nutrients(preview.projected as Record<string, unknown>)}`)
  if (Array.isArray(preview.tasks)) for (const task of preview.tasks as Record<string, unknown>[]) {
    lines.push(`${task.title}\n${task.date ?? '收件箱'}${task.startTime ? ` · ${task.startTime}${task.endTime ? `–${task.endTime}` : ''}` : ''}${Array.isArray(task.tagNames) && task.tagNames.length ? ` · ${task.tagNames.map(name => `#${name}`).join(' ')}` : ''}${task.note ? `\n${task.note}` : ''}`)
  }
  if (Array.isArray(preview.newTags)) lines.push(...preview.newTags.map(String))
  if (typeof preview.weightKg === 'number') lines.push(preview.replacesExisting ? `${preview.beforeWeightKg} kg → ${preview.weightKg} kg（替换当日记录）` : `${preview.weightKg} kg`)
  if (proposal.domain === 'nutritionTargets') {
    if (preview.before) lines.push(`原目标：${nutrients(preview.before as Record<string, unknown>)}`)
    lines.push(`新目标：${nutrients(preview.after as Record<string, unknown>)}`, String(preview.note))
  }
  if (typeof preview.name === 'string') lines.push(preview.name)
  if (typeof preview.title === 'string') lines.push(preview.title)
  if (typeof preview.completed === 'boolean') lines.push(`${preview.before ? '已完成' : '未完成'} → ${preview.completed ? '已完成' : '未完成'}`)
  if (Array.isArray(preview.weekdays)) lines.push(`计划日：${preview.weekdays.map(day => ['一', '二', '三', '四', '五', '六', '日'][Number(day) - 1]).join('、')}`)
  if (typeof preview.targetPerWeek === 'number') lines.push(`每周目标 ${preview.targetPerWeek} 次（计划不限制打卡）`)
  if (typeof preview.durationMinutes === 'number') lines.push(`${preview.activityType === 'treadmill' ? '跑步机' : '楼梯机'} · ${preview.durationMinutes} min${preview.speed !== undefined ? ` · 速度 ${preview.speed}${preview.activityType === 'treadmill' ? ' km/h' : ''}` : ''}${preview.inclinePercent !== undefined ? ` · 坡度 ${preview.inclinePercent}%` : ''}`)
  if (typeof preview.note === 'string' && proposal.domain !== 'nutritionTargets') lines.push(preview.note)
  return lines
}
export function shouldSendAiShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'isComposing'>, composing: boolean): boolean { return !composing && !event.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey) }
