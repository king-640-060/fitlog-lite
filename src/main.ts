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
import { formatShortDate, getLocalDateString } from './utils/date'
import { calculateNutrition, formatNumber } from './utils/nutrition'

Chart.register(...registerables)
registerSW({ immediate: true })

type Tab = 'food' | 'workout' | 'weight'
let activeTab: Tab = 'food'
let foodDate = getLocalDateString()
let workoutDate = getLocalDateString()
let currentWorkout: Workout | undefined
let showWorkoutHistory = false
let weightRange: '30' | '90' | 'all' = '30'
let weightChart: Chart | undefined
let workoutSaveTimer: number | undefined
const LAST_BACKUP_KEY = 'fitlog-last-backup-at'

const app = document.querySelector<HTMLDivElement>('#app')!
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
const valueOf = (form: FormData, key: string): string => String(form.get(key) ?? '')

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
  element.textContent = message
  document.body.append(element)
  window.setTimeout(() => element.remove(), 2600)
}

function fail(error: unknown): void {
  toast(error instanceof Error ? error.message : '操作失败，请重试', 'error')
}

function openModal(title: string, body: string, wide = false): HTMLDialogElement {
  document.querySelector('dialog')?.remove()
  const dialog = document.createElement('dialog')
  dialog.className = wide ? 'modal modal-wide' : 'modal'
  dialog.innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="关闭">×</button></div><div class="modal-body">${body}</div>`
  document.body.append(dialog)
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => dialog.remove())
  dialog.showModal()
  return dialog
}

async function render(): Promise<void> {
  weightChart?.destroy()
  app.innerHTML = `
    <div class="app-frame">
      <header class="topbar"><div><p class="eyebrow">FITLOG LITE</p><h1>${activeTab === 'food' ? '饮食' : activeTab === 'workout' ? '训练' : '体重'}</h1></div><button class="icon-btn settings-btn" id="settings" aria-label="数据与设置">⚙</button></header>
      <main id="view" aria-live="polite"></main>
      <nav class="bottom-nav" aria-label="主导航">
        <button data-tab="food" class="${activeTab === 'food' ? 'active' : ''}"><span>◐</span>饮食</button>
        <button data-tab="workout" class="${activeTab === 'workout' ? 'active' : ''}"><span>◇</span>训练</button>
        <button data-tab="weight" class="${activeTab === 'weight' ? 'active' : ''}"><span>⌁</span>体重</button>
      </nav>
    </div>`
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.tab as Tab
    void render()
  }))
  document.querySelector('#settings')?.addEventListener('click', () => void showSettings())
  if (activeTab === 'food') await renderFoodPage()
  if (activeTab === 'workout') await renderWorkoutPage()
  if (activeTab === 'weight') await renderWeightPage()
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
    <section class="date-row"><label>记录日期<input id="food-date" type="date" value="${foodDate}"></label><button class="text-btn" id="food-library">食物库</button></section>
    <section class="metric-card"><p>总热量</p><strong>${formatNumber(totals.calories)} <small>kcal</small></strong>${hasMacros ? `<div class="macros"><span>P ${formatNumber(totals.protein)}g</span><span>C ${formatNumber(totals.carbs)}g</span><span>F ${formatNumber(totals.fat)}g</span></div>` : ''}</section>
    <section class="section-head"><h2>已记录</h2><span>${logs.length} 项</span></section>
    <div class="list">${logs.length ? logs.map((log) => `<article class="list-card"><div class="card-main"><h3>${esc(log.foodName)}</h3>${log.brand ? `<p>${esc(log.brand)}</p>` : ''}<p>${formatNumber(log.grams)}g</p></div><strong>${formatNumber(log.totalCalories)} kcal</strong><div class="row-actions"><button data-edit-log="${log.id}">编辑</button><button class="danger" data-delete-log="${log.id}">删除</button></div></article>`).join('') : `<div class="empty"><span>◌</span><h3>今天还没有记录</h3><p>添加吃过的食物后，这里会自动汇总。</p></div>`}</div>
    <button class="primary sticky-action" id="add-food-log">＋ 添加食物</button>`
  view.querySelector<HTMLInputElement>('#food-date')?.addEventListener('change', (event) => { foodDate = (event.target as HTMLInputElement).value; void renderFoodPage() })
  view.querySelector('#food-library')?.addEventListener('click', () => void showFoodLibrary())
  view.querySelector('#add-food-log')?.addEventListener('click', () => void showAddFoodLog())
  view.querySelectorAll<HTMLButtonElement>('[data-delete-log]').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('删除这条饮食记录？')) return
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
  const dialog = openModal('添加食物', foods.length ? `<div class="form"><label>搜索<input id="food-search" type="search" placeholder="名称或品牌" autocomplete="off"></label><div id="food-results" class="picker-list"></div></div>` : `<div class="empty compact"><h3>食物库还是空的</h3><p>先创建一种食物。</p><button class="primary" id="create-first-food">新建食物</button></div>`, true)
  if (!foods.length) {
    dialog.querySelector('#create-first-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
    return
  }
  const results = dialog.querySelector<HTMLDivElement>('#food-results')!
  const draw = (query = '') => {
    const normalized = query.trim().toLocaleLowerCase()
    const matches = foods.filter((food) => `${food.name} ${food.brand ?? ''}`.toLocaleLowerCase().includes(normalized)).slice(0, 100)
    results.innerHTML = matches.map((food) => `<button class="picker-item" data-food="${food.id}"><span><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}</span><em>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</em></button>`).join('') || '<p class="muted">没有匹配的食物</p>'
    results.querySelectorAll<HTMLButtonElement>('[data-food]').forEach((button) => button.addEventListener('click', () => {
      const food = foods.find((item) => item.id === button.dataset.food)!
      dialog.querySelector('.modal-body')!.innerHTML = `<form id="log-food-form" class="form"><div class="selected-food"><strong>${esc(food.name)}</strong><span>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</span></div><label>实际吃了多少<input name="grams" id="grams" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="230" required><span>g</span></label><div class="preview-number"><span>预计热量</span><strong id="kcal-preview">— kcal</strong></div><button class="primary" type="submit">保存记录</button></form>`
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
  const dialog = openModal('食物库', `<div class="toolbar"><input id="library-search" type="search" value="${esc(query)}" placeholder="搜索名称或品牌"><button class="primary small" id="new-food">＋ 新建</button></div><div class="import-actions"><button id="import-csv">导入 CSV</button><button id="import-json">导入 JSON</button><input id="import-file" type="file" hidden></div><div class="library-list">${filtered.length ? filtered.map((food) => `<article><div><strong>${esc(food.name)}</strong>${food.brand ? `<small>${esc(food.brand)}</small>` : ''}<p>${formatNumber(food.calories)} kcal / ${formatNumber(food.referenceGrams)}g</p></div><div class="row-actions"><button data-edit-food="${food.id}">编辑</button><button class="danger" data-delete-food="${food.id}">删除</button></div></article>`).join('') : '<p class="muted padded">没有食物</p>'}</div>`, true)
  dialog.querySelector<HTMLInputElement>('#library-search')?.addEventListener('change', (event) => { dialog.close(); void showFoodLibrary((event.target as HTMLInputElement).value) })
  dialog.querySelector('#new-food')?.addEventListener('click', () => { dialog.close(); void showFoodForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-food]').forEach((button) => button.addEventListener('click', () => { const food = foods.find((item) => item.id === button.dataset.editFood); dialog.close(); void showFoodForm(food) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-food]').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('删除该食物？历史饮食记录会保留。')) return
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
  if (!currentWorkout && !showWorkoutHistory) currentWorkout = await findOpenWorkout(workoutDate)
  if (showWorkoutHistory) { await renderWorkoutHistory(); return }
  if (currentWorkout) { renderWorkoutEditor(currentWorkout); return }
  const todayWorkouts = await db.workouts.where('date').equals(workoutDate).toArray()
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="date-row"><label>训练日期<input id="workout-date" type="date" value="${workoutDate}"></label><button class="text-btn" id="exercise-library">动作库</button></section><div class="empty workout-empty"><span>◇</span><h2>${todayWorkouts.length ? '这一天的训练已完成' : '准备好开始了吗？'}</h2><p>每一组的重量、次数和 RPE 都会独立保存。</p><button class="primary" id="start-workout">开始训练</button><button id="history-workout">历史训练</button></div>`
  view.querySelector<HTMLInputElement>('#workout-date')?.addEventListener('change', (event) => { workoutDate = (event.target as HTMLInputElement).value; currentWorkout = undefined; void renderWorkoutPage() })
  view.querySelector('#exercise-library')?.addEventListener('click', () => void showExerciseLibrary())
  view.querySelector('#start-workout')?.addEventListener('click', async () => { currentWorkout = await createWorkout(workoutDate); await renderWorkoutPage() })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; void renderWorkoutPage() })
}

function renderWorkoutEditor(workout: Workout): void {
  const completed = Boolean(workout.finishedAt)
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="workout-status"><div><p>${workout.date}</p><strong>${completed ? '历史训练' : '训练进行中'}</strong></div><span id="autosave-state">${completed ? '可编辑' : '已自动保存'}</span></section><div id="workout-exercises">${workout.exercises.length ? workout.exercises.map(workoutExerciseHtml).join('') : '<div class="empty compact"><h3>还没有动作</h3><p>添加第一个动作开始记录。</p></div>'}</div><button id="add-exercise" class="secondary full-btn">＋ 添加动作</button><label class="note-field">训练备注<textarea id="workout-note" rows="2" placeholder="可选">${esc(workout.note)}</textarea></label><div class="action-stack">${completed ? '<button id="back-history" class="primary">返回历史</button><button id="delete-workout" class="danger-button">删除训练</button>' : '<button id="finish-workout" class="primary">完成训练</button><button id="history-workout">历史训练</button>'}</div>`
  bindWorkoutEditor(workout)
}

function workoutExerciseHtml(exercise: WorkoutExercise): string {
  return `<article class="exercise-card" data-workout-exercise="${exercise.id}"><div class="exercise-head"><h3>${esc(exercise.exerciseName)}</h3><button class="danger plain" data-remove-exercise="${exercise.id}">移除</button></div><div class="sets"><div class="set-header"><span>组</span><span>重量 kg</span><span>次数</span><span>RPE</span><span></span></div>${exercise.sets.map((set, index) => `<div class="set-row" data-set="${set.id}"><span>${index + 1}</span><input aria-label="第${index + 1}组重量" data-field="weightKg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weightKg ?? ''}"><input aria-label="第${index + 1}组次数" data-field="reps" type="number" inputmode="numeric" min="1" step="1" value="${set.reps || ''}"><input aria-label="第${index + 1}组RPE" data-field="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="${set.rpe ?? ''}"><button aria-label="删除第${index + 1}组" class="icon-btn danger" data-remove-set="${set.id}">×</button><input class="set-note" aria-label="第${index + 1}组备注" data-field="note" placeholder="本组备注（可选）" value="${esc(set.note)}"></div>`).join('')}</div><button class="text-btn add-set" data-add-set="${exercise.id}">＋ 添加一组</button></article>`
}

function bindWorkoutEditor(workout: Workout): void {
  const view = document.querySelector<HTMLElement>('#view')!
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
      workout.finishedAt = new Date().toISOString(); await saveWorkout(workout); currentWorkout = undefined; showWorkoutHistory = true; toast('训练已完成'); await renderWorkoutPage()
    } catch (error) { fail(error) }
  })
  view.querySelector('#history-workout')?.addEventListener('click', () => { showWorkoutHistory = true; currentWorkout = undefined; void renderWorkoutPage() })
  view.querySelector('#back-history')?.addEventListener('click', async () => { await saveWorkout(workout); currentWorkout = undefined; showWorkoutHistory = true; await renderWorkoutPage() })
  view.querySelector('#delete-workout')?.addEventListener('click', async () => { if (!window.confirm('删除整次训练？此操作无法撤销。')) return; await db.workouts.delete(workout.id); currentWorkout = undefined; showWorkoutHistory = true; toast('已删除'); await renderWorkoutPage() })
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
  const dialog = openModal('添加动作', `<div class="form"><label>搜索<input id="exercise-search" type="search" placeholder="动作名称"></label><div id="exercise-results" class="picker-list"></div><button id="quick-exercise">＋ 新建动作</button></div>`, true)
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
  const dialog = openModal('动作库', `<button class="primary full-btn" id="new-exercise">＋ 新建动作</button><div class="library-list">${exercises.map((exercise) => `<article><div><strong>${esc(exercise.name)}</strong>${exercise.notes ? `<p>${esc(exercise.notes)}</p>` : ''}</div><div class="row-actions"><button data-edit-exercise="${exercise.id}">编辑</button><button class="danger" data-delete-exercise="${exercise.id}">删除</button></div></article>`).join('')}</div>`, true)
  dialog.querySelector('#new-exercise')?.addEventListener('click', () => { dialog.close(); void showExerciseForm() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-edit-exercise]').forEach((button) => button.addEventListener('click', () => { dialog.close(); void showExerciseForm(exercises.find((item) => item.id === button.dataset.editExercise)) }))
  dialog.querySelectorAll<HTMLButtonElement>('[data-delete-exercise]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('删除该动作？历史训练会保留。')) return; await db.exercises.delete(button.dataset.deleteExercise!); dialog.close(); toast('已删除'); void showExerciseLibrary() }))
}

async function showExerciseForm(exercise?: Exercise, afterSave?: (value: Exercise) => void | Promise<void>): Promise<void> {
  const dialog = openModal(exercise ? '编辑动作' : '新建动作', `<form id="exercise-form" class="form"><label>动作名称 *<input name="name" value="${esc(exercise?.name)}" placeholder="杠铃卧推" required></label><label>备注<textarea name="notes" rows="3" placeholder="可选">${esc(exercise?.notes)}</textarea></label><button class="primary" type="submit">保存动作</button></form>`)
  dialog.querySelector<HTMLFormElement>('#exercise-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); try { const saved = await saveExercise(valueOf(data, 'name'), valueOf(data, 'notes'), exercise?.id); dialog.close(); toast('已保存'); if (afterSave) await afterSave(saved); else void showExerciseLibrary() } catch (error) { fail(error) } })
}

async function renderWorkoutHistory(): Promise<void> {
  const workouts = (await db.workouts.toArray()).filter((item) => item.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<div class="section-head history-head"><h2>历史训练</h2><button id="close-history">返回</button></div><div class="list">${workouts.length ? workouts.map((workout) => `<button class="history-card" data-workout="${workout.id}"><div><strong>${workout.date}</strong><span>${workout.exercises.length} 个动作 · ${workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组</span></div><p>${workout.exercises.map((item) => `${esc(item.exerciseName)} · ${item.sets.length}组`).join('<br>')}</p></button>`).join('') : '<div class="empty"><h3>还没有训练历史</h3></div>'}</div>`
  view.querySelector('#close-history')?.addEventListener('click', () => { showWorkoutHistory = false; void renderWorkoutPage() })
  view.querySelectorAll<HTMLButtonElement>('[data-workout]').forEach((button) => button.addEventListener('click', async () => { currentWorkout = await db.workouts.get(button.dataset.workout!); showWorkoutHistory = false; await renderWorkoutPage() }))
}

async function renderWeightPage(): Promise<void> {
  const today = getLocalDateString()
  const todayWeight = await db.weights.where('date').equals(today).first()
  const weights = await db.weights.orderBy('date').reverse().toArray()
  const cutoffDays = weightRange === 'all' ? Number.POSITIVE_INFINITY : Number(weightRange)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - cutoffDays + 1)
  const cutoffString = getLocalDateString(cutoff)
  const chartWeights = weights.filter((item) => weightRange === 'all' || item.date >= cutoffString).reverse()
  const view = document.querySelector<HTMLElement>('#view')!
  view.innerHTML = `<section class="metric-card weight-entry"><p>今日体重</p><form id="weight-form"><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${todayWeight?.weightKg ?? ''}" placeholder="72.4" required><span>kg</span><button class="primary" type="submit">保存</button></form></section><section class="chart-card"><div class="section-head"><h2>体重趋势</h2><div class="segmented"><button data-range="30" class="${weightRange === '30' ? 'active' : ''}">30天</button><button data-range="90" class="${weightRange === '90' ? 'active' : ''}">90天</button><button data-range="all" class="${weightRange === 'all' ? 'active' : ''}">全部</button></div></div>${chartWeights.length ? '<div class="chart-wrap"><canvas id="weight-chart"></canvas></div>' : '<div class="empty compact"><p>记录体重后会显示趋势图。</p></div>'}</section><section class="section-head"><h2>历史记录</h2><span>${weights.length} 条</span></section><div class="list">${weights.map((item) => `<article class="weight-row"><span>${formatShortDate(item.date)}</span><strong>${formatNumber(item.weightKg)} kg</strong><div class="row-actions"><button data-edit-weight="${item.id}">编辑</button><button class="danger" data-delete-weight="${item.id}">删除</button></div></article>`).join('') || '<div class="empty compact"><h3>暂无体重记录</h3></div>'}</div>`
  view.querySelector<HTMLFormElement>('#weight-form')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await upsertWeight(today, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'weight')); toast('已保存'); await renderWeightPage() } catch (error) { fail(error) } })
  view.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((button) => button.addEventListener('click', () => { weightRange = button.dataset.range as typeof weightRange; void renderWeightPage() }))
  view.querySelectorAll<HTMLButtonElement>('[data-delete-weight]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('删除这条体重记录？')) return; await db.weights.delete(button.dataset.deleteWeight!); toast('已删除'); await renderWeightPage() }))
  view.querySelectorAll<HTMLButtonElement>('[data-edit-weight]').forEach((button) => button.addEventListener('click', () => { const item = weights.find((weight) => weight.id === button.dataset.editWeight)!; const dialog = openModal('编辑体重', `<form id="edit-weight-form" class="form"><label>${item.date}<input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" value="${item.weightKg}" required><span>kg</span></label><button class="primary" type="submit">保存</button></form>`); dialog.querySelector<HTMLFormElement>('#edit-weight-form')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await upsertWeight(item.date, valueOf(new FormData(event.currentTarget as HTMLFormElement), 'weight')); dialog.close(); toast('已保存'); await renderWeightPage() } catch (error) { fail(error) } }) }))
  if (chartWeights.length) {
    const canvas = view.querySelector<HTMLCanvasElement>('#weight-chart')!
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    weightChart = new Chart(canvas, { type: 'line', data: { labels: chartWeights.map((item) => formatShortDate(item.date)), datasets: [{ data: chartWeights.map((item) => item.weightKg), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: 0.28, pointRadius: 3, pointBackgroundColor: '#2563eb' }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 220 }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: dark ? '#9ca3af' : '#64748b', maxTicksLimit: 7 } }, y: { ticks: { color: dark ? '#9ca3af' : '#64748b', callback: (value) => `${value}kg` }, grid: { color: dark ? '#303641' : '#e8edf3' } } } } })
  }
}

async function showSettings(): Promise<void> {
  let persistText = '浏览器不支持'
  try { if (navigator.storage?.persist) persistText = await navigator.storage.persist() ? '已授权' : '未授权' } catch { persistText = '未授权' }
  const lastBackup = formatBackupTime(localStorage.getItem(LAST_BACKUP_KEY))
  const dialog = openModal('数据与设置', `<section class="settings-section"><h3>本地数据</h3><div class="data-safety"><strong>数据保存在当前设备。清除 Safari 网站数据或更换设备前，请先导出备份。</strong><p>上次导出备份：<span id="last-backup">${esc(lastBackup)}</span></p></div><p class="storage-state">持久化存储：<strong>${persistText}</strong></p></section><section class="settings-section"><h3>备份与恢复</h3><button class="primary full-btn" id="export-backup">导出完整备份</button><button class="full-btn" id="restore-backup">恢复完整备份</button><input id="backup-file" type="file" accept=".json,application/json" hidden></section><section class="settings-section"><h3>关于</h3><p>FitLog Lite · 数据只保存在你的设备上</p></section>`)
  dialog.querySelector('#export-backup')?.addEventListener('click', async () => { try { const backup = await exportBackup(); const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fitlog-backup-${getLocalDateString()}.json`; link.click(); URL.revokeObjectURL(link.href); const exportedAt = new Date().toISOString(); localStorage.setItem(LAST_BACKUP_KEY, exportedAt); const label = dialog.querySelector('#last-backup'); if (label) label.textContent = formatBackupTime(exportedAt); toast('备份已导出') } catch (error) { fail(error) } })
  const fileInput = dialog.querySelector<HTMLInputElement>('#backup-file')!
  dialog.querySelector('#restore-backup')?.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; try { const backup = validateBackup(JSON.parse(await file.text())); dialog.close(); showRestorePreview(backup) } catch (error) { fail(error) } })
}

function showRestorePreview(backup: BackupData): void {
  const counts = [{ label: '食物', count: backup.data.foods.length }, { label: '饮食记录', count: backup.data.foodLogs.length }, { label: '动作', count: backup.data.exercises.length }, { label: '训练', count: backup.data.workouts.length }, { label: '体重', count: backup.data.weights.length }]
  const dialog = openModal('确认恢复备份', `<div class="restore-counts">${counts.map((item) => `<p><span>${item.label}</span><strong>${item.count}</strong></p>`).join('')}</div><div class="warning">恢复将清除当前所有数据，并替换为该备份。</div><button class="danger-button full-btn" id="confirm-restore">继续恢复</button>`)
  dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => { if (!window.confirm('再次确认：清除当前全部数据并恢复此备份？')) return; try { await restoreBackup(backup); dialog.close(); currentWorkout = undefined; toast('恢复完成'); await render() } catch (error) { fail(error) } })
}

async function start(): Promise<void> {
  setupMobileViewport()
  try { await db.open(); await seedExercises(); await render() } catch (error) { app.innerHTML = `<div class="fatal"><h1>无法打开 FitLog Lite</h1><p>${esc(error instanceof Error ? error.message : '请刷新后重试')}</p></div>` }
}

void start()
