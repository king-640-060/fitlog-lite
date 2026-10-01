import { getLocalDateString } from './date'

export interface CalendarGridDay {
  date: string
  day: number
  isCurrentMonth: boolean
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
