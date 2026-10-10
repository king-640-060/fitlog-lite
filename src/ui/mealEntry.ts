import { db } from '../db/database'
import type { Food, MealType } from '../db/types'
import { logFood } from '../services/foodService'
import { readDailyNutritionSummary, observeDailyNutritionSummary } from '../services/dailyNutritionSummary'
import { foodQuantityFields, bindFoodQuantity } from './foodQuantity'
import { historySubview } from './recordHistory'
import { setSheetVariant } from './sheetController'
import { formatEnergyInputValue } from '../utils/energy'
import { formatNumber } from '../utils/nutrition'
import { mealNames } from '../utils/foodMeals'

interface MealEntryUi {
  openModal(title: string, html: string, large?: boolean): HTMLDialogElement
  esc(value: unknown): string
  newFood(dialog: HTMLDialogElement, saved: () => Promise<void>): void
  vision(date: string, meal: MealType): void
  saved(): void
}
/** Captured date/meal and a single native Sheet own the whole manual recording session. */
export async function openMealEntry(date: string, meal: MealType, ui: MealEntryUi): Promise<void> {
  const dialog = ui.openModal(`记录${mealNames[meal]}`, '<p role="status">正在读取食物库…</p>', true)
  let alive = true, busy = false, foods: Food[] = [], stop = () => {}, notice = ''
  const body = dialog.querySelector<HTMLElement>('.modal-body')!
  dialog.addEventListener('close', () => { alive = false; stop() }, { once: true })
  const summaryHtml = (day: Awaited<ReturnType<typeof readDailyNutritionSummary>>) => {
    const rows = day.logs.filter(log => log.meal === meal)
    return `<h3>${mealNames[meal]}已记录 · ${rows.length} 项</h3><strong>${formatEnergyInputValue(rows.reduce((sum, log) => sum + log.totalCalories, 0))} kcal</strong><ul>${rows.map(log => `<li><span>${ui.esc(log.foodName)} · ${formatNumber(log.grams)} g</span><span>${formatEnergyInputValue(log.totalCalories)} kcal</span></li>`).join('')}</ul>`
  }
  const refresh = async () => {
    const [library, day] = await Promise.all([db.foods.orderBy('name').toArray(), readDailyNutritionSummary(date)])
    if (!alive) return
    foods = library
    const host = body.querySelector<HTMLElement>('[data-meal-subtotal]')
    if (host) host.innerHTML = summaryHtml(day)
    return day
  }
  try {
    const day = await refresh()
    if (!alive || !day) return
    body.innerHTML = `<div class="meal-entry-session"><p class="meal-entry-context">${date} · ${mealNames[meal]} · 保存后可继续添加</p><p class="meal-entry-notice" role="status" data-meal-notice></p><div class="meal-entry-subtotal" data-meal-subtotal>${summaryHtml(day)}</div><label class="search-field"><span class="sr-only">搜索食物</span><input id="food-search" type="search" placeholder="搜索食物或品牌" autocomplete="off"></label><div id="food-results" class="picker-list"></div><div class="meal-entry-footer"><button type="button" class="secondary" id="meal-entry-done">完成本餐记录</button><button type="button" class="text-btn" id="create-food-from-picker">新建食物</button><button type="button" class="text-btn" id="vision-food-from-picker">拍包装并记录</button></div></div>`
    const search = body.querySelector<HTMLInputElement>('#food-search')!
    const results = body.querySelector<HTMLElement>('#food-results')!
    const draw = () => {
      const query = search.value.trim().toLocaleLowerCase()
      results.innerHTML = foods.filter(food => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(query)).slice(0, 100).map(food => `<button type="button" class="picker-item" data-food="${ui.esc(food.id)}"><span><strong>${ui.esc(food.name)}</strong>${food.brand ? `<small>${ui.esc(food.brand)}</small>` : ''}</span><em>${formatEnergyInputValue(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</em></button>`).join('') || `<p class="muted">${foods.length ? '没有匹配的食物' : '食物库还是空的，请新建食物或拍包装录入。'}</p>`
    }
    stop = observeDailyNutritionSummary(date, day, next => {
      // Keep the detached picker nodes and all quantity drafts intact during writes.
      const host = body.querySelector<HTMLElement>('[data-meal-subtotal]'); if (host) host.innerHTML = summaryHtml(next)
    }, () => {})
    draw(); search.addEventListener('input', draw)
    results.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLElement>('[data-food]'), food = foods.find(f => f.id === button?.dataset.food)
      if (!food || busy || !alive) return
      const restore = historySubview(dialog, `记录${mealNames[meal]} · ${food.name}`, `<form id="log-food-form" class="form quantity-form"><p class="meal-entry-context">${date} · ${mealNames[meal]}</p><div class="selected-food"><span>每 ${formatNumber(food.referenceGrams)}g</span><strong>${formatEnergyInputValue(food.calories)} kcal</strong></div>${foodQuantityFields(food)}<p class="meal-entry-error" role="alert" hidden></p><button class="primary" type="submit">保存并继续添加</button></form>`)
      setSheetVariant(dialog, 'form')
      const form = body.querySelector<HTMLFormElement>('#log-food-form')!, quantity = bindFoodQuantity(form, food), submit = form.querySelector<HTMLButtonElement>('[type=submit]')!
      form.addEventListener('submit', async event => {
        event.preventDefault(); if (busy || !alive || !form.isConnected) return
        busy = true; submit.disabled = true; submit.setAttribute('aria-busy', 'true')
        const errorNode = form.querySelector<HTMLElement>('[role=alert]')!; errorNode.hidden = true
        try {
          await logFood(food, quantity.grams(), date, meal)
          ui.saved()
          if (!alive) return
          restore(); setSheetVariant(dialog, 'large'); notice = '已保存，可继续添加下一种食物'
          body.querySelector('[data-meal-notice]')!.textContent = notice
          await refresh(); if (alive) draw()
        } catch (error) {
          if (alive && form.isConnected) { errorNode.textContent = error instanceof Error ? error.message : '保存失败，请重试'; errorNode.hidden = false }
        } finally { busy = false; submit.disabled = false; submit.removeAttribute('aria-busy') }
      })
    })
    body.querySelector('#meal-entry-done')!.addEventListener('click', () => dialog.close())
    body.querySelector('#create-food-from-picker')!.addEventListener('click', () => ui.newFood(dialog, async () => { await refresh(); if (alive) draw() }))
    body.querySelector('#vision-food-from-picker')!.addEventListener('click', () => { dialog.close(); ui.vision(date, meal) })
  } catch (error) { if (alive) body.textContent = error instanceof Error ? error.message : '暂时无法读取食物库，请关闭后重试' }
}
