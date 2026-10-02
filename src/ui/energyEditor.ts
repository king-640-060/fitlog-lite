import { EnergyEditor, type EnergyUnit } from '../utils/energy'
export function bindEnergyEditor(input: HTMLInputElement, select: HTMLSelectElement, canonical?: number | null): EnergyEditor {
  const editor = new EnergyEditor(input.value.trim() ? Number(input.value) : null, select.value as EnergyUnit, canonical)
  input.addEventListener('input', () => { try { editor.edit(input.value) } catch { /* Native form validation blocks invalid numeric input. */ } })
  select.addEventListener('change', () => { editor.switchUnit(select.value as EnergyUnit); input.value = editor.value === null ? '' : String(editor.value) })
  return editor
}
