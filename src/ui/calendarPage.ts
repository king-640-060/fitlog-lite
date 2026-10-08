import { getMonthGridDays } from '../utils/calendarGrid'
import { db, type FitLogDatabase } from '../db/database'
import { readDailyRecordsRange, type DailyRecordsSummary } from '../services/dailyRecordsSummary'
import { getLocalDateString } from '../utils/date'
import { icon, type IconName } from './icons'
export { getMonthGridDays } from '../utils/calendarGrid'
export type { CalendarGridDay } from '../utils/calendarGrid'

export type CalendarDaySummary = DailyRecordsSummary

interface RenderMonthCalendarOptions {
  year: number
  month: number
  selectedDate?: string
  summaries: Map<string, CalendarDaySummary> | CalendarDaySummary[]
  onDateClick: (date: string) => void
}

export function getMonthBounds(year: number, month: number): { start: string; end: string } {
  return {
    start: getLocalDateString(new Date(year, month, 1)),
    end: getLocalDateString(new Date(year, month + 1, 0)),
  }
}

export async function loadMonthSummaries(year: number, month: number, database: FitLogDatabase = db): Promise<Map<string, CalendarDaySummary>> {
  const grid=getMonthGridDays(year,month)
  return readDailyRecordsRange(grid[0]!.date,grid.at(-1)!.date,database)
}

export function hasDayRecords(summary?: CalendarDaySummary): boolean {
  return Boolean(summary && ((summary.dietEvents?.length ?? 0) > 0 || summary.foodLogCount > 0 || summary.workoutCount > 0 || summary.cardioCount > 0 || summary.pelvicFloorSessionCount > 0 || summary.weightKg !== undefined || (summary.habitCount??0)>0 || (summary.sleepCount??0)>0 || (summary.waterCount??0)>0))
}

export const calendarCategories = ['food', 'strength', 'cardio', 'pelvic', 'weight', 'dietEvent', 'habit', 'sleep', 'water'] as const
export type CalendarCategory = typeof calendarCategories[number]
export const calendarCategoryLabels: Record<CalendarCategory, string> = {
  food: '饮食', strength: '力量训练', cardio: '有氧训练', pelvic: '凯格尔训练', weight: '体重', dietEvent: '特殊饮食', habit:'习惯', sleep:'睡眠', water:'饮水',
}
export const calendarLegendLabels: Record<CalendarCategory, string> = {
  food: '饮食', strength: '力量', cardio: '有氧', pelvic: '凯格尔', weight: '体重', dietEvent: '特殊饮食', habit:'习惯', sleep:'睡眠', water:'饮水',
}
export const calendarCategoryIcons: Record<CalendarCategory, IconName> = {
  food: 'fork', strength: 'dumbbell', cardio: 'stairs', pelvic: 'leaf', weight: 'scale', dietEvent: 'flame', habit:'check', sleep:'moon', water:'water',
}

export function getCalendarRecordCategories(summary?: CalendarDaySummary): CalendarCategory[] {
  if (!summary) return []
  return calendarCategories.filter((category) => {
    switch (category) {
      case 'habit': return (summary.habitCount??0)>0
      case 'sleep': return (summary.sleepCount??0)>0
      case 'water': return (summary.waterCount??0)>0
      case 'dietEvent': return Boolean(summary.dietEvents?.length)
      case 'food': return summary.foodLogCount > 0
      case 'strength': return summary.hasWorkout
      case 'cardio': return summary.cardioCount > 0
      case 'pelvic': return summary.pelvicFloorSessionCount > 0
      case 'weight': return summary.weightKg !== undefined
    }
  })
}

export function getCalendarVisibleMarkers(summary?: CalendarDaySummary): { visible: CalendarCategory[]; hiddenCount: number } {
  return {visible:getCalendarRecordCategories(summary),hiddenCount:0}
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value)
}

function nutritionLabel(actual: number | undefined, target: number | undefined, unit: string): string | undefined {
  if (actual === undefined && target === undefined) return undefined
  if (actual === undefined) return `目标 ${formatCompactNumber(target!)} ${unit}，摄入未记录`
  if (target === undefined) return `${formatCompactNumber(actual)} ${unit}`
  return `${formatCompactNumber(actual ?? 0)} / ${formatCompactNumber(target)} ${unit}`
}

export function getCalendarDayAccessibleLabel(date: string, summary?: CalendarDaySummary, state: { selected?: boolean; today?: boolean } = {}): string {
  const label = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00`))
  const stateLabel = `${state.selected ? '，已选中' : ''}${state.today ? '，今天' : ''}`
  if (!summary) return `${label}${stateLabel}，无记录`
  const target = summary.nutritionTarget
  const details = [
    summary.dietEvents?.length ? summary.dietEvents.map(event => event.scope === 'day' ? '放纵日' : '放纵餐').join('、') : undefined,
    nutritionLabel(summary.calories, target?.calories, '千卡'),
    nutritionLabel(summary.protein, target?.protein, '克蛋白质'),
    nutritionLabel(summary.carbs, target?.carbs, '克碳水'),
    nutritionLabel(summary.fat, target?.fat, '克脂肪'),
    summary.hasWorkout ? `${summary.workoutCount} 次力量训练，${summary.setCount} 组` : undefined,
    summary.cardioCount ? `${summary.cardioCount} 次有氧训练，共 ${formatCompactNumber(summary.cardioMinutes)} 分钟` : undefined,
    summary.pelvicFloorSessionCount ? `${summary.pelvicFloorSessionCount} 次凯格尔训练，${summary.pelvicFloorContractions} 次收缩` : undefined,
    summary.habitCount ? `${summary.habitCount} 次习惯打卡` : undefined,
    summary.sleepCount ? `睡眠 ${formatCompactNumber((summary.sleepMinutes??0)/60)} 小时，${summary.sleepCount} 段` : undefined,
    summary.waterCount ? `饮水 ${summary.waterMl} ml，${summary.waterCount} 次` : undefined,
    summary.weightKg === undefined ? undefined : `体重 ${formatCompactNumber(summary.weightKg)} 千克`,
  ].filter(Boolean)
  if (hasDayRecords(summary)) {
    const categories = getCalendarRecordCategories(summary).map((category) => calendarCategoryLabels[category]).join('、')
    return `${label}${stateLabel}，有${categories}记录，${details.join('，')}`
  }
  return `${label}${stateLabel}，${details.length ? `${details.join('，')}，` : ''}无记录`
}

export function renderMonthCalendar({ year, month, selectedDate, summaries, onDateClick }: RenderMonthCalendarOptions): HTMLElement {
  const summaryMap = Array.isArray(summaries) ? new Map(summaries.map((summary) => [summary.date, summary])) : summaries
  const calendar = document.createElement('section')
  calendar.className = 'month-calendar'
  calendar.setAttribute('aria-label', `${year}年${month + 1}月日历`)

  const weekdays = document.createElement('div')
  weekdays.className = 'calendar-weekdays'
  weekdays.setAttribute('aria-hidden', 'true')
  for (const weekday of ['一', '二', '三', '四', '五', '六', '日']) {
    const label = document.createElement('span')
    label.textContent = weekday
    weekdays.append(label)
  }

  const grid = document.createElement('div')
  grid.className = 'calendar-grid'
  grid.setAttribute('role', 'grid')
  const today = getLocalDateString()
  for (const gridDay of getMonthGridDays(year, month)) {
    const summary = summaryMap.get(gridDay.date)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = ['calendar-day', gridDay.isCurrentMonth ? '' : 'outside-month', gridDay.date === today ? 'today' : '', gridDay.date === selectedDate ? 'selected' : ''].filter(Boolean).join(' ')
    button.dataset.date = gridDay.date
    button.setAttribute('role', 'gridcell')
    button.setAttribute('aria-label', getCalendarDayAccessibleLabel(gridDay.date, summary, { selected: gridDay.date === selectedDate, today: gridDay.date === today }))
    if (gridDay.date === selectedDate) button.setAttribute('aria-selected', 'true')

    const dayNumber = document.createElement('span')
    dayNumber.className = 'calendar-day-number'
    dayNumber.textContent = String(gridDay.day)
    button.append(dayNumber)

    const details = document.createElement('span')
    details.className = 'calendar-day-details'
    details.setAttribute('aria-hidden', 'true')
    const markers = document.createElement('span')
    markers.className = 'calendar-markers'
    const present = new Set(getCalendarVisibleMarkers(summary).visible)
    for (const category of calendarCategories) {
      const slot=document.createElement('span');slot.className='calendar-marker-slot';slot.dataset.category=category
      if(present.has(category)) {
        const marker=document.createElement('span');marker.className=`calendar-marker calendar-category-${category}`
        marker.innerHTML=icon(calendarCategoryIcons[category],12);slot.append(marker)
      }
      markers.append(slot)
    }
    details.append(markers)
    button.append(details)
    button.addEventListener('click', () => onDateClick(gridDay.date))
    grid.append(button)
  }

  calendar.append(weekdays, grid)
  return calendar
}
