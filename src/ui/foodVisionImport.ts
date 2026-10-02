import type { Food, MealType } from '../db/types'
import { db } from '../db/database'
import { AiClient } from '../services/aiProvider'
import { AiProfiles } from '../services/aiProfiles'
import { analyzeFoodPackageImages, type NutritionLabelExtractionV1 } from '../services/aiVisionFoodService'
import { draftFromLabel, FoodVisionWrite, logReviewedVisionFood, validateVisionFoodDraft, validateVisionIntake, type VisionFoodDraft, type VisionIntake } from '../services/foodVisionImportService'
import { AI_VISION_LIMITS, createVisionProbeImage, preprocessFoodPackageImage, type PreparedVisionImage } from '../ai/visionImages'
import { AiError, safeAiError } from '../ai/security'
import { calculateNutrition, formatNumber } from '../utils/nutrition'
import { energyToKcal, kcalToKj } from '../utils/energy'
import { mealNames, mealTypes } from '../utils/foodMeals'
import { mountDatePicker, datePickerLabel } from './datePicker'
import { icon } from './icons'

export interface FoodVisionImportUi {
  openModal: (title: string, body: string, wide?: boolean) => HTMLDialogElement
  esc: (value: unknown) => string
  openSettings: () => void
  onSaved: (food: Food, logged: boolean) => Promise<void> | void
  profiles?: AiProfiles
}
const emptyDraft = (): VisionFoodDraft => ({ name: '', brand: '', referenceGrams: null, energyValue: null, energyUnit: 'kcal', protein: null, carbs: null, fat: null })
/** One workflow shared by Library, meal recording and the global assistant. */
export function showFoodVisionImport(ui: FoodVisionImportUi, context: { date: string; meal?: MealType }): void {
  const profiles = ui.profiles ?? new AiProfiles(), esc = ui.esc
  const dialog = ui.openModal(context.meal ? '拍包装并记录' : '拍包装录入', '<div class="food-vision"></div>', true)
  dialog.classList.add('food-vision-sheet')
  const host = dialog.querySelector<HTMLElement>('.food-vision')!
  let images: PreparedVisionImage[] = [], extraction: NutritionLabelExtractionV1 | undefined, draft = emptyDraft(), intake = { date: context.date, meal: context.meal ?? '', grams: '' }
  let controller: AbortController | undefined, generation = 0, busy = false, pending: FoodVisionWrite | undefined, savedFood: Food | undefined
  const errorText = (error: unknown) => error instanceof AiError ? safeAiError(error) : error instanceof Error ? error.message : '操作未完成，请重试'
  const status = (message: string) => { const node = host.querySelector<HTMLElement>('.vision-status'); if (node) node.textContent = message }
  const updateViewport = () => { dialog.style.setProperty('--vision-height', `${Math.max(120, (window.visualViewport?.height ?? innerHeight) - 12)}px`); dialog.style.bottom = `${Math.max(0, innerHeight - ((window.visualViewport?.height ?? innerHeight) + (window.visualViewport?.offsetTop ?? 0)))}px` }
  visualViewport?.addEventListener('resize', updateViewport); visualViewport?.addEventListener('scroll', updateViewport); window.addEventListener('resize', updateViewport); updateViewport()
  dialog.addEventListener('close', () => { generation++; controller?.abort(); pending?.cancel(); images = []; extraction = undefined; visualViewport?.removeEventListener('resize', updateViewport); visualViewport?.removeEventListener('scroll', updateViewport); window.removeEventListener('resize', updateViewport) }, { once: true })
  const bindSettings = () => host.querySelector('#vision-settings')?.addEventListener('click', () => { dialog.close(); ui.openSettings() })
  const setBusy = (value: boolean) => { busy = value; host.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input').forEach(node => { if (node.id !== 'vision-stop') node.disabled = value }); const stop = host.querySelector<HTMLElement>('#vision-stop'); if (stop) stop.hidden = !value }
  const imageStrip = () => `<div class="vision-images">${images.map((image, i) => `<figure><button type="button" class="vision-thumbnail" data-view-image="${i}" aria-label="查看包装图片 ${i + 1}"><img src="${image.dataUrl}" alt="包装图片 ${i + 1}"></button><button type="button" data-remove-image="${i}" aria-label="移除图片 ${i + 1}">${icon('x', 16)}</button></figure>`).join('')}</div>`
  const bindImages = () => host.querySelectorAll<HTMLButtonElement>('[data-view-image]').forEach(button => button.addEventListener('click', () => {
    const image = images[Number(button.dataset.viewImage)]; if (!image || busy) return
    const preserved = [...host.children].map(node => ({ node: node as HTMLElement, hidden: (node as HTMLElement).hidden }))
    preserved.forEach(({ node }) => { node.hidden = true })
    const viewer = document.createElement('section'); viewer.className = 'vision-image-view'
    viewer.innerHTML = `<button type="button" class="text-btn">返回核对</button><p class="vision-note">可使用浏览器缩放查看数字。</p><img src="${image.dataUrl}" alt="营养成分表原图">`
    host.append(viewer); viewer.querySelector('button')!.addEventListener('click', () => { viewer.remove(); preserved.forEach(({ node, hidden }) => { node.hidden = hidden }); button.focus() })
  }))
  const choose = () => {
    const active = profiles.active
    host.innerHTML = `<p class="vision-note">拍清营养成分表，可补充同一产品的名称或净含量。识别只抄取包装上可见的信息，数值需要你核对。</p><div class="vision-source-actions"><button class="secondary" id="vision-camera" type="button">${icon('camera', 18)} 拍摄包装</button><button class="secondary" id="vision-album" type="button">选择图片</button></div><input id="vision-camera-file" type="file" accept="image/*" capture="environment" hidden><input id="vision-album-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden>${imageStrip()}<p class="vision-note">最多 ${AI_VISION_LIMITS.images} 张同一产品的图片。选择后先在本机处理，点击识别才发送。</p><div class="vision-provider"><strong>${esc(active ? `${active.name} · ${active.model}` : '尚未配置 AI')}</strong><p class="vision-note">${active?.visionCapability === 'supported' ? '图片能力已验证' : active?.visionCapability === 'unsupported' ? '当前配置未支持图片' : '图片能力待验证'}</p><button type="button" class="text-btn" id="vision-settings">AI 设置</button>${active && active.visionCapability !== 'supported' ? '<button type="button" class="secondary" id="vision-test">测试图片能力</button>' : ''}</div><label class="vision-consent"><input id="vision-consent" type="checkbox">同意把所选包装图片发送给当前 AI 服务商进行识别</label><p class="vision-status" role="status"></p><button class="primary full-btn" type="button" id="vision-analyze" ${!images.length || active?.visionCapability !== 'supported' ? 'disabled' : ''}>识别营养成分表</button><button class="secondary full-btn" id="vision-stop" type="button" hidden>停止识别</button><button class="text-btn" id="vision-manual" type="button">核对图片后手动填写</button>`
    bindSettings(); bindImages()
    host.querySelector('#vision-camera')?.addEventListener('click', () => host.querySelector<HTMLInputElement>('#vision-camera-file')!.click())
    host.querySelector('#vision-album')?.addEventListener('click', () => host.querySelector<HTMLInputElement>('#vision-album-file')!.click())
    host.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => input.addEventListener('change', async () => {
      const files = [...(input.files ?? [])]; input.value = ''; if (!files.length || busy) return
      if (files.length + images.length > AI_VISION_LIMITS.images) { status('一次最多选择 3 张同一产品的图片'); return }
      const current = generation; setBusy(true); status('正在本机处理图片…')
      try { const prepared: PreparedVisionImage[] = []; for (const file of files) prepared.push(await preprocessFoodPackageImage(file)); if (current !== generation || !dialog.isConnected) return; images.push(...prepared); extraction = undefined; choose() }
      catch (error) { if (current === generation) status(errorText(error)) }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); host.querySelector<HTMLButtonElement>('#vision-analyze')!.disabled = !images.length || profiles.active?.visionCapability !== 'supported' } }
    }))
    host.querySelectorAll<HTMLButtonElement>('[data-remove-image]').forEach(button => button.addEventListener('click', () => { images.splice(Number(button.dataset.removeImage), 1); extraction = undefined; choose() }))
    host.querySelector('#vision-stop')?.addEventListener('click', () => controller?.abort())
    host.querySelector('#vision-manual')?.addEventListener('click', () => { draft = emptyDraft(); review() })
    host.querySelector('#vision-test')?.addEventListener('click', async () => {
      if (!active || busy) return
      const signature = JSON.stringify([active.id, active.baseUrl, active.model, profiles.key(active.id)]), current = generation
      controller = new AbortController(); setBusy(true); status('正在读取本地测试图…')
      try {
        const result = await new AiClient(active, profiles.key(active.id), profiles.knownSecrets).testVisionCapability(createVisionProbeImage(), controller.signal)
        const latest = profiles.active
        if (current !== generation || !latest || signature !== JSON.stringify([latest.id, latest.baseUrl, latest.model, profiles.key(latest.id)])) return
        profiles.setVisionCapability(active.id, result); choose(); status(result === 'supported' ? '图片能力已验证，可以选择包装图片' : result === 'unsupported' ? '当前模型明确不支持图片，请在 AI 设置切换模型' : '测试未准确读取数字，图片能力仍待验证')
      } catch (error) { if (current === generation) { profiles.setVisionCapability(active.id, 'unknown'); status(errorText(error)) } }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); host.querySelector<HTMLButtonElement>('#vision-analyze')!.disabled = !images.length || profiles.active?.visionCapability !== 'supported' } controller = undefined }
    })
    host.querySelector('#vision-analyze')?.addEventListener('click', async () => {
      if (busy || !images.length) return
      if (!host.querySelector<HTMLInputElement>('#vision-consent')!.checked) { status('请先确认图片会发送给当前 AI 服务商'); return }
      const profile = profiles.active
      if (!profile || profile.visionCapability !== 'supported') { status('请先验证当前配置的图片能力'); return }
      const current = generation, key = profiles.key(profile.id), signature = JSON.stringify([profile.id, profile.baseUrl, profile.model, key]); controller = new AbortController(); setBusy(true); status('正在识别包装上的营养信息…')
      try { extraction = await analyzeFoodPackageImages({ client: new AiClient(profile, key, profiles.knownSecrets), images, signal: controller.signal, secrets: profiles.knownSecrets }); if (current !== generation || !dialog.isConnected) return; const latest = profiles.active; if (!latest || signature !== JSON.stringify([latest.id, latest.baseUrl, latest.model, profiles.key(latest.id)])) throw new AiError('configuration_changed', 'AI 配置已变化，请使用当前配置重新识别'); draft = draftFromLabel(extraction); review() }
      catch (error) { if (current === generation) status(errorText(error)) }
      finally { if (current === generation && dialog.isConnected) { setBusy(false); const analyze = host.querySelector<HTMLButtonElement>('#vision-analyze'); if (analyze) analyze.disabled = !images.length || profiles.active?.visionCapability !== 'supported' } controller = undefined }
    })
  }
  const review = () => {
    const basis = extraction?.basis, evidence = extraction ? [extraction.netQuantity.evidence, basis?.evidence, ...Object.values(extraction.nutrients).map(value => value.evidence)].filter(Boolean) : []
    const basisNames = { per_100g: '每 100 g', per_100ml: '每 100 mL', per_serving: '每份', per_package: '每包装', custom: '其它基准', unknown: '未识别基准' }
    host.innerHTML = `<button class="text-btn" id="vision-back-images" type="button">返回图片</button>${imageStrip()}<section class="vision-label-source"><h3>包装原文</h3><p>${esc(basis ? basisNames[basis.kind] : '手动核对')}</p>${evidence.length ? `<details><summary>查看包装原文</summary><div class="vision-evidence">${evidence.map(value => `<p>${esc(value)}</p>`).join('')}</div></details>` : ''}${extraction?.warnings.map(value => `<p class="vision-warning">${esc(value)}</p>`).join('') ?? ''}</section><p class="vision-note">核对的是同一个营养基准。空白宏量保持未知，不会补为 0。</p>${basis?.unit === 'ml' || basis?.kind === 'per_100ml' ? '<p class="vision-warning">标签按容量计算，mL 不能当作 g。请填写该营养基准对应的实际重量；不确定时请先测量。</p>' : ''}<form id="vision-review-form" class="form grid-form"><label class="full">食物名称 *<input name="name" maxlength="120" value="${esc(draft.name)}" required></label><label class="full">品牌<input name="brand" maxlength="120" value="${esc(draft.brand)}"></label><label class="full">这组营养值对应的重量 *<input name="referenceGrams" type="number" inputmode="decimal" min="0.000001" step="any" value="${draft.referenceGrams ?? ''}" placeholder="核对标签基准，不是默认净含量" required><span>g</span></label><label>能量 *<input name="energyValue" type="number" inputmode="decimal" min="0" step="any" value="${draft.energyValue ?? ''}" required></label><label>能量单位<select name="energyUnit"><option value="kcal" ${draft.energyUnit === 'kcal' ? 'selected' : ''}>kcal</option><option value="kJ" ${draft.energyUnit === 'kJ' ? 'selected' : ''}>kJ</option></select></label><p class="vision-energy full" id="vision-energy-converted"></p>${(['protein','carbs','fat'] as const).map(key => `<label>${{protein:'蛋白质',carbs:'碳水',fat:'脂肪'}[key]}<input name="${key}" type="number" inputmode="decimal" min="0" step="any" value="${draft[key] ?? ''}" placeholder="未知"><span>g</span></label>`).join('')}<label class="vision-consent full"><input id="vision-reviewed" type="checkbox" required>我已核对营养基准、单位和数值</label><p class="vision-status full" role="status"></p><button type="submit" class="primary full">预览保存食物</button><button type="button" class="secondary full" id="vision-save-log">预览保存并记录</button></form>`
    host.querySelectorAll('[data-remove-image]').forEach(button => button.remove()); bindImages()
    host.querySelector('#vision-back-images')?.addEventListener('click', () => { readDraft(); choose() })
    const form = host.querySelector<HTMLFormElement>('form')!
    const updateEnergy = () => { const data = new FormData(form), value = String(data.get('energyValue') ?? ''); const node = host.querySelector('#vision-energy-converted')!; try { const kcal = energyToKcal(Number(value), data.get('energyUnit') === 'kJ' ? 'kJ' : 'kcal'); node.textContent = value.trim() ? `${formatNumber(kcal)} kcal · ${formatNumber(kcalToKj(kcal))} kJ` : '能量未知，请核对后填写' } catch { node.textContent = '请填写有效能量' } }
    form.addEventListener('input', updateEnergy); form.addEventListener('change', updateEnergy); updateEnergy()
    const verifiedInput = () => { if (!form.reportValidity() || !host.querySelector<HTMLInputElement>('#vision-reviewed')!.checked) return undefined; readDraft(); return validateVisionFoodDraft(draft) }
    form.addEventListener('submit', event => { event.preventDefault(); try { const input = verifiedInput(); if (input) void preview(input) } catch (error) { status(errorText(error)) } })
    host.querySelector('#vision-save-log')?.addEventListener('click', () => { try { const input = verifiedInput(); if (input) quantity(input) } catch (error) { status(errorText(error)) } })
  }
  const readDraft = () => {
    const form = host.querySelector<HTMLFormElement>('#vision-review-form'); if (!form) return
    const data = new FormData(form), numeric = (key: string) => String(data.get(key) ?? '').trim() ? Number(data.get(key)) : null
    draft = { name: String(data.get('name') ?? ''), brand: String(data.get('brand') ?? ''), referenceGrams: numeric('referenceGrams'), energyValue: numeric('energyValue'), energyUnit: data.get('energyUnit') === 'kJ' ? 'kJ' : 'kcal', protein: numeric('protein'), carbs: numeric('carbs'), fat: numeric('fat') }
  }
  const quantity = (input: FoodVisionWrite['food'], existing?: Food) => {
    host.innerHTML = `<button type="button" class="text-btn" id="vision-quantity-back">${existing ? '返回已保存食物' : '返回核对'}</button><p class="vision-note">${esc(input.name)} · 实际吃下后再记录</p><form id="vision-intake-form" class="form"><label>记录日期<button type="button" class="date-picker-trigger" id="vision-date">${esc(datePickerLabel(intake.date))}</button></label><label>餐次<select name="meal" required><option value="">请选择餐次</option>${mealTypes.map(meal => `<option value="${meal}" ${intake.meal === meal ? 'selected' : ''}>${mealNames[meal]}</option>`).join('')}</select></label><label>实际吃了多少 *<input name="grams" type="number" inputmode="decimal" min="0.000001" step="any" value="${esc(intake.grams)}" required><span>g</span></label><p class="vision-energy" id="vision-intake-energy">填写克数后显示本地计算预览</p><p class="vision-status" role="status"></p><button class="primary" type="submit">预览${existing ? '饮食记录' : '保存并记录'}</button></form><div id="vision-date-picker" hidden></div>`
    const form = host.querySelector<HTMLFormElement>('form')!, dateHost = host.querySelector<HTMLElement>('#vision-date-picker')!
    const capture = () => { const data = new FormData(form); intake = { ...intake, meal: String(data.get('meal') ?? ''), grams: String(data.get('grams') ?? '') } }
    host.querySelector('#vision-date')?.addEventListener('click', () => { capture(); form.hidden = true; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = true; dateHost.hidden = false; const picker = mountDatePicker(dateHost, { value: intake.date, onConfirm: date => { intake.date = date!; form.querySelector('#vision-date')!.textContent = datePickerLabel(date!); picker.destroy(); dateHost.hidden = true; form.hidden = false; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = false }, onCancel: () => { picker.destroy(); dateHost.hidden = true; form.hidden = false; host.querySelector<HTMLElement>('#vision-quantity-back')!.hidden = false } }); dialog.addEventListener('close', () => picker.destroy(), { once: true }) })
    host.querySelector('#vision-quantity-back')?.addEventListener('click', () => { capture(); if (existing) done(existing); else review() })
    form.addEventListener('input', () => { const grams = Number(new FormData(form).get('grams')); host.querySelector('#vision-intake-energy')!.textContent = Number.isFinite(grams) && grams > 0 ? `${formatNumber(calculateNutrition(input, grams).calories)} kcal` : '填写克数后显示本地计算预览' })
    form.addEventListener('submit', event => { event.preventDefault(); capture(); try { const validated = validateVisionIntake({ date: intake.date, meal: intake.meal as MealType, grams: Number(intake.grams) }); void preview(input, validated, existing) } catch (error) { status(errorText(error)) } })
  }
  const preview = async (input: FoodVisionWrite['food'], actual?: VisionIntake, existing?: Food) => {
    if (busy) return
    setBusy(true)
    try {
      const duplicates = existing ? 0 : await db.foods.where('name').equals(input.name).filter(food => (food.brand ?? '').trim().toLowerCase() === (input.brand ?? '').trim().toLowerCase()).count()
      if (!dialog.isConnected) return
      pending = existing ? undefined : new FoodVisionWrite(input, actual)
      const totals = actual ? calculateNutrition(input, actual.grams) : undefined
      host.innerHTML = `<section class="vision-preview"><h3>${esc(input.name)}</h3>${input.brand ? `<p>${esc(input.brand)}</p>` : ''}<p>每 ${formatNumber(input.referenceGrams)} g</p><strong>${formatNumber(input.calories)} kcal · ${formatNumber(kcalToKj(input.calories))} kJ</strong><div class="vision-macros">${(['protein','carbs','fat'] as const).map(key => `<p>${{protein:'蛋白质',carbs:'碳水',fat:'脂肪'}[key]}：${input[key] === undefined ? '未知' : `${formatNumber(input[key]!)} g`}</p>`).join('')}</div>${duplicates ? '<p class="vision-warning">食物库已有同名同品牌食物。此次会新增一项，不覆盖原记录。</p>' : ''}${actual ? `<section class="vision-intake-preview"><h3>饮食记录</h3><p>${esc(actual.date)} · ${mealNames[actual.meal]}</p><p>实际 ${formatNumber(actual.grams)} g · ${formatNumber(totals!.calories)} kcal</p></section>` : '<p class="vision-note">只保存到食物库，不创建饮食记录。</p>'}<p class="vision-status" role="status"></p><button class="primary full-btn" type="button" id="vision-confirm">${existing ? '确认记录饮食' : actual ? '确认保存并记录' : '确认保存食物'}</button><button class="secondary full-btn" type="button" id="vision-edit">返回修改</button><button class="text-btn" type="button" id="vision-cancel">取消</button></section>`
      host.querySelector('#vision-edit')?.addEventListener('click', () => { pending?.cancel(); pending = undefined; if (actual) quantity(input, existing); else review() })
      host.querySelector('#vision-cancel')?.addEventListener('click', () => { pending?.cancel(); dialog.close() })
      host.querySelector('#vision-confirm')?.addEventListener('click', async () => {
        if (busy) return; setBusy(true); status('正在保存…')
        try {
          const result = existing ? { food: existing, log: await logReviewedVisionFood(existing, actual!) } : await pending!.confirm()
          savedFood = result.food; images = []; extraction = undefined; done(result.food, !!result.log)
          // Business success remains success if an owning page fails to refresh.
          try { await ui.onSaved(result.food, !!result.log) } catch { status('已保存；页面刷新未完成，关闭后重新打开即可查看') }
        } catch (error) { status(errorText(error)) }
        finally { setBusy(false) }
      })
    } catch (error) { status(errorText(error)) }
    finally { setBusy(false) }
  }
  const done = (food: Food, logged = false) => {
    host.innerHTML = `<section class="vision-done"><h3>${logged ? '食物与饮食记录已保存' : '食物已保存'}</h3><p>${esc(food.name)}</p><p class="vision-note">${logged ? `${esc(intake.date)} · ${mealNames[intake.meal as MealType]} · ${esc(intake.grams)} g` : '已加入食物库，可按实际吃下的克数记录饮食。'}</p>${logged ? '' : '<button class="primary full-btn" type="button" id="vision-continue-log">继续记录饮食</button>'}<button class="secondary full-btn" id="vision-finish" type="button">完成</button><p class="vision-status" role="status"></p></section>`
    host.querySelector('#vision-continue-log')?.addEventListener('click', () => quantity(food, savedFood ?? food))
    host.querySelector('#vision-finish')?.addEventListener('click', () => dialog.close())
  }
  choose()
}
