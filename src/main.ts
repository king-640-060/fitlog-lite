import './styles/main.css'
import { Chart, registerables } from 'chart.js'
import { registerSW } from 'virtual:pwa-register'
import { db } from './db/database'
import type { BackupDataV3, DietTemplate, Exercise, Food, FoodLog, MealType, NutritionGoal, NutritionTarget, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate, WorkoutTemplateExercise } from './db/types'
import { exportBackup, restoreBackup, validateBackup } from './services/backupService'
import { clearDayRecords } from './services/dayRecordsService'
import { logFood, saveFood, updateFoodLogDetails, validateFoodInput } from './services/foodService'
import { buildImportPreview, parseFoodCsv, parseFoodJson, type ImportPreview } from './services/importService'
import { upsertWeight } from './services/weightService'
import { deleteNutritionTarget, normalizeNutritionGoal, saveNutritionTarget } from './services/nutritionTargetService'
import { deletePelvicFloorSession, pelvicFloorSessionDurationSeconds, savePelvicFloorSession, sessionFromPelvicFloorTimer } from './services/pelvicFloorService'
import { extendRestTimer, getRestRemainingMs, pauseRestTimer, resumeRestTimer, startRestTimer, type RestTimerState } from './services/restTimer'
import {
  advancePelvicFloorTimer, createPelvicFloorTimer, finishPelvicFloorTimer, getPelvicFloorPhaseProgress, getPelvicFloorRemainingSeconds,
  pausePelvicFloorTimer, resumePelvicFloorTimer, startPelvicFloorTimer, type PelvicFloorTimerState,
} from './services/pelvicFloorTimer'
import { createWorkout, findOpenWorkout, finishWorkout, normalizeWorkoutForSave, saveExercise, saveWorkout, WorkoutAutosaveController } from './services/workoutService'
import {
  NutritionTargetConflictError, applyDietTemplate, dietTemplateFromLogs, dietTemplateItemFromFood, duplicateDietTemplate, duplicateWorkoutTemplate,
  resolveDietTemplateFoods, saveDietTemplate, saveWorkoutTemplate,
  sortTemplates, startWorkoutFromTemplate, workoutTemplateFromWorkout,
} from './services/templateService'
import { hasDayRecords, loadMonthSummaries, renderMonthCalendar, type CalendarDaySummary } from './ui/calendarPage'
import { getGoalProgress } from './ui/progressRing'
import { groupFoodLogs, isMealType, mealNames, mealTypes, type FoodMealGroup } from './utils/foodMeals'
import { formatShortDate, getLocalDateString } from './utils/date'
import { calculateNutrition, formatNumber } from './utils/nutrition'

Chart.register(...registerables)
registerSW({ immediate: true })

type Tab = 'today' | 'food' | 'workout' | 'progress' | 'more'
type ProgressView = 'overview' | 'trend' | 'calendar'
let activeTab: Tab = 'today'
let progressView: ProgressView = 'overview'
let calendarSelectedDate = getLocalDateString()
let calendarYear = new Date().getFullYear()
let calendarMonth = new Date().getMonth()
let foodDate = getLocalDateString()
let foodMenuEvents: AbortController | undefined
let workoutDate = getLocalDateString()
let weightDate = getLocalDateString()
let currentWorkout: Workout | undefined
let workoutEditorOpen = false
let showWorkoutHistory = false
let weightRange: '30' | '90' | 'all' = '30'
let weightChart: Chart | undefined
let workoutClockTimer: number | undefined
let workoutRestState: RestTimerState | undefined
let workoutRestWorkoutId: string | undefined
let workoutRestInterval: number | undefined
let justFinishedWorkout: Workout | undefined
let pelvicTimerState: PelvicFloorTimerState | undefined
let pelvicTimerDate = getLocalDateString()
let pelvicTimerInterval: number | undefined
let pelvicSessionSaving = false
let pelvicAudioContext: AudioContext | undefined
let pelvicWakeLock: { release: () => Promise<void> } | undefined
const LAST_BACKUP_KEY = 'fitlog-last-backup-at'

const app = document.querySelector<HTMLDivElement>('#app')!
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
const valueOf = (form: FormData, key: string): string => String(form.get(key) ?? '')

type IconName = 'home' | 'settings' | 'utensils' | 'dumbbell' | 'scale' | 'plus' | 'x' | 'search' | 'archive' | 'check' | 'trash' | 'edit' | 'download' | 'upload' | 'chevron' | 'calendar' | 'activity' | 'trend' | 'more' | 'leaf' | 'info'

const iconPaths: Record<IconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
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
  trend: '<path d="M3 18 9 12l4 4 8-9"/><path d="M15 7h6v6"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M20 4C12 4 6 8 6 14c0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M4 21c2-5 6-9 12-12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
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

function shiftLocalDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return getLocalDateString(new Date(year!, month! - 1, day! + days, 12))
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

  type EditableControl = HTMLInputElement | HTMLTextAreaElement
  const isEditableControl = (value: Element | null): value is EditableControl => (
    value instanceof HTMLInputElement || value instanceof HTMLTextAreaElement
  )

  const update = () => {
    const keyboardOpen = isEditableControl(document.activeElement) && viewport.height < window.innerHeight - 120
    const keyboardOverlap = keyboardOpen ? Math.max(0, window.innerHeight - viewport.height) : 0
    document.body.classList.toggle('keyboard-open', keyboardOpen)
    document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`)
    document.documentElement.style.setProperty('--keyboard-overlap', `${keyboardOverlap}px`)
  }
  viewport.addEventListener('resize', update)
  document.addEventListener('focusin', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (!isEditableControl(target)) return
    update()
  })
  document.addEventListener('focusout', () => {
    window.requestAnimationFrame(() => {
      if (isEditableControl(document.activeElement)) return
      update()
    })
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

const workoutAutosave = new WorkoutAutosaveController(
  (workout) => saveWorkout(workout),
  400,
  (state, error) => {
    const element = document.querySelector('#autosave-state')
    if (state === 'pending' && element) element.textContent = '等待保存…'
    if (state === 'saving' && element) element.textContent = '正在保存…'
    if (state === 'saved' && element) element.textContent = '已自动保存'
    if (state === 'error' && element) element.textContent = error instanceof Error ? error.message : '保存失败'
    if (state === 'error' && !(error instanceof Error && error.message === '请填写次数或删除未完成的组')) fail(error)
  },
)

async function flushWorkoutAutosave(workout?: Workout): Promise<void> {
  await workoutAutosave.flush(workout)
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

function confirmAction(title: string, message: string, confirmLabel = '确认删除', danger = true, cancelLabel = '取消'): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'confirm-dialog'
    dialog.innerHTML = `<div class="confirm-mark ${danger ? 'danger-mark' : ''}">${icon(danger ? 'trash' : 'check', 24)}</div><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dialog-actions"><button data-cancel>${esc(cancelLabel)}</button><button class="${danger ? 'danger-solid' : 'primary'}" data-confirm>${esc(confirmLabel)}</button></div>`
    document.body.append(dialog)
    let result = false
    dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close())
    dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { result = true; dialog.close() })
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result) }, { once: true })
    dialog.showModal()
  })
}

function chooseNutritionTargetConflict(): Promise<'preserve' | 'replace' | undefined> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'confirm-dialog'
    dialog.innerHTML = `<div class="confirm-mark">${icon('activity', 24)}</div><h2>这一天已经有营养目标</h2><p>添加食物记录时，要保留现有目标，还是使用模板中的目标？</p><div class="dialog-actions"><button data-choice="preserve">保留现有目标</button><button class="primary" data-choice="replace">使用模板目标</button></div>`
    document.body.append(dialog)
    let choice: 'preserve' | 'replace' | undefined
    dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => button.addEventListener('click', () => { choice = button.dataset.choice as 'preserve' | 'replace'; dialog.close() }))
    dialog.addEventListener('close', () => { dialog.remove(); resolve(choice) }, { once: true })
    dialog.showModal()
  })
}

async function render(): Promise<void> {
  foodMenuEvents?.abort()
  weightChart?.destroy()
  weightChart = undefined
  window.clearInterval(workoutClockTimer)
  clearWorkoutRestTimer()
  document.body.classList.remove('immersive')
  const today = getLocalDateString()
  const hour = new Date().getHours()
  const title = activeTab === 'today' ? (hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好') : activeTab === 'food' ? '饮食' : activeTab === 'workout' ? '训练' : activeTab === 'progress' ? '进度' : '更多'
  const subtitle = activeTab === 'today' ? `${formatHeaderDate(today).replace('今天 · ', '')} · 今天也继续保持` : activeTab === 'food' ? formatHeaderDate(foodDate) : activeTab === 'workout' ? formatHeaderDate(workoutDate) : activeTab === 'progress' ? '看见每一次积累' : '管理你的记录与应用'
  app.innerHTML = `
    <div class="app-frame">
      <header class="topbar${activeTab === 'today' ? ' today-topbar' : activeTab === 'food' ? ' food-topbar' : ''}"><div><h1>${title}</h1><p class="header-date">${subtitle}</p></div>${activeTab === 'food' ? `<div class="food-header-actions"><button class="food-library-link" id="food-library">食物库</button><details class="food-tools-menu"><summary aria-label="饮食更多操作" title="更多操作">${icon('more', 20)}</summary><div class="food-tools-panel"><button id="use-diet-template">使用模板</button><label class="food-menu-date">选择日期<input id="food-date" type="date" value="${foodDate}" aria-label="选择饮食记录日期"></label><button id="save-day-diet-template" hidden>保存为模板</button></div></details></div>` : activeTab === 'today' ? `<span class="brand-mark today-brand" aria-hidden="true">${icon('leaf', 19)}</span>` : activeTab === 'progress' ? `<span class="brand-mark subtle" aria-hidden="true">${icon('leaf', 19)}</span>` : ''}</header>
      <main id="view" class="${activeTab === 'today' ? 'today-dashboard' : ''}" aria-live="polite"></main>
      <nav class="bottom-nav" aria-label="主导航">
        <button data-tab="today" class="${activeTab === 'today' ? 'active' : ''}" aria-current="${activeTab === 'today' ? 'page' : 'false'}">${icon('home', 21)}<span>今日</span></button>
        <button data-tab="food" class="${activeTab === 'food' ? 'active' : ''}" aria-current="${activeTab === 'food' ? 'page' : 'false'}">${icon('utensils', 21)}<span>饮食</span></button>
        <button data-tab="workout" class="${activeTab === 'workout' ? 'active' : ''}" aria-current="${activeTab === 'workout' ? 'page' : 'false'}">${icon('dumbbell', 21)}<span>训练</span></button>
        <button data-tab="progress" class="${activeTab === 'progress' ? 'active' : ''}" aria-current="${activeTab === 'progress' ? 'page' : 'false'}">${icon('trend', 21)}<span>进度</span></button>
        <button data-tab="more" class="${activeTab === 'more' ? 'active' : ''}" aria-current="${activeTab === 'more' ? 'page' : 'false'}">${icon('more', 21)}<span>更多</span></button>
      </nav>
    </div>`
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab as Tab
    void render().catch(fail)
  }))
  if (activeTab === 'food') {
    const menu = app.querySelector<HTMLDetailsElement>('.food-tools-menu')!
    foodMenuEvents = new AbortController()
    const signal = foodMenuEvents.signal
    document.addEventListener('pointerdown', (event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false
    }, { signal })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')?.focus() }
    }, { signal })
  }
  if (activeTab === 'today') await renderTodayPage()
  if (activeTab === 'food') await renderFoodPage()
  if (activeTab === 'workout') await renderWorkoutPage()
  if (activeTab === 'progress') await renderProgressPage()
  if (activeTab === 'more') await renderMorePage()
}

function miniTrendSvg(values: number[]): string {
  if (!values.length) return ''
  const width = 280
  const height = 70
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const points = values.map((value, index) => `${values.length === 1 ? width / 2 : index / (values.length - 1) * width},${height - 8 - (value - min) / spread * (height - 16)}`).join(' ')
  return `<svg class="mini-trend" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="近期体重趋势"><polyline points="${points}"/></svg>`
}

async function renderTodayPage(): Promise<void> {
  const today = getLocalDateString()
  const [logs, target, workouts, pelvicSessions, weights] = await Promise.all([
    db.foodLogs.where('date').equals(today).toArray(),
    db.nutritionTargets.where('date').equals(today).first(),
    db.workouts.where('date').equals(today).toArray(),
    db.pelvicFloorSessions.where('date').equals(today).toArray(),
    db.weights.orderBy('date').reverse().toArray(),
  ])
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.totalCalories,
    protein: sum.protein + (log.totalProtein ?? 0),
    carbs: sum.carbs + (log.totalCarbs ?? 0),
    fat: sum.fat + (log.totalFat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const openWorkout = workouts.find((workout) => !workout.finishedAt)
  const finishedWorkouts = workouts.filter((workout) => workout.finishedAt)
  const latestWeight = weights[0]
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29)
  const recentWeights = weights.filter((item) => item.date >= getLocalDateString(cutoff)).reverse()
  const weightDelta = latestWeight && recentWeights.length > 1 ? latestWeight.weightKg - recentWeights[0]!.weightKg : undefined
  const pelvicSeconds = pelvicSessions.reduce((total, session) => total + pelvicFloorSessionDurationSeconds(session), 0)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `
    <section class="today-card nutrition-today-card"><div class="card-heading"><div><span class="card-icon nutrition-icon">${icon('utensils', 19)}</span><h2>今日饮食</h2></div><button class="text-btn" id="today-food-details">查看详情 ${icon('chevron', 15)}</button></div><div class="today-calorie-layout">${ringSvgHtml(totals.calories, target?.calories, 'tiny')}<div class="today-calorie-copy"><strong>${formatNumber(totals.calories)} <small>kcal</small></strong><span class="today-goal-note${target?.calories === undefined ? ' is-unset' : ''}">${target?.calories === undefined ? '尚未设置目标' : `目标 ${formatNumber(target.calories)} kcal · ${goalStatusText(totals.calories, target.calories, 'kcal')}`}</span></div></div><div class="today-macros"><div class="protein"><span>蛋白质</span><strong>${formatNumber(totals.protein)}${target?.protein === undefined ? 'g' : ` / ${formatNumber(target.protein)}g`}</strong></div><div class="carbs"><span>碳水</span><strong>${formatNumber(totals.carbs)}${target?.carbs === undefined ? 'g' : ` / ${formatNumber(target.carbs)}g`}</strong></div><div class="fat"><span>脂肪</span><strong>${formatNumber(totals.fat)}${target?.fat === undefined ? 'g' : ` / ${formatNumber(target.fat)}g`}</strong></div></div></section>
    <section class="today-card workout-today-card"><div class="card-heading"><div><span class="card-icon workout-icon">${icon('dumbbell', 19)}</span><h2>今日训练</h2></div></div><div class="today-workout-status">${workouts.length ? ringSvgHtml(finishedWorkouts.length, workouts.length, 'tiny') : ''}<div class="today-card-copy"><strong>${openWorkout ? '训练正在进行' : finishedWorkouts.length ? '今天的训练已完成' : '今天还没有训练'}</strong><span>${workouts.length ? `${finishedWorkouts.length} / ${workouts.length} 次训练已完成 · ${workouts.reduce((sum, item) => sum + item.exercises.length, 0)} 个动作` : '从模板开始，或创建空白训练'}</span></div></div><button class="primary full-btn" id="today-workout">${openWorkout ? '继续训练' : '开始训练'}</button></section>
    <section class="today-card weight-today-card"><div class="card-heading"><div><span class="card-icon weight-icon">${icon('scale', 19)}</span><h2>体重趋势</h2></div><button class="text-btn" id="today-weight-details">查看趋势 ${icon('chevron', 15)}</button></div>${latestWeight ? `<div class="weight-today-value"><strong>${formatNumber(latestWeight.weightKg)}</strong><span>kg</span><small>${weightDelta === undefined ? '记录更多数据后显示变化' : `${weightDelta > 0 ? '↑' : weightDelta < 0 ? '↓' : '—'} ${formatNumber(Math.abs(weightDelta))} kg · 近 30 天`}</small></div>${recentWeights.length > 1 ? miniTrendSvg(recentWeights.map((item) => item.weightKg)) : ''}` : '<div class="today-weight-empty"><div class="today-card-copy"><strong>暂无体重记录</strong><span>记录第一次体重，开始观察趋势</span></div><button class="secondary" id="today-record-weight">记录体重</button></div>'}</section>
    <section class="today-card pelvic-today-card"><div class="today-habit-copy"><div class="card-heading"><div><span class="card-icon pelvic-icon">${icon('leaf', 19)}</span><h2>凯格尔训练</h2></div></div><div class="today-card-copy"><strong>${pelvicSessions.length ? `今天已完成 ${pelvicSessions.length} 次` : '今日尚未完成'}</strong><span>${pelvicSessions.length ? `累计 ${pelvicSeconds} 秒` : '约 5–10 分钟 · 保持自然呼吸'}</span></div></div><button class="secondary" id="today-pelvic">开始训练</button></section>`
  animateNutritionRings(view)
  view.querySelector('#today-food-details')?.addEventListener('click', () => { activeTab = 'food'; foodDate = today; void render().catch(fail) })
  view.querySelector('#today-workout')?.addEventListener('click', () => { activeTab = 'workout'; workoutDate = today; currentWorkout = openWorkout; workoutEditorOpen = Boolean(openWorkout); void render().catch(fail) })
  view.querySelector('#today-weight-details')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; void render().catch(fail) })
  view.querySelector('#today-record-weight')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; weightDate = today; void render().then(() => showWeightForm(today)).catch(fail) })
  view.querySelector('#today-pelvic')?.addEventListener('click', () => { workoutDate = today; showPelvicFloorSetup() })
}

function progressTabsHtml(): string {
  return `<div class="page-tabs" role="tablist" aria-label="进度视图"><button role="tab" data-progress-view="overview" class="${progressView === 'overview' ? 'active' : ''}" aria-selected="${progressView === 'overview'}">概览</button><button role="tab" data-progress-view="trend" class="${progressView === 'trend' ? 'active' : ''}" aria-selected="${progressView === 'trend'}">趋势</button><button role="tab" data-progress-view="calendar" class="${progressView === 'calendar' ? 'active' : ''}" aria-selected="${progressView === 'calendar'}">日历</button></div>`
}

function bindProgressTabs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('[data-progress-view]').forEach((button) => button.addEventListener('click', () => {
    progressView = button.dataset.progressView as ProgressView
    void render().catch(fail)
  }))
}

async function renderProgressPage(): Promise<void> {
  if (progressView === 'trend') { await renderWeightPage(true); return }
  if (progressView === 'calendar') { await renderCalendarOverview(true); return }
  const now = new Date()
  const summaries = await loadMonthSummaries(now.getFullYear(), now.getMonth())
  const monthValues = [...summaries.values()]
  const weights = await db.weights.orderBy('date').reverse().toArray()
  const latest = weights[0]
  const monthWeights = monthValues.filter((summary) => summary.weightKg !== undefined)
  const workouts = monthValues.reduce((total, summary) => total + summary.workoutCount, 0)
  const foodDays = monthValues.filter((summary) => summary.foodLogCount > 0).length
  const pelvicSessions = monthValues.reduce((total, summary) => total + summary.pelvicFloorSessionCount, 0)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `${progressTabsHtml()}<section class="progress-hero today-card"><div class="card-heading"><div><span class="card-icon weight-icon">${icon('trend', 19)}</span><h2>体重趋势</h2></div><button class="text-btn" data-open-trend>查看详情 ${icon('chevron', 15)}</button></div>${latest ? `<div class="weight-today-value"><strong>${formatNumber(latest.weightKg)}</strong><span>kg</span><small>最近记录 · ${formatShortDate(latest.date)}</small></div>${weights.length > 1 ? miniTrendSvg(weights.slice(0, 12).reverse().map((item) => item.weightKg)) : ''}` : '<div class="today-card-copy"><strong>暂无体重记录</strong><span>记录后将在这里显示趋势</span></div>'}</section><section><div class="section-head"><div><h2>本月概览</h2><span>${now.getMonth() + 1} 月的记录</span></div></div><div class="stat-grid"><article><span class="stat-icon workout-icon">${icon('dumbbell', 18)}</span><strong data-count-integer data-count-from="0" data-count-to="${workouts}">0</strong><small>力量训练</small></article><article><span class="stat-icon nutrition-icon">${icon('utensils', 18)}</span><strong data-count-integer data-count-from="0" data-count-to="${foodDays}">0</strong><small>饮食记录天数</small></article><article><span class="stat-icon pelvic-icon">${icon('leaf', 18)}</span><strong data-count-integer data-count-from="0" data-count-to="${pelvicSessions}">0</strong><small>凯格尔训练</small></article><article><span class="stat-icon weight-icon">${icon('scale', 18)}</span><strong data-count-integer data-count-from="0" data-count-to="${monthWeights.length}">0</strong><small>体重记录</small></article></div></section>`
  animateNutritionNumber(view, 420)
  bindProgressTabs(view)
  view.querySelector('[data-open-trend]')?.addEventListener('click', () => { progressView = 'trend'; void render().catch(fail) })
}

async function renderMorePage(): Promise<void> {
  const view = document.querySelector<HTMLElement>('#view')!
  const row = (id: string, iconName: IconName, title: string, detail: string) => `<button id="${id}"><span class="setting-icon">${icon(iconName, 18)}</span><span><strong>${title}</strong><small>${detail}</small></span>${icon('chevron', 17)}</button>`
  view.innerHTML = `<section class="settings-section"><h3>数据管理</h3><div class="settings-group">${row('more-food-library', 'utensils', '食物库', '管理食物与营养数据')}${row('more-exercise-library', 'dumbbell', '动作库', '管理力量训练动作')}${row('more-workout-templates', 'activity', '训练模板', '快速创建常用训练')}${row('more-diet-templates', 'archive', '饮食模板', '保存常用食物组合')}</div></section><section class="settings-section"><h3>训练</h3><div class="settings-group">${row('more-pelvic', 'leaf', '凯格尔训练', '开始计时或查看历史')}</div></section><section class="settings-section"><h3>数据</h3><div class="settings-group">${row('more-import', 'upload', '导入数据', '从表格或数据文件导入食物')}${row('more-backup', 'download', '备份与恢复', '导出或恢复完整本地数据')}</div></section><section class="settings-section"><h3>应用</h3><div class="settings-group">${row('more-about', 'info', '应用信息', 'FitLog Lite · 本地优先')}</div></section><div class="data-safety"><div class="setting-icon">${icon('archive', 18)}</div><div><strong>你的数据只保存在当前设备</strong><p>清除浏览器数据或更换设备前，请先导出完整备份。</p></div></div>`
  view.querySelector('#more-food-library')?.addEventListener('click', () => void showFoodLibrary())
  view.querySelector('#more-exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#more-workout-templates')?.addEventListener('click', () => void showWorkoutTemplateManager())
  view.querySelector('#more-diet-templates')?.addEventListener('click', () => void showDietTemplateManager())
  view.querySelector('#more-pelvic')?.addEventListener('click', () => {
    const dialog = openModal('凯格尔训练', `<div class="action-stack"><button class="primary" id="more-start-pelvic">开始训练</button><button class="secondary" id="more-pelvic-history">查看训练记录</button></div>`)
    dialog.querySelector('#more-start-pelvic')?.addEventListener('click', () => { dialog.close(); workoutDate = getLocalDateString(); showPelvicFloorSetup() })
    dialog.querySelector('#more-pelvic-history')?.addEventListener('click', () => { dialog.close(); void showPelvicFloorHistory() })
  })
  view.querySelector('#more-import')?.addEventListener('click', () => void showFoodLibrary())
  view.querySelector('#more-backup')?.addEventListener('click', () => void showSettings().catch(fail))
  view.querySelector('#more-about')?.addEventListener('click', () => { openModal('应用信息', `<div class="about-card"><span class="brand-mark large">${icon('leaf', 30)}</span><h2>FitLog Lite</h2><p>一款轻盈、安静的本地个人健康记录工具。</p><small>饮食 · 力量训练 · 体重 · 凯格尔训练</small></div>`) })
}

async function renderCalendarOverview(withProgressTabs = false): Promise<void> {
  const summaries = await loadMonthSummaries(calendarYear, calendarMonth)
  const recordedDays = [...summaries.values()].filter(hasDayRecords).length
  const workoutCount = [...summaries.values()].reduce((total, summary) => total + summary.workoutCount, 0)
  const pelvicCount = [...summaries.values()].reduce((total, summary) => total + summary.pelvicFloorSessionCount, 0)
  const calorieDays = [...summaries.values()].filter((summary) => summary.foodLogCount > 0)
  const targetDays = calorieDays.filter((summary) => summary.nutritionTarget?.calories !== undefined)
  const averageCalories = calorieDays.length ? calorieDays.reduce((total, summary) => total + (summary.calories ?? 0), 0) / calorieDays.length : 0
  const achievedDays = targetDays.filter((summary) => (summary.calories ?? 0) <= summary.nutritionTarget!.calories!).length
  const nutritionSummary = targetDays.length ? `${achievedDays} / ${targetDays.length}` : formatNumber(averageCalories)
  const nutritionLabel = targetDays.length ? '热量目标内' : '平均 kcal'
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `${withProgressTabs ? progressTabsHtml() : ''}<section class="calendar-overview-head"><button class="icon-btn quiet calendar-prev" id="calendar-prev" aria-label="上个月">${icon('chevron', 20)}</button><div><strong>${calendarYear}年 ${calendarMonth + 1}月</strong><button class="text-btn" id="calendar-today">回到今天</button></div><button class="icon-btn quiet" id="calendar-next" aria-label="下个月">${icon('chevron', 20)}</button></section><div id="calendar-host"></div><section class="calendar-legend" aria-label="日历标记说明"><span><i class="nutrition-marker">${icon('utensils', 10)}</i>饮食</span><span><i class="workout-marker">${icon('dumbbell', 10)}</i>力量</span><span><i class="pelvic-marker">${icon('leaf', 10)}</i>凯格尔</span><span><i class="weight-marker">${icon('scale', 10)}</i>体重</span></section><section class="calendar-month-summary"><div><strong>${recordedDays}</strong><span>有记录天数</span></div><div><strong>${workoutCount}</strong><span>力量训练</span></div><div><strong>${pelvicCount}</strong><span>凯格尔训练</span></div><div><strong>${nutritionSummary}</strong><span>${nutritionLabel}</span></div></section>`
  if (withProgressTabs) bindProgressTabs(view)
  const host = view.querySelector<HTMLElement>('#calendar-host')!
  host.append(renderMonthCalendar({
    year: calendarYear,
    month: calendarMonth,
    selectedDate: calendarSelectedDate,
    summaries,
    onDateClick: (date) => void handleCalendarDateClick(date, summaries.get(date)),
  }))
  view.querySelector('#calendar-prev')?.addEventListener('click', () => { shiftCalendarMonth(-1); void render().catch(fail) })
  view.querySelector('#calendar-next')?.addEventListener('click', () => { shiftCalendarMonth(1); void render().catch(fail) })
  view.querySelector('#calendar-today')?.addEventListener('click', () => {
    const today = new Date()
    calendarYear = today.getFullYear(); calendarMonth = today.getMonth(); calendarSelectedDate = getLocalDateString(today); void render().catch(fail)
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
  const target = summary?.nutritionTarget
  const nutritionRow = (label: string, actual: number | undefined, goal: number | undefined, unit: string) => {
    if (actual === undefined && goal === undefined) return ''
    const value = goal === undefined ? `${formatNumber(actual ?? 0)} ${unit}` : `${formatNumber(actual ?? 0)} / ${formatNumber(goal)} ${unit}`
    const width = goal === undefined ? 0 : goal === 0 ? ((actual ?? 0) > 0 ? 100 : 0) : Math.min(100, Math.max(0, ((actual ?? 0) / goal) * 100))
    return `<div class="calendar-nutrition-row"><span>${label}</span><strong>${value}</strong>${goal === undefined ? '' : `<i class="nutrition-progress"><b style="width:${width}%"></b></i>`}</div>`
  }
  const nutrition = [
    nutritionRow('热量', summary?.calories, target?.calories, 'kcal'),
    nutritionRow('蛋白质', summary?.protein, target?.protein, 'g'),
    nutritionRow('碳水', summary?.carbs, target?.carbs, 'g'),
    nutritionRow('脂肪', summary?.fat, target?.fat, 'g'),
  ].join('') || '<p class="muted">未记录饮食或营养目标</p>'
  const workout = summary?.hasWorkout ? `${summary.workoutCount} 次 · ${summary.setCount} 组` : '未训练'
  const pelvic = summary?.pelvicFloorSessionCount ? `${summary.pelvicFloorSessionCount} 次 · ${summary.pelvicFloorContractions} 次收缩 · ${summary.pelvicFloorSeconds} 秒` : '未训练'
  const weight = summary?.weightKg === undefined ? '未记录' : `${formatNumber(summary.weightKg)} kg`
  const canClear = hasDayRecords(summary) || Boolean(target)
  const dialog = openModal(formatHeaderDate(date), `<div class="calendar-day-sheet"><section><h3>饮食</h3>${nutrition}</section><div><span>力量训练</span><strong>${workout}</strong></div><div><span>凯格尔训练</span><strong>${pelvic}</strong></div><div><span>体重</span><strong>${weight}</strong></div></div><div class="calendar-day-actions"><button id="calendar-day-food">${icon('utensils', 18)} 饮食</button><button id="calendar-day-workout">${icon('dumbbell', 18)} 训练</button><button id="calendar-day-weight">${icon('scale', 18)} 体重</button></div>${canClear ? '<div class="calendar-day-danger"><button id="calendar-clear-day" class="danger-button">清空当天记录</button></div>' : ''}`)
  dialog.querySelector('#calendar-day-food')?.addEventListener('click', () => { dialog.close(); activeTab = 'food'; foodDate = date; void render().catch(fail) })
  dialog.querySelector('#calendar-day-workout')?.addEventListener('click', () => { dialog.close(); activeTab = 'workout'; workoutDate = date; currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = false; void render().catch(fail) })
  dialog.querySelector('#calendar-day-weight')?.addEventListener('click', () => {
    dialog.close(); activeTab = 'progress'; progressView = 'trend'; weightDate = date
    void render().then(() => showWeightForm(date, summary?.weightKg)).catch(fail)
  })
  dialog.querySelector('#calendar-clear-day')?.addEventListener('click', async () => {
    const day = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
    if (!await confirmAction(`清空 ${day} 的所有记录？`, '将删除当天的饮食记录、营养目标、力量训练、凯格尔训练和体重记录。删除后无法恢复。', '清空当天记录')) return
    try {
      await clearDayRecords(date)
      dialog.close()
      toast('当天记录已清空')
      await render()
    } catch (error) { fail(error) }
  })
}

interface PreviousRingValue { actual: number; goal?: number }

function ringSvgHtml(actual: number, goal: number | undefined, size: 'large' | 'small' | 'tiny', previous?: PreviousRingValue): string {
  const progress = getGoalProgress(actual, goal)
  const before = previous ? getGoalProgress(previous.actual, previous.goal) : getGoalProgress(0, goal)
  const mainLength = 2 * Math.PI * 40
  const outerLength = 2 * Math.PI * 49
  const mainStart = mainLength * (1 - before.main)
  const outerStart = outerLength * (1 - before.outer)
  const crossed = previous && before.main < 1 && progress.main === 1 ? ' goal-crossed' : ''
  return `<svg class="goal-ring ${size} ${progress.state}${crossed}" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="40"/><circle class="ring-main" cx="60" cy="60" r="40" stroke-dasharray="${mainLength}" stroke-dashoffset="${mainStart}" data-final-offset="${mainLength * (1 - progress.main)}"/><circle class="ring-outer-track" cx="60" cy="60" r="49"/><circle class="ring-outer" cx="60" cy="60" r="49" stroke-dasharray="${outerLength}" stroke-dashoffset="${outerStart}" data-final-offset="${outerLength * (1 - progress.outer)}"/></svg>`
}

function goalStatusText(actual: number, goal: number | undefined, unit: string): string {
  const progress = getGoalProgress(actual, goal)
  if (progress.state === 'unset') return '尚未设置目标'
  if (progress.state === 'zero') return '目标为 0'
  if (progress.state === 'reached') return '已达目标'
  if (progress.state === 'above') return `高于目标 ${formatNumber(progress.excess)} ${unit}`
  return `${Math.round(progress.main * 100)}%`
}

function nutritionMetricHtml(key: string, label: string, actual: number, target: number | undefined, previous?: PreviousRingValue): string {
  const progress = getGoalProgress(actual, target)
  const amount = target === undefined ? `${formatNumber(actual)}g` : `${formatNumber(actual)} / ${formatNumber(target)}g`
  const status = progress.state === 'above' ? `<small class="metric-excess">+${formatNumber(progress.excess)}g</small>` : progress.state === 'reached' ? '<small>已达目标</small>' : progress.state === 'unset' ? '<small>未设目标</small>' : ''
  return `<span class="nutrition-metric ${key}" data-progress-key="${key}" data-actual="${actual}" ${target === undefined ? '' : `data-goal="${target}"`} aria-label="${label} ${amount} ${goalStatusText(actual, target, 'g')}"><b>${label}</b>${ringSvgHtml(actual, target, 'small', previous)}<span class="macro-value" aria-hidden="true"><span data-count-from="${previous?.actual ?? 0}" data-count-to="${actual}">${formatNumber(previous?.actual ?? 0)}</span>${target === undefined ? 'g' : ` / ${formatNumber(target)}g`}</span>${status}</span>`
}

function animateNutritionRings(root: HTMLElement): void {
  const rings = root.querySelectorAll<SVGCircleElement>('[data-final-offset]')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const applyFinal = () => rings.forEach((ring) => ring.style.strokeDashoffset = ring.dataset.finalOffset ?? '')
  if (reduced) applyFinal()
  else window.requestAnimationFrame(() => { if (root.isConnected) applyFinal() })
}

function animateNutritionNumber(root: HTMLElement, durationOverride?: number): void {
  const numbers = [...root.querySelectorAll<HTMLElement>('[data-count-to]')]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = performance.now()
  const duration = durationOverride ?? (numbers.some((element) => Number(element.dataset.countFrom) > 0) ? 300 : 550)
  const paint = (now: number) => {
    if (!root.isConnected) return
    const elapsed = Math.min(1, (now - start) / duration)
    const eased = 1 - (1 - elapsed) ** 3
    numbers.forEach((element) => {
      const from = Number(element.dataset.countFrom)
      const to = Number(element.dataset.countTo)
      const value = from + (to - from) * eased
      element.textContent = element.hasAttribute('data-count-integer') ? String(Math.round(value)) : formatNumber(value)
    })
    if (elapsed < 1) window.requestAnimationFrame(paint)
  }
  if (reduced) numbers.forEach((element) => { element.textContent = element.hasAttribute('data-count-integer') ? element.dataset.countTo ?? '0' : formatNumber(Number(element.dataset.countTo)) })
  else window.requestAnimationFrame(paint)
}

function foodLogRowHtml(log: FoodLog): string {
  return `<article class="food-row"><button class="food-row-main" data-edit-log="${esc(log.id)}" aria-label="编辑 ${esc(log.foodName)}"><span><strong>${esc(log.foodName)}</strong><small>${log.brand ? `${esc(log.brand)} · ` : ''}${formatNumber(log.grams)} g</small></span><span class="food-kcal"><strong>${formatNumber(log.totalCalories)} <small>kcal</small></strong></span></button><details class="row-menu"><summary aria-label="${esc(log.foodName)}更多操作">···</summary><div><button data-delete-log="${esc(log.id)}">删除记录</button></div></details></article>`
}

function foodMealSectionHtml(group: FoodMealGroup, isToday: boolean): string {
  const meal = group.meal
  const key = meal ?? 'unclassified'
  const count = group.logs.length
  const macro = `蛋白质 ${formatNumber(group.protein)}g · 碳水 ${formatNumber(group.carbs)}g · 脂肪 ${formatNumber(group.fat)}g`
  const preview = count
    ? `${group.logs.slice(0, 3).map((log) => esc(log.foodName)).join(' · ')}${count > 3 ? ` · 另有 ${count - 3} 项` : ''}`
    : `${isToday ? '今天' : '这天'}还没有记录${group.name}`
  return `<section class="food-meal ${count ? 'has-logs' : 'is-empty'}" data-meal-section="${key}">
    <div class="food-meal-head"><button class="food-meal-summary" ${count ? `data-toggle-meal="${key}" aria-expanded="false"` : meal ? `data-add-meal="${meal}"` : ''} ${count || meal ? '' : 'disabled'} aria-label="${count ? `查看${group.name} ${count} 项记录` : `记录${group.name}`}"><span class="meal-symbol ${key}" aria-hidden="true"></span><span class="meal-title"><strong>${group.name}</strong>${count ? `<small>${count} 项 · ${formatNumber(group.calories)} kcal</small>` : ''}</span></button>${meal ? `<button class="meal-record" data-add-meal="${meal}">记录 ${icon('chevron', 15)}</button>` : '<span class="meal-unclassified-note">待整理</span>'}</div>
    ${count ? `<p class="meal-macros">${macro}</p>` : ''}
    <p class="meal-preview">${preview}</p>
    ${count ? `<div class="meal-log-list" hidden>${group.logs.map(foodLogRowHtml).join('')}</div>` : ''}
  </section>`
}

async function renderFoodPage(): Promise<void> {
  const [logs, target] = await Promise.all([
    db.foodLogs.where('date').equals(foodDate).sortBy('createdAt'),
    db.nutritionTargets.where('date').equals(foodDate).first(),
  ])
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.totalCalories,
    protein: sum.protein + (log.totalProtein ?? 0), carbs: sum.carbs + (log.totalCarbs ?? 0), fat: sum.fat + (log.totalFat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const hasMacros = logs.some((log) => log.totalProtein !== undefined || log.totalCarbs !== undefined || log.totalFat !== undefined) || Boolean(target)
  const isToday = foodDate === getLocalDateString()
  const view = document.querySelector<HTMLElement>('#view')!
  const previous = new Map<string, PreviousRingValue>()
  view.querySelectorAll<HTMLElement>('[data-progress-key]').forEach((element) => {
    if (element.closest<HTMLElement>('[data-food-date]')?.dataset.foodDate !== foodDate) return
    previous.set(element.dataset.progressKey!, { actual: Number(element.dataset.actual), goal: element.dataset.goal === undefined ? undefined : Number(element.dataset.goal) })
  })
  const calorieTarget = target?.calories
  const calorieAmount = calorieTarget === undefined ? `${formatNumber(totals.calories)} kcal` : `${formatNumber(totals.calories)} / ${formatNumber(calorieTarget)} kcal`
  const groups = groupFoodLogs(logs)
  view.innerHTML = `
    <div class="food-date-switch" aria-label="饮食记录日期切换"><button data-food-day="-1" aria-label="前一天">‹</button><button data-food-today aria-label="返回今天">今天</button><button data-food-day="1" aria-label="后一天">›</button></div>
    <section class="nutrition-hero food-nutrition-hero" data-food-date="${foodDate}" aria-label="${isToday ? '今日' : '当日'}营养汇总"><div class="nutrition-hero-head"><span class="hero-label">热量</span><button class="text-btn" id="edit-nutrition-target">${target ? '编辑目标' : '设置目标'} ${icon('chevron', 15)}</button></div><div class="food-calorie-row"><div class="calorie-gauge" data-progress-key="calories" data-actual="${totals.calories}" ${calorieTarget === undefined ? '' : `data-goal="${calorieTarget}"`} aria-label="热量 ${calorieAmount} ${goalStatusText(totals.calories, calorieTarget, 'kcal')}">${ringSvgHtml(totals.calories, calorieTarget, 'large', previous.get('calories'))}<div class="calorie-gauge-center"><strong data-count-from="${previous.get('calories')?.actual ?? 0}" data-count-to="${totals.calories}">${formatNumber(previous.get('calories')?.actual ?? 0)}</strong><small>kcal</small></div></div><div class="calorie-gauge-caption"><span>当日摄入</span>${calorieTarget === undefined ? '<strong>按自己的节奏记录</strong>' : `<strong>目标 ${formatNumber(calorieTarget)} kcal</strong>`}<span class="${getGoalProgress(totals.calories, calorieTarget).state === 'above' ? 'metric-excess' : ''}">${goalStatusText(totals.calories, calorieTarget, 'kcal')}</span></div></div><div class="macros ${hasMacros ? '' : 'is-empty'}">${nutritionMetricHtml('protein', '蛋白质', totals.protein, target?.protein, previous.get('protein'))}${nutritionMetricHtml('carbs', '碳水', totals.carbs, target?.carbs, previous.get('carbs'))}${nutritionMetricHtml('fat', '脂肪', totals.fat, target?.fat, previous.get('fat'))}</div></section>
    <section class="food-meals-head"><div><h2>${isToday ? '今日' : '当日'}饮食</h2><span>${logs.length ? `${logs.length} 项记录` : '按餐次记录，更清楚'}</span></div></section>
    <div class="food-meals">${groups.map((group) => foodMealSectionHtml(group, isToday)).join('')}</div>`
  animateNutritionRings(view)
  animateNutritionNumber(view)
  app.querySelector<HTMLInputElement>('#food-date')?.addEventListener('change', (event) => { const date = (event.target as HTMLInputElement).value; if (date) { foodDate = date; void render().catch(fail) } })
  app.querySelector('#food-library')?.addEventListener('click', () => void showFoodLibrary())
  app.querySelector('#use-diet-template')?.addEventListener('click', () => { app.querySelector<HTMLDetailsElement>('.food-tools-menu')!.open = false; void showDietTemplatePicker() })
  view.querySelector('#edit-nutrition-target')?.addEventListener('click', () => showNutritionTargetForm(foodDate, target))
  const saveTemplate = app.querySelector<HTMLButtonElement>('#save-day-diet-template')
  if (saveTemplate) saveTemplate.hidden = !logs.length
  saveTemplate?.addEventListener('click', () => { app.querySelector<HTMLDetailsElement>('.food-tools-menu')!.open = false; void saveDayAsDietTemplate(logs) })
  view.querySelectorAll<HTMLButtonElement>('[data-food-day]').forEach((button) => button.addEventListener('click', () => { foodDate = shiftLocalDate(foodDate, Number(button.dataset.foodDay)); void render().catch(fail) }))
  view.querySelector('[data-food-today]')?.addEventListener('click', () => { foodDate = getLocalDateString(); void render().catch(fail) })
  view.querySelectorAll<HTMLButtonElement>('[data-add-meal]').forEach((button) => button.addEventListener('click', () => { const meal = button.dataset.addMeal; if (isMealType(meal)) void showAddFoodLog(meal) }))
  view.querySelectorAll<HTMLButtonElement>('[data-toggle-meal]').forEach((button) => button.addEventListener('click', () => { const list = button.closest('.food-meal')?.querySelector<HTMLElement>('.meal-log-list'); if (!list) return; list.hidden = !list.hidden; button.setAttribute('aria-expanded', String(!list.hidden)) }))
  view.querySelectorAll<HTMLButtonElement>('[data-delete-log]').forEach((button) => button.addEventListener('click', async () => {
    button.closest('details')?.removeAttribute('open')
    if (!await confirmAction('删除饮食记录？', '删除后无法撤销，但不会影响食物库。')) return
    try { await db.foodLogs.delete(button.dataset.deleteLog!); toast('已删除'); await renderFoodPage() } catch (error) { fail(error) }
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-edit-log]').forEach((button) => button.addEventListener('click', async () => {
    const log = await db.foodLogs.get(button.dataset.editLog!)
    if (!log) return
    const dialog = openModal('编辑饮食记录', `<form id="edit-log-form" class="form"><label>实际重量<input name="grams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${log.grams}" required><span>g</span></label><label>餐次<select name="meal"><option value="">未分类</option>${mealTypes.map((meal) => `<option value="${meal}" ${log.meal === meal ? 'selected' : ''}>${mealNames[meal]}</option>`).join('')}</select></label><button class="primary" type="submit">保存</button></form>`)
    dialog.querySelector<HTMLFormElement>('#edit-log-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); try { const data = new FormData(event.currentTarget as HTMLFormElement); const meal = valueOf(data, 'meal'); await updateFoodLogDetails(log.id, valueOf(data, 'grams'), isMealType(meal) ? meal : undefined); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
    })
  }))
}

function nutritionGoalFields(goal?: NutritionGoal): string {
  return `<fieldset class="nutrition-goal-fields"><legend>营养目标（均为可选）</legend><label>目标热量<input name="goalCalories" type="number" inputmode="decimal" min="0" step="1" value="${goal?.calories ?? ''}" placeholder="2200"><span>kcal</span></label><label>蛋白质<input name="goalProtein" type="number" inputmode="decimal" min="0" step="0.1" value="${goal?.protein ?? ''}" placeholder="160"><span>g</span></label><label>碳水<input name="goalCarbs" type="number" inputmode="decimal" min="0" step="0.1" value="${goal?.carbs ?? ''}" placeholder="250"><span>g</span></label><label>脂肪<input name="goalFat" type="number" inputmode="decimal" min="0" step="0.1" value="${goal?.fat ?? ''}" placeholder="70"><span>g</span></label></fieldset>`
}

function nutritionGoalFromForm(data: FormData): NutritionGoal | undefined {
  return normalizeNutritionGoal({
    calories: valueOf(data, 'goalCalories') as unknown as number,
    protein: valueOf(data, 'goalProtein') as unknown as number,
    carbs: valueOf(data, 'goalCarbs') as unknown as number,
    fat: valueOf(data, 'goalFat') as unknown as number,
  })
}

function showNutritionTargetForm(date: string, target?: NutritionTarget): void {
  const dialog = openModal(target ? '编辑当日目标' : '设置当日目标', `<form id="nutrition-target-form" class="form"><p class="muted">${formatHeaderDate(date)}</p>${nutritionGoalFields(target)}<button class="primary" type="submit">保存目标</button>${target ? '<button class="danger-button" type="button" id="delete-nutrition-target">删除目标</button>' : ''}</form>`)
  dialog.querySelector<HTMLFormElement>('#nutrition-target-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      const goal = nutritionGoalFromForm(new FormData(event.currentTarget as HTMLFormElement))
      if (!goal) throw new Error('请至少填写一项营养目标')
      await saveNutritionTarget(date, goal)
      dialog.close(); toast('营养目标已保存'); await renderFoodPage()
    } catch (error) { fail(error) }
  })
  dialog.querySelector('#delete-nutrition-target')?.addEventListener('click', async () => {
    if (!await confirmAction('删除当日营养目标？', '饮食记录不会被删除。')) return
    try { await deleteNutritionTarget(date); dialog.close(); toast('营养目标已删除'); await renderFoodPage() } catch (error) { fail(error) }
  })
}

async function showAddFoodLog(meal: MealType): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  const dialog = openModal(`记录${mealNames[meal]}`, foods.length ? `<div class="form"><label class="search-field"><span class="sr-only">搜索食物</span>${icon('search', 19)}<input id="food-search" type="search" placeholder="搜索食物或品牌" autocomplete="off"></label><div id="food-results" class="picker-list"></div><button class="sheet-link" id="create-food-from-picker">${icon('plus', 18)} 新建食物</button></div>` : `<div class="empty compact minimal"><div class="empty-icon">${icon('archive', 24)}</div><h3>食物库还是空的</h3><p>先创建一种食物。</p><button class="primary" id="create-first-food">${icon('plus', 18)} 新建食物</button></div>`, true)
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
      dialog.querySelector('.modal-head h2')!.textContent = `记录${mealNames[meal]} · ${food.name}`
      dialog.querySelector('.modal-body')!.innerHTML = `<form id="log-food-form" class="form quantity-form"><div class="selected-food"><span>每 ${formatNumber(food.referenceGrams)}g</span><strong>${formatNumber(food.calories)} kcal</strong></div><label class="quantity-label">吃了多少？<span class="quantity-input"><input name="grams" id="grams" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="230" required autofocus><b>g</b></span></label><div class="preview-number"><span>预计热量</span><strong id="kcal-preview">— kcal</strong></div><button class="primary" type="submit">添加</button></form>`
      const input = dialog.querySelector<HTMLInputElement>('#grams')!
      input.addEventListener('input', () => {
        const grams = Number(input.value)
        dialog.querySelector('#kcal-preview')!.textContent = Number.isFinite(grams) && grams > 0 ? `${formatNumber(calculateNutrition(food, grams).calories)} kcal` : '— kcal'
      })
      dialog.querySelector<HTMLFormElement>('#log-food-form')?.addEventListener('submit', async (event) => {
        event.preventDefault(); try { await logFood(food, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'grams'), foodDate, meal); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
      })
    }))
  }
  draw()
  dialog.querySelector<HTMLInputElement>('#food-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
}

async function showFoodLibrary(query = ''): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  let currentQuery = query
  let searchTimer: number | undefined
  const dialog = openModal('食物库', `<div class="toolbar"><label class="search-field"><span class="sr-only">搜索食物库</span>${icon('search', 19)}<input id="library-search" type="search" value="${esc(query)}" placeholder="搜索食物"></label><button class="icon-btn add-button" id="new-food" aria-label="新建食物">${icon('plus')}</button></div><div class="import-actions"><button id="import-csv">${icon('upload', 17)} 表格文件</button><button id="import-json">${icon('upload', 17)} 数据文件</button><input id="import-file" type="file" hidden></div><div class="library-list"></div>`, true)
  const list = dialog.querySelector<HTMLElement>('.library-list')!
  const draw = (nextQuery: string) => {
    currentQuery = nextQuery
    const normalized = nextQuery.trim().toLocaleLowerCase()
    const filtered = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized))
    list.innerHTML = filtered.length ? filtered.map((food) => `<article><button class="library-main" data-edit-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}<p>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</p></span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-food="${food.id}" aria-label="删除 ${esc(food.name)}">${icon('trash', 17)}</button></article>`).join('') : '<p class="muted padded">没有匹配的食物</p>'
    list.querySelectorAll<HTMLButtonElement>('[data-edit-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.editFood); dialog.close(); void showFoodForm(food) }))
    list.querySelectorAll<HTMLButtonElement>('[data-delete-food]').forEach((button) => button.addEventListener('click', async () => {
      if (!await confirmAction('删除这个食物？', '历史饮食记录会保留，此操作不会改变过去的营养数据。')) return
      try { await db.foods.delete(button.dataset.deleteFood!); dialog.close(); toast('已删除'); void showFoodLibrary(currentQuery).catch(fail) } catch (error) { fail(error) }
    }))
  }
  draw(query)
  dialog.querySelector<HTMLInputElement>('#library-search')?.addEventListener('input', (event) => {
    window.clearTimeout(searchTimer)
    const value = (event.target as HTMLInputElement).value
    searchTimer = window.setTimeout(() => draw(value), 120)
  })
  dialog.addEventListener('close', () => window.clearTimeout(searchTimer), { once: true })
  dialog.querySelector('#new-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
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
  if (pelvicTimerState && pelvicTimerState.status !== 'completed') { renderPelvicFloorTimer(); return }
  if (showWorkoutHistory) { await renderWorkoutHistory(); return }
  if (workoutEditorOpen) {
    if (!currentWorkout) currentWorkout = await findOpenWorkout(workoutDate)
    if (currentWorkout) { renderWorkoutEditor(currentWorkout); return }
    workoutEditorOpen = false
  }
  const openWorkout = await findOpenWorkout(workoutDate)
  const [todayWorkouts, pelvicSessions] = await Promise.all([
    db.workouts.where('date').equals(workoutDate).toArray(),
    db.pelvicFloorSessions.where('date').equals(workoutDate).toArray(),
  ])
  const pelvicContractions = pelvicSessions.reduce((total, session) => total + session.completedRepetitions, 0)
  const pelvicSeconds = pelvicSessions.reduce((total, session) => total + pelvicFloorSessionDurationSeconds(session), 0)
  const recentWorkouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)).slice(0, 4)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="context-row"><label class="date-control">${icon('calendar', 17)}<span>训练日期</span><input id="workout-date" type="date" value="${workoutDate}" aria-label="训练日期"></label><div class="context-actions"><button class="text-btn" id="workout-templates">训练模板</button><button class="text-btn" id="exercise-library">动作库 ${icon('chevron', 16)}</button></div></section><div class="empty workout-empty minimal"><div class="empty-icon">${icon('dumbbell', 27)}</div><h2>${openWorkout ? '训练还在进行中' : todayWorkouts.length ? '这一天的训练已完成' : '今天还没有力量训练'}</h2><p>${openWorkout ? '上次输入已自动保存，可以随时继续。' : '可从模板开始，也可以创建空白训练。'}</p><button class="primary start-button" id="start-workout">${openWorkout ? icon('activity', 18) + ' 继续训练' : icon('plus', 18) + ' 开始力量训练'}</button></div><section class="pelvic-floor-card"><div><span class="eyebrow">轻柔练习</span><h2>凯格尔训练</h2><p>收缩与放松练习</p></div><div class="pelvic-daily-summary"><strong>${pelvicSessions.length} 次</strong><span>${pelvicContractions} 次收缩 · ${pelvicSeconds} 秒</span></div><div class="pelvic-card-actions"><button class="secondary" id="start-pelvic-floor">${icon('leaf', 18)} 开始训练</button><button class="text-btn" id="pelvic-floor-history">训练记录</button></div></section><section class="section-head"><div><h2>最近力量训练</h2><span>${recentWorkouts.length ? '轻触查看详情' : '完成训练后会显示在这里'}</span></div>${recentWorkouts.length ? '<button class="text-btn" id="history-workout">全部</button>' : ''}</section><div class="history-list">${recentWorkouts.map((workout) => `<button class="history-row" data-workout="${workout.id}"><span><strong>${formatShortDate(workout.date)}</strong><small>${workout.exercises.map((item) => esc(item.exerciseName)).slice(0, 2).join(' · ') || '无动作'}</small></span><span class="history-count">${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span>${icon('chevron', 17)}</button>`).join('')}</div>`
  view.querySelector<HTMLInputElement>('#workout-date')?.addEventListener('change', (event) => { workoutDate = (event.target as HTMLInputElement).value; currentWorkout = undefined; workoutEditorOpen = false; void render().catch(fail) })
  view.querySelector('#exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#workout-templates')?.addEventListener('click', () => void showWorkoutTemplateManager())
  view.querySelector('#start-pelvic-floor')?.addEventListener('click', () => showPelvicFloorSetup())
  view.querySelector('#pelvic-floor-history')?.addEventListener('click', () => void showPelvicFloorHistory())
  view.querySelector('#start-workout')?.addEventListener('click', async () => {
    try {
      if (openWorkout) { currentWorkout = openWorkout; workoutEditorOpen = true; await renderWorkoutPage(); return }
      await showWorkoutStartSheet()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; void renderWorkoutPage().catch(fail) })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { try { currentWorkout = await db.workouts.get(button.dataset.workout!); workoutEditorOpen = true; await renderWorkoutPage() } catch (error) { fail(error) } }))
}

async function initializePelvicAudio(): Promise<void> {
  try {
    const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return
    pelvicAudioContext ??= new AudioContextConstructor()
    await pelvicAudioContext.resume()
  } catch { pelvicAudioContext = undefined }
}

function playPelvicCue(phase: 'contract' | 'relax'): void {
  const context = pelvicAudioContext
  if (!context || context.state !== 'running') return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = phase === 'contract' ? 660 : 440
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(); oscillator.stop(context.currentTime + 0.13)
}

async function requestPelvicWakeLock(): Promise<void> {
  try {
    const api = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    if (api && !pelvicWakeLock) pelvicWakeLock = await api.request('screen')
  } catch { pelvicWakeLock = undefined }
}

async function releasePelvicWakeLock(): Promise<void> {
  const lock = pelvicWakeLock
  pelvicWakeLock = undefined
  try { await lock?.release() } catch { /* Wake Lock is optional. */ }
}

function showPelvicFloorSetup(): void {
  const dialog = openModal('凯格尔训练', `<form id="pelvic-floor-setup" class="form"><div class="pelvic-setup-grid"><label>收缩时间<input name="contract" type="number" inputmode="numeric" min="1" max="60" step="1" value="3" required><span>秒</span></label><label>放松时间<input name="relax" type="number" inputmode="numeric" min="1" max="60" step="1" value="3" required><span>秒</span></label><label>重复次数<input name="repetitions" type="number" inputmode="numeric" min="1" max="100" step="1" value="10" required><span>次</span></label></div><div class="pelvic-guidance"><p>收缩盆底肌并保持正常呼吸。</p><p>不要同时强力夹紧臀部、大腿或腹部，每次放松阶段充分放松。</p><p>不要把中断排尿作为日常训练方式。</p><p>如有疼痛或明显不适，请停止并咨询专业人员。</p></div><button class="primary" type="submit">开始计时</button></form>`)
  dialog.querySelector<HTMLFormElement>('#pelvic-floor-setup')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    try {
      const ready = createPelvicFloorTimer({ contractSeconds: Number(valueOf(data, 'contract')), relaxSeconds: Number(valueOf(data, 'relax')), repetitions: Number(valueOf(data, 'repetitions')) })
      await initializePelvicAudio()
      pelvicTimerState = startPelvicFloorTimer(ready, Date.now())
      pelvicTimerDate = workoutDate
      pelvicSessionSaving = false
      dialog.close()
      playPelvicCue('contract')
      await requestPelvicWakeLock()
      renderPelvicFloorTimer()
    } catch (error) { fail(error) }
  })
}

function renderPelvicFloorTimer(): void {
  const state = pelvicTimerState
  if (!state) return
  document.body.classList.add('immersive')
  window.clearInterval(pelvicTimerInterval)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="pelvic-timer-screen"><header><span>凯格尔训练</span><small>${formatHeaderDate(pelvicTimerDate)}</small></header><div class="pelvic-countdown" id="pelvic-countdown" role="timer"><span id="pelvic-phase">${state.activePhase === 'relax' ? '放松' : '收缩'}</span><strong id="pelvic-remaining">${getPelvicFloorRemainingSeconds(state, Date.now())}</strong><span>秒</span></div><h2 id="pelvic-status">${state.status === 'paused' ? '已暂停' : '保持自然呼吸'}</h2><p id="pelvic-repetition">${Math.min(state.completedRepetitions + 1, state.repetitions)} / ${state.repetitions} 次</p><div class="pelvic-timer-actions"><button class="primary" id="pelvic-pause">${state.status === 'paused' ? '继续' : '暂停'}</button><button class="danger-button" id="pelvic-finish">结束训练</button></div><p class="pelvic-breathing-cue">收缩阶段轻柔保持；放松阶段充分放松。</p></section>`
  view.querySelector('#pelvic-pause')?.addEventListener('click', async () => {
    if (!pelvicTimerState) return
    if (pelvicTimerState.status === 'paused') {
      pelvicTimerState = resumePelvicFloorTimer(pelvicTimerState, Date.now())
      await initializePelvicAudio(); playPelvicCue(pelvicTimerState.activePhase ?? 'contract'); await requestPelvicWakeLock()
    } else {
      pelvicTimerState = pausePelvicFloorTimer(pelvicTimerState, Date.now())
      await releasePelvicWakeLock()
    }
    renderPelvicFloorTimer()
  })
  view.querySelector('#pelvic-finish')?.addEventListener('click', async () => {
    if (!pelvicTimerState || !await confirmAction('结束凯格尔训练？', '将保存当前已完成的训练进度。', '结束并保存')) return
    // The timer can finish and save while the confirmation dialog is open.
    if (!pelvicTimerState || pelvicSessionSaving) return
    pelvicTimerState = finishPelvicFloorTimer(pelvicTimerState, Date.now())
    await completePelvicFloorTimer()
  })
  pelvicTimerInterval = window.setInterval(tickPelvicFloorTimer, 200)
  paintPelvicFloorTimer()
}

function paintPelvicFloorTimer(): void {
  const state = pelvicTimerState
  if (!state) return
  const now = Date.now()
  const remaining = getPelvicFloorRemainingSeconds(state, now)
  const progress = getPelvicFloorPhaseProgress(state, now)
  const countdown = document.querySelector<HTMLElement>('#pelvic-countdown')
  countdown?.style.setProperty('--timer-progress', `${progress * 360}deg`)
  countdown?.style.setProperty('--phase-scale', `${state.activePhase === 'relax' ? 0.84 + progress * 0.16 : 1 - progress * 0.16}`)
  countdown?.classList.toggle('is-relax', state.activePhase === 'relax')
  countdown?.classList.toggle('is-paused', state.status === 'paused')
  countdown?.setAttribute('aria-label', `${state.activePhase === 'relax' ? '放松' : '收缩'}，剩余 ${remaining} 秒${state.status === 'paused' ? '，已暂停' : ''}`)
  const remainingElement = document.querySelector('#pelvic-remaining'); if (remainingElement) remainingElement.textContent = String(remaining)
  const phaseElement = document.querySelector('#pelvic-phase'); if (phaseElement) phaseElement.textContent = state.activePhase === 'relax' ? '放松' : '收缩'
  const statusElement = document.querySelector('#pelvic-status'); if (statusElement) statusElement.textContent = state.status === 'paused' ? '已暂停' : '保持自然呼吸'
  const repetition = document.querySelector('#pelvic-repetition'); if (repetition) repetition.textContent = `${Math.min(state.completedRepetitions + 1, state.repetitions)} / ${state.repetitions} 次`
}

function tickPelvicFloorTimer(): void {
  const state = pelvicTimerState
  if (!state || state.status === 'paused') return
  const previousPhase = state.activePhase
  pelvicTimerState = advancePelvicFloorTimer(state, Date.now())
  if (pelvicTimerState.status === 'completed') { void completePelvicFloorTimer(); return }
  if (pelvicTimerState.activePhase !== previousPhase && pelvicTimerState.activePhase) playPelvicCue(pelvicTimerState.activePhase)
  paintPelvicFloorTimer()
}

async function completePelvicFloorTimer(): Promise<void> {
  const state = pelvicTimerState
  if (!state || state.status !== 'completed' || pelvicSessionSaving) return
  pelvicSessionSaving = true
  window.clearInterval(pelvicTimerInterval)
  await releasePelvicWakeLock()
  try {
    await savePelvicFloorSession(sessionFromPelvicFloorTimer(state, pelvicTimerDate))
    pelvicTimerState = undefined
    pelvicSessionSaving = false
    document.body.classList.remove('immersive')
    toast('凯格尔训练已保存')
    await render()
  } catch (error) { pelvicSessionSaving = false; fail(error) }
}

async function showPelvicFloorHistory(): Promise<void> {
  const sessions = (await db.pelvicFloorSessions.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  const dialog = openModal('凯格尔训练记录', `<div class="pelvic-history">${sessions.length ? sessions.map((session) => `<article><div class="pelvic-history-main"><div><strong>${formatShortDate(session.date)}</strong><span>${session.completedRepetitions} / ${session.repetitions} 次收缩</span></div><small>${pelvicFloorSessionDurationSeconds(session)} 秒 · 收缩 ${session.phases.find((phase) => phase.type === 'contract')?.durationSeconds ?? 0}s / 放松 ${session.phases.find((phase) => phase.type === 'relax')?.durationSeconds ?? 0}s</small></div><details class="row-menu"><summary aria-label="${formatShortDate(session.date)}更多操作">···</summary><div><button data-delete-pelvic-session="${session.id}">删除记录</button></div></details></article>`).join('') : '<p class="muted padded">还没有凯格尔训练记录</p>'}</div>`, true)
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-pelvic-session]').forEach((button) => button.addEventListener('click', async () => {
    button.closest('details')?.removeAttribute('open')
    if (!await confirmAction('删除这条训练记录？', '删除后无法恢复。', '删除')) return
    try {
      await deletePelvicFloorSession(button.dataset.deletePelvicSession!)
      dialog.close()
      toast('训练记录已删除')
      await render()
      await showPelvicFloorHistory()
    } catch (error) { fail(error) }
  }))
}

function renderWorkoutEditor(workout: Workout): void {
  const completed = Boolean(workout.finishedAt)
  window.clearInterval(workoutClockTimer)
  document.body.classList.add('immersive')
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<header class="active-workout-head"><button class="icon-btn quiet" id="exit-workout" aria-label="返回训练首页">${icon('x')}</button><div><strong>${completed ? '训练详情' : '训练中'}</strong><span id="workout-clock">${formatElapsed(workout.startedAt, workout.finishedAt)}</span></div>${completed ? '<span class="head-spacer"></span>' : '<button class="finish-text" id="finish-workout">完成</button>'}</header><section class="workout-meta"><span>${formatHeaderDate(workout.date)}</span><span id="autosave-state">${completed ? '可编辑' : '已自动保存'}</span></section>${completed ? '' : '<div id="workout-rest-slot"></div>'}<div id="workout-exercises">${workout.exercises.length ? workout.exercises.map(workoutExerciseHtml).join('') : `<div class="empty compact minimal"><div class="empty-icon">${icon('dumbbell', 24)}</div><h3>还没有动作</h3><p>添加第一个动作开始记录。</p></div>`}</div><button id="add-exercise" class="secondary full-btn">${icon('plus', 18)} 添加动作</button><label class="note-field">训练备注<textarea id="workout-note" rows="2" placeholder="可选">${esc(workout.note)}</textarea></label><div class="action-stack workout-actions">${completed ? '<button id="save-workout-template" class="secondary">保存为模板</button><button id="back-history" class="quiet-action">返回历史</button><button id="delete-workout" class="danger-button">删除训练</button>' : '<button id="history-workout">查看历史训练</button>'}</div>`
  if (!completed) workoutClockTimer = window.setInterval(() => { const clock = document.querySelector('#workout-clock'); if (clock) clock.textContent = formatElapsed(workout.startedAt) }, 1000)
  if (!completed) renderWorkoutRestControls(workout)
  bindWorkoutEditor(workout)
}

function clearWorkoutRestTimer(): void {
  window.clearInterval(workoutRestInterval)
  workoutRestInterval = undefined
  workoutRestState = undefined
  workoutRestWorkoutId = undefined
}

function formatRestTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function paintWorkoutRestTimer(): void {
  const state = workoutRestState
  const ring = document.querySelector<HTMLElement>('#workout-rest-countdown')
  if (!state || !ring) return
  const remaining = getRestRemainingMs(state, Date.now())
  if (remaining <= 0) {
    clearWorkoutRestTimer()
    ring.closest<HTMLElement>('#workout-rest-slot')!.innerHTML = '<button class="quiet-action full-btn" id="start-workout-rest">开始休息计时 · 60秒</button>'
    document.querySelector('#start-workout-rest')?.addEventListener('click', () => { workoutRestState = startRestTimer(Date.now()); workoutRestWorkoutId = currentWorkout?.id; if (currentWorkout) renderWorkoutRestControls(currentWorkout) })
    toast('休息结束')
    return
  }
  ring.style.setProperty('--rest-remaining-angle', `${360 * remaining / state.durationMs}deg`)
  ring.setAttribute('aria-label', `休息剩余 ${formatRestTime(remaining)}${state.status === 'paused' ? '，已暂停' : ''}`)
  const number = ring.querySelector('#workout-rest-remaining')
  if (number) number.textContent = formatRestTime(remaining)
}

function renderWorkoutRestControls(workout: Workout): void {
  const slot = document.querySelector<HTMLElement>('#workout-rest-slot')
  if (!slot) return
  window.clearInterval(workoutRestInterval)
  if (workoutRestWorkoutId !== workout.id) { workoutRestState = undefined; workoutRestWorkoutId = undefined }
  const state = workoutRestState
  if (!state) {
    slot.innerHTML = '<button class="quiet-action full-btn" id="start-workout-rest">开始休息计时 · 60秒</button>'
    slot.querySelector('#start-workout-rest')?.addEventListener('click', () => { workoutRestState = startRestTimer(Date.now()); workoutRestWorkoutId = workout.id; renderWorkoutRestControls(workout) })
    return
  }
  slot.innerHTML = `<section class="workout-rest-panel"><div class="workout-rest-ring" id="workout-rest-countdown" role="timer"><span>休息</span><strong id="workout-rest-remaining">${formatRestTime(getRestRemainingMs(state, Date.now()))}</strong></div><div class="workout-rest-actions"><button id="workout-rest-toggle">${state.status === 'paused' ? '继续' : '暂停'}</button><button id="workout-rest-extend">+30 秒</button><button id="workout-rest-skip">跳过</button></div></section>`
  slot.querySelector('#workout-rest-toggle')?.addEventListener('click', () => { workoutRestState = state.status === 'paused' ? resumeRestTimer(state, Date.now()) : pauseRestTimer(state, Date.now()); renderWorkoutRestControls(workout) })
  slot.querySelector('#workout-rest-extend')?.addEventListener('click', () => { workoutRestState = extendRestTimer(state, Date.now()); renderWorkoutRestControls(workout) })
  slot.querySelector('#workout-rest-skip')?.addEventListener('click', () => { clearWorkoutRestTimer(); renderWorkoutRestControls(workout) })
  paintWorkoutRestTimer()
  if (state.status === 'running') workoutRestInterval = window.setInterval(paintWorkoutRestTimer, 250)
}

function workoutExerciseHtml(exercise: WorkoutExercise): string {
  return `<article class="exercise-card" data-workout-exercise="${exercise.id}"><div class="exercise-head"><h3>${esc(exercise.exerciseName)}</h3><button class="icon-btn quiet danger" data-remove-exercise="${exercise.id}" aria-label="移除 ${esc(exercise.exerciseName)}">${icon('trash', 17)}</button></div><div class="sets"><div class="set-header"><span>组</span><span>重量 <small>kg</small></span><span>次数</span><span></span></div>${exercise.sets.map((set, index) => `<div class="set-row" data-set="${set.id}"><span>${index + 1}</span><input aria-label="第${index + 1}组重量" data-field="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg ?? ''}" placeholder="—"><input aria-label="第${index + 1}组次数" data-field="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}" placeholder="—"><button aria-label="删除第${index + 1}组" class="icon-btn quiet danger" data-remove-set="${set.id}">${icon('x', 17)}</button><input class="set-note" aria-label="第${index + 1}组备注" data-field="note" placeholder="本组备注（可选）" value="${esc(set.note)}"></div>`).join('')}</div><button class="text-btn add-set" data-add-set="${exercise.id}">${icon('plus', 17)} 添加一组</button></article>`
}

function workoutSetSummary(set: WorkoutSet): string {
  return set.weightKg === undefined ? `${set.reps} 次` : `${formatNumber(set.weightKg)}kg × ${set.reps}`
}

function bindWorkoutEditor(workout: Workout): void {
  const view = document.querySelector<HTMLElement>('#view')!
  view.querySelector('#exit-workout')?.addEventListener('click', async () => {
    try { await flushWorkoutAutosave(workout); currentWorkout = undefined; workoutEditorOpen = false; document.body.classList.remove('immersive'); await render() } catch (error) { fail(error) }
  })
  view.querySelector('#add-exercise')?.addEventListener('click', () => void showExercisePicker(workout))
  view.querySelector<HTMLTextAreaElement>('#workout-note')?.addEventListener('input', (event) => { workout.note = (event.target as HTMLTextAreaElement).value.trim() || undefined; scheduleWorkoutSave(workout) })
  view.querySelectorAll<HTMLButtonElement>('[data-add-set]').forEach((button) => button.addEventListener('click', () => {
    const exercise = workout.exercises.find((item) => item.id === button.dataset.addSet)!
    const previous = exercise.sets.at(-1)
    exercise.sets.push({ id: crypto.randomUUID(), weightKg: previous?.weightKg, reps: previous?.reps ?? 0 })
    renderWorkoutEditor(workout); scheduleWorkoutSave(workout)
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-remove-set]').forEach((button) => button.addEventListener('click', () => {
    const parent = button.closest<HTMLElement>('[data-workout-exercise]')!
    const exercise = workout.exercises.find((item) => item.id === parent.dataset.workoutExercise)!
    exercise.sets = exercise.sets.filter((set) => set.id !== button.dataset.removeSet); renderWorkoutEditor(workout); scheduleWorkoutSave(workout)
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-remove-exercise]').forEach((button) => button.addEventListener('click', () => {
    workout.exercises = workout.exercises.filter((item) => item.id !== button.dataset.removeExercise); renderWorkoutEditor(workout); scheduleWorkoutSave(workout)
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
    scheduleWorkoutSave(workout)
  }))
  view.querySelector('#finish-workout')?.addEventListener('click', async () => {
    try {
      await flushWorkoutAutosave(workout)
      const normalized = normalizeWorkoutForSave(workout)
      if (!normalized.exercises.length) throw new Error('请至少添加一个动作')
      if (!await confirmAction('完成本次训练？', '完成后仍可从历史训练中查看和编辑。', '完成训练', false)) return
      const finished = await finishWorkout(workout)
      clearWorkoutRestTimer()
      justFinishedWorkout = finished
      workoutAutosave.cancel(); currentWorkout = undefined; showWorkoutHistory = true; toast('训练已完成'); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', async () => {
    try { await flushWorkoutAutosave(workout); clearWorkoutRestTimer(); showWorkoutHistory = true; currentWorkout = undefined; workoutEditorOpen = false; await renderWorkoutPage() } catch (error) { fail(error) }
  })
  view.querySelector('#back-history')?.addEventListener('click', async () => {
    try { await flushWorkoutAutosave(workout); clearWorkoutRestTimer(); currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = true; await renderWorkoutPage() } catch (error) { fail(error) }
  })
  view.querySelector('#save-workout-template')?.addEventListener('click', () => void saveWorkoutAsTemplate(workout))
  view.querySelector('#delete-workout')?.addEventListener('click', async () => {
    if (!await confirmAction('删除整次训练？', '所有动作和组记录都会被删除，此操作无法撤销。')) return
    try { workoutAutosave.cancel(); await db.workouts.delete(workout.id); currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = true; toast('已删除'); await renderWorkoutPage() } catch (error) { fail(error) }
  })
}

function scheduleWorkoutSave(workout: Workout): void {
  workoutAutosave.schedule(workout)
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
      dialog.close(); renderWorkoutEditor(workout); scheduleWorkoutSave(workout)
    }))
  }
  draw()
  dialog.querySelector<HTMLInputElement>('#exercise-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector('#quick-exercise')?.addEventListener('click', () => { dialog.close(); void showExerciseForm(undefined, async (exercise) => { workout.exercises.push({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [] }); renderWorkoutEditor(workout); scheduleWorkoutSave(workout) }) })
}

async function showExerciseLibrary(): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  const dialog = openModal('动作库', `<button class="primary full-btn" id="new-exercise">${icon('plus', 18)} 新建动作</button><div class="library-list">${exercises.map((exercise) => `<article><button class="library-main" data-edit-exercise="${exercise.id}"><span><strong>${esc(exercise.name)}</strong>${exercise.notes ? `<p>${esc(exercise.notes)}</p>` : ''}</span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-exercise="${exercise.id}" aria-label="删除 ${esc(exercise.name)}">${icon('trash', 17)}</button></article>`).join('')}</div>`, true)
  dialog.querySelector('#new-exercise')?.addEventListener('click', () => { dialog.close(); void showExerciseForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-exercise]').forEach((button) => button.addEventListener('click', () => { dialog.close(); void showExerciseForm(exercises.find((item) => item.id === button.dataset.editExercise)) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-exercise]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除这个动作？', '历史训练会保留，此操作不会改变过去的训练记录。')) return; try { await db.exercises.delete(button.dataset.deleteExercise!); dialog.close(); toast('已删除'); void showExerciseLibrary() } catch (error) { fail(error) } }))
}

async function showExerciseForm(exercise?: Exercise, afterSave?: (value: Exercise) => void | Promise<void>): Promise<void> {
  const dialog = openModal(exercise ? '编辑动作' : '新建动作', `<form id="exercise-form" class="form"><label>动作名称 *<input name="name" value="${esc(exercise?.name)}" placeholder="杠铃卧推" required></label><label>备注<textarea name="notes" rows="3" placeholder="可选">${esc(exercise?.notes)}</textarea></label><button class="primary" type="submit">保存动作</button></form>`)
  dialog.querySelector<HTMLFormElement>('#exercise-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); try { const saved = await saveExercise(valueOf(data, 'name'), valueOf(data, 'notes'), exercise?.id); dialog.close(); toast('已保存'); if (afterSave) await afterSave(saved); else void showExerciseLibrary() } catch (error) { fail(error) } })
}

async function renderWorkoutHistory(): Promise<void> {
  document.body.classList.remove('immersive')
  const workouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  const view = document.querySelector<HTMLElement>('#view')!
  const completedFeedback = justFinishedWorkout && workouts.some((item) => item.id === justFinishedWorkout?.id)
    ? `<div class="workout-complete-banner" role="status">${icon('check', 20)}<span><strong>本次训练已完成</strong><small>${justFinishedWorkout.exercises.length} 个动作 · ${justFinishedWorkout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组已记录</small></span></div>` : ''
  justFinishedWorkout = undefined
  view.innerHTML = `${completedFeedback}<div class="section-head history-head"><div><h2>历史训练</h2><span>${workouts.length} 次训练</span></div><button class="text-btn" id="close-history">返回</button></div><div class="history-list">${workouts.length ? workouts.map((workout) => `<button class="history-card" data-workout="${workout.id}"><div class="history-card-title"><strong>${formatShortDate(workout.date)}</strong><span>${workout.exercises.length} 个动作 · ${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span></div><div class="history-details">${workout.exercises.map((item) => `<div><strong>${esc(item.exerciseName)}</strong><small>${item.sets.map(workoutSetSummary).join(' · ') || '暂无组数'}</small></div>`).join('')}</div>${icon('chevron', 17)}</button>`).join('') : `<div class="empty minimal"><div class="empty-icon">${icon('activity', 24)}</div><h3>还没有训练历史</h3></div>`}</div>`
  view.querySelector('#close-history')?.addEventListener('click', () => { showWorkoutHistory = false; void renderWorkoutPage().catch(fail) })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { try { currentWorkout = await db.workouts.get(button.dataset.workout!); workoutEditorOpen = true; showWorkoutHistory = false; await renderWorkoutPage() } catch (error) { fail(error) } }))
}

function defaultTemplateName(date: string, suffix: string): string {
  const value = new Date(`${date}T12:00:00`)
  return `${value.getMonth() + 1}月${value.getDate()}日${suffix}`
}

async function showWorkoutStartSheet(): Promise<void> {
  const openWorkout = (await db.workouts.toArray()).find((item) => !item.finishedAt)
  const templates = sortTemplates(await db.workoutTemplates.toArray())
  const cards = templates.slice(0, 5).map(workoutTemplateCardHtml).join('')
  const dialog = openModal('开始训练', `<div class="template-picker">${openWorkout ? `<div class="warning soft-warning"><strong>有未完成训练</strong><span>${formatShortDate(openWorkout.date)} · ${openWorkout.exercises.length} 个动作</span><button class="primary" id="continue-open-workout">继续训练</button></div>` : ''}${templates.length ? `<div class="template-list">${cards}</div>` : '<div class="empty compact minimal"><h3>还没有训练模板</h3><p>可以先创建模板，或直接开始空白训练。</p></div>'}<div class="template-picker-actions"><button class="secondary" id="blank-workout">空白训练</button><button id="manage-workout-templates">${templates.length ? '管理全部模板' : '创建第一个模板'}</button></div></div>`, true)
  dialog.querySelector('#continue-open-workout')?.addEventListener('click', async () => {
    if (!openWorkout) return
    dialog.close(); workoutDate = openWorkout.date; currentWorkout = openWorkout; workoutEditorOpen = true; await render()
  })
  dialog.querySelector('#blank-workout')?.addEventListener('click', async () => {
    try {
      if (openWorkout) throw new Error('请先完成已有的未完成训练')
      currentWorkout = await createWorkout(workoutDate); workoutEditorOpen = true; dialog.close(); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  dialog.querySelector('#manage-workout-templates')?.addEventListener('click', () => { dialog.close(); void showWorkoutTemplateManager() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-start-workout-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.startWorkoutTemplate)
    if (template) void launchWorkoutTemplate(template, dialog)
  }))
}

function workoutTemplateCardHtml(template: WorkoutTemplate): string {
  const exerciseNames = template.exercises.slice(0, 3).map((item) => esc(item.exerciseName)).join(' · ')
  const extra = Math.max(0, template.exercises.length - 3)
  const sets = template.exercises.reduce((sum, item) => sum + item.sets.length, 0)
  return `<article class="template-card"><div><h3>${esc(template.name)}</h3><p>${exerciseNames || '暂无动作'}${extra ? ` · +${extra}` : ''}</p><small>${template.exercises.length} 个动作 · ${sets} 组</small></div><button class="primary compact-button" data-start-workout-template="${template.id}">开始</button></article>`
}

async function launchWorkoutTemplate(template: WorkoutTemplate, dialog?: HTMLDialogElement): Promise<void> {
  try {
    const openWorkout = (await db.workouts.toArray()).find((item) => !item.finishedAt)
    if (openWorkout) throw new Error('已有未完成训练，请先继续或完成它')
    currentWorkout = await startWorkoutFromTemplate(template, workoutDate)
    workoutEditorOpen = true; showWorkoutHistory = false; dialog?.close(); await renderWorkoutPage()
  } catch (error) { fail(error) }
}

async function showWorkoutTemplateManager(query = ''): Promise<void> {
  const templates = sortTemplates(await db.workoutTemplates.toArray())
  const exerciseIds = [...new Set(templates.flatMap((template) => template.exercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))))]
  const existingIds = new Set((await db.exercises.bulkGet(exerciseIds)).filter((item): item is Exercise => Boolean(item)).map((item) => item.id))
  const dialog = openModal('训练模板', `<div class="toolbar"><label class="search-field"><span class="sr-only">搜索训练模板</span>${icon('search', 19)}<input id="workout-template-search" type="search" value="${esc(query)}" placeholder="搜索模板"></label><button class="icon-btn add-button" id="new-workout-template" aria-label="新建训练模板">${icon('plus')}</button></div><div class="template-manager-list"></div>`, true)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase()
    const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? filtered.map((template) => {
      const missing = template.exercises.filter((item) => item.exerciseId && !existingIds.has(item.exerciseId)).length
      return `<article class="manager-card"><button class="manager-main" data-edit-workout-template="${template.id}"><strong>${esc(template.name)}</strong><span>${template.exercises.length} 个动作 · ${template.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span>${missing ? `<small class="warning-text">${missing} 个动作已从动作库删除，仍可使用快照</small>` : ''}</button><div class="manager-actions"><button data-start-workout-template="${template.id}">开始</button><button data-duplicate-workout-template="${template.id}">复制</button><button class="danger" data-delete-workout-template="${template.id}">删除</button></div></article>`
    }).join('') : '<p class="muted padded">没有匹配的训练模板</p>'
    bindWorkoutTemplateManagerActions(dialog, templates)
  }
  draw(query)
  dialog.querySelector<HTMLInputElement>('#workout-template-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector('#new-workout-template')?.addEventListener('click', () => { dialog.close(); void showWorkoutTemplateEditor() })
}

function bindWorkoutTemplateManagerActions(dialog: HTMLDialogElement, templates: WorkoutTemplate[]): void {
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-workout-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.editWorkoutTemplate)
    if (template) { dialog.close(); void showWorkoutTemplateEditor(template) }
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-start-workout-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.startWorkoutTemplate)
    if (template) void launchWorkoutTemplate(template, dialog)
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-duplicate-workout-template]').forEach((button) => button.addEventListener('click', async () => {
    const template = templates.find((item) => item.id === button.dataset.duplicateWorkoutTemplate)
    if (!template) return
    try { await db.workoutTemplates.add(duplicateWorkoutTemplate(template)); dialog.close(); toast('模板已复制'); await showWorkoutTemplateManager() } catch (error) { fail(error) }
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-workout-template]').forEach((button) => button.addEventListener('click', async () => {
    if (!await confirmAction('删除训练模板？', '只删除模板，历史训练不会受影响。')) return
    try { await db.workoutTemplates.delete(button.dataset.deleteWorkoutTemplate!); dialog.close(); toast('模板已删除，历史训练未受影响'); await showWorkoutTemplateManager() } catch (error) { fail(error) }
  }))
}

async function showWorkoutTemplateEditor(source?: WorkoutTemplate): Promise<void> {
  const draft = source ? structuredClone(source) : { id: crypto.randomUUID(), name: '', exercises: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const exerciseIds = draft.exercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))
  const existingIds = new Set((await db.exercises.bulkGet(exerciseIds)).filter((item): item is Exercise => Boolean(item)).map((item) => item.id))
  const dialog = openModal(source?.createdAt ? '编辑训练模板' : '新建训练模板', '<div id="workout-template-editor"></div>', true)
  const draw = () => {
    dialog.querySelector('#workout-template-editor')!.innerHTML = `<form id="workout-template-form" class="form template-editor"><label>模板名称 *<input name="name" value="${esc(draft.name)}" placeholder="推举训练" required></label><label>说明<textarea name="description" rows="2" placeholder="可选">${esc(draft.description)}</textarea></label><div class="template-editor-items">${draft.exercises.map((exercise, index) => workoutTemplateExerciseEditorHtml(exercise, index, draft.exercises.length, Boolean(exercise.exerciseId && !existingIds.has(exercise.exerciseId)))).join('') || '<p class="muted padded">还没有动作</p>'}</div><button type="button" class="secondary" id="add-template-exercise">${icon('plus', 18)} 添加动作</button><button class="primary" type="submit">保存模板</button></form>`
    bindWorkoutTemplateEditor()
  }
  const syncText = () => {
    const form = dialog.querySelector<HTMLFormElement>('#workout-template-form')
    if (!form) return
    const data = new FormData(form); draft.name = valueOf(data, 'name'); draft.description = valueOf(data, 'description').trim() || undefined
  }
  const bindWorkoutTemplateEditor = () => {
    const form = dialog.querySelector<HTMLFormElement>('#workout-template-form')!
    form.querySelectorAll<HTMLInputElement>('[data-template-set]').forEach((input) => input.addEventListener('input', () => {
      const exercise = draft.exercises.find((item) => item.id === input.closest<HTMLElement>('[data-template-exercise]')?.dataset.templateExercise)
      const set = exercise?.sets.find((item) => item.id === input.closest<HTMLElement>('[data-template-set-row]')?.dataset.templateSetRow)
      if (!set) return
      if (input.dataset.templateSet === 'reps') set.reps = input.value === '' ? 0 : Number(input.value)
      if (input.dataset.templateSet === 'weightKg') set.weightKg = input.value === '' ? undefined : Number(input.value)
      if (input.dataset.templateSet === 'note') set.note = input.value.trim() || undefined
    }))
    form.querySelectorAll<HTMLTextAreaElement>('[data-template-exercise-note]').forEach((input) => input.addEventListener('input', () => {
      const exercise = draft.exercises.find((item) => item.id === input.dataset.templateExerciseNote); if (exercise) exercise.note = input.value.trim() || undefined
    }))
    form.querySelectorAll<HTMLButtonElement>('[data-template-add-set]').forEach((button) => button.addEventListener('click', () => {
      syncText(); const exercise = draft.exercises.find((item) => item.id === button.dataset.templateAddSet)!
      const previous = exercise.sets.at(-1); exercise.sets.push({ id: crypto.randomUUID(), weightKg: previous?.weightKg, reps: previous?.reps ?? 10 }); draw()
    }))
    form.querySelectorAll<HTMLButtonElement>('[data-template-remove-set]').forEach((button) => button.addEventListener('click', () => {
      syncText(); const exercise = draft.exercises.find((item) => item.id === button.closest<HTMLElement>('[data-template-exercise]')?.dataset.templateExercise)!
      exercise.sets = exercise.sets.filter((set) => set.id !== button.dataset.templateRemoveSet); draw()
    }))
    form.querySelectorAll<HTMLButtonElement>('[data-template-remove-exercise]').forEach((button) => button.addEventListener('click', () => { syncText(); draft.exercises = draft.exercises.filter((item) => item.id !== button.dataset.templateRemoveExercise); draw() }))
    form.querySelectorAll<HTMLButtonElement>('[data-template-move]').forEach((button) => button.addEventListener('click', () => {
      syncText(); const index = draft.exercises.findIndex((item) => item.id === button.dataset.templateMove); const next = index + Number(button.dataset.direction)
      if (index < 0 || next < 0 || next >= draft.exercises.length) return
      const [moved] = draft.exercises.splice(index, 1); draft.exercises.splice(next, 0, moved!); draw()
    }))
    form.querySelector('#add-template-exercise')?.addEventListener('click', () => { syncText(); dialog.close(); void showWorkoutTemplateExercisePicker(draft) })
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); syncText()
      try { await saveWorkoutTemplate(draft); dialog.close(); toast('训练模板已保存'); await showWorkoutTemplateManager() } catch (error) { fail(error) }
    })
  }
  draw()
}

function workoutTemplateExerciseEditorHtml(exercise: WorkoutTemplateExercise, index: number, count: number, missing: boolean): string {
  return `<article class="exercise-card template-exercise" data-template-exercise="${exercise.id}"><div class="exercise-head"><div><h3>${esc(exercise.exerciseName)}</h3>${missing ? '<small class="warning-text">动作已删除，将使用名称快照</small>' : ''}</div><div class="reorder-actions"><button type="button" data-template-move="${exercise.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="上移">↑</button><button type="button" data-template-move="${exercise.id}" data-direction="1" ${index === count - 1 ? 'disabled' : ''} aria-label="下移">↓</button><button type="button" class="icon-btn quiet danger" data-template-remove-exercise="${exercise.id}" aria-label="删除动作">${icon('trash', 17)}</button></div></div><div class="sets"><div class="set-header"><span>组</span><span>重量 <small>kg</small></span><span>次数</span><span></span></div>${exercise.sets.map((set, setIndex) => `<div class="set-row" data-template-set-row="${set.id}"><span>${setIndex + 1}</span><input data-template-set="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg ?? ''}" placeholder="—"><input data-template-set="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}" placeholder="—"><button type="button" class="icon-btn quiet danger" data-template-remove-set="${set.id}" aria-label="删除第${setIndex + 1}组">${icon('x', 17)}</button><input class="set-note" data-template-set="note" value="${esc(set.note)}" placeholder="本组备注（可选）"></div>`).join('')}</div><button type="button" class="text-btn add-set" data-template-add-set="${exercise.id}">${icon('plus', 17)} 添加一组</button><label class="compact-label">动作备注<textarea data-template-exercise-note="${exercise.id}" rows="2" placeholder="可选">${esc(exercise.note)}</textarea></label></article>`
}

async function showWorkoutTemplateExercisePicker(draft: WorkoutTemplate): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  const dialog = openModal('添加模板动作', `<label class="search-field">${icon('search', 19)}<input id="template-exercise-search" type="search" placeholder="搜索动作"></label><div id="template-exercise-results" class="picker-list"></div>`, true)
  const draw = (query = '') => {
    const matches = exercises.filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    dialog.querySelector('#template-exercise-results')!.innerHTML = matches.map((exercise) => `<button class="picker-item" data-pick-template-exercise="${exercise.id}"><strong>${esc(exercise.name)}</strong></button>`).join('') || '<p class="muted">没有匹配动作</p>'
    dialog.querySelectorAll<HTMLButtonElement>('[data-pick-template-exercise]').forEach((button) => button.addEventListener('click', () => {
      const exercise = exercises.find((item) => item.id === button.dataset.pickTemplateExercise)!
      draft.exercises.push({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [{ id: crypto.randomUUID(), reps: 10 }] })
      dialog.close(); void showWorkoutTemplateEditor(draft)
    }))
  }
  draw(); dialog.querySelector<HTMLInputElement>('#template-exercise-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
}

function saveWorkoutAsTemplate(workout: Workout): void {
  const suggested = defaultTemplateName(workout.date, '训练')
  const dialog = openModal('保存为训练模板', `<form id="save-workout-as-template" class="form"><label>模板名称<input name="name" value="${esc(suggested)}" required></label><p class="muted">模板与这次训练相互独立，之后修改不会影响历史。</p><button class="primary" type="submit">保存模板</button></form>`)
  dialog.querySelector<HTMLFormElement>('#save-workout-as-template')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    try { await db.workoutTemplates.add(workoutTemplateFromWorkout(workout, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'name'))); dialog.close(); toast('已保存为训练模板') } catch (error) { fail(error) }
  })
}

async function showDietTemplatePicker(): Promise<void> {
  const templates = sortTemplates(await db.dietTemplates.toArray())
  const cards = await Promise.all(templates.slice(0, 5).map(dietTemplateCardHtml))
  const dialog = openModal('使用饮食模板', `<div class="template-picker">${templates.length ? `<div class="template-list">${cards.join('')}</div>` : '<div class="empty compact minimal"><h3>还没有饮食模板</h3><p>把常吃的食物组合保存起来，下次一键添加。</p></div>'}<div class="template-picker-actions"><button id="manage-diet-templates">${templates.length ? '管理全部模板' : '创建第一个模板'}</button></div></div>`, true)
  dialog.querySelector('#manage-diet-templates')?.addEventListener('click', () => { dialog.close(); void showDietTemplateManager() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-apply-diet-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.applyDietTemplate); if (template) void applySelectedDietTemplate(template, dialog)
  }))
}

async function dietTemplateCardHtml(template: DietTemplate): Promise<string> {
  const resolved = await resolveDietTemplateFoods(template)
  const calories = resolved.reduce((sum, value) => sum + calculateNutrition(value.food, value.item.grams).calories, 0)
  const names = template.items.slice(0, 4).map((item) => esc(item.foodName)).join(' · ')
  const goal = template.nutritionGoal?.calories === undefined ? '' : ` · 目标 ${formatNumber(template.nutritionGoal.calories)} kcal`
  return `<article class="template-card"><div><h3>${esc(template.name)}</h3><p>${names || '暂无食物'}</p><small>${template.items.length} 项 · ${formatNumber(calories)} kcal${goal}</small></div><button class="primary compact-button" data-apply-diet-template="${template.id}">添加</button></article>`
}

async function applySelectedDietTemplate(template: DietTemplate, dialog?: HTMLDialogElement): Promise<void> {
  try {
    const resolved = await resolveDietTemplateFoods(template)
    try {
      await applyDietTemplate(template, foodDate)
    } catch (error) {
      if (!(error instanceof NutritionTargetConflictError)) throw error
      const choice = await chooseNutritionTargetConflict()
      if (!choice) return
      await applyDietTemplate(template, foodDate, db, choice === 'replace' ? { replaceNutritionTarget: true } : { preserveNutritionTarget: true })
    }
    dialog?.close()
    const missing = resolved.filter((item) => item.missing).length
    toast(missing ? `已添加 ${template.items.length} 项，${missing} 项使用模板快照` : `已添加 ${template.items.length} 项`)
    await renderFoodPage()
  } catch (error) { fail(error) }
}

async function showDietTemplateManager(query = ''): Promise<void> {
  const templates = sortTemplates(await db.dietTemplates.toArray())
  const summaries = new Map<string, string>()
  await Promise.all(templates.map(async (template) => {
    const resolved = await resolveDietTemplateFoods(template)
    const kcal = resolved.reduce((sum, value) => sum + calculateNutrition(value.food, value.item.grams).calories, 0)
    const missing = resolved.filter((item) => item.missing).length
    const goal = template.nutritionGoal?.calories === undefined ? '' : ` · 目标 ${formatNumber(template.nutritionGoal.calories)} kcal`
    summaries.set(template.id, `${template.items.length} 项 · ${formatNumber(kcal)} kcal${goal}${missing ? ` · ${missing} 项使用快照` : ''}`)
  }))
  const dialog = openModal('饮食模板', `<div class="toolbar"><label class="search-field">${icon('search', 19)}<input id="diet-template-search" type="search" value="${esc(query)}" placeholder="搜索模板"></label><button class="icon-btn add-button" id="new-diet-template" aria-label="新建饮食模板">${icon('plus')}</button></div><div class="template-manager-list"></div>`, true)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase(); const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? filtered.map((template) => `<article class="manager-card"><button class="manager-main" data-edit-diet-template="${template.id}"><strong>${esc(template.name)}</strong><span>${esc(summaries.get(template.id))}</span></button><div class="manager-actions"><button data-apply-diet-template="${template.id}">添加</button><button data-duplicate-diet-template="${template.id}">复制</button><button class="danger" data-delete-diet-template="${template.id}">删除</button></div></article>`).join('') : '<p class="muted padded">没有匹配的饮食模板</p>'
    bindDietTemplateManagerActions(dialog, templates)
  }
  draw(query); dialog.querySelector<HTMLInputElement>('#diet-template-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector('#new-diet-template')?.addEventListener('click', () => { dialog.close(); void showDietTemplateEditor() })
}

function bindDietTemplateManagerActions(dialog: HTMLDialogElement, templates: DietTemplate[]): void {
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-diet-template]').forEach((button) => button.addEventListener('click', () => { const template = templates.find((item) => item.id === button.dataset.editDietTemplate); if (template) { dialog.close(); void showDietTemplateEditor(template) } }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-apply-diet-template]').forEach((button) => button.addEventListener('click', () => { const template = templates.find((item) => item.id === button.dataset.applyDietTemplate); if (template) void applySelectedDietTemplate(template, dialog) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-duplicate-diet-template]').forEach((button) => button.addEventListener('click', async () => { const template = templates.find((item) => item.id === button.dataset.duplicateDietTemplate); if (!template) return; try { await db.dietTemplates.add(duplicateDietTemplate(template)); dialog.close(); toast('模板已复制'); await showDietTemplateManager() } catch (error) { fail(error) } }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-diet-template]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除饮食模板？', '只删除模板，历史饮食记录不会受影响。')) return; try { await db.dietTemplates.delete(button.dataset.deleteDietTemplate!); dialog.close(); toast('模板已删除，历史记录未受影响'); await showDietTemplateManager() } catch (error) { fail(error) } }))
}

async function showDietTemplateEditor(source?: DietTemplate): Promise<void> {
  const draft: DietTemplate = source ? structuredClone(source) : { id: crypto.randomUUID(), name: '', items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const resolved = await resolveDietTemplateFoods(draft)
  const missingIds = new Set(resolved.filter((item) => item.missing).map((item) => item.item.id))
  const dialog = openModal(source?.createdAt ? '编辑饮食模板' : '新建饮食模板', '<div id="diet-template-editor"></div>', true)
  const syncText = () => {
    const form = dialog.querySelector<HTMLFormElement>('#diet-template-form'); if (!form) return
    const data = new FormData(form); draft.name = valueOf(data, 'name'); draft.description = valueOf(data, 'description').trim() || undefined; draft.nutritionGoal = nutritionGoalFromForm(data)
  }
  const draw = () => {
    dialog.querySelector('#diet-template-editor')!.innerHTML = `<form id="diet-template-form" class="form template-editor"><label>模板名称 *<input name="name" value="${esc(draft.name)}" placeholder="训练日早餐" required></label><label>说明<textarea name="description" rows="2" placeholder="可选">${esc(draft.description)}</textarea></label>${nutritionGoalFields(draft.nutritionGoal)}<div class="template-editor-items">${draft.items.map((item, index) => `<article class="diet-template-item" data-diet-template-item="${item.id}"><div><strong>${esc(item.foodName)}</strong>${item.brand ? `<small>${esc(item.brand)}</small>` : ''}${missingIds.has(item.id) ? '<small class="warning-text">食物已删除，将使用营养快照</small>' : ''}</div><label><input data-diet-grams type="number" inputmode="decimal" min="0.1" step="0.1" value="${item.grams}"><span>g</span></label><div class="reorder-actions"><button type="button" data-diet-move="${item.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-diet-move="${item.id}" data-direction="1" ${index === draft.items.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="icon-btn quiet danger" data-remove-diet-item="${item.id}">${icon('trash', 17)}</button></div></article>`).join('') || '<p class="muted padded">还没有食物</p>'}</div><button type="button" class="secondary" id="add-diet-template-food">${icon('plus', 18)} 添加食物</button><button class="primary" type="submit">保存模板</button></form>`
    bind()
  }
  const bind = () => {
    const form = dialog.querySelector<HTMLFormElement>('#diet-template-form')!
    form.querySelectorAll<HTMLInputElement>('[data-diet-grams]').forEach((input) => input.addEventListener('input', () => { const item = draft.items.find((value) => value.id === input.closest<HTMLElement>('[data-diet-template-item]')?.dataset.dietTemplateItem); if (item) item.grams = Number(input.value) }))
    form.querySelectorAll<HTMLButtonElement>('[data-remove-diet-item]').forEach((button) => button.addEventListener('click', () => { syncText(); draft.items = draft.items.filter((item) => item.id !== button.dataset.removeDietItem); draw() }))
    form.querySelectorAll<HTMLButtonElement>('[data-diet-move]').forEach((button) => button.addEventListener('click', () => { syncText(); const index = draft.items.findIndex((item) => item.id === button.dataset.dietMove); const next = index + Number(button.dataset.direction); if (index < 0 || next < 0 || next >= draft.items.length) return; const [moved] = draft.items.splice(index, 1); draft.items.splice(next, 0, moved!); draw() }))
    form.querySelector('#add-diet-template-food')?.addEventListener('click', () => { syncText(); dialog.close(); void showDietTemplateFoodPicker(draft) })
    form.addEventListener('submit', async (event) => { event.preventDefault(); syncText(); try { await saveDietTemplate(draft); dialog.close(); toast('饮食模板已保存'); await showDietTemplateManager() } catch (error) { fail(error) } })
  }
  draw()
}

async function showDietTemplateFoodPicker(draft: DietTemplate): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  const dialog = openModal('添加模板食物', `<label class="search-field">${icon('search', 19)}<input id="diet-template-food-search" type="search" placeholder="搜索食物或品牌"></label><div id="diet-template-food-results" class="picker-list"></div>`, true)
  const draw = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase(); const matches = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('#diet-template-food-results')!.innerHTML = matches.map((food) => `<button class="picker-item" data-pick-diet-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}</span><em>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</em></button>`).join('') || '<p class="muted">食物库中没有匹配项</p>'
    dialog.querySelectorAll<HTMLButtonElement>('[data-pick-diet-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.pickDietFood)!; draft.items.push(dietTemplateItemFromFood(food, 100)); dialog.close(); void showDietTemplateEditor(draft) }))
  }
  draw(); dialog.querySelector<HTMLInputElement>('#diet-template-food-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
}

async function saveDayAsDietTemplate(logs: FoodLog[]): Promise<void> {
  const target = await db.nutritionTargets.where('date').equals(foodDate).first()
  const suggested = defaultTemplateName(foodDate, '饮食')
  const dialog = openModal('保存当天为饮食模板', `<form id="save-day-diet-template-form" class="form"><label>模板名称<input name="name" value="${esc(suggested)}" required></label><p class="muted">保存当前 ${logs.length} 项记录，之后修改模板不会影响今天的饮食记录。</p><button class="primary" type="submit">保存模板</button></form>`)
  dialog.querySelector<HTMLFormElement>('#save-day-diet-template-form')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await db.dietTemplates.add(dietTemplateFromLogs(logs, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'name'), target)); dialog.close(); toast(target ? '已保存饮食与营养目标模板' : '已保存为饮食模板') } catch (error) { fail(error) } })
}

async function renderWeightPage(withProgressTabs = false): Promise<void> {
  const today = getLocalDateString()
  const weights = await db.weights.orderBy('date').reverse().toArray()
  const selectedWeight = weights.find((item) => item.date === weightDate)
  const latest = weights[0]
  const isToday = weightDate === today
  const heroWeight = isToday ? selectedWeight ?? latest : selectedWeight
  const cutoff = new Date(); if (weightRange !== 'all') cutoff.setDate(cutoff.getDate() - Number(weightRange) + 1)
  const cutoffString = weightRange === 'all' ? '' : getLocalDateString(cutoff)
  const chartWeights = weights.filter((item) => weightRange === 'all' || item.date >= cutoffString).reverse()
  const monthCutoff = new Date(); monthCutoff.setDate(monthCutoff.getDate() - 29)
  const monthWeights = weights.filter((item) => item.date >= getLocalDateString(monthCutoff))
  const delta = monthWeights.length > 1 && latest ? latest.weightKg - monthWeights.at(-1)!.weightKg : undefined
  const view = document.querySelector<HTMLElement>('#view')!
  const heroLabel = isToday ? heroWeight === latest && !selectedWeight ? '最新体重' : '今日体重' : `${formatShortDate(weightDate)} 体重`
  const changeText = isToday && heroWeight ? `<span class="weight-change">${delta === undefined ? '记录更多数据后显示 30 天变化' : `${delta > 0 ? '+' : ''}${formatNumber(delta)} kg · 30天`}</span>` : ''
  view.innerHTML = `${withProgressTabs ? progressTabsHtml() : ''}<section class="weight-hero"><p>${heroWeight ? heroLabel : '体重记录'}</p>${heroWeight ? `<div class="hero-number"><strong>${formatNumber(heroWeight.weightKg)}</strong><span>kg</span></div>${changeText}` : `<div class="empty-inline">这一天还没有体重记录</div>`}<button class="primary record-weight" id="record-weight">${icon(selectedWeight ? 'edit' : 'plus', 18)} ${selectedWeight ? '修改体重' : '记录体重'}</button></section><section class="chart-card"><div class="section-head"><div><h2>体重趋势</h2><span>${weightRange === 'all' ? '全部记录' : `最近 ${weightRange} 天`}</span></div></div>${chartWeights.length > 1 ? '<div class="chart-wrap"><canvas id="weight-chart"></canvas></div>' : `<div class="trend-placeholder"><span class="empty-icon">${icon('activity', 23)}</span><p>${chartWeights.length === 1 ? '再记录一次体重后即可查看趋势' : '记录体重后会显示趋势图'}</p></div>`}<div class="segmented" aria-label="体重图表范围"><button data-range="30" class="${weightRange === '30' ? 'active' : ''}">30天</button><button data-range="90" class="${weightRange === '90' ? 'active' : ''}">90天</button><button data-range="all" class="${weightRange === 'all' ? 'active' : ''}">全部</button></div></section><section class="section-head"><div><h2>历史记录</h2><span>${weights.length} 条</span></div></section><div class="weight-list">${weights.map((item) => `<article class="weight-row"><button data-edit-weight="${item.id}"><span>${formatShortDate(item.date)}</span><strong>${formatNumber(item.weightKg)} <small>kg</small></strong></button><button class="icon-btn row-delete" data-delete-weight="${item.id}" aria-label="删除 ${formatShortDate(item.date)} 的体重">${icon('trash', 17)}</button></article>`).join('') || `<div class="empty minimal"><div class="empty-icon">${icon('scale', 24)}</div><h3>还没有体重记录</h3><p>记录第一次体重，开始观察长期趋势。</p></div>`}</div>`
  if (withProgressTabs) bindProgressTabs(view)
  view.querySelector('#record-weight')?.addEventListener('click', () => showWeightForm(weightDate, selectedWeight?.weightKg))
  view.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((button) => button.addEventListener('click', () => {
    weightRange = button.dataset.range as typeof weightRange
    const nextCutoff = new Date()
    if (weightRange !== 'all') nextCutoff.setDate(nextCutoff.getDate() - Number(weightRange) + 1)
    const nextStart = weightRange === 'all' ? '' : getLocalDateString(nextCutoff)
    const nextWeights = weights.filter((item) => item.date >= nextStart).reverse()
    if (!weightChart || nextWeights.length < 2) { weightChart?.destroy(); weightChart = undefined; void renderWeightPage(withProgressTabs).catch(fail); return }
    weightChart.data.labels = nextWeights.map((item) => formatShortDate(item.date))
    weightChart.data.datasets[0]!.data = nextWeights.map((item) => item.weightKg)
    weightChart.update()
    view.querySelector('.chart-card .section-head span')!.textContent = weightRange === 'all' ? '全部记录' : `最近 ${weightRange} 天`
    view.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((item) => item.classList.toggle('active', item.dataset.range === weightRange))
  }))
  view.querySelectorAll<HTMLButtonElement>('[data-delete-weight]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除体重记录？', '删除后无法撤销。')) return; try { await db.weights.delete(button.dataset.deleteWeight!); toast('已删除'); await render() } catch (error) { fail(error) } }))
  view.querySelectorAll<HTMLButtonElement>('[data-edit-weight]').forEach((button) => button.addEventListener('click', () => { const item = weights.find((weight) => weight.id === button.dataset.editWeight)!; showWeightForm(item.date, item.weightKg) }))
  if (chartWeights.length > 1) {
    const canvas = view.querySelector<HTMLCanvasElement>('#weight-chart')!
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--accent').trim()
    const muted = styles.getPropertyValue('--text-secondary').trim()
    const grid = styles.getPropertyValue('--divider').trim()
    weightChart = new Chart(canvas, { type: 'line', data: { labels: chartWeights.map((item) => formatShortDate(item.date)), datasets: [{ data: chartWeights.map((item) => item.weightKg), borderColor: accent, backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 2.3, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: accent }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 }, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5 } }, y: { border: { display: false }, ticks: { color: muted, callback: (value) => `${value}kg`, maxTicksLimit: 5 }, grid: { color: grid } } } } })
  }
}

function showWeightForm(date: string, value?: number): void {
  const title = value === undefined ? date === getLocalDateString() ? '今日体重' : '记录体重' : '编辑体重'
  const dialog = openModal(title, `<form id="weight-sheet-form" class="form weight-sheet-form"><p>${formatHeaderDate(date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${value ?? ''}" placeholder="72.4" required autofocus><b>kg</b></label><button class="primary" type="submit">保存</button></form>`)
  dialog.querySelector<HTMLFormElement>('#weight-sheet-form')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await upsertWeight(date, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'weight')); dialog.close(); toast('已保存'); await render() } catch (error) { fail(error) } })
}

async function showSettings(): Promise<void> {
  let persistText = '浏览器不支持'
  try { if (navigator.storage?.persist) persistText = await navigator.storage.persist() ? '已授权' : '未授权' } catch { persistText = '未授权' }
  const lastBackup = formatBackupTime(localStorage.getItem(LAST_BACKUP_KEY))
  const dialog = openModal('备份与恢复', `<section class="settings-section"><h3>数据</h3><div class="settings-group"><button id="export-backup"><span class="setting-icon">${icon('download', 18)}</span><span><strong>导出完整备份</strong><small>上次导出：<b id="last-backup">${esc(lastBackup)}</b></small></span>${icon('chevron', 17)}</button><button id="restore-backup"><span class="setting-icon">${icon('upload', 18)}</span><span><strong>恢复完整备份</strong><small>从备份文件覆盖当前数据</small></span>${icon('chevron', 17)}</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div></section><section class="settings-section"><h3>存储</h3><div class="data-safety"><div class="setting-icon">${icon('archive', 18)}</div><div><strong>数据保存在当前设备。清除 Safari 网站数据或更换设备前，请先导出备份。</strong><p>本地数据库 · 持久化存储：${persistText}</p></div></div></section>`)
  dialog.querySelector('#export-backup')?.addEventListener('click', async () => { try { const backup = await exportBackup(); const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fitlog-backup-${getLocalDateString()}.json`; link.click(); URL.revokeObjectURL(link.href); const exportedAt = new Date().toISOString(); localStorage.setItem(LAST_BACKUP_KEY, exportedAt); const label = dialog.querySelector('#last-backup'); if (label) label.textContent = formatBackupTime(exportedAt); toast('备份已导出') } catch (error) { fail(error) } })
  const fileInput = dialog.querySelector<HTMLInputElement>('#backup-file')!
  dialog.querySelector('#restore-backup')?.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; try { const backup = validateBackup(JSON.parse(await file.text())); dialog.close(); showRestorePreview(backup) } catch (error) { fail(error) } })
}

function showRestorePreview(backup: BackupDataV3): void {
  const counts = [{ label: '食物', count: backup.data.foods.length }, { label: '饮食记录', count: backup.data.foodLogs.length }, { label: '动作', count: backup.data.exercises.length }, { label: '力量训练', count: backup.data.workouts.length }, { label: '体重', count: backup.data.weights.length }, { label: '训练模板', count: backup.data.workoutTemplates.length }, { label: '饮食模板', count: backup.data.dietTemplates.length }, { label: '营养目标', count: backup.data.nutritionTargets.length }, { label: '凯格尔训练', count: backup.data.pelvicFloorSessions.length }]
  const dialog = openModal('确认恢复备份', `<div class="restore-counts">${counts.map((item) => `<p><span>${item.label}</span><strong>${item.count}</strong></p>`).join('')}</div><div class="warning">恢复将清除当前所有数据，并替换为该备份。</div><button class="danger-button full-btn" id="confirm-restore">继续恢复</button>`)
  dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => { if (!await confirmAction('覆盖当前全部数据？', '恢复会清除当前数据并替换为备份内容，此操作无法撤销。', '恢复备份')) return; try { await restoreBackup(backup); dialog.close(); currentWorkout = undefined; workoutEditorOpen = false; toast('恢复完成'); await render() } catch (error) { fail(error) } })
}

async function start(): Promise<void> {
  setupMobileViewport()
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    document.querySelectorAll<HTMLDetailsElement>('details.row-menu[open]').forEach((menu) => {
      if (!target || !menu.contains(target)) menu.removeAttribute('open')
    })
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && workoutEditorOpen && currentWorkout) void flushWorkoutAutosave(currentWorkout).catch(fail)
    if (document.visibilityState === 'hidden' && pelvicTimerState) void releasePelvicWakeLock()
    if (document.visibilityState === 'visible' && pelvicTimerState) {
      tickPelvicFloorTimer()
      if (pelvicTimerState.status !== 'paused' && pelvicTimerState.status !== 'completed') void requestPelvicWakeLock()
    }
  })
  try { await db.open(); await render() } catch (error) { app.innerHTML = `<div class="fatal"><h1>无法打开 FitLog Lite</h1><p>${esc(error instanceof Error ? error.message : '请刷新后重试')}</p></div>` }
}

void start()
