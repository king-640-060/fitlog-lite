import { getLocalDateString, shiftLocalDate } from '../utils/date'

export function foodPagerDates(selected: string): [string, string, string] {
  return [shiftLocalDate(selected, -1), selected, shiftLocalDate(selected, 1)]
}

export function foodPagerLabel(date: string, today = getLocalDateString()): string {
  if (date === today) return '今天'
  if (date === shiftLocalDate(today, -1)) return '昨天'
  if (date === shiftLocalDate(today, 1)) return '明天'
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
}

export function foodSwipeDirection(dx: number, elapsedMs: number, width: number): -1 | 0 | 1 {
  if (Math.abs(dx) >= width * 0.23 || (Math.abs(dx) >= 32 && Math.abs(dx) / Math.max(elapsedMs, 1) >= 0.55)) {
    return dx > 0 ? -1 : 1
  }
  return 0
}
