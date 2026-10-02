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
export function aiSettingsDetail(profiles = new AiProfiles()): string { const active = profiles.active; return active ? `已连接 · ${active.name} · ${active.model}` : '连接你自己的 AI 服务' }
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
    view(`<button class="text-btn" id="ai-settings-back">${icon('chevron', 16)} 返回</button><section class="ai-privacy-details"><h3>数据如何使用</h3><p>${AI_PRIVACY_TEXT}</p><h3>设备上的凭据</h3><p>${AI_CREDENTIAL_TEXT}</p><h3>包装图片</h3><p>${VISION_PRIVACY_TEXT}</p><p>${VISION_PROVIDER_PRIVACY_TEXT}</p></section>`, 'AI 隐私说明')
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
    const providerLabel = active.preset === 'zhipu' ? '智谱 GLM' : active.name.startsWith('自定义 · ') ? '自定义服务' : active.name
    const allowed = AI_SCOPES.filter(scope => profiles.permissions.read[scope]).length
    view(`<section class="ai-current-service ai-profile"><span class="ai-service-icon">${icon('sparkles', 22)}</span><div><span class="ai-eyebrow">当前服务</span><strong>${esc(providerLabel)}</strong><small>${esc(active.model)}</small></div></section><div class="ai-capabilities" aria-label="服务能力"><span>对话 · 可用</span><span>FitLog 数据 · ${capability(active.toolCapability)}</span><span>图片识别 · ${capability(active.visionCapability)}</span></div><button class="secondary full-btn" data-edit="${esc(active.id)}">编辑当前服务</button><div class="settings-group ai-settings-links"><button id="ai-permissions-open"><span><strong>隐私与权限</strong><small>${allowed} 项数据读取 · 写入建议${profiles.permissions.writeProposals ? '已开启' : '已关闭'}</small></span>${icon('chevron', 17)}</button><button id="ai-manage-profiles"><span><strong>管理服务与高级设置</strong><small>${profiles.profiles.length} 个已保存服务</small></span>${icon('chevron', 17)}</button></div><p class="ai-note">API Key 保存在当前设备。<br>仅发送完成请求所需的数据。</p><button class="text-btn" id="ai-privacy-details">隐私说明</button>`)
    host.querySelector('[data-edit]')!.addEventListener('click', () => editor(active)); host.querySelector('#ai-permissions-open')!.addEventListener('click', permissions); host.querySelector('#ai-manage-profiles')!.addEventListener('click', management); host.querySelector('#ai-privacy-details')!.addEventListener('click', privacy)
  }
  const editor = (initial?: AiProviderProfile) => {
    setSheetVariant(dialog, 'form')
    let existing = initial
    view(`<button class="text-btn" id="ai-settings-back">返回</button><form class="form ai-profile-form"><label>AI 服务<select name="preset"><option value="zhipu" ${!existing || existing.preset === 'zhipu' ? 'selected' : ''}>智谱 GLM</option><option value="custom" ${existing?.preset === 'custom' ? 'selected' : ''}>自定义 OpenAI 兼容服务</option></select></label><label data-base-url>API Base URL<input name="baseUrl" type="url" autocapitalize="off" spellcheck="false" value="${esc(existing?.baseUrl ?? ZHIPU_BASE_URL)}" placeholder="https://api.example.com/v1" required></label><label>API Key<input name="apiKey" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" value="" placeholder="${existing && profiles.key(existing.id) ? '已保存；留空则保持不变' : '粘贴你的 API Key'}"></label><div class="ai-model-field"><div class="ai-field-heading"><span>模型</span><button class="text-btn" type="button" id="ai-list-models">读取模型列表</button></div><select aria-label="选择模型" id="ai-model-select" hidden></select><input name="model" maxlength="200" autocapitalize="off" spellcheck="false" value="${esc(existing?.model ?? '')}" placeholder="填写模型 ID" aria-label="模型 ID" required><p class="ai-note" id="ai-model-note">可以读取服务的模型列表，或手动填写模型 ID。</p><button class="text-btn" type="button" id="ai-manual-model" hidden>手动填写模型 ID</button></div>${!profiles.privacyAcknowledged ? `<div class="ai-privacy"><p>API Key 保存在当前设备。提问及所需数据会发送给你选择的服务。</p><label><input id="ai-privacy-ack" type="checkbox">我知道了</label></div>` : ''}<button class="primary full-btn" type="submit">保存并测试</button><div class="ai-test-results" role="status" hidden><span data-result="connection">对话 · 待测试</span><span data-result="tools">FitLog 数据 · 待测试</span><span data-result="vision">图片识别 · 待测试</span></div><p class="ai-status" role="status"></p><details class="ai-advanced"><summary>高级设置</summary><button class="text-btn" type="button" id="ai-edit-endpoint">编辑接口地址</button><label>配置名称<input name="name" maxlength="80" value="${esc(existing?.name ?? '')}" placeholder="按服务和模型自动命名"></label><div class="ai-settings-tests"><button type="button" id="ai-test-connection">测试对话</button><button type="button" id="ai-test-tools">测试 FitLog 数据</button><button type="button" id="ai-test-vision">测试图片识别</button></div><button class="secondary full-btn" id="ai-save-only" type="button">仅保存配置</button>${existing ? '<button class="text-btn danger" type="button" id="ai-delete-profile">删除这份配置</button>' : ''}</details></form>`, existing ? '编辑 AI 服务' : '连接 AI 服务')
    const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.ai-status')!, base = form.querySelector<HTMLInputElement>('[name=baseUrl]')!, preset = form.querySelector<HTMLSelectElement>('[name=preset]')!, model = form.querySelector<HTMLInputElement>('[name=model]')!, modelSelect = form.querySelector<HTMLSelectElement>('#ai-model-select')!, note = form.querySelector<HTMLElement>('#ai-model-note')!, manual = form.querySelector<HTMLButtonElement>('#ai-manual-model')!
    const viewGeneration = generation
    const initialOption = document.createElement('option'); initialOption.value = model.value; initialOption.textContent = model.value || '读取列表后选择模型'; modelSelect.append(initialOption)
    modelSelect.hidden = false; model.hidden = true; model.required = false; manual.hidden = false
    let operation = 0, testedCapability: AiProviderProfile['toolCapability'], testedSignature: string | undefined, testedVision: AiProviderProfile['visionCapability'], testedVisionSignature: string | undefined
    const values = () => ({ name: form.querySelector<HTMLInputElement>('[name=name]')!.value.trim() || `${preset.value === 'zhipu' ? '智谱' : '自定义'} · ${model.value.trim()}`.slice(0, 80), baseUrl: base.value, model: model.value, preset: preset.value === 'zhipu' ? 'zhipu' as const : 'custom' as const })
    const key = () => form.querySelector<HTMLInputElement>('[name=apiKey]')!.value.trim() || (existing ? profiles.key(existing.id) : '')
    const signature = () => JSON.stringify([base.value.trim().replace(/\/+$/, ''), model.value.trim(), key()])
    const ack = () => { if (!profiles.privacyAcknowledged && !form.querySelector<HTMLInputElement>('#ai-privacy-ack')?.checked) throw new Error('privacy'); profiles.acknowledgePrivacy() }
    const busy = (state: boolean) => form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = state })
    const save = () => {
      ack(); const sig = signature(), saved = profiles.save(values(), form.querySelector<HTMLInputElement>('[name=apiKey]')!.value, existing?.id)
      if (testedSignature === sig && testedCapability && testedCapability !== 'unknown') profiles.setCapability(saved.id, testedCapability)
      if (testedVisionSignature === sig && testedVision) profiles.setVisionCapability(saved.id, testedVision)
      existing = saved; form.querySelector<HTMLInputElement>('[name=apiKey]')!.value = ''; form.querySelector<HTMLInputElement>('[name=apiKey]')!.placeholder = '已保存；留空则保持不变'; changed(); return saved
    }
    const test = async (mode: 'all' | 'connection' | 'tools' | 'vision' | 'models') => {
      const current = ++operation, token = new AbortController(); controller?.abort(); controller = token
      let capturedSignature = ''
      const valid = () => dialog.isConnected && generation === viewGeneration && operation === current && !token.signal.aborted && capturedSignature === signature()
      const errorMessage = (error: unknown) => error instanceof Error && error.message === 'privacy' ? '请先勾选“我知道了”' : safeAiError(error)
      try {
        ack(); busy(true)
        const profile: AiProviderProfile = mode === 'all' ? save() : { ...values(), id: existing?.id ?? 'draft', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' }
        capturedSignature = signature(); const client = new AiClient(profile, key(), profiles.knownSecrets)
        if (mode === 'models') {
          status.textContent = '正在读取模型列表…'
          try {
            const models = await client.listModels(token.signal); if (!valid()) return
            if (!models.length) throw new Error('empty models')
            const selected = model.value.trim(), missing = !!selected && !models.includes(selected)
            const ids = missing ? [selected, ...models] : models
            modelSelect.replaceChildren(...ids.map(id => { const option = document.createElement('option'); option.value = id; option.textContent = id; return option }))
            modelSelect.value = selected || ids[0]; model.value = modelSelect.value; model.hidden = true; modelSelect.hidden = false; manual.hidden = false
            note.textContent = missing ? '当前模型未出现在服务返回的列表中' : `已读取 ${models.length} 个模型，也可手动填写模型 ID。`
            status.textContent = note.textContent
          } catch { if (!valid()) return; model.hidden = false; modelSelect.hidden = true; manual.hidden = true; note.textContent = '没有读取到模型列表，可以手动填写模型 ID。'; status.textContent = note.textContent }
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
            else if (step === 'tools') { result = await client.testToolCapability(token.signal); if (!valid()) return; testedCapability = result; testedSignature = capturedSignature }
            else { result = await client.testVisionCapability(createVisionProbeImage(), token.signal); if (!valid()) return; testedVision = result; testedVisionSignature = capturedSignature }
            if (!valid()) return
            target.textContent = `${label} · ${result === 'supported' ? '已验证' : result === 'unsupported' ? '未支持' : '待验证'}`; target.dataset.state = result
            if (mode === 'all') { if (step === 'tools') profiles.setCapability(profile.id, result === 'supported' ? 'supported' : 'unsupported'); if (step === 'vision') profiles.setVisionCapability(profile.id, result); changed() }
            status.textContent = step === 'connection' ? '连接成功' : step === 'tools' ? result === 'supported' ? '已验证工具调用，保存后可读取数据和提出建议' : '当前模型可聊天，但未验证工具调用，因此暂时不能读取或修改 FitLog 数据。' : result === 'supported' ? '图片识别已验证，保存后可拍包装录入' : result === 'unsupported' ? '当前模型或接口明确不支持图片识别' : '图片测试未准确返回三个数字，能力仍待验证'
          } catch (error) { if (!valid()) return; target.textContent = `${label} · ${errorMessage(error)}`; target.dataset.state = 'error'; target.title = errorMessage(error); status.textContent = errorMessage(error) }
        }
        if (mode === 'all' && valid()) status.textContent = '配置已保存。各项能力可以独立使用。'
      } catch (error) { if (dialog.isConnected && generation === viewGeneration && operation === current) status.textContent = errorMessage(error) }
      finally { if (generation === viewGeneration && operation === current) { busy(false); if (controller === token) controller = undefined } }
    }
    const resetModels = () => { modelSelect.replaceChildren(); const option = document.createElement('option'); option.value = model.value; option.textContent = model.value || '读取列表后选择模型'; modelSelect.append(option); modelSelect.hidden = false; model.hidden = true; manual.hidden = false; note.textContent = '可以读取服务的模型列表，或手动填写模型 ID。' }
    preset.addEventListener('change', () => { if (preset.value === 'zhipu') base.value = ZHIPU_BASE_URL; else if (base.value === ZHIPU_BASE_URL) base.value = ''; form.querySelector<HTMLElement>('[data-base-url]')!.hidden = preset.value === 'zhipu'; resetModels() })
    form.querySelector<HTMLElement>('[data-base-url]')!.hidden = preset.value === 'zhipu'
    form.querySelector('#ai-edit-endpoint')!.addEventListener('click', () => { form.querySelector<HTMLElement>('[data-base-url]')!.hidden = false })
    modelSelect.addEventListener('change', () => { model.value = modelSelect.value })
    manual.addEventListener('click', () => { model.hidden = false; modelSelect.hidden = true; manual.hidden = true })
    form.addEventListener('input', event => { if ((event.target as Element).matches('[name=baseUrl], [name=apiKey], [name=model], [name=preset], #ai-model-select')) { operation++; controller?.abort(); busy(false); if ((event.target as Element).matches('[name=baseUrl], [name=apiKey]')) resetModels() } })
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
