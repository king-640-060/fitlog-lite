import { formatEnergyInputValue } from '../utils/energy'
import { getGoalProgress } from './progressRing'

/** Shared factual budget; no rounding enters storage and no count/entrance animation. */
export function calorieBudgetHtml(actual: number, goal: number | undefined, surface: 'today' | 'food'): string {
  const progress = getGoalProgress(actual, goal), amount = formatEnergyInputValue(actual)
  const status = goal === undefined ? '尚未设置目标' : actual > goal ? `高于目标 ${formatEnergyInputValue(actual - goal)} kcal` : actual === goal ? '已达目标' : `还差 ${formatEnergyInputValue(goal - actual)} kcal`
  const target = goal === undefined ? '设置目标后显示预算' : `目标 ${formatEnergyInputValue(goal)} kcal`
  const ratio = goal !== undefined && goal > 0 ? `${Math.round(actual / goal * 100)}% 已摄入` : goal === 0 ? '目标为 0 kcal' : '按实际摄入记录'
  return `<div class="calorie-budget calorie-gauge ${surface === 'today' ? 'compact-budget today-calorie-gauge' : ''} ${progress.state}" data-progress-key="calories" data-actual="${actual}" ${goal === undefined ? '' : `data-goal="${goal}"`} role="group" aria-label="${surface === 'today' ? '今日' : '当日'}摄入 ${amount} kcal，${target}，${status}"><div class="budget-head"><div class="budget-copy"><span class="budget-label">${surface === 'today' ? '今日' : '当日'}热量摄入</span><div class="budget-number"><strong>${amount}</strong><small>kcal</small></div><span class="budget-target">${target}</span></div><div class="budget-status"><b>${status}</b><small>根据真实饮食记录</small></div></div><div class="budget-bar-row" aria-hidden="true"><div class="budget-track"><i style="width:${progress.main * 100}%"></i></div>${progress.state === 'above' ? `<div class="budget-over-track"><i style="width:${progress.outer * 100}%"></i></div>` : ''}</div><div class="budget-meta"><span>${ratio}</span><span>${goal === undefined ? '未设目标' : `目标 ${formatEnergyInputValue(goal)} kcal`}</span></div></div>`
}
