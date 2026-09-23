export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftLocalDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return getLocalDateString(new Date(year!, month! - 1, day! + days, 12))
}

export function getFoodQuickDates(today = new Date()): { yesterday: string; today: string; tomorrow: string } {
  const localToday = getLocalDateString(today)
  return { yesterday: shiftLocalDate(localToday, -1), today: localToday, tomorrow: shiftLocalDate(localToday, 1) }
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${month}-${day}`
}
