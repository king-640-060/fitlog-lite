import { db, type FitLogDatabase } from '../db/database'
import { getLocalDateString } from '../utils/date'

export interface CalendarDaySummary {
  date: string
  calories?: number
  hasWorkout: boolean
  workoutCount: number
  setCount: number
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
  const [foodLogs, workouts, weights] = await Promise.all([
    database.foodLogs.where('date').between(start, end, true, true).toArray(),
    database.workouts.where('date').between(start, end, true, true).toArray(),
    database.weights.where('date').between(start, end, true, true).toArray(),
  ])
  const summaries = new Map<string, CalendarDaySummary>()
  const ensure = (date: string): CalendarDaySummary => {
    const existing = summaries.get(date)
    if (existing) return existing
    const summary: CalendarDaySummary = { date, hasWorkout: false, workoutCount: 0, setCount: 0 }
    summaries.set(date, summary)
    return summary
  }

  for (const log of foodLogs) {
    const summary = ensure(log.date)
    summary.calories = (summary.calories ?? 0) + log.totalCalories
  }
  for (const workout of workouts) {
    const summary = ensure(workout.date)
    summary.hasWorkout = true
    summary.workoutCount += 1
    summary.setCount += workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
  }
  for (const weight of weights) ensure(weight.date).weightKg = weight.weightKg

  return summaries
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value)
}

function getAccessibleLabel(date: string, summary?: CalendarDaySummary): string {
  const label = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00`))
  if (!summary) return `${label}，无记录`
  const details = [
    summary.calories === undefined ? undefined : `${formatCompactNumber(summary.calories)} 千卡`,
    summary.hasWorkout ? `${summary.workoutCount} 次训练，${summary.setCount} 组` : undefined,
    summary.weightKg === undefined ? undefined : `体重 ${formatCompactNumber(summary.weightKg)} 千克`,
  ].filter(Boolean)
  return `${label}，${details.join('，') || '无记录'}`
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
    button.setAttribute('aria-label', getAccessibleLabel(gridDay.date, summary))
    if (gridDay.date === selectedDate) button.setAttribute('aria-selected', 'true')

    const dayNumber = document.createElement('span')
    dayNumber.className = 'calendar-day-number'
    dayNumber.textContent = String(gridDay.day)
    button.append(dayNumber)

    const details = document.createElement('span')
    details.className = 'calendar-day-details'
    details.setAttribute('aria-hidden', 'true')
    if (summary?.calories !== undefined) {
      const calories = document.createElement('small')
      calories.className = 'calendar-calories'
      calories.textContent = String(Math.round(summary.calories))
      details.append(calories)
    }
    if (summary?.hasWorkout) {
      const workout = document.createElement('small')
      workout.className = 'calendar-workout'
      workout.textContent = `● ${summary.setCount}组`
      details.append(workout)
    }
    if (summary?.weightKg !== undefined) {
      const weight = document.createElement('small')
      weight.className = 'calendar-weight'
      weight.textContent = `${formatCompactNumber(summary.weightKg)}kg`
      details.append(weight)
    }
    button.append(details)
    button.addEventListener('click', () => onDateClick(gridDay.date))
    grid.append(button)
  }

  calendar.append(weekdays, grid)
  return calendar
}
