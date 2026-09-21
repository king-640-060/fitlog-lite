import { db, type FitLogDatabase } from '../db/database'
import type { NutritionTarget } from '../db/types'
import { pelvicFloorSessionDurationSeconds } from '../services/pelvicFloorService'
import { getLocalDateString } from '../utils/date'

export interface CalendarDaySummary {
  date: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  nutritionTarget?: NutritionTarget
  hasWorkout: boolean
  workoutCount: number
  setCount: number
  pelvicFloorSessionCount: number
  pelvicFloorContractions: number
  pelvicFloorSeconds: number
  weightKg?: number
}

export interface CalendarGridDay {
  date: string
  day: number
  isCurrentMonth: boolean
}

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

export function getMonthGridDays(year: number, month: number): CalendarGridDay[] {
  const firstOfMonth = new Date(year, month, 1)
  const mondayFirstOffset = (firstOfMonth.getDay() - 1 + 7) % 7
  const gridStart = new Date(year, month, 1 - mondayFirstOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      date: getLocalDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
    }
  })
}

export async function loadMonthSummaries(year: number, month: number, database: FitLogDatabase = db): Promise<Map<string, CalendarDaySummary>> {
  const { start, end } = getMonthBounds(year, month)
  const [foodLogs, workouts, weights, nutritionTargets, pelvicFloorSessions] = await Promise.all([
    database.foodLogs.where('date').between(start, end, true, true).toArray(),
    database.workouts.where('date').between(start, end, true, true).toArray(),
    database.weights.where('date').between(start, end, true, true).toArray(),
    database.nutritionTargets.where('date').between(start, end, true, true).toArray(),
    database.pelvicFloorSessions.where('date').between(start, end, true, true).toArray(),
  ])
  const summaries = new Map<string, CalendarDaySummary>()
  const ensure = (date: string): CalendarDaySummary => {
    const existing = summaries.get(date)
    if (existing) return existing
    const summary: CalendarDaySummary = {
      date, hasWorkout: false, workoutCount: 0, setCount: 0,
      pelvicFloorSessionCount: 0, pelvicFloorContractions: 0, pelvicFloorSeconds: 0,
    }
    summaries.set(date, summary)
    return summary
  }

  for (const log of foodLogs) {
    const summary = ensure(log.date)
    summary.calories = (summary.calories ?? 0) + log.totalCalories
    if (log.totalProtein !== undefined) summary.protein = (summary.protein ?? 0) + log.totalProtein
    if (log.totalCarbs !== undefined) summary.carbs = (summary.carbs ?? 0) + log.totalCarbs
    if (log.totalFat !== undefined) summary.fat = (summary.fat ?? 0) + log.totalFat
  }
  for (const target of nutritionTargets) ensure(target.date).nutritionTarget = target
  for (const workout of workouts) {
    const summary = ensure(workout.date)
    summary.hasWorkout = true
    summary.workoutCount += 1
    summary.setCount += workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
  }
  for (const session of pelvicFloorSessions) {
    const summary = ensure(session.date)
    summary.pelvicFloorSessionCount += 1
    summary.pelvicFloorContractions += session.completedRepetitions
    summary.pelvicFloorSeconds += pelvicFloorSessionDurationSeconds(session)
  }
  for (const weight of weights) ensure(weight.date).weightKg = weight.weightKg

  return summaries
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value)
}

function nutritionLabel(actual: number | undefined, target: number | undefined, unit: string): string | undefined {
  if (actual === undefined && target === undefined) return undefined
  if (target === undefined) return `${formatCompactNumber(actual ?? 0)} ${unit}`
  return `${formatCompactNumber(actual ?? 0)} / ${formatCompactNumber(target)} ${unit}`
}

export function getCalendarDayAccessibleLabel(date: string, summary?: CalendarDaySummary): string {
  const label = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00`))
  if (!summary) return `${label}，无记录`
  const target = summary.nutritionTarget
  const details = [
    nutritionLabel(summary.calories, target?.calories, '千卡'),
    nutritionLabel(summary.protein, target?.protein, '克蛋白质'),
    nutritionLabel(summary.carbs, target?.carbs, '克碳水'),
    nutritionLabel(summary.fat, target?.fat, '克脂肪'),
    summary.hasWorkout ? `${summary.workoutCount} 次力量训练，${summary.setCount} 组` : undefined,
    summary.pelvicFloorSessionCount ? `${summary.pelvicFloorSessionCount} 次盆底肌训练，${summary.pelvicFloorContractions} 次收缩` : undefined,
    summary.weightKg === undefined ? undefined : `体重 ${formatCompactNumber(summary.weightKg)} 千克`,
  ].filter(Boolean)
  return `${label}，${details.join('，') || '无记录'}`
}

function calorieProgress(summary: CalendarDaySummary): number | undefined {
  const target = summary.nutritionTarget?.calories
  if (target === undefined) return undefined
  if (target === 0) return (summary.calories ?? 0) > 0 ? 100 : 0
  return Math.min(100, Math.max(0, ((summary.calories ?? 0) / target) * 100))
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
    button.setAttribute('aria-label', getCalendarDayAccessibleLabel(gridDay.date, summary))
    if (gridDay.date === selectedDate) button.setAttribute('aria-selected', 'true')

    const dayNumber = document.createElement('span')
    dayNumber.className = 'calendar-day-number'
    dayNumber.textContent = String(gridDay.day)
    button.append(dayNumber)

    const details = document.createElement('span')
    details.className = 'calendar-day-details'
    details.setAttribute('aria-hidden', 'true')
    const progress = summary ? calorieProgress(summary) : undefined
    if (progress !== undefined) {
      const track = document.createElement('i')
      track.className = 'calendar-nutrition-progress'
      track.style.setProperty('--progress', `${progress}%`)
      details.append(track)
    } else if (summary?.calories !== undefined || summary?.nutritionTarget) {
      const marker = document.createElement('i')
      marker.className = 'calendar-marker nutrition-marker'
      marker.textContent = 'N'
      details.append(marker)
    }
    const markers = document.createElement('span')
    markers.className = 'calendar-markers'
    if (summary?.hasWorkout) markers.innerHTML += '<i class="calendar-marker workout-marker">S</i>'
    if (summary?.pelvicFloorSessionCount) markers.innerHTML += '<i class="calendar-marker pelvic-marker">P</i>'
    if (summary?.weightKg !== undefined) markers.innerHTML += '<i class="calendar-marker weight-marker">W</i>'
    if (markers.childElementCount) details.append(markers)
    button.append(details)
    button.addEventListener('click', () => onDateClick(gridDay.date))
    grid.append(button)
  }

  calendar.append(weekdays, grid)
  return calendar
}
