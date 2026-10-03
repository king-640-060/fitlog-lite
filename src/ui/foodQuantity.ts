import type { Food } from '../db/types'
import { calculateNutrition, formatNumber } from '../utils/nutrition'
import { formatEnergyInputValue } from '../utils/energy'
import { foodQuantityGrams, type FoodQuantityMode } from '../utils/foodQuantity'

export function foodQuantityFields(food: Food): string {
  return `${food.servingGrams === undefined ? '' : `<div class="food-quantity-mode" role="group" aria-label="记录方式"><button type="button" class="secondary" data-quantity-mode="grams" aria-pressed="true">按克</button><button type="button" class="secondary" data-quantity-mode="servings" aria-pressed="false">按份</button></div><p class="food-serving-note">1 份 = ${formatNumber(food.servingGrams)} g</p>`}<label class="quantity-label"><span class="quantity-caption">吃了多少？</span><span class="quantity-input"><input name="grams" id="grams" type="number" inputmode="decimal" min="0.000001" step="any" placeholder="230" required><b id="quantity-unit">g</b></span></label><p id="serving-conversion" class="food-serving-note" role="status" hidden></p><div class="preview-number"><span>预计热量</span><strong id="kcal-preview">— kcal</strong></div>`
}

/** Mode changes preserve exact input amounts; only display text is formatted. */
export function bindFoodQuantity(form: HTMLFormElement, food: Food): { grams(): number } {
  const input = form.querySelector<HTMLInputElement>('#grams')!, conversion = form.querySelector<HTMLElement>('#serving-conversion')!
  let mode: FoodQuantityMode = 'grams'
  let converted: { value: string; grams: number } | undefined
  const grams = () => converted?.value === input.value ? converted.grams : foodQuantityGrams(input.value, mode, food)
  const draw = () => {
    conversion.hidden = mode !== 'servings'
    try {
      const actual = grams()
      form.querySelector('#kcal-preview')!.textContent = `${formatEnergyInputValue(calculateNutrition(food, actual).calories)} kcal`
      conversion.textContent = `${String(Number(input.value))} 份 = ${formatNumber(actual)} g`
    } catch {
      form.querySelector('#kcal-preview')!.textContent = '— kcal'
      conversion.textContent = '填写份数后显示实际克数'
    }
  }
  input.addEventListener('input', () => { converted = undefined; draw() })
  form.querySelectorAll<HTMLButtonElement>('[data-quantity-mode]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.quantityMode as FoodQuantityMode
    if (next === mode) return
    if (input.value) {
      try { const actual = grams(); input.value = String(next === 'grams' ? actual : actual / food.servingGrams!); converted = { value: input.value, grams: actual } }
      catch { input.value = ''; converted = undefined }
    }
    mode = next
    input.min = mode === 'servings' ? String(Number.MIN_VALUE) : '0.000001'
    form.querySelectorAll<HTMLButtonElement>('[data-quantity-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)))
    form.querySelector('.quantity-caption')!.textContent = mode === 'servings' ? '份数' : '吃了多少？'
    form.querySelector('#quantity-unit')!.textContent = mode === 'servings' ? '份' : 'g'
    input.placeholder = mode === 'servings' ? '1.5' : '230'
    draw()
  }))
  return { grams }
}
