import { formatNumber } from '../utils/nutrition'
import { formatEnergyInputValue } from '../utils/energy'

/** Format initial values only. Untouched fields keep their exact source in FormData. */
export function bindNumericPresentation(root: ParentNode): void {
  root.querySelectorAll<HTMLFormElement>('form').forEach(form => {
    const originals = new Map<HTMLInputElement, { source: string; display: string }>()
    form.querySelectorAll<HTMLInputElement>('input[type=number]').forEach(input => {
      // EnergyEditor owns both its display and canonical state.
      if (['calories', 'energyValue'].includes(input.name) || !input.value) return
      const original = input.value, number = Number(original)
      if (!Number.isFinite(number)) return
      const formatted = input.name === 'goalCalories' ? formatEnergyInputValue(number) : formatNumber(number)
      // Keep tiny positive editable values valid; do not render an invalid rounded zero.
      input.value = number > 0 && Number(formatted) === 0 ? '0.1' : formatted
      originals.set(input, { source: original, display: input.value })
      input.addEventListener('input', () => originals.delete(input))
    })
    form.addEventListener('formdata', event => {
      originals.forEach((value, input) => { if (input.isConnected && !input.disabled && input.name && input.value === value.display) event.formData.set(input.name, value.source) })
    })
  })
}
