import { openNutritionCompletionSheet, type CompletionMode } from './ui/nutritionCompletionSheet'
import { openMealEntry } from './ui/mealEntry'
import { calorieBudgetHtml } from './ui/calorieBudget'
import { remainingNutritionSummaryHtml } from './ui/remainingNutritionGoals'
import { historySubview } from './ui/recordHistory'
import { trendStates, trainingModuleHtml, selectRecordedTrend } from './ui/trendModule'
import { mountWeightTrend } from './ui/weightTrend'
import { createTrainingCompletion, type TrainingCompletion } from './ui/trainingCompletion'
import './styles/trainingCompletion.css'
import { coachReportHtml, bindCoachPlots, exerciseHistoryHtml, type CoachState } from './ui/coachReport'
import { loadCoachReport } from './services/coachReportService'
import type { CoachFocus } from './utils/coachReportAnalysis'
import './styles/coachReport.css'
import { liveQuery } from 'dexie'
import { readDailyRecords } from './services/dailyRecordsSummary'
import { showActionToast } from './ui/actionToast'
import { observeManagerCatalog } from './ui/observeManagerCatalog'
import { mountRecovery, recoverySlotHtml, type RecoveryUi } from './ui/recovery'
import { readDailyNutritionSummary, observeDailyNutritionSummary } from './services/dailyNutritionSummary'
import { macroNutritionSummaryForDay } from './ui/macroNutritionSummary'
import { managerToolbarHtml, managerSearchHtml, managerListHtml, managerRowHtml, managerEmptyHtml, managerNoResultsHtml, managerUtilitiesHtml, managerSectionHtml } from './ui/managerPrimitives'
import { createManagementWorkspace, type ManagedSurfaceContext } from './ui/managementWorkspace'
import { retireLegacyVideoSearchStorage } from './services/retiredVideoStorage'
import { animateMotion, setupMotionInteractions, stabilizeSheetSubview } from './ui/motion'
import { dietEventsHtml, bindDietEvents, showDietEvent, type DietEventUi } from './ui/dietEvents'
import { bindNumericPresentation } from './ui/numericPresentation'
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
import './styles/nutritionStrategies.css'
import './styles/recovery.css'
import './styles/macroNutritionSummary.css'
import './styles/nutritionBudget.css'
import './styles/modules.css'
import { showNutritionStrategyPicker, showNutritionStrategyManager } from './ui/nutritionStrategies'
import { bindEnergyEditor } from './ui/energyEditor'
import { showFoodVisionImport } from './ui/foodVisionImport'
import { showAiSettings, aiSettingsDetail } from './ui/aiSettings'
import { consumeQuickLaunch } from './ui/quickLaunch'
import { showAiAssistant, hasAiAssistantDraft, type AiAssistantLaunchOptions, type AiAssistantHandle } from './ui/aiAssistant'
import { PwaRuntime } from './pwa/runtime'
import { updateBlockReason } from './pwa/diagnostics'
import { showPwaDiagnostics } from './ui/pwaDiagnostics'
import { AiOrchestrator } from './ai/orchestrator'
import { Chart, registerables } from 'chart.js'
import { db } from './db/database'
import { getNutritionCompletionSummary, type NutritionCompletionSummary } from './utils/nutritionCompletion'
import type { CardioActivityType, CardioSession, DietTemplate, Exercise, Food, FoodLog, Habit, HabitCheckIn, MealType, NutritionGoal, NutritionTarget, Task, TaskTag, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate, WorkoutTemplateExercise } from './db/types'
import { exportBackup, restoreBackup, validateBackup, type ValidatedBackup } from './services/backupService'
import { clearDayRecords } from './services/dayRecordsService'
import { deleteCardioSession, getCardioSessionsByDate, saveCardioSession, updateCardioSession } from './services/cardioService'
import { deleteFoodLog, deleteFoodLogsForMeal, saveFood, updateFoodLogDetails, validateFoodInput } from './services/foodService'
import { buildImportPreview, parseFoodCsv, parseFoodJson, type ImportPreview } from './services/importService'
import { upsertWeight } from './services/weightService'
import { createHabit, deleteHabitWithHistory, deleteUnusedHabit, getActiveHabits, getHabitCheckInsByDate, reorderHabits, setHabitActive, toggleHabitCheckIn, updateHabit } from './services/habitService'
import { createTask, deleteTask, getInboxTasks, getTasksByDate, getUpcomingTasks, sortTasksForPlan, toggleTaskCompletion, updateTask } from './services/taskService'
import { createTaskTag, deleteTaskTag, getTaskTags, getTaskTagUsageCount, updateTaskTag } from './services/taskTagService'
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
import { calendarCategories, calendarCategoryIcons, calendarLegendLabels, getCalendarDayAccessibleLabel, loadMonthSummaries, renderMonthCalendar, type CalendarDaySummary } from './ui/calendarPage'
import { dailyRecordsHtml, updateDailyRecordsHtml } from './ui/dayDetail'
import { foodPagerLabel, foodRailDates, foodRailFocus, foodRailNeedsRecenter, isCurrentFoodRender, shouldCommitFoodDate, shouldShowFoodTodayShortcut } from './ui/foodPager'
import { icon, type IconName } from './ui/icons'
import { habitPlanText, habitTodaySummary, habitWeekdayLabels } from './ui/habitPresentation'
import { groupFoodLogs, isMealType, mealNames, mealTypes, type FoodMealGroup } from './utils/foodMeals'
import { formatShortDate, getLocalDateString, shiftLocalDate } from './utils/date'
import { findActiveHashtagQuery, normalizeTaskTagName, replaceActiveHashtagQuery, validateTaskTagName, type ActiveHashtagQuery } from './utils/taskTags'
import { formatEnergyInputValue, kcalToKj } from './utils/energy'
import { calculateNutrition, formatNumber } from './utils/nutrition'
import { cardioActivityDefinitions, formatCardioMetrics, getCardioActivityLabel, getCardioActivityType } from './utils/cardio'
import { getReportRange, shiftReportPeriod, type ReportMode, type ReportResult } from './utils/reporting'
import { getTodayPelvicState, getTodayWeightState } from './utils/todayActivity'

Chart.register(...registerables)
const pwaRuntime = new PwaRuntime()

type Tab = 'today' | 'plan' | 'food' | 'workout' | 'progress'
type ProgressView = 'trend' | 'calendar' | 'reports'
type PlanView = 'today' | 'upcoming' | 'inbox'
let nutritionDispose: (() => void) | undefined
let recoveryDispose: (() => void) | undefined
let recordsDispose: (() => void) | undefined
let daySheetRequest=0
function recoveryUi(): RecoveryUi { return { esc, openModal, confirm: confirmAction, fail } }
let activeTab: Tab = 'today'
let renderedTab: Tab | undefined
let rootRenderVersion = 0
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
let currentWorkout: Workout | undefined
let workoutEditorOpen = false
let showWorkoutHistory = false

const coachState:CoachState={focus:'all',metric:'load'}
let reportMode: ReportMode = 'week'
let reportAnchorDate = getLocalDateString()
let trainingCompletion: TrainingCompletion | undefined
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
    else if (activeTab === 'progress' && proposal.domain !== 'plan') { await renderProgressPage() }
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
  showActionToast(message, { tone })
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

function managementModal(surface: ManagedSurfaceContext) {
  return (title: string, body: string, wide = false): HTMLDialogElement => {
    const dialog = surface.open(title, body, wide); bindNumericPresentation(dialog); return dialog
  }
}
function mountManagementModal(surface: ManagedSurfaceContext | undefined, title: string, body: string, wide = false): HTMLDialogElement {
  return surface ? managementModal(surface)(title, body, wide) : openModal(title, body, wide)
}
function leaveStandalone(dialog: HTMLDialogElement, surface?: ManagedSurfaceContext): void { if (!surface) dialog.close() }

function openModal(title: string, body: string, wide = false): HTMLDialogElement { const dialog = openSheet(esc(title), body, icon('x'), wide); bindNumericPresentation(dialog); return dialog }

function showBusinessDatePicker(title: string, date: string, commit: (date: string) => void): void {
  const dialog = openModal(title, '<div id="business-date-picker"></div>')
  const picker = mountDatePicker(dialog.querySelector<HTMLElement>('#business-date-picker')!, {
    value: date,
    onConfirm: selected => { dialog.close(); commit(selected!) },
    onCancel: () => dialog.close(),
  })
  dialog.addEventListener('close', () => picker.destroy(), { once: true })
}

function confirmAction(title: string, message: string, confirmLabel = '确认删除', danger = true, cancelLabel = '取消', layout?: 'meal-clear'): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = `confirm-dialog${layout === 'meal-clear' ? ' meal-clear-confirm' : ''}`
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
  recordsDispose?.();recordsDispose=undefined
  nutritionDispose?.(); nutritionDispose = undefined
  recoveryDispose?.(); recoveryDispose = undefined
  const renderVersion = String(++rootRenderVersion)
  const sameTab = renderedTab === activeTab
  const navigation = renderedTab !== undefined && renderedTab !== activeTab
  const targetTab = activeTab
  renderedTab = activeTab
  const previousNav = app.querySelector<HTMLElement>('.bottom-nav')
  const previousView = sameTab && (activeTab === 'progress' || activeTab === 'plan') ? app.querySelector<HTMLElement>('#view') : null
  foodHeaderEvents?.abort()
  foodRailEvents?.abort()
  foodContentVersion += 1
  document.body.classList.remove('immersive')
  const today = getLocalDateString()
  const hour = new Date().getHours()
  const title = activeTab === 'today' ? (hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好') : activeTab === 'plan' ? '计划' : activeTab === 'food' ? '饮食' : activeTab === 'workout' ? '训练' : '进度'
  const subtitle = activeTab === 'today' ? `${formatHeaderDate(today).replace('今天 · ', '')} · 今天也继续保持` : activeTab === 'workout' ? formatHeaderDate(workoutDate) : activeTab === 'progress' ? '看见每一次积累' : ''
  const markup = `
    <div class="app-frame">
      <header class="topbar${activeTab === 'today' ? ' today-topbar' : activeTab === 'food' ? ' food-topbar' : ''}"><div><h1>${title}</h1>${subtitle ? `<p class="header-date">${subtitle}</p>` : ''}</div><div class="topbar-page-actions">${activeTab === 'food' ? '<button class="food-page-action" id="use-diet-template" type="button">使用模板</button><button class="food-page-action" id="food-library" type="button">食物库</button>' : ''}${activeTab === 'plan' ? `<button class="icon-btn quiet" id="plan-add-task" type="button" aria-label="新建任务" hidden>${icon('plus', 20)}</button>` : ''}<button class="icon-btn quiet topbar-ai" id="open-ai-assistant" type="button" aria-label="AI 助手">${icon('sparkles', 20)}</button><button class="icon-btn quiet topbar-management" id="open-management" type="button" aria-label="管理与设置">${icon('more', 20)}</button></div></header>
      <main id="view" class="${activeTab === 'today' ? 'today-dashboard' : activeTab === 'workout' ? 'workout-page' : ''}" aria-live="polite"></main>
      <nav class="bottom-nav" aria-label="主导航">
        <button data-tab="today" class="${activeTab === 'today' ? 'active' : ''}" aria-current="${activeTab === 'today' ? 'page' : 'false'}">${icon('home', 20)}<span>今日</span></button>
        <button data-tab="plan" class="${activeTab === 'plan' ? 'active' : ''}" aria-current="${activeTab === 'plan' ? 'page' : 'false'}">${icon('calendar', 20)}<span>计划</span></button>
        <button data-tab="food" class="${activeTab === 'food' ? 'active' : ''}" aria-current="${activeTab === 'food' ? 'page' : 'false'}">${icon('utensils', 20)}<span>饮食</span></button>
        <button data-tab="workout" class="${activeTab === 'workout' ? 'active' : ''}" aria-current="${activeTab === 'workout' ? 'page' : 'false'}">${icon('dumbbell', 20)}<span>训练</span></button>
        <button data-tab="progress" class="${activeTab === 'progress' ? 'active' : ''}" aria-current="${activeTab === 'progress' ? 'page' : 'false'}">${icon('trend', 20)}<span>进度</span></button>
      </nav>
    </div>`
  if (previousNav) {
    const fresh = document.createElement('div'); fresh.innerHTML = markup
    app.querySelector('.topbar')!.replaceWith(fresh.querySelector('.topbar')!)
    if (!previousView) app.querySelector('#view')!.replaceWith(fresh.querySelector('#view')!)
  } else app.innerHTML = markup
  const currentView = app.querySelector<HTMLElement>('#view')!
  currentView.dataset.renderVersion = renderVersion
  if (previousNav) {
    previousNav.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === activeTab
      button.classList.toggle('active', selected); button.setAttribute('aria-current', selected ? 'page' : 'false')
    })
  }
  if (!previousNav) document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab as Tab
    void render().catch(fail)
  }))
  app.querySelector('#open-ai-assistant')?.addEventListener('click', () => { void launchAssistant().catch(fail) })
  app.querySelector('#open-management')?.addEventListener('click', showManagementHub)
  app.querySelector('#plan-add-task')?.addEventListener('click', () => void showTaskEditor(undefined, planView === 'today' ? today : undefined))
  switch (targetTab) {
    case 'today': await renderTodayPage(); break
    case 'plan': await renderPlanPage(); break
    case 'food': await renderFoodPage(); break
    case 'workout': await renderWorkoutPage(); break
    case 'progress': await renderProgressPage(); break
  }
  if (navigation && currentView.isConnected && targetTab === activeTab && currentView.dataset.renderVersion === renderVersion) animateMotion(currentView, 'navigation')
}

const habitToggleQueue = new Map<string, Promise<void>>()

function todayHabitCardHtml(habits: Habit[], checkIns: HabitCheckIn[], date: string): string {
  const checked = new Set(checkIns.map((item) => item.habitId))
  const count = habits.filter((habit) => checked.has(habit.id)).length
  const weekday = ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1
  return `<section class="today-card today-activity-card today-habits-card" id="today-habits"><div class="card-heading today-activity-head"><div><span class="card-icon habit-icon">${icon('check', 20)}</span><h2>习惯</h2></div><button class="text-btn" id="today-habits-manage">管理 ${icon('chevron', 16)}</button></div>${habits.length ? `<div class="today-habit-list">${habits.map((habit) => `<button class="today-habit-row" type="button" data-habit-toggle="${esc(habit.id)}" aria-pressed="${checked.has(habit.id)}"><span class="habit-check-indicator" aria-hidden="true">${icon('check', 16)}</span><span class="habit-row-name">${esc(habit.name)}</span>${habit.weekdays?.includes(weekday) ? '<small class="habit-planned-badge">计划</small>' : ''}</button>`).join('')}</div><p class="today-habit-summary" id="today-habit-summary">${habitTodaySummary(count)}</p>` : '<div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">还没有习惯</strong><span class="today-activity-meta">完成时轻触打卡即可</span></div><button class="secondary today-activity-action" id="today-habit-create">新建习惯</button></div>'}</section>`
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

async function showHabitManager(openCreate = false, surface?: ManagedSurfaceContext): Promise<void> {
  // Manager and editor share the existing large frame, never freeze an empty manager's short height.
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '习惯', '<div id="habit-manager-body"></div>', true)
  dialog.classList.add('habit-sheet')
  const body = dialog.querySelector<HTMLElement>('#habit-manager-body')!
  const scroll = dialog.querySelector<HTMLElement>('.modal-body')!
  let mounted = false, managerScroll = 0
  const setScreen = (title: string, html: string) => {
    const back = title === '习惯'
    if (surface && mounted && !back && dialog.querySelector('h2')!.textContent !== title) surface.subview(title, body)
    if (surface && back && dialog.querySelector('h2')!.textContent !== title) surface.back()
    const navigate = mounted && dialog.querySelector('h2')!.textContent !== title
    if (mounted) { if (dialog.querySelector('h2')!.textContent === '习惯') managerScroll = scroll.scrollTop; stabilizeSheetSubview(dialog) }
    dialog.querySelector('h2')!.textContent = title
    body.innerHTML = html
    scroll.scrollTop = back ? managerScroll : 0
    if (navigate) animateMotion(body, back ? 'back' : 'subview')
    mounted = true
  }
  let reorderMode = false
  const manager = async () => {
    const all = await db.habits.orderBy('sortOrder').toArray()
    if (!dialog.isConnected || !body.isConnected) return
    const active = all.filter((habit) => habit.active)
    const inactive = all.filter((habit) => !habit.active)
    const row = (habit: Habit, index: number, list: Habit[]) => managerRowHtml(esc(habit.name), `${esc(habitPlanText(habit))}${habit.active ? '' : ' · 已停用'}`, reorderMode && habit.active ? '' : `data-habit-edit="${esc(habit.id)}" aria-label="编辑 ${esc(habit.name)}"`, reorderMode && habit.active ? `<span class="habit-reorder-actions"><button type="button" data-habit-move="${esc(habit.id)}" data-direction="-1" aria-label="上移 ${esc(habit.name)}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-habit-move="${esc(habit.id)}" data-direction="1" aria-label="下移 ${esc(habit.name)}" ${index === list.length - 1 ? 'disabled' : ''}>↓</button></span>` : icon('chevron', 18), reorderMode && habit.active)
    setScreen('习惯', `<div class="habit-manager manager-surface">${managerToolbarHtml(reorderMode ? '调整顺序' : `已启用 ${active.length} 项`, 'habit-new', '习惯', reorderMode || !all.length, `<button type="button" class="text-btn" id="habit-reorder" ${active.length < 2 ? 'hidden' : ''}>${reorderMode ? '完成' : '调整顺序'}</button>`)}${all.length ? `${managerSectionHtml('习惯', active.length ? managerListHtml(active.map((habit, index) => row(habit, index, active)).join('')) : '<p class="manager-section-note">还没有启用的习惯</p>')}${inactive.length ? managerSectionHtml('已停用', managerListHtml(inactive.map((habit, index) => row(habit, index, inactive)).join(''))) : ''}` : managerEmptyHtml('习惯', '新建一个需要时轻触打卡的习惯。', 'habit-empty-new')}</div>`)
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
    if (!dialog.isConnected || !body.isConnected) return
    setScreen(habit ? '编辑习惯' : '新建习惯', `<form id="habit-form" class="habit-editor manager-editor"><button type="button" class="habit-editor-back" id="habit-form-back">‹ 习惯</button><section class="habit-editor-section"><h3>基本信息</h3><div class="habit-editor-group"><label class="habit-editor-field">名称<input name="name" maxlength="40" required value="${esc(habit?.name ?? '')}" placeholder="例如：肩颈拉伸"></label><label class="habit-editor-field">说明（可选）<textarea name="note" rows="2" placeholder="可填写简短提示">${esc(habit?.note ?? '')}</textarea></label></div></section><section class="habit-editor-section"><h3>计划（可选）</h3><div class="habit-editor-group"><fieldset class="habit-weekdays"><legend>每周计划日</legend><div class="habit-weekday-grid">${habitWeekdayLabels.map((label, index) => `<label class="habit-weekday-option"><input type="checkbox" name="weekday" value="${index + 1}" aria-label="星期${label}" ${habit?.weekdays?.includes(index + 1) ? 'checked' : ''}><span aria-hidden="true">${label}</span></label>`).join('')}</div><p id="habit-free-note" class="habit-plan-note" ${habit?.weekdays?.length ? 'hidden' : ''}>不选择计划日 = 自由打卡</p></fieldset><label class="habit-target-row"><span>周目标</span><span class="habit-target-value" id="habit-target-value">${habit?.targetPerWeek ? `每周 ${habit.targetPerWeek} 次` : '不设置'}</span>${icon('chevron', 16)}<select name="targetPerWeek" aria-label="周目标"><option value="">不设置</option>${Array.from({ length: 7 }, (_, index) => `<option value="${index + 1}" ${habit?.targetPerWeek === index + 1 ? 'selected' : ''}>${index + 1} 次</option>`).join('')}</select></label><p class="habit-plan-note">计划仅用于提示和回顾，不限制其他日期打卡。</p></div></section><div class="habit-editor-actions"><button class="primary full-btn" type="submit">保存习惯</button></div>${habit ? `<section class="habit-status-section"><h3>习惯状态</h3><button type="button" id="habit-active-toggle">${habit.active ? '停用习惯' : '重新启用'}</button>${hasHistory ? '<p>如果只是暂时不再执行，建议停用以保留历史。</p>' : ''}<button type="button" id="habit-delete" class="text-btn danger">删除习惯</button></section>` : ''}</form>`)
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
      if (!habit) return
      const button = body.querySelector<HTMLButtonElement>('#habit-delete')!
      button.disabled = true
      try {
        const count = await db.habitCheckIns.where('habitId').equals(habit.id).count()
        if (!await confirmAction(count ? '删除习惯及全部记录？' : '删除习惯？', count ? `将永久删除这个习惯和 ${count} 条打卡记录。此操作无法恢复。` : '删除后无法恢复。', count ? `删除习惯及 ${count} 条记录` : '删除习惯')) return
        if (count) await deleteHabitWithHistory(habit.id, db, count); else await deleteUnusedHabit(habit.id)
        reorderMode = false; await manager(); await refreshTodayHabitCard()
      } catch (error) { fail(error) }
      finally { if (button.isConnected) button.disabled = false }
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
  return `<section class="today-card today-activity-card today-plan-card" id="today-plan"><div class="card-heading today-activity-head"><div><span class="card-icon plan-icon">${icon('calendar', 20)}</span><h2>今日计划</h2></div><button class="text-btn" id="today-plan-all">查看全部 ${icon('chevron', 16)}</button></div>${ordered.length ? `<p class="today-plan-summary">已完成 ${ordered.length - pending.length} / ${ordered.length} 项 · 待办 ${pending.length} 项</p>` : ''}${visible.length ? `${taskGroupHtml(visible, tags)}${pending.length > 4 ? `<p class="today-plan-more">还有 ${pending.length - 4} 项</p>` : ''}` : '<div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">今天没有安排</strong><span class="today-activity-meta">有需要时随手记下来</span></div><button type="button" class="secondary today-activity-action" id="today-plan-add">添加任务</button></div>'}</section>`
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
  const view = document.querySelector<HTMLElement>('#view')!
  const viewVersion = view.dataset.renderVersion
  const today = getLocalDateString()
  const [nutrition, workouts, cardioSessions, pelvicSessions, weights, allPelvicSessions, habits, habitCheckIns, todayTasks, taskTags] = await Promise.all([
    readDailyNutritionSummary(today),
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
  const { logs, target, totals } = nutrition
  const openWorkout = workouts.find((workout) => !workout.finishedAt)
  const strengthExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0)
  const strengthSets = workouts.reduce((total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), 0)
  const cardioMinutes = cardioSessions.reduce((total, session) => total + session.durationMinutes, 0)
  const weightState = getTodayWeightState(weights, today)
  const dailyPlanRoutine = pelvicPlanRoutine(selectedPelvicPlanLevel(getPelvicFloorPlanProgress(allPelvicSessions)))
  const pelvicState = getTodayPelvicState(pelvicSessions, dailyPlanRoutine.name, pelvicRoutineMinutes(dailyPlanRoutine))
  if (!view.isConnected || view.dataset.renderVersion !== viewVersion) return
  view.innerHTML = `
    ${todayPlanCardHtml(todayTasks, taskTags)}
    <section class="today-card nutrition-today-card"><div class="card-heading"><div><span class="card-icon nutrition-icon">${icon('utensils', 20)}</span><h2>今日饮食</h2></div><button class="text-btn" id="today-food-details">查看详情 ${icon('chevron', 16)}</button></div><div class="today-calorie-layout">${calorieGaugeHtml(totals.calories, target?.calories, 'today')}</div><div class="today-macros" data-macro-summary-host>${macroNutritionSummaryForDay(nutrition)}</div><div data-today-remaining>${foodCompletionStripHtml(today, getNutritionCompletionSummary(target ?? {}, logs), false)}</div></section>
    <section class="today-card today-activity-card workout-today-card"><div class="card-heading today-activity-head"><div><span class="card-icon workout-icon">${icon('dumbbell', 20)}</span><h2>训练</h2></div><button class="text-btn" id="today-workout-details">查看训练 ${icon('chevron', 16)}</button></div><div class="today-training-row today-strength-row today-strength-status today-activity-body"><span class="today-activity-copy"><strong class="today-activity-status">力量训练</strong><span class="today-activity-meta">${workouts.length ? openWorkout ? '记录中' : `${workouts.length} 次训练` : '今天还没有力量训练'}</span>${workouts.length ? `<span class="today-activity-meta">${strengthExercises} 个动作 · ${strengthSets} 组</span>` : ''}</span>${openWorkout ? '<button class="primary today-workout-action today-activity-action" id="today-workout">继续力量训练</button>' : '<button class="secondary today-activity-action" id="today-workout">记录训练</button>'}</div><div class="today-training-row today-cardio-row today-activity-body"><span class="today-activity-copy"><strong class="today-activity-status">有氧训练</strong><span class="today-activity-meta">${cardioSessions.length ? `${cardioSessions.length} 次 · 共 ${formatNumber(cardioMinutes)} 分钟` : '今天还没有有氧训练'}</span>${cardioSessions.length === 1 ? `<span class="today-activity-meta">${[getCardioActivityLabel(cardioSessions[0]!), ...formatCardioMetrics(cardioSessions[0]!)].map(metric => `<span class="today-training-token">${esc(metric)}</span>`).join(' · ')}</span>` : ''}</span><button type="button" class="secondary today-activity-action" id="today-cardio">记录有氧</button></div></section>
    <section class="today-card today-activity-card weight-today-card"><div class="card-heading today-activity-head"><div><span class="card-icon weight-icon">${icon('scale', 20)}</span><h2>体重</h2></div><button class="text-btn" id="today-weight-details">查看趋势 ${icon('chevron', 16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">${esc(weightState.status)}</strong><span class="today-activity-meta">${esc(weightState.meta)}</span></div><button class="secondary today-activity-action" id="today-record-weight">${esc(weightState.action)}</button></div></section>
    <section class="today-card today-activity-card pelvic-today-card"><div class="card-heading today-activity-head"><div><span class="card-icon pelvic-icon">${icon('leaf', 20)}</span><h2>凯格尔训练</h2></div><button class="text-btn" id="today-pelvic-history">训练记录 ${icon('chevron', 16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status">${esc(pelvicState.status)}</strong><span class="today-activity-meta">${esc(pelvicState.meta)}</span></div><button class="secondary today-activity-action" id="today-pelvic">${esc(pelvicState.action)}</button></div></section>
    ${todayHabitCardHtml(habits, habitCheckIns, today)}${recoverySlotHtml()}`
  view.querySelector('#today-food-details')?.addEventListener('click', () => { activeTab = 'food'; foodDate = today; void render().catch(fail) })
  view.querySelector('#today-workout-details')?.addEventListener('click', () => { activeTab = 'workout'; workoutDate = today; currentWorkout = undefined; workoutEditorOpen = false; showWorkoutHistory = false; void render().catch(fail) })
  view.querySelector('#today-workout')?.addEventListener('click', () => { activeTab = 'workout'; workoutDate = today; currentWorkout = openWorkout; workoutEditorOpen = Boolean(openWorkout); showWorkoutHistory = false; void render().then(() => { if (!openWorkout) window.scrollTo({ top: 0, behavior: 'instant' }) }).catch(fail) })
  view.querySelector('#today-cardio')?.addEventListener('click', () => showCardioForm(undefined, undefined, today))
  view.querySelector('#today-weight-details')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; void render().catch(fail) })
  view.querySelector('#today-record-weight')?.addEventListener('click', () => { activeTab = 'progress'; progressView = 'trend'; void render().then(() => showWeightForm(today, weights.find((item) => item.date === today)?.weightKg)).catch(fail) })
  view.querySelector('#today-pelvic')?.addEventListener('click', () => { workoutDate = today; void showPelvicFloorSetup().catch(fail) })
  view.querySelector('#today-pelvic-history')?.addEventListener('click', () => void showPelvicFloorHistory())
  nutritionDispose?.()
  nutritionDispose = observeDailyNutritionSummary(today, nutrition, next => {
    if (activeTab !== 'today' || !view.isConnected || view.dataset.renderVersion !== viewVersion) return
    view.querySelector('.today-calorie-layout')!.innerHTML = calorieGaugeHtml(next.totals.calories, next.target?.calories, 'today')
    view.querySelector('[data-macro-summary-host]')!.innerHTML = macroNutritionSummaryForDay(next)
    view.querySelector('[data-today-remaining]')!.innerHTML = foodCompletionStripHtml(today, getNutritionCompletionSummary(next.target ?? {}, next.logs), false)
  }, fail)
  view.addEventListener('click', event => { if ((event.target as Element).closest('[data-today-completion]')) { activeTab = 'food'; foodDate = today; void render().then(() => showNutritionCompletion(today)).catch(fail) } })
  bindTodayPlanCard(view)
  bindTodayHabitCard(view, today)
  recoveryDispose?.(); recoveryDispose = mountRecovery(view.querySelector('[data-recovery-root]')!, recoveryUi())
}

/** Keep tab controls connected so reversible CSS transitions survive content replacement. */
function setTabbedViewHtml(view: HTMLElement, html: string): boolean {
  const oldTabs = view.querySelector<HTMLElement>('.page-tabs, .plan-tabs')
  if (!oldTabs) { view.innerHTML = html; return false }
  const fresh = document.createElement('div'); fresh.innerHTML = html
  const nextTabs = fresh.querySelector<HTMLElement>('.page-tabs, .plan-tabs')
  if (!nextTabs || nextTabs.className !== oldTabs.className) { view.innerHTML = html; return false }
  const container = oldTabs.parentElement!, nextContainer = nextTabs.parentElement!
  for (const button of oldTabs.querySelectorAll<HTMLButtonElement>('button')) {
    const next = nextTabs.querySelector<HTMLButtonElement>(`[${oldTabs.classList.contains('plan-tabs') ? 'data-plan-view' : 'data-progress-view'}="${button.dataset.planView ?? button.dataset.progressView}"]`)!
    button.classList.toggle('active', next.classList.contains('active')); button.setAttribute('aria-selected', next.getAttribute('aria-selected')!)
  }
  for (const child of [...container.childNodes]) if (child !== oldTabs) child.remove()
  nextTabs.remove(); container.append(...nextContainer.childNodes)
  return true
}

function progressTabsHtml(): string {
  return `<div class="page-tabs" role="tablist" aria-label="进度视图"><button role="tab" data-progress-view="trend" class="${progressView === 'trend' ? 'active' : ''}" aria-selected="${progressView === 'trend'}">趋势</button><button role="tab" data-progress-view="calendar" class="${progressView === 'calendar' ? 'active' : ''}" aria-selected="${progressView === 'calendar'}">日历</button><button role="tab" data-progress-view="reports" class="${progressView === 'reports' ? 'active' : ''}" aria-selected="${progressView === 'reports'}">报告</button></div>`
}

function bindProgressTabs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('[data-progress-view]').forEach((button) => button.addEventListener('click', () => {
    if (progressView === button.dataset.progressView) return
    progressView = button.dataset.progressView as ProgressView
    void render().catch(fail)
  }))
}

async function renderProgressPage(): Promise<void> {
  recordsDispose?.();recordsDispose=undefined
  recoveryDispose?.(); recoveryDispose = undefined
  if (progressView === 'trend') { await renderWeightPage(true); return }
  if (progressView === 'calendar') { await renderCalendarOverview(true); return }
  await renderReportsPage()
}

function reportDateLabel(date: string): string {
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`
}

function reportPeriodLabel(report: ReportResult): string {
  if (reportMode === 'day') return reportDateLabel(report.range.start)
  if (reportMode === 'month') return `${report.range.start.slice(0, 4)}年${Number(report.range.start.slice(5, 7))}月`
  return `${reportDateLabel(report.range.start)}–${reportDateLabel(report.range.end)}`
}

async function renderReportsPage():Promise<void> {
  const view=document.querySelector<HTMLElement>('#view')!,viewVersion=view.dataset.renderVersion,today=getLocalDateString(),mode=reportMode,anchor=reportAnchorDate
  let data=await loadCoachReport(mode,anchor,today),report=data.report
  if(activeTab!=='progress'||progressView!=='reports'||!view.isConnected||view.dataset.renderVersion!==viewVersion)return
  const isCurrent=report.range.start===getReportRange(mode,today).start,period=mode==='day'?'天':mode==='week'?'周':'月'
  const retainedTabs=setTabbedViewHtml(view,`${progressTabsHtml()}<div class="report-page"><div class="report-mode" role="group" aria-label="报告周期">${(['day','week','month'] as const).map(m=>`<button data-report-mode="${m}" class="${mode===m?'active':''}" aria-pressed="${mode===m}">${m==='day'?'日报':m==='week'?'周报':'月报'}</button>`).join('')}</div><div class="report-period"><button id="report-previous" aria-label="上一${period}">‹</button>${mode==='day'?`<button class="text-btn fitlog-date-trigger" id="report-date-picker">${reportPeriodLabel(report)}</button>`:`<strong>${reportPeriodLabel(report)}</strong>`}<button id="report-next" aria-label="下一${period}" ${isCurrent?'disabled':''}>›</button></div>${isCurrent?'':`<button class="report-return" id="report-return">${mode==='day'?'回到今天':'回到本'+period}</button>`}<div class="report-content">${coachReportHtml(data,coachState,mode,esc)}</div></div>`)
  if(!retainedTabs)bindProgressTabs(view)
  view.querySelectorAll<HTMLButtonElement>('[data-report-mode]').forEach(b=>b.addEventListener('click',()=>{reportMode=b.dataset.reportMode as ReportMode;void render().catch(fail)}))
  view.querySelector('#report-previous')?.addEventListener('click',()=>{reportAnchorDate=shiftReportPeriod(mode,anchor,-1);void render().catch(fail)})
  view.querySelector('#report-next')?.addEventListener('click',()=>{if(isCurrent)return;reportAnchorDate=shiftReportPeriod(mode,anchor,1);void render().catch(fail)})
  view.querySelector('#report-return')?.addEventListener('click',()=>{reportAnchorDate=today;void render().catch(fail)})
  view.querySelector('#report-date-picker')?.addEventListener('click',()=>showBusinessDatePicker('选择日报日期',anchor,date=>{reportAnchorDate=date;void render().catch(fail)}))
  const host=view.querySelector<HTMLElement>('.report-content')!,events=new AbortController()
  let plotsDispose=bindCoachPlots(host,id=>{if(!id.startsWith('weight:'))coachState.point=id})
  const draw=()=>{const y=scrollY;plotsDispose();host.innerHTML=coachReportHtml(data,coachState,mode,esc);plotsDispose=bindCoachPlots(host,id=>{if(!id.startsWith('weight:'))coachState.point=id});window.scrollTo({top:y,behavior:'instant'})}
  host.addEventListener('click',e=>{
    const button=(e.target as Element).closest<HTMLElement>('button');if(!button)return
    if(button.dataset.coachFocus){coachState.focus=button.dataset.coachFocus as CoachFocus;draw()}
    if(button.dataset.coachExercise){coachState.exercise=button.dataset.coachExercise;delete coachState.point;draw()}
    if(button.dataset.coachChart){coachState.metric=button.dataset.coachChart as CoachState['metric'];draw()}
    if(button.dataset.coachHistory){const group=data.analysis.groups.find(g=>g.key===button.dataset.coachHistory);if(group)openModal(group.name+' · 训练明细',exerciseHistoryHtml(group,esc))}
  },{signal:events.signal})
  const signature=(value:unknown)=>JSON.stringify(value,(_k,v)=>v instanceof Set?[...v]:v)
  let previous=signature(data)
  const sub=liveQuery(()=>loadCoachReport(mode,anchor,today)).subscribe({next:value=>{
    if(!host.isConnected||view.dataset.renderVersion!==viewVersion)return
    const next=signature(value);if(next===previous)return;previous=next;data=value;report=data.report
    if(mode==='day'){
      const facts=host.querySelector<HTMLElement>('.coach-day-facts')
      const savedFacts=facts?.cloneNode(true) as HTMLElement|undefined
      if(facts)updateDailyRecordsHtml(facts,dailyRecordsHtml(report.daily!,esc));const updated=facts??savedFacts;draw();if(updated)host.querySelector('.coach-day-facts')?.replaceWith(updated)
    }else draw()
  },error:fail})
  recordsDispose=()=>{sub.unsubscribe();plotsDispose();events.abort()}

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
    const circleStyle = getComputedStyle(button.querySelector('span')!)
    const titleStyle = getComputedStyle(button.closest('.plan-task-row')!.querySelector('.plan-task-copy strong')!)
    const before = { backgroundColor: circleStyle.backgroundColor, borderColor: circleStyle.borderColor, color: circleStyle.color }
    const beforeTitle = { color: titleStyle.color }
    const next = previous.catch(() => {}).then(async () => {
      const task = await toggleTaskCompletion(id); await afterChange(task)
      for (const check of document.querySelectorAll<HTMLButtonElement>('[data-task-complete]')) if (check.dataset.taskComplete === id) {
        animateMotion(check.querySelector('span'), 'state', before)
        animateMotion(check.closest('.plan-task-row')!.querySelector('.plan-task-copy strong'), 'state', beforeTitle)
        animateMotion(check.querySelector('span > .icon'), task.completedAt ? 'completion' : 'completion-off')
      }
    }).catch(fail)
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

let planRenderVersion = 0
async function renderPlanPage(): Promise<void> {
  const version = ++planRenderVersion
  const view = document.querySelector<HTMLElement>('#view')!
  const viewVersion = view.dataset.renderVersion
  const today = getLocalDateString()
  const [tasks, allTags] = await Promise.all([
    planView === 'today' ? getTasksByDate(today) : planView === 'upcoming' ? getUpcomingTasks(today) : getInboxTasks(),
    getTaskTags(),
  ])
  if (activeTab !== 'plan' || version !== planRenderVersion || !view.isConnected || view.dataset.renderVersion !== viewVersion) return
  if (planTagFilterId && !allTags.some((tag) => tag.id === planTagFilterId)) planTagFilterId = undefined
  const filtered = sortTasksForPlan(planTagFilterId ? tasks.filter((task) => task.tagIds.includes(planTagFilterId!)) : tasks)
  const tags = new Map(allTags.map((tag) => [tag.id, tag]))
  const currentFilter = allTags.find((tag) => tag.id === planTagFilterId)
  let content = ''
  if (planView === 'today' || planView === 'inbox') {
    const pending = filtered.filter((task) => !task.completedAt)
    const complete = filtered.filter((task) => task.completedAt)
    if (planView === 'today') {
      const timed = pending.filter((task) => task.startTime)
      const untimed = pending.filter((task) => !task.startTime)
      content = `${timed.length ? `<section class="plan-list-section"><h3>时间安排</h3>${taskGroupHtml(timed, tags)}</section>` : ''}${untimed.length ? `<section class="plan-list-section"><h3>待办</h3>${taskGroupHtml(untimed, tags)}</section>` : ''}`
    } else content = pending.length ? taskGroupHtml(pending, tags) : ''
    if (!pending.length && !complete.length) content += `<div class="plan-empty"><div class="plan-empty-copy"><strong>${planView === 'today' ? '今天还没有安排' : '收件箱是空的'}</strong><span>${planView === 'today' ? '有需要时随手记下来。' : '想到的事情可以先放在这里。'}</span></div><button type="button" class="primary plan-empty-action" id="plan-empty-add">添加任务</button></div>`
    if (complete.length) content += `<details id="plan-completed" class="plan-completed" ${planCompletedOpen ? 'open' : ''}><summary>已完成 ${complete.length} 项</summary>${taskGroupHtml(complete, tags)}</details>`
  } else {
    const groups = new Map<string, Task[]>()
    for (const task of filtered) { const date = task.date!; const group = groups.get(date) ?? []; group.push(task); groups.set(date, group) }
    content = groups.size ? [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, group]) => `<section class="plan-list-section"><h3>${esc(planDateHeading(date, today))}</h3>${taskGroupHtml(sortTasksForPlan(group), tags)}</section>`).join('') : '<div class="plan-empty"><div class="plan-empty-copy"><strong>近期没有安排</strong><span>有日期的未来任务会出现在这里。</span></div><button type="button" class="primary plan-empty-action" id="plan-empty-add">添加任务</button></div>'
  }
  const completedCount = filtered.filter(task => task.completedAt).length
  const planProgress = filtered.length ? `<section class="plan-overview" aria-label="${completedCount} / ${filtered.length} 项任务已完成"><div><strong>${planView === 'today' ? '今日安排' : planView === 'upcoming' ? '近期安排' : '收件箱'}</strong><span>已完成 ${completedCount} / ${filtered.length} 项</span></div><div class="plan-progress-track" aria-hidden="true"><i style="width:${completedCount / filtered.length * 100}%"></i></div></section>` : ''
  const context = planView === 'today' ? planDateHeading(today, today) : planView === 'upcoming' ? '未来安排' : '未安排日期'
  const filter = `<button type="button" id="plan-tag-filter" class="plan-filter-button${currentFilter ? ' is-active' : ''}" aria-label="${currentFilter ? `当前筛选标签 ${esc(currentFilter.name)}，选择其他标签` : '筛选标签'}"><span>${currentFilter ? `#${esc(currentFilter.name)}` : '标签'}</span>${icon('chevron', 14)}</button>`
  const retainedTabs = setTabbedViewHtml(view, `<div class="plan-page"><div class="plan-tabs" role="tablist" aria-label="计划视图"><button role="tab" data-plan-view="today" aria-selected="${planView === 'today'}" class="${planView === 'today' ? 'active' : ''}">今天</button><button role="tab" data-plan-view="upcoming" aria-selected="${planView === 'upcoming'}" class="${planView === 'upcoming' ? 'active' : ''}">近期</button><button role="tab" data-plan-view="inbox" aria-selected="${planView === 'inbox'}" class="${planView === 'inbox' ? 'active' : ''}">收件箱</button></div><div class="plan-context-row"><p class="plan-context-label">${esc(context)}</p><div class="plan-context-actions">${currentFilter ? `<div class="plan-filter-active">${filter}<button type="button" id="plan-tag-filter-clear" class="plan-filter-clear" aria-label="清除标签筛选 ${esc(currentFilter.name)}">${icon('x', 16)}</button></div>` : filter}</div></div>${planProgress}${content}</div>`)
  const topCreate = app.querySelector<HTMLButtonElement>('#plan-add-task')
  if (topCreate) topCreate.hidden = Boolean(view.querySelector('.plan-empty'))
  if (!retainedTabs) view.querySelectorAll<HTMLButtonElement>('[data-plan-view]').forEach((button) => button.addEventListener('click', () => { if (planView === button.dataset.planView) return; planView = button.dataset.planView as PlanView; void renderPlanPage().catch(fail) }))
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
  const dialog = openModal(task ? '编辑任务' : '新建任务', `<form id="task-form" class="task-editor"><label class="task-title-field">任务<input name="title" maxlength="120" value="${esc(task?.title ?? '')}" placeholder="要做什么？" required autocomplete="off" aria-expanded="false" aria-controls="task-tag-suggestions"></label><div id="task-tag-suggestions" class="task-tag-suggestions" role="listbox" hidden></div><div id="task-selected-tags" class="task-selected-tags"></div><section class="task-editor-section"><h3>日期</h3><div class="task-date-choices"><button type="button" data-task-date="today">今天</button><button type="button" data-task-date="tomorrow">明天</button><button type="button" data-task-date="none">无日期</button></div><input type="hidden" name="date" value="${esc(task?.date ?? defaultDate ?? '')}"><button type="button" id="task-date-picker-open" class="task-date-field fitlog-date-trigger">${icon('calendar', 18)}<span>选择日期</span></button></section><section class="task-editor-section" id="task-time-section"><h3>时间（可选）</h3><div class="task-time-fields"><label>开始时间<input type="time" name="startTime" value="${esc(task?.startTime ?? '')}"></label><label>结束时间<input type="time" name="endTime" value="${esc(task?.endTime ?? '')}"></label></div><p class="task-inline-error" id="task-time-error" role="alert" hidden>结束时间必须晚于开始时间</p></section><label class="task-note-field">备注（可选）<textarea name="note" maxlength="2000" rows="3" placeholder="补充一点细节">${esc(task?.note ?? '')}</textarea></label><div class="task-editor-actions"><button type="submit" class="primary full-btn">保存任务</button></div>${task ? '<button type="button" class="plan-quiet-danger" id="task-delete">删除任务</button>' : ''}</form>`)
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
    form.querySelectorAll<HTMLButtonElement>('[data-task-date]').forEach((button) => { const value = button.dataset.taskDate === 'today' ? getLocalDateString() : button.dataset.taskDate === 'tomorrow' ? shiftLocalDate(getLocalDateString(), 1) : ''; button.classList.toggle('active', value === date); button.setAttribute('aria-pressed', String(value === date)) })
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
  let taskParentScroll = 0
  const returnToForm = () => {
    picker?.destroy(); picker = undefined; pickerView.hidden = true; form.hidden = false; dialog.querySelector('.modal-body')!.scrollTop = taskParentScroll; animateMotion(form, 'back')
    dialog.querySelector('h2')!.textContent = task ? '编辑任务' : '新建任务'
    if (document.documentElement.dataset.inputModality === 'keyboard') dateTrigger.focus({ preventScroll: true })
  }
  dateTrigger.addEventListener('click', () => {
    taskParentScroll = dialog.querySelector('.modal-body')!.scrollTop
    stabilizeSheetSubview(dialog); form.hidden = true; pickerView.hidden = false; animateMotion(pickerView, 'subview'); dialog.querySelector('h2')!.textContent = '选择任务日期'
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
  const surface = createManagementWorkspace(esc)
  const dialog = managementModal(surface)('管理与设置', '<div id="management-hub"></div>', true)
  const view = dialog.querySelector<HTMLElement>('#management-hub')!
  const row = (id: string, iconName: IconName, title: string, detail: string) => `<button id="${id}"><span class="setting-icon">${icon(iconName, 18)}</span><span><strong>${title}</strong><small>${detail}</small></span>${icon('chevron', 18)}</button>`
  view.innerHTML = `<section class="settings-section"><h3>内容与模板</h3><div class="settings-group">${row('more-food-library', 'utensils', '食物库', '管理食物与营养数据')}${row('more-exercise-library', 'dumbbell', '动作库', '管理力量训练动作')}${row('more-workout-templates', 'activity', '训练模板', '管理常用训练组合')}${row('more-diet-templates', 'archive', '饮食模板', '管理常用饮食组合')}${row('more-nutrition-strategies', 'leaf', '营养模板', '管理营养目标方案')}</div></section><section class="settings-section"><h3>个人管理</h3><div class="settings-group">${row('more-habits', 'leaf', '习惯', '管理打卡习惯与计划')}</div></section><section class="settings-section"><h3>数据与备份</h3><div class="settings-group">${row('more-import', 'upload', '导入数据', '从文件导入食物数据')}${row('more-backup', 'download', '备份与恢复', '导出或恢复本地数据')}${row('more-github-sync', 'archive', 'GitHub 同步', esc(githubSyncDetail()))}</div><p class="settings-section-note" role="note">数据保存在当前设备。更换设备或清除浏览器数据前，请先备份。</p></section><section class="settings-section"><h3>应用</h3><div class="settings-group">${row('more-ai-settings', 'sparkles', 'AI 设置', esc(aiSettingsDetail()))}${row('more-diagnostics', 'info', '版本诊断', '查看版本、更新与 Service Worker 状态')}${row('more-about', 'info', '关于 FitLog Lite', '应用信息与版本说明')}</div></section>`
  surface.onResume(() => {
    view.querySelector('#more-github-sync small')!.textContent = githubSyncDetail()
    view.querySelector('#more-ai-settings small')!.textContent = aiSettingsDetail()
  })
  view.querySelector('#more-food-library')?.addEventListener('click', () => surface.navigate('食物库', surface => showFoodLibrary('', surface)))
  view.querySelector('#more-exercise-library')?.addEventListener('click', () => surface.navigate('动作库', surface => showExerciseLibrary(surface)))
  view.querySelector('#more-workout-templates')?.addEventListener('click', () => surface.navigate('训练模板', surface => showWorkoutTemplateManager('', surface)))
  view.querySelector('#more-diet-templates')?.addEventListener('click', () => surface.navigate('饮食模板', surface => showDietTemplateManager('', surface)))
  view.querySelector('#more-habits')?.addEventListener('click', () => surface.navigate('习惯', surface => showHabitManager(false, surface)))
  view.querySelector('#more-import')?.addEventListener('click', () => surface.navigate('导入数据', surface => db.foods.orderBy('name').toArray().then(foods => showFoodImportChooser(foods, '', surface)).catch(fail)))
  view.querySelector('#more-backup')?.addEventListener('click', () => surface.navigate('备份与恢复', surface => showSettings(surface).catch(fail)))
  view.querySelector('#more-nutrition-strategies')?.addEventListener('click', () => surface.navigate('营养模板', surface => { return showNutritionStrategyManager(nutritionStrategyUi(surface)).catch(fail) }))
  view.querySelector('#more-github-sync')?.addEventListener('click', () => surface.navigate('GitHub 同步', surface => { return flushWorkoutAutosave().then(() => { if (!surface.alive) return; showGitHubSync({ surface, openModal: managementModal(surface), esc, toast, restored: async () => { workoutAutosave.cancel(); currentWorkout = undefined; workoutEditorOpen = false; await render() } }) }).catch(fail) }))
  view.querySelector('#more-ai-settings')?.addEventListener('click', () => surface.navigate('AI 设置', surface => showAiSettings({ surface, openModal: managementModal(surface), esc, changed: () => aiAssistant.settingsChanged() }, aiAssistant.profiles)))
  view.querySelector('#more-diagnostics')?.addEventListener('click', () => surface.navigate('版本诊断', surface => showPwaDiagnostics(pwaRuntime, {
    surface, openModal: managementModal(surface), esc,
    confirm: () => confirmAction('更新应用？', '已保存的本地记录会保留。应用将重新打开，当前 AI 对话会结束。', '确认更新', false),
    blockReason: dialog => updateBlockReason({
      otherDialog: Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).some(open => open !== dialog),
      workout: workoutEditorOpen,
      timer: pelvicSessionSaving || pelvicTimerState?.status === 'running' || pelvicTimerState?.status === 'paused',
      aiBusy: aiAssistant.busy,
      aiDraft: hasAiAssistantDraft(aiAssistant),
      aiProposal: aiAssistant.proposals.all.some(proposal => proposal.status === 'pending' || proposal.status === 'processing'),
    }),
    drainWrites: async () => { await flushWorkoutAutosave(); await db.transaction('r', db.tables, async () => {}) },
  })))
  view.querySelector('#more-about')?.addEventListener('click', () => surface.navigate('关于 FitLog Lite', surface => { managementModal(surface)('关于 FitLog Lite', `<div class="about-card"><span class="brand-mark large">${icon('leaf', 30)}</span><h2>FitLog Lite</h2><p>一款轻盈、安静的本地个人健康记录工具。</p><small>饮食 · 力量训练 · 体重 · 凯格尔训练</small></div>`) }))
}

async function renderCalendarOverview(withProgressTabs = false): Promise<void> {
  const view = document.querySelector<HTMLElement>('#view')!
  const viewVersion = view.dataset.renderVersion
  let summaries = await loadMonthSummaries(calendarYear, calendarMonth)
  if (!view.isConnected || view.dataset.renderVersion !== viewVersion) return
  const retainedTabs = setTabbedViewHtml(view, `${withProgressTabs ? progressTabsHtml() : ''}<section class="calendar-overview-head"><button class="icon-btn quiet calendar-prev" id="calendar-prev" aria-label="上个月">${icon('chevron', 20)}</button><div><strong>${calendarYear}年 ${calendarMonth + 1}月</strong><button class="text-btn" id="calendar-today">回到今天</button></div><button class="icon-btn quiet" id="calendar-next" aria-label="下个月">${icon('chevron', 20)}</button></section><div id="calendar-host"></div><section class="calendar-legend" aria-label="日历标记说明">${calendarCategories.map((category) => `<span class="calendar-legend-item"><i class="calendar-legend-icon calendar-category-${category}" aria-hidden="true">${icon(calendarCategoryIcons[category], 14)}</i><span>${calendarLegendLabels[category]}</span></span>`).join('')}</section>`)
  if (withProgressTabs && !retainedTabs) bindProgressTabs(view)
  const host = view.querySelector<HTMLElement>('#calendar-host')!
  const year=calendarYear,month=calendarMonth
  const draw=()=>{
    const focused=host.querySelector<HTMLButtonElement>('.calendar-day:focus')?.dataset.date
    host.replaceChildren(renderMonthCalendar({year,month,selectedDate:calendarSelectedDate,summaries,onDateClick:date=>void handleCalendarDateClick(date,summaries.get(date),summaries)}))
    if(focused)host.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${focused}"]`)?.focus({preventScroll:true})
  }
  draw()
  let signature=JSON.stringify([...summaries])
  const sub=liveQuery(()=>loadMonthSummaries(year,month)).subscribe({next:value=>{if(!host.isConnected||view.dataset.renderVersion!==viewVersion)return;const next=JSON.stringify([...value]);if(next===signature)return;signature=next;summaries=value;draw()},error:fail})
  recordsDispose=()=>sub.unsubscribe()
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
  const request=++daySheetRequest
  calendarSelectedDate = date
  const selected = new Date(`${date}T12:00:00`)
  if (selected.getFullYear() !== calendarYear || selected.getMonth() !== calendarMonth) {
    calendarYear = selected.getFullYear()
    calendarMonth = selected.getMonth()
    await render()
    if(request!==daySheetRequest)return
    await showCalendarDaySheet(date,request)
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
  await showCalendarDaySheet(date,request)
}

function dietEventUi(): DietEventUi { return { openModal, esc, profiles: aiAssistant.profiles, confirmDelete: (title, body) => confirmAction(title, body, '删除记录', true), changed: async () => { await render() } } }

async function showCalendarDaySheet(date: string,request=++daySheetRequest): Promise<void> {
  const owner=document.querySelector('#calendar-host')
  let records=await readDailyRecords(date)
  if(request!==daySheetRequest||!owner?.isConnected)return
  const dialog=openModal(formatHeaderDate(date),`<h3 class="daily-records-heading">当日记录</h3><div data-daily-records-host>${dailyRecordsHtml(records,esc,true)}</div><section class="calendar-quick-record" aria-label="快捷记录"><h3>快捷记录</h3><div class="calendar-day-actions"><button id="calendar-day-food">${icon('utensils',18)} 饮食</button><button id="calendar-day-workout">${icon('dumbbell',18)} 训练</button><button id="calendar-day-weight">${icon('scale',18)} 体重</button></div></section><div class="calendar-day-danger"><button id="calendar-clear-day" class="danger-button">清空饮食、训练与体重记录</button></div>`,true)
  dialog.classList.add('calendar-detail-sheet')
  const host=dialog.querySelector<HTMLElement>('[data-daily-records-host]')!
  host.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-diet-event-edit]');if(button)showDietEvent(dietEventUi(),date,records.source.dietEvents.find(e=>e.id===button.dataset.dietEventEdit))})
  const sub=liveQuery(()=>readDailyRecords(date)).subscribe({next:value=>{if(!dialog.open||!host.isConnected)return;records=value;updateDailyRecordsHtml(host,dailyRecordsHtml(records,esc,true))},error:fail})
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
  dialog.querySelector('#calendar-day-food')?.addEventListener('click',()=>{dialog.close();activeTab='food';foodDate=date;void render().catch(fail)})
  dialog.querySelector('#calendar-day-workout')?.addEventListener('click',()=>{dialog.close();activeTab='workout';workoutDate=date;currentWorkout=undefined;workoutEditorOpen=false;showWorkoutHistory=false;void render().catch(fail)})
  dialog.querySelector('#calendar-day-weight')?.addEventListener('click',()=>{dialog.close();activeTab='progress';progressView='trend';void render().then(()=>showWeightForm(date,records.summary.weightKg)).catch(fail)})
  dialog.querySelector('#calendar-clear-day')?.addEventListener('click',async()=>{
    const day=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric'}).format(new Date(date+'T12:00:00'))
    if(!await confirmAction(`清空 ${day} 的饮食、训练和体重记录？`,'将删除当天饮食记录、特殊饮食备注、营养目标、力量训练、有氧训练、凯格尔训练和体重记录。睡眠、饮水、习惯打卡与计划任务保留。删除后无法恢复。','清空这些记录'))return
    try{await clearDayRecords(date);toast('饮食、训练与体重记录已清空')}catch(error){fail(error)}
  })
}

interface PreviousRingValue { actual: number; goal?: number }

function calorieGaugeHtml(actual: number, goal: number | undefined, surface: 'today' | 'food', previous?: PreviousRingValue): string {
  void previous
  return calorieBudgetHtml(actual, goal, surface)
}

function foodLogRowHtml(log: FoodLog): string {
  return `<article class="food-row"><button class="food-row-main" data-edit-log="${esc(log.id)}" aria-label="编辑 ${esc(log.foodName)}"><span><strong>${esc(log.foodName)}</strong><small>${log.brand ? `${esc(log.brand)} · ` : ''}${formatNumber(log.grams)} g</small><small class="food-log-macros">${([['totalProtein', '蛋白质'], ['totalCarbs', '碳水'], ['totalFat', '脂肪']] as const).map(([key, label]) => `${label} ${log[key] === undefined ? '未知' : `${formatNumber(log[key]!)}g`}`).join(' · ')}</small></span><span class="food-kcal"><strong>${formatNumber(log.totalCalories)} <small>kcal</small></strong></span></button><details class="row-menu"><summary aria-label="${esc(log.foodName)}更多操作">···</summary><div><button data-delete-log="${esc(log.id)}">删除记录</button></div></details></article>`
}

function foodMealSectionHtml(group: FoodMealGroup, isToday: boolean, expanded = false): string {
  const meal = group.meal, key = meal ?? 'unclassified', count = group.logs.length
  const preview = count ? group.logs.slice(0, 3).map(log => `<span class="meal-preview-name">${esc(log.foodName)}</span>`).join('') : `${isToday ? '今天' : '这天'}还没有记录${group.name}`
  const mealIcon: Record<MealType, IconName> = { breakfast: 'sunrise', lunch: 'sun', dinner: 'moon', snack: 'snack' }
  const macro = (key: 'Protein' | 'Carbs' | 'Fat', label: string) => group.logs.every(log => log[`total${key}`] !== undefined) ? `${label} ${formatNumber(group.logs.reduce((sum, log) => sum + log[`total${key}`]!, 0))}g` : `${label} 数据不完整`
  return `<section class="food-meal ${count ? 'has-logs' : 'is-empty'}" data-meal-section="${key}"><div class="food-meal-head"><div class="food-meal-summary"><span class="meal-symbol ${key}" aria-hidden="true">${icon(meal ? mealIcon[meal] : 'archive', 18)}</span><span class="meal-title"><strong>${group.name}</strong><small>${count} 项记录</small></span></div><strong class="meal-kcal">${formatEnergyInputValue(group.calories)} <small>kcal</small></strong>${count ? `<button type="button" class="icon-btn quiet meal-toggle" data-toggle-meal="${key}" aria-expanded="${expanded}" aria-controls="meal-records-${key}" aria-label="${expanded ? '收起' : '展开'}${group.name}明细">${icon('chevron', 18)}</button>` : '<span class="meal-toggle-spacer" aria-hidden="true"></span>'}</div><div class="meal-preview-row"><p class="meal-preview"><span class="meal-preview-names">${preview}</span></p>${meal ? `<button type="button" class="meal-record" data-add-meal="${meal}">＋记录</button>` : '<span class="meal-unclassified-note">待整理</span>'}</div>${count ? `<div class="meal-log-list" id="meal-records-${key}" ${expanded ? '' : 'hidden'}><p class="meal-detail-macros">${macro('Protein', '蛋白质')} · ${macro('Carbs', '碳水')} · ${macro('Fat', '脂肪')}</p>${group.logs.map(foodLogRowHtml).join('')}<button type="button" class="text-btn danger compact-action meal-clear" data-clear-meal="${key}">清空本餐记录</button></div>` : ''}</section>`
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
  nutritionDispose?.(); nutritionDispose = undefined
  updateFoodTodayShortcut()
  const requestedDate = foodDate
  const requestVersion = ++foodContentVersion
  const view = document.querySelector<HTMLElement>('#view')!
  const [nutrition, dietEvents] = await Promise.all([
    readDailyNutritionSummary(requestedDate),
    db.dietEvents.where('date').equals(requestedDate).sortBy('createdAt'),
  ])
  if (activeTab !== 'food' || !view.isConnected || !isCurrentFoodRender(requestVersion, foodContentVersion, requestedDate, foodDate)) return
  const { logs, target, totals } = nutrition
  const isToday = requestedDate === getLocalDateString()
  const previous = new Map<string, PreviousRingValue>()
  view.querySelectorAll<HTMLElement>('[data-progress-key]').forEach((element) => {
    if (element.closest<HTMLElement>('[data-food-date]')?.dataset.foodDate !== requestedDate) return
    previous.set(element.dataset.progressKey!, { actual: Number(element.dataset.actual), goal: element.dataset.goal === undefined ? undefined : Number(element.dataset.goal) })
  })
  const calorieTarget = target?.calories
  const groups = groupFoodLogs(logs)
  const completionStrip = foodCompletionStripHtml(requestedDate, getNutritionCompletionSummary(target ?? {}, logs))
  const expandedMeals = new Set(Array.from(view.querySelectorAll<HTMLButtonElement>('.food-content-body[data-food-date="' + requestedDate + '"] [data-toggle-meal][aria-expanded="true"]'), button => button.dataset.toggleMeal))
  const slotHtml = `<div class="food-content-body" data-food-date="${requestedDate}">
    <section class="nutrition-hero food-nutrition-hero" data-food-date="${requestedDate}" aria-label="${isToday ? '今日' : '当日'}营养汇总"><div class="nutrition-hero-head"><span class="hero-label">饮食总览</span><button class="text-btn" data-edit-nutrition-target>${target ? '编辑目标' : '设置目标'} ${icon('chevron', 16)}</button></div><div class="food-calorie-row">${calorieGaugeHtml(totals.calories, calorieTarget, 'food', previous.get('calories'))}</div><div class="macros" data-macro-summary-host>${macroNutritionSummaryForDay(nutrition)}</div>${target?.strategySelection ? `<p class="strategy-food-source">${esc(target.strategySelection.templateName)} · ${esc(target.strategySelection.variantName)}</p>` : ''}</section>
    ${completionStrip}
    ${dietEventsHtml(dietEvents, esc)}
    <section class="food-meals-head"><div><h2>${isToday ? '今日' : '当日'}饮食</h2><span>${logs.length ? `${logs.length} 项记录` : '按餐次记录，更清楚'}</span></div>${logs.length ? '<button class="food-save-template" id="save-day-diet-template" type="button" aria-label="将当天饮食保存为模板">保存为模板</button>' : ''}</section>
    <div class="food-meals">${groups.map((group) => foodMealSectionHtml(group, isToday, expandedMeals.has(group.meal ?? 'unclassified'))).join('')}</div></div>`
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
  bindDietEvents(body, requestedDate, dietEvents, dietEventUi())
  bindFoodHeader()
  nutritionDispose = observeDailyNutritionSummary(requestedDate, nutrition, () => { if (activeTab === 'food' && foodDate === requestedDate && view.isConnected) void renderFoodPage().catch(fail) }, fail)
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
  slot.querySelector<HTMLButtonElement>('#food-completion-open')?.addEventListener('click', async event => { const button=event.currentTarget as HTMLButtonElement;if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');try{await showNutritionCompletion(slot.dataset.foodDate!)}catch(error){fail(error)}finally{button.disabled=false;button.removeAttribute('aria-busy')} })
  slot.querySelector('#save-day-diet-template')?.addEventListener('click', () => void saveDayAsDietTemplate(logs))
  slot.querySelector('[data-edit-nutrition-target]')?.addEventListener('click', () => showNutritionTargetForm(foodDate, target))
  slot.querySelector('#food-completion-custom')?.addEventListener('click', () => void showNutritionCompletion(slot.dataset.foodDate!, 'designated').catch(fail))
  slot.querySelectorAll<HTMLButtonElement>('[data-add-meal]').forEach((button) => button.addEventListener('click', () => { const meal = button.dataset.addMeal; if (isMealType(meal)) void showAddFoodLog(meal) }))
  const setMealExpanded = (section: Element, expanded: boolean) => { const list=section.querySelector<HTMLElement>('.meal-log-list');if(!list)return;list.hidden=!expanded;section.querySelectorAll('[data-toggle-meal]').forEach(b=>{b.setAttribute('aria-expanded',String(expanded));b.setAttribute('aria-label',`${expanded ? '收起' : '展开'}${section.querySelector('.meal-title strong')!.textContent}明细`)}) }
  slot.querySelectorAll<HTMLButtonElement>('[data-toggle-meal]').forEach(button=>button.addEventListener('click',()=>{const section=button.closest('.food-meal')!;setMealExpanded(section,Boolean(section.querySelector<HTMLElement>('.meal-log-list')!.hidden))}))
  slot.querySelectorAll<HTMLButtonElement>('[data-clear-meal]').forEach(button => button.addEventListener('click', async () => {
    const date = slot.dataset.foodDate!, meal = isMealType(button.dataset.clearMeal) ? button.dataset.clearMeal : undefined
    const name = meal ? mealNames[meal] : '未分类', selected = logs.filter(log => meal === undefined ? !isMealType(log.meal) : log.meal === meal)
    if (!await confirmAction(`清空${name}记录？`, `将删除 ${date} ${name}的 ${selected.length} 条饮食记录。此操作无法撤销，但不会删除食物库中的食物。`, `清空 ${selected.length} 条记录`, true, '取消', 'meal-clear')) return
    button.disabled = true
    try { await deleteFoodLogsForMeal(date, meal, db, selected.map(log => log.id)); toast('本餐记录已清空'); await renderFoodPage() }
    catch (error) { button.disabled = false; fail(error) }
  }))
  slot.querySelectorAll<HTMLButtonElement>('[data-delete-log]').forEach((button) => button.addEventListener('click', async () => {
    button.closest('details')?.removeAttribute('open')
    if (!await confirmAction('删除饮食记录？', '删除后无法撤销，但不会影响食物库。')) return
    try { await deleteFoodLog(button.dataset.deleteLog!); toast('已删除'); await renderFoodPage() } catch (error) { fail(error) }
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

function foodCompletionStripHtml(date: string, summary: NutritionCompletionSummary, showAction = true): string {
  return remainingNutritionSummaryHtml(date, summary, showAction ? 'food' : 'today')
}

async function showNutritionCompletion(date: string, mode: CompletionMode = 'smart'): Promise<void> {
  await openNutritionCompletionSheet(date, { openModal, esc, saved: count => { toast(`已添加 ${count} 项饮食记录`); if (activeTab === 'food') void renderFoodPage().catch(fail) } }, mode)
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

function nutritionStrategyUi(surface?: ManagedSurfaceContext) {
  return { surface, openModal: surface ? managementModal(surface) : openModal, esc, goalFields: nutritionGoalFields, goalFromForm: nutritionGoalFromForm,
    manual: showManualNutritionTargetForm, changed: render, toast, confirm: confirmAction }
}
function showNutritionTargetForm(date: string, target?: NutritionTarget): void {
  void showNutritionStrategyPicker(nutritionStrategyUi(), date, target).catch(fail)
}
function showManualNutritionTargetForm(date: string, target?: NutritionTarget): void {
  const dialog = openModal(target ? '编辑当日目标' : '设置当日目标', `<form id="nutrition-target-form" class="form"><p class="muted">${formatHeaderDate(date)}</p>${nutritionGoalFields(target)}<button class="primary" type="submit">保存目标</button>${target ? '<button class="danger-button" type="button" id="delete-nutrition-target">删除目标</button>' : ''}<button class="sheet-link compact-action" type="button" id="manual-nutrition-templates">管理营养模板</button></form>`)
  dialog.querySelector('#manual-nutrition-templates')?.addEventListener('click', () => { void showNutritionStrategyManager(nutritionStrategyUi(), () => showNutritionTargetForm(date, target)).catch(fail) })
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

function openFoodVisionWorkflow(date: string, meal?: MealType, surface?: ManagedSurfaceContext): void {
  showFoodVisionImport({ surface, openModal: surface ? managementModal(surface) : openModal, esc, profiles: aiAssistant.profiles, openSettings: () => showAiSettings({ surface, openModal: surface ? managementModal(surface) : openModal, esc, changed: () => aiAssistant.settingsChanged() }, aiAssistant.profiles), onFinish: logged => { if (!logged) void showFoodLibrary('', surface) }, onSaved: async (_food, logged) => { toast(logged ? meal ? '已记录' : '已加入食物库并记录饮食' : '已加入食物库'); if (activeTab === 'food') await renderFoodPage(); else if (activeTab === 'today') await renderTodayPage() } }, { date, meal })
}

async function showAddFoodLog(meal: MealType): Promise<void> {
  const recordDate = foodDate
  await openMealEntry(recordDate, meal, { openModal, esc, saved: () => toast('已保存，可继续添加'), vision: openFoodVisionWorkflow, newFood: (dialog, saved) => { void showFoodForm(undefined, undefined, { dialog, saved }) } })
}

async function showFoodLibrary(query = '', surface?: ManagedSurfaceContext, refreshGuard?:()=>boolean): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  let currentQuery = query
  let searchTimer: number | undefined
  if (surface && (!surface.alive || (refreshGuard && !refreshGuard()))) return
  const dialog = mountManagementModal(surface, '食物库', `<div class="manager-surface">${managerToolbarHtml(managerSearchHtml('library-search', '搜索食物库', '搜索食物', esc(query)), 'new-food', '食物', !foods.length)}${managerUtilitiesHtml(`<button class="secondary compact-action" id="food-vision-import">${icon('camera', 18)} 拍包装录入</button><button class="secondary compact-action" id="food-import-open">${icon('upload', 18)} 导入文件</button>`)}<div class="library-list manager-results"></div></div>`, foods.length > 0)
  dialog.classList.add('food-library-sheet')
  const list = dialog.querySelector<HTMLElement>('.library-list')!
  const draw = (nextQuery: string) => {
    currentQuery = nextQuery
    const normalized = nextQuery.trim().toLocaleLowerCase()
    const filtered = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized))
    list.innerHTML = filtered.length ? managerListHtml(filtered.map(food => managerRowHtml(esc(food.name), `${formatEnergyInputValue(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g${food.brand ? `<br>${esc(food.brand)}` : ''}${food.servingGrams === undefined ? '' : `<br><span class="food-serving-note">1 份 ${formatNumber(food.servingGrams)} g</span>`}`, `data-edit-food="${esc(food.id)}"`)).join('')) : normalized ? managerNoResultsHtml('食物', '<button class="text-btn compact-action" id="clear-food-search">清除搜索</button>') : managerEmptyHtml('食物', '拍包装录入，或手动新建。', 'empty-new-food')
    list.querySelector('#clear-food-search')?.addEventListener('click', () => { window.clearTimeout(searchTimer); dialog.querySelector<HTMLInputElement>('#library-search')!.value = ''; draw('') })
    list.querySelectorAll<HTMLButtonElement>('[data-edit-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.editFood); leaveStandalone(dialog, surface); void showFoodForm(food, surface) }))

  }
  dialog.querySelector<HTMLButtonElement>('#new-food')!.hidden = !foods.length
  list.addEventListener('click', event => { if ((event.target as Element).closest('#empty-new-food')) void showFoodForm(undefined, surface) })
  draw(dialog.querySelector<HTMLInputElement>('#library-search')!.value)
  dialog.querySelector<HTMLInputElement>('#library-search')?.addEventListener('input', (event) => {
    window.clearTimeout(searchTimer)
    const value = (event.target as HTMLInputElement).value
    searchTimer = window.setTimeout(() => draw(value), 120)
  })
  if (surface) { surface.onDispose(() => window.clearTimeout(searchTimer)); surface.onSuspend(() => window.clearTimeout(searchTimer)) }
  else dialog.addEventListener('close', () => window.clearTimeout(searchTimer), { once: true })
  dialog.querySelector('#food-vision-import')?.addEventListener('click', () => { const date = activeTab === 'food' ? foodDate : getLocalDateString(); leaveStandalone(dialog, surface); openFoodVisionWorkflow(date, undefined, surface) })
  dialog.querySelector('#new-food')?.addEventListener('click', () => { leaveStandalone(dialog, surface); void showFoodForm(undefined, surface) })
  dialog.querySelector('#food-import-open')?.addEventListener('click', () => showFoodImportChooser(foods, currentQuery, surface))
  observeManagerCatalog(surface,dialog.querySelector('.manager-surface')!,['foods'],guard=>showFoodLibrary(dialog.querySelector<HTMLInputElement>('#library-search')?.value??currentQuery,surface,guard))
  surface?.restoreScroll()
}

function showFoodImportChooser(foods: Food[], query = '', surface?: ManagedSurfaceContext): void {
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '导入数据', `<div class="food-import-choices"><button class="secondary compact-action" id="import-csv">${icon('upload', 18)} 表格文件（CSV）</button><button class="secondary compact-action" id="import-json">${icon('upload', 18)} 数据文件（JSON）</button><input id="import-file" type="file" hidden><button class="text-btn compact-action" id="import-back">返回食物库</button></div>`)
  dialog.querySelector('#import-back')?.addEventListener('click', () => void showFoodLibrary(query))
  const fileInput = dialog.querySelector<HTMLInputElement>('#import-file')!
  dialog.querySelector('#import-csv')?.addEventListener('click', () => { fileInput.accept = '.csv,text/csv'; fileInput.click() })
  dialog.querySelector('#import-json')?.addEventListener('click', () => { fileInput.accept = '.json,application/json'; fileInput.click() })
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return
    try {
      const text = await file.text()
      if (!fileInput.isConnected || !dialog.open) return
      const isCsv = file.name.toLocaleLowerCase().endsWith('.csv')
      const csvResult = isCsv ? parseFoodCsv(text) : undefined
      const rows = csvResult?.rows ?? parseFoodJson(text)
      const preview = buildImportPreview(rows, foods)
      if (csvResult) preview.errors.push(...csvResult.parseErrors)
      leaveStandalone(dialog, surface); showImportPreview(preview, foods, surface)
    } catch (error) { fail(error) }
  })
}

function foodFields(food?: Food): string {
  return `<form id="food-form" class="form food-form manager-editor"><label>食物名称 *<input name="name" value="${esc(food?.name)}" placeholder="鸡胸肉" required></label><label>品牌<input name="brand" value="${esc(food?.brand)}" placeholder="可选"></label><label>基准重量 *<input name="referenceGrams" type="number" inputmode="decimal" min="0.1" step="0.1" value="${food?.referenceGrams ?? 100}" required><span>g</span></label><div class="food-energy-group"><label>能量 *<div class="energy-input-row"><input name="calories" type="number" inputmode="decimal" min="0" step="any" value="${food?.calories ?? ''}" placeholder="165" required><select name="energyUnit" aria-label="能量单位"><option value="kcal">kcal</option><option value="kJ">kJ</option></select></div></label><p id="food-energy-preview" class="food-energy-preview"></p></div><div class="food-macro-grid" role="group" aria-label="宏量营养"><label>蛋白质<input name="protein" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.protein ?? ''}"><span>g</span></label><label>碳水<input name="carbs" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.carbs ?? ''}"><span>g</span></label><label>脂肪<input name="fat" type="number" inputmode="decimal" min="0" step="0.1" value="${food?.fat ?? ''}"><span>g</span></label></div><label>每份克数（可选）<input name="servingGrams" type="number" inputmode="decimal" min="${Number.MIN_VALUE}" step="any" value="${food?.servingGrams ?? ''}" placeholder="150"><span>g</span></label><button class="primary compact-action" type="submit">保存食物</button></form>`
}

async function showFoodForm(food?: Food, surface?: ManagedSurfaceContext, entry?: { dialog: HTMLDialogElement; saved: () => Promise<void> }): Promise<void> {
  if (surface && !surface.alive) return
  const returnToEntry = entry ? historySubview(entry.dialog, '新建食物', foodFields(food)) : undefined
  const dialog = entry?.dialog ?? mountManagementModal(surface, food ? '编辑食物' : '新建食物', foodFields(food) + (food ? '<div class="manager-danger-zone"><button type="button" class="text-btn danger" id="delete-food">删除食物</button></div>' : ''))
  dialog.querySelector('#delete-food')?.addEventListener('click', async () => { if (!food || !await confirmAction('删除这个食物？', '历史饮食记录会保留，此操作不会改变过去的营养数据。')) return; try { await db.foods.delete(food.id); leaveStandalone(dialog, surface); toast('已删除'); await showFoodLibrary('', surface) } catch (error) { fail(error) } })
  const energyInput = dialog.querySelector<HTMLInputElement>('[name=calories]')!, energyUnit = dialog.querySelector<HTMLSelectElement>('[name=energyUnit]')!
  const energyEditor = bindEnergyEditor(energyInput, energyUnit, food?.calories)
  const updateEnergyPreview = () => { const node = dialog.querySelector('#food-energy-preview')!; try { const kcal = energyEditor.kcal ?? 0; node.textContent = energyInput.value.trim() ? `${formatEnergyInputValue(kcal)} kcal · ${formatEnergyInputValue(kcalToKj(kcal))} kJ` : '填写包装能量，保存时统一为 kcal' } catch { node.textContent = '请填写有效能量' } }
  energyInput.addEventListener('input', updateEnergyPreview)
  energyUnit.addEventListener('change', updateEnergyPreview)
  updateEnergyPreview()
  let entrySaving = false
  dialog.querySelector<HTMLFormElement>('#food-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (entry && entrySaving) return
    const form = event.currentTarget as HTMLFormElement, data = new FormData(form), submit = form.querySelector<HTMLButtonElement>('[type=submit]')
    if (entry) { entrySaving = true; if (submit) submit.disabled = true }
    try {
      await saveFood({ name: valueOf(data, 'name'), brand: valueOf(data, 'brand'), referenceGrams: Number(valueOf(data, 'referenceGrams')), servingGrams: valueOf(data, 'servingGrams') as unknown as number, calories: energyEditor.kcal ?? NaN, protein: valueOf(data, 'protein') as unknown as number, carbs: valueOf(data, 'carbs') as unknown as number, fat: valueOf(data, 'fat') as unknown as number }, food?.id)
      if (entry) { returnToEntry?.(); await entry.saved(); toast('已加入食物库'); return }
      leaveStandalone(dialog, surface); toast('已保存'); if (!surface) await renderFoodPage(); void showFoodLibrary('', surface)
    } catch (error) { fail(error) } finally { entrySaving = false; if (entry && submit) submit.disabled = false }
  })
}

function showImportPreview(preview: ImportPreview, existing: Food[], surface?: ManagedSurfaceContext): void {
  const duplicateSet = new Set(preview.duplicateIndexes)
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '导入预览', `<div class="import-summary"><div><strong>${preview.valid.length - preview.duplicateIndexes.length}</strong><span>有效</span></div><div><strong>${preview.errors.length}</strong><span>错误</span></div><div><strong>${preview.duplicateIndexes.length}</strong><span>重复</span></div></div>${preview.errors.length ? `<details><summary>查看错误行</summary><ul class="error-list">${preview.errors.map((error) => `<li>第 ${error.row} 行：${esc(error.reason)}</li>`).join('')}</ul></details>` : ''}<div class="form"><fieldset><legend>重复项处理</legend><label class="radio"><input type="radio" name="duplicate" value="skip" checked>跳过重复项</label><label class="radio"><input type="radio" name="duplicate" value="overwrite">覆盖已有食物</label></fieldset><button class="primary" id="confirm-import" ${preview.valid.length ? '' : 'disabled'}>确认导入</button></div>`)
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
      leaveStandalone(dialog, surface); toast(`成功导入 ${imported} 条，跳过 ${skipped} 条。`); void showFoodLibrary('', surface)
    } catch (error) { fail(error) }
  })
}

async function renderWorkoutPage(): Promise<void> {
  const view = document.querySelector<HTMLElement>('#view')!
  const viewVersion = view.dataset.renderVersion
  if (trainingCompletion) { trainingCompletion.render(); return }
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
  const dailyPlanRoutine = pelvicPlanRoutine(selectedPelvicPlanLevel(getPelvicFloorPlanProgress(allPelvicSessions)))
  if (!view.isConnected || view.dataset.renderVersion !== viewVersion) return
  view.innerHTML = `<section class="context-row"><button type="button" id="workout-date-picker-open" class="date-control fitlog-date-trigger">${icon('calendar', 18)}<span>训练日期 · ${datePickerLabel(workoutDate).split(' · ')[0]}</span></button><div class="context-actions"><button class="text-btn" id="workout-templates">训练模板</button><button class="text-btn" id="exercise-library">动作库 ${icon('chevron', 16)}</button></div></section>
    <section class="training-category">${trainingModuleHtml('力量训练','dumbbell','history-workout',`<p class="training-card-note">记录动作与组数</p><div class="training-card-summary">${trainingSummaryTiles('动作数量',`${strengthExercises} 个动作`,'记录组数',`${strengthSets} 组`)}</div><p class="training-card-detail">${openWorkout?'正在记录':todayWorkouts.length?'当日已记录':'今天还没有力量训练'}${todayWorkouts.length?' · '+esc([...new Set(todayWorkouts.flatMap(w=>w.exercises.map(e=>e.exerciseName)))].join(' · ')):''}</p><button class="primary training-card-action" id="start-workout">${openWorkout ? '继续力量训练' : '开始力量训练'}</button>`)}</section>
    <section class="training-category">${cardioCardHtml(cardioSessions)}</section>
    <section class="training-category">${trainingModuleHtml('凯格尔训练','leaf','pelvic-floor-history',`<p class="training-card-note">今日方案 · ${dailyPlanRoutine.name}</p><div class="training-card-summary">${trainingSummaryTiles('当前方案',dailyPlanRoutine.name,'当日完成',`${pelvicSessions.length} 次`)}</div><p class="training-card-detail">${pelvicSessions.length?`累计 ${pelvicSeconds} 秒`: `${pelvicRoutineMinutes(dailyPlanRoutine)} · 保持自然呼吸`}</p><button class="primary training-card-action" id="start-pelvic-floor">开始训练</button>`)}</section>`
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


function trainingSummaryTiles(labelA:string,valueA:string,labelB:string,valueB:string):string {
 return `<div class="training-summary-tiles"><div class="training-summary-tile"><span>${esc(labelA)}</span><strong>${esc(valueA)}</strong></div><div class="training-summary-tile"><span>${esc(labelB)}</span><strong>${esc(valueB)}</strong></div></div>`
}
function cardioCardHtml(cardioSessions:CardioSession[]):string {
 const cardioMinutes=cardioSessions.reduce((n,s)=>n+s.durationMinutes,0),latestCardio=[...cardioSessions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]
 return trainingModuleHtml('有氧训练','activity','cardio-history',`<p class="training-card-note">楼梯机 · 跑步机</p><div class="training-card-summary">${trainingSummaryTiles('当日记录',`${cardioSessions.length} 次`,'累计时长',`${formatNumber(cardioMinutes)} 分钟`)}</div><p class="training-card-detail">${latestCardio?esc([getCardioActivityLabel(latestCardio),...formatCardioMetrics(latestCardio)].join(' · ')):'今天还没有有氧训练'}</p><button class="primary training-card-action" id="add-cardio">新增有氧记录</button>${latestCardio?`<button class="training-card-link" data-cardio-id="${latestCardio.id}">最近：${getCardioActivityLabel(latestCardio)} · ${formatNumber(latestCardio.durationMinutes)} 分钟 ${icon('chevron',16)}</button>`:''}`)
}

async function refreshCardioCard():Promise<void>{
 const host=document.querySelector('#add-cardio')?.closest('.training-card');if(!host)return
 const date=workoutDate,rows=await getCardioSessionsByDate(date);if(!host.isConnected||workoutDate!==date)return
 const focused=host.contains(document.activeElement),template=document.createElement('div');template.innerHTML=cardioCardHtml(rows);const next=template.firstElementChild!;host.replaceWith(next)
 if(focused&&document.documentElement.dataset.inputModality==='keyboard')next.querySelector<HTMLElement>('#add-cardio')?.focus({preventScroll:true})
 next.querySelector('#add-cardio')!.addEventListener('click',()=>showCardioForm())
 next.querySelector('#cardio-history')!.addEventListener('click',()=>void showCardioHistory())
 next.querySelector('[data-cardio-id]')?.addEventListener('click',()=>{const row=rows.find(s=>s.id===(next.querySelector<HTMLElement>('[data-cardio-id]')!.dataset.cardioId));if(row)showCardioForm(row)})
}

function showCardioForm(session?: CardioSession,parent?:HTMLDialogElement,entryDate=workoutDate): void {
  const date = session?.date ?? entryDate
  const selectedType = session ? getCardioActivityType(session) : 'stair_climber'
  const title=session?'编辑有氧训练':'记录有氧训练'
  const html= `<form id="cardio-form" class="form cardio-form"><p class="cardio-form-date">${formatHeaderDate(date)}</p><div class="cardio-type-group" role="group" aria-label="训练类型"><span>训练类型</span><div class="cardio-type-options">${(Object.keys(cardioActivityDefinitions) as CardioActivityType[]).map((type) => `<button type="button" data-cardio-type="${type}" aria-pressed="${selectedType === type}">${cardioActivityDefinitions[type].label}</button>`).join('')}</div></div><input type="hidden" name="activityType" value="${selectedType}"><label>时间<span class="cardio-input-wrap"><input name="duration" type="number" inputmode="decimal" min="0.01" step="any" value="${session?.durationMinutes ?? ''}" placeholder="25" required><span class="cardio-input-suffix">分钟</span></span></label><label>速度<span class="cardio-input-wrap unitless"><input name="speed" type="number" inputmode="decimal" min="0.01" step="any" value="${session?.speed ?? ''}" placeholder="6.5"></span></label><label data-cardio-incline>坡度<span class="cardio-input-wrap unitless"><input name="inclinePercent" type="number" inputmode="decimal" min="0" step="any" value="${session?.inclinePercent ?? ''}" placeholder="8"></span></label>${trainingJournalHtml(session?.note, 'cardio-note')}<div class="cardio-form-actions"><button class="primary" type="submit">${session ? '保存修改' : '保存记录'}</button>${session ? '<button class="danger-button" type="button" id="delete-cardio">删除记录</button>' : ''}</div><p role="alert" data-cardio-error hidden></p></form>`
  const dialog=parent??openModal(title,html),back=parent?historySubview(parent,title,html):()=>dialog.close()
  const formElement = dialog.querySelector<HTMLFormElement>('#cardio-form')!
  const syncType = () => {
    const type = formElement.querySelector<HTMLInputElement>('[name="activityType"]')!.value
    const treadmill = type === 'treadmill'
    formElement.querySelector<HTMLInputElement>('[name="speed"]')!.required = !treadmill
    const inclineField = formElement.querySelector<HTMLElement>('[data-cardio-incline]')!
    inclineField.hidden = !treadmill
    inclineField.querySelector('input')!.disabled = !treadmill
    formElement.querySelectorAll<HTMLButtonElement>('[data-cardio-type]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.cardioType === type)))
  }
  formElement.querySelectorAll<HTMLButtonElement>('[data-cardio-type]').forEach((button) => button.addEventListener('click', () => {
    formElement.querySelector<HTMLInputElement>('[name="activityType"]')!.value = button.dataset.cardioType!
    syncType()
  }))
  syncType()
  bindJournalDisclosure(formElement)
  let saving=false
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();if(saving||!dialog.open||!formElement.isConnected)return;saving=true
    const submit=formElement.querySelector<HTMLButtonElement>('[type=submit]')!;submit.disabled=true;submit.setAttribute('aria-busy','true')
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const input = { date, activityType: valueOf(form, 'activityType') as CardioActivityType, durationMinutes: Number(valueOf(form, 'duration')), speed: optionalNumber(form, 'speed'), inclinePercent: optionalNumber(form, 'inclinePercent'), note: valueOf(form, 'note') }
    try {
      if (session) await updateCardioSession(session.id, input)
      else await saveCardioSession(input)
      back();toast('有氧训练记录已保存');if(activeTab==='today')void render().catch(fail);else void refreshCardioCard().catch(fail)
      if(!parent&&document.documentElement.dataset.inputModality==='keyboard')document.querySelector<HTMLElement>('#add-cardio')?.focus({preventScroll:true})
    }catch(error){const message=formElement.querySelector<HTMLElement>('[data-cardio-error]')!;message.hidden=false;message.textContent=error instanceof Error?error.message:'保存失败，请重试'}finally{saving=false;submit.disabled=false;submit.removeAttribute('aria-busy')}
  })
  dialog.querySelector('#delete-cardio')?.addEventListener('click', async () => {
    if (!session) return
    if(saving)return
    if (!await confirmAction('删除这条有氧训练记录？', '删除后无法恢复。', '删除')) return
    try { saving=true;await deleteCardioSession(session.id);back();toast('有氧训练记录已删除');void refreshCardioCard().catch(fail) } catch (error) { fail(error) } finally { saving=false }
  })
}

async function showCardioHistory(): Promise<void> {
  const dialog=openModal('有氧训练历史','<div data-cardio-history-root></div>'),host=dialog.querySelector<HTMLElement>('[data-cardio-history-root]')!
  let sessions:CardioSession[]=[]
  const sub=liveQuery(()=>db.cardioSessions.orderBy('date').reverse().toArray()).subscribe({next:rows=>{if(!dialog.open)return;sessions=rows;const body=dialog.querySelector<HTMLElement>('.modal-body')!,scroll=body.scrollTop;host.innerHTML=`<div class="cardio-history">${sessions.length ? sessions.map((session) => {
    const label = getCardioActivityLabel(session)
    const metrics = formatCardioMetrics(session).join(' · ')
    return `<button data-history-cardio="${session.id}" aria-label="编辑 ${formatShortDate(session.date)} ${label}，${formatNumber(session.durationMinutes)} 分钟${metrics ? `，${metrics}` : ''}"><span class="cardio-history-row"><span><strong>${formatShortDate(session.date)}</strong><small>${label}${session.note ? ' · 有日志' : ''}</small></span><span class="cardio-history-value"><strong>${formatNumber(session.durationMinutes)} <small>分钟</small></strong><small>${metrics}</small></span></span></button>`
  }).join('') : '<div class="cardio-history-empty"><strong>还没有有氧训练记录</strong><p>记录楼梯机或跑步机的训练</p><button class="primary" id="history-add-cardio">记录训练</button></div>'}</div>`;body.scrollTop=scroll},error:fail})
  host.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-history-cardio],#history-add-cardio');if(!button)return;const session=sessions.find(s=>s.id===button.dataset.historyCardio);showCardioForm(session,dialog)})
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
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
    if (!pelvicTimerState || pelvicSessionSaving || trainingCompletion) return
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

function returnFromTrainingCompletion(): void {
  trainingCompletion=undefined;pelvicTimerState=undefined;pelvicTimerElements=undefined
  currentWorkout=undefined;workoutEditorOpen=false;showWorkoutHistory=false
  document.body.classList.remove('immersive');void render().catch(fail)
}
async function completePelvicFloorTimer(completionType: 'completed' | 'manual' = 'completed'): Promise<void> {
  const state=pelvicTimerState
  if(!state||state.status!=='completed'||pelvicSessionSaving||trainingCompletion)return
  pelvicSessionSaving=true;stopPelvicTimerVisuals();pelvicTimerInterval=undefined;pelvicTimerElements=undefined
  void releasePelvicWakeLock();void pelvicAudioContext?.suspend().catch(()=>undefined)
  const session=sessionFromPelvicFloorTimer(state,pelvicTimerDate,completionType)
  let previousProgress:PelvicFloorPlanProgress|undefined
  trainingCompletion=createTrainingCompletion({kind:'kegel',title:'凯格尔训练',manual:session.completionType==='manual',result:session,esc,
    save:async result=>{if(!previousProgress)previousProgress=getPelvicFloorPlanProgress(await db.pelvicFloorSessions.toArray());return savePelvicFloorSession(result)},
    summary:result=>[['训练方案',result.routine?.name??'基础训练'],['实际完成次数',`${result.completedRepetitions} / ${result.repetitions} 次`],['实际训练时长',`${pelvicFloorSessionDurationSeconds(result)} 秒`],['训练日期',result.date]],
    afterSaved:async result=>{if(result.completionType!=='completed'||pelvicFloorPlanLevelFromId(result.routine?.id)===undefined)return;localStorage.removeItem(PELVIC_PLAN_LEVEL_KEY);const progress=getPelvicFloorPlanProgress(await db.pelvicFloorSessions.toArray());const unlocked=progress.unlockedLevels.find(level=>!previousProgress!.unlockedLevels.includes(level));return unlocked?`下一阶段已解锁 · ${pelvicPlanRoutine(unlocked).name}。下次训练可自行选择阶段。`:undefined},
    returned:returnFromTrainingCompletion})
  await trainingCompletion.save();pelvicSessionSaving=false
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
  view.innerHTML = `<header class="active-workout-head"><button class="icon-btn quiet" id="exit-workout" aria-label="返回训练首页">${icon('x')}</button><strong>${completed ? '训练详情' : '力量训练'}</strong>${completed ? '<span class="head-spacer"></span>' : '<button class="finish-text" id="finish-workout">完成</button>'}</header><section class="workout-meta"><span>${formatHeaderDate(workout.date)}</span><span id="autosave-state">${completed ? '可编辑' : '已自动保存'}</span></section><div id="workout-exercises">${workout.exercises.length ? workout.exercises.map(workoutExerciseHtml).join('') : `<div class="empty compact minimal"><div class="empty-icon">${icon('dumbbell', 24)}</div><h3>还没有动作</h3><p>添加第一个动作开始记录。</p>${addExercise}</div>`}</div>${workout.exercises.length ? addExercise : ''}${trainingJournalHtml(workout.note, 'workout-note')}<div class="action-stack workout-actions">${completed ? '<button id="save-workout-template" class="secondary">保存为模板</button><button id="back-history" class="quiet-action">返回历史</button><button id="delete-workout" class="danger-button">删除训练</button>' : '<button id="history-workout">查看历史训练</button>'}</div>`
  bindWorkoutEditor(workout)
}

function bindJournalDisclosure(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-journal]').forEach(section => {
    const editor = section.querySelector<HTMLElement>('.journal-editor')!
    const button = section.querySelector<HTMLButtonElement>('[data-add-journal], [data-edit-journal]')!
    const caption = button.textContent!
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', editor.querySelector('textarea')!.id)
    button.addEventListener('click', () => {
      editor.hidden = !editor.hidden
      button.setAttribute('aria-expanded', String(!editor.hidden)); button.textContent = editor.hidden ? caption : '收起日志'
      if (!editor.hidden) { animateMotion(editor, 'disclosure'); editor.querySelector('textarea')?.focus() }
    })
  })
}

function trainingJournalHtml(note: string | undefined, id: string): string {
  return note
    ? `<section class="training-journal" data-journal><div class="journal-summary"><strong>训练日志</strong><button type="button" class="text-btn" data-edit-journal>编辑</button></div><p class="journal-copy">${esc(note)}</p><label class="note-field journal-editor" hidden>训练日志<textarea id="${id}" rows="3" maxlength="2000" placeholder="记录身体感受、动作质量或主观状态">${esc(note)}</textarea></label></section>`
    : `<section class="training-journal" data-journal><button type="button" class="quiet-action" data-add-journal>＋ 添加训练日志</button><label class="note-field journal-editor" hidden>训练日志<textarea id="${id}" rows="3" maxlength="2000" placeholder="记录身体感受、动作质量或主观状态"></textarea></label></section>`
}

function workoutExerciseHtml(exercise: WorkoutExercise): string {
  return `<article class="exercise-card" data-workout-exercise="${exercise.id}"><div class="exercise-head"><h3>${esc(exercise.exerciseName)}</h3><button class="icon-btn quiet danger" data-remove-exercise="${exercise.id}" aria-label="移除 ${esc(exercise.exerciseName)}">${icon('trash', 18)}</button></div><div class="sets"><div class="set-header"><span>组</span><span>重量 <small>kg</small></span><span>次数</span><span></span></div>${exercise.sets.map((set, index) => `<div class="set-row" data-set="${set.id}"><span>${index + 1}</span><input aria-label="第${index + 1}组重量" data-field="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg === undefined ? '' : formatNumber(set.weightKg)}" placeholder="—"><input aria-label="第${index + 1}组次数" data-field="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}" placeholder="—"><button aria-label="删除第${index + 1}组" class="icon-btn quiet danger" data-remove-set="${set.id}">${icon('x', 18)}</button><input class="set-note" aria-label="第${index + 1}组备注" data-field="note" placeholder="本组备注（可选）" value="${esc(set.note)}"></div>`).join('')}</div><button class="text-btn add-set" data-add-set="${exercise.id}">${icon('plus', 18)} 添加一组</button></article>`
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
  bindJournalDisclosure(view)
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
  let finishing=false
  view.querySelector('#finish-workout')?.addEventListener('click', async () => {
    if(finishing||trainingCompletion)return;finishing=true
    try {
      const normalized=normalizeWorkoutForSave(workout)
      if(!normalized.exercises.length)throw new Error('请至少添加一个动作')
      if(!await confirmAction('完成本次训练？','完成后仍可查看和编辑本次记录。','完成训练',false))return
      const captured=structuredClone(workout)
      trainingCompletion=createTrainingCompletion({kind:'strength',title:'力量训练',result:captured,esc,
        save:async result=>{await flushWorkoutAutosave(result);const saved=await finishWorkout(result);workoutAutosave.cancel();currentWorkout=undefined;workoutEditorOpen=false;return saved},
        summary:result=>[['实际动作',`${result.exercises.length} 个动作`],['实际组数',`${result.exercises.reduce((n,e)=>n+e.sets.length,0)} 组`],['训练日期',result.date],...(result.note?[['训练日志',result.note] as [string,string]]:[])],
        returned:returnFromTrainingCompletion,
        view:result=>{const dialog=openModal('本次力量训练',`<div class="completion-record"><p>${formatHeaderDate(result.date)}</p>${result.exercises.map(e=>`<section><h3>${esc(e.exerciseName)}</h3>${e.sets.map((set,i)=>`<p>第${i+1}组 · ${workoutSetSummary(set)}${set.note?` · ${esc(set.note)}`:''}</p>`).join('')}</section>`).join('')}${result.note?`<p class="journal-copy">${esc(result.note)}</p>`:''}<button class="secondary full-btn" data-completion-record-back>返回完成页</button></div>`);dialog.querySelector('[data-completion-record-back]')!.addEventListener('click',()=>dialog.close())}})
      await trainingCompletion.save()
    }catch(error){fail(error)}finally{finishing=false}
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
  const dialog = openModal('添加动作', `<div class="form"><label class="search-field"><span class="sr-only">搜索动作</span>${icon('search', 20)}<input id="exercise-search" type="search" placeholder="搜索动作"></label><div id="exercise-results" class="picker-list"></div><button class="sheet-link" id="quick-exercise">${icon('plus', 18)} 创建新动作</button></div>`, true)
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

async function showExerciseLibrary(surface?: ManagedSurfaceContext, refreshGuard?:()=>boolean): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  if (surface && (!surface.alive || (refreshGuard && !refreshGuard()))) return
  const dialog = mountManagementModal(surface, '动作库', `<div class="manager-surface">${managerToolbarHtml(managerSearchHtml('exercise-library-search', '搜索动作库', '搜索动作'), 'new-exercise', '动作', !exercises.length)}<div class="library-list manager-results"></div></div>`, exercises.length > 0)
  const list = dialog.querySelector<HTMLElement>('.library-list')!
  const edit = (exercise?: Exercise) => { leaveStandalone(dialog, surface); void showExerciseForm(exercise, undefined, surface) }
  const draw = (query: string) => {
    const normalized = query.trim().toLocaleLowerCase(), filtered = exercises.filter(exercise => `${exercise.name} ${exercise.notes ?? ''}`.toLocaleLowerCase().includes(normalized))
    list.innerHTML = filtered.length ? managerListHtml(filtered.map(exercise => managerRowHtml(esc(exercise.name), esc(exercise.notes || '力量训练动作'), `data-edit-exercise="${esc(exercise.id)}"`)).join('')) : normalized ? managerNoResultsHtml('动作') : managerEmptyHtml('动作', '新建常用动作，方便记录力量训练。', 'empty-new-exercise')
    list.querySelector('#empty-new-exercise')?.addEventListener('click', () => edit())
    list.querySelectorAll<HTMLButtonElement>('[data-edit-exercise]').forEach(button => button.addEventListener('click', () => edit(exercises.find(exercise => exercise.id === button.dataset.editExercise))))
  }
  const search = dialog.querySelector<HTMLInputElement>('#exercise-library-search')!
  draw(search.value); search.addEventListener('input', () => draw(search.value))
  dialog.querySelector('#new-exercise')!.addEventListener('click', () => edit())
  observeManagerCatalog(surface,dialog.querySelector('.manager-surface')!,['exercises'],guard=>showExerciseLibrary(surface,guard))
  surface?.restoreScroll()
}

async function showExerciseForm(exercise?: Exercise, afterSave?: (value: Exercise) => void | Promise<void>, surface?: ManagedSurfaceContext): Promise<void> {
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, exercise ? '编辑动作' : '新建动作', `<form id="exercise-form" class="form manager-editor"><label>动作名称 *<input name="name" value="${esc(exercise?.name)}" placeholder="杠铃卧推" required></label><label>备注<textarea name="notes" rows="3" placeholder="可选">${esc(exercise?.notes)}</textarea></label><button class="primary" type="submit">保存动作</button>${exercise ? '<div class="manager-danger-zone"><button class="text-btn danger" id="delete-exercise" type="button">删除动作</button></div>' : ''}</form>`)
  dialog.querySelector<HTMLFormElement>('#exercise-form')!.addEventListener('submit', async event => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); try { const saved = await saveExercise(valueOf(data, 'name'), valueOf(data, 'notes'), exercise?.id); leaveStandalone(dialog, surface); toast('已保存'); if (afterSave) await afterSave(saved); else void showExerciseLibrary(surface) } catch (error) { fail(error) } })
  dialog.querySelector('#delete-exercise')?.addEventListener('click', async () => { if (!exercise || !await confirmAction('删除这个动作？', '历史训练会保留，此操作不会改变过去的训练记录。')) return; try { await db.exercises.delete(exercise.id); leaveStandalone(dialog, surface); toast('已删除'); await showExerciseLibrary(surface) } catch (error) { fail(error) } })
}

async function renderWorkoutHistory(): Promise<void> {
  const view = document.querySelector<HTMLElement>('#view')!
  const viewVersion = view.dataset.renderVersion
  document.body.classList.remove('immersive')
  const workouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  if (!view.isConnected || view.dataset.renderVersion !== viewVersion) return
  const completedFeedback = ''
  view.innerHTML = `${completedFeedback}<div class="section-head history-head"><div><h2>历史训练</h2><span>${workouts.length} 次训练</span></div><button class="text-btn" id="close-history">返回</button></div><div class="history-list">${workouts.length ? workouts.map((workout) => `<button class="history-card" data-workout="${workout.id}"><div class="history-card-title"><strong>${formatShortDate(workout.date)}</strong><span>${workout.exercises.length} 个动作 · ${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组${workout.note ? ' · 有日志' : ''}</span></div><div class="history-details">${workout.exercises.map((item) => `<div><strong>${esc(item.exerciseName)}</strong><small>${item.sets.map(workoutSetSummary).join(' · ') || '暂无组数'}</small></div>`).join('')}</div>${icon('chevron', 18)}</button>`).join('') : `<div class="empty minimal"><div class="empty-icon">${icon('activity', 24)}</div><h3>还没有训练历史</h3><p>完成力量训练后，在这里回顾记录。</p></div>`}</div>`
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

async function showWorkoutTemplateManager(query = '', surface?: ManagedSurfaceContext, refreshGuard?:()=>boolean): Promise<void> {
  const templates = sortTemplates(await db.workoutTemplates.toArray())
  const exerciseIds = [...new Set(templates.flatMap((template) => template.exercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))))]
  const existingIds = new Set((await db.exercises.bulkGet(exerciseIds)).filter((item): item is Exercise => Boolean(item)).map((item) => item.id))
  if (surface && (!surface.alive || (refreshGuard && !refreshGuard()))) return
  const dialog = mountManagementModal(surface, '训练模板', `<div class="manager-surface">${managerToolbarHtml(managerSearchHtml('workout-template-search', '搜索训练模板', '搜索模板', esc(query)), 'new-workout-template', '训练模板', !templates.length)}<div class="template-manager-list manager-results"></div></div>`, templates.length > 0)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase()
    const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? managerListHtml(filtered.map((template) => {
      const missing = template.exercises.filter((item) => item.exerciseId && !existingIds.has(item.exerciseId)).length
      return managerRowHtml(esc(template.name), `${template.exercises.length} 个动作 · ${template.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组${missing ? `<br><span class="warning-text">${missing} 个动作已从动作库删除，仍可使用快照</span>` : ''}`, `data-edit-workout-template="${esc(template.id)}"`)
    }).join('')) : normalized ? managerNoResultsHtml('训练模板') : managerEmptyHtml('训练模板', '新建常用训练组合，方便以后使用。', 'empty-new-workout-template')
    bindWorkoutTemplateManagerActions(dialog, templates, surface)
  }
  draw(dialog.querySelector<HTMLInputElement>('#workout-template-search')!.value)
  dialog.querySelector<HTMLInputElement>('#workout-template-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector<HTMLButtonElement>('#new-workout-template')!.hidden = !templates.length
  dialog.querySelector('.template-manager-list')!.addEventListener('click', event => { if ((event.target as Element).closest('#empty-new-workout-template')) void showWorkoutTemplateEditor(undefined, surface) })
  dialog.querySelector('#new-workout-template')?.addEventListener('click', () => { leaveStandalone(dialog, surface); void showWorkoutTemplateEditor(undefined, surface) })
  observeManagerCatalog(surface,dialog.querySelector('.manager-surface')!,['workoutTemplates','exercises'],guard=>showWorkoutTemplateManager(dialog.querySelector<HTMLInputElement>('#workout-template-search')?.value??'',surface,guard))
  surface?.restoreScroll()
}

function bindWorkoutTemplateManagerActions(dialog: HTMLDialogElement, templates: WorkoutTemplate[], surface?: ManagedSurfaceContext): void {
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-workout-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.editWorkoutTemplate)
    if (template) { leaveStandalone(dialog, surface); void showWorkoutTemplateEditor(template, surface) }
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-start-workout-template]').forEach((button) => button.addEventListener('click', () => {
    const template = templates.find((item) => item.id === button.dataset.startWorkoutTemplate)
    if (template) void launchWorkoutTemplate(template, dialog)
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-duplicate-workout-template]').forEach((button) => button.addEventListener('click', async () => {
    const template = templates.find((item) => item.id === button.dataset.duplicateWorkoutTemplate)
    if (!template) return
    try { await db.workoutTemplates.add(duplicateWorkoutTemplate(template)); leaveStandalone(dialog, surface); toast('模板已复制'); await showWorkoutTemplateManager('', surface) } catch (error) { fail(error) }
  }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-workout-template]').forEach((button) => button.addEventListener('click', async () => {
    if (!await confirmAction('删除训练模板？', '只删除模板，历史训练不会受影响。')) return
    try { await db.workoutTemplates.delete(button.dataset.deleteWorkoutTemplate!); leaveStandalone(dialog, surface); toast('模板已删除，历史训练未受影响'); await showWorkoutTemplateManager('', surface) } catch (error) { fail(error) }
  }))
}

async function showWorkoutTemplateEditor(source?: WorkoutTemplate, surface?: ManagedSurfaceContext): Promise<void> {
  const editing = source ? Boolean(await db.workoutTemplates.get(source.id)) : false
  const draft = source ? structuredClone(source) : { id: crypto.randomUUID(), name: '', exercises: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const exerciseIds = draft.exercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))
  const existingIds = new Set((await db.exercises.bulkGet(exerciseIds)).filter((item): item is Exercise => Boolean(item)).map((item) => item.id))
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, editing ? '编辑训练模板' : '新建训练模板', '<div id="workout-template-editor"></div>', true)
  const draw = () => {
    dialog.querySelector('#workout-template-editor')!.innerHTML = `<form id="workout-template-form" class="form template-editor manager-editor"><label>模板名称 *<input name="name" value="${esc(draft.name)}" placeholder="推举训练" required></label><label>说明<textarea name="description" rows="2" placeholder="可选">${esc(draft.description)}</textarea></label><div class="template-editor-items">${draft.exercises.map((exercise, index) => workoutTemplateExerciseEditorHtml(exercise, index, draft.exercises.length, Boolean(exercise.exerciseId && !existingIds.has(exercise.exerciseId)))).join('') || '<p class="muted padded">还没有动作</p>'}</div><button type="button" class="secondary" id="add-template-exercise">${icon('plus', 18)} 添加动作</button><button class="primary" type="submit">保存训练模板</button></form>`
    bindNumericPresentation(dialog)
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
    form.querySelector('#add-template-exercise')?.addEventListener('click', () => { syncText(); leaveStandalone(dialog, surface); void showWorkoutTemplateExercisePicker(draft, surface) })
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); syncText()
      try { await saveWorkoutTemplate(draft); leaveStandalone(dialog, surface); toast('训练模板已保存'); await showWorkoutTemplateManager('', surface) } catch (error) { fail(error) }
    })
  }
  draw()
  if (editing && source) {
    const actions = document.createElement('div'); actions.className = 'manager-editor-actions'
    actions.innerHTML = `<button class="text-btn" data-start-workout-template="${source.id}">开始训练</button><button class="text-btn" data-duplicate-workout-template="${source.id}">复制为新模板</button><div class="manager-danger-zone"><button class="text-btn danger" data-delete-workout-template="${source.id}">删除训练模板</button></div>`
    dialog.querySelector('.modal-body')!.append(actions); bindWorkoutTemplateManagerActions(dialog, [source], surface)
  }
}

function workoutTemplateExerciseEditorHtml(exercise: WorkoutTemplateExercise, index: number, count: number, missing: boolean): string {
  return `<article class="exercise-card template-exercise" data-template-exercise="${exercise.id}"><div class="exercise-head"><div><h3>${esc(exercise.exerciseName)}</h3>${missing ? '<small class="warning-text">动作已删除，将使用名称快照</small>' : ''}</div><div class="reorder-actions"><button type="button" data-template-move="${exercise.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="上移">↑</button><button type="button" data-template-move="${exercise.id}" data-direction="1" ${index === count - 1 ? 'disabled' : ''} aria-label="下移">↓</button><button type="button" class="icon-btn quiet danger" data-template-remove-exercise="${exercise.id}" aria-label="删除动作">${icon('trash', 18)}</button></div></div><div class="sets"><div class="set-header"><span>组</span><span>重量 <small>kg</small></span><span>次数</span><span></span></div>${exercise.sets.map((set, setIndex) => `<div class="set-row" data-template-set-row="${set.id}"><span>${setIndex + 1}</span><input data-template-set="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg === undefined ? '' : formatNumber(set.weightKg)}" placeholder="—"><input data-template-set="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}" placeholder="—"><button type="button" class="icon-btn quiet danger" data-template-remove-set="${set.id}" aria-label="删除第${setIndex + 1}组">${icon('x', 18)}</button><input class="set-note" data-template-set="note" value="${esc(set.note)}" placeholder="本组备注（可选）"></div>`).join('')}</div><button type="button" class="text-btn add-set" data-template-add-set="${exercise.id}">${icon('plus', 18)} 添加一组</button><label class="compact-label">动作备注<textarea data-template-exercise-note="${exercise.id}" rows="2" placeholder="可选">${esc(exercise.note)}</textarea></label></article>`
}

async function showWorkoutTemplateExercisePicker(draft: WorkoutTemplate, surface?: ManagedSurfaceContext): Promise<void> {
  const exercises = await db.exercises.orderBy('name').toArray()
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '添加模板动作', `<label class="search-field">${icon('search', 20)}<input id="template-exercise-search" type="search" placeholder="搜索动作"></label><div id="template-exercise-results" class="picker-list"></div>`, true)
  const draw = (query = '') => {
    const matches = exercises.filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    dialog.querySelector('#template-exercise-results')!.innerHTML = matches.map((exercise) => `<button class="picker-item" data-pick-template-exercise="${exercise.id}"><strong>${esc(exercise.name)}</strong></button>`).join('') || '<p class="muted">没有匹配动作</p>'
    dialog.querySelectorAll<HTMLButtonElement>('[data-pick-template-exercise]').forEach((button) => button.addEventListener('click', () => {
      const exercise = exercises.find((item) => item.id === button.dataset.pickTemplateExercise)!
      draft.exercises.push({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [{ id: crypto.randomUUID(), reps: 10 }] })
      leaveStandalone(dialog, surface); void showWorkoutTemplateEditor(draft, surface)
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
  const goal = template.nutritionGoal?.calories === undefined ? '' : ` · 目标 ${formatEnergyInputValue(template.nutritionGoal.calories)} kcal`
  return `<article class="template-card"><div><h3>${esc(template.name)}</h3><p>${names || '暂无食物'}</p><small>${template.items.length} 项 · ${formatEnergyInputValue(calories)} kcal${goal}</small></div><button class="primary compact-button" data-apply-diet-template="${template.id}">添加</button></article>`
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

async function showDietTemplateManager(query = '', surface?: ManagedSurfaceContext, refreshGuard?:()=>boolean): Promise<void> {
  const templates = sortTemplates(await db.dietTemplates.toArray())
  const summaries = new Map<string, string>()
  await Promise.all(templates.map(async (template) => {
    const resolved = await resolveDietTemplateFoods(template)
    const kcal = resolved.reduce((sum, value) => sum + calculateNutrition(value.food, value.item.grams).calories, 0)
    const missing = resolved.filter((item) => item.missing).length
    const goal = template.nutritionGoal?.calories === undefined ? '' : ` · 目标 ${formatEnergyInputValue(template.nutritionGoal.calories)} kcal`
    summaries.set(template.id, `${template.items.length} 项 · ${formatEnergyInputValue(kcal)} kcal${goal}${missing ? ` · ${missing} 项使用快照` : ''}`)
  }))
  if (surface && (!surface.alive || (refreshGuard && !refreshGuard()))) return
  const dialog = mountManagementModal(surface, '饮食模板', `<div class="manager-surface">${managerToolbarHtml(managerSearchHtml('diet-template-search', '搜索饮食模板', '搜索模板', esc(query)), 'new-diet-template', '饮食模板', !templates.length)}<div class="template-manager-list manager-results"></div></div>`, templates.length > 0)
  const draw = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase(); const filtered = templates.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('.template-manager-list')!.innerHTML = filtered.length ? managerListHtml(filtered.map(template => managerRowHtml(esc(template.name), esc(summaries.get(template.id)), `data-edit-diet-template="${esc(template.id)}"`)).join('')) : normalized ? managerNoResultsHtml('饮食模板') : managerEmptyHtml('饮食模板', '新建常用饮食组合，方便以后使用。', 'empty-new-diet-template')
    bindDietTemplateManagerActions(dialog, templates, surface)
  }
  draw(dialog.querySelector<HTMLInputElement>('#diet-template-search')!.value); dialog.querySelector<HTMLInputElement>('#diet-template-search')?.addEventListener('input', (event) => draw((event.target as HTMLInputElement).value))
  dialog.querySelector<HTMLButtonElement>('#new-diet-template')!.hidden = !templates.length
  dialog.querySelector('.template-manager-list')!.addEventListener('click', event => { if ((event.target as Element).closest('#empty-new-diet-template')) void showDietTemplateEditor(undefined, surface) })
  dialog.querySelector('#new-diet-template')?.addEventListener('click', () => { leaveStandalone(dialog, surface); void showDietTemplateEditor(undefined, surface) })
  observeManagerCatalog(surface,dialog.querySelector('.manager-surface')!,['dietTemplates','foods'],guard=>showDietTemplateManager(dialog.querySelector<HTMLInputElement>('#diet-template-search')?.value??'',surface,guard))
  surface?.restoreScroll()
}

function bindDietTemplateManagerActions(dialog: HTMLDialogElement, templates: DietTemplate[], surface?: ManagedSurfaceContext): void {
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-diet-template]').forEach((button) => button.addEventListener('click', () => { const template = templates.find((item) => item.id === button.dataset.editDietTemplate); if (template) { leaveStandalone(dialog, surface); void showDietTemplateEditor(template, surface) } }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-apply-diet-template]').forEach((button) => button.addEventListener('click', () => { const template = templates.find((item) => item.id === button.dataset.applyDietTemplate); if (template) void applySelectedDietTemplate(template, dialog) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-duplicate-diet-template]').forEach((button) => button.addEventListener('click', async () => { const template = templates.find((item) => item.id === button.dataset.duplicateDietTemplate); if (!template) return; try { await db.dietTemplates.add(duplicateDietTemplate(template)); leaveStandalone(dialog, surface); toast('模板已复制'); await showDietTemplateManager('', surface) } catch (error) { fail(error) } }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-diet-template]').forEach((button) => button.addEventListener('click', async () => { if (!await confirmAction('删除饮食模板？', '只删除模板，历史饮食记录不会受影响。')) return; try { await db.dietTemplates.delete(button.dataset.deleteDietTemplate!); leaveStandalone(dialog, surface); toast('模板已删除，历史记录未受影响'); await showDietTemplateManager('', surface) } catch (error) { fail(error) } }))
}

async function showDietTemplateEditor(source?: DietTemplate, surface?: ManagedSurfaceContext): Promise<void> {
  const editing = source ? Boolean(await db.dietTemplates.get(source.id)) : false
  const draft: DietTemplate = source ? structuredClone(source) : { id: crypto.randomUUID(), name: '', items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const resolved = await resolveDietTemplateFoods(draft)
  const missingIds = new Set(resolved.filter((item) => item.missing).map((item) => item.item.id))
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, editing ? '编辑饮食模板' : '新建饮食模板', '<div id="diet-template-editor"></div>', true)
  const syncText = () => {
    const form = dialog.querySelector<HTMLFormElement>('#diet-template-form'); if (!form) return
    const data = new FormData(form); draft.name = valueOf(data, 'name'); draft.description = valueOf(data, 'description').trim() || undefined; draft.nutritionGoal = nutritionGoalFromForm(data)
  }
  const draw = () => {
    dialog.querySelector('#diet-template-editor')!.innerHTML = `<form id="diet-template-form" class="form template-editor manager-editor"><label>模板名称 *<input name="name" value="${esc(draft.name)}" placeholder="训练日早餐" required></label><label>说明<textarea name="description" rows="2" placeholder="可选">${esc(draft.description)}</textarea></label>${nutritionGoalFields(draft.nutritionGoal)}<div class="template-editor-items">${draft.items.map((item, index) => `<article class="diet-template-item" data-diet-template-item="${item.id}"><div><strong>${esc(item.foodName)}</strong>${item.brand ? `<small>${esc(item.brand)}</small>` : ''}${missingIds.has(item.id) ? '<small class="warning-text">食物已删除，将使用营养快照</small>' : ''}</div><label><input data-diet-grams type="number" inputmode="decimal" min="0.1" step="0.1" value="${item.grams}"><span>g</span></label><div class="reorder-actions"><button type="button" data-diet-move="${item.id}" aria-label="上移食物" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-diet-move="${item.id}" aria-label="下移食物" data-direction="1" ${index === draft.items.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="icon-btn quiet danger" data-remove-diet-item="${item.id}" aria-label="移除食物">${icon('trash', 18)}</button></div></article>`).join('') || '<p class="muted padded">还没有食物</p>'}</div><button type="button" class="secondary" id="add-diet-template-food">${icon('plus', 18)} 添加食物</button><button class="primary" type="submit">保存饮食模板</button></form>`
    bind()
  }
  const bind = () => {
    bindNumericPresentation(dialog)
    const form = dialog.querySelector<HTMLFormElement>('#diet-template-form')!
    form.querySelectorAll<HTMLInputElement>('[data-diet-grams]').forEach((input) => input.addEventListener('input', () => { const item = draft.items.find((value) => value.id === input.closest<HTMLElement>('[data-diet-template-item]')?.dataset.dietTemplateItem); if (item) item.grams = Number(input.value) }))
    form.querySelectorAll<HTMLButtonElement>('[data-remove-diet-item]').forEach((button) => button.addEventListener('click', () => { syncText(); draft.items = draft.items.filter((item) => item.id !== button.dataset.removeDietItem); draw() }))
    form.querySelectorAll<HTMLButtonElement>('[data-diet-move]').forEach((button) => button.addEventListener('click', () => { syncText(); const index = draft.items.findIndex((item) => item.id === button.dataset.dietMove); const next = index + Number(button.dataset.direction); if (index < 0 || next < 0 || next >= draft.items.length) return; const [moved] = draft.items.splice(index, 1); draft.items.splice(next, 0, moved!); draw() }))
    form.querySelector('#add-diet-template-food')?.addEventListener('click', () => { syncText(); leaveStandalone(dialog, surface); void showDietTemplateFoodPicker(draft, surface) })
    form.addEventListener('submit', async (event) => { event.preventDefault(); syncText(); try { await saveDietTemplate(draft); leaveStandalone(dialog, surface); toast('饮食模板已保存'); await showDietTemplateManager('', surface) } catch (error) { fail(error) } })
  }
  draw()
  if (editing && source) {
    const actions = document.createElement('div'); actions.className = 'manager-editor-actions'
    actions.innerHTML = `<button class="text-btn" data-apply-diet-template="${source.id}">添加到饮食</button><button class="text-btn" data-duplicate-diet-template="${source.id}">复制为新模板</button><div class="manager-danger-zone"><button class="text-btn danger" data-delete-diet-template="${source.id}">删除饮食模板</button></div>`
    dialog.querySelector('.modal-body')!.append(actions); bindDietTemplateManagerActions(dialog, [source], surface)
  }
}

async function showDietTemplateFoodPicker(draft: DietTemplate, surface?: ManagedSurfaceContext): Promise<void> {
  const foods = await db.foods.orderBy('name').toArray()
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '添加模板食物', `<label class="search-field">${icon('search', 20)}<input id="diet-template-food-search" type="search" placeholder="搜索食物或品牌"></label><div id="diet-template-food-results" class="picker-list"></div>`, true)
  const draw = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase(); const matches = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized))
    dialog.querySelector('#diet-template-food-results')!.innerHTML = matches.map((food) => `<button class="picker-item" data-pick-diet-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}</span><em>${formatEnergyInputValue(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</em></button>`).join('') || '<p class="muted">食物库中没有匹配项</p>'
    dialog.querySelectorAll<HTMLButtonElement>('[data-pick-diet-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.pickDietFood)!; draft.items.push(dietTemplateItemFromFood(food, 100)); leaveStandalone(dialog, surface); void showDietTemplateEditor(draft, surface) }))
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
  const view=document.querySelector<HTMLElement>('#view')!
  const retainedTabs=setTabbedViewHtml(view,`${withProgressTabs?progressTabsHtml():''}<div data-weight-module></div>${withProgressTabs?recoverySlotHtml():''}`)
  recordsDispose?.();recordsDispose=mountWeightTrend(view.querySelector('[data-weight-module]')!,recoveryUi(),{state:trendStates.weight,record:showWeightForm})
  recoveryDispose?.();recoveryDispose=undefined
  if(withProgressTabs){recoveryDispose=mountRecovery(view.querySelector('[data-recovery-root]')!,recoveryUi(),true);if(!retainedTabs)bindProgressTabs(view)}
}

function showWeightForm(date: string, value?: number): void {
  const title = value === undefined ? date === getLocalDateString() ? '今日体重' : '记录体重' : '编辑体重'
  const dialog = openModal(title, `<form id="weight-sheet-form" class="form weight-sheet-form"><p>${formatHeaderDate(date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${value ?? ''}" placeholder="72.4" required><b>kg</b></label><button class="primary" type="submit">保存</button></form>`)
  const form=dialog.querySelector<HTMLFormElement>('#weight-sheet-form')!,error=document.createElement('p');error.setAttribute('role','alert');error.hidden=true;error.dataset.weightError='';form.querySelector('[type=submit]')!.before(error);let busy=false
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;const button=form.querySelector<HTMLButtonElement>('[type=submit]')!;button.disabled=true;button.setAttribute('aria-busy','true');try{const saved=await upsertWeight(date,valueOf(new FormData(form),'weight'));selectRecordedTrend('weight',saved.id);dialog.close();toast('已保存');if(activeTab!=='progress'||progressView!=='trend')await render()}catch(e){error.hidden=false;error.textContent=e instanceof Error?e.message:'保存失败，请重试'}finally{busy=false;button.disabled=false;button.removeAttribute('aria-busy')}})

}

async function showSettings(surface?: ManagedSurfaceContext): Promise<void> {
  let persistText = '浏览器不支持'
  try { if (navigator.storage?.persist) persistText = await navigator.storage.persist() ? '已授权' : '未授权' } catch { persistText = '未授权' }
  const lastBackup = formatBackupTime(localStorage.getItem(LAST_BACKUP_KEY))
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '备份与恢复', `<section class="settings-section"><h3>数据</h3><div class="settings-group"><button id="export-backup"><span class="setting-icon">${icon('download', 18)}</span><span><strong>导出完整备份</strong><small>上次导出：<b id="last-backup">${esc(lastBackup)}</b></small></span>${icon('chevron', 18)}</button><button id="restore-backup"><span class="setting-icon">${icon('upload', 18)}</span><span><strong>恢复完整备份</strong><small>从备份文件覆盖当前数据</small></span>${icon('chevron', 18)}</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div></section><section class="settings-section"><h3>存储</h3><div class="data-safety"><div class="setting-icon">${icon('archive', 18)}</div><div><strong>数据保存在当前设备。清除 Safari 网站数据或更换设备前，请先导出备份。</strong><p>本地数据库 · 持久化存储：${persistText}</p></div></div></section>`)
  dialog.querySelector('#export-backup')?.addEventListener('click', async () => { try { const backup = await exportBackup(); const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fitlog-backup-${getLocalDateString()}.json`; link.click(); URL.revokeObjectURL(link.href); const exportedAt = new Date().toISOString(); localStorage.setItem(LAST_BACKUP_KEY, exportedAt); const label = dialog.querySelector('#last-backup'); if (label) label.textContent = formatBackupTime(exportedAt); toast('备份已导出') } catch (error) { fail(error) } })
  const fileInput = dialog.querySelector<HTMLInputElement>('#backup-file')!
  dialog.querySelector('#restore-backup')?.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; try { const backup = validateBackup(JSON.parse(await file.text())); if (!fileInput.isConnected || !dialog.open) return; leaveStandalone(dialog, surface); showRestorePreview(backup, surface) } catch (error) { fail(error) } })
}

function showRestorePreview(backup: ValidatedBackup, surface?: ManagedSurfaceContext): void {
  const counts = [{ label: '睡眠', count: backup.data.sleepSessions.length }, { label: '饮水', count: backup.data.waterLogs.length }, { label: '特殊饮食', count: backup.data.dietEvents.length }, { label: '食物', count: backup.data.foods.length }, { label: '饮食记录', count: backup.data.foodLogs.length }, { label: '动作', count: backup.data.exercises.length }, { label: '力量训练', count: backup.data.workouts.length }, { label: '体重', count: backup.data.weights.length }, { label: '训练模板', count: backup.data.workoutTemplates.length }, { label: '饮食模板', count: backup.data.dietTemplates.length }, { label: '营养目标', count: backup.data.nutritionTargets.length }, { label: '凯格尔训练', count: backup.data.pelvicFloorSessions.length }, { label: '有氧训练', count: backup.data.cardioSessions.length }, { label: '习惯', count: backup.data.habits.length }, { label: '习惯打卡', count: backup.data.habitCheckIns.length }, { label: '任务', count: backup.data.tasks.length }, { label: '标签', count: backup.data.taskTags.length }, { label: '营养模板', count: backup.data.nutritionStrategyTemplates.length }, { label: '营养日方案', count: backup.data.nutritionStrategyVariants.length }, { label: '营养阶段', count: backup.data.nutritionStrategyPhases.length }]
  if (surface && !surface.alive) return
  const dialog = mountManagementModal(surface, '确认恢复备份', `<div class="restore-counts">${counts.map((item) => `<p><span>${item.label}</span><strong>${item.count}</strong></p>`).join('')}</div><div class="warning">恢复将清除当前所有数据，并替换为该备份。</div><button class="danger-button full-btn" id="confirm-restore">继续恢复</button>`)
  dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => { if (!await confirmAction('覆盖当前全部数据？', '恢复会清除当前数据并替换为备份内容，此操作无法撤销。', '恢复备份')) return; try { await restoreBackup(backup); surface ? surface.close() : dialog.close(); currentWorkout = undefined; workoutEditorOpen = false; toast('恢复完成'); await render() } catch (error) { fail(error) } })
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
  retireLegacyVideoSearchStorage()
  setupMobileViewport()
  setupMotionInteractions()
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
