import { setupInputModality } from './ui/inputModality'
import { openSheet, presentDialog, setupSheetViewport } from './ui/sheetController'
import './styles/interaction.css'
import './styles/sheets.css'
import { mountDatePicker, datePickerLabel, type DatePickerController } from './ui/datePicker'
import { showGitHubSync, githubSyncDetail } from './ui/githubSync'
import './styles/main.css'
import './styles/primitives.css'
import './styles/plan.css'
import './styles/ai.css'
import './styles/foodVision.css'
import { bindEnergyEditor } from './ui/energyEditor'
import { showFoodVisionImport } from './ui/foodVisionImport'
import { showAiSettings, aiSettingsDetail } from './ui/aiSettings'
import { consumeQuickLaunch } from './ui/quickLaunch'
import { showAiAssistant, type AiAssistantLaunchOptions, type AiAssistantHandle } from './ui/aiAssistant'
import { AiOrchestrator } from './ai/orchestrator'
import { Chart, registerables } from 'chart.js'
import { registerSW } from 'virtual:pwa-register'
import { db } from './db/database'
import { applyNutritionCompletionPlan } from './services/nutritionCompletionService'
import { completeNutrition, completionKeys, getNutritionCompletionSummary, isFutureBusinessDate, type NutritionCompletionSummary } from './utils/nutritionCompletion'
import { completionDateLabel, completionGapText, completionLabels } from './ui/nutritionCompletion'
import type { CardioActivityType, CardioSession, DietTemplate, Exercise, Food, FoodLog, Habit, HabitCheckIn, MealType, NutritionGoal, NutritionTarget, Task, TaskTag, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate, WorkoutTemplateExercise } from './db/types'
import { exportBackup, restoreBackup, validateBackup, type ValidatedBackup } from './services/backupService'
import { clearDayRecords } from './services/dayRecordsService'
import { deleteCardioSession, getCardioSessionsByDate, saveCardioSession, updateCardioSession } from './services/cardioService'
import { logFood, saveFood, updateFoodLogDetails, validateFoodInput } from './services/foodService'
import { buildImportPreview, parseFoodCsv, parseFoodJson, type ImportPreview } from './services/importService'
import { upsertWeight } from './services/weightService'
import { createHabit, deleteUnusedHabit, getActiveHabits, getHabitCheckInsByDate, reorderHabits, setHabitActive, toggleHabitCheckIn, updateHabit } from './services/habitService'
import { createTask, deleteTask, getInboxTasks, getTasksByDate, getUpcomingTasks, sortTasksForPlan, toggleTaskCompletion, updateTask } from './services/taskService'
import { createTaskTag, deleteTaskTag, getTaskTags, getTaskTagUsageCount, updateTaskTag } from './services/taskTagService'
import { loadReport } from './services/reportService'
import { deleteNutritionTarget, normalizeNutritionGoal, saveNutritionTarget } from './services/nutritionTargetService'
import { deletePelvicFloorSession, pelvicFloorSessionDurationSeconds, savePelvicFloorSession, sessionFromPelvicFloorTimer } from './services/pelvicFloorService'
import { getPelvicFloorPlanProgress, pelvicFloorPlanLevelFromId, pelvicFloorPlanLevels, pelvicFloorPlanRoutineId, type PelvicFloorPlanLevel, type PelvicFloorPlanProgress } from './services/pelvicFloorPlan'
import {
  advancePelvicFloorTimer, createPelvicFloorTimer, finishPelvicFloorTimer, getPelvicFloorPhaseProgress, getPelvicFloorRemainingSeconds, getPelvicFloorRoutineDurationSeconds,
  pausePelvicFloorTimer, resumePelvicFloorTimer, startPelvicFloorTimer, pelvicFloorRoutines, type PelvicFloorRoutine, type PelvicFloorTimerState,
} from './services/pelvicFloorTimer'
import { createWorkout, findOpenWorkout, finishWorkout, normalizeWorkoutForSave, saveExercise, saveWorkout, WorkoutAutosaveController } from './services/workoutService'
import {
  NutritionTargetConflictError, applyDietTemplate, dietTemplateFromLogs, dietTemplateItemFromFood, duplicateDietTemplate, duplicateWorkoutTemplate,
  resolveDietTemplateFoods, saveDietTemplate, saveWorkoutTemplate,
  sortTemplates, startWorkoutFromTemplate, workoutTemplateFromWorkout,
} from './services/templateService'
import { calendarCategories, calendarCategoryIcons, calendarLegendLabels, getCalendarDayAccessibleLabel, hasDayRecords, loadMonthSummaries, renderMonthCalendar, type CalendarDaySummary } from './ui/calendarPage'
import { buildCalendarDayDetailRows } from './ui/dayDetail'
import { foodPagerLabel, foodRailDates, foodRailFocus, foodRailNeedsRecenter, isCurrentFoodRender, shouldCommitFoodDate, shouldShowFoodTodayShortcut } from './ui/foodPager'
import { icon, type IconName } from './ui/icons'
import { habitPlanText, habitTodaySummary, habitWeekdayLabels } from './ui/habitPresentation'
import { getGoalProgress } from './ui/progressRing'
import { groupFoodLogs, isMealType, mealNames, mealTypes, type FoodMealGroup } from './utils/foodMeals'
import { formatShortDate, getLocalDateString, shiftLocalDate } from './utils/date'
import { findActiveHashtagQuery, normalizeTaskTagName, replaceActiveHashtagQuery, validateTaskTagName, type ActiveHashtagQuery } from './utils/taskTags'
import { energyToKcal, kcalToKj, type EnergyUnit } from './utils/energy'
import { calculateNutrition, formatNumber } from './utils/nutrition'
import { cardioActivityDefinitions, formatCardioMetrics, getCardioActivityLabel, getCardioActivityType } from './utils/cardio'
import { getReportRange, shiftReportPeriod, type ReportMode, type ReportResult } from './utils/reporting'
import { getTodayPelvicState, getTodayWeightState } from './utils/todayActivity'

Chart.register(...registerables)
registerSW({ immediate: true })

type Tab = 'today' | 'plan' | 'food' | 'workout' | 'progress'
type ProgressView = 'trend' | 'calendar' | 'reports'
type PlanView = 'today' | 'upcoming' | 'inbox'
let activeTab: Tab = 'today'
let planView: PlanView = 'today'
let planTagFilterId: string | undefined
let planCompletedOpen = false
let progressView: ProgressView = 'trend'
let calendarSelectedDate = getLocalDateString()
let calendarYear = new Date().getFullYear()
let calendarMonth = new Date().getMonth()
let foodDate = getLocalDateString()
let foodHeaderEvents: AbortController | undefined
let foodRailEvents: AbortController | undefined
let foodContentVersion = 0
let workoutDate = getLocalDateString()
let weightDate = getLocalDateString()
let currentWorkout: Workout | undefined
let workoutEditorOpen = false
let showWorkoutHistory = false
let weightRange: '30' | '90' | 'all' = '30'
let weightChart: Chart | undefined
let reportWeightChart: Chart | undefined
let reportMode: ReportMode = 'week'
let reportAnchorDate = getLocalDateString()
let justFinishedWorkout: Workout | undefined
let pelvicTimerState: PelvicFloorTimerState | undefined
let pelvicTimerDate = getLocalDateString()
let pelvicTimerInterval: number | undefined
let pelvicTimerAnimationFrame: number | undefined
let pelvicTimerElements: { ring: SVGCircleElement; breathing: HTMLElement; countdown: HTMLElement; remaining: HTMLElement; phase: HTMLElement; status: HTMLElement; repetition: HTMLElement; exercise: HTMLElement; pause: HTMLButtonElement } | undefined
let pelvicTimerPainted = { remaining: '', phase: '', status: '', repetition: '', exercise: '', aria: '', pause: '' }
let pelvicSessionSaving = false
let pelvicAudioContext: AudioContext | undefined
let pelvicWakeLock: { release: () => Promise<void> } | undefined
const LAST_BACKUP_KEY = 'fitlog-last-backup-at'
const PELVIC_PLAN_LEVEL_KEY = 'fitlog-pelvic-plan-level'

const aiAssistant = new AiOrchestrator({
  context: () => ({ today: getLocalDateString(), localTime: new Date().toLocaleString('sv-SE'), timezoneOffsetMinutes: new Date().getTimezoneOffset(), activeTab, foodDate, workoutDate, planView }),
  onCommitted: async proposal => {
    if (activeTab === 'today') await renderTodayPage()
    else if (activeTab === 'plan' && proposal.domain === 'plan') await renderPlanPage()
    else if (activeTab === 'food' && ['food', 'nutritionTargets'].includes(proposal.domain)) await renderFoodPage()
    else if (activeTab === 'workout' && proposal.domain === 'training' && !workoutEditorOpen) await renderWorkoutPage()
    else if (activeTab === 'progress' && proposal.domain !== 'plan') { weightChart?.destroy(); weightChart = undefined; reportWeightChart?.destroy(); reportWeightChart = undefined; await renderProgressPage() }
  },
})
const app = document.querySelector<HTMLDivElement>('#app')!
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
const valueOf = (form: FormData, key: string): string => String(form.get(key) ?? '')
const optionalNumber = (form: FormData, key: string): number | undefined => {
  const value = valueOf(form, key).trim()
  return value ? Number(value) : undefined
}

function selectedPelvicPlanLevel(progress: PelvicFloorPlanProgress): PelvicFloorPlanLevel {
  const preference = localStorage.getItem(PELVIC_PLAN_LEVEL_KEY)
  return pelvicFloorPlanLevels.find((level) => level === preference && progress.unlockedLevels.includes(level)) ?? progress.currentLevel
}

function pelvicPlanRoutine(level: PelvicFloorPlanLevel): PelvicFloorRoutine {
  return pelvicFloorRoutines.find((routine) => routine.id === pelvicFloorPlanRoutineId(level))!
}

function pelvicRoutineMinutes(routine: PelvicFloorRoutine): string {
  const seconds = getPelvicFloorRoutineDurationSeconds(routine)
  return `约 ${seconds % 60 === 30 ? seconds / 60 : Math.ceil(seconds / 60)} 分钟`
}


function formatHeaderDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`)
  const today = getLocalDateString()
  const prefix = dateString === today ? '今天 · ' : ''
  const monthDay = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date)
  return `${prefix}${monthDay} · ${weekday}`
}

function formatBackupTime(value: string | null): string {
  if (!value) return '尚未备份'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未备份'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

function setupMobileViewport(): void { setupInputModality(); setupSheetViewport() }

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

function openModal(title: string, body: string, wide = false): HTMLDialogElement { return openSheet(esc(title), body, icon('x'), wide) }

function showBusinessDatePicker(title: string, date: string, commit: (date: string) => void): void {
  const dialog = openModal(title, '<div id="business-date-picker"></div>')
  const picker = mountDatePicker(dialog.querySelector<HTMLElement>('#business-date-picker')!, {
    value: date,
    onConfirm: selected => { dialog.close(); commit(selected!) },
    onCancel: () => dialog.close(),
  })
  dialog.addEventListener('close', () => picker.destroy(), { once: true })
}

function confirmAction(title: string, message: string, confirmLabel = '确认删除', danger = true, cancelLabel = '取消'): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'confirm-dialog'
    dialog.innerHTML = `<div class="confirm-mark ${danger ? 'danger-mark' : ''}">${icon(danger ? 'trash' : 'check', 24)}</div><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dialog-actions"><button data-cancel>${esc(cancelLabel)}</button><button class="${danger ? 'danger-solid' : 'primary'}" data-confirm>${esc(confirmLabel)}</button></div>`
    let result = false
    dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close())
    dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { result = true; dialog.close() })
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result) }, { once: true })
    presentDialog(dialog, true)
  })
}

function chooseNutritionTargetConflict(): Promise<'preserve' | 'replace' | undefined> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'confirm-dialog'
    dialog.innerHTML = `<div class="confirm-mark">${icon('activity', 24)}</div><h2>这一天已经有营养目标</h2><p>添加食物记录时，要保留现有目标，还是使用模板中的目标？</p><div class="dialog-actions"><button data-choice="preserve">保留现有目标</button><button class="primary" data-choice="replace">使用模板目标</button></div>`
    let choice: 'preserve' | 'replace' | undefined
    dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => button.addEventListener('click', () => { choice = button.dataset.choice as 'preserve' | 'replace'; dialog.close() }))
    dialog.addEventListener('close', () => { dialog.remove(); resolve(choice) }, { once: true })
    presentDialog(dialog, true)
  })
}

async function render(): Promise<void> {
  foodHeaderEvents?.abort()
  foodRailEvents?.abort()
  foodContentVersion += 1
  weightChart?.destroy()
  weightChart = undefined
  reportWeightChart?.destroy()
  reportWeightChart = undefined
  document.body.classList.remove('immersive')
  const today = getLocalDateString()
  const hour = new Date().getHours()
  const title = activeTab === 'today' ? (hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好') : activeTab === 'plan' ? '计划' : activeTab === 'food' ? '饮食' : activeTab === 'workout' ? '训练' : '进度'
  const subtitle = activeTab === 'today' ? `${formatHeaderDate(today).replace('今天 · ', '')} · 今天也继续保持` : activeTab === 'workout' ? formatHeaderDate(workoutDate) : activeTab === 'progress' ? '看见每一次积累' : ''
  app.innerHTML = `
    <div class="app-frame">
      <header class="topbar${activeTab === 'today' ? ' today-topbar' : activeTab === 'food' ? ' food-topbar' : ''}"><div><h1>${title}</h1>${subtitle ? `<p class="header-date">${subtitle}</p>` : ''}</div><div class="topbar-page-actions">${activeTab === 'food' ? '<button class="food-page-action" id="use-diet-template" type="button">使用模板</button><button class="food-page-action" id="food-library" type="button">食物库</button>' : ''}${activeTab === 'plan' ? `<button class="icon-btn quiet" id="plan-add-task" type="button" aria-label="新建任务">${icon('plus', 20)}</button>` : ''}<button class="icon-btn quiet topbar-ai" id="open-ai-assistant" type="button" aria-label="AI 助手">${icon('sparkles', 20)}</button><button class="icon-btn quiet topbar-management" id="open-management" type="button" aria-label="管理与设置">${icon('more', 21)}</button></div></header>
      <main id="view" class="${activeTab === 'today' ? 'today-dashboard' : activeTab === 'workout' ? 'workout-page' : ''}" aria-live="polite"></main>
      <nav class="bottom-nav" aria-label="主导航">
        <button data-tab="today" class="${activeTab === 'today' ? 'active' : ''}" aria-current="${activeTab === 'today' ? 'page' : 'false'}">${icon('home', 21)}<span>今日</span></button>
        <button data-tab="plan" class="${activeTab === 'plan' ? 'active' : ''}" aria-current="${activeTab === 'plan' ? 'page' : 'false'}">${icon('calendar', 21)}<span>计划</span></button>
        <button data-tab="food" class="${activeTab === 'food' ? 'active' : ''}" aria-current="${activeTab === 'food' ? 'page' : 'false'}">${icon('utensils', 21)}<span>饮食</span></button>
        <button data-tab="workout" class="${activeTab === 'workout' ? 'active' : ''}" aria-current="${activeTab === 'workout' ? 'page' : 'false'}">${icon('dumbbell', 21)}<span>训练</span></button>
        <button data-tab="progress" class="${activeTab === 'progress' ? 'active' : ''}" aria-current="${activeTab === 'progress' ? 'page' : 'false'}">${icon('trend', 21)}<span>进度</span></button>
      </nav>
    </div>`
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab as Tab
    void render().catch(fail)
  }))
  app.querySelector('#open-ai-assistant')?.addEventListener('click', () => { void launchAssistant().catch(fail) })
  app.querySelector('#open-management')?.addEventListener('click', showManagementHub)
  app.querySelector('#plan-add-task')?.addEventListener('click', () => void showTaskEditor(undefined, planView === 'today' ? today : undefined))
  if (activeTab === 'today') await renderTodayPage()
  if (activeTab === 'plan') await renderPlanPage()
  if (activeTab === 'food') await renderFoodPage()
  if (activeTab === 'workout') await renderWorkoutPage()
  if (activeTab === 'progress') await renderProgressPage()
}

const habitToggleQueue = new Map<string, Promise<void>>()

function todayHabitCardHtml(habits: Habit[], checkIns: HabitCheckIn[], date: string): string {
  const checked = new Set(checkIns.map((item) => item.habitId))
  const count = habits.filter((habit) => checked.has(habit.id)).length
  const weekday = ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1
  return `<section class="today-card today-activity-card today-habits-card" id="today-habits"><div class="card-heading today-activity-head"><div><span class="card-icon habit-icon">${icon('check', 19)}</span><h2>习惯</h2></div><button class="text-btn" id="today-habits-manage">管理 ${icon('chevron', 15)}</button></div>${habits.length ? `<div class="today-habit-list">${habits.map((habit) => `<button class="today-habit-row" type="button" data-habit-toggle="${esc(habit.id)}" aria-pressed="${checked.has(habit.id)}"><span class="habit-check-indicator" aria-hidden="true">${icon('check', 15)}</span><span class="habit-row-name">${esc(habit.name)}</span>${habit.weekdays?.includes(weekday) ? '<small class="habit-planned-badge">计划</small>' : ''}</button>`).join('')}</div><p class="today-habit-summary" id="today-habit-summary">${habitTodaySummary(count)}</p>` : '<div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">还没有习惯</strong><span class="today-activity-meta">完成时轻触打卡即可</span></div><button class="secondary today-activity-action" id="today-habit-create">创建习惯</button></div>'}</section>`
}

function bindTodayHabitCard(root: ParentNode, date: string): void {
  root.querySelector('#today-habits-manage')?.addEventListener('click', () => void showHabitManager())
  root.querySelector('#today-habit-create')?.addEventListener('click', () => void showHabitManager(true))
  root.querySelectorAll<HTMLButtonElement>('[data-habit-toggle]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.habitToggle!
    const previous = habitToggleQueue.get(id) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(async () => {
      const checked = await toggleHabitCheckIn(id, date)
      if (!button.isConnected) return
      button.setAttribute('aria-pressed', String(checked))
      button.classList.toggle('is-checked', checked)
      const card = button.closest('#today-habits')!
      const count = card.querySelectorAll('[data-habit-toggle][aria-pressed="true"]').length
      card.querySelector('#today-habit-summary')!.textContent = habitTodaySummary(count)
    }).catch(fail)
    habitToggleQueue.set(id, next)
    void next.finally(() => { if (habitToggleQueue.get(id) === next) habitToggleQueue.delete(id) })
  }))
}

async function refreshTodayHabitCard(): Promise<void> {
  if (activeTab !== 'today') return
  const old = document.querySelector('#today-habits')
  if (!old) return
  const date = getLocalDateString()
  const [habits, checkIns] = await Promise.all([getActiveHabits(), getHabitCheckInsByDate(date)])
  if (!old.isConnected) return
  const wrapper = document.createElement('div')
  wrapper.innerHTML = todayHabitCardHtml(habits, checkIns, date)
  const card = wrapper.firstElementChild!
  old.replaceWith(card)
  bindTodayHabitCard(card, date)
}

async function showHabitManager(openCreate = false): Promise<void> {
  const dialog = openModal('习惯管理', '<div id="habit-manager-body"></div>')
  dialog.classList.add('habit-sheet')
  const body = dialog.querySelector<HTMLElement>('#habit-manager-body')!
  const scroll = dialog.querySelector<HTMLElement>('.modal-body')!
  const setScreen = (title: string, html: string) => {
    dialog.querySelector('h2')!.textContent = title
    body.innerHTML = html
    scroll.scrollTop = 0
  }
  let reorderMode = false
  const manager = async () => {
    const all = await db.habits.orderBy('sortOrder').toArray()
    if (!dialog.isConnected) return
    const active = all.filter((habit) => habit.active)
    const inactive = all.filter((habit) => !habit.active)
    const row = (habit: Habit, index: number, list: Habit[]) => `<div class="habit-manager-row${reorderMode && habit.active ? ' is-reordering' : ''}">${reorderMode && habit.active ? `<span class="habit-manager-row-main"><strong>${esc(habit.name)}</strong><small>${esc(habitPlanText(habit))}</small></span><span class="habit-reorder-actions"><button type="button" data-habit-move="${esc(habit.id)}" data-direction="-1" aria-label="上移 ${esc(habit.name)}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-habit-move="${esc(habit.id)}" data-direction="1" aria-label="下移 ${esc(habit.name)}" ${index === list.length - 1 ? 'disabled' : ''}>↓</button></span>` : `<button type="button" class="habit-manager-row-main" data-habit-edit="${esc(habit.id)}" aria-label="编辑 ${esc(habit.name)}"><span><strong>${esc(habit.name)}</strong><small>${esc(habitPlanText(habit))}${habit.active ? '' : ' · 已停用'}</small></span>${icon('chevron', 17)}</button>`}</div>`
    setScreen('习惯管理', `<div class="habit-manager"><div class="habit-manager-toolbar"><span>${reorderMode ? '调整顺序' : `已启用 ${active.length} 项`}</span><div><button type="button" class="text-btn" id="habit-reorder" ${active.length < 2 ? 'hidden' : ''}>${reorderMode ? '完成' : '调整顺序'}</button>${reorderMode ? '' : '<button type="button" class="text-btn" id="habit-new">+ 新建</button>'}</div></div>${all.length ? `<section class="habit-manager-section"><h3>习惯</h3><div class="habit-manager-group">${active.length ? active.map((habit, index) => row(habit, index, active)).join('') : '<p class="habit-manager-empty-line">还没有启用的习惯</p>'}</div></section>${inactive.length ? `<section class="habit-manager-section"><h3>已停用</h3><div class="habit-manager-group">${inactive.map((habit, index) => row(habit, index, inactive)).join('')}</div></section>` : ''}` : '<div class="habit-manager-empty"><strong>还没有习惯</strong><p>创建一个需要时轻触打卡的习惯。</p><button type="button" class="secondary" id="habit-empty-new">新建习惯</button></div>'}</div>`)
    body.querySelector('#habit-new')?.addEventListener('click', () => void editor())
    body.querySelector('#habit-empty-new')?.addEventListener('click', () => void editor())
    body.querySelector('#habit-reorder')?.addEventListener('click', () => { reorderMode = !reorderMode; void manager() })
    body.querySelectorAll<HTMLButtonElement>('[data-habit-edit]').forEach((button) => button.addEventListener('click', () => void editor(all.find((habit) => habit.id === button.dataset.habitEdit))))
    body.querySelectorAll<HTMLButtonElement>('[data-habit-move]').forEach((button) => button.addEventListener('click', async () => {
      const index = active.findIndex((habit) => habit.id === button.dataset.habitMove)
      const next = index + Number(button.dataset.direction)
      if (index < 0 || next < 0 || next >= active.length) return
      const ids = active.map((habit) => habit.id); [ids[index], ids[next]] = [ids[next]!, ids[index]!]
      try { await reorderHabits(ids); await manager(); await refreshTodayHabitCard() } catch (error) { fail(error) }
    }))
  }
  const editor = async (habit?: Habit) => {
    const hasHistory = habit ? Boolean(await db.habitCheckIns.where('habitId').equals(habit.id).first()) : false
    if (!dialog.isConnected) return
    setScreen(habit ? '编辑习惯' : '新建习惯', `<form id="habit-form" class="habit-editor"><button type="button" class="habit-editor-back" id="habit-form-back">‹ 习惯管理</button><section class="habit-editor-section"><h3>基本信息</h3><div class="habit-editor-group"><label class="habit-editor-field">名称<input name="name" maxlength="40" required value="${esc(habit?.name ?? '')}" placeholder="例如：肩颈拉伸"></label><label class="habit-editor-field">说明（可选）<textarea name="note" rows="2" placeholder="可填写简短提示">${esc(habit?.note ?? '')}</textarea></label></div></section><section class="habit-editor-section"><h3>计划（可选）</h3><div class="habit-editor-group"><fieldset class="habit-weekdays"><legend>每周计划日</legend><div class="habit-weekday-grid">${habitWeekdayLabels.map((label, index) => `<label class="habit-weekday-option"><input type="checkbox" name="weekday" value="${index + 1}" aria-label="星期${label}" ${habit?.weekdays?.includes(index + 1) ? 'checked' : ''}><span aria-hidden="true">${label}</span></label>`).join('')}</div><p id="habit-free-note" class="habit-plan-note" ${habit?.weekdays?.length ? 'hidden' : ''}>不选择计划日 = 自由打卡</p></fieldset><label class="habit-target-row"><span>周目标</span><span class="habit-target-value" id="habit-target-value">${habit?.targetPerWeek ? `每周 ${habit.targetPerWeek} 次` : '不设置'}</span>${icon('chevron', 16)}<select name="targetPerWeek" aria-label="周目标"><option value="">不设置</option>${Array.from({ length: 7 }, (_, index) => `<option value="${index + 1}" ${habit?.targetPerWeek === index + 1 ? 'selected' : ''}>${index + 1} 次</option>`).join('')}</select></label><p class="habit-plan-note">计划仅用于提示和回顾，不限制其他日期打卡。</p></div></section><div class="habit-editor-actions"><button class="primary full-btn" type="submit">保存习惯</button></div>${habit ? `<section class="habit-status-section"><h3>习惯状态</h3><button type="button" id="habit-active-toggle">${habit.active ? '停用习惯' : '重新启用'}</button>${hasHistory ? '<p>已有打卡记录，停用后可保留历史。</p>' : '<button type="button" id="habit-delete" class="danger">删除习惯</button>'}</section>` : ''}</form>`)
    body.querySelector('#habit-form-back')?.addEventListener('click', () => { reorderMode = false; void manager() })
    const weekdays = body.querySelectorAll<HTMLInputElement>('[name="weekday"]')
    weekdays.forEach((input) => input.addEventListener('change', () => { body.querySelector<HTMLElement>('#habit-free-note')!.hidden = [...weekdays].some((day) => day.checked) }))
    body.querySelector<HTMLSelectElement>('[name="targetPerWeek"]')?.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value
      body.querySelector('#habit-target-value')!.textContent = value ? `每周 ${value} 次` : '不设置'
    })
    body.querySelector<HTMLFormElement>('#habit-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const values = new FormData(event.currentTarget as HTMLFormElement)
      const input = { name: valueOf(values, 'name'), note: valueOf(values, 'note'), weekdays: values.getAll('weekday').map(Number), targetPerWeek: optionalNumber(values, 'targetPerWeek') }
      try { if (habit) await updateHabit(habit.id, input); else await createHabit(input); reorderMode = false; await manager(); await refreshTodayHabitCard() } catch (error) { fail(error) }
    })
    body.querySelector('#habit-active-toggle')?.addEventListener('click', async () => {
      if (!habit) return
      try { await setHabitActive(habit.id, !habit.active); reorderMode = false; await manager(); await refreshTodayHabitCard() } catch (error) { fail(error) }
    })
    body.querySelector('#habit-delete')?.addEventListener('click', async () => {
      if (!habit || !await confirmAction('删除习惯？', '删除后无法恢复。', '删除习惯')) return
      try { await deleteUnusedHabit(habit.id); reorderMode = false; await manager(); await refreshTodayHabitCard() } catch (error) { fail(error) }
    })
  }
  if (openCreate) await editor()
  else await manager()
}

function todayPlanCardHtml(tasks: Task[], allTags: TaskTag[]): string {
  const tags = new Map(allTags.map((tag) => [tag.id, tag]))
  const ordered = sortTasksForPlan(tasks)
  const pending = ordered.filter((task) => !task.completedAt)
  const recentComplete = ordered.filter((task) => task.completedAt).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 1)
  const visible = [...pending.slice(0, 4), ...recentComplete]
  return `<section class="today-card today-activity-card today-plan-card" id="today-plan"><div class="card-heading today-activity-head"><div><span class="card-icon plan-icon">${icon('calendar', 19)}</span><h2>今日计划</h2></div><button class="text-btn" id="today-plan-all">查看全部 ${icon('chevron', 15)}</button></div>${visible.length ? `${taskGroupHtml(visible, tags)}${pending.length > 4 ? `<p class="today-plan-more">还有 ${pending.length - 4} 项</p>` : ''}` : '<div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">今天没有安排</strong><span class="today-activity-meta">有需要时随手记下来</span></div><button type="button" class="secondary today-activity-action" id="today-plan-add">添加任务</button></div>'}</section>`
}

function bindTodayPlanCard(root: ParentNode): void {
  root.querySelector('#today-plan-all')?.addEventListener('click', () => { activeTab = 'plan'; planView = 'today'; void render().catch(fail) })
  root.querySelector('#today-plan-add')?.addEventListener('click', () => void showTaskEditor(undefined, getLocalDateString()))
  bindTaskRows(root, () => refreshTodayPlanCard())
}

async function refreshTodayPlanCard(): Promise<void> {
  if (activeTab !== 'today') return
  const old = document.querySelector('#today-plan')
  if (!old) return
  const [tasks, tags] = await Promise.all([getTasksByDate(getLocalDateString()), getTaskTags()])
  if (!old.isConnected) return
  const wrapper = document.createElement('div')
  wrapper.innerHTML = todayPlanCardHtml(tasks, tags)
  const card = wrapper.firstElementChild!
  old.replaceWith(card)
  bindTodayPlanCard(card)
}

async function renderTodayPage(): Promise<void> {
  const today = getLocalDateString()
  const [logs, target, workouts, cardioSessions, pelvicSessions, weights, allPelvicSessions, habits, habitCheckIns, todayTasks, taskTags] = await Promise.all([
    db.foodLogs.where('date').equals(today).toArray(),
    db.nutritionTargets.where('date').equals(today).first(),
    db.workouts.where('date').equals(today).toArray(),
    getCardioSessionsByDate(today),
    db.pelvicFloorSessions.where('date').equals(today).toArray(),
    db.weights.where('date').belowOrEqual(today).reverse().limit(2).toArray(),
    db.pelvicFloorSessions.toArray(),
    getActiveHabits(),
    getHabitCheckInsByDate(today),
    getTasksByDate(today),
    getTaskTags(),
  ])
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.totalCalories,
    protein: sum.protein + (log.totalProtein ?? 0),
    carbs: sum.carbs + (log.totalCarbs ?? 0),
    fat: sum.fat + (log.totalFat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const openWorkout = workouts.find((workout) => !workout.finishedAt)
  const strengthExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0)
  const strengthSets = workouts.reduce((total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 0)
  const cardioMinutes = cardioSessions.reduce((total, session) => total + session.durationMinutes, 0)
  const weightState = getTodayWeightState(weights, today)
  const dailyPlanRoutine = pelvicPlanRoutine(selectedPelvicPlanLevel(getPelvicFloorPlanProgress(allPelvicSessions)))
  const pelvicState = getTodayPelvicState(pelvicSessions, dailyPlanRoutine.name, pelvicRoutineMinutes(dailyPlanRoutine))
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `
    ${todayPlanCardHtml(todayTasks, taskTags)}
    <section class="today-card nutrition-today-card"><div class="card-heading"><div><span class="card-icon nutrition-icon">${icon('utensils', 19)}</span><h2>今日饮食</h2></div><button class="text-btn" id="today-food-details">查看详情 ${icon('chevron', 15)}</button></div><div class="today-calorie-layout">${ringSvgHtml(totals.calories, target?.calories, 'tiny')}<div class="today-calorie-copy"><strong>${formatNumber(totals.calories)} <small>kcal</small></strong><span class="today-goal-note${target?.calories === undefined ? ' is-unset' : ''}">${target?.calories === undefined ? '尚未设置目标' : `目标 ${formatNumber(target.calories)} kcal · ${goalStatusText(totals.calories, target.calories, 'kcal')}`}</span></div></div><div class="today-macros"><div class="protein"><span>蛋白质</span><strong>${formatNumber(totals.protein)}${target?.protein === undefined ? 'g' : ` / ${formatNumber(target.protein)}g`}</strong></div><div class="carbs"><span>碳水</span><strong>${formatNumber(totals.carbs)}${target?.carbs === undefined ? 'g' : ` / ${formatNumber(target.carbs)}g`}</strong></div><div class="fat"><span>脂肪</span><strong>${formatNumber(totals.fat)}${target?.fat === undefined ? 'g' : ` / ${formatNumber(target.fat)}g`}</strong></div></div></section>
    <section class="today-card workout-today-card"><div class="card-heading"><div><span class="card-icon workout-icon">${icon('dumbbell', 19)}</span><h2>今日训练</h2></div></div><div class="today-training-row"><strong>无氧</strong><span>${workouts.length ? `力量训练 · ${strengthExercises} 个动作 · ${strengthSets} 组${openWorkout ? ' · 记录中' : ''}` : '今天还没有力量训练'}</span></div><div class="today-training-row"><strong>有氧</strong><span>${cardioSessions.length === 1 ? `${getCardioActivityLabel(cardioSessions[0]!)} · ${formatNumber(cardioMinutes)} 分钟 · ${formatCardioMetrics(cardioSessions[0]!).join(' · ')}` : cardioSessions.length ? `有氧训练 · ${cardioSessions.length} 次 · 共 ${formatNumber(cardioMinutes)} 分钟` : '今天还没有有氧训练'}</span></div><button class="primary full-btn" id="today-workout">${openWorkout ? '继续力量训练' : '查看训练'}</button></section>
    <section class="today-card today-activity-card weight-today-card"><div class="card-heading today-activity-head"><div><span class="card-icon weight-icon">${icon('scale', 19)}</span><h2>体重</h2></div><button class="text-btn" id="today-weight-details">查看趋势 ${icon('chevron', 15)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">${esc(weightState.status)}</strong><span class="today-activity-meta">${esc(weightState.meta)}</span></div><button class="secondary today-activity-action" id="today-record-weight">${esc(weightState.action)}</button></div></section>
    <section class="today-card today-activity-card pelvic-today-card"><div class="card-heading today-activity-head"><div><span class="card-icon pelvic-icon">${icon('leaf', 19)}</span><h2>凯格尔训练</h2></div><button class="text-btn" id="today-pelvic-history">训练记录 ${icon('chevron', 15)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">${esc(pelvicState.status)}</strong><span class="today-activity-meta">${esc(pelvicState.meta)}</span></div><button class="secondary today-activity-action" id="today-pelvic">${esc(pelvicState.action)}</button></div></section>
    ${todayHabitCardHtml(habits, habitCheckIns, today)}`
  view.querySelector('#today-food-details')?.addEventListener('click', () => { activeTab = 'food'; foodDate = today; void render().catch(fail) })
  view.querySelector('#today-workout')?.addEventListener('click', () => { activeTab = 'workout'; workoutDate = today; currentWorkout = openWorkout; workoutEditorOpen = Boolean(openWorkout); void render().catch(fail) })
  view.querySelector('#today-weight-details')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; void render().catch(fail) })
  view.querySelector('#today-record-weight')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; weightDate = today; void render().then(() => showWeightForm(today, weights.find((item) => item.date === today)?.weightKg)).catch(fail) })
  view.querySelector('#today-pelvic')?.addEventListener('click', () => { workoutDate = today; void showPelvicFloorSetup().catch(fail) })
  view.querySelector('#today-pelvic-history')?.addEventListener('click', () => void showPelvicFloorHistory())
  bindTodayPlanCard(view)
  bindTodayHabitCard(view, today)
}

function progressTabsHtml(): string {
  return `<div class="page-tabs" role="tablist" aria-label="进度视图"><button role="tab" data-progress-view="trend" class="${progressView === 'trend' ? 'active' : ''}" aria-selected="${progressView === 'trend'}">趋势</button><button role="tab" data-progress-view="calendar" class="${progressView === 'calendar' ? 'active' : ''}" aria-selected="${progressView === 'calendar'}">日历</button><button role="tab" data-progress-view="reports" class="${progressView === 'reports' ? 'active' : ''}" aria-selected="${progressView === 'reports'}">报告</button></div>`
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
  await renderReportsPage()
}

function reportDateLabel(date: string): string {
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`
}

function reportPeriodLabel(report: ReportResult): string {
  if (reportMode === 'month') return `${report.range.start.slice(0, 4)}年${Number(report.range.start.slice(5, 7))}月`
  return `${reportDateLabel(report.range.start)}–${reportDateLabel(report.range.end)}`
}

function reportTrainingHtml(report: ReportResult): string {
  const buckets = reportMode === 'week'
    ? report.training.map((day, index) => ({ label: habitWeekdayLabels[index]!, days: [day] }))
    : report.buckets.map((bucket) => ({ label: bucket.label, days: report.training.filter((day) => day.date >= bucket.start && day.date <= bucket.end) }))
  const rows = [
    { label: '力量', key: 'strengthSets' as const, unit: '组', className: 'strength' },
    { label: '有氧', key: 'cardioMinutes' as const, unit: '分钟', className: 'cardio' },
    { label: '凯格尔', key: 'pelvicMinutes' as const, unit: '分钟', className: 'pelvic' },
  ]
  const charts = rows.map((row) => {
    const values = buckets.map((bucket) => bucket.days.reduce((sum, day) => sum + day[row.key], 0))
    const maximum = Math.max(...values, 1)
    return `<div class="report-training-row ${row.className}" role="group" aria-label="${row.label}训练节奏"><strong>${row.label}</strong><div class="report-training-cells">${buckets.map((bucket, index) => `<div class="report-training-cell ${bucket.days.every((day) => report.days.find((item) => item.date === day.date)?.future) ? 'future' : ''}" aria-label="${esc(bucket.label)}，${row.label} ${formatNumber(values[index]!)} ${row.unit}${bucket.days.every((day) => report.days.find((item) => item.date === day.date)?.future) ? '，未来日期' : ''}"><span class="report-training-bar" style="height:${values[index] ? Math.max(4, values[index]! / maximum * 46) : 2}px"></span><small>${esc(bucket.label)}</small></div>`).join('')}</div></div>`
  }).join('')
  const summary = report.summary
  return `<section class="report-section"><h2>训练节奏</h2><div class="report-training-grid">${charts}</div><p class="report-note">力量训练 ${summary.strengthSessions} 次 · ${summary.strengthSets} 组；有氧训练 ${summary.cardioSessions} 次 · ${formatNumber(summary.cardioMinutes)} 分钟（楼梯机 ${summary.stairSessions} 次、跑步机 ${summary.treadmillSessions} 次）；凯格尔 ${summary.pelvicSessions} 次 · ${formatNumber(summary.pelvicMinutes)} 分钟。</p></section>`
}

function reportHabitsHtml(report: ReportResult): string {
  if (!report.habits.length) return ''
  const rows = report.habits.map(({ habit, dates, count }) => {
    const trailing = reportMode === 'week' && habit.targetPerWeek ? `${count} / ${habit.targetPerWeek}` : reportMode === 'week' ? `${count} 次` : `本月 ${count} 次`
    const visualization = reportMode === 'week'
      ? `<div class="report-habit-days">${report.days.map(({ date, future }, index) => {
        const done = dates.has(date), planned = habit.weekdays?.includes(index + 1)
        return `<span class="report-habit-day ${done ? 'done' : ''} ${planned ? 'planned' : ''} ${future ? 'future' : ''}" aria-label="星期${habitWeekdayLabels[index]}，${reportDateLabel(date)}，${future ? '未来日期' : done ? '已打卡' : '未打卡'}">${done ? '✓' : '○'}</span>`
      }).join('')}</div>`
      : `<div class="report-habit-weeks">${report.buckets.map((bucket) => {
        const completed = [...dates].filter((date) => date >= bucket.start && date <= bucket.end).length
        const elapsed = report.days.filter((day) => day.date >= bucket.start && day.date <= bucket.end && !day.future).length
        return `<div><small>${esc(bucket.label)}</small><span class="report-habit-week-track"><i style="width:${elapsed ? completed / elapsed * 100 : 0}%"></i></span><strong>${completed}</strong></div>`
      }).join('')}</div>`
    return `<article class="report-habit-row"><div class="report-habit-name"><strong>${esc(habit.name)}</strong><span>${trailing}</span></div>${visualization}${reportMode === 'month' && habit.targetPerWeek ? `<small class="report-note">周目标 ${habit.targetPerWeek} 次</small>` : ''}</article>`
  }).join('')
  return `<section class="report-section"><h2>习惯打卡</h2>${reportMode === 'week' ? `<div class="report-habit-week-head">${habitWeekdayLabels.map((label) => `<small>${label}</small>`).join('')}</div>` : ''}<div class="report-habit-list">${rows}</div></section>`
}

function reportWeightHtml(report: ReportResult): string {
  const weights = report.weights
  if (!weights.length) return `<section class="report-section"><h2>体重</h2><p class="report-note">暂无体重记录</p></section>`
  if (weights.length === 1) return `<section class="report-section"><h2>体重</h2><div class="report-weight-single"><i></i><strong>${formatNumber(weights[0]!.weightKg)} kg</strong><span>${reportDateLabel(weights[0]!.date)} · 本期记录 1 次</span></div></section>`
  const delta = weights.at(-1)!.weightKg - weights[0]!.weightKg
  return `<section class="report-section"><h2>体重</h2><div class="report-weight-chart"><canvas id="report-weight-chart" role="img" aria-label="体重趋势，${formatNumber(weights[0]!.weightKg)} 到 ${formatNumber(weights.at(-1)!.weightKg)} 千克"></canvas></div><p class="report-note">${formatNumber(weights[0]!.weightKg)} → ${formatNumber(weights.at(-1)!.weightKg)} kg · ${delta > 0 ? '+' : ''}${formatNumber(delta)} kg</p></section>`
}

function reportNutritionHtml(report: ReportResult): string {
  const labels = { calories: ['热量', 'kcal'], protein: ['蛋白质', 'g'], carbs: ['碳水', 'g'], fat: ['脂肪', 'g'] } as const
  const rows = (Object.keys(labels) as (keyof typeof labels)[]).map((key) => {
    const metric = report.nutrition[key], [label, unit] = labels[key]
    if (metric.actual === undefined) return `<div class="report-nutrition-row"><strong>${label}</strong><span class="report-note">暂无记录</span></div>`
    const paired = metric.target !== undefined && metric.target > 0
    const amount = `${formatNumber(metric.actual)}${paired ? ` / ${formatNumber(metric.target!)}` : ''} ${unit}`
    const detail = paired ? `同日记录与目标 ${metric.matchedDays} 天` : `记录日平均 · ${metric.recordedDays} 天`
    return `<div class="report-nutrition-row ${key}"><div><strong>${label}</strong><span>${amount}</span></div><div class="report-nutrition-track" role="img" aria-label="${label} ${amount}，${detail}"><i style="width:${paired ? Math.min(100, metric.actual / metric.target! * 100) : 100}%"></i></div><small>${detail}</small></div>`
  }).join('')
  return `<section class="report-section"><h2>饮食记录</h2><div class="report-nutrition-list">${rows}</div></section>`
}

async function renderReportsPage(): Promise<void> {
  const today = getLocalDateString()
  const report = await loadReport(reportMode, reportAnchorDate, today)
  if (activeTab !== 'progress' || progressView !== 'reports') return
  const current = getReportRange(reportMode, today)
  const isCurrent = report.range.start === current.start
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `${progressTabsHtml()}<div class="report-page"><div class="report-mode" role="group" aria-label="报告周期"><button data-report-mode="week" class="${reportMode === 'week' ? 'active' : ''}" aria-pressed="${reportMode === 'week'}">周报</button><button data-report-mode="month" class="${reportMode === 'month' ? 'active' : ''}" aria-pressed="${reportMode === 'month'}">月报</button></div><div class="report-period"><button id="report-previous" aria-label="${reportMode === 'week' ? '上一周' : '上个月'}">‹</button><strong>${reportPeriodLabel(report)}</strong><button id="report-next" aria-label="${reportMode === 'week' ? '下一周' : '下个月'}" ${isCurrent ? 'disabled' : ''}>›</button></div>${isCurrent ? '' : `<button class="report-return" id="report-return">回到本${reportMode === 'week' ? '周' : '月'}</button>`}${report.empty ? '<div class="report-empty">这段时间还没有记录。</div>' : `<div class="report-summary-grid"><div><strong>${report.summary.trainingDays}</strong><span>训练天数</span></div><div><strong>${formatNumber(report.summary.cardioMinutes)}</strong><span>有氧分钟</span></div><div><strong>${report.summary.foodDays}</strong><span>饮食记录天数</span></div><div><strong>${report.summary.habitCheckIns}</strong><span>习惯打卡次数</span></div></div>${reportTrainingHtml(report)}${reportWeightHtml(report)}${reportNutritionHtml(report)}`} ${reportHabitsHtml(report)}${report.empty ? '' : `<section class="report-section"><h2>本期摘要</h2><p class="report-note">${esc(report.text)}</p></section>`}</div>`
  bindProgressTabs(view)
  view.querySelectorAll<HTMLButtonElement>('[data-report-mode]').forEach((button) => button.addEventListener('click', () => { reportMode = button.dataset.reportMode as ReportMode; void render().catch(fail) }))
  view.querySelector('#report-previous')?.addEventListener('click', () => { reportAnchorDate = shiftReportPeriod(reportMode, reportAnchorDate, -1); void render().catch(fail) })
  view.querySelector('#report-next')?.addEventListener('click', () => { if (isCurrent) return; reportAnchorDate = shiftReportPeriod(reportMode, reportAnchorDate, 1); void render().catch(fail) })
  view.querySelector('#report-return')?.addEventListener('click', () => { reportAnchorDate = today; void render().catch(fail) })
  const canvas = view.querySelector<HTMLCanvasElement>('#report-weight-chart')
  if (canvas) {
    const style = getComputedStyle(document.documentElement)
    const color = style.getPropertyValue('--text-secondary').trim() || '#73818b'
    reportWeightChart = new Chart(canvas, { type: 'line', data: { labels: report.weights.map((item) => reportDateLabel(item.date)), datasets: [{ data: report.weights.map((item) => item.weightKg), borderColor: '#728e9f', backgroundColor: 'transparent', borderWidth: 2, tension: .18, pointRadius: 3, pointHoverRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color, maxTicksLimit: 5 } }, y: { grid: { color: '#edf0ed' }, ticks: { color, maxTicksLimit: 4 } } } } })
  }
}

const taskToggleQueue = new Map<string, Promise<void>>()

function taskRowHtml(task: Task, tags: Map<string, TaskTag>): string {
  const visibleTags = task.tagIds.map((id) => tags.get(id)).filter((tag): tag is TaskTag => Boolean(tag))
  const time = task.startTime ? `${task.startTime}${task.endTime ? `–${task.endTime}` : ''}` : ''
  return `<div class="plan-task-row${task.completedAt ? ' is-complete' : ''}"><button type="button" class="plan-task-check" data-task-complete="${esc(task.id)}" aria-pressed="${Boolean(task.completedAt)}" aria-label="${task.completedAt ? '撤销完成' : '完成'} ${esc(task.title)}"><span aria-hidden="true">${icon('check', 16)}</span></button><button type="button" class="plan-task-main" data-task-edit="${esc(task.id)}" aria-label="编辑 ${esc(task.title)}"><span class="plan-task-copy"><strong>${esc(task.title)}</strong>${visibleTags.length || task.note ? `<small>${visibleTags.slice(0, 2).map((tag) => `<span class="plan-tag-chip">#${esc(tag.name)}</span>`).join('')}${visibleTags.length > 2 ? `<span class="plan-tag-overflow">+${visibleTags.length - 2}</span>` : ''}${task.note ? '<span class="plan-note-meta">有备注</span>' : ''}</small>` : ''}</span>${time ? `<time>${esc(time)}</time>` : ''}${icon('chevron', 16)}</button></div>`
}

function taskGroupHtml(tasks: Task[], tags: Map<string, TaskTag>): string {
  return `<div class="plan-task-group">${tasks.map((task) => taskRowHtml(task, tags)).join('')}</div>`
}

function bindTaskRows(root: ParentNode, afterChange: (task: Task) => Promise<void>): void {
  root.querySelectorAll<HTMLButtonElement>('[data-task-complete]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.taskComplete!
    const previous = taskToggleQueue.get(id) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(async () => { const task = await toggleTaskCompletion(id); await afterChange(task) }).catch(fail)
    taskToggleQueue.set(id, next)
    void next.finally(() => { if (taskToggleQueue.get(id) === next) taskToggleQueue.delete(id) })
  }))
  root.querySelectorAll<HTMLButtonElement>('[data-task-edit]').forEach((button) => button.addEventListener('click', async () => {
    try { const task = await db.tasks.get(button.dataset.taskEdit!); if (task) await showTaskEditor(task) } catch (error) { fail(error) }
  }))
}

function planDateHeading(date: string, today: string): string {
  const value = new Date(`${date}T12:00:00`)
  const monthDay = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(value)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(value)
  const year = date.slice(0, 4) === today.slice(0, 4) ? '' : `${date.slice(0, 4)}年`
  return `${date === shiftLocalDate(today, 1) ? '明天 · ' : ''}${year}${monthDay} · ${weekday}`
}

async function renderPlanPage(): Promise<void> {
  const today = getLocalDateString()
  const [tasks, allTags] = await Promise.all([
    planView === 'today' ? getTasksByDate(today) : planView === 'upcoming' ? getUpcomingTasks(today) : getInboxTasks(),
    getTaskTags(),
  ])
  if (activeTab !== 'plan') return
  if (planTagFilterId && !allTags.some((tag) => tag.id === planTagFilterId)) planTagFilterId = undefined
  const filtered = sortTasksForPlan(planTagFilterId ? tasks.filter((task) => task.tagIds.includes(planTagFilterId!)) : tasks)
  const tags = new Map(allTags.map((tag) => [tag.id, tag]))
  const currentFilter = allTags.find((tag) => tag.id === planTagFilterId)
  const view = document.querySelector<HTMLElement>('#view')!
  let content = ''
  if (planView === 'today' || planView === 'inbox') {
    const pending = filtered.filter((task) => !task.completedAt)
    const complete = filtered.filter((task) => task.completedAt)
    if (planView === 'today') {
      const timed = pending.filter((task) => task.startTime)
      const untimed = pending.filter((task) => !task.startTime)
      content = `${timed.length ? `<section class="plan-list-section"><h3>时间安排</h3>${taskGroupHtml(timed, tags)}</section>` : ''}${untimed.length ? `<section class="plan-list-section"><h3>待办</h3>${taskGroupHtml(untimed, tags)}</section>` : ''}`
    } else content = pending.length ? taskGroupHtml(pending, tags) : ''
    if (!pending.length && !complete.length) content += `<div class="plan-empty"><div class="plan-empty-copy"><strong>${planView === 'today' ? '今天还没有安排' : '收件箱是空的'}</strong><span>${planView === 'today' ? '有需要时随手记下来。' : '想到的事情可以先放在这里。'}</span></div><button type="button" class="secondary plan-empty-action" id="plan-empty-add">添加任务</button></div>`
    if (complete.length) content += `<details id="plan-completed" class="plan-completed" ${planCompletedOpen ? 'open' : ''}><summary>已完成 ${complete.length} 项</summary>${taskGroupHtml(complete, tags)}</details>`
  } else {
    const groups = new Map<string, Task[]>()
    for (const task of filtered) { const date = task.date!; const group = groups.get(date) ?? []; group.push(task); groups.set(date, group) }
    content = groups.size ? [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, group]) => `<section class="plan-list-section"><h3>${esc(planDateHeading(date, today))}</h3>${taskGroupHtml(sortTasksForPlan(group), tags)}</section>`).join('') : '<div class="plan-empty"><div class="plan-empty-copy"><strong>近期没有安排</strong><span>有日期的未来任务会出现在这里。</span></div><button type="button" class="secondary plan-empty-action" id="plan-empty-add">添加任务</button></div>'
  }
  const context = planView === 'today' ? planDateHeading(today, today) : planView === 'upcoming' ? '未来安排' : '未安排日期'
  const filter = `<button type="button" id="plan-tag-filter" class="plan-filter-button${currentFilter ? ' is-active' : ''}" aria-label="${currentFilter ? `当前筛选标签 ${esc(currentFilter.name)}，选择其他标签` : '筛选标签'}"><span>${currentFilter ? `#${esc(currentFilter.name)}` : '标签'}</span>${icon('chevron', 14)}</button>`
  view.innerHTML = `<div class="plan-page"><div class="plan-tabs" role="tablist" aria-label="计划视图"><button role="tab" data-plan-view="today" aria-selected="${planView === 'today'}" class="${planView === 'today' ? 'active' : ''}">今天</button><button role="tab" data-plan-view="upcoming" aria-selected="${planView === 'upcoming'}" class="${planView === 'upcoming' ? 'active' : ''}">近期</button><button role="tab" data-plan-view="inbox" aria-selected="${planView === 'inbox'}" class="${planView === 'inbox' ? 'active' : ''}">收件箱</button></div><div class="plan-context-row"><p class="plan-context-label">${esc(context)}</p><div class="plan-context-actions">${currentFilter ? `<div class="plan-filter-active">${filter}<button type="button" id="plan-tag-filter-clear" class="plan-filter-clear" aria-label="清除标签筛选 ${esc(currentFilter.name)}">${icon('x', 15)}</button></div>` : filter}</div></div>${content}</div>`
  view.querySelectorAll<HTMLButtonElement>('[data-plan-view]').forEach((button) => button.addEventListener('click', () => { planView = button.dataset.planView as PlanView; void renderPlanPage().catch(fail) }))
  view.querySelector('#plan-tag-filter')?.addEventListener('click', () => void showTaskTagFilter())
  view.querySelector('#plan-tag-filter-clear')?.addEventListener('click', () => { planTagFilterId = undefined; void renderPlanPage().catch(fail) })
  view.querySelector('#plan-empty-add')?.addEventListener('click', () => void showTaskEditor(undefined, planView === 'today' ? today : undefined))
  view.querySelector<HTMLDetailsElement>('#plan-completed')?.addEventListener('toggle', (event) => { planCompletedOpen = (event.currentTarget as HTMLDetailsElement).open })
  bindTaskRows(view, (task) => { if (task.completedAt) planCompletedOpen = true; return renderPlanPage() })
}

async function showTaskTagFilter(): Promise<void> {
  const tags = await getTaskTags()
  const dialog = openModal('筛选标签', `<div class="plan-tag-picker"><button type="button" data-filter-tag="" class="${planTagFilterId ? '' : 'selected'}">全部</button>${tags.length ? tags.map((tag) => `<button type="button" data-filter-tag="${esc(tag.id)}" class="${planTagFilterId === tag.id ? 'selected' : ''}">#${esc(tag.name)}</button>`).join('') : '<p class="plan-tag-empty">还没有标签。可以在任务标题中输入 # 创建标签。</p>'}<button type="button" id="plan-manage-tags" class="plan-manage-tags">管理标签 ${icon('chevron', 16)}</button></div>`)
  dialog.querySelectorAll<HTMLButtonElement>('[data-filter-tag]').forEach((button) => button.addEventListener('click', () => { planTagFilterId = button.dataset.filterTag || undefined; dialog.close(); void renderPlanPage().catch(fail) }))
  dialog.querySelector('#plan-manage-tags')?.addEventListener('click', () => void showTaskTagManager())
}

async function showTaskTagManager(): Promise<void> {
  const dialog = openModal('标签管理', '<div id="task-tag-manager"></div>')
  const body = dialog.querySelector<HTMLElement>('#task-tag-manager')!
  const setContent = (title: string, html: string) => { dialog.querySelector('h2')!.textContent = title; body.innerHTML = html; dialog.querySelector('.modal-body')!.scrollTop = 0 }
  const manager = async () => {
    const tags = await getTaskTags()
    if (!dialog.isConnected) return
    setContent('标签管理', `<div class="task-tag-manager"><div class="task-tag-manager-toolbar"><span>${tags.length} 个标签</span><button type="button" class="text-btn" id="task-tag-new">+ 新建</button></div>${tags.length ? `<div class="task-tag-manager-list">${tags.map((tag) => `<button type="button" data-edit-tag="${esc(tag.id)}"><span>#${esc(tag.name)}</span>${icon('chevron', 16)}</button>`).join('')}</div>` : '<p class="plan-tag-empty">还没有标签。可以在任务标题中输入 # 创建。</p>'}</div>`)
    body.querySelector('#task-tag-new')?.addEventListener('click', () => editor())
    body.querySelectorAll<HTMLButtonElement>('[data-edit-tag]').forEach((button) => button.addEventListener('click', () => editor(tags.find((tag) => tag.id === button.dataset.editTag))))
  }
  const editor = (tag?: TaskTag) => {
    setContent(tag ? '编辑标签' : '新建标签', `<form id="task-tag-form" class="task-tag-editor"><button type="button" class="plan-quiet-back" id="task-tag-back">‹ 标签管理</button><label>名称<input name="name" maxlength="24" value="${esc(tag?.name ?? '')}" placeholder="例如：旅行" required autocomplete="off"></label><p class="task-tag-preview">预览：<strong id="task-tag-preview">${tag ? `#${esc(tag.name)}` : '#'}</strong></p><button type="submit" class="primary full-btn">保存标签</button>${tag ? '<button type="button" class="plan-quiet-danger" id="task-tag-delete">删除标签</button>' : ''}</form>`)
    body.querySelector('#task-tag-back')?.addEventListener('click', () => void manager())
    const input = body.querySelector<HTMLInputElement>('[name="name"]')!
    input.addEventListener('input', () => { body.querySelector('#task-tag-preview')!.textContent = `#${input.value.trim()}` })
    body.querySelector<HTMLFormElement>('#task-tag-form')!.addEventListener('submit', async (event) => {
      event.preventDefault()
      try { if (tag) await updateTaskTag(tag.id, input.value); else await createTaskTag(input.value); await manager(); if (activeTab === 'plan') await renderPlanPage() } catch (error) { fail(error) }
    })
    body.querySelector('#task-tag-delete')?.addEventListener('click', async () => {
      if (!tag) return
      const count = await getTaskTagUsageCount(tag.id)
      if (!await confirmAction(`删除 #${tag.name}？`, count ? `这个标签会从 ${count} 条任务中移除，任务本身不会被删除。` : '删除后无法恢复。', '删除标签')) return
      try { await deleteTaskTag(tag.id); if (planTagFilterId === tag.id) planTagFilterId = undefined; await manager(); if (activeTab === 'plan') await renderPlanPage() } catch (error) { fail(error) }
    })
  }
  await manager()
}

async function showTaskEditor(task?: Task, defaultDate?: string): Promise<void> {
  const allTags = await getTaskTags()
  const selectedTagIds = [...(task?.tagIds ?? [])]
  const dialog = openModal(task ? '编辑任务' : '新建任务', `<form id="task-form" class="task-editor"><label class="task-title-field">任务<input name="title" maxlength="120" value="${esc(task?.title ?? '')}" placeholder="要做什么？" required autocomplete="off" aria-expanded="false" aria-controls="task-tag-suggestions"></label><div id="task-tag-suggestions" class="task-tag-suggestions" role="listbox" hidden></div><div id="task-selected-tags" class="task-selected-tags"></div><section class="task-editor-section"><h3>日期</h3><div class="task-date-choices"><button type="button" data-task-date="today">今天</button><button type="button" data-task-date="tomorrow">明天</button><button type="button" data-task-date="none">无日期</button></div><input type="hidden" name="date" value="${esc(task?.date ?? defaultDate ?? '')}"><button type="button" id="task-date-picker-open" class="task-date-field fitlog-date-trigger">${icon('calendar', 17)}<span>选择日期</span></button></section><section class="task-editor-section" id="task-time-section"><h3>时间（可选）</h3><div class="task-time-fields"><label>开始时间<input type="time" name="startTime" value="${esc(task?.startTime ?? '')}"></label><label>结束时间<input type="time" name="endTime" value="${esc(task?.endTime ?? '')}"></label></div><p class="task-inline-error" id="task-time-error" role="alert" hidden>结束时间必须晚于开始时间</p></section><label class="task-note-field">备注（可选）<textarea name="note" maxlength="2000" rows="3" placeholder="补充一点细节">${esc(task?.note ?? '')}</textarea></label><div class="task-editor-actions"><button type="submit" class="primary full-btn">保存任务</button></div>${task ? '<button type="button" class="plan-quiet-danger" id="task-delete">删除任务</button>' : ''}</form>`)
  dialog.classList.add('task-editor-sheet')
  const form = dialog.querySelector<HTMLFormElement>('#task-form')!
  const title = form.querySelector<HTMLInputElement>('[name="title"]')!
  const suggestions = form.querySelector<HTMLElement>('#task-tag-suggestions')!
  const chips = form.querySelector<HTMLElement>('#task-selected-tags')!
  const dateInput = form.querySelector<HTMLInputElement>('[name="date"]')!
  const startInput = form.querySelector<HTMLInputElement>('[name="startTime"]')!
  const endInput = form.querySelector<HTMLInputElement>('[name="endTime"]')!
  let activeQuery: ActiveHashtagQuery | undefined
  let composing = false
  let pendingTagCreation: Promise<void> | undefined
  const renderChips = () => {
    chips.innerHTML = selectedTagIds.map((id) => { const tag = allTags.find((item) => item.id === id); return tag ? `<button type="button" data-remove-task-tag="${esc(id)}" aria-label="移除标签 ${esc(tag.name)}">#${esc(tag.name)} <span aria-hidden="true">×</span></button>` : '' }).join('')
    chips.hidden = !selectedTagIds.length
    chips.querySelectorAll<HTMLButtonElement>('[data-remove-task-tag]').forEach((button) => button.addEventListener('click', () => { selectedTagIds.splice(selectedTagIds.indexOf(button.dataset.removeTaskTag!), 1); renderChips(); updateSuggestions() }))
  }
  const applyTag = (tag: TaskTag, restoreTitleFocus = true) => {
    if (!selectedTagIds.includes(tag.id)) selectedTagIds.push(tag.id)
    if (activeQuery) { const replacement = replaceActiveHashtagQuery(title.value, activeQuery); title.value = replacement.text; if (restoreTitleFocus) title.focus({ preventScroll: true }); title.setSelectionRange(replacement.caret, replacement.caret) }
    activeQuery = undefined; suggestions.hidden = true; title.setAttribute('aria-expanded', 'false'); renderChips()
  }
  const updateSuggestions = () => {
    activeQuery = composing ? undefined : findActiveHashtagQuery(title.value, title.selectionStart ?? title.value.length)
    if (!activeQuery) { suggestions.hidden = true; title.setAttribute('aria-expanded', 'false'); return }
    const normalized = normalizeTaskTagName(activeQuery.query)
    const matches = allTags.filter((tag) => tag.normalizedName.startsWith(normalized) && !selectedTagIds.includes(tag.id))
    const exact = allTags.some((tag) => tag.normalizedName === normalized)
    let canCreate = false
    if (activeQuery.query && !exact) { try { validateTaskTagName(activeQuery.query); canCreate = true } catch { /* literal hashtag text remains ordinary title */ } }
    suggestions.innerHTML = `${matches.map((tag) => `<button type="button" role="option" data-task-tag="${esc(tag.id)}">#${esc(tag.name)}</button>`).join('')}${canCreate ? `<button type="button" role="option" id="task-create-tag">+ 创建标签「${esc(activeQuery.query)}」</button>` : ''}`
    suggestions.hidden = !matches.length && !canCreate
    title.setAttribute('aria-expanded', String(!suggestions.hidden))
    suggestions.querySelectorAll<HTMLButtonElement>('[data-task-tag]').forEach((button) => button.addEventListener('click', () => { const tag = allTags.find((item) => item.id === button.dataset.taskTag); if (tag) applyTag(tag) }))
    suggestions.querySelector('#task-create-tag')?.addEventListener('click', () => {
      if (!activeQuery) return
      const query = activeQuery, requestedTitle = title.value, trigger = document.activeElement
      pendingTagCreation = createTaskTag(query.query).then((tag) => {
        if (!dialog.isConnected) return
        allTags.push(tag)
        // Async storage may finish after the user moves to another field or edits the title.
        activeQuery = title.value === requestedTitle ? query : undefined
        applyTag(tag, document.activeElement === title || document.activeElement === trigger)
      }).catch(fail)
    })
  }
  title.addEventListener('compositionstart', () => { composing = true; suggestions.hidden = true; title.setAttribute('aria-expanded', 'false') })
  title.addEventListener('compositionend', () => { composing = false; updateSuggestions() })
  title.addEventListener('input', (event) => { if (!composing && !event.isComposing) updateSuggestions() })
  title.addEventListener('click', updateSuggestions)
  title.addEventListener('keyup', (event) => { if (!event.isComposing) updateSuggestions() })
  renderChips()
  const updateDateControls = () => {
    const date = dateInput.value
    form.querySelector('#task-date-picker-open span')!.textContent = date ? datePickerLabel(date) : '选择日期'
    form.querySelectorAll<HTMLButtonElement>('[data-task-date]').forEach((button) => { const value = button.dataset.taskDate === 'today' ? getLocalDateString() : button.dataset.taskDate === 'tomorrow' ? shiftLocalDate(getLocalDateString(), 1) : ''; button.classList.toggle('active', value === date) })
    form.querySelector<HTMLElement>('#task-time-section')!.hidden = !date
    if (!date) { startInput.value = ''; endInput.value = '' }
    endInput.disabled = !startInput.value
    if (!startInput.value) endInput.value = ''
    const invalid = Boolean(startInput.value && endInput.value && endInput.value <= startInput.value)
    endInput.setCustomValidity(invalid ? '结束时间必须晚于开始时间' : '')
    form.querySelector<HTMLElement>('#task-time-error')!.hidden = !invalid
  }
  form.querySelectorAll<HTMLButtonElement>('[data-task-date]').forEach((button) => button.addEventListener('click', () => { dateInput.value = button.dataset.taskDate === 'today' ? getLocalDateString() : button.dataset.taskDate === 'tomorrow' ? shiftLocalDate(getLocalDateString(), 1) : ''; updateDateControls() }))
  const pickerView = document.createElement('div')
  pickerView.hidden = true
  dialog.querySelector('.modal-body')!.append(pickerView)
  const dateTrigger = form.querySelector<HTMLButtonElement>('#task-date-picker-open')!
  let picker: DatePickerController | undefined
  const returnToForm = () => {
    picker?.destroy(); picker = undefined; pickerView.hidden = true; form.hidden = false
    dialog.querySelector('h2')!.textContent = task ? '编辑任务' : '新建任务'
    if (document.documentElement.dataset.inputModality === 'keyboard') dateTrigger.focus({ preventScroll: true })
  }
  dateTrigger.addEventListener('click', () => {
    form.hidden = true; pickerView.hidden = false; dialog.querySelector('h2')!.textContent = '选择任务日期'
    dialog.querySelector('.modal-body')!.scrollTop = 0
    picker = mountDatePicker(pickerView, {
      value: dateInput.value || getLocalDateString(),
      onConfirm: date => { dateInput.value = date!; updateDateControls(); returnToForm() },
      onCancel: returnToForm,
    })
  })
  dialog.addEventListener('cancel', event => { if (picker) { event.preventDefault(); returnToForm() } })
  dialog.addEventListener('close', () => picker?.destroy(), { once: true })
  startInput.addEventListener('change', updateDateControls)
  endInput.addEventListener('change', updateDateControls)
  updateDateControls()
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (pendingTagCreation) await pendingTagCreation
    if (!form.reportValidity()) return
    const values = new FormData(form)
    const input = { title: valueOf(values, 'title'), note: valueOf(values, 'note'), date: valueOf(values, 'date') || undefined, startTime: valueOf(values, 'startTime') || undefined, endTime: valueOf(values, 'endTime') || undefined, tagIds: [...selectedTagIds] }
    try { if (task) await updateTask(task.id, input); else await createTask(input); dialog.close(); if (activeTab === 'plan') await renderPlanPage(); else await refreshTodayPlanCard() } catch (error) { fail(error) }
  })
  form.querySelector('#task-delete')?.addEventListener('click', async () => {
    if (!task || !await confirmAction('删除这个任务？', '删除后无法恢复。', '删除任务')) return
    try { await deleteTask(task.id); dialog.close(); if (activeTab === 'plan') await renderPlanPage(); else await refreshTodayPlanCard() } catch (error) { fail(error) }
  })
}

function showManagementHub(): void {
  const dialog = openModal('管理与设置', '<div id="management-hub"></div>')
  const view = dialog.querySelector<HTMLElement>('#management-hub')!
  const row = (id: string, iconName: IconName, title: string, detail: string) => `<button id="${id}"><span class="setting-icon">${icon(iconName, 18)}</span><span><strong>${title}</strong><small>${detail}</small></span>${icon('chevron', 17)}</button>`
  view.innerHTML = `<section class="settings-section"><h3>内容与模板</h3><div class="settings-group">${row('more-food-library', 'utensils', '食物库', '管理食物与营养数据')}${row('more-exercise-library', 'dumbbell', '动作库', '管理力量训练动作')}${row('more-workout-templates', 'activity', '训练模板', '管理常用训练组合')}${row('more-diet-templates', 'archive', '饮食模板', '管理常用饮食组合')}</div></section><section class="settings-section"><h3>个人管理</h3><div class="settings-group">${row('more-habits', 'leaf', '习惯', '创建、排序与停用打卡习惯')}</div></section><section class="settings-section"><h3>数据与备份</h3><div class="settings-group">${row('more-import', 'upload', '导入数据', '从表格或数据文件导入食物')}${row('more-backup', 'download', '备份与恢复', '导出或恢复完整本地数据')}${row('more-github-sync', 'archive', 'GitHub 同步', esc(githubSyncDetail()))}</div><div class="management-local-note"><span aria-hidden="true">${icon('archive', 15)}</span><p><strong>本地数据</strong>本地数据保存在当前设备。更换设备或清除浏览器数据前，请先备份。</p></div></section><section class="settings-section"><h3>应用</h3><div class="settings-group">${row('more-ai-settings', 'sparkles', 'AI 设置', esc(aiSettingsDetail()))}${row('more-about', 'info', '关于 FitLog Lite', 'FitLog Lite · 本地优先')}</div></section>`
  view.querySelector('#more-food-library')?.addEventListener('click', () => void showFoodLibrary())
  view.querySelector('#more-exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#more-workout-templates')?.addEventListener('click', () => void showWorkoutTemplateManager())
  view.querySelector('#more-diet-templates')?.addEventListener('click', () => void showDietTemplateManager())
  view.querySelector('#more-habits')?.addEventListener('click', () => void showHabitManager())
  view.querySelector('#more-import')?.addEventListener('click', () => void db.foods.orderBy('name').toArray().then(foods => showFoodImportChooser(foods)).catch(fail))
  view.querySelector('#more-backup')?.addEventListener('click', () => void showSettings().catch(fail))
  view.querySelector('#more-github-sync')?.addEventListener('click', () => { void flushWorkoutAutosave().then(() => showGitHubSync({ openModal, esc, toast, restored: async () => { workoutAutosave.cancel(); currentWorkout = undefined; workoutEditorOpen = false; await render() } })).catch(fail) })
  view.querySelector('#more-ai-settings')?.addEventListener('click', () => showAiSettings({ openModal, esc, changed: () => aiAssistant.settingsChanged() }, aiAssistant.profiles))
  view.querySelector('#more-about')?.addEventListener('click', () => { openModal('应用信息', `<div class="about-card"><span class="brand-mark large">${icon('leaf', 30)}</span><h2>FitLog Lite</h2><p>一款轻盈、安静的本地个人健康记录工具。</p><small>饮食 · 力量训练 · 体重 · 凯格尔训练</small></div>`) })
}

async function renderCalendarOverview(withProgressTabs = false): Promise<void> {
  const summaries = await loadMonthSummaries(calendarYear, calendarMonth)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `${withProgressTabs ? progressTabsHtml() : ''}<section class="calendar-overview-head"><button class="icon-btn quiet calendar-prev" id="calendar-prev" aria-label="上个月">${icon('chevron', 20)}</button><div><strong>${calendarYear}年 ${calendarMonth + 1}月</strong><button class="text-btn" id="calendar-today">回到今天</button></div><button class="icon-btn quiet" id="calendar-next" aria-label="下个月">${icon('chevron', 20)}</button></section><div id="calendar-host"></div><section class="calendar-legend" aria-label="日历标记说明">${calendarCategories.map((category) => `<span class="calendar-legend-item"><i class="calendar-legend-icon calendar-category-${category}" aria-hidden="true">${icon(calendarCategoryIcons[category], 14)}</i><span>${calendarLegendLabels[category]}</span></span>`).join('')}</section>`
  if (withProgressTabs) bindProgressTabs(view)
  const host = view.querySelector<HTMLElement>('#calendar-host')!
  host.append(renderMonthCalendar({
    year: calendarYear,
    month: calendarMonth,
    selectedDate: calendarSelectedDate,
    summaries,
    onDateClick: (date) => void handleCalendarDateClick(date, summaries.get(date), summaries),
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

async function handleCalendarDateClick(date: string, summary?: CalendarDaySummary, summaries?: Map<string, CalendarDaySummary>): Promise<void> {
  calendarSelectedDate = date
  const selected = new Date(`${date}T12:00:00`)
  if (selected.getFullYear() !== calendarYear || selected.getMonth() !== calendarMonth) {
    calendarYear = selected.getFullYear()
    calendarMonth = selected.getMonth()
    const summaries = await loadMonthSummaries(calendarYear, calendarMonth)
    await render()
    await showCalendarDaySheet(date, summaries.get(date))
    return
  }
  document.querySelectorAll<HTMLButtonElement>('.calendar-day.selected').forEach((element) => {
    element.classList.remove('selected'); element.removeAttribute('aria-selected')
    element.setAttribute('aria-label', getCalendarDayAccessibleLabel(element.dataset.date!, summaries?.get(element.dataset.date!), { today: element.classList.contains('today') }))
  })
  const selectedButton = document.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${date}"]`)
  selectedButton?.classList.add('selected')
  selectedButton?.setAttribute('aria-selected', 'true')
  selectedButton?.setAttribute('aria-label', getCalendarDayAccessibleLabel(date, summary, { selected: true, today: selectedButton.classList.contains('today') }))
  await showCalendarDaySheet(date, summary)
}

async function showCalendarDaySheet(date: string, summary?: CalendarDaySummary): Promise<void> {
  const [cardioSessions, workouts, pelvicSessions] = await Promise.all([
    getCardioSessionsByDate(date),
    db.workouts.where('date').equals(date).toArray(),
    db.pelvicFloorSessions.where('date').equals(date).toArray(),
  ])
  const target = summary?.nutritionTarget
  const rows = buildCalendarDayDetailRows(summary, workouts, cardioSessions, pelvicSessions)
  const canClear = hasDayRecords(summary) || Boolean(target)
  const detailHtml = rows.map((row) => `<article class="day-detail-row" role="group" aria-label="${esc(row.accessibleLabel)}"><div class="day-detail-label"><span class="day-detail-icon calendar-category-${row.key}" aria-hidden="true">${icon(calendarCategoryIcons[row.key], 15)}</span><span>${esc(row.label)}</span></div><div class="day-detail-content"><strong class="${row.empty ? 'is-empty' : ''}">${esc(row.primary)}</strong>${row.secondary.map((detail) => `<span>${esc(detail)}</span>`).join('')}</div></article>`).join('')
  const dialog = openModal(formatHeaderDate(date), `<div class="calendar-day-sheet">${detailHtml}</div><section class="calendar-quick-record" aria-label="快捷记录"><h3>快捷记录</h3><div class="calendar-day-actions"><button id="calendar-day-food">${icon('utensils', 18)} 饮食</button><button id="calendar-day-workout">${icon('dumbbell', 18)} 训练</button><button id="calendar-day-weight">${icon('scale', 18)} 体重</button></div></section>${canClear ? '<div class="calendar-day-danger"><button id="calendar-clear-day" class="danger-button">清空当天记录</button></div>' : ''}`)
  dialog.classList.add('calendar-detail-sheet')
  dialog.querySelector('#calendar-day-food')?.addEventListener('click', () => { dialog.close(); activeTab = 'food'; foodDate = date; void render().catch(fail) })
  dialog.querySelector('#calendar-day-workout')?.addEventListener('click', () => { dialog.close(); activeTab = 'workout'; workoutDate = date; currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = false; void render().catch(fail) })
  dialog.querySelector('#calendar-day-weight')?.addEventListener('click', () => {
    dialog.close(); activeTab = 'progress'; progressView = 'trend'; weightDate = date
    void render().then(() => showWeightForm(date, summary?.weightKg)).catch(fail)
  })
  dialog.querySelector('#calendar-clear-day')?.addEventListener('click', async () => {
    const day = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
    if (!await confirmAction(`清空 ${day} 的饮食、训练和体重记录？`, '将删除当天的饮食记录、营养目标、无氧训练、有氧训练、凯格尔训练和体重记录。计划任务与习惯打卡不会受影响。删除后无法恢复。', '清空当天记录')) return
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
  void previous
  const before = progress
  const mainLength = 2 * Math.PI * 40
  const outerLength = 2 * Math.PI * 49
  const mainStart = mainLength * (1 - before.main)
  const outerStart = outerLength * (1 - before.outer)
  const crossed = ''
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
  return `<span class="nutrition-metric ${key}" data-progress-key="${key}" data-actual="${actual}" ${target === undefined ? '' : `data-goal="${target}"`} aria-label="${label} ${amount} ${goalStatusText(actual, target, 'g')}"><b>${label}</b>${ringSvgHtml(actual, target, 'small', previous)}<span class="macro-value" aria-hidden="true"><span data-count-from="${previous?.actual ?? 0}" data-count-to="${actual}">${formatNumber(actual)}</span>${target === undefined ? 'g' : ` / ${formatNumber(target)}g`}</span>${status}</span>`
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
  const mealIcon: Record<MealType, IconName> = { breakfast: 'sunrise', lunch: 'sun', dinner: 'moon', snack: 'snack' }
  return `<section class="food-meal ${count ? 'has-logs' : 'is-empty'}" data-meal-section="${key}">
    <div class="food-meal-head"><button class="food-meal-summary" ${count ? `data-toggle-meal="${key}" aria-expanded="false"` : meal ? `data-add-meal="${meal}"` : ''} ${count || meal ? '' : 'disabled'} aria-label="${count ? `查看${group.name} ${count} 项记录` : `记录${group.name}`}"><span class="meal-symbol ${key}" aria-hidden="true">${icon(meal ? mealIcon[meal] : 'archive', 17)}</span><span class="meal-title"><strong>${group.name}</strong>${count ? `<small>${count} 项 · ${formatNumber(group.calories)} kcal</small>` : ''}</span></button>${meal ? `<button class="meal-record" data-add-meal="${meal}">记录 ${icon('chevron', 15)}</button>` : '<span class="meal-unclassified-note">待整理</span>'}</div>
    ${count ? `<p class="meal-macros">${macro}</p>` : ''}
    <p class="meal-preview">${preview}</p>
    ${count ? `<div class="meal-log-list" hidden>${group.logs.map(foodLogRowHtml).join('')}</div>` : ''}
  </section>`
}

const FOOD_RAIL_WINDOW_RADIUS = 15
const FOOD_RAIL_FOCUS_RADIUS_RATIO = .55

function foodRailItemHtml(date: string): string {
  const label = foodPagerLabel(date)
  const day = Number(date.slice(8, 10))
  const month = Number(date.slice(5, 7))
  return '<button class="food-date-item" type="button" data-food-date="' + date + '" aria-label="' + label + '，' + month + '月' + day + '日"><span class="food-date-item-content"><strong>' + label + '</strong><small>' + month + '月' + day + '日</small></span></button>'
}

function paintFoodRailFocus(rail: HTMLElement): void {
  const railRect = rail.getBoundingClientRect()
  const center = railRect.left + railRect.width / 2
  const radius = railRect.width * FOOD_RAIL_FOCUS_RADIUS_RATIO
  const focusValues = Array.from(rail.querySelectorAll<HTMLButtonElement>('.food-date-item'), (item) => {
    const rect = item.getBoundingClientRect()
    return [item, foodRailFocus(rect.left + rect.width / 2 - center, radius)] as const
  })
  focusValues.forEach(([item, focus]) => item.style.setProperty('--rail-focus', String(focus)))
}

function centerFoodRail(rail: HTMLElement, date: string, behavior: ScrollBehavior = 'auto', preservePageScroll = false): void {
  const item = Array.from(rail.querySelectorAll<HTMLButtonElement>('.food-date-item')).find((button) => button.dataset.foodDate === date)
  if (!item) return
  const railRect = rail.getBoundingClientRect(), itemRect = item.getBoundingClientRect()
  rail.scrollTo({ left: rail.scrollLeft + itemRect.left + itemRect.width / 2 - railRect.left - railRect.width / 2, behavior: preservePageScroll ? 'auto' : behavior })
}

function updateFoodRail(rail: HTMLElement, selectedDate: string, forceWindow = false): void {
  const track = rail.querySelector<HTMLElement>('.food-date-rail-track')!
  let items = Array.from(track.querySelectorAll<HTMLButtonElement>('.food-date-item'))
  const index = items.findIndex((item) => item.dataset.foodDate === selectedDate)
  const rebuild = forceWindow || foodRailNeedsRecenter(index, items.length)
  if (rebuild) {
    const focusedDate = items.find((item) => item === document.activeElement)?.dataset.foodDate
    track.innerHTML = foodRailDates(selectedDate, FOOD_RAIL_WINDOW_RADIUS).map(foodRailItemHtml).join('')
    items = Array.from(track.querySelectorAll<HTMLButtonElement>('.food-date-item'))
    if (focusedDate) items.find((item) => item.dataset.foodDate === focusedDate)?.focus({ preventScroll: true })
  }
  items.forEach((item) => {
    const selected = item.dataset.foodDate === selectedDate
    if (selected) item.setAttribute('aria-current', 'date')
    else item.removeAttribute('aria-current')
  })
  if (rebuild) {
    centerFoodRail(rail, selectedDate, 'auto', true)
    paintFoodRailFocus(rail)
  }
}

function updateFoodTodayShortcut(): void {
  const shortcut = app.querySelector<HTMLButtonElement>('#food-return-today')
  if (shortcut) shortcut.hidden = !shouldShowFoodTodayShortcut(foodDate)
}

function commitFoodDate(date: string, forceWindow = false): void {
  if (!shouldCommitFoodDate(date, foodDate) && !forceWindow) { updateFoodTodayShortcut(); return }
  const changed = date !== foodDate
  foodDate = date
  updateFoodTodayShortcut()
  const rail = app.querySelector<HTMLElement>('.food-date-rail')
  if (rail) updateFoodRail(rail, date, forceWindow)
  if (changed) void renderFoodPage().catch(fail)
}

function returnFoodToToday(): void {
  const today = getLocalDateString()
  if (foodDate === today) { updateFoodTodayShortcut(); return }
  const oldRail = app.querySelector<HTMLElement>('.food-date-rail')
  if (oldRail) {
    foodRailEvents?.abort()
    const rail = document.createElement('div')
    rail.className = 'food-date-rail'
    rail.setAttribute('role', 'group')
    rail.setAttribute('aria-label', '切换饮食记录日期')
    rail.innerHTML = '<div class="food-date-rail-track"></div>'
    oldRail.replaceWith(rail)
    rail.closest<HTMLElement>('.food-date-rail-shell')!.dataset.state = 'idle'
    updateFoodRail(rail, today, true)
    bindFoodRail(rail)
  }
  commitFoodDate(today)
}

function bindFoodRail(rail: HTMLElement): void {
  foodRailEvents?.abort()
  foodRailEvents = new AbortController()
  const signal = foodRailEvents.signal
  const shell = rail.closest<HTMLElement>('.food-date-rail-shell')!
  const items = () => Array.from(rail.querySelectorAll<HTMLButtonElement>('.food-date-item'))
  const supportsScrollEnd = 'onscrollend' in document.createElement('div')
  let focusFrame: number | undefined
  let settleTimer: number | undefined
  let touchActive = false
  let touchStartX = 0
  let touchStartY = 0
  let pointerId: number | undefined
  let pointerStartX = 0
  let pointerStartY = 0
  const state = (value: 'idle' | 'pressed' | 'dragging' | 'settling') => { shell.dataset.state = value }
  const scheduleFocus = () => {
    if (focusFrame !== undefined) return
    focusFrame = window.requestAnimationFrame(() => {
      focusFrame = undefined
      if (rail.isConnected) paintFoodRailFocus(rail)
    })
  }
  const settle = () => {
    if (!rail.isConnected || activeTab !== 'food') return
    const center = rail.getBoundingClientRect().left + rail.clientWidth / 2
    let nearest: HTMLButtonElement | undefined
    let distance = Number.POSITIVE_INFINITY
    for (const item of items()) {
      const rect = item.getBoundingClientRect()
      const nextDistance = Math.abs(rect.left + rect.width / 2 - center)
      if (nextDistance < distance) { nearest = item; distance = nextDistance }
    }
    if (nearest?.dataset.foodDate) commitFoodDate(nearest.dataset.foodDate)
    state('idle')
    scheduleFocus()
  }
  rail.addEventListener('scroll', () => {
    state(touchActive || pointerId !== undefined ? 'dragging' : 'settling')
    scheduleFocus()
    if (!supportsScrollEnd) {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, 100)
    }
  }, { signal })
  if (supportsScrollEnd) rail.addEventListener('scrollend', settle, { signal })
  rail.addEventListener('touchstart', (event) => {
    const touch = event.touches[0]
    if (!touch) return
    touchActive = true
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    state('pressed')
  }, { signal, passive: true })
  rail.addEventListener('touchmove', (event) => {
    const touch = event.touches[0]
    if (!touchActive || !touch) return
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) state('dragging')
  }, { signal, passive: true })
  const finishTouch = () => {
    touchActive = false
    state(shell.dataset.state === 'dragging' ? 'settling' : 'idle')
  }
  rail.addEventListener('touchend', finishTouch, { signal, passive: true })
  rail.addEventListener('touchcancel', finishTouch, { signal, passive: true })
  rail.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) return
    pointerId = event.pointerId
    pointerStartX = event.clientX
    pointerStartY = event.clientY
    state('pressed')
  }, { signal })
  rail.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return
    const dx = event.clientX - pointerStartX
    const dy = event.clientY - pointerStartY
    if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) state('dragging')
  }, { signal })
  const finishPointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    pointerId = undefined
    state(shell.dataset.state === 'dragging' ? 'settling' : 'idle')
  }
  rail.addEventListener('pointerup', finishPointer, { signal })
  rail.addEventListener('pointercancel', finishPointer, { signal })
  rail.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.food-date-item') : null
    if (!button || !rail.contains(button)) return
    state('settling')
    centerFoodRail(rail, button.dataset.foodDate!, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
    const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2
    const buttonCenter = button.getBoundingClientRect().left + button.offsetWidth / 2
    if (Math.abs(railCenter - buttonCenter) < 2) settle()
  }, { signal })
  rail.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const focused = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.food-date-item') : null
    if (!focused) return
    const buttons = items()
    const next = buttons[buttons.indexOf(focused) + (event.key === 'ArrowLeft' ? -1 : 1)]
    if (!next) return
    event.preventDefault()
    next.focus({ preventScroll: true })
    state('settling')
    centerFoodRail(rail, next.dataset.foodDate!, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
  }, { signal })
  const resizeObserver = new ResizeObserver(() => { centerFoodRail(rail, foodDate, 'auto', true); scheduleFocus() })
  resizeObserver.observe(rail)
  signal.addEventListener('abort', () => {
    resizeObserver.disconnect()
    if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
    window.clearTimeout(settleTimer)
  }, { once: true })
}

async function renderFoodPage(): Promise<void> {
  updateFoodTodayShortcut()
  const requestedDate = foodDate
  const requestVersion = ++foodContentVersion
  const view = document.querySelector<HTMLElement>('#view')!
  const [logs, target] = await Promise.all([
    db.foodLogs.where('date').equals(requestedDate).sortBy('createdAt'),
    db.nutritionTargets.where('date').equals(requestedDate).first(),
  ])
  if (activeTab !== 'food' || !view.isConnected || !isCurrentFoodRender(requestVersion, foodContentVersion, requestedDate, foodDate)) return
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.totalCalories,
    protein: sum.protein + (log.totalProtein ?? 0), carbs: sum.carbs + (log.totalCarbs ?? 0), fat: sum.fat + (log.totalFat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const hasMacros = logs.some((log) => log.totalProtein !== undefined || log.totalCarbs !== undefined || log.totalFat !== undefined) || Boolean(target)
  const isToday = requestedDate === getLocalDateString()
  const previous = new Map<string, PreviousRingValue>()
  view.querySelectorAll<HTMLElement>('[data-progress-key]').forEach((element) => {
    if (element.closest<HTMLElement>('[data-food-date]')?.dataset.foodDate !== requestedDate) return
    previous.set(element.dataset.progressKey!, { actual: Number(element.dataset.actual), goal: element.dataset.goal === undefined ? undefined : Number(element.dataset.goal) })
  })
  const calorieTarget = target?.calories
  const calorieAmount = calorieTarget === undefined ? `${formatNumber(totals.calories)} kcal` : `${formatNumber(totals.calories)} / ${formatNumber(calorieTarget)} kcal`
  const groups = groupFoodLogs(logs)
  const completionStrip = target ? foodCompletionStripHtml(requestedDate, getNutritionCompletionSummary(target, logs)) : ''
  const slotHtml = `<div class="food-content-body" data-food-date="${requestedDate}">
    <section class="nutrition-hero food-nutrition-hero" data-food-date="${requestedDate}" aria-label="${isToday ? '今日' : '当日'}营养汇总"><div class="nutrition-hero-head"><span class="hero-label">热量</span><button class="text-btn" data-edit-nutrition-target>${target ? '编辑目标' : '设置目标'} ${icon('chevron', 15)}</button></div><div class="food-calorie-row"><div class="calorie-gauge" data-progress-key="calories" data-actual="${totals.calories}" ${calorieTarget === undefined ? '' : `data-goal="${calorieTarget}"`} aria-label="热量 ${calorieAmount} ${goalStatusText(totals.calories, calorieTarget, 'kcal')}">${ringSvgHtml(totals.calories, calorieTarget, 'large', previous.get('calories'))}<div class="calorie-gauge-center"><strong data-count-from="${previous.get('calories')?.actual ?? 0}" data-count-to="${totals.calories}">${formatNumber(totals.calories)}</strong><small>kcal</small></div></div><div class="calorie-gauge-caption"><span>当日摄入</span>${calorieTarget === undefined ? '<strong>按自己的节奏</strong>' : `<strong>目标 ${formatNumber(calorieTarget)} kcal</strong>`}<span class="${getGoalProgress(totals.calories, calorieTarget).state === 'above' ? 'metric-excess' : ''}">${goalStatusText(totals.calories, calorieTarget, 'kcal')}</span></div></div><div class="macros ${hasMacros ? '' : 'is-empty'}">${nutritionMetricHtml('protein', '蛋白质', totals.protein, target?.protein, previous.get('protein'))}${nutritionMetricHtml('carbs', '碳水', totals.carbs, target?.carbs, previous.get('carbs'))}${nutritionMetricHtml('fat', '脂肪', totals.fat, target?.fat, previous.get('fat'))}</div>${completionStrip}</section>
    <section class="food-meals-head"><div><h2>${isToday ? '今日' : '当日'}饮食</h2><span>${logs.length ? `${logs.length} 项记录` : '按餐次记录，更清楚'}</span></div>${logs.length ? '<button class="food-save-template" id="save-day-diet-template" type="button" aria-label="将当天饮食保存为模板">保存为模板</button>' : ''}</section>
    <div class="food-meals">${groups.map((group) => foodMealSectionHtml(group, isToday)).join('')}</div></div>`
  let rail = view.querySelector<HTMLElement>('.food-date-rail')
  let content = view.querySelector<HTMLElement>('.food-content')
  const firstAppearance = !rail
  const previousDate = view.dataset.foodContentDate
  if (!rail || !content) {
    view.innerHTML = `<div class="food-date-navigation"><div class="food-date-helper"><button type="button" id="food-date-picker-open" class="food-date-jump fitlog-date-trigger" aria-label="选择饮食记录日期">${icon('calendar', 16)}<span>选择日期</span></button><button class="food-today-shortcut" id="food-return-today" type="button" aria-label="回到今天" hidden>回到今天</button></div><div class="food-date-rail-shell"><div class="food-date-selection" aria-hidden="true"></div><div class="food-date-rail" role="group" aria-label="切换饮食记录日期"><div class="food-date-rail-track"></div></div></div></div><div class="food-content"></div>`
    rail = view.querySelector<HTMLElement>('.food-date-rail')!
    content = view.querySelector<HTMLElement>('.food-content')!
    updateFoodTodayShortcut()
    updateFoodRail(rail, requestedDate, true)
    bindFoodRail(rail)
  }
  content.innerHTML = slotHtml
  view.dataset.foodContentDate = requestedDate
  const body = content.firstElementChild as HTMLElement
  if (firstAppearance || previousDate === requestedDate) {
  } else {
    body.querySelectorAll<SVGCircleElement>('[data-final-offset]').forEach((ring) => { ring.style.strokeDashoffset = ring.dataset.finalOffset ?? '' })
    body.querySelectorAll<HTMLElement>('[data-count-to]').forEach((number) => { number.textContent = formatNumber(Number(number.dataset.countTo)) })
  }
  bindFoodContent(body, target, logs)
  bindFoodHeader()
}

function bindFoodHeader(): void {
  foodHeaderEvents?.abort()
  foodHeaderEvents = new AbortController()
  const headerSignal = foodHeaderEvents.signal
  app.querySelector('#food-date-picker-open')?.addEventListener('click', () => showBusinessDatePicker('选择饮食日期', foodDate, date => { if (date !== foodDate) commitFoodDate(date, true) }), { signal: headerSignal })
  app.querySelector('#food-return-today')?.addEventListener('click', returnFoodToToday, { signal: headerSignal })
  app.querySelector('#food-library')?.addEventListener('click', () => void showFoodLibrary(), { signal: headerSignal })
  app.querySelector('#use-diet-template')?.addEventListener('click', () => void showDietTemplatePicker(), { signal: headerSignal })
}

function bindFoodContent(slot: HTMLElement, target: NutritionTarget | undefined, logs: FoodLog[]): void {
  slot.querySelector('#food-completion-open')?.addEventListener('click', () => void showNutritionCompletion(slot.dataset.foodDate!))
  slot.querySelector('#save-day-diet-template')?.addEventListener('click', () => void saveDayAsDietTemplate(logs))
  slot.querySelector('[data-edit-nutrition-target]')?.addEventListener('click', () => showNutritionTargetForm(foodDate, target))
  slot.querySelectorAll<HTMLButtonElement>('[data-add-meal]').forEach((button) => button.addEventListener('click', () => { const meal = button.dataset.addMeal; if (isMealType(meal)) void showAddFoodLog(meal) }))
  slot.querySelectorAll<HTMLButtonElement>('[data-toggle-meal]').forEach((button) => button.addEventListener('click', () => { const list = button.closest('.food-meal')?.querySelector<HTMLElement>('.meal-log-list'); if (!list) return; list.hidden = !list.hidden; button.setAttribute('aria-expanded', String(!list.hidden)) }))
  slot.querySelectorAll<HTMLButtonElement>('[data-delete-log]').forEach((button) => button.addEventListener('click', async () => {
    button.closest('details')?.removeAttribute('open')
    if (!await confirmAction('删除饮食记录？', '删除后无法撤销，但不会影响食物库。')) return
    try { await db.foodLogs.delete(button.dataset.deleteLog!); toast('已删除'); await renderFoodPage() } catch (error) { fail(error) }
  }))
  slot.querySelectorAll<HTMLButtonElement>('[data-edit-log]').forEach((button) => button.addEventListener('click', async () => {
    const log = await db.foodLogs.get(button.dataset.editLog!)
    if (!log) return
    const dialog = openModal('编辑饮食记录', `<form id="edit-log-form" class="form"><label>实际重量<input name="grams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${log.grams}" required><span>g</span></label><label>餐次<select name="meal"><option value="">未分类</option>${mealTypes.map((meal) => `<option value="${meal}" ${log.meal === meal ? 'selected' : ''}>${mealNames[meal]}</option>`).join('')}</select></label><button class="primary" type="submit">保存</button></form>`)
    dialog.querySelector<HTMLFormElement>('#edit-log-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); try { const data = new FormData(event.currentTarget as HTMLFormElement); const meal = valueOf(data, 'meal'); await updateFoodLogDetails(log.id, valueOf(data, 'grams'), isMealType(meal) ? meal : undefined); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
    })
  }))
}

function foodCompletionStripHtml(date: string, summary: NutritionCompletionSummary): string {
  const metrics = completionKeys.filter((key) => summary.target[key] !== undefined).map((key) => `${completionLabels[key]}${completionGapText(summary, key)}`).join(' · ')
  return `<div class="food-completion-strip"><div class="food-completion-summary"><strong>剩余目标</strong><p>${esc(metrics)}</p>${summary.nothingToComplete ? `<span>${summary.uncertainKeys.length ? '可确定的目标暂无需要补齐的部分' : '当前没有需要补齐的目标'}</span>` : ''}</div>${summary.nothingToComplete ? '' : `<button type="button" class="secondary" id="food-completion-open">${completionDateLabel(date, getLocalDateString(), true)}</button>`}</div>`
}

async function showNutritionCompletion(date: string): Promise<void> {
  const dialog = openModal(completionDateLabel(date, getLocalDateString()), '<p role="status" class="completion-note">正在计算方案…</p>')
  try {
    const [target, logs, foods] = await Promise.all([db.nutritionTargets.where('date').equals(date).first(), db.foodLogs.where('date').equals(date).toArray(), db.foods.toArray()])
    if (!dialog.isConnected || !dialog.open) return
    if (!target) { dialog.querySelector('.modal-body')!.innerHTML = '<p class="completion-note">请先为这个日期设置营养目标。</p>'; return }
    const result = completeNutrition(target, logs, foods)
    const future = isFutureBusinessDate(date)
    const amount = (key: typeof completionKeys[number], value: number | undefined): string => value === undefined ? '数据不完整' : `${formatNumber(value)} ${key === 'calories' ? 'kcal' : 'g'}`
    const gaps = completionKeys.filter((key) => target[key] !== undefined).map((key) => `<div><span>${completionLabels[key]}</span><strong>${completionGapText(result, key)}</strong></div>`).join('')
    const uncertainty = result.uncertainKeys.length ? `<p class="completion-note">部分记录缺少${result.uncertainKeys.map((key) => completionLabels[key]).join('、')}数据，对应目标未参与补齐计算。</p>` : ''
    const planHtml = result.plans.map((plan, index) => `<article class="completion-plan"><div class="completion-plan-heading"><h3>方案 ${index + 1}</h3><span>${index === 0 ? '最接近当前目标' : '另一种组合'}</span></div><ul class="completion-plan-items">${plan.items.map((item) => `<li><div><strong>${esc(item.food.name)}</strong>${item.food.brand ? `<small>${esc(item.food.brand)}</small>` : ''}</div><b>${formatNumber(item.grams)} g</b></li>`).join('')}</ul><div class="completion-plan-summary"><h4>预计补充</h4><p>${completionKeys.map((key) => `${completionLabels[key]} ${amount(key, plan.added[key])}`).join(' · ')}</p><h4>补充后预计</h4><dl>${completionKeys.filter((key) => target[key] !== undefined).map((key) => `<div><dt>${completionLabels[key]}</dt><dd>${plan.projected[key] === undefined ? '数据不完整' : `${formatNumber(plan.projected[key]!)} / ${formatNumber(target[key]!)} ${key === 'calories' ? 'kcal' : 'g'}`}</dd></div>`).join('')}</dl></div>${future ? '' : `<button type="button" class="secondary completion-adopt" data-completion-adopt="${index}" aria-label="采用方案 ${index + 1}" aria-expanded="false">采用方案</button><div class="completion-meal-picker" id="completion-meals-${index}" hidden></div>`}</article>`).join('')
    const empty = result.nothingToComplete ? (result.uncertainKeys.length ? '可确定的目标暂无需要补齐的部分。' : '当前没有需要补齐的目标。') : foods.length === 0 || result.excludedFoodCount === foods.length ? '食物库里还没有足够的营养数据来计算方案。' : '根据现有食物，暂未找到能改善剩余目标的方案。'
    dialog.querySelector('.modal-body')!.innerHTML = `<div class="nutrition-completion"><p class="completion-note">${formatHeaderDate(date)} · 根据你的食物库计算建议克数。</p><section aria-label="剩余目标"><h3 class="completion-section-label">剩余目标</h3><div class="completion-gap-grid">${gaps}</div></section>${uncertainty}${future ? '<p class="completion-note completion-future" role="status">这是未来日期的计划建议，到了当天实际吃下后再记录。未来日期仅预览。</p>' : ''}${result.plans.length ? `${result.plans[0]!.closeEnough ? '' : '<p class="completion-note">根据现有食物，以下方案会尽量接近目标，部分目标可能仍有差距。</p>'}${planHtml}` : `<div class="completion-empty"><p>${empty}</p>${result.nothingToComplete ? '' : '<button type="button" class="secondary" id="completion-library">打开食物库</button>'}</div>`}${result.excludedFoodCount ? `<p class="completion-note">有 ${result.excludedFoodCount} 项食物因营养数据不完整未参与计算。</p>` : ''}</div>`
    dialog.querySelector('#completion-library')?.addEventListener('click', () => { dialog.close(); void showFoodLibrary() })
    let applying = false
    dialog.querySelectorAll<HTMLButtonElement>('[data-completion-adopt]').forEach((button) => button.addEventListener('click', () => {
      if (applying) return
      const index = Number(button.dataset.completionAdopt)
      dialog.querySelectorAll<HTMLElement>('.completion-meal-picker').forEach((picker) => { picker.hidden = true; picker.innerHTML = '' })
      dialog.querySelectorAll('[data-completion-adopt]').forEach((item) => item.setAttribute('aria-expanded', 'false'))
      const picker = dialog.querySelector<HTMLElement>(`#completion-meals-${index}`)!
      picker.hidden = false
      button.setAttribute('aria-expanded', 'true')
      picker.innerHTML = `<p>实际吃下后，加入哪一餐？</p><div>${[...mealTypes, ''].map((meal) => `<button type="button" data-completion-meal="${meal}">${isMealType(meal) ? mealNames[meal] : '未分类'}</button>`).join('')}</div>`
      picker.querySelectorAll<HTMLButtonElement>('[data-completion-meal]').forEach((mealButton) => mealButton.addEventListener('click', async () => {
        if (applying) return
        applying = true
        dialog.querySelectorAll<HTMLButtonElement>('[data-completion-adopt], [data-completion-meal]').forEach((item) => { item.disabled = true })
        try {
          const meal = mealButton.dataset.completionMeal
          const created = await applyNutritionCompletionPlan(date, isMealType(meal) ? meal : undefined, result.plans[index]!.items)
          dialog.close(); toast(`已添加 ${created.length} 项饮食记录`); await renderFoodPage()
        } catch (error) {
          applying = false
          dialog.querySelectorAll<HTMLButtonElement>('[data-completion-adopt], [data-completion-meal]').forEach((item) => { item.disabled = false })
          fail(error)
        }
      }))
      const surface = dialog.querySelector<HTMLElement>('.modal-body')!, bodyRect = surface.getBoundingClientRect(), pickerRect = picker.getBoundingClientRect()
      if (pickerRect.bottom > bodyRect.bottom) surface.scrollTo({ top: surface.scrollTop + pickerRect.bottom - bodyRect.bottom, behavior: 'auto' })
    }))
  } catch (error) { if (dialog.isConnected && dialog.open) dialog.querySelector('.modal-body')!.innerHTML = '<p class="completion-note">暂时无法计算方案，请关闭后重试。</p>'; fail(error) }
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

function openFoodVisionWorkflow(date: string, meal?: MealType): void {
  showFoodVisionImport({ openModal, esc, profiles: aiAssistant.profiles, openSettings: () => showAiSettings({ openModal, esc, changed: () => aiAssistant.settingsChanged() }, aiAssistant.profiles), onFinish: logged => { if (!logged) void showFoodLibrary() }, onSaved: async (_food, logged) => { toast(logged ? meal ? '已记录' : '已加入食物库并记录饮食' : '已加入食物库'); if (activeTab === 'food') await renderFoodPage(); else if (activeTab === 'today') await renderTodayPage() } }, { date, meal })
}

async function showAddFoodLog(meal: MealType): Promise<void> {
  const recordDate = foodDate
  const foods = await db.foods.orderBy('name').toArray()
  const dialog = openModal(`记录${mealNames[meal]}`, foods.length ? `<div class="form"><label class="search-field"><span class="sr-only">搜索食物</span>${icon('search', 19)}<input id="food-search" type="search" placeholder="搜索食物或品牌" autocomplete="off"></label><div id="food-results" class="picker-list"></div><button class="sheet-link" id="vision-food-from-picker">${icon('camera', 18)} 拍包装并记录</button><button class="sheet-link" id="create-food-from-picker">${icon('plus', 18)} 新建食物</button></div>` : `<div class="empty compact minimal"><div class="empty-icon">${icon('archive', 24)}</div><h3>食物库还是空的</h3><p>先创建一种食物。</p><button class="secondary" id="vision-food-from-picker">${icon('camera', 18)} 拍包装并记录</button><button class="primary" id="create-first-food">${icon('plus', 18)} 新建食物</button></div>`, true)
  dialog.querySelector('#vision-food-from-picker')?.addEventListener('click', () => { dialog.close(); openFoodVisionWorkflow(recordDate, meal) })
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
      dialog.querySelector('.modal-body')!.innerHTML = `<form id="log-food-form" class="form quantity-form"><div class="selected-food"><span>每 ${formatNumber(food.referenceGrams)}g</span><strong>${formatNumber(food.calories)} kcal</strong></div><label class="quantity-label">吃了多少？<span class="quantity-input"><input name="grams" id="grams" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="230" required><b>g</b></span></label><div class="preview-number"><span>预计热量</span><strong id="kcal-preview">— kcal</strong></div><button class="primary" type="submit">添加</button></form>`
      const input = dialog.querySelector<HTMLInputElement>('#grams')!
      input.addEventListener('input', () => {
        const grams = Number(input.value)
        dialog.querySelector('#kcal-preview')!.textContent = Number.isFinite(grams) && grams > 0 ? `${formatNumber(calculateNutrition(food, grams).calories)} kcal` : '— kcal'
      })
      dialog.querySelector<HTMLFormElement>('#log-food-form')?.addEventListener('submit', async (event) => {
        event.preventDefault(); try { await logFood(food, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'grams'), recordDate, meal); dialog.close(); toast('已保存'); await renderFoodPage() } catch (error) { fail(error) }
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
  const dialog = openModal('食物库', `<div class="toolbar"><label class="search-field"><span class="sr-only">搜索食物库</span>${icon('search', 19)}<input id="library-search" type="search" value="${esc(query)}" placeholder="搜索食物"></label><button class="icon-btn add-button" id="new-food" aria-label="新建食物">${icon('plus')}</button></div><div class="food-library-actions"><button class="secondary compact-action" id="food-vision-import">${icon('camera', 17)} 拍包装录入</button><button class="secondary compact-action" id="food-import-open">${icon('upload', 17)} 导入文件</button></div><div class="library-list"></div>`, foods.length > 0)
  dialog.classList.add('food-library-sheet')
  const list = dialog.querySelector<HTMLElement>('.library-list')!
  const draw = (nextQuery: string) => {
    currentQuery = nextQuery
    const normalized = nextQuery.trim().toLocaleLowerCase()
    const filtered = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized))
    list.innerHTML = filtered.length ? filtered.map((food) => `<article><button class="library-main" data-edit-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}<p>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</p></span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-food="${food.id}" aria-label="删除 ${esc(food.name)}">${icon('trash', 17)}</button></article>`).join('') : normalized ? '<div class="library-empty"><h3>没有匹配的食物</h3><p>换个关键词试试。</p><button class="text-btn compact-action" id="clear-food-search">清除搜索</button></div>' : '<div class="library-empty"><h3>还没有食物</h3><p>拍包装录入，或手动新建。</p></div>'
    list.querySelector('#clear-food-search')?.addEventListener('click', () => { window.clearTimeout(searchTimer); dialog.querySelector<HTMLInputElement>('#library-search')!.value = ''; draw('') })
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
  dialog.querySelector('#food-vision-import')?.addEventListener('click', () => { const date = activeTab === 'food' ? foodDate : getLocalDateString(); dialog.close(); openFoodVisionWorkflow(date) })
  dialog.querySelector('#new-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
  dialog.querySelector('#food-import-open')?.addEventListener('click', () => showFoodImportChooser(foods, currentQuery))
}

function showFoodImportChooser(foods: Food[], query = ''): void {
  const dialog = openModal('导入食物', `<div class="food-import-choices"><button class="secondary compact-action" id="import-csv">${icon('upload', 18)} 表格文件（CSV）</button><button class="secondary compact-action" id="import-json">${icon('upload', 18)} 数据文件（JSON）</button><input id="import-file" type="file" hidden><button class="text-btn compact-action" id="import-back">返回食物库</button></div>`)
  dialog.querySelector('#import-back')?.addEventListener('click', () => void showFoodLibrary(query))
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
  return `<form id="food-form" class="form food-form"><label>食物名称 *<input name="name" value="${esc(food?.name)}" placeholder="鸡胸肉" required></label><label>品牌<input name="brand" value="${esc(food?.brand)}" placeholder="可选"></label><label>基准重量 *<input name="referenceGrams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${food?.referenceGrams ?? 100}" required><span>g</span></label><div class="food-energy-group"><label>能量 *<div class="energy-input-row"><input name="calories" type="number" inputmode="decimal" min="0" step="any" value="${food?.calories ?? ''}" placeholder="165" required><select name="energyUnit" aria-label="能量单位"><option value="kcal">kcal</option><option value="kJ">kJ</option></select></div></label><p id="food-energy-preview" class="food-energy-preview"></p></div><div class="food-macro-grid" role="group" aria-label="宏量营养"><label>蛋白质<input name="protein" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.protein ?? ''}"><span>g</span></label><label>碳水<input name="carbs" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.carbs ?? ''}"><span>g</span></label><label>脂肪<input name="fat" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.fat ?? ''}"><span>g</span></label></div><button class="primary compact-action" type="submit">保存食物</button></form>`
}

async function showFoodForm(food?: Food): Promise<void> {
  const dialog = openModal(food ? '编辑食物' : '新建食物', foodFields(food))
  const energyInput = dialog.querySelector<HTMLInputElement>('[name=calories]')!, energyUnit = dialog.querySelector<HTMLSelectElement>('[name=energyUnit]')!
  const energyEditor = bindEnergyEditor(energyInput, energyUnit, food?.calories)
  const updateEnergyPreview = () => { const node = dialog.querySelector('#food-energy-preview')!; try { const kcal = energyToKcal(Number(energyInput.value), energyUnit.value as EnergyUnit); node.textContent = energyInput.value.trim() ? `${formatNumber(kcal)} kcal · ${formatNumber(kcalToKj(kcal))} kJ` : '填写包装能量，保存时统一为 kcal' } catch { node.textContent = '请填写有效能量' } }
  energyInput.addEventListener('input', updateEnergyPreview)
  energyUnit.addEventListener('change', updateEnergyPreview)
  updateEnergyPreview()
  dialog.querySelector<HTMLFormElement>('#food-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement)
    try {
      await saveFood({ name: valueOf(data, 'name'), brand: valueOf(data, 'brand'), referenceGrams: Number(valueOf(data, 'referenceGrams')), calories: energyEditor.kcal ?? NaN, protein: valueOf(data, 'protein') as unknown as number, carbs: valueOf(data, 'carbs') as unknown as number, fat: valueOf(data, 'fat') as unknown as number }, food?.id)
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
  const [todayWorkouts, cardioSessions, pelvicSessions, allPelvicSessions] = await Promise.all([
    db.workouts.where('date').equals(workoutDate).toArray(),
    getCardioSessionsByDate(workoutDate),
    db.pelvicFloorSessions.where('date').equals(workoutDate).toArray(),
    db.pelvicFloorSessions.toArray(),
  ])
  const pelvicSeconds = pelvicSessions.reduce((total, session) => total + pelvicFloorSessionDurationSeconds(session), 0)
  const strengthExercises = todayWorkouts.reduce((total, workout) => total + workout.exercises.length, 0)
  const strengthSets = todayWorkouts.reduce((total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 0)
  const cardioMinutes = cardioSessions.reduce((total, session) => total + session.durationMinutes, 0)
  const latestCardio = [...cardioSessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const dailyPlanRoutine = pelvicPlanRoutine(selectedPelvicPlanLevel(getPelvicFloorPlanProgress(allPelvicSessions)))
  const recentWorkouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)).slice(0, 4)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="context-row"><button type="button" id="workout-date-picker-open" class="date-control fitlog-date-trigger">${icon('calendar', 17)}<span>训练日期 · ${datePickerLabel(workoutDate).split(' · ')[0]}</span></button><div class="context-actions"><button class="text-btn" id="workout-templates">训练模板</button><button class="text-btn" id="exercise-library">动作库 ${icon('chevron', 16)}</button></div></section>
    <section class="training-category"><div class="training-section-head"><h2 class="training-category-label">无氧训练</h2></div><div class="training-card"><div class="training-card-title"><span class="training-card-icon">${icon('dumbbell', 20)}</span><div><h3>力量训练</h3><p>记录动作与组数</p></div></div><p class="training-card-summary">${openWorkout ? `正在记录 · ${strengthExercises} 个动作 · ${strengthSets} 组` : todayWorkouts.length ? `今日 ${strengthExercises} 个动作 · ${strengthSets} 组` : '今天还没有力量训练'}</p><button class="primary training-card-action" id="start-workout">${openWorkout ? '继续训练' : '开始力量训练'}</button></div></section>
    <section class="training-category"><div class="training-section-head"><h2 class="training-category-label">有氧训练</h2><button class="text-btn" id="cardio-history">历史记录</button></div><div class="training-card"><div class="training-card-title"><span class="training-card-icon">${icon('activity', 20)}</span><div><h3>有氧记录</h3><p>楼梯机 · 跑步机</p></div></div>${cardioSessions.length ? `<div class="training-card-summary"><span>${cardioSessions.length === 1 ? '今日 1 次' : `今日 ${cardioSessions.length} 次`}</span><strong>${formatNumber(cardioMinutes)} <small>分钟</small></strong><span>${cardioSessions.length === 1 ? `${getCardioActivityLabel(cardioSessions[0]!)} · ${formatCardioMetrics(cardioSessions[0]!).join(' · ')}` : `最近：${getCardioActivityLabel(latestCardio!)}`}</span></div>` : '<p class="training-card-summary">今天还没有有氧训练</p>'}<button class="secondary training-card-action" id="add-cardio">${cardioSessions.length ? '再记一次' : '记录训练'}</button>${latestCardio ? `<button class="training-card-link" data-cardio-id="${latestCardio.id}">最近：${getCardioActivityLabel(latestCardio)} · ${formatNumber(latestCardio.durationMinutes)} 分钟 ${icon('chevron', 15)}</button>` : ''}</div></section>
    <section class="training-category"><div class="training-section-head"><h2 class="training-category-label">凯格尔训练</h2><button class="text-btn" id="pelvic-floor-history">训练记录</button></div><div class="training-card"><div class="training-card-title"><span class="training-card-icon">${icon('leaf', 20)}</span><div><h3>今日训练 · ${dailyPlanRoutine.name}</h3><p>渐进计划 · 耐力控制与快速脉冲</p></div></div><p class="training-card-summary">${pelvicSessions.length ? `今日已完成 ${pelvicSessions.length} 次 · 累计 ${pelvicSeconds} 秒` : `${pelvicRoutineMinutes(dailyPlanRoutine)} · 保持自然呼吸`}</p><button class="secondary training-card-action" id="start-pelvic-floor">开始训练</button></div></section><section class="section-head"><div><h2>最近力量训练</h2><span>${recentWorkouts.length ? '轻触查看详情' : '完成训练后会显示在这里'}</span></div>${recentWorkouts.length ? '<button class="text-btn" id="history-workout">全部</button>' : ''}</section><div class="history-list">${recentWorkouts.map((workout) => `<button class="history-row" data-workout="${workout.id}"><span><strong>${formatShortDate(workout.date)}</strong><small>${workout.exercises.map((item) => esc(item.exerciseName)).slice(0, 2).join(' · ') || '无动作'}</small></span><span class="history-count">${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span>${icon('chevron', 17)}</button>`).join('')}</div>`
  view.querySelector('#workout-date-picker-open')?.addEventListener('click', () => showBusinessDatePicker('选择训练日期', workoutDate, date => { workoutDate = date; currentWorkout = undefined; workoutEditorOpen = false; void render().catch(fail) }))
  view.querySelector('#exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#workout-templates')?.addEventListener('click', () => void showWorkoutTemplateManager())
  view.querySelector('#start-pelvic-floor')?.addEventListener('click', () => void showPelvicFloorSetup().catch(fail))
  view.querySelector('#pelvic-floor-history')?.addEventListener('click', () => void showPelvicFloorHistory())
  view.querySelector('#add-cardio')?.addEventListener('click', () => showCardioForm())
  view.querySelector('#cardio-history')?.addEventListener('click', () => void showCardioHistory())
  view.querySelectorAll<HTMLButtonElement>('[data-cardio-id]').forEach((button) => button.addEventListener('click', () => { const session = cardioSessions.find((item) => item.id === button.dataset.cardioId); if (session) showCardioForm(session) }))
  view.querySelector('#start-workout')?.addEventListener('click', async () => {
    try {
      if (openWorkout) { currentWorkout = openWorkout; workoutEditorOpen = true; await renderWorkoutPage(); return }
      await showWorkoutStartSheet()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; void renderWorkoutPage().catch(fail) })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { try { currentWorkout = await db.workouts.get(button.dataset.workout!); workoutEditorOpen = true; await renderWorkoutPage() } catch (error) { fail(error) } }))
}

function showCardioForm(session?: CardioSession): void {
  const date = session?.date ?? workoutDate
  const selectedType = session ? getCardioActivityType(session) : 'stair_climber'
  const dialog = openModal(session ? '编辑有氧训练' : '记录有氧训练', `<form id="cardio-form" class="form cardio-form"><p class="cardio-form-date">${formatHeaderDate(date)}</p><div class="cardio-type-group" role="group" aria-label="训练类型"><span>训练类型</span><div class="cardio-type-options">${(Object.keys(cardioActivityDefinitions) as CardioActivityType[]).map((type) => `<button type="button" data-cardio-type="${type}" aria-pressed="${selectedType === type}">${cardioActivityDefinitions[type].label}</button>`).join('')}</div></div><input type="hidden" name="activityType" value="${selectedType}"><label>时间<span class="cardio-input-wrap"><input name="duration" type="number" inputmode="decimal" min="0.01" step="any" value="${session?.durationMinutes ?? ''}" placeholder="25" required><span class="cardio-input-suffix">分钟</span></span></label><label>速度<span class="cardio-input-wrap"><input name="speed" type="number" inputmode="decimal" min="0.01" step="any" value="${session?.speed ?? ''}" placeholder="6.5"><span class="cardio-input-suffix" data-cardio-speed-unit>km/h</span></span></label><label data-cardio-incline>坡度<span class="cardio-input-wrap"><input name="inclinePercent" type="number" inputmode="decimal" min="0" step="any" value="${session?.inclinePercent ?? ''}" placeholder="8"><span class="cardio-input-suffix">%</span></span></label><label>备注<textarea name="note" rows="2" placeholder="可选">${esc(session?.note)}</textarea></label><div class="cardio-form-actions"><button class="primary" type="submit">${session ? '保存修改' : '保存记录'}</button>${session ? '<button class="danger-button" type="button" id="delete-cardio">删除记录</button>' : ''}</div></form>`)
  const formElement = dialog.querySelector<HTMLFormElement>('#cardio-form')!
  const syncType = () => {
    const type = formElement.querySelector<HTMLInputElement>('[name="activityType"]')!.value
    const treadmill = type === 'treadmill'
    formElement.querySelector<HTMLInputElement>('[name="speed"]')!.required = !treadmill
    const inclineField = formElement.querySelector<HTMLElement>('[data-cardio-incline]')!
    inclineField.hidden = !treadmill
    inclineField.querySelector('input')!.disabled = !treadmill
    formElement.querySelector<HTMLElement>('[data-cardio-speed-unit]')!.hidden = !treadmill
    formElement.querySelectorAll<HTMLButtonElement>('[data-cardio-type]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.cardioType === type)))
  }
  formElement.querySelectorAll<HTMLButtonElement>('[data-cardio-type]').forEach((button) => button.addEventListener('click', () => {
    formElement.querySelector<HTMLInputElement>('[name="activityType"]')!.value = button.dataset.cardioType!
    syncType()
  }))
  syncType()
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const input = { date, activityType: valueOf(form, 'activityType') as CardioActivityType, durationMinutes: Number(valueOf(form, 'duration')), speed: optionalNumber(form, 'speed'), inclinePercent: optionalNumber(form, 'inclinePercent'), note: valueOf(form, 'note') }
    try {
      if (session) await updateCardioSession(session.id, input)
      else await saveCardioSession(input)
      dialog.close(); toast('有氧训练记录已保存'); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  dialog.querySelector('#delete-cardio')?.addEventListener('click', async () => {
    if (!session) return
    dialog.close()
    if (!await confirmAction('删除这条有氧训练记录？', '删除后无法恢复。', '删除')) return
    try { await deleteCardioSession(session.id); toast('有氧训练记录已删除'); await renderWorkoutPage() } catch (error) { fail(error) }
  })
}

async function showCardioHistory(): Promise<void> {
  const sessions = (await db.cardioSessions.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const dialog = openModal('有氧训练历史', `<div class="cardio-history">${sessions.length ? sessions.map((session) => {
    const label = getCardioActivityLabel(session)
    const metrics = formatCardioMetrics(session).join(' · ')
    return `<button data-history-cardio="${session.id}" aria-label="编辑 ${formatShortDate(session.date)} ${label}，${formatNumber(session.durationMinutes)} 分钟${metrics ? `，${metrics}` : ''}"><span class="cardio-history-row"><span><strong>${formatShortDate(session.date)}</strong><small>${label}${session.note ? ` · ${esc(session.note)}` : ''}</small></span><span class="cardio-history-value"><strong>${formatNumber(session.durationMinutes)} <small>分钟</small></strong><small>${metrics}</small></span></span></button>`
  }).join('') : '<div class="cardio-history-empty"><strong>还没有有氧训练记录</strong><p>记录楼梯机或跑步机的训练</p><button class="primary" id="history-add-cardio">记录训练</button></div>'}</div>`, true)
  dialog.querySelector('#history-add-cardio')?.addEventListener('click', () => { dialog.close(); showCardioForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-history-cardio]').forEach((button) => button.addEventListener('click', () => {
    const session = sessions.find((item) => item.id === button.dataset.historyCardio)
    if (session) { dialog.close(); showCardioForm(session) }
  }))
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

const pelvicPhaseLabels: Record<string, string> = { prepare: '准备', contract: '收紧', hold: '保持', release: '释放', relax: '放松', rest: '休息' }

async function showPelvicFloorSetup(): Promise<void> {
  const progress = getPelvicFloorPlanProgress(await db.pelvicFloorSessions.toArray())
  let selectedLevel = selectedPelvicPlanLevel(progress)
  const specialty = ['foundation', 'endurance', 'pulse', 'combined'].map((id) => pelvicFloorRoutines.find((item) => item.id === id)!)
  const dialog = openModal('凯格尔训练', '')
  let starting = false
  const renderChoices = () => {
    const routine = pelvicPlanRoutine(selectedLevel)
    const endurance = routine.exercises[0]!
    const pulse = routine.exercises[1]!
    const levelIndex = pelvicFloorPlanLevels.indexOf(selectedLevel)
    const nextLevel = pelvicFloorPlanLevels[levelIndex + 1]
    const nextUnlocked = nextLevel && progress.unlockedLevels.includes(nextLevel)
    const stageDays = selectedLevel === 'foundation' ? progress.foundationDays : selectedLevel === 'standard' ? progress.standardDays : progress.advancedDays
    const milestone = selectedLevel === 'foundation' ? `${Math.min(progress.foundationDays, 7)} / 7 个基础训练日` : selectedLevel === 'standard' ? `${Math.min(progress.foundationDays, 7) + Math.min(progress.standardDays, 7)} / 14 个训练日` : `累计 ${progress.totalDays} 个训练日`
    dialog.querySelector('.modal-body')!.innerHTML = `<div class="pelvic-setup"><h3 class="pelvic-setup-heading">今日训练</h3><div class="pelvic-featured"><div class="pelvic-featured-top"><strong>渐进计划 · ${routine.name}</strong><span>${pelvicRoutineMinutes(routine)}</span></div><p>耐力控制 → 休息 → 快速脉冲</p><div class="pelvic-plan-composition"><span>耐力控制 <strong>${endurance.repetitions} 次</strong></span><span>快速脉冲 <strong>${pulse.repetitions} 次</strong></span></div><small>已完成 ${milestone}${selectedLevel === 'advanced' ? '' : ` · 本阶段 ${stageDays} 天`}</small><button class="primary" data-pelvic-routine="${routine.id}" aria-label="开始今日训练，${routine.name}，${pelvicRoutineMinutes(routine)}">开始今日训练</button></div><div class="pelvic-plan-head"><h3 class="pelvic-setup-heading">训练进度</h3><span>${progress.nextUnlock ? `距解锁${pelvicPlanRoutine(progress.nextUnlock.level).name}还有 ${progress.nextUnlock.remainingDays} 天` : '全部阶段已解锁'}</span></div><div class="pelvic-stage-list" role="list" aria-label="渐进计划阶段">${pelvicFloorPlanLevels.map((level) => { const stage = pelvicPlanRoutine(level); const unlocked = progress.unlockedLevels.includes(level); const active = level === selectedLevel; return unlocked ? `<button class="pelvic-stage${active ? ' is-current' : ''}" data-plan-level="${level}" aria-label="${stage.name}，${active ? '当前阶段' : '已解锁'}，${pelvicRoutineMinutes(stage)}" aria-pressed="${active}"><span class="pelvic-stage-dot" aria-hidden="true"></span><strong>${stage.name.replace('阶段', '')}</strong><small>${active ? '当前' : '可选择'}</small></button>` : `<span class="pelvic-stage is-locked" role="listitem" aria-label="${stage.name}，未解锁"><span class="pelvic-stage-dot" aria-hidden="true"></span><strong>${stage.name.replace('阶段', '')}</strong><small>未解锁</small></span>` }).join('')}</div>${nextUnlocked ? `<div class="pelvic-unlock-choice"><strong>${pelvicPlanRoutine(nextLevel).name}已解锁</strong><p>可以继续当前阶段，或开始下一阶段。</p><div><button class="secondary" data-keep-level>继续${routine.name.replace('阶段', '')}</button><button class="primary" data-plan-level="${nextLevel}">升级到${pelvicPlanRoutine(nextLevel).name.replace('阶段', '')}</button></div></div>` : ''}<details class="pelvic-plan-details"><summary>查看${routine.name}详情 ${icon('chevron', 14)}</summary><div><p><strong>耐力控制 · ${endurance.repetitions} 次</strong><span>收紧 → 保持 → 释放 → 放松</span></p><p><strong>休息 · ${endurance.restAfterSeconds} 秒</strong></p><p><strong>快速脉冲 · ${pulse.repetitions} 次</strong><span>收紧 → 放松</span></p><small>训练重点：保持自然呼吸，每次收缩后充分放松。</small></div></details><h3 class="pelvic-setup-heading">专项训练</h3><div class="pelvic-specialty-grid">${specialty.map((item) => `<button class="pelvic-specialty" data-pelvic-routine="${item.id}" aria-label="开始${item.name}，${item.description}，${pelvicRoutineMinutes(item)}"><strong>${item.name}</strong><span>${item.description}</span><small>${pelvicRoutineMinutes(item)}</small></button>`).join('')}</div><details class="pelvic-safety"><summary>保持自然呼吸，充分放松 ${icon('chevron', 14)}</summary><p>练习时保持自然呼吸，每次放松阶段充分放松。如有疼痛或明显不适，请停止并咨询专业人员。</p></details></div>`
    dialog.querySelectorAll<HTMLButtonElement>('[data-plan-level]').forEach((button) => button.addEventListener('click', () => {
      const level = button.dataset.planLevel as PelvicFloorPlanLevel
      if (!progress.unlockedLevels.includes(level)) return
      selectedLevel = level
      localStorage.setItem(PELVIC_PLAN_LEVEL_KEY, level)
      renderChoices()
    }))
    dialog.querySelector('[data-keep-level]')?.addEventListener('click', () => {
      localStorage.setItem(PELVIC_PLAN_LEVEL_KEY, selectedLevel)
      dialog.querySelector('.pelvic-unlock-choice')?.remove()
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-pelvic-routine]').forEach((button) => button.addEventListener('click', async () => {
      if (starting) return
      starting = true
      try {
        const selectedRoutine = pelvicFloorRoutines.find((item) => item.id === button.dataset.pelvicRoutine)
        if (!selectedRoutine) throw new Error('训练方案不可用')
        const ready = createPelvicFloorTimer(selectedRoutine)
        await initializePelvicAudio()
        pelvicTimerState = startPelvicFloorTimer(ready, Date.now())
        pelvicTimerDate = workoutDate
        pelvicSessionSaving = false
        dialog.close()
        if (pelvicTimerState.activePhase === 'contract') playPelvicCue('contract')
        await requestPelvicWakeLock()
        renderPelvicFloorTimer()
      } catch (error) { starting = false; fail(error) }
    }))
  }
  renderChoices()
}

function stopPelvicTimerVisuals(): void {
  window.clearInterval(pelvicTimerInterval)
  if (pelvicTimerAnimationFrame !== undefined) window.cancelAnimationFrame(pelvicTimerAnimationFrame)
  pelvicTimerAnimationFrame = undefined
}

function startPelvicTimerVisuals(): void {
  if (!pelvicTimerState || pelvicTimerState.status !== 'running' || pelvicTimerAnimationFrame !== undefined) return
  const frame = () => {
    pelvicTimerAnimationFrame = undefined
    if (!pelvicTimerState || pelvicTimerState.status !== 'running') return
    paintPelvicFloorTimer()
    pelvicTimerAnimationFrame = window.requestAnimationFrame(frame)
  }
  pelvicTimerAnimationFrame = window.requestAnimationFrame(frame)
}

function renderPelvicFloorTimer(): void {
  const state = pelvicTimerState
  if (!state) return
  document.body.classList.add('immersive')
  stopPelvicTimerVisuals()
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="pelvic-timer-screen"><header><span>凯格尔训练</span><small>${formatHeaderDate(pelvicTimerDate)}</small></header><h2>${esc(state.routine.name)}</h2><p id="pelvic-exercise"></p><div class="pelvic-countdown" id="pelvic-countdown" role="timer"><svg class="pelvic-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="pelvic-ring-track" cx="60" cy="60" r="54"/><circle class="pelvic-ring-progress" id="pelvic-ring-progress" cx="60" cy="60" r="54"/></svg><div class="pelvic-breathing" id="pelvic-breathing"></div><div class="pelvic-countdown-copy"><span id="pelvic-phase"></span><strong id="pelvic-remaining"></strong><span>秒</span></div></div><p id="pelvic-repetition"></p><p id="pelvic-status"></p><div class="pelvic-timer-actions"><button class="primary" id="pelvic-pause">暂停</button><button class="danger-button" id="pelvic-finish">结束训练</button></div><p class="pelvic-breathing-cue">保持自然呼吸，按提示轻柔练习。</p></section>`
  pelvicTimerElements = {
    ring: view.querySelector<SVGCircleElement>('#pelvic-ring-progress')!, breathing: view.querySelector<HTMLElement>('#pelvic-breathing')!,
    countdown: view.querySelector<HTMLElement>('#pelvic-countdown')!, remaining: view.querySelector<HTMLElement>('#pelvic-remaining')!,
    phase: view.querySelector<HTMLElement>('#pelvic-phase')!, status: view.querySelector<HTMLElement>('#pelvic-status')!,
    repetition: view.querySelector<HTMLElement>('#pelvic-repetition')!, exercise: view.querySelector<HTMLElement>('#pelvic-exercise')!,
    pause: view.querySelector<HTMLButtonElement>('#pelvic-pause')!,
  }
  pelvicTimerPainted = { remaining: '', phase: '', status: '', repetition: '', exercise: '', aria: '', pause: '' }
  pelvicTimerElements.ring.style.strokeDasharray = String(2 * Math.PI * 54)
  pelvicTimerElements.pause.addEventListener('click', async () => {
    if (!pelvicTimerState) return
    if (pelvicTimerState.status === 'paused') {
      pelvicTimerState = resumePelvicFloorTimer(pelvicTimerState, Date.now())
      await initializePelvicAudio()
      await requestPelvicWakeLock()
      pelvicTimerInterval = window.setInterval(tickPelvicFloorTimer, 200)
      startPelvicTimerVisuals()
    } else {
      pelvicTimerState = pausePelvicFloorTimer(pelvicTimerState, Date.now())
      stopPelvicTimerVisuals()
      await releasePelvicWakeLock()
      if (pelvicTimerState.status === 'completed') { await completePelvicFloorTimer(); return }
    }
    paintPelvicFloorTimer()
  })
  view.querySelector('#pelvic-finish')?.addEventListener('click', async () => {
    if (!pelvicTimerState || !await confirmAction('结束凯格尔训练？', '将保存当前已完成的训练进度。', '结束并保存')) return
    if (!pelvicTimerState || pelvicSessionSaving) return
    pelvicTimerState = finishPelvicFloorTimer(pelvicTimerState, Date.now())
    await completePelvicFloorTimer('manual')
  })
  if (state.status === 'running') {
    pelvicTimerInterval = window.setInterval(tickPelvicFloorTimer, 200)
    startPelvicTimerVisuals()
  }
  paintPelvicFloorTimer()
}

function paintPelvicFloorTimer(): void {
  const state = pelvicTimerState
  const elements = pelvicTimerElements
  if (!state || !elements) return
  const now = Date.now()
  const remaining = String(getPelvicFloorRemainingSeconds(state, now))
  const progress = getPelvicFloorPhaseProgress(state, now)
  const circumference = 2 * Math.PI * 54
  elements.ring.style.strokeDashoffset = String(circumference * (1 - progress))
  const phase = state.activePhase ?? 'rest'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scale = phase === 'contract' ? 1 - progress * 0.16 : phase === 'hold' ? 0.84 : phase === 'release' ? 0.84 + progress * 0.16 : 1
  elements.breathing.style.transform = `scale(${reduced ? 1 : scale})`
  elements.countdown.classList.toggle('is-soft', phase === 'release' || phase === 'relax' || phase === 'rest')
  const exercise = state.routine.exercises[state.exerciseIndex]!
  const exerciseText = `${exercise.name} · 动作 ${state.exerciseIndex + 1} / ${state.routine.exercises.length}`
  const repetitionText = state.restKind === 'exercise' ? '准备下一动作' : `第 ${state.repetitionIndex + 1} / ${exercise.repetitions} 次${(exercise.sets ?? 1) > 1 ? ` · 第 ${state.setIndex + 1} / ${exercise.sets} 组` : ''}`
  const phaseText = pelvicPhaseLabels[phase]
  const statusText = state.status === 'paused' ? '已暂停' : phase === 'hold' ? '保持自然呼吸' : phase === 'relax' || phase === 'rest' ? '充分放松' : '保持自然呼吸'
  const aria = `${phaseText}，剩余 ${remaining} 秒${state.status === 'paused' ? '，已暂停' : ''}`
  if (pelvicTimerPainted.remaining !== remaining) { elements.remaining.textContent = remaining; pelvicTimerPainted.remaining = remaining }
  if (pelvicTimerPainted.phase !== phaseText) { elements.phase.textContent = phaseText; pelvicTimerPainted.phase = phaseText }
  if (pelvicTimerPainted.status !== statusText) { elements.status.textContent = statusText; pelvicTimerPainted.status = statusText }
  if (pelvicTimerPainted.repetition !== repetitionText) { elements.repetition.textContent = repetitionText; pelvicTimerPainted.repetition = repetitionText }
  if (pelvicTimerPainted.exercise !== exerciseText) { elements.exercise.textContent = exerciseText; pelvicTimerPainted.exercise = exerciseText }
  if (pelvicTimerPainted.aria !== aria) { elements.countdown.setAttribute('aria-label', aria); pelvicTimerPainted.aria = aria }
  const pauseText = state.status === 'paused' ? '继续' : '暂停'
  if (pelvicTimerPainted.pause !== pauseText) { elements.pause.textContent = pauseText; pelvicTimerPainted.pause = pauseText }
}

function tickPelvicFloorTimer(): void {
  const state = pelvicTimerState
  if (!state || state.status !== 'running') return
  pelvicTimerState = advancePelvicFloorTimer(state, Date.now())
  if (pelvicTimerState.status === 'completed') { void completePelvicFloorTimer(); return }
  if (pelvicTimerState.activePhase !== state.activePhase || pelvicTimerState.exerciseIndex !== state.exerciseIndex) {
    if (pelvicTimerState.activePhase === 'contract') playPelvicCue('contract')
    else if (pelvicTimerState.activePhase === 'relax' || pelvicTimerState.activePhase === 'rest') playPelvicCue('relax')
  }
  paintPelvicFloorTimer()
}

async function completePelvicFloorTimer(completionType: 'completed' | 'manual' = 'completed'): Promise<void> {
  const state = pelvicTimerState
  if (!state || state.status !== 'completed' || pelvicSessionSaving) return
  pelvicSessionSaving = true
  stopPelvicTimerVisuals()
  await releasePelvicWakeLock()
  try {
    const session = sessionFromPelvicFloorTimer(state, pelvicTimerDate, completionType)
    const isPlanCompletion = completionType === 'completed' && pelvicFloorPlanLevelFromId(session.routine?.id) !== undefined
    const previousSessions = isPlanCompletion ? await db.pelvicFloorSessions.toArray() : []
    const previousProgress = getPelvicFloorPlanProgress(previousSessions)
    await savePelvicFloorSession(session)
    if (isPlanCompletion) localStorage.removeItem(PELVIC_PLAN_LEVEL_KEY)
    const updatedProgress = isPlanCompletion ? getPelvicFloorPlanProgress([...previousSessions, session]) : previousProgress
    const unlocked = updatedProgress.unlockedLevels.find((level) => !previousProgress.unlockedLevels.includes(level))
    pelvicTimerState = undefined
    pelvicTimerElements = undefined
    pelvicSessionSaving = false
    document.body.classList.remove('immersive')
    await render()
    if (unlocked) {
      const next = pelvicPlanRoutine(unlocked)
      const dialog = openModal('训练完成', `<div class="pelvic-completion"><p>今天完成了${esc(state.routine.name)}训练。</p><strong>下一阶段已解锁</strong><span>${next.name} · ${pelvicRoutineMinutes(next)}</span><p>可以继续当前阶段，或在下次训练前选择新阶段。</p><button class="primary" data-completion-done>完成</button></div>`)
      dialog.querySelector('[data-completion-done]')?.addEventListener('click', () => dialog.close())
    } else toast(completionType === 'manual' ? '训练进度已保存' : '凯格尔训练已完成')
  } catch (error) { pelvicSessionSaving = false; fail(error) }
}

async function showPelvicFloorHistory(): Promise<void> {
  const sessions = (await db.pelvicFloorSessions.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  const rows = sessions.map((session) => {
    const plan = pelvicFloorPlanLevelFromId(session.routine?.id)
    const specialty = ['foundation', 'endurance', 'pulse', 'combined'].includes(session.routine?.id ?? '')
    const completed = session.completionType === 'completed' || (session.completionType === undefined && session.completedRepetitions >= session.repetitions)
    const seconds = pelvicFloorSessionDurationSeconds(session)
    const detail = plan
      ? `${completed ? '今日训练完成' : '已结束'} · ${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`
      : `${completed ? '完成训练' : '已结束'} · ${session.completedRepetitions} / ${session.repetitions} 次 · ${seconds} 秒`
    return `<article><div class="pelvic-history-main"><div><strong>${formatShortDate(session.date)}</strong><span>${plan ? '今日训练 · ' : specialty ? '专项训练 · ' : ''}${esc(session.routine?.name ?? '基础训练')}</span></div><small>${detail}</small></div><details class="row-menu"><summary aria-label="${formatShortDate(session.date)}更多操作">···</summary><div><button data-delete-pelvic-session="${session.id}">删除记录</button></div></details></article>`
  })
  const dialog = openModal('凯格尔训练记录', `<div class="pelvic-history">${rows.length ? rows.join('') : '<p class="muted padded">还没有凯格尔训练记录</p>'}</div>`, true)
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
  document.body.classList.add('immersive')
  const view = document.querySelector<HTMLElement>('#view')!
  const addExercise = `<button id="add-exercise" class="${workout.exercises.length ? 'secondary' : 'primary'} full-btn">${icon('plus', 18)} 添加动作</button>`
  view.innerHTML = `<header class="active-workout-head"><button class="icon-btn quiet" id="exit-workout" aria-label="返回训练首页">${icon('x')}</button><strong>${completed ? '训练详情' : '力量训练'}</strong>${completed ? '<span class="head-spacer"></span>' : '<button class="finish-text" id="finish-workout">完成</button>'}</header><section class="workout-meta"><span>${formatHeaderDate(workout.date)}</span><span id="autosave-state">${completed ? '可编辑' : '已自动保存'}</span></section><div id="workout-exercises">${workout.exercises.length ? workout.exercises.map(workoutExerciseHtml).join('') : `<div class="empty compact minimal"><div class="empty-icon">${icon('dumbbell', 24)}</div><h3>还没有动作</h3><p>添加第一个动作开始记录。</p>${addExercise}</div>`}</div>${workout.exercises.length ? addExercise : ''}<label class="note-field">训练备注<textarea id="workout-note" rows="2" placeholder="可选">${esc(workout.note)}</textarea></label><div class="action-stack workout-actions">${completed ? '<button id="save-workout-template" class="secondary">保存为模板</button><button id="back-history" class="quiet-action">返回历史</button><button id="delete-workout" class="danger-button">删除训练</button>' : '<button id="history-workout">查看历史训练</button>'}</div>`
  bindWorkoutEditor(workout)
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
      justFinishedWorkout = finished
      workoutAutosave.cancel(); currentWorkout = undefined; showWorkoutHistory = true; toast('训练已完成'); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', async () => {
    try { await flushWorkoutAutosave(workout); showWorkoutHistory = true; currentWorkout = undefined; workoutEditorOpen = false; await renderWorkoutPage() } catch (error) { fail(error) }
  })
  view.querySelector('#back-history')?.addEventListener('click', async () => {
    try { await flushWorkoutAutosave(workout); currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = true; await renderWorkoutPage() } catch (error) { fail(error) }
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
  const dialog = openModal('动作库', `<button class="primary full-btn" id="new-exercise">${icon('plus', 18)} 新建动作</button><div class="library-list">${exercises.length ? exercises.map((exercise) => `<article><button class="library-main" data-edit-exercise="${exercise.id}"><span><strong>${esc(exercise.name)}</strong>${exercise.notes ? `<p>${esc(exercise.notes)}</p>` : ''}</span>${icon('chevron', 17)}</button><button class="icon-btn row-delete" data-delete-exercise="${exercise.id}" aria-label="删除 ${esc(exercise.name)}">${icon('trash', 17)}</button></article>`).join('') : '<div class="library-empty"><h3>还没有动作</h3><p>新建一个动作，开始记录训练。</p></div>'}</div>`, exercises.length > 0)
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
  view.innerHTML = `${completedFeedback}<div class="section-head history-head"><div><h2>历史训练</h2><span>${workouts.length} 次训练</span></div><button class="text-btn" id="close-history">返回</button></div><div class="history-list">${workouts.length ? workouts.map((workout) => `<button class="history-card" data-workout="${workout.id}"><div class="history-card-title"><strong>${formatShortDate(workout.date)}</strong><span>${workout.exercises.length} 个动作 · ${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span></div><div class="history-details">${workout.exercises.map((item) => `<div><strong>${esc(item.exerciseName)}</strong><small>${item.sets.map(workoutSetSummary).join(' · ') || '暂无组数'}</small></div>`).join('')}</div>${icon('chevron', 17)}</button>`).join('') : `<div class="empty minimal"><div class="empty-icon">${icon('activity', 24)}</div><h3>还没有训练历史</h3><p>完成力量训练后，在这里回顾记录。</p></div>`}</div>`
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
  const dialog = openModal('训练模板', `<div class="toolbar"><label class="search-field"><span class="sr-only">搜索训练模板</span>${icon('search', 19)}<input id="workout-template-search" type="search" value="${esc(query)}" placeholder="搜索模板"></label><button class="icon-btn add-button" id="new-workout-template" aria-label="新建训练模板">${icon('plus')}</button></div><div class="template-manager-list"></div>`, templates.length > 0)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase()
    const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? filtered.map((template) => {
      const missing = template.exercises.filter((item) => item.exerciseId && !existingIds.has(item.exerciseId)).length
      return `<article class="manager-card"><button class="manager-main" data-edit-workout-template="${template.id}"><strong>${esc(template.name)}</strong><span>${template.exercises.length} 个动作 · ${template.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span>${missing ? `<small class="warning-text">${missing} 个动作已从动作库删除，仍可使用快照</small>` : ''}</button><div class="manager-actions"><button data-start-workout-template="${template.id}">开始</button><button data-duplicate-workout-template="${template.id}">复制</button><button class="danger" data-delete-workout-template="${template.id}">删除</button></div></article>`
    }).join('') : `<div class="library-empty"><h3>${normalized ? '没有匹配的训练模板' : '还没有训练模板'}</h3><p>${normalized ? '换个关键词试试。' : '轻触上方加号，创建常用训练组合。'}</p></div>`
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
  const dialog = openModal('饮食模板', `<div class="toolbar"><label class="search-field">${icon('search', 19)}<input id="diet-template-search" type="search" value="${esc(query)}" placeholder="搜索模板"></label><button class="icon-btn add-button" id="new-diet-template" aria-label="新建饮食模板">${icon('plus')}</button></div><div class="template-manager-list"></div>`, templates.length > 0)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase(); const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? filtered.map((template) => `<article class="manager-card"><button class="manager-main" data-edit-diet-template="${template.id}"><strong>${esc(template.name)}</strong><span>${esc(summaries.get(template.id))}</span></button><div class="manager-actions"><button data-apply-diet-template="${template.id}">添加</button><button data-duplicate-diet-template="${template.id}">复制</button><button class="danger" data-delete-diet-template="${template.id}">删除</button></div></article>`).join('') : `<div class="library-empty"><h3>${normalized ? '没有匹配的饮食模板' : '还没有饮食模板'}</h3><p>${normalized ? '换个关键词试试。' : '轻触上方加号，创建常用饮食组合。'}</p></div>`
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
    const weightColor = '#728e9f'
    const muted = styles.getPropertyValue('--text-secondary').trim()
    const grid = styles.getPropertyValue('--divider').trim()
    weightChart = new Chart(canvas, { type: 'line', data: { labels: chartWeights.map((item) => formatShortDate(item.date)), datasets: [{ data: chartWeights.map((item) => item.weightKg), borderColor: weightColor, backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 2.3, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: weightColor }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5 } }, y: { border: { display: false }, ticks: { color: muted, callback: (value) => `${value}kg`, maxTicksLimit: 5 }, grid: { color: grid } } } } })
  }
}

function showWeightForm(date: string, value?: number): void {
  const title = value === undefined ? date === getLocalDateString() ? '今日体重' : '记录体重' : '编辑体重'
  const dialog = openModal(title, `<form id="weight-sheet-form" class="form weight-sheet-form"><p>${formatHeaderDate(date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${value ?? ''}" placeholder="72.4" required><b>kg</b></label><button class="primary" type="submit">保存</button></form>`)
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

function showRestorePreview(backup: ValidatedBackup): void {
  const counts = [{ label: '食物', count: backup.data.foods.length }, { label: '饮食记录', count: backup.data.foodLogs.length }, { label: '动作', count: backup.data.exercises.length }, { label: '力量训练', count: backup.data.workouts.length }, { label: '体重', count: backup.data.weights.length }, { label: '训练模板', count: backup.data.workoutTemplates.length }, { label: '饮食模板', count: backup.data.dietTemplates.length }, { label: '营养目标', count: backup.data.nutritionTargets.length }, { label: '凯格尔训练', count: backup.data.pelvicFloorSessions.length }, { label: '有氧训练', count: backup.data.cardioSessions.length }, { label: '习惯', count: backup.data.habits.length }, { label: '习惯打卡', count: backup.data.habitCheckIns.length }, { label: '任务', count: backup.data.tasks.length }, { label: '标签', count: backup.data.taskTags.length }]
  const dialog = openModal('确认恢复备份', `<div class="restore-counts">${counts.map((item) => `<p><span>${item.label}</span><strong>${item.count}</strong></p>`).join('')}</div><div class="warning">恢复将清除当前所有数据，并替换为该备份。</div><button class="danger-button full-btn" id="confirm-restore">继续恢复</button>`)
  dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => { if (!await confirmAction('覆盖当前全部数据？', '恢复会清除当前数据并替换为备份内容，此操作无法撤销。', '恢复备份')) return; try { await restoreBackup(backup); dialog.close(); currentWorkout = undefined; workoutEditorOpen = false; toast('恢复完成'); await render() } catch (error) { fail(error) } })
}

let assistantHandle: AiAssistantHandle | undefined
let assistantLaunchQueue = Promise.resolve()
function launchAssistant(options: AiAssistantLaunchOptions = {}): Promise<void> {
  const job = assistantLaunchQueue.then(async () => {
    await flushWorkoutAutosave()
    if (assistantHandle?.dialog.isConnected && assistantHandle.dialog.open) assistantHandle.applyLaunch(options)
    else assistantHandle = showAiAssistant(aiAssistant, { openModal, esc, openFoodLibrary: () => void showFoodLibrary(), openFoodVision: () => openFoodVisionWorkflow(getLocalDateString()) }, options)
  })
  assistantLaunchQueue = job.catch(() => undefined)
  return job
}
function routeQuickLaunch(event?: HashChangeEvent): void {
  const hash = event ? new URL(event.newURL).hash : window.location.hash
  const intent = consumeQuickLaunch({ hash, pathname: window.location.pathname, search: window.location.search }, window.history)
  if (intent) void launchAssistant({ voice: intent.voice, initialText: intent.prompt, autoSend: intent.autoSend }).catch(fail)
}

async function start(): Promise<void> {
  const initialIntent = consumeQuickLaunch(window.location, window.history)
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
  try {
    await db.open(); await render()
    window.addEventListener('hashchange', routeQuickLaunch)
    if (initialIntent) await launchAssistant({ voice: initialIntent.voice, initialText: initialIntent.prompt, autoSend: initialIntent.autoSend })
    routeQuickLaunch()
  } catch (error) { app.innerHTML = `<div class="fatal"><h1>无法打开 FitLog Lite</h1><p>${esc(error instanceof Error ? error.message : '请刷新后重试')}</p></div>` }
}

void start()
