import { bindNumericPresentation } from './numericPresentation'
import { aiModelRouteLabel } from './aiUiHelpers'
import type { Food, MealType } from '../db/types'
import { db } from '../db/database'
import { AiClient } from '../services/aiProvider'
import { visionRoutingSignature } from '../ai/modelRouting'
import { AiProfiles } from '../services/aiProfiles'
import { analyzeFoodPackageImages, type NutritionLabelExtractionV1 } from '../services/aiVisionFoodService'
import { draftFromLabel, findVisionDuplicates, FoodVisionWrite, logReviewedVisionFood, validateVisionFoodDraft, validateVisionIntake, type VisionFoodDraft, type VisionIntake, type VisionDuplicateChoice } from '../services/foodVisionImportService'
import { AI_VISION_LIMITS, createVisionProbeImage, preprocessFoodPackageImage, type PreparedVisionImage } from '../ai/visionImages'
import { AiError, safeAiError } from '../ai/security'
import { calculateNutrition, formatNumber } from '../utils/nutrition'
import { formatEnergyInputValue, kcalToKj } from '../utils/energy'
import { mealNames, mealTypes } from '../utils/foodMeals'
import { mountDatePicker, datePickerLabel } from './datePicker'
import { bindEnergyEditor } from './energyEditor'
import { acknowledgeVisionPrivacy, visionPrivacyAcknowledged, VISION_PRIVACY_TEXT, VISION_PROVIDER_PRIVACY_TEXT } from '../ai/visionPrivacy'
import { getLocalDateString } from '../utils/date'
import { icon } from './icons'

export interface FoodVisionImportUi {
  openModal: (title: string, body: string, wide?: boolean) => HTMLDialogElement
  esc: (value: unknown) => string
  openSettings: () => void
  onSaved: (food: Food, logged: boolean) => Promise<void> | void
  onFinish?: (logged: boolean) => void
  profiles?: AiProfiles
}
const intakeMealName = (meal?: MealType) => meal ? mealNames[meal] : '未分类'
const emptyDraft = (): VisionFoodDraft => ({ name: '', brand: '', referenceGrams: null, energyValue: null, energyUnit: 'kcal', protein: null, carbs: null, fat: null })
/** One workflow shared by Library, meal recording and the global assistant. */
export function showFoodVisionImport(ui: FoodVisionImportUi, context: { date: string; meal?: MealType }): void {
  const profiles = ui.profiles ?? new AiProfiles(), esc = ui.esc
  const dialog = ui.openModal(context.meal ? '拍包装并记录' : '拍包装录入', '<div class="food-vision"></div>', true)
  dialog.classList.add('food-vision-sheet')
  const host = dialog.querySelector<HTMLElement>('.food-vision')!
  let sources: (File | undefined)[] = [undefined, undefined]
  let stepGeneration = 0
  const scrollBody = dialog.querySelector<HTMLElement>('.modal-body')!
  const renderStep = (title: string, html: string) => {
    const heading = dialog.querySelector('h2'); if (heading) heading.textContent = title
    const currentStep = ++stepGeneration
    host.innerHTML = html; bindNumericPresentation(host); scrollBody.scrollTop = 0
    requestAnimationFrame(() => { if (currentStep === stepGeneration && dialog.isConnected) scrollBody.scrollTop = 0 })
  }
  let images: (PreparedVisionImage | undefined)[] = [undefined, undefined], extraction: NutritionLabelExtractionV1 | undefined, draft = emptyDraft(), intake = { date: context.date, meal: context.meal ?? '', grams: '' }
  let controller: AbortController | undefined, generation = 0, busy = false, pending: FoodVisionWrite | undefined, savedFood: Food | undefined, netGrams: number | undefined, acknowledged = visionPrivacyAcknowledged(), reviewWasEdited = false
  const errorText = (error: unknown) => error instanceof AiError && error.code === 'vision_unsupported' ? '当前图片模型不支持图片识别，请在 AI 设置选择其它图片模型。' : error instanceof AiError ? safeAiError(error) : error instanceof Error ? error.message : '操作未完成，请重试'
  const status = (message: string) => { const node = host.querySelector<HTMLElement>('.vision-status'); if (node) node.textContent = message }
  dialog.addEventListener('close', () => { generation++; stepGeneration++; controller?.abort(); pending?.cancel(); images = []; sources = []; extraction = undefined }, { once: true })
  const bindSettings = () => host.querySelector('#vision-settings')?.addEventListener('click', () => { dialog.close(); ui.openSettings() })
  const setBusy = (value: boolean) => { busy = value; host.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select').forEach(node => { if (node.id !== 'vision-stop') node.disabled = value }); const stop = host.querySelector<HTMLElement>('#vision-stop'); if (stop) stop.hidden = !value }
  const selectedImages = () => images.filter((image): image is PreparedVisionImage => !!image)
  const canAnalyze = () => !!images[0] && !!profiles.active && profiles.active.visionCapability !== 'unsupported'
  const imageStrip = () => `<div class="vision-images">${images.map((image, i) => image ? `<figure><button type="button" class="vision-thumbnail" data-view-image="${i}" aria-label="查看包装图片 ${i + 1}"><img src="${image.dataUrl}" alt="${i === 0 ? '营养成分表照片' : '包装正面照片'}"></button><button type="button" data-remove-image="${i}" aria-label="移除图片 ${i + 1}">${icon('x', 16)}</button></figure>` : '').join('')}</div>`
  const bindImages = () => host.querySelectorAll<HTMLButtonElement>('[data-view-image]').forEach(button => button.addEventListener('click', () => {
    const image = images[Number(button.dataset.viewImage)]; if (!image || busy) return
    const reviewScroll = scrollBody.scrollTop, currentStep = ++stepGeneration
    const preserved = [...host.children].map(node => ({ node: node as HTMLElement, hidden: (node as HTMLElement).hidden }))
    preserved.forEach(({ node }) => { node.hidden = true })
    const viewer = document.createElement('section'); viewer.className = 'vision-image-view'
    viewer.innerHTML = `<button type="button" class="text-btn">返回核对</button><p class="vision-note">可使用浏览器缩放查看数字。</p><img src="${image.dataUrl}" alt="处理后的包装照片">`
    host.append(viewer); scrollBody.scrollTop = 0; viewer.querySelector('button')!.addEventListener('click', () => { viewer.remove(); preserved.forEach(({ node, hidden }) => { node.hidden = hidden }); button.focus({ preventScroll: true }); scrollBody.scrollTop = reviewScroll; requestAnimationFrame(() => { if (currentStep === stepGeneration && dialog.isConnected) scrollBody.scrollTop = reviewScroll }) })
  }))
  const choose = (quality: 'fast' | 'high' = 'fast') => {
        const active = profiles.active
    renderStep(context.meal ? '拍包装并记录' : '拍包装录入', `<p class="vision-note">尽量正对营养成分表，保证数字清晰并避免反光。</p>${[0, 1].map(slot => `<section class="vision-photo-slot"><h3>${slot === 0 ? '营养成分表 *' : '包装正面（可选）'}</h3><div class="vision-source-actions"><button class="secondary" id="vision-camera${slot ? '-front' : ''}" type="button" data-choose-slot="${slot}" data-source="camera">${icon('camera', 18)} ${images[slot] ? '重新拍摄' : '拍照'}</button><button class="secondary" id="vision-album${slot ? '-front' : ''}" type="button" data-choose-slot="${slot}" data-source="album">从相册选择</button></div><input id="vision-camera-file${slot ? '-front' : ''}" data-slot="${slot}" type="file" accept="image/*" capture="environment" hidden><input id="vision-album-file${slot ? '-front' : ''}" data-slot="${slot}" type="file" accept="image/*" hidden></section>`).join('')}${imageStrip()}<p class="vision-note">最多 ${AI_VISION_LIMITS.images} 张。选择后先在本机处理，点击识别才发送。</p><div class="vision-provider"><strong>${esc(active ? aiModelRouteLabel(active) : '尚未配置 AI')}</strong><p class="vision-note">${!active ? '先配置一个支持图片识别的 AI 服务。' : active.visionCapability === 'supported' ? '图片能力已验证' : active.visionCapability === 'unsupported' ? '当前图片模型不支持图片识别，请在 AI 设置选择其它图片模型。' : '当前图片模型还没有测试图片能力。'}</p><button type="button" class="text-btn" id="vision-settings">打开 AI 设置</button>${active && active.visionCapability !== 'supported' ? '<button type="button" class="secondary" id="vision-test">测试图片能力</button>' : ''}</div><p class="vision-note">${VISION_PRIVACY_TEXT}</p><p class="vision-note">${VISION_PROVIDER_PRIVACY_TEXT}</p>${!acknowledged ? '<label class="vision-consent"><input id="vision-consent" type="checkbox">我知道了</label>' : ''}${reviewWasEdited ? '<label class="vision-consent"><input id="vision-replace-ack" type="checkbox">重新识别会替换当前修改，我确认继续</label>' : ''}<p class="vision-status" role="status"></p><button class="primary full-btn" type="button" id="vision-analyze" ${!canAnalyze() ? 'disabled' : ''}>${quality === 'high' ? '高清重新识别' : '识别营养成分表'}</button>${images[0] ? '<button class="secondary full-btn" id="vision-high-retry" type="button">高清重新识别</button>' : ''}<button class="secondary full-btn" id="vision-manual" type="button">手动新建食物</button><button class="secondary full-btn" id="vision-stop" type="button" hidden>停止</button>`)
    bindSettings(); bindImages()
    host.querySelectorAll<HTMLButtonElement>('[data-choose-slot]').forEach(button => button.addEventListener('click', () => host.querySelector<HTMLInputElement>(`#vision-${button.dataset.source}-file${button.dataset.chooseSlot === '1' ? '-front' : ''}`)!.click()))
    host.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => input.addEventListener('change', async () => {
      const file = input.files?.[0], slot = Number(input.dataset.slot); input.value = ''; if (!file || busy) return
      const current = generation; setBusy(true); status('正在处理图片…')
      try { const prepared = await preprocessFoodPackageImage(file, slot === 0 ? 'nutrition' : 'front'); if (current !== generation || !dialog.isConnected) return; sources[slot] = file; images[slot] = prepared; extraction = undefined; choose() }
      catch (error) { if (current === generation) status(errorText(error)) }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); host.querySelector<HTMLButtonElement>('#vision-analyze')!.disabled = !canAnalyze() } }
    }))
    host.querySelectorAll<HTMLButtonElement>('[data-remove-image]').forEach(button => button.addEventListener('click', () => { sources[Number(button.dataset.removeImage)] = undefined; images[Number(button.dataset.removeImage)] = undefined; extraction = undefined; choose() }))
    host.querySelector('#vision-high-retry')?.addEventListener('click', () => choose('high'))
    host.querySelector('#vision-stop')?.addEventListener('click', () => controller?.abort())
    host.querySelector('#vision-manual')?.addEventListener('click', () => { draft = emptyDraft(); extraction = undefined; netGrams = undefined; reviewWasEdited = false; review() })
    host.querySelector('#vision-test')?.addEventListener('click', async () => {
      if (!active || busy) return
      const signature = visionRoutingSignature(active, profiles.key(active.id)), current = generation
      controller = new AbortController(); setBusy(true); status('正在读取本地测试图…')
      try {
        const result = await new AiClient(active, profiles.key(active.id), profiles.knownSecrets).testVisionCapability(createVisionProbeImage(), controller.signal)
        const latest = profiles.active
        if (current !== generation || !dialog.isConnected) return
        if (!latest || signature !== visionRoutingSignature(latest, profiles.key(latest.id))) throw new AiError('configuration_changed', 'AI 配置已变化，请重新识别。')
        profiles.setVisionCapability(active.id, result); choose(); status(result === 'supported' ? '图片能力已验证，可以选择包装图片' : result === 'unsupported' ? '当前图片模型不支持图片识别，请在 AI 设置选择其它图片模型。' : '测试未准确读取数字，图片能力仍待验证')
      } catch (error) { if (current === generation) { const latest = profiles.active; if (latest && signature === visionRoutingSignature(latest, profiles.key(latest.id))) profiles.setVisionCapability(active.id, 'unknown'); status(errorText(error)) } }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); host.querySelector<HTMLButtonElement>('#vision-analyze')!.disabled = !canAnalyze() } controller = undefined }
    })
    host.querySelector('#vision-analyze')?.addEventListener('click', async () => {
      if (busy || !images[0]) return
      if (!acknowledged && !host.querySelector<HTMLInputElement>('#vision-consent')?.checked) { status('请先确认图片会发送给当前 AI 服务商'); return }
      if (reviewWasEdited && !host.querySelector<HTMLInputElement>('#vision-replace-ack')?.checked) { status('重新识别会替换当前修改，请先确认继续'); return }
      const profile = profiles.active
      if (!profile || profile.visionCapability === 'unsupported') { status('请在 AI 设置配置图片识别'); return }
      if (!navigator.onLine) { status('当前离线，连接网络后才能使用 AI 图片识别。'); return }
      acknowledged = true; acknowledgeVisionPrivacy()
      const current = generation, key = profiles.key(profile.id), signature = visionRoutingSignature(profile, key); controller = new AbortController(); setBusy(true); status('正在识别营养成分…')
      try {
        if (quality === 'high' || selectedImages().some(image => image.profile !== quality)) {
          status('正在处理高清图片…')
          const highImages: (PreparedVisionImage | undefined)[] = []
          for (const [slot, source] of sources.entries()) {
            if (source) highImages[slot] = await preprocessFoodPackageImage(source, slot === 0 ? 'nutrition' : 'front', quality)
            if (controller.signal.aborted || current !== generation) throw new AiError('aborted', '已停止本次识别')
          }
          images = highImages; status('正在识别营养成分…')
        }
        extraction = await analyzeFoodPackageImages({ client: new AiClient(profile, key, profiles.knownSecrets), images: selectedImages(), signal: controller.signal, secrets: profiles.knownSecrets, onTiming: timing => { host.dataset.visionTiming = JSON.stringify(timing) } }); if (current !== generation || !dialog.isConnected) return; const latest = profiles.active; if (!latest || signature !== visionRoutingSignature(latest, profiles.key(latest.id))) throw new AiError('configuration_changed', 'AI 配置已变化，请重新识别。'); profiles.setVisionCapability(profile.id, 'supported'); reviewWasEdited = false; draft = draftFromLabel(extraction); netGrams = extraction.netQuantity.value !== null && ['g', 'kg'].includes(extraction.netQuantity.unit ?? '') ? extraction.netQuantity.value * (extraction.netQuantity.unit === 'kg' ? 1000 : 1) : undefined; review() }
      catch (error) { if (current === generation) { const latest = profiles.active; if (error instanceof AiError && error.code === 'vision_unsupported' && latest && signature === visionRoutingSignature(latest, profiles.key(latest.id))) profiles.setVisionCapability(profile.id, 'unsupported'); status(errorText(error)) } }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); const analyze = host.querySelector<HTMLButtonElement>('#vision-analyze'); if (analyze) analyze.disabled = !canAnalyze() } controller = undefined }
    })
  }
  const review = () => {
        const basis = extraction?.basis, evidence = extraction ? [extraction.netQuantity.evidence, basis?.evidence, ...Object.values(extraction.nutrients).map(value => value.evidence)].filter(Boolean) : []
    const basisNames = { per_100g: '每 100 g', per_100ml: '每 100 mL', per_serving: '每份', per_package: '每包装', custom: '其它基准', unknown: '未识别基准' }
    renderStep('核对营养信息', `<button class="text-btn" id="vision-back-images" type="button">返回图片</button>${imageStrip()}<button class="text-btn" id="vision-review-high" type="button">高清重新识别</button><section class="vision-label-source"><h3>包装原文</h3><p>${esc(basis ? basisNames[basis.kind] : '手动核对')}</p>${evidence.length ? `<details><summary>查看包装原文</summary><div class="vision-evidence">${evidence.map(value => `<p>${esc(value)}</p>`).join('')}</div></details>` : ''}${extraction?.warnings.map(value => `<p class="vision-warning">${esc(value)}</p>`).join('') ?? ''}</section><p class="vision-note">核对的是同一个营养基准。图片识别可能出错，保存前请和包装核对。空白宏量保持未知，不会补为 0。</p>${basis?.unit === 'ml' || basis?.kind === 'per_100ml' ? '<p class="vision-warning">包装营养值按体积标注，FitLog 当前以克为基准。mL 不能当作 g，不能假设 1mL = 1g。请填写这些营养数值实际对应的克重。</p>' : ''}<form id="vision-review-form" class="form food-form"><label class="full">食物名称 *<input name="name" maxlength="120" value="${esc(draft.name)}" required></label><label class="full">品牌<input name="brand" maxlength="120" value="${esc(draft.brand)}"></label><label class="full">${basis?.kind === 'per_serving' && !draft.referenceGrams ? '这一份对应多少克？' : '这组营养值对应的重量 *'}<input name="referenceGrams" type="number" inputmode="decimal" min="0.000001" step="any" value="${draft.referenceGrams ?? ''}" placeholder="核对标签基准，不是默认净含量" required><span>g</span></label><label>能量 *<div class="energy-input-row"><input name="energyValue" type="number" inputmode="decimal" min="0" step="any" value="${formatEnergyInputValue(draft.energyValue)}" required><select name="energyUnit" aria-label="能量单位"><option value="kcal" ${draft.energyUnit === 'kcal' ? 'selected' : ''}>kcal</option><option value="kJ" ${draft.energyUnit === 'kJ' ? 'selected' : ''}>kJ</option></select></div></label><p class="vision-energy full" id="vision-energy-converted"></p><div class="food-macro-grid" role="group" aria-label="宏量营养">${(['protein','carbs','fat'] as const).map(key => `<label>${{protein:'蛋白质',carbs:'碳水',fat:'脂肪'}[key]}<input name="${key}" type="number" inputmode="decimal" min="0" step="any" value="${draft[key] ?? ''}" placeholder="未知"><span>g</span></label>`).join('')}</div><label class="vision-consent full"><input id="vision-reviewed" type="checkbox" required>我已核对营养基准、单位和数值</label><p class="vision-status full" role="status"></p><button type="submit" class="primary full">预览保存食物</button><button type="button" class="secondary full" id="vision-save-log">预览保存并记录</button></form>`)
    host.querySelectorAll('[data-remove-image]').forEach(button => button.remove()); bindImages()
    host.querySelector('#vision-back-images')?.addEventListener('click', () => { readDraft(); draft.canonicalCalories = energyEditor.kcal; choose() })
    host.querySelector('#vision-review-high')?.addEventListener('click', () => { readDraft(); draft.canonicalCalories = energyEditor.kcal; choose('high') })
    const form = host.querySelector<HTMLFormElement>('form')!
    form.addEventListener('input', event => { const name = (event.target as HTMLInputElement).name; if (name && name !== 'energyUnit') reviewWasEdited = true })
    const energyEditor = bindEnergyEditor(form.querySelector('[name=energyValue]')!, form.querySelector('[name=energyUnit]')!, draft.canonicalCalories ?? (draft.energyValue === null ? null : draft.energyUnit === 'kJ' ? draft.energyValue / 4.184 : draft.energyValue))
    const updateEnergy = () => { const value = form.querySelector<HTMLInputElement>('[name=energyValue]')!.value; const node = host.querySelector('#vision-energy-converted')!; try { const kcal = energyEditor.kcal ?? 0; node.textContent = value.trim() ? `${formatEnergyInputValue(kcal)} kcal · ${formatEnergyInputValue(kcalToKj(kcal))} kJ · FitLog 内部以 kcal 保存。` : '能量未知，请核对后填写' } catch { node.textContent = '请填写有效能量' } }
    form.addEventListener('input', updateEnergy); form.addEventListener('change', updateEnergy); updateEnergy()
    const verifiedInput = () => { if (!form.reportValidity() || !host.querySelector<HTMLInputElement>('#vision-reviewed')!.checked) return undefined; readDraft(); draft.canonicalCalories = energyEditor.kcal; return validateVisionFoodDraft(draft) }
    form.addEventListener('submit', event => { event.preventDefault(); try { const input = verifiedInput(); if (input) void preview(input) } catch (error) { status(errorText(error)) } })
    host.querySelector('#vision-save-log')?.addEventListener('click', () => { try { const input = verifiedInput(); if (input) quantity(input) } catch (error) { status(errorText(error)) } })
  }
  const readDraft = () => {
    const form = host.querySelector<HTMLFormElement>('#vision-review-form'); if (!form) return
    const data = new FormData(form), numeric = (key: string) => String(data.get(key) ?? '').trim() ? Number(data.get(key)) : null
    draft = { name: String(data.get('name') ?? ''), brand: String(data.get('brand') ?? ''), referenceGrams: numeric('referenceGrams'), energyValue: numeric('energyValue'), energyUnit: data.get('energyUnit') === 'kJ' ? 'kJ' : 'kcal', protein: numeric('protein'), carbs: numeric('carbs'), fat: numeric('fat') }
  }
  const quantity = (input: FoodVisionWrite['food'], existing?: Food) => {
    renderStep('记录饮食', `<button type="button" class="text-btn" id="vision-quantity-back">${existing ? '返回已保存食物' : '返回核对'}</button><p class="vision-note">${esc(input.name)} · 实际吃下后再记录</p><form id="vision-intake-form" class="form"><label>记录日期<button type="button" class="date-picker-trigger" id="vision-date">${esc(datePickerLabel(intake.date))}</button></label><label>餐次<select name="meal" required><option value="">请选择餐次</option><option value="unclassified" ${intake.meal === 'unclassified' ? 'selected' : ''}>未分类</option>${mealTypes.map(meal => `<option value="${meal}" ${intake.meal === meal ? 'selected' : ''}>${mealNames[meal]}</option>`).join('')}</select></label><label>实际吃了多少 *<input name="grams" type="number" inputmode="decimal" min="0.000001" step="any" value="${esc(intake.grams)}" required><span>g</span></label>${netGrams ? `<button type="button" class="secondary" id="vision-whole-package">整包 ${formatNumber(netGrams)} g</button>` : ''}<p class="vision-energy" id="vision-intake-energy">填写克数后显示本地计算预览</p><p class="vision-status" role="status"></p><button class="primary" type="submit">预览${existing ? '饮食记录' : '保存并记录'}</button></form><div id="vision-date-picker" hidden></div>`)
    const form = host.querySelector<HTMLFormElement>('form')!, dateHost = host.querySelector<HTMLElement>('#vision-date-picker')!
    const capture = () => { const data = new FormData(form); intake = { ...intake, meal: String(data.get('meal') ?? ''), grams: String(data.get('grams') ?? '') } }
    host.querySelector('#vision-date')?.addEventListener('click', () => { capture(); form.hidden = true; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = true; dateHost.hidden = false; const picker = mountDatePicker(dateHost, { value: intake.date, onConfirm: date => { intake.date = date!; form.querySelector('#vision-date')!.textContent = datePickerLabel(date!); picker.destroy(); dateHost.hidden = true; form.hidden = false; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = false }, onCancel: () => { picker.destroy(); dateHost.hidden = true; form.hidden = false; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = false } }); dialog.addEventListener('close', () => picker.destroy(), { once: true }) })
    host.querySelector('#vision-quantity-back')?.addEventListener('click', () => { capture(); if (existing) done(existing); else review() })
    host.querySelector('#vision-whole-package')?.addEventListener('click', () => { form.querySelector<HTMLInputElement>('[name=grams]')!.value = formatNumber(netGrams!); form.dispatchEvent(new Event('input')) })
    form.addEventListener('input', () => { const grams = Number(new FormData(form).get('grams')); host.querySelector('#vision-intake-energy')!.textContent = Number.isFinite(grams) && grams > 0 ? `${formatEnergyInputValue(calculateNutrition(input, grams).calories)} kcal · ${(['protein','carbs','fat'] as const).map(key => `${{protein:'蛋白质',carbs:'碳水',fat:'脂肪'}[key]} ${calculateNutrition(input, grams)[key] === undefined ? '未知' : `${formatNumber(calculateNutrition(input, grams)[key]!)} g`}`).join(' · ')}` : '填写克数后显示本地计算预览' })
    form.addEventListener('submit', event => { event.preventDefault(); capture(); try { const validated = validateVisionIntake({ date: intake.date, meal: intake.meal === 'unclassified' ? undefined : intake.meal as MealType, grams: Number(intake.grams) }); void preview(input, validated, existing) } catch (error) { status(errorText(error)) } })
  }
  const preview = async (input: FoodVisionWrite['food'], actual?: VisionIntake, existing?: Food, choice?: VisionDuplicateChoice) => {
    if (busy) return
    setBusy(true)
    try {
      const duplicates = existing || choice ? [] : await findVisionDuplicates(input)
      if (!dialog.isConnected) return
      if (duplicates.length) {
        const summary = (food: FoodVisionWrite['food']) => `${formatEnergyInputValue(food.calories)} kcal / ${formatNumber(food.referenceGrams)} g · P ${food.protein === undefined ? '未知' : formatNumber(food.protein)} / C ${food.carbs === undefined ? '未知' : formatNumber(food.carbs)} / F ${food.fat === undefined ? '未知' : formatNumber(food.fat)}`
        renderStep('选择同名食物处理方式', `<h3>食物库已有同名食物</h3><p>${esc(input.name)} · ${esc(input.brand)}</p><p>识别：${esc(summary(input))}</p>${duplicates.map((food, i) => `<section class="vision-label-source"><p>当前：${esc(summary(food))}</p><button class="secondary full-btn" type="button" data-use-existing="${i}">使用已有</button><button class="secondary full-btn" type="button" data-update-existing="${i}">更新已有食物</button></section>`).join('')}<button class="secondary full-btn" type="button" id="vision-save-new">另存为新食物</button><button class="text-btn" type="button" id="vision-duplicate-back">返回核对</button>`)
        host.querySelectorAll<HTMLButtonElement>('[data-use-existing]').forEach(button => button.addEventListener('click', () => { const food = duplicates[Number(button.dataset.useExisting)]!; void preview(food, actual, undefined, { mode: 'use', existing: food }) }))
        host.querySelectorAll<HTMLButtonElement>('[data-update-existing]').forEach(button => button.addEventListener('click', () => void preview(input, actual, undefined, { mode: 'update', existing: duplicates[Number(button.dataset.updateExisting)]! })))
        host.querySelector('#vision-save-new')?.addEventListener('click', () => void preview(input, actual, undefined, { mode: 'new' }))
        host.querySelector('#vision-duplicate-back')?.addEventListener('click', review)
        return
      }
      pending = existing ? undefined : new FoodVisionWrite(input, actual, db, () => getLocalDateString(), choice)
      const totals = actual ? calculateNutrition(input, actual.grams) : undefined
      renderStep('确认保存', `<section class="vision-preview"><h3>${esc(input.name)}</h3>${input.brand ? `<p>${esc(input.brand)}</p>` : ''}<p>每 ${formatNumber(input.referenceGrams)} g</p><strong>${formatEnergyInputValue(input.calories)} kcal · ${formatEnergyInputValue(kcalToKj(input.calories))} kJ</strong><div class="vision-macros">${(['protein','carbs','fat'] as const).map(key => `<p>${{protein:'蛋白质',carbs:'碳水',fat:'脂肪'}[key]}：${input[key] === undefined ? '未知' : `${formatNumber(input[key]!)} g`}</p>`).join('')}</div>${choice ? `<p class="vision-note">${choice.mode === 'use' ? '使用已有食物，保持其营养值' : choice.mode === 'update' ? '更新已有食物；历史饮食记录保持原快照' : '另存为新食物'}</p>` : ''}${actual ? `<section class="vision-intake-preview"><h3>饮食记录</h3><p>${esc(actual.date)} · ${intakeMealName(actual.meal)}</p><p>实际 ${formatNumber(actual.grams)} g · ${formatEnergyInputValue(totals!.calories)} kcal</p></section>` : '<p class="vision-note">只保存到食物库，不创建饮食记录。</p>'}<p class="vision-status" role="status"></p><button class="primary full-btn" type="button" id="vision-confirm">${existing ? '确认记录饮食' : actual ? '确认保存并记录' : '确认保存食物'}</button><button class="secondary full-btn" type="button" id="vision-edit">返回修改</button><button class="text-btn" type="button" id="vision-cancel">取消</button></section>`)
      host.querySelector('#vision-edit')?.addEventListener('click', () => { pending?.cancel(); pending = undefined; if (actual) quantity(input, existing); else review() })
      host.querySelector('#vision-cancel')?.addEventListener('click', () => { pending?.cancel(); dialog.close() })
      host.querySelector('#vision-confirm')?.addEventListener('click', async () => {
        if (busy) return; setBusy(true); status('正在保存…')
        try {
          const result = existing ? { food: existing, log: await logReviewedVisionFood(existing, actual!) } : await pending!.confirm()
          savedFood = result.food; images = []; sources = []; extraction = undefined; done(result.food, !!result.log); if (result.log && context.meal) dialog.close()
          // Business success remains success if an owning page fails to refresh.
          try { await ui.onSaved(result.food, !!result.log) } catch { status('已保存；页面刷新未完成，关闭后重新打开即可查看') }
        } catch (error) { status(errorText(error)) }
        finally { setBusy(false) }
      })
    } catch (error) { status(errorText(error)) }
    finally { setBusy(false) }
  }
  const done = (food: Food, logged = false) => {
    renderStep('已保存', `<section class="vision-done"><h3>${logged ? '食物与饮食记录已保存' : '食物已保存'}</h3><p>${esc(food.name)}</p><p class="vision-note">${logged ? `${esc(intake.date)} · ${intakeMealName(intake.meal === 'unclassified' ? undefined : intake.meal as MealType)} · ${esc(intake.grams)} g` : '已加入食物库，可按实际吃下的克数记录饮食。'}</p>${logged ? '' : '<button class="primary full-btn" type="button" id="vision-continue-log">继续记录饮食</button>'}<button class="secondary full-btn" id="vision-finish" type="button">完成</button><p class="vision-status" role="status"></p></section>`)
    host.querySelector('#vision-continue-log')?.addEventListener('click', () => quantity(food, savedFood ?? food))
    host.querySelector('#vision-finish')?.addEventListener('click', () => { dialog.close(); ui.onFinish?.(logged) })
  }
  choose()
}
