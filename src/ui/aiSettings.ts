import { VOICE_PRIVACY_TEXT } from '../services/speechRecognitionService'
import { aiProviderLabel } from './aiUiHelpers'
import { getVisionModel } from '../ai/modelRouting'
import { AiError } from '../ai/security'
import { setSheetVariant } from './sheetController'
import { AiProfiles, AI_SCOPES, ZHIPU_BASE_URL } from '../services/aiProfiles'
import { AiClient } from '../services/aiProvider'
import { createVisionProbeImage } from '../ai/visionImages'
import { VISION_PRIVACY_TEXT, VISION_PROVIDER_PRIVACY_TEXT } from '../ai/visionPrivacy'
import { safeAiError } from '../ai/security'
import type { AiProviderProfile, AiScope } from '../ai/types'
import { icon } from './icons'

export interface AiSettingsUi { openModal: (title: string, body: string, wide?: boolean) => HTMLDialogElement; esc: (value: unknown) => string; changed?: () => void }
export const AI_SCOPE_LABELS: Record<AiScope, string> = { food: '饮食', training: '训练', weight: '体重', plan: '计划', habit: '习惯', nutritionTargets: '营养目标' }
export const AI_PRIVACY_TEXT = 'AI 功能会把你的提问，以及完成当前请求所需的 FitLog 数据发送给你配置的 AI 服务商。FitLog 不会自动上传整个数据库。'
export const AI_CREDENTIAL_TEXT = 'API Key 只保存在当前设备浏览器。本模式适用于你自己的私人 FitLog；同源脚本和浏览器环境理论上能够访问该凭据。'
export function aiSettingsDetail(profiles = new AiProfiles()): string {
  const active = profiles.active
  if (!active) return '连接你自己的 AI 服务'
  const service = active.preset === 'zhipu' ? '智谱' : '自定义服务'
  return `已连接 · ${service}${active.visionModel ? ' · 对话与图片已配置' : ''}`
}
const capability = (value: AiProviderProfile['toolCapability']) => value === 'supported' ? '已验证' : value === 'unsupported' ? '未支持' : '待验证'
export function showAiSettings(ui: AiSettingsUi, profiles = new AiProfiles()): void {
  const dialog = ui.openModal('AI 设置', '<div id="ai-settings"></div>', true)
  dialog.classList.add('ai-settings-sheet')
  const host = dialog.querySelector<HTMLElement>('#ai-settings')!, esc = ui.esc
  let controller: AbortController | undefined, generation = 0
  const changed = () => ui.changed?.()
  const view = (html: string, title = 'AI 设置') => { controller?.abort(); controller = undefined; generation++; host.innerHTML = html; dialog.querySelector('h2')!.textContent = title; dialog.querySelector('.modal-body')!.scrollTop = 0 }
  dialog.addEventListener('close', () => { generation++; controller?.abort() }, { once: true })
  const privacy = () => {
    view(`<button class="text-btn" id="ai-settings-back">${icon('chevron', 16)} 返回</button><section class="ai-privacy-details"><h3>数据如何使用</h3><p>${AI_PRIVACY_TEXT}</p><h3>设备上的凭据</h3><p>${AI_CREDENTIAL_TEXT}</p><h3>语音输入</h3><p>${VOICE_PRIVACY_TEXT}</p><h3>包装图片</h3><p>${VISION_PRIVACY_TEXT}</p><p>${VISION_PROVIDER_PRIVACY_TEXT}</p></section>`, 'AI 隐私说明')
    host.querySelector('#ai-settings-back')!.addEventListener('click', overview)
  }
  const permissions = () => {
    const current = profiles.permissions
    view(`<button class="text-btn" id="ai-settings-back">返回</button><h3>允许读取的数据</h3><div class="ai-permissions">${AI_SCOPES.map(scope => `<label><span>${AI_SCOPE_LABELS[scope]}</span><input type="checkbox" role="switch" aria-label="允许读取${AI_SCOPE_LABELS[scope]}" data-scope="${scope}" ${current.read[scope] ? 'checked' : ''}></label>`).join('')}</div><div class="ai-permissions"><label><span>允许提出写入建议</span><input type="checkbox" role="switch" aria-label="允许提出写入建议" id="ai-write-permission" ${current.writeProposals ? 'checked' : ''}></label></div><p class="ai-note">写入建议始终需要你确认。</p><button class="text-btn" id="ai-privacy-details">查看隐私说明</button>`, '隐私与权限')
    const save = () => { const next = profiles.permissions; host.querySelectorAll<HTMLInputElement>('[data-scope]').forEach(input => { next.read[input.dataset.scope as AiScope] = input.checked }); next.writeProposals = host.querySelector<HTMLInputElement>('#ai-write-permission')!.checked; profiles.setPermissions(next); changed() }
    host.querySelectorAll('input').forEach(input => input.addEventListener('change', save))
    host.querySelector('#ai-settings-back')!.addEventListener('click', overview); host.querySelector('#ai-privacy-details')!.addEventListener('click', privacy)
  }
  const management = () => {
    view(`<button class="text-btn" id="ai-settings-back">返回</button><div class="ai-profiles">${profiles.profiles.map(profile => `<article class="ai-profile"><div><strong>${esc(profile.name)}</strong><small>${esc(profile.model)}</small></div><div class="ai-profile-actions"><button data-activate="${esc(profile.id)}" ${profiles.active?.id === profile.id ? 'disabled' : ''}>${profiles.active?.id === profile.id ? '使用中' : '使用'}</button><button data-edit="${esc(profile.id)}">编辑</button></div></article>`).join('')}</div><button class="secondary full-btn" id="ai-add-profile">添加服务</button>`, '管理 AI 服务')
    host.querySelector('#ai-settings-back')!.addEventListener('click', overview); host.querySelector('#ai-add-profile')!.addEventListener('click', () => editor())
    host.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(button => button.addEventListener('click', () => editor(profiles.profiles.find(profile => profile.id === button.dataset.edit))))
    host.querySelectorAll<HTMLButtonElement>('[data-activate]').forEach(button => button.addEventListener('click', () => { profiles.activate(button.dataset.activate!); changed(); management() }))
  }
  const overview = () => {
    setSheetVariant(dialog, 'content')
    const active = profiles.active
    if (!active) { editor(); return }
    const providerLabel = active.preset === 'zhipu' ? '智谱 GLM' : aiProviderLabel(active)
    const allowed = AI_SCOPES.filter(scope => profiles.permissions.read[scope]).length
    view(`<section class="ai-current-service ai-profile"><span class="ai-service-icon">${icon('sparkles', 22)}</span><div><span class="ai-eyebrow">当前服务</span><strong>${esc(providerLabel)}</strong><small>聊天 / 数据 · ${esc(active.model)}</small>${active.visionModel ? `<small>图片 · ${esc(getVisionModel(active))}</small>` : ''}</div></section><div class="ai-capabilities" aria-label="服务能力"><span>对话 · ${active.toolCapability === 'supported' ? '已验证' : '可用'}</span><span>FitLog 数据 · ${capability(active.toolCapability)}</span><span>图片识别 · ${active.visionModel ? `${esc(getVisionModel(active))} · ` : ''}${capability(active.visionCapability)}</span></div>${active.visionCapability === 'unsupported' && !active.visionModel ? '<div class="ai-vision-advice"><p class="ai-note">当前模型不接受图片输入，可以为图片识别单独选择另一个模型。</p><button class="text-btn" id="ai-choose-vision">选择图片模型</button></div>' : ''}<button class="secondary full-btn" data-edit="${esc(active.id)}">编辑当前服务</button><div class="settings-group ai-settings-links"><button id="ai-permissions-open"><span><strong>隐私与权限</strong><small>${allowed} 项数据读取 · 写入建议${profiles.permissions.writeProposals ? '已开启' : '已关闭'}</small></span>${icon('chevron', 17)}</button><button id="ai-manage-profiles"><span><strong>管理服务与高级设置</strong><small>${profiles.profiles.length} 个已保存服务</small></span>${icon('chevron', 17)}</button></div><p class="ai-note">API Key 保存在当前设备。<br>仅发送完成请求所需的数据。</p><button class="text-btn" id="ai-privacy-details">隐私说明</button>`)
    host.querySelector('[data-edit]')!.addEventListener('click', () => editor(active)); host.querySelector('#ai-choose-vision')?.addEventListener('click', () => editor(active, true)); host.querySelector('#ai-permissions-open')!.addEventListener('click', permissions); host.querySelector('#ai-manage-profiles')!.addEventListener('click', management); host.querySelector('#ai-privacy-details')!.addEventListener('click', privacy)
  }
  const editor = (initial?: AiProviderProfile, chooseVision = false) => {
    setSheetVariant(dialog, 'form')
    let existing = initial
    view(`<button class="text-btn" id="ai-settings-back">返回</button><form class="form ai-profile-form"><label>AI 服务<select name="preset"><option value="zhipu" ${!existing || existing.preset === 'zhipu' ? 'selected' : ''}>智谱 GLM</option><option value="custom" ${existing?.preset === 'custom' ? 'selected' : ''}>自定义 OpenAI 兼容服务</option></select></label><label data-base-url>API Base URL<input name="baseUrl" type="url" autocapitalize="off" spellcheck="false" value="${esc(existing?.baseUrl ?? ZHIPU_BASE_URL)}" placeholder="https://api.example.com/v1" required></label><label>API Key<input name="apiKey" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" value="" placeholder="${existing && profiles.key(existing.id) ? '已保存；留空则保持不变' : '粘贴你的 API Key'}"></label><div class="ai-model-field"><div class="ai-field-heading"><span>对话与 FitLog 数据模型</span><button class="text-btn" type="button" id="ai-list-models">读取模型列表</button></div><select aria-label="选择模型" id="ai-model-select" hidden></select><input name="model" maxlength="200" autocapitalize="off" spellcheck="false" value="${esc(existing?.model ?? '')}" placeholder="填写模型 ID" aria-label="模型 ID" required><p class="ai-note" id="ai-model-note">可以读取服务的模型列表，或手动填写模型 ID。</p><button class="text-btn" type="button" id="ai-manual-model" hidden>手动填写模型 ID</button></div><fieldset class="ai-image-routing"><legend>图片识别</legend><label class="ai-model-choice radio"><input type="radio" name="imageRouting" value="same" ${!existing?.visionModel && !chooseVision ? 'checked' : ''}>使用同一个模型</label><label class="ai-model-choice radio"><input type="radio" name="imageRouting" value="separate" ${existing?.visionModel || chooseVision ? 'checked' : ''}>单独选择图片模型</label><div class="ai-model-field" id="ai-vision-field" hidden><label for="ai-vision-model-select">图片识别模型</label><select aria-label="选择图片模型" id="ai-vision-model-select"></select><input name="visionModel" maxlength="200" autocapitalize="off" spellcheck="false" value="${esc(existing?.visionModel ?? '')}" placeholder="填写图片模型 ID" aria-label="图片模型 ID" hidden><p class="ai-note" id="ai-vision-model-note">复用已读取的模型列表，图片能力以测试结果为准。</p><button class="text-btn" type="button" id="ai-manual-vision-model">手动填写图片模型 ID</button></div></fieldset>${!profiles.privacyAcknowledged ? `<div class="ai-privacy"><p>API Key 保存在当前设备。提问及所需数据会发送给你选择的服务。</p><label><input id="ai-privacy-ack" type="checkbox">我知道了</label></div>` : ''}<button class="primary full-btn" type="submit">保存并测试</button><div class="ai-test-results" role="status" hidden><span data-result="connection">对话 · 待测试</span><span data-result="tools">FitLog 数据 · 待测试</span><span data-result="vision">图片识别 · 待测试</span></div><div class="ai-vision-advice" id="ai-vision-advice" hidden><p class="ai-note">当前模型不接受图片输入，可以为图片识别单独选择另一个模型。</p><button class="text-btn" type="button" id="ai-choose-vision">选择图片模型</button></div><p class="ai-status" role="status"></p><details class="ai-advanced"><summary>高级设置</summary><button class="text-btn" type="button" id="ai-edit-endpoint">编辑接口地址</button><label>配置名称<input name="name" maxlength="80" value="${esc(existing?.name ?? '')}" placeholder="按服务和模型自动命名"></label><div class="ai-settings-tests"><button type="button" id="ai-test-connection">测试对话</button><button type="button" id="ai-test-tools">测试 FitLog 数据</button><button type="button" id="ai-test-vision">测试图片识别</button></div><button class="secondary full-btn" id="ai-save-only" type="button">仅保存配置</button>${existing ? '<button class="text-btn danger" type="button" id="ai-delete-profile">删除这份配置</button>' : ''}</details></form>`, existing ? '编辑 AI 服务' : '连接 AI 服务')
    const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.ai-status')!, base = form.querySelector<HTMLInputElement>('[name=baseUrl]')!, preset = form.querySelector<HTMLSelectElement>('[name=preset]')!, model = form.querySelector<HTMLInputElement>('[name=model]')!, modelSelect = form.querySelector<HTMLSelectElement>('#ai-model-select')!, note = form.querySelector<HTMLElement>('#ai-model-note')!, manual = form.querySelector<HTMLButtonElement>('#ai-manual-model')!
    const vision = form.querySelector<HTMLInputElement>('[name=visionModel]')!, visionSelect = form.querySelector<HTMLSelectElement>('#ai-vision-model-select')!, visionField = form.querySelector<HTMLElement>('#ai-vision-field')!, visionNote = form.querySelector<HTMLElement>('#ai-vision-model-note')!, visionManual = form.querySelector<HTMLButtonElement>('#ai-manual-vision-model')!
    const independent = () => form.querySelector<HTMLInputElement>('[name=imageRouting]:checked')!.value === 'separate'
    const viewGeneration = generation
    // One editor-session cache, shared by both selectors; no request on expansion.
    let models: string[] | undefined, modelsFailed = false
    const populate = (input: HTMLInputElement, select: HTMLSelectElement, helper: HTMLElement, manualButton: HTMLButtonElement, image = false) => {
      const selected = input.value.trim(), missing = !!models && !!selected && !models.includes(selected)
      const ids = models ? missing ? [selected, ...models] : models : selected ? [selected] : []
      select.replaceChildren()
      if (!ids.length || image && !selected) { const option = document.createElement('option'); option.value = ''; option.textContent = models ? '选择图片模型' : '读取列表后选择模型'; select.append(option) }
      for (const id of ids) { const option = document.createElement('option'); option.value = id; option.textContent = id; select.append(option) }
      select.value = selected || (image ? '' : ids[0] ?? ''); input.value = select.value
      select.hidden = modelsFailed; input.hidden = !modelsFailed; manualButton.hidden = modelsFailed
      helper.textContent = modelsFailed ? '没有读取到模型列表，可以手动填写模型 ID。' : missing ? '当前模型未出现在服务返回的列表中' : models ? `已读取 ${models.length} 个模型，也可手动填写模型 ID。` : image ? '复用已读取的模型列表，图片能力以测试结果为准。' : '可以读取服务的模型列表，或手动填写模型 ID。'
    }
    const displayModels = () => { populate(model, modelSelect, note, manual); populate(vision, visionSelect, visionNote, visionManual, true); model.required = false; visionField.hidden = !independent() }
    displayModels()
    let operation = 0, testedCapability: AiProviderProfile['toolCapability'], testedSignature: string | undefined, testedVision: AiProviderProfile['visionCapability'], testedVisionSignature: string | undefined
    const values = () => ({ name: form.querySelector<HTMLInputElement>('[name=name]')!.value.trim() || `${preset.value === 'zhipu' ? '智谱' : '自定义'} · ${model.value.trim()}`.slice(0, 80), baseUrl: base.value, model: model.value, visionModel: independent() ? vision.value : undefined, preset: preset.value === 'zhipu' ? 'zhipu' as const : 'custom' as const })
    const key = () => form.querySelector<HTMLInputElement>('[name=apiKey]')!.value.trim() || (existing ? profiles.key(existing.id) : '')
    const chatSignature = () => JSON.stringify([base.value.trim().replace(/\/+$/, ''), model.value.trim(), key()])
    const visionSignature = () => JSON.stringify([base.value.trim().replace(/\/+$/, ''), getVisionModel(values()), key()])
    const signature = () => JSON.stringify([chatSignature(), visionSignature()])
    const ack = () => { if (!profiles.privacyAcknowledged && !form.querySelector<HTMLInputElement>('#ai-privacy-ack')?.checked) throw new Error('privacy'); profiles.acknowledgePrivacy() }
    const busy = (state: boolean) => form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = state })
    const save = () => {
      ack(); if (independent() && !vision.value.trim()) throw new AiError('invalid_profile', '请选择或填写图片模型 ID')
      const sig = chatSignature(), visionSig = visionSignature(), saved = profiles.save(values(), form.querySelector<HTMLInputElement>('[name=apiKey]')!.value, existing?.id)
      if (testedSignature === sig && testedCapability && testedCapability !== 'unknown') profiles.setCapability(saved.id, testedCapability)
      if (testedVisionSignature === visionSig && testedVision) profiles.setVisionCapability(saved.id, testedVision)
      existing = saved; form.querySelector<HTMLInputElement>('[name=apiKey]')!.value = ''; form.querySelector<HTMLInputElement>('[name=apiKey]')!.placeholder = '已保存；留空则保持不变'; changed(); return saved
    }
    const test = async (mode: 'all' | 'connection' | 'tools' | 'vision' | 'models') => {
      const current = ++operation, token = new AbortController(); controller?.abort(); controller = token
      let capturedSignature = '', capturedChat = '', capturedVision = '', visionFailed = false
      const valid = () => dialog.isConnected && generation === viewGeneration && operation === current && !token.signal.aborted && capturedSignature === signature()
      const errorMessage = (error: unknown) => error instanceof Error && error.message === 'privacy' ? '请先勾选“我知道了”' : safeAiError(error)
      try {
        ack(); if ((mode === 'all' || mode === 'vision') && independent() && !vision.value.trim()) throw new AiError('invalid_profile', '请选择或填写图片模型 ID')
        busy(true)
        const profile: AiProviderProfile = mode === 'all' ? save() : { ...values(), id: existing?.id ?? 'draft', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' }
        capturedSignature = signature(); capturedChat = chatSignature(); capturedVision = visionSignature(); const client = new AiClient(profile, key(), profiles.knownSecrets)
        if (mode === 'models') {
          status.textContent = '正在读取模型列表…'
          try {
            const returned = await client.listModels(token.signal); if (!valid()) return
            if (!returned.length) throw new Error('empty models')
            models = returned; modelsFailed = false; displayModels(); status.textContent = note.textContent
          } catch { if (!valid()) return; models = undefined; modelsFailed = true; displayModels(); status.textContent = note.textContent }
          return
        }
        const operations = mode === 'all' ? ['connection', 'tools', 'vision'] as const : [mode] as ('connection' | 'tools' | 'vision')[]
        const results = form.querySelector<HTMLElement>('.ai-test-results')!; results.hidden = false
        for (const step of operations) {
          if (!valid()) return
          const target = results.querySelector<HTMLElement>(`[data-result=${step}]`)!, label = { connection: '对话', tools: 'FitLog 数据', vision: '图片识别' }[step]
          target.textContent = `${label} · 测试中`; target.dataset.state = 'pending'; status.textContent = '正在测试服务能力…'
          try {
            let result: AiProviderProfile['toolCapability'] = 'supported'
            if (step === 'connection') await client.testConnection(token.signal)
            else if (step === 'tools') { result = await client.testToolCapability(token.signal); if (!valid()) return; testedCapability = result; testedSignature = capturedChat }
            else { result = await client.testVisionCapability(createVisionProbeImage(), token.signal); if (!valid()) return; testedVision = result; testedVisionSignature = capturedVision; visionFailed = result !== 'supported' }
            if (!valid()) return
            target.textContent = `${label} · ${result === 'supported' ? '已验证' : result === 'unsupported' ? '未支持' : '待验证'}`; target.dataset.state = result
            if (mode === 'all') { if (step === 'tools') profiles.setCapability(profile.id, result === 'supported' ? 'supported' : 'unsupported'); if (step === 'vision') profiles.setVisionCapability(profile.id, result); changed() }
            status.textContent = step === 'connection' ? '连接成功' : step === 'tools' ? result === 'supported' ? '已验证工具调用，保存后可读取数据和提出建议' : '当前模型可聊天，但未验证工具调用，因此暂时不能读取或修改 FitLog 数据。' : result === 'supported' ? '图片识别已验证，保存后可拍包装录入' : result === 'unsupported' ? '当前模型或接口明确不支持图片识别' : '图片测试未准确返回三个数字，能力仍待验证'
          } catch (error) { if (!valid()) return; if (step === 'vision') visionFailed = true; target.textContent = `${label} · ${errorMessage(error)}`; target.dataset.state = 'error'; target.title = errorMessage(error); status.textContent = errorMessage(error) }
        }
        if (valid()) {
          const advice = form.querySelector<HTMLElement>('#ai-vision-advice')!
          advice.hidden = independent() || !visionFailed
          advice.querySelector('p')!.textContent = testedVision === 'unsupported' ? '当前模型不接受图片输入，可以为图片识别单独选择另一个模型。' : '图片识别未通过，可以为图片识别单独选择另一个模型。'
        }
        if (mode === 'all' && valid()) status.textContent = '配置已保存。各项能力可以独立使用。'
      } catch (error) { if (dialog.isConnected && generation === viewGeneration && operation === current) status.textContent = errorMessage(error) }
      finally { if (generation === viewGeneration && operation === current) { busy(false); if (controller === token) controller = undefined } }
    }
    const resetModels = () => { models = undefined; modelsFailed = false; displayModels() }
    preset.addEventListener('change', () => { if (preset.value === 'zhipu') base.value = ZHIPU_BASE_URL; else if (base.value === ZHIPU_BASE_URL) base.value = ''; form.querySelector<HTMLElement>('[data-base-url]')!.hidden = preset.value === 'zhipu'; resetModels() })
    form.querySelector<HTMLElement>('[data-base-url]')!.hidden = preset.value === 'zhipu'
    form.querySelector('#ai-edit-endpoint')!.addEventListener('click', () => { form.querySelector<HTMLElement>('[data-base-url]')!.hidden = false })
    modelSelect.addEventListener('change', () => { model.value = modelSelect.value })
    visionSelect.addEventListener('change', () => { vision.value = visionSelect.value })
    manual.addEventListener('click', () => { model.hidden = false; modelSelect.hidden = true; manual.hidden = true })
    visionManual.addEventListener('click', () => { vision.hidden = false; visionSelect.hidden = true; visionManual.hidden = true })
    const selectVision = () => { form.querySelector<HTMLInputElement>('[name=imageRouting][value=separate]')!.checked = true; visionField.hidden = false; form.querySelector<HTMLElement>('#ai-vision-advice')!.hidden = true }
    form.querySelector('#ai-choose-vision')!.addEventListener('click', selectVision)
    form.querySelectorAll<HTMLInputElement>('[name=imageRouting]').forEach(input => input.addEventListener('change', () => { visionField.hidden = !independent(); form.querySelector<HTMLElement>('#ai-vision-advice')!.hidden = true }))
    form.addEventListener('input', event => { if ((event.target as Element).matches('[name=baseUrl], [name=apiKey], [name=model], [name=visionModel], [name=imageRouting], [name=preset], #ai-model-select, #ai-vision-model-select')) { operation++; controller?.abort(); busy(false); form.querySelector<HTMLElement>('#ai-vision-advice')!.hidden = true; if ((event.target as Element).matches('[name=baseUrl], [name=apiKey]')) resetModels() } })
    form.addEventListener('submit', event => { event.preventDefault(); void test('all') })
    for (const mode of ['connection', 'tools', 'vision', 'models'] as const) form.querySelector(`#ai-${mode === 'models' ? 'list-models' : `test-${mode}`}`)!.addEventListener('click', () => void test(mode))
    form.querySelector('#ai-save-only')!.addEventListener('click', () => { try { save(); overview() } catch (error) { status.textContent = error instanceof Error && error.message === 'privacy' ? '请先勾选“我知道了”' : safeAiError(error) } })
    host.querySelector('#ai-settings-back')!.addEventListener('click', () => profiles.active ? overview() : management())
    form.querySelector('#ai-delete-profile')?.addEventListener('click', () => {
      view('<h3>删除这份 AI 配置？</h3><p class="ai-note">将移除此设备的配置和 API Key。</p><button class="danger-button full-btn" id="ai-confirm-delete">确认删除配置</button><button class="secondary full-btn" id="ai-cancel-delete">取消</button>')
      host.querySelector('#ai-confirm-delete')!.addEventListener('click', () => { profiles.delete(existing!.id); changed(); overview() }); host.querySelector('#ai-cancel-delete')!.addEventListener('click', () => editor(existing))
    })
  }
  overview()
}
