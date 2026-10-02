import { describe, expect, it } from 'vitest'
import { EnergyEditor, formatEnergyInputValue, kcalToKj, kjToKcal } from '../src/utils/energy'
describe('canonical energy and display-only units', () => {
  it('shows integer automatic conversions while retaining AI-derived exact energy', () => {
    const editor = new EnergyEditor(1584, 'kJ')
    expect(editor.displayValue).toBe('1584')
    editor.switchUnit('kcal'); expect(editor.displayValue).toBe('379')
    expect(editor.kcal).toBe(1584 / 4.184)
    editor.switchUnit('kJ'); expect(editor.displayValue).toBe('1584')
    expect(editor.kcal).toBe(1584 / 4.184)
  })
  it('keeps existing precise Food through rounded initialization and repeated unit switches', () => {
    const precise = 378.585086042065, editor = new EnergyEditor(379, 'kcal', precise)
    for (let i = 0; i < 20; i++) { editor.switchUnit('kJ'); expect(editor.displayValue).toBe('1584'); editor.switchUnit('kcal'); expect(editor.displayValue).toBe('379') }
    expect(editor.kcal).toBe(precise)
    editor.edit('380.25'); expect(editor.kcal).toBe(380.25)
    expect(editor.displayValue).toBe('380')
  })
  it('never presents automatic exponent or floating point noise', () => {
    expect(formatEnergyInputValue(null)).toBe(''); expect(formatEnergyInputValue(1e-7)).toBe('0')
    expect(formatEnergyInputValue(0.1 + 0.2)).toBe('0'); expect(formatEnergyInputValue(1584.00000000001)).toBe('1584')
  })
  it('uses the exact 4.184 constant and keeps original kcal when units change', () => {
    expect(kcalToKj(1)).toBe(4.184); expect(kcalToKj(100)).toBeCloseTo(418.4, 12)
    expect(kjToKcal(418.4)).toBeCloseTo(100, 12); expect(kjToKcal(1980)).toBe(1980 / 4.184)
    const precise = 473.2313575525813, editor = new EnergyEditor(precise)
    for (let i = 0; i < 100; i++) { editor.switchUnit('kJ'); editor.switchUnit('kcal') }
    expect(editor.kcal).toBe(precise); expect(editor.value).toBe(precise)
    editor.switchUnit('kJ'); expect(editor.kcal).toBe(precise)
    editor.edit('2000'); expect(editor.kcal).toBe(2000 / 4.184)
  })
  it('accepts new kcal/kJ edits and preserves empty unknown energy', () => {
    const editor = new EnergyEditor(null); editor.edit('123.456789012345'); expect(editor.kcal).toBe(123.456789012345)
    editor.switchUnit('kJ'); editor.edit('418.4'); expect(editor.kcal).toBe(kjToKcal(418.4))
    editor.edit(''); expect(editor.kcal).toBeNull(); editor.switchUnit('kcal'); expect(editor.value).toBeNull()
    expect(() => editor.edit('-1')).toThrow()
  })
})
