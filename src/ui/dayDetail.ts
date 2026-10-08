import type { DailyRecords } from '../services/dailyRecordsSummary'
import { formatSleepDuration, localClock } from '../utils/recovery'
import { dietEventTitle, dietEventEstimate } from '../services/dietEventService'
import { calendarCategoryIcons, type CalendarCategory } from './calendarPage'
import { icon } from './icons'
import { mealNames } from '../utils/foodMeals'
import { formatEnergyInputValue } from '../utils/energy'
import type { CardioSession, PelvicFloorSession, Workout } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from '../services/pelvicFloorService'
import { formatNumber } from '../utils/nutrition'
import { formatCardioMetrics, getCardioActivityLabel } from '../utils/cardio'
import type { CalendarDaySummary } from './calendarPage'

export interface CalendarDayDetailRow {
  key: CalendarCategory
  label: string
  primary: string
  secondary: string[]
  accessibleLabel: string
  empty: boolean
}

function duration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function spokenDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
}

function row(key: CalendarDayDetailRow['key'], label: string, primary: string, secondary: string[] = [], empty = false, spoken?: string): CalendarDayDetailRow {
  return { key, label, primary, secondary, accessibleLabel: [label, spoken ?? primary, ...secondary].join('，'), empty }
}

export function buildCalendarDayDetailRows(
  summary: CalendarDaySummary | undefined,
  workouts: Workout[],
  cardioSessions: CardioSession[],
  pelvicSessions: PelvicFloorSession[],
): CalendarDayDetailRow[] {
  const target = summary?.nutritionTarget
  const macros = [
    summary?.protein === undefined ? undefined : `蛋白质\u00a0${formatNumber(summary.protein)}g`,
    summary?.carbs === undefined ? undefined : `碳水\u00a0${formatNumber(summary.carbs)}g`,
    summary?.fat === undefined ? undefined : `脂肪\u00a0${formatNumber(summary.fat)}g`,
  ].filter((value): value is string => Boolean(value))
  const spokenMacros = [
    summary?.protein === undefined ? undefined : `蛋白质 ${formatNumber(summary.protein)} 克`,
    summary?.carbs === undefined ? undefined : `碳水 ${formatNumber(summary.carbs)} 克`,
    summary?.fat === undefined ? undefined : `脂肪 ${formatNumber(summary.fat)} 克`,
  ].filter((value): value is string => Boolean(value))
  const targetDetails = [
    target?.calories === undefined ? undefined : `${formatEnergyInputValue(target.calories)} kcal`,
    target?.protein === undefined ? undefined : `蛋白质 ${formatNumber(target.protein)}g`,
    target?.carbs === undefined ? undefined : `碳水 ${formatNumber(target.carbs)}g`,
    target?.fat === undefined ? undefined : `脂肪 ${formatNumber(target.fat)}g`,
  ].filter((value): value is string => Boolean(value))
  const targetLine = targetDetails.length ? `目标 ${targetDetails.join(' · ')}` : undefined
  const foodRecorded = Boolean(summary?.foodLogCount)
  const foodPrimary = foodRecorded ? `${formatEnergyInputValue(summary?.calories ?? 0)} kcal` : '未记录'
  const foodSecondary = [...(foodRecorded && macros.length ? [macros.join(' · ')] : []), ...(targetLine ? [targetLine] : [])]
  const food = row('food', '饮食', foodPrimary, foodSecondary, !foodRecorded)
  food.accessibleLabel = ['饮食', foodRecorded ? `${formatEnergyInputValue(summary?.calories ?? 0)} 千卡` : '未记录', ...(foodRecorded ? spokenMacros : []), ...(targetLine ? [targetLine.replace('kcal', '千卡').replaceAll('g', '克')] : [])].join('，')

  const exerciseCount = workouts.reduce((total, workout) => total + workout.exercises.length, 0)
  const setCount = workouts.reduce((total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 0)
  const strength = workouts.length === 0
    ? row('strength', '力量训练', '未记录', [], true)
    : workouts.length === 1
      ? row('strength', '力量训练', `${setCount} 组`, [`${exerciseCount} 个动作`, ...(workouts[0]!.note ? ['有训练日志'] : [])])
      : row('strength', '力量训练', `${workouts.length} 次`, [`${setCount} 组 · ${exerciseCount} 个动作`, ...(workouts.some(workout => workout.note) ? ['有训练日志'] : [])])

  const cardio = cardioSessions.length === 0
    ? row('cardio', '有氧训练', '未记录', [], true)
    : cardioSessions.length === 1
      ? row('cardio', '有氧训练', `${getCardioActivityLabel(cardioSessions[0]!)} · ${formatNumber(cardioSessions[0]!.durationMinutes)} 分钟`, [...formatCardioMetrics(cardioSessions[0]!), ...(cardioSessions[0]!.note ? ['有训练日志'] : [])])
      : row('cardio', '有氧训练', `${cardioSessions.length} 次`, [`共 ${formatNumber(cardioSessions.reduce((total, session) => total + session.durationMinutes, 0))} 分钟`, ...(cardioSessions.some(session => session.note) ? ['有训练日志'] : [])])

  const pelvicSeconds = pelvicSessions.reduce((total, session) => total + pelvicFloorSessionDurationSeconds(session), 0)
  const pelvic = pelvicSessions.length === 0
    ? row('pelvic', '凯格尔训练', '未记录', [], true)
    : pelvicSessions.length === 1
      ? row('pelvic', '凯格尔训练', pelvicSessions[0]!.routine?.name ?? '基础训练', [duration(pelvicSeconds)])
      : row('pelvic', '凯格尔训练', `${pelvicSessions.length} 次`, [`累计 ${duration(pelvicSeconds)}`])
  if (pelvicSessions.length) pelvic.accessibleLabel = ['凯格尔训练', pelvicSessions.length === 1 ? pelvic.primary : `${pelvicSessions.length} 次`, ...(pelvicSessions.length === 1 ? [spokenDuration(pelvicSeconds)] : [`累计 ${spokenDuration(pelvicSeconds)}`])].join('，')

  const weight = summary?.weightKg === undefined
    ? row('weight', '体重', '未记录', [], true)
    : row('weight', '体重', `${formatNumber(summary.weightKg)} kg`, [], false, `${formatNumber(summary.weightKg)} 千克`)
  return [food, strength, cardio, pelvic, weight,
    row('dietEvent','特殊饮食',summary?.dietEvents?.length?`${summary.dietEvents.length} 条`:'未记录',[],!summary?.dietEvents?.length),
    row('habit','习惯',summary?.habitCount?`${summary.habitCount} 次打卡`:'未记录',[],!summary?.habitCount),
    row('sleep','睡眠',summary?.sleepCount?formatSleepDuration(summary.sleepMinutes??0):'未记录',summary?.sleepCount?[`${summary.sleepCount} 段`]:[],!summary?.sleepCount),
    row('water','饮水',summary?.waterCount?`${summary.waterMl} ml`:'未记录',summary?.waterCount?[`${summary.waterCount} 次记录`]:[],!summary?.waterCount)]
}

/** Day Sheet and Day Report share complete saved-record disclosures and the same grammar. */
export function dailyRecordsHtml(records:DailyRecords,esc:(value:unknown)=>string,editable=false):string {
  const s=records.source,rows=buildCalendarDayDetailRows(records.summary,s.workouts,s.cardioSessions,s.pelvicFloorSessions)
  for(const r of rows){
    const count=r.key==='strength'?s.workouts.length:r.key==='cardio'?s.cardioSessions.length:r.key==='pelvic'?s.pelvicFloorSessions.length:0
    if(count===1){r.secondary.unshift('1 次训练');r.accessibleLabel+='，1 次训练'}
    if(r.key==='pelvic'&&count){const contractions=s.pelvicFloorSessions.reduce((n,p)=>n+p.completedRepetitions,0);r.secondary.push(`${contractions} 次收缩`);r.accessibleLabel+=`，${contractions} 次收缩`}
  }
  const detail=(title:string,lines:string[])=>`<article class="daily-record-item"><strong>${esc(title)}</strong>${lines.map(line=>`<p>${esc(line)}</p>`).join('')}</article>`
  const instant=(value:string)=>`${new Date(value).toLocaleDateString('zh-CN')} ${localClock(value)}`
  const macro=(v:number|undefined)=>v===undefined?'未知':`${formatNumber(v)}g`
  const contents:Record<CalendarCategory,string>={
    food:s.foodLogs.map(l=>detail(`${l.meal?mealNames[l.meal]:'未分类'} · ${l.foodName}${l.brand?' · '+l.brand:''}`,[`${formatNumber(l.grams)} g · ${formatEnergyInputValue(l.totalCalories)} kcal`,`蛋白质 ${macro(l.totalProtein)} · 碳水 ${macro(l.totalCarbs)} · 脂肪 ${macro(l.totalFat)}`,`保存的每${formatNumber(l.referenceGrams)}g快照：${formatEnergyInputValue(l.caloriesPerReference)} kcal · 蛋白质 ${macro(l.proteinPerReference)} · 碳水 ${macro(l.carbsPerReference)} · 脂肪 ${macro(l.fatPerReference)}`])).join(''),
    strength:s.workouts.map((w,i)=>detail(`第${i+1}次训练${w.finishedAt?'':' · 记录中'}`,[`${w.exercises.length} 个动作`,...(w.note?[w.note]:[])])+w.exercises.map(e=>detail(e.exerciseName,e.sets.length?e.sets.map((set,j)=>`第${j+1}组 · ${set.reps}次 · ${set.weightKg===undefined?'重量未记录':formatNumber(set.weightKg)+' kg'}${set.rpe===undefined?'':' · RPE '+formatNumber(set.rpe)}${set.note?' · '+set.note:''}`):['组数未记录'])).join('')).join(''),
    cardio:s.cardioSessions.map(c=>detail(getCardioActivityLabel(c),[`${formatNumber(c.durationMinutes)} 分钟`,...formatCardioMetrics(c),...(c.note?[c.note]:[])])).join(''),
    pelvic:s.pelvicFloorSessions.map(p=>detail(p.routine?.name??'基础训练',[`${duration(pelvicFloorSessionDurationSeconds(p))} · ${p.completedRepetitions} 次收缩`,`${instant(p.startedAt)} → ${instant(p.finishedAt)}`,...p.phases.map(phase=>`${({prepare:'准备',contract:'收缩',hold:'保持',release:'释放',relax:'放松',rest:'休息'} as const)[phase.type]} ${phase.durationSeconds} 秒`),`记录方式：${p.completionType==='manual'?'手动结束':'完成'}`])).join(''),
    weight:s.weights.map(w=>detail(`${formatNumber(w.weightKg)} kg`,[w.date])).join(''),
    dietEvent:`<div class="diet-events-detail">${s.dietEvents.map(e=>`<article class="daily-record-item"><strong>${esc(dietEventTitle(e))}</strong><p>${esc(e.scope==='day'?'整天':mealNames[e.scope])}</p><p>${esc(dietEventEstimate(e))}</p>${e.note?`<p class="diet-event-note">${esc(e.note)}</p>`:''}${editable?`<button type="button" class="text-btn" data-diet-event-edit="${esc(e.id)}">编辑</button>`:''}</article>`).join('')}</div>`,
    habit:s.habitCheckIns.map(c=>detail(s.habits.find(h=>h.id===c.habitId)?.name??'已移除的习惯',[`${c.date} · 已打卡`,instant(c.completedAt)])).join(''),
    sleep:s.sleepSessions.map(p=>detail(formatSleepDuration(p.durationMinutes!),[`${instant(p.startTime)} → ${instant(p.endTime!)}`,`醒来日期 ${p.recordDate}`])).join(''),
    water:s.waterLogs.map(w=>detail(`${w.amountMl} ml`,[instant(w.timestamp),`记录日期 ${w.date}`])).join(''),
  }
  return `<div class="calendar-day-sheet daily-records" data-record-date="${esc(records.date)}">${rows.map(r=>`<details class="daily-record-group" data-record-category="${r.key}"><summary class="day-detail-row" aria-label="${esc(r.accessibleLabel)}"><span class="day-detail-label"><span class="day-detail-icon calendar-category-${r.key}" aria-hidden="true">${icon(calendarCategoryIcons[r.key],16)}</span><span>${esc(r.label)}</span></span><span class="day-detail-content"><strong class="${r.empty?'is-empty':''}">${esc(r.primary)}</strong>${r.secondary.map(v=>`<span>${esc(v)}</span>`).join('')}</span><span class="daily-record-chevron" aria-hidden="true">${icon('chevron',16)}</span></summary><div class="daily-record-content">${r.empty?'<p class="report-note">当天未记录</p>':contents[r.key]}</div></details>`).join('')}</div>`
}

/** Patch changed groups only; keep the Sheet, other nodes, expanded categories, scroll and focus. */
export function updateDailyRecordsHtml(host:HTMLElement,html:string):void {
  const next=document.createElement('div');next.innerHTML=html
  const previous=host.querySelector('.daily-records'),fresh=next.querySelector('.daily-records')!
  if(!previous){host.replaceChildren(fresh);return}
  const scroll=host.closest('.modal-body')??host,top=scroll.scrollTop
  for(const group of fresh.querySelectorAll<HTMLDetailsElement>('[data-record-category]')) {
    const old=previous.querySelector<HTMLDetailsElement>(`[data-record-category="${group.dataset.recordCategory}"]`)
    if(old&&old.innerHTML===group.innerHTML)continue
    if(old){const focused=old.contains(document.activeElement);group.open=old.open;old.replaceWith(group);if(focused)group.querySelector<HTMLElement>('summary')?.focus({preventScroll:true})}else previous.append(group)
  }
  scroll.scrollTop=top
}
