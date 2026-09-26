import { getLocalDateString, shiftLocalDate } from '../utils/date'

export function foodRailDates(center: string, radius = 7): string[] {
  return Array.from({ length: radius * 2 + 1 }, (_, index) => shiftLocalDate(center, index - radius))
}

export function foodPagerLabel(date: string, today = getLocalDateString()): string {
  if (date === today) return '今天'
  if (date === shiftLocalDate(today, -1)) return '昨天'
  if (date === shiftLocalDate(today, 1)) return '明天'
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
}

export function foodRailNeedsRecenter(index: number, length: number): boolean {
  return index < 0 || index <= 2 || index >= length - 3
}

export function foodRailFocus(distance: number, influenceRadius: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(distance) / Math.max(1, influenceRadius)))
}

export function shouldCommitFoodDate(nextDate: string, selectedDate: string): boolean {
  return Boolean(nextDate) && nextDate !== selectedDate
}

export function shouldShowFoodTodayShortcut(selectedDate: string, today = getLocalDateString()): boolean {
  return selectedDate !== today
}

export function isCurrentFoodRender(requestVersion: number, currentVersion: number, requestedDate: string, selectedDate: string): boolean {
  return requestVersion === currentVersion && requestedDate === selectedDate
}
