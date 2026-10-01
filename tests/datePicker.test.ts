import { describe, expect, it } from 'vitest'
import { DatePickerState, datePickerGridHtml, datePickerLabel } from '../src/ui/datePicker'
import { getMonthGridDays } from '../src/utils/calendarGrid'
import { getMonthGridDays as progressGrid } from '../src/ui/calendarPage'

describe('shared device-local date picker', () => {
  it('opens selected month with a Monday-first 42-day grid shared with Progress', () => {
    const s = new DatePickerState('2026-10-15', '2026-10-01')
    expect([s.year, s.month, s.selected, s.focused]).toEqual([2026, 9, '2026-10-15', '2026-10-15'])
    expect(progressGrid).toBe(getMonthGridDays)
    const days = getMonthGridDays(s.year, s.month)
    expect(days).toHaveLength(42)
    expect(days[0].date).toBe('2026-09-28')
    expect(days[41].date).toBe('2026-11-08')
  })
  it('exposes independent Today and selected states with one tab stop and full labels', () => {
    const html = datePickerGridHtml(new DatePickerState('2026-10-15', '2026-10-01'))
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html.match(/aria-current="date"/g)).toHaveLength(1)
    expect(html).toContain('2026年10月1日星期四，今天')
    expect(html).toContain('2026年10月15日星期四，已选中')
    expect(html.match(/role="row"/g)).toHaveLength(6)
    expect(html.match(/role="gridcell"/g)).toHaveLength(42)
    expect(datePickerGridHtml(new DatePickerState('2026-10-01', '2026-10-01'))).toContain('今天，已选中')
  })
  it('defaults to local Today and allows an optional empty draft', () => {
    expect(new DatePickerState(undefined, '2026-10-01').selected).toBe('2026-10-01')
    const empty = new DatePickerState(undefined, '2026-10-01', true)
    expect(empty.selected).toBeUndefined()
    expect(empty.focused).toBe('2026-10-01')
  })
  it('navigates December/January in both directions without modifying the draft', () => {
    const s = new DatePickerState('2026-12-31')
    s.shiftMonth(1); expect([s.year, s.month, s.focused]).toEqual([2027, 0, '2027-01-31'])
    s.shiftMonth(-1); expect([s.year, s.month]).toEqual([2026, 11])
    expect(s.selected).toBe('2026-12-31')
    s.shiftMonth(2); expect(s.focused).toBe('2027-02-28')
  })
  it('selects outside-month cells and switches their visible month', () => {
    const s = new DatePickerState('2026-10-01')
    s.select('2026-09-28'); expect([s.year, s.month, s.selected]).toEqual([2026, 8, '2026-09-28'])
    s.select('2026-11-08'); expect([s.year, s.month, s.focused]).toEqual([2026, 10, '2026-11-08'])
  })
  it.each([['ArrowLeft', '2026-09-30'], ['ArrowRight', '2026-10-02'], ['ArrowUp', '2026-09-24'], ['ArrowDown', '2026-10-08']])('moves keyboard focus with %s while keeping selection draft unchanged', (key, expected) => {
    const s = new DatePickerState('2026-10-01')
    expect(s.moveFocus(key)).toBe(true); expect(s.focused).toBe(expected); expect(s.selected).toBe('2026-10-01')
    const html = datePickerGridHtml(s)
    expect(html).toContain(`data-date="${expected}" tabindex="0"`)
  })
  it('crosses year with keyboard and only selects upon explicit selection', () => {
    const s = new DatePickerState('2026-12-31')
    s.moveFocus('ArrowRight'); expect([s.year, s.month, s.focused]).toEqual([2027, 0, '2027-01-01'])
    s.select(s.focused); expect(s.selected).toBe('2027-01-01')
    expect(s.moveFocus('Escape')).toBe(false)
  })
  it('does not normalize invalid dates or use UTC day truncation', () => {
    const s = new DatePickerState('2026-02-30', '2026-10-01')
    expect(s.selected).toBe('2026-10-01')
    expect(datePickerLabel('2026-10-01')).toBe('10月1日 · 周四')
    const previous = process.env.TZ
    try {
      for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Shanghai']) {
        process.env.TZ = zone
        const local = new DatePickerState('2026-10-01', '2026-10-01')
        local.moveFocus('ArrowLeft'); expect(local.focused).toBe('2026-09-30')
        expect(datePickerGridHtml(local)).toContain('data-date="2026-10-01"')
      }
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
  })
})
