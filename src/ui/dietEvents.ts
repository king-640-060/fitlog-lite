import type { DietEvent, MealType } from '../db/types'
import { saveDietEvent, deleteDietEvent, dietEventTitle, dietEventEstimate } from '../services/dietEventService'
import { AiProfiles } from '../services/aiProfiles'
import { AiClient } from '../services/aiProvider'
import { getVisionModel } from '../ai/modelRouting'
import { safeAiError } from '../ai/security'
import { prepareMealPhoto, estimateMealPhoto, MEAL_PHOTO_PRIVACY_KEY, MEAL_PHOTO_PRIVACY_TEXT, type MealPhotoEstimate } from '../services/mealPhotoEstimateService'
import type { PreparedVisionImage } from '../ai/visionImages'
import { mealNames, mealTypes } from '../utils/foodMeals'
import { formatEnergyInputValue } from '../utils/energy'
export interface DietEventUi {
  openModal: (title: string, html: string, wide?: boolean) => HTMLDialogElement
  esc: (value: unknown) => string
  profiles: AiProfiles
  confirmDelete: (title: string, body: string) => Promise<boolean>
  changed: () => Promise<void>
}
export function dietEventsHtml(events: DietEvent[], esc: DietEventUi['esc'], dayDetail = false): string {
  return `<section class="diet-events ${dayDetail ? 'diet-events-detail' : ''}" aria-label="特殊饮食"><div class="diet-events-heading"><h${dayDetail ? '3' : '2'}>特殊饮食</h${dayDetail ? '3' : '2'}>${!dayDetail && !events.some(event => event.scope === 'day') ? '<button type="button" class="text-btn compact-action" data-diet-event-new>标记放纵餐</button>' : ''}</div>${events.map(event => `<button type="button" class="diet-event-row" data-diet-event-edit="${esc(event.id)}" aria-label="编辑 ${esc(dietEventTitle(event))}"><span><strong>${esc(dietEventTitle(event))}</strong><small>${esc(dietEventEstimate(event))}</small>${event.estimateSource === 'photo' ? `<small>照片粗略范围 ${formatEnergyInputValue(event.estimatedCaloriesLow!)}–${formatEnergyInputValue(event.estimatedCaloriesHigh!)} kcal</small>` : ''}${event.note ? `<span class="diet-event-note">${esc(event.note)}</span>` : ''}</span><span class="diet-event-edit">编辑</span></button>`).join('')}${events.some(event => event.scope === 'day') ? '<p class="ai-note">当天已标记放纵日；已有单餐备注保留，可分别编辑。</p>' : ''}</section>`
}
export function bindDietEvents(host: HTMLElement, date: string, events: DietEvent[], ui: DietEventUi): void {
  host.querySelector('[data-diet-event-new]')?.addEventListener('click', () => showDietEvent(ui, date))
  host.querySelectorAll<HTMLButtonElement>('[data-diet-event-edit]').forEach(button => button.addEventListener('click', () => showDietEvent(ui, date, events.find(event => event.id === button.dataset.dietEventEdit))))
}
export function showDietEvent(ui: DietEventUi, date: string, existing?: DietEvent): void {
  const id = existing?.id ?? crypto.randomUUID(), esc = ui.esc
  const dialog = ui.openModal(existing ? `编辑${dietEventTitle(existing)}` : '标记放纵餐', `<form class="form diet-event-form"><p class="ai-note">${esc(date)} · 特殊饮食备注，可只标记，不填写热量。</p><label>范围<select name="scope">${[...mealTypes, 'day'].map(scope => `<option value="${scope}" ${scope === (existing?.scope ?? 'dinner') ? 'selected' : ''}>${scope === 'day' ? '整天 · 放纵日' : mealNames[scope as MealType]}</option>`).join('')}</select></label><label>备注（可选）<textarea name="note" maxlength="1000" rows="3">${esc(existing?.note ?? '')}</textarea></label><label>粗略热量 kcal（可选）<input name="calories" type="number" inputmode="decimal" min="0" max="100000" step="any" value="${existing?.estimatedCalories ?? ''}"></label><p class="diet-estimate-note ai-note">仅作备注，不计入营养总计；可能与已记录食物重叠。</p><button type="button" class="secondary full-btn" id="diet-photo-open">拍照粗略估算</button><p class="ai-note diet-photo-scope"></p><p class="ai-note diet-photo-range"></p><p class="diet-event-status" role="status"></p><button class="primary full-btn" type="submit">保存</button>${existing ? '<button class="text-btn danger" type="button" id="diet-event-delete">删除这条特殊饮食记录</button>' : ''}</form>`)
  dialog.classList.add('diet-event-sheet')
  const form = dialog.querySelector<HTMLFormElement>('.diet-event-form')!, scope = form.querySelector<HTMLSelectElement>('[name=scope]')!, calories = form.querySelector<HTMLInputElement>('[name=calories]')!, status = form.querySelector<HTMLElement>('.diet-event-status')!
  let photoRange = existing?.estimateSource === 'photo' ? { low: existing.estimatedCaloriesLow!, high: existing.estimatedCaloriesHigh! } : undefined
  let saving = false
  const scopeState = () => {
    dialog.querySelector('h2')!.textContent = existing ? `编辑${dietEventTitle({ scope: scope.value as DietEvent['scope'] })}` : scope.value === 'day' ? '标记放纵日' : '标记放纵餐'
    form.querySelector<HTMLButtonElement>('#diet-photo-open')!.disabled = scope.value === 'day'
    form.querySelector<HTMLElement>('.diet-photo-scope')!.textContent = scope.value === 'day' ? '照片估算适用于单餐；放纵日可手动填写全天粗略热量。' : ''
    form.querySelector<HTMLElement>('.diet-photo-range')!.textContent = photoRange ? `照片粗略范围 ${formatEnergyInputValue(photoRange.low)}–${formatEnergyInputValue(photoRange.high)} kcal · 最终备注值可修改` : ''
  }
  scope.addEventListener('change', () => { if (scope.value === 'day' && photoRange) { photoRange = undefined; calories.value = ''; status.textContent = '已移除单餐照片估算，可手动填写全天粗略热量。' }; scopeState() }); scopeState()
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return
    saving = true; form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled = true
    try {
      const estimate = calories.value.trim() === '' ? undefined : Number(calories.value)
      const range = estimate !== undefined && scope.value !== 'day' ? photoRange : undefined
      await saveDietEvent({ date, scope: scope.value as DietEvent['scope'], ...(form.querySelector<HTMLTextAreaElement>('[name=note]')!.value.trim() ? { note: form.querySelector<HTMLTextAreaElement>('[name=note]')!.value.trim() } : {}), ...(estimate !== undefined ? { estimatedCalories: estimate, estimateSource: range ? 'photo' : 'manual', ...(range ? { estimatedCaloriesLow: range.low, estimatedCaloriesHigh: range.high } : {}) } : {}) }, id)
      dialog.close(); await ui.changed()
    } catch (error) { status.textContent = error instanceof Error ? error.message : '保存未完成'; saving = false; form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled = false }
  })
  form.querySelector('#diet-event-delete')?.addEventListener('click', async () => {
    if (saving || !existing) return
    if (!await ui.confirmDelete(`删除${dietEventTitle(existing)}？`, `${date} 的这条特殊饮食备注将删除，无法撤销。饮食记录与营养目标保持原样。`)) return
    saving = true
    try { await deleteDietEvent(existing.id); dialog.close(); await ui.changed() } catch { saving = false; status.textContent = '删除未完成，请重试。' }
  })
  form.querySelector('#diet-photo-open')!.addEventListener('click', () => {
    if (saving || scope.value === 'day') return
    const host = document.createElement('section'); host.className = 'meal-photo-estimate'
    form.hidden = true; form.after(host); const title = dialog.querySelector('h2')!, previousTitle = title.textContent; title.textContent = '单餐照片粗略估算'
    const scroll = dialog.querySelector<HTMLElement>('.modal-body')!; scroll.scrollTop = 0
    let images: PreparedVisionImage[] = [], result: MealPhotoEstimate | undefined, controller: AbortController | undefined, closed = false, busy = false, generation = 0
    const cleanup = () => { closed = true; generation++; controller?.abort(); images = []; result = undefined; host.remove() }
    const back = () => { cleanup(); form.hidden = false; title.textContent = previousTitle; scroll.scrollTop = 0; scopeState() }
    dialog.addEventListener('close', cleanup, { once: true })
    const render = () => {
      const active = ui.profiles.active
      host.innerHTML = `<button class="text-btn" type="button" id="meal-photo-back">返回备注</button><p class="ai-note">单餐估算，无法确定份量、用油或隐藏配料。</p><p class="ai-note">${esc(active ? `图片模型 · ${getVisionModel(active)}` : '请先在 AI 设置配置支持图片的服务。')}</p><div class="meal-photo-actions"><button class="secondary compact-action" type="button" data-meal-source="camera">拍照</button><button class="secondary compact-action" type="button" data-meal-source="album">从相册选择</button></div><input type="file" accept="image/*" capture="environment" data-meal-file="camera" hidden><input type="file" accept="image/*" multiple data-meal-file="album" hidden><div class="meal-photo-images">${images.map((image, index) => `<figure><img src="${image.dataUrl}" alt="单餐照片 ${index + 1}"><button class="text-btn" type="button" data-remove-meal-image="${index}">移除</button></figure>`).join('')}</div><p class="ai-note">最多 2 张；照片只留在本次界面，保存后也不保留照片。</p><p class="ai-note">${MEAL_PHOTO_PRIVACY_TEXT}</p>${localStorage.getItem(MEAL_PHOTO_PRIVACY_KEY) === '1' ? '' : '<label class="vision-consent"><input type="checkbox" id="meal-photo-consent">我知道了</label>'}<p role="status" class="meal-photo-status"></p><button class="primary full-btn" type="button" id="meal-photo-estimate" ${!images.length || !active || active.visionCapability === 'unsupported' ? 'disabled' : ''}>粗略估算</button><button class="secondary full-btn" type="button" id="meal-photo-stop" hidden>停止</button><div class="meal-photo-review"></div>`
      host.querySelector('#meal-photo-back')!.addEventListener('click', back)
      host.querySelectorAll<HTMLButtonElement>('[data-meal-source]').forEach(button => button.addEventListener('click', () => host.querySelector<HTMLInputElement>(`[data-meal-file=${button.dataset.mealSource}]`)!.click()))
      host.querySelectorAll<HTMLInputElement>('[data-meal-file]').forEach(input => input.addEventListener('change', async () => {
        if (busy) return
        const files = Array.from(input.files ?? []); input.value = ''; if (!files.length) return
        const token = ++generation
        if (files.length + images.length > 2) { host.querySelector('.meal-photo-status')!.textContent = '一次最多 2 张，请先移除已有照片。'; return }
        setBusy(true)
        try { const selected = await Promise.all(files.map(prepareMealPhoto)); if (closed || token !== generation) return; images.push(...selected); result = undefined; render() }
        catch (error) { if (!closed && token === generation) host.querySelector('.meal-photo-status')!.textContent = safeAiError(error) }
        finally { if (!closed && token === generation) setBusy(false) }
      }))
      host.querySelectorAll<HTMLButtonElement>('[data-remove-meal-image]').forEach(button => button.addEventListener('click', () => { images.splice(Number(button.dataset.removeMealImage), 1); result = undefined; render() }))
      host.querySelector('#meal-photo-stop')!.addEventListener('click', () => controller?.abort())
      host.querySelector('#meal-photo-estimate')!.addEventListener('click', async () => {
        if (busy || closed || !ui.profiles.active || scope.value === 'day') return
        if (localStorage.getItem(MEAL_PHOTO_PRIVACY_KEY) !== '1' && !host.querySelector<HTMLInputElement>('#meal-photo-consent')?.checked) { host.querySelector('.meal-photo-status')!.textContent = '请先确认餐食照片隐私说明。'; return }
        localStorage.setItem(MEAL_PHOTO_PRIVACY_KEY, '1'); controller = new AbortController(); setBusy(true); host.querySelector('.meal-photo-status')!.textContent = '正在粗略估算…'
        try {
          const active = structuredClone(ui.profiles.active!), client = new AiClient(active, ui.profiles.key(active.id), ui.profiles.knownSecrets)
          result = await estimateMealPhoto(client, images, ui.profiles.knownSecrets, controller.signal)
          if (closed || controller.signal.aborted) return
          host.querySelector('.meal-photo-status')!.textContent = ''; const review = host.querySelector<HTMLElement>('.meal-photo-review')!
          review.innerHTML = `<h3>核对粗略估算</h3><p>${esc(result.summary)}</p><p>${result.caloriesLow === null ? '照片不足以估计热量，可返回手动填写。' : `约 ${formatEnergyInputValue(result.caloriesLow)}–${formatEnergyInputValue(result.caloriesHigh!)} kcal`}</p><ul>${result.assumptions.map(note => `<li>${esc(note)}</li>`).join('')}</ul>${result.caloriesLow === null ? '' : `<label>最终备注值 kcal<input type="number" id="meal-photo-final" inputmode="decimal" min="0" max="100000" step="any" value="${(result.caloriesLow + result.caloriesHigh!) / 2}"></label><button class="primary full-btn" type="button" id="meal-photo-use">使用这个估算</button>`}<p class="ai-note">仅填入备注草稿，返回后仍需点击保存。</p>`
          review.querySelector('#meal-photo-use')?.addEventListener('click', () => { const value = Number(review.querySelector<HTMLInputElement>('input')!.value); if (!review.querySelector<HTMLInputElement>('input')!.value || !Number.isFinite(value) || value < 0 || value > 100000) { host.querySelector('.meal-photo-status')!.textContent = '请填写有效热量。'; return }; photoRange = { low: result!.caloriesLow!, high: result!.caloriesHigh! }; calories.value = String(value); back() })
        } catch (error) { if (!closed) host.querySelector('.meal-photo-status')!.textContent = safeAiError(error) }
        finally { if (!closed) setBusy(false) }
      })
    }
    const setBusy = (value: boolean) => { busy = value; host.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input').forEach(node => { if (node.id !== 'meal-photo-stop' && node.id !== 'meal-photo-back') node.disabled = value }); host.querySelector<HTMLElement>('#meal-photo-stop')!.hidden = !value; if (!value) host.querySelector<HTMLButtonElement>('#meal-photo-estimate')!.disabled = !images.length || !ui.profiles.active || ui.profiles.active.visionCapability === 'unsupported' }
    render()
    const cancel = (event: Event) => { if (!closed) { event.preventDefault(); back() } }; dialog.addEventListener('cancel', cancel); dialog.addEventListener('close', () => dialog.removeEventListener('cancel', cancel), { once: true })
  })
}
