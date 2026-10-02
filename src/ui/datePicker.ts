import { getMonthGridDays } from '../utils/calendarGrid'
import { getLocalDateString, shiftLocalDate } from '../utils/date'

export interface DatePickerOptions {
  value?: string
  today?: string
  allowEmpty?: boolean
  onChange?: (date?: string) => void
  onConfirm?: (date?: string) => void
  onCancel?: () => void
}
export interface DatePickerController {
  value(): string | undefined
  setValue(date?: string): void
  destroy(): void
}

function validDate(date?: string): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isFinite(parsed.getTime()) && getLocalDateString(parsed) === date ? date : undefined
}
export function datePickerLabel(date: string): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace(/(周.)$/, ' · $1')
}

/** Ephemeral UI state only. Moving focus never commits a business date. */
export class DatePickerState {
  readonly today: string
  selected?: string
  focused!: string
  year!: number
  month!: number
  readonly allowEmpty: boolean
  constructor(value?: string, today = getLocalDateString(), allowEmpty = false) {
    this.allowEmpty = allowEmpty
    this.today = validDate(today) ?? getLocalDateString()
    this.select(value)
  }
  private show(date: string): void {
    const parsed = new Date(`${date}T12:00:00`)
    this.year = parsed.getFullYear(); this.month = parsed.getMonth()
  }
  select(date?: string): void {
    this.selected = validDate(date) ?? (this.allowEmpty ? undefined : this.today)
    this.focused = this.selected ?? this.today
    this.show(this.focused)
  }
  shiftMonth(offset: number): void {
    const next = new Date(this.year, this.month + offset, 1, 12)
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate()
    const day = Math.min(new Date(`${this.focused}T12:00:00`).getDate(), last)
    this.focused = getLocalDateString(new Date(next.getFullYear(), next.getMonth(), day, 12))
    this.show(this.focused)
  }
  moveFocus(key: string): boolean {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[key]
    if (offset === undefined) return false
    this.focused = shiftLocalDate(this.focused, offset); this.show(this.focused)
    return true
  }
}

export function datePickerGridHtml(state: DatePickerState): string {
  const days = getMonthGridDays(state.year, state.month)
  return Array.from({ length: 6 }, (_, row) => `<div role="row">${days.slice(row * 7, row * 7 + 7).map(day => {
    const label = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${day.date}T12:00:00`))
    return `<button type="button" role="gridcell" class="date-picker-day${day.isCurrentMonth ? '' : ' outside-month'}" data-date="${day.date}" tabindex="${day.date === state.focused ? 0 : -1}" aria-selected="${day.date === state.selected}" ${day.date === state.today ? 'aria-current="date"' : ''} aria-label="${label}${day.date === state.today ? '，今天' : ''}${day.date === state.selected ? '，已选中' : ''}"><span>${day.day}</span></button>`
  }).join('')}</div>`).join('')
}

export function mountDatePicker(host: HTMLElement, options: DatePickerOptions): DatePickerController {
  const state = new DatePickerState(options.value, options.today, options.allowEmpty)
  const events = new AbortController()
  host.innerHTML = `<section class="date-picker"><div class="date-picker-month-head"><button type="button" data-month="-1" aria-label="上个月">‹</button><strong aria-live="polite"></strong><button type="button" data-month="1" aria-label="下个月">›</button></div><div class="date-picker-weekdays" aria-hidden="true">${['一', '二', '三', '四', '五', '六', '日'].map(day => `<span>${day}</span>`).join('')}</div><div class="date-picker-grid" role="grid"></div><div class="date-picker-actions"><button type="button" class="text-btn" data-today>回到今天</button><button type="button" class="primary" data-done>完成</button></div>${options.onCancel ? '<button type="button" class="text-btn date-picker-cancel" data-cancel>取消 / 返回</button>' : ''}</section>`
  const grid = host.querySelector<HTMLElement>('.date-picker-grid')!
  let renderedMonth = ''
  const render = (focus = false) => {
    const month = `${state.year}年${state.month + 1}月`
    host.querySelector('.date-picker-month-head strong')!.textContent = month
    grid.setAttribute('aria-label', `${month}，选择日期`)
    if (month !== renderedMonth) { grid.innerHTML = datePickerGridHtml(state); renderedMonth = month }
    else grid.querySelectorAll<HTMLButtonElement>('[data-date]').forEach(button => {
      const selected = button.dataset.date === state.selected
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = button.dataset.date === state.focused ? 0 : -1
      button.setAttribute('aria-label', button.getAttribute('aria-label')!.replace('，已选中', '') + (selected ? '，已选中' : ''))
    })
    if (focus) grid.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus({ preventScroll: true })
  }
  const choose = (date?: string) => { state.select(date); render(); options.onChange?.(state.selected) }
  host.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button')
    if (!button || !host.contains(button)) return
    if (button.dataset.date) { choose(button.dataset.date); render(true) }
    else if (button.dataset.month) { state.shiftMonth(Number(button.dataset.month)); render() }
    else if (button.hasAttribute('data-today')) { choose(state.today); render(true) }
    else if (button.hasAttribute('data-done')) options.onConfirm?.(state.selected)
    else if (button.hasAttribute('data-cancel')) options.onCancel?.()
  }, { signal: events.signal })
  grid.addEventListener('keydown', event => {
    if (state.moveFocus(event.key)) { event.preventDefault(); render(true) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(state.focused); render(true) }
  }, { signal: events.signal })
  render()
  return {
    value: () => state.selected,
    setValue: date => { state.select(date); render() },
    destroy: () => { events.abort(); host.replaceChildren() },
  }
}
