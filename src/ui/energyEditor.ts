import { EnergyEditor, type EnergyUnit } from '../utils/energy'
export function bindEnergyEditor(input: HTMLInputElement, select: HTMLSelectElement, canonical?: number | null): EnergyEditor {
  const editor = new EnergyEditor(input.value.trim() ? Number(input.value) : null, select.value as EnergyUnit, canonical)
  input.value = editor.displayValue
  input.addEventListener('input', () => { try { editor.edit(input.value) } catch { /* Native form validation blocks invalid numeric input. */ } })
  select.addEventListener('change', () => { editor.switchUnit(select.value as EnergyUnit); input.value = editor.displayValue })
  return editor
}
