import './styles/main.css'
import { Chart, registerables } from 'chart.js'
import { registerSW } from 'virtual:pwa-register'
import { db, seedExercises } from './db/database'
import type { BackupData, Exercise, Food, Workout, WorkoutExercise, WorkoutSet } from './db/types'
import { exportBackup, restoreBackup, validateBackup } from './services/backupService'
import { logFood, saveFood, updateFoodLogGrams, validateFoodInput } from './services/foodService'
import { buildImportPreview, parseFoodCsv, parseFoodJson, type ImportPreview } from './services/importService'
import { upsertWeight } from './services/weightService'
import { createWorkout, findOpenWorkout, saveExercise, saveWorkout, validateWorkoutSet } from './services/workoutService'
import { loadMonthSummaries, renderMonthCalendar, type CalendarDaySummary } from './ui/calendarPage'
import { formatShortDate, getLocalDateString } from './utils/date'
import { calculateNutrition, formatNumber } from './utils/nutrition'

Chart.register(...registerables)
registerSW({ immediate: true })

type Tab = 'food' | 'workout' | 'weight'
let activeTab: Tab = 'food'
let showCalendar = false
let calendarSelectedDate = getLocalDateString()
let calendarYear = new Date().getFullYear()
let calendarMonth = new Date().getMonth()
let foodDate = getLocalDateString()
let workoutDate = getLocalDateString()
let currentWorkout: Workout | undefined
let workoutEditorOpen = false
let showWorkoutHistory = false
let weightRange: '30' | '90' | 'all' = '30'
let weightChart: Chart | undefined
let workoutSaveTimer: number | undefined
let workoutClockTimer: number | undefined
const LAST_BACKUP_KEY = 'fitlog-last-backup-at'

const app = document.querySelector<HTMLDivElement>('#app')!
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
const valueOf = (form: FormData, key: string): string => String(form.get(key) ?? '')

type IconName = 'settings' | 'utensils' | 'dumbbell' | 'scale' | 'plus' | 'x' | 'search' | 'archive' | 'check' | 'trash' | 'edit' | 'download' | 'upload' | 'chevron' | 'calendar' | 'activity'

const iconPaths: Record<IconName, string> = {
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  dumbbell: '<path d="M14.4 14.4 9.6 9.6M18.7 21.3l2.6-2.6M2.7 5.3l2.6-2.6M21.3 18.7l-3.4-3.4M8.7 6.1 5.3 2.7M16 16l-4 4-8-8 4-4M20 12l-8-8-4 4 8 8Z"/>',
  scale: '<path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0ZM7 21h10M12 3v18M3 7h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m18 6-12 12M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  archive: '<path d="M3 6h18M5 6v14h14V6M8 3h8l2 3H6l2-3Z"/><path d="M9 11h6"/>',
  check: '<path d="m20 6-11 11-5-5"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>', upload: '<path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>', calendar: '<path d="M3 5h18v16H3zM16 3v4M8 3v4M3 10h18"/>',
  activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
}

function icon(name: IconName, size = 20): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`
}

function formatHeaderDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`)
  const today = getLocalDateString()
  const prefix = dateString === today ? '今天 · ' : ''
  const monthDay = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date)
  return `${prefix}${monthDay} · ${weekday}`
}

function formatElapsed(startedAt: string, finishedAt?: string): string {
  const elapsed = Math.max(0, new Date(finishedAt ?? Date.now()).getTime() - new Date(startedAt).getTime())
  const seconds = Math.floor(elapsed / 1000)
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((value) => String(value).padStart(2, '0')).join(':')
}

function formatBackupTime(value: string | null): string {
  if (!value) return '尚未备份'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未备份'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

function setupMobileViewport(): void {
  const viewport = window.visualViewport
  if (!viewport) return
  const update = () => {
    const keyboardOpen = viewport.height < window.innerHeight - 120
    document.body.classList.toggle('keyboard-open', keyboardOpen)
    document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`)
  }
  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  document.addEventListener('focusin', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
    window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 180)
  })
  update()
}

function toast(message: string, tone: 'normal' | 'error' = 'normal'): void {
  document.querySelector('.toast')?.remove()
  const element = document.createElement('div')
  element.className = `toast ${tone === 'error' ? 'toast-error' : ''}`
  element.innerHTML = `${icon(tone === 'error' ? 'x' : 'check', 18)}<span>${esc(message)}</span>`
  element.setAttribute('role', 'status')
  document.body.append(element)
  window.setTimeout(() => element.remove(), 1900)
}

function fail(error: unknown): void {
  toast(error instanceof Error ? error.message : '操作失败，请重试', 'error')
}

function openModal(title: string, body: string, wide = false): HTMLDialogElement {
  document.querySelector('dialog')?.remove()
  const dialog = document.createElement('dialog')
  dialog.className = wide ? 'sheet sheet-wide' : 'sheet'
  dialog.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn quiet" data-close aria-label="关闭">${icon('x')}</button></div><div class="modal-body">${body}</div>`
  document.body.append(dialog)
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close() })
  dialog.addEventListener('close', () => dialog.remove())
  dialog.showModal()
  return dialog
}

function confirmAction(title: string, message: string, confirmLabel = '确认删除', danger = true): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'confirm-dialog'
    dialog.innerHTML = `<div class="confirm-mark ${danger ? 'danger-mark' : ''}">${icon(danger ? 'trash' : 'check', 24)}</div><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dialog-actions"><button data-cancel>取消</button><button class="${danger ? 'danger-solid' : 'primary'}" data-confirm>${esc(confirmLabel)}</button></div>`
    document.body.append(dialog)
    let result = false
    dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close())
    dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { result = true; dialog.close() })
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result) }, { once: true })
    dialog.showModal()
  })
}

async function render(): Promise<void> {
  weightChart?.destroy()
  window.clearInterval(workoutClockTimer)
  document.body.classList.remove('immersive')
  const title = showCalendar ? '日历总览' : activeTab === 'food' ? '饮食' : activeTab === 'workout' ? '训练' : '体重'
  const subtitle = showCalendar ? `${calendarYear}年${calendarMonth + 1}月` : activeTab === 'food' ? formatHeaderDate(foodDate) : activeTab === 'workout' ? formatHeaderDate(workoutDate) : formatHeaderDate(getLocalDateString())
  app.innerHTML = `
    <div class="app-frame">
      <header class="topbar"><div><h1>${title}</h1><p class="header-date">${subtitle}</p></div><div class="topbar-actions"><button class="icon-btn settings-btn ${showCalendar ? 'active' : ''}" id="calendar-toggle" aria-label="${showCalendar ? '关闭日历总览' : '打开日历总览'}">${icon(showCalendar ? 'x' : 'calendar', 21)}</button><button class="icon-btn settings-btn" id="settings" aria-label="数据与设置">${icon('settings', 21)}</button></div></header>
      <main id="view" aria-live="polite"></main>
      <nav class="bottom-nav" aria-label="主导航">
        <button data-tab="food" class="${activeTab === 'food' ? 'active' : ''}" aria-current="${activeTab === 'food' ? 'page' : 'false'}">${icon('utensils', 21)}<span>饮食</span></button>
        <button data-tab="workout" class="${activeTab === 'workout' ? 'active' : ''}" aria-current="${activeTab === 'workout' ? 'page' : 'false'}">${icon('dumbbell', 21)}<span>训练</span></button>
        <button data-tab="weight" class="${activeTab === 'weight' ? 'active' : ''}" aria-current="${activeTab === 'weight' ? 'page' : 'false'}">${icon('scale', 21)}<span>体重</span></button>
      </nav>
    </div>`
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab as Tab
    showCalendar = false
    void render()
  }))
  document.querySelector('#calendar-toggle')?.addEventListener('click', () => { showCalendar = !showCalendar; void render() })
  document.querySelector('#settings')?.addEventListener('click', () => void showSettings())
  if (showCalendar) { await renderCalendarOverview(); return }
  if (activeTab === 'food') await renderFoodPage()
  if (activeTab === 'workout') await renderWorkoutPage()
  if (activeTab === 'weight') await renderWeightPage()
}

async function renderCalendarOverview(): Promise<void> {
  const summaries = await loadMonthSummaries(calendarYear, calendarMonth)
  const recordedDays = [...summaries.values()].length
  const workoutDays = [...summaries.values()].filter((summary) => summary.hasWorkout).length
  const totalCalories = [...summaries.values()].reduce((total, summary) => total + (summary.calories ?? 0), 0)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="calendar-overview-head"><button class="icon-btn quiet calendar-prev" id="calendar-prev" aria-label="上个月">${icon('chevron', 20)}</button><div><strong>${calendarYear}年 ${calendarMonth + 1}月</strong><button class="text-btn" id="calendar-today">回到今天</button></div><button class="icon-btn quiet" id="calendar-next" aria-label="下个月">${icon('chevron', 20)}</button></section><div id="calendar-host"></div><section class="calendar-legend" aria-label="日历标记说明"><span><i class="legend-calories"></i>热量</span><span><i class="legend-workout"></i>训练</span><span><i class="legend-weight"></i>体重</span></section><section class="calendar-month-summary"><div><strong>${recordedDays}</strong><span>有记录天数</span></div><div><strong>${workoutDays}</strong><span>训练天数</span></div><div><strong>${formatNumber(totalCalories)}</strong><span>本月 kcal</span></div></section>`
  const host = view.querySelector<HTMLElement>('#calendar-host')!
  host.append(renderMonthCalendar({
    year: calendarYear,
    month: calendarMonth,
    selectedDate: calendarSelectedDate,
    summaries,
    onDateClick: (date) => void handleCalendarDateClick(date, summaries.get(date)),
  }))
  view.querySelector('#calendar-prev')?.addEventListener('click', () => { shiftCalendarMonth(-1); void render() })
  view.querySelector('#calendar-next')?.addEventListener('click', () => { shiftCalendarMonth(1); void render() })
  view.querySelector('#calendar-today')?.addEventListener('click', () => {
    const today = new Date()
    calendarYear = today.getFullYear(); calendarMonth = today.getMonth(); calendarSelectedDate = getLocalDateString(today); void render()
  })
}

function shiftCalendarMonth(offset: number): void {
  const next = new Date(calendarYear, calendarMonth + offset, 1)
  calendarYear = next.getFullYear()
  calendarMonth = next.getMonth()
}

async function handleCalendarDateClick(date: string, summary?: CalendarDaySummary): Promise<void> {
  calendarSelectedDate = date
  const selected = new Date(`${date}T12:00:00`)
  if (selected.getFullYear() !== calendarYear || selected.getMonth() !== calendarMonth) {
    calendarYear = selected.getFullYear()
    calendarMonth = selected.getMonth()
    const summaries = await loadMonthSummaries(calendarYear, calendarMonth)
    await render()
    showCalendarDaySheet(date, summaries.get(date))
    return
  }
  document.querySelectorAll('.calendar-day.selected').forEach((element) => { element.classList.remove('selected'); element.removeAttribute('aria-selected') })
  const selectedButton = document.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${date}"]`)
  selectedButton?.classList.add('selected')
  selectedButton?.setAttribute('aria-selected', 'true')
  showCalendarDaySheet(date, summary)
}

function showCalendarDaySheet(date: string, summary?: CalendarDaySummary): void {
  const calories = summary?.calories === undefined ? '未记录' : `${formatNumber(summary.calories)} kcal`
  const workout = summary?.hasWorkout ? `${summary.workoutCount} 次 · ${summary.setCount} 组` : '未训练'
  const weight = summary?.weightKg === undefined ? '未记录' : `${formatNumber(summary.weightKg)} kg`
  const dialog = openModal(formatHeaderDate(date), `<div class="calendar-day-sheet"><div><span>饮食热量</span><strong>${calories}</strong></div><div><span>训练</span><strong>${workout}</strong></div><div><span>体重</span><strong>${weight}</strong></div></div><div class="calendar-day-actions"><button id="calendar-day-food">${icon('utensils', 18)} 饮食</button><button id="calendar-day-workout">${icon('dumbbell', 18)} 训练</button><button id="calendar-day-weight">${icon('scale', 18)} 体重</button></div>`)
  dialog.querySelector('#calendar-day-food')?.addEventListener('click', () => { dialog.close(); showCalendar = false; activeTab = 'food'; foodDate = date; void render() })
  dialog.querySelector('#calendar-day-workout')?.addEventListener('click', () => { dialog.close(); showCalendar = false; activeTab = 'workout'; workoutDate = date; currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = false; void render() })
  dialog.querySelector('#calendar-day-weight')?.addEventListener('click', () => { dialog.close(); showWeightForm(date, summary?.weightKg) })
}

async function renderFoodPage(): Promise<void> {
  const logs = await db.foodLogs.where('date').equals(foodDate).sortBy('createdAt')
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.totalCalories,
    protein: sum.protein + (log.totalProtein ?? 0), carbs: sum.carbs + (log.totalCarbs ?? 0), fat: sum.fat + (log.totalFat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const hasMacros = logs.some((log) => log.totalProtein !== undefined || log.totalCarbs !== undefined || log.totalFat !== undefined)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `
    <section class="context-row"><label class="date-control">${icon('calendar', 17)}<span>记录日期</span><input id="food-date" type="date" value="${foodDate}" aria-label="饮食记录日期"></label><button class="text-btn" id="food-library">食物库 ${icon('chevron', 16)}</button></section>
    <section class="nutrition-hero" aria-label="今日营养汇总"><div class="hero-number"><strong>${formatNumber(totals.calories)}</strong><span>kcal</span></div><div class="macros ${hasMacros ? '' : 'is-empty'}"><span><b>P</b>${formatNumber(totals.protein)}g</span><span><b>C</b>${formatNumber(totals.carbs)}g</span><span><b>F</b>${formatNumber(totals.fat)}g</span></div></section>
    <section class="section-head"><div><h2>今日饮食</h2><span>${logs.length ? `${logs.length} 项记录` : '还没有记录'}</span></div><button class="icon-btn add-button" id="add-food-log" aria-label="添加食物">${icon('plus')}</button></section>
    <div class="food-list">${logs.length ? logs.map((log) => `<article class="food-row"><button class="food-row-main" data-edit-log="${log.id}" aria-label="编辑 ${esc(log.foodName)}"><span><strong>${esc(log.foodName)}</strong><small>${log.brand ? `${esc(log.brand)} · ` : ''}${formatNumber(log.grams)} g</small></span><span class="food-kcal"><strong>${formatNumber(log.totalCalories)}</strong><small>kcal</small></span></button><button class="icon-btn row-delete" data-delete-log="${log.id}" aria-label="删除 ${esc(log.foodName)}">${icon('trash', 17)}</button></article>`).join('') : `<div class="empty minimal"><div class="empty-icon">${icon('utensils', 25)}</div><h3>今天还没有记录饮食</h3><p>添加第一份食物，营养汇总会自动更新。</p><button class="primary" id="empty-add-food">${icon('plus', 18)} 添加第一份食物</button></div>`}</div>`
  view.querySelector<HTMLInputElement>('#food-date')?.addEventListener('change', (event) => { foodDate = (event.target as HTMLInputElement).value; void render() })
  view.querySelector('#food-library')?.addEventListener('click', () => void showFoodLibrary())
  view.querySelector('#add-food-log')?.addEventListener('click', () => void showAddFoodLog())
  view.querySelector('#empty-add-food')?.addEventListener('click', () => void showAddFoodLog())
  view.querySelectorAll<HTMLButtonElement>('[data-delete-log]').forEach((button) => button.addEventListener('click', async () => {
    if (!await confirmAction('删除饮食记录？', '删除后无法撤销，但不会影响食物库。')) return
    await db.foodLogs.delete(button.dataset.deleteLog!); toast('已删除'); await renderFoodPage()
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-edit-log]').forEach((button) => button.addEventListener('click', async () => {
    const log = await db.foodLogs.get(button.dataset.editLog!)
    if (!log) return
    const dialog = openModal('编辑克数', `<form id="edit-log-form" class="form"><label>实际重量<input name="grams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${log.grams}" required><span>g</span></label><button class="primary" type="submit">保存</button></form>`)
    dialog.querySelector<HTMLFormElement>('#edit-log-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); try { await updateFoodLogGrams(log.id, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'grams')); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
    })
  }))
}

async function showAddFoodLog(): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  const dialog = openModal('添加食物', foods.length ? `<div class="form"><label class="search-field"><span class="sr-only">搜索食物</span>${icon('search', 19)}<input id="food-search" type="search" placeholder="搜索食物或品牌" autocomplete="off"></label><div id="food-results" class="picker-list"></div><button class="sheet-link" id="create-food-from-picker">${icon('plus', 18)} 新建食物</button></div>` : `<div class="empty compact minimal"><div class="empty-icon">${icon('archive', 24)}</div><h3>食物库还是空的</h3><p>先创建一种食物。</p><button class="primary" id="create-first-food">${icon('plus', 18)} 新建食物</button></div>`, true)
  if (!foods.length) {
    dialog.querySelector('#create-first-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
    return
  }
  dialog.querySelector('#create-food-from-picker')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
  const results = dialog.querySelector<HTMLDivElement>('#food-results')!
  const draw = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase()
    const matches = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized)).slice(0, 100)
    results.innerHTML = matches.map((food) => `<button class="picker-item" data-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}</span><em>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</em></button>`).join('') || '<p class="muted">没有匹配的食物</p>'
    results.querySelectorAll<HTMLButtonElement>('[data-food]').forEach((button) => button.addEventListener('click', () => {
      const food = foods.find((item) => item.id === button.dataset.food)!
      dialog.querySelector('.modal-head h2')!.textContent = food.name
      dialog.querySelector('.modal-body')!.innerHTML = `<form id="log-food-form" class="form quantity-form"><div class="selected-food"><span>每 ${formatNumber(food.referenceGrams)}g</span><strong>${formatNumber(food.calories)} kcal</strong></div><label class="quantity-label">吃了多少？<span class="quantity-input"><input name="grams" id="grams" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="230" required autofocus><b>g</b></span></label><div class="preview-number"><span>预计热量</span><strong id="kcal-preview">— kcal</strong></div><button class="primary" type="submit">添加</button></form>`
      const input = dialog.querySelector<HTMLInputElement>('#grams')!
      input.addEventListener('input', () => {
        const grams = Number(input.value)
        dialog.querySelector('#kcal-preview')!.textContent = Number.isFinite(grams) && grams > 0 ? `${formatNumber(calculateNutrition(food, grams).calories)} kcal` : '— kcal'
      })
      dialog.querySelector<HTMLFormElement>('#log-food-form')?.addEventListener('submit', async (event) => {
        event.preventDefault(); try { await logFood(food, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'grams'), foodDate); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
      })
    }))
  }
  draw()
  dialog.querySelector<HTMLInputElement>('#food-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
}

async function showFoodLibrary(query = ''): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  const filtered = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const dialog = openModal('食物库', `<div class="toolbar"><label class="search-field"><span class="sr-only">搜索食物库</span>${icon('search', 19)}<input id="library-search" type="search" value="${esc(query)}" placeholder="搜索食物"></label><button class="icon-btn add-button" id="new-food" aria-label="新建食物">${icon('plus')}</button></div><div class="import-actions"><button id="import-csv">${icon('upload', 17)} CSV</button><button id="import-json">${icon('upload', 17)} JSON</button><input id="import-file" type="file" hidden></div><div class="library-list">${filtered.length ? filtered.map((food) => `<article><button class="library-main" data-edit-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}<p>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</p></span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-food="${food.id}" aria-label="删除 ${esc(food.name)}">${icon('trash', 17)}</button></article>`).join('') : '<p class="muted padded">没有匹配的食物</p>'}</div>`, true)
  dialog.querySelector<HTMLInputElement>('#library-search')?.addEventListener('change', (event) => { dialog.close(); void showFoodLibrary((event.target as HTMLInputElement).value) })
  dialog.querySelector('#new-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.editFood); dialog.close(); void showFoodForm(food) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-food]').forEach((button) => button.addEventListener('click', async () => {
    if (!await confirmAction('删除这个食物？', '历史饮食记录会保留，此操作不会改变过去的营养数据。')) return
    await db.foods.delete(button.dataset.deleteFood!); dialog.close(); toast('已删除'); void showFoodLibrary(query)
  }))
  const fileInput = dialog.querySelector<HTMLInputElement>('#import-file')!
  dialog.querySelector('#import-csv')?.addEventListener('click', () => { fileInput.accept = '.csv,text/csv'; fileInput.click() })
  dialog.querySelector('#import-json')?.addEventListener('click', () => { fileInput.accept = '.json,application/json'; fileInput.click() })
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return
    try {
      const text = await file.text()
      const isCsv = file.name.toLocaleLowerCase().endsWith('.csv')
      const csvResult = isCsv ? parseFoodCsv(text) : undefined
      const rows = csvResult?.rows ?? parseFoodJson(text)
      const preview = buildImportPreview(rows, foods)
      if (csvResult) preview.errors.push(...csvResult.parseErrors)
      dialog.close(); showImportPreview(preview, foods)
    } catch (error) { fail(error) }
  })
}

function foodFields(food?: Food): string {
  return `<form id="food-form" class="form grid-form"><label class="full">食物名称 *<input name="name" value="${esc(food?.name)}" placeholder="鸡胸肉" required></label><label class="full">品牌<input name="brand" value="${esc(food?.brand)}" placeholder="可选"></label><label>基准重量 *<input name="referenceGrams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${food?.referenceGrams ?? 100}" required><span>g</span></label><label>热量 *<input name="calories" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.calories ?? ''}" placeholder="165" required><span>kcal</span></label><label>蛋白质<input name="protein" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.protein ?? ''}"><span>g</span></label><label>碳水<input name="carbs" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.carbs ?? ''}"><span>g</span></label><label>脂肪<input name="fat" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.fat ?? ''}"><span>g</span></label><button class="primary full" type="submit">保存食物</button></form>`
}

async function showFoodForm(food?: Food): Promise<void> {
  const dialog = openModal(food ? '编辑食物' : '新建食物', foodFields(food))
  dialog.querySelector<HTMLFormElement>('#food-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement)
    try {
      await saveFood({ name: valueOf(data, 'name'), brand: valueOf(data, 'brand'), referenceGrams: Number(valueOf(data, 'referenceGrams')), calories: Number(valueOf(data, 'calories')), protein: valueOf(data, 'protein') as unknown as number, carbs: valueOf(data, 'carbs') as unknown as number, fat: valueOf(data, 'fat') as unknown as number }, food?.id)
      dialog.close(); toast('已保存'); await renderFoodPage(); void showFoodLibrary()
    } catch (error) { fail(error) }
  })
}

function showImportPreview(preview: ImportPreview, existing: Food[]): void {
  const duplicateSet = new Set(preview.duplicateIndexes)
  const dialog = openModal('导入预览', `<div class="import-summary"><div><strong>${preview.valid.length - preview.duplicateIndexes.length}</strong><span>有效</span></div><div><strong>${preview.errors.length}</strong><span>错误</span></div><div><strong>${preview.duplicateIndexes.length}</strong><span>重复</span></div></div>${preview.errors.length ? `<details><summary>查看错误行</summary><ul class="error-list">${preview.errors.map((error) => `<li>第 ${error.row} 行：${esc(error.reason)}</li>`).join('')}</ul></details>` : ''}<div class="form"><fieldset><legend>重复项处理</legend><label class="radio"><input type="radio" name="duplicate" value="skip" checked>跳过重复项</label><label class="radio"><input type="radio" name="duplicate" value="overwrite">覆盖已有食物</label></fieldset><button class="primary" id="confirm-import" ${preview.valid.length ? '' : 'disabled'}>确认导入</button></div>`)
  dialog.querySelector('#confirm-import')?.addEventListener('click', async () => {
    const mode = dialog.querySelector<HTMLInputElement>('input[name="duplicate"]:checked')!.value
    try {
      let imported = 0; let skipped = 0
      const keyOf = (item: Pick<Food, 'name' | 'brand'>) => `${item.name.trim().toLocaleLowerCase()}\u0000${(item.brand ?? '').trim().toLocaleLowerCase()}`
      const resolved = new Map(existing.map((item) => [keyOf(item), item]))
      await db.transaction('rw', db.foods, async () => {
        for (const [index, input] of preview.valid.entries()) {
          const key = keyOf(input)
          if (duplicateSet.has(index)) {
            if (mode === 'skip') { skipped += 1; continue }
            const match = resolved.get(key)
            if (match) { const value = validateFoodInput(input); const updated = { ...match, ...value, updatedAt: new Date().toISOString() }; await db.foods.put(updated); resolved.set(key, updated); imported += 1; continue }
          }
          const now = new Date().toISOString(); const created = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; await db.foods.add(created); resolved.set(key, created); imported += 1
        }
      })
      dialog.close(); toast(`成功导入 ${imported} 条，跳过 ${skipped} 条。`); void showFoodLibrary()
    } catch (error) { fail(error) }
  })
}

async function renderWorkoutPage(): Promise<void> {
  if (showWorkoutHistory) { await renderWorkoutHistory(); return }
  if (workoutEditorOpen) {
    if (!currentWorkout) currentWorkout = await findOpenWorkout(workoutDate)
    if (currentWorkout) { renderWorkoutEditor(currentWorkout); return }
    workoutEditorOpen = false
  }
  const openWorkout = await findOpenWorkout(workoutDate)
  const todayWorkouts = await db.workouts.where('date').equals(workoutDate).toArray()
  const recentWorkouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)).slice(0, 4)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="context-row"><label class="date-control">${icon('calendar', 17)}<span>训练日期</span><input id="workout-date" type="date" value="${workoutDate}" aria-label="训练日期"></label><button class="text-btn" id="exercise-library">动作库 ${icon('chevron', 16)}</button></section><div class="empty workout-empty minimal"><div class="empty-icon">${icon('dumbbell', 27)}</div><h2>${openWorkout ? '训练还在进行中' : todayWorkouts.length ? '这一天的训练已完成' : '今天还没有训练'}</h2><p>${openWorkout ? '上次输入已自动保存，可以随时继续。' : '重量、次数和 RPE 会在输入后自动保存。'}</p><button class="primary start-button" id="start-workout">${openWorkout ? icon('activity', 18) + ' 继续训练' : icon('plus', 18) + ' 开始训练'}</button></div><section class="section-head"><div><h2>最近训练</h2><span>${recentWorkouts.length ? '轻触查看详情' : '完成训练后会显示在这里'}</span></div>${recentWorkouts.length ? '<button class="text-btn" id="history-workout">全部</button>' : ''}</section><div class="history-list">${recentWorkouts.map((workout) => `<button class="history-row" data-workout="${workout.id}"><span><strong>${formatShortDate(workout.date)}</strong><small>${workout.exercises.map((item) => esc(item.exerciseName)).slice(0, 2).join(' · ') || '无动作'}</small></span><span class="history-count">${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span>${icon('chevron', 17)}</button>`).join('')}</div>`
  view.querySelector<HTMLInputElement>('#workout-date')?.addEventListener('change', (event) => { workoutDate = (event.target as HTMLInputElement).value; currentWorkout = undefined; workoutEditorOpen = false; void render() })
  view.querySelector('#exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#start-workout')?.addEventListener('click', async () => { currentWorkout = openWorkout ?? await createWorkout(workoutDate); workoutEditorOpen = true; await renderWorkoutPage() })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; void renderWorkoutPage() })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { currentWorkout = await db.workouts.get(button.dataset.workout!); workoutEditorOpen = true; await renderWorkoutPage() }))
}

function renderWorkoutEditor(workout: Workout): void {
  const completed = Boolean(workout.finishedAt)
  document.body.classList.add('immersive')
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<header class="active-workout-head"><button class="icon-btn quiet" id="exit-workout" aria-label="返回训练首页">${icon('x')}</button><div><strong>${completed ? '训练详情' : '训练中'}</strong><span id="workout-clock">${formatElapsed(workout.startedAt, workout.finishedAt)}</span></div>${completed ? '<span class="head-spacer"></span>' : '<button class="finish-text" id="finish-workout">完成</button>'}</header><section class="workout-meta"><span>${formatHeaderDate(workout.date)}</span><span id="autosave-state">${completed ? '可编辑' : '已自动保存'}</span></section><div id="workout-exercises">${workout.exercises.length ? workout.exercises.map(workoutExerciseHtml).join('') : `<div class="empty compact minimal"><div class="empty-icon">${icon('dumbbell', 24)}</div><h3>还没有动作</h3><p>添加第一个动作开始记录。</p></div>`}</div><button id="add-exercise" class="secondary full-btn">${icon('plus', 18)} 添加动作</button><label class="note-field">训练备注<textarea id="workout-note" rows="2" placeholder="可选">${esc(workout.note)}</textarea></label><div class="action-stack">${completed ? '<button id="back-history" class="primary">返回历史</button><button id="delete-workout" class="danger-button">删除训练</button>' : '<button id="history-workout">查看历史训练</button>'}</div>`
  if (!completed) workoutClockTimer = window.setInterval(() => { const clock = document.querySelector('#workout-clock'); if (clock) clock.textContent = formatElapsed(workout.startedAt) }, 1000)
  bindWorkoutEditor(workout)
}

function workoutExerciseHtml(exercise: WorkoutExercise): string {
  return `<article class="exercise-card" data-workout-exercise="${exercise.id}"><div class="exercise-head"><h3>${esc(exercise.exerciseName)}</h3><button class="icon-btn quiet danger" data-remove-exercise="${exercise.id}" aria-label="移除 ${esc(exercise.exerciseName)}">${icon('trash', 17)}</button></div><div class="sets"><div class="set-header"><span>组</span><span>重量 <small>kg</small></span><span>次数</span><span>RPE</span><span></span></div>${exercise.sets.map((set, index) => `<div class="set-row" data-set="${set.id}"><span>${index + 1}</span><input aria-label="第${index + 1}组重量" data-field="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg ?? ''}" placeholder="—"><input aria-label="第${index + 1}组次数" data-field="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}" placeholder="—"><input aria-label="第${index + 1}组RPE" data-field="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="${set.rpe ?? ''}" placeholder="—"><button aria-label="删除第${index + 1}组" class="icon-btn quiet danger" data-remove-set="${set.id}">${icon('x', 17)}</button><input class="set-note" aria-label="第${index + 1}组备注" data-field="note" placeholder="本组备注（可选）" value="${esc(set.note)}"></div>`).join('')}</div><button class="text-btn add-set" data-add-set="${exercise.id}">${icon('plus', 17)} 添加一组</button></article>`
}

function bindWorkoutEditor(workout: Workout): void {
  const view = document.querySelector<HTMLElement>('#view')!
  view.querySelector('#exit-workout')?.addEventListener('click', async () => { await saveWorkout(workout); currentWorkout = undefined; workoutEditorOpen = false; document.body.classList.remove('immersive'); await render() })
  view.querySelector('#add-exercise')?.addEventListener('click', () => void showExercisePicker(workout))
  view.querySelector<HTMLTextAreaElement>('#workout-note')?.addEventListener('input', (event) => { workout.note = (event.target as HTMLTextAreaElement).value.trim() || undefined; scheduleWorkoutSave(workout) })
  view.querySelectorAll<HTMLButtonElement>('[data-add-set]').forEach((button) => button.addEventListener('click', () => {
    const exercise = workout.exercises.find((item) => item.id === button.dataset.addSet)!
    const previous = exercise.sets.at(-1)
    exercise.sets.push({ id: crypto.randomUUID(), weightKg: previous?.weightKg, reps: previous?.reps ?? 0 })
    renderWorkoutEditor(workout)
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-remove-set]').forEach((button) => button.addEventListener('click', () => {
    const parent = button.closest<HTMLElement>('[data-workout-exercise]')!
    const exercise = workout.exercises.find((item) => item.id === parent.dataset.workoutExercise)!
    exercise.sets = exercise.sets.filter((set) => set.id !== button.dataset.removeSet); scheduleWorkoutSave(workout); renderWorkoutEditor(workout)
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-remove-exercise]').forEach((button) => button.addEventListener('click', () => {
    workout.exercises = workout.exercises.filter((item) => item.id !== button.dataset.removeExercise); scheduleWorkoutSave(workout); renderWorkoutEditor(workout)
  }))
  view.querySelectorAll<HTMLInputElement>('[data-set] input').forEach((input) => input.addEventListener('input', () => {
    const exerciseElement = input.closest<HTMLElement>('[data-workout-exercise]')!
    const setElement = input.closest<HTMLElement>('[data-set]')!
    const exercise = workout.exercises.find((item) => item.id === exerciseElement.dataset.workoutExercise)!
    const set = exercise.sets.find((item) => item.id === setElement.dataset.set)!
    const field = input.dataset.field as keyof WorkoutSet
    if (field === 'note') set.note = input.value.trim() || undefined
    else if (field === 'reps') set.reps = input.value === '' ? 0 : Number(input.value)
    else if (field === 'weightKg') set.weightKg = input.value === '' ? undefined : Number(input.value)
    else if (field === 'rpe') set.rpe = input.value === '' ? undefined : Number(input.value)
    scheduleWorkoutSave(workout)
  }))
  view.querySelector('#finish-workout')?.addEventListener('click', async () => {
    try {
      workout.exercises.forEach((exercise) => exercise.sets.forEach((set) => validateWorkoutSet(set)))
      if (!workout.exercises.length) throw new Error('请至少添加一个动作')
      if (!await confirmAction('完成本次训练？', '完成后仍可从历史训练中查看和编辑。', '完成训练', false)) return
      workout.finishedAt = new Date().toISOString(); await saveWorkout(workout); currentWorkout = undefined; showWorkoutHistory = true; toast('训练已完成'); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; currentWorkout = undefined; void renderWorkoutPage() })
  view.querySelector('#back-history')?.addEventListener('click', async () => { await saveWorkout(workout); currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = true; await renderWorkoutPage() })
  view.querySelector('#delete-workout')?.addEventListener('click', async () => { if (!await confirmAction('删除整次训练？', '所有动作和组记录都会被删除，此操作无法撤销。')) return; await db.workouts.delete(workout.id); currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = true; toast('已删除'); await renderWorkoutPage() })
}

function scheduleWorkoutSave(workout: Workout): void {
  const state = document.querySelector('#autosave-state')
  if (state) state.textContent = '正在保存…'
  window.clearTimeout(workoutSaveTimer)
  workoutSaveTimer = window.setTimeout(async () => {
    const valid = workout.exercises.every((exercise) => exercise.sets.every((set) => set.reps >= 1 && Number.isInteger(set.reps) && (set.weightKg === undefined || set.weightKg >= 0) && (set.rpe === undefined || (set.rpe >= 1 && set.rpe <= 10))))
    if (!valid) { if (state) state.textContent = '请完善组数'; return }
    try { await saveWorkout(workout); if (state) state.textContent = '已自动保存' } catch (error) { fail(error); if (state) state.textContent = '保存失败' }
  }, 400)
}

async function showExercisePicker(workout: Workout): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  const dialog = openModal('添加动作', `<div class="form"><label class="search-field"><span class="sr-only">搜索动作</span>${icon('search', 19)}<input id="exercise-search" type="search" placeholder="搜索动作"></label><div id="exercise-results" class="picker-list"></div><button class="sheet-link" id="quick-exercise">${icon('plus', 18)} 创建新动作</button></div>`, true)
  const draw = (query = '') => {
    const matches = exercises.filter((item) => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    dialog.querySelector('#exercise-results')!.innerHTML = matches.map((exercise) => `<button class="picker-item" data-exercise="${exercise.id}"><strong>${esc(exercise.name)}</strong></button>`).join('') || '<p class="muted">没有匹配动作</p>'
    dialog.querySelectorAll<HTMLButtonElement>('[data-exercise]').forEach((button) => button.addEventListener('click', () => {
      const exercise = exercises.find((item) => item.id === button.dataset.exercise)!
      workout.exercises.push({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [] })
      dialog.close(); scheduleWorkoutSave(workout); renderWorkoutEditor(workout)
    }))
  }
  draw()
  dialog.querySelector<HTMLInputElement>('#exercise-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector('#quick-exercise')?.addEventListener('click', () => { dialog.close(); void showExerciseForm(undefined, async (exercise) => { workout.exercises.push({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [] }); scheduleWorkoutSave(workout); renderWorkoutEditor(workout) }) })
}

async function showExerciseLibrary(): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  const dialog = openModal('动作库', `<button class="primary full-btn" id="new-exercise">${icon('plus', 18)} 新建动作</button><div class="library-list">${exercises.map((exercise) => `<article><button class="library-main" data-edit-exercise="${exercise.id}"><span><strong>${esc(exercise.name)}</strong>${exercise.notes ? `<p>${esc(exercise.notes)}</p>` : ''}</span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-exercise="${exercise.id}" aria-label="删除 ${esc(exercise.name)}">${icon('trash', 17)}</button></article>`).join('')}</div>`, true)
  dialog.querySelector('#new-exercise')?.addEventListener('click', () => { dialog.close(); void showExerciseForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-exercise]').forEach((button) => button.addEventListener('click', () => { dialog.close(); void showExerciseForm(exercises.find((item) => item.id === button.dataset.editExercise)) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-exercise]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除这个动作？', '历史训练会保留，此操作不会改变过去的训练记录。')) return; await db.exercises.delete(button.dataset.deleteExercise!); dialog.close(); toast('已删除'); void showExerciseLibrary() }))
}

async function showExerciseForm(exercise?: Exercise, afterSave?: (value: Exercise) => void | Promise<void>): Promise<void> {
  const dialog = openModal(exercise ? '编辑动作' : '新建动作', `<form id="exercise-form" class="form"><label>动作名称 *<input name="name" value="${esc(exercise?.name)}" placeholder="杠铃卧推" required></label><label>备注<textarea name="notes" rows="3" placeholder="可选">${esc(exercise?.notes)}</textarea></label><button class="primary" type="submit">保存动作</button></form>`)
  dialog.querySelector<HTMLFormElement>('#exercise-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); try { const saved = await saveExercise(valueOf(data, 'name'), valueOf(data, 'notes'), exercise?.id); dialog.close(); toast('已保存'); if (afterSave) await afterSave(saved); else void showExerciseLibrary() } catch (error) { fail(error) } })
}

async function renderWorkoutHistory(): Promise<void> {
  document.body.classList.remove('immersive')
  const workouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<div class="section-head history-head"><div><h2>历史训练</h2><span>${workouts.length} 次训练</span></div><button class="text-btn" id="close-history">返回</button></div><div class="history-list">${workouts.length ? workouts.map((workout) => `<button class="history-card" data-workout="${workout.id}"><div class="history-card-title"><strong>${formatShortDate(workout.date)}</strong><span>${workout.exercises.length} 个动作 · ${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span></div><div class="history-details">${workout.exercises.map((item) => `<div><strong>${esc(item.exerciseName)}</strong><small>${item.sets.map((set) => `${formatNumber(set.weightKg ?? 0)}kg × ${set.reps}`).join(' · ') || '暂无组数'}</small></div>`).join('')}</div>${icon('chevron', 17)}</button>`).join('') : `<div class="empty minimal"><div class="empty-icon">${icon('activity', 24)}</div><h3>还没有训练历史</h3></div>`}</div>`
  view.querySelector('#close-history')?.addEventListener('click', () => { showWorkoutHistory = false; void renderWorkoutPage() })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { currentWorkout = await db.workouts.get(button.dataset.workout!); workoutEditorOpen = true; showWorkoutHistory = false; await renderWorkoutPage() }))
}

async function renderWeightPage(): Promise<void> {
  const today = getLocalDateString()
  const todayWeight = await db.weights.where('date').equals(today).first()
  const weights = await db.weights.orderBy('date').reverse().toArray()
  const latest = weights[0]
  const cutoffDays = weightRange === 'all' ? Number.POSITIVE_INFINITY : Number(weightRange)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - cutoffDays + 1)
  const cutoffString = getLocalDateString(cutoff)
  const chartWeights = weights.filter((item) => weightRange === 'all' || item.date >= cutoffString).reverse()
  const monthCutoff = new Date(); monthCutoff.setDate(monthCutoff.getDate() - 29)
  const monthWeights = weights.filter((item) => item.date >= getLocalDateString(monthCutoff))
  const delta = monthWeights.length > 1 && latest ? latest.weightKg - monthWeights.at(-1)!.weightKg : undefined
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="weight-hero"><p>${latest ? '最新体重' : '体重记录'}</p>${latest ? `<div class="hero-number"><strong>${formatNumber(latest.weightKg)}</strong><span>kg</span></div><span class="weight-change">${delta === undefined ? '记录更多数据后显示 30 天变化' : `${delta > 0 ? '+' : ''}${formatNumber(delta)} kg · 30天`}</span>` : `<div class="empty-inline">还没有体重记录</div>`}<button class="primary record-weight" id="record-weight">${icon(todayWeight ? 'edit' : 'plus', 18)} ${todayWeight ? '修改今日体重' : '记录体重'}</button></section><section class="chart-card"><div class="section-head"><div><h2>趋势</h2><span>${weightRange === 'all' ? '全部记录' : `最近 ${weightRange} 天`}</span></div></div>${chartWeights.length ? '<div class="chart-wrap"><canvas id="weight-chart"></canvas></div>' : `<div class="empty compact minimal"><div class="empty-icon">${icon('activity', 23)}</div><p>记录体重后会显示趋势图。</p></div>`}<div class="segmented" aria-label="体重图表范围"><button data-range="30" class="${weightRange === '30' ? 'active' : ''}">30天</button><button data-range="90" class="${weightRange === '90' ? 'active' : ''}">90天</button><button data-range="all" class="${weightRange === 'all' ? 'active' : ''}">全部</button></div></section><section class="section-head"><div><h2>历史记录</h2><span>${weights.length} 条</span></div></section><div class="weight-list">${weights.map((item) => `<article class="weight-row"><button data-edit-weight="${item.id}"><span>${formatShortDate(item.date)}</span><strong>${formatNumber(item.weightKg)} <small>kg</small></strong></button><button class="icon-btn row-delete" data-delete-weight="${item.id}" aria-label="删除 ${formatShortDate(item.date)} 的体重">${icon('trash', 17)}</button></article>`).join('') || `<div class="empty minimal"><div class="empty-icon">${icon('scale', 24)}</div><h3>还没有体重记录</h3><p>记录第一次体重，开始观察长期趋势。</p></div>`}</div>`
  view.querySelector('#record-weight')?.addEventListener('click', () => showWeightForm(today, todayWeight?.weightKg))
  view.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((button) => button.addEventListener('click', () => { weightRange = button.dataset.range as typeof weightRange; void renderWeightPage() }))
  view.querySelectorAll<HTMLButtonElement>('[data-delete-weight]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除体重记录？', '删除后无法撤销。')) return; await db.weights.delete(button.dataset.deleteWeight!); toast('已删除'); await renderWeightPage() }))
  view.querySelectorAll<HTMLButtonElement>('[data-edit-weight]').forEach((button) => button.addEventListener('click', () => { const item = weights.find((weight) => weight.id === button.dataset.editWeight)!; showWeightForm(item.date, item.weightKg) }))
  if (chartWeights.length) {
    const canvas = view.querySelector<HTMLCanvasElement>('#weight-chart')!
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--accent').trim()
    const muted = styles.getPropertyValue('--text-secondary').trim()
    const grid = styles.getPropertyValue('--divider').trim()
    weightChart = new Chart(canvas, { type: 'line', data: { labels: chartWeights.map((item) => formatShortDate(item.date)), datasets: [{ data: chartWeights.map((item) => item.weightKg), borderColor: accent, backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 2.3, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: accent }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 180 }, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5 } }, y: { border: { display: false }, ticks: { color: muted, callback: (value) => `${value}kg`, maxTicksLimit: 5 }, grid: { color: grid } } } } })
  }
}

function showWeightForm(date: string, value?: number): void {
  const title = value === undefined ? date === getLocalDateString() ? '今日体重' : '记录体重' : '编辑体重'
  const dialog = openModal(title, `<form id="weight-sheet-form" class="form weight-sheet-form"><p>${formatHeaderDate(date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${value ?? ''}" placeholder="72.4" required autofocus><b>kg</b></label><button class="primary" type="submit">保存</button></form>`)
  dialog.querySelector<HTMLFormElement>('#weight-sheet-form')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await upsertWeight(date, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'weight')); dialog.close(); toast('已保存'); await renderWeightPage() } catch (error) { fail(error) } })
}

async function showSettings(): Promise<void> {
  let persistText = '浏览器不支持'
  try { if (navigator.storage?.persist) persistText = await navigator.storage.persist() ? '已授权' : '未授权' } catch { persistText = '未授权' }
  const lastBackup = formatBackupTime(localStorage.getItem(LAST_BACKUP_KEY))
  const dialog = openModal('设置', `<section class="settings-section"><h3>数据</h3><div class="settings-group"><button id="export-backup"><span class="setting-icon">${icon('download', 18)}</span><span><strong>导出完整备份</strong><small>上次导出：<b id="last-backup">${esc(lastBackup)}</b></small></span>${icon('chevron', 17)}</button><button id="restore-backup"><span class="setting-icon">${icon('upload', 18)}</span><span><strong>恢复完整备份</strong><small>从 JSON 备份覆盖当前数据</small></span>${icon('chevron', 17)}</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div></section><section class="settings-section"><h3>存储</h3><div class="data-safety"><div class="setting-icon">${icon('archive', 18)}</div><div><strong>数据保存在当前设备。清除 Safari 网站数据或更换设备前，请先导出备份。</strong><p>IndexedDB · 持久化存储：${persistText}</p></div></div></section><section class="settings-section"><h3>关于</h3><div class="settings-group static"><div><span class="setting-icon">${icon('activity', 18)}</span><span><strong>FitLog Lite</strong><small>本地优先的健身记录</small></span></div></div></section>`)
  dialog.querySelector('#export-backup')?.addEventListener('click', async () => { try { const backup = await exportBackup(); const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fitlog-backup-${getLocalDateString()}.json`; link.click(); URL.revokeObjectURL(link.href); const exportedAt = new Date().toISOString(); localStorage.setItem(LAST_BACKUP_KEY, exportedAt); const label = dialog.querySelector('#last-backup'); if (label) label.textContent = formatBackupTime(exportedAt); toast('备份已导出') } catch (error) { fail(error) } })
  const fileInput = dialog.querySelector<HTMLInputElement>('#backup-file')!
  dialog.querySelector('#restore-backup')?.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; try { const backup = validateBackup(JSON.parse(await file.text())); dialog.close(); showRestorePreview(backup) } catch (error) { fail(error) } })
}

function showRestorePreview(backup: BackupData): void {
  const counts = [{ label: '食物', count: backup.data.foods.length }, { label: '饮食记录', count: backup.data.foodLogs.length }, { label: '动作', count: backup.data.exercises.length }, { label: '训练', count: backup.data.workouts.length }, { label: '体重', count: backup.data.weights.length }]
  const dialog = openModal('确认恢复备份', `<div class="restore-counts">${counts.map((item) => `<p><span>${item.label}</span><strong>${item.count}</strong></p>`).join('')}</div><div class="warning">恢复将清除当前所有数据，并替换为该备份。</div><button class="danger-button full-btn" id="confirm-restore">继续恢复</button>`)
  dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => { if (!await confirmAction('覆盖当前全部数据？', '恢复会清除当前数据并替换为备份内容，此操作无法撤销。', '恢复备份')) return; try { await restoreBackup(backup); dialog.close(); currentWorkout = undefined; workoutEditorOpen = false; toast('恢复完成'); await render() } catch (error) { fail(error) } })
}

async function start(): Promise<void> {
  setupMobileViewport()
  try { await db.open(); await seedExercises(); await render() } catch (error) { app.innerHTML = `<div class="fatal"><h1>无法打开 FitLog Lite</h1><p>${esc(error instanceof Error ? error.message : '请刷新后重试')}</p></div>` }
}

void start()
