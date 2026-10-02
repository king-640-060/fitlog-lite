import { AiProfiles, AI_SCOPES, ZHIPU_BASE_URL } from '../services/aiProfiles'
import { AiClient } from '../services/aiProvider'
import { createVisionProbeImage } from '../ai/visionImages'
import { VISION_PRIVACY_TEXT, VISION_PROVIDER_PRIVACY_TEXT } from '../ai/visionPrivacy'
import { safeAiError } from '../ai/security'
import type { AiProviderProfile, AiScope } from '../ai/types'

export interface AiSettingsUi { openModal: (title: string, body: string, wide?: boolean) => HTMLDialogElement; esc: (value: unknown) => string; changed?: () => void }
export const AI_SCOPE_LABELS: Record<AiScope, string> = { food: '饮食', training: '训练', weight: '体重', plan: '计划', habit: '习惯', nutritionTargets: '营养目标' }
export const AI_PRIVACY_TEXT = 'AI 功能会把你的提问，以及完成当前请求所需的 FitLog 数据发送给你配置的 AI 服务商。FitLog 不会自动上传整个数据库。'
export const AI_CREDENTIAL_TEXT = 'API Key 只保存在当前设备浏览器。本模式适用于你自己的私人 FitLog；同源脚本和浏览器环境理论上能够访问该凭据。'
export function aiSettingsDetail(profiles = new AiProfiles()): string { const active = profiles.active; return active ? `已连接 · ${active.name} · ${active.model}` : '连接你自己的 AI 服务' }
export function showAiSettings(ui: AiSettingsUi, profiles = new AiProfiles()): void {
  const dialog = ui.openModal('AI 设置', '<div id="ai-settings"></div>', true)
  dialog.classList.add('ai-settings-sheet')
  const host = dialog.querySelector<HTMLElement>('#ai-settings')!, esc = ui.esc
  let controller: AbortController | undefined
  dialog.addEventListener('close', () => controller?.abort(), { once: true })
  const changed = () => ui.changed?.()
  const overview = () => {
    const permissions = profiles.permissions
    host.innerHTML = `<p class="ai-note">连接你自己的 AI 服务。支持兼容 OpenAI 的聊天接口；所有配置均可编辑。</p><div class="ai-profiles">${profiles.profiles.map(profile => `<article class="ai-profile"><div><strong>${esc(profile.name)}</strong><small>${esc(profile.model)}</small><small>对话：可用 · 工具：${profile.toolCapability === 'supported' ? '已验证' : profile.toolCapability === 'unsupported' ? '未支持' : '待验证'} · 图片：${profile.visionCapability === 'supported' ? '已验证' : profile.visionCapability === 'unsupported' ? '未支持' : '待验证'}</small></div><div class="ai-profile-actions"><button data-activate="${esc(profile.id)}" ${profiles.active?.id === profile.id ? 'disabled' : ''}>${profiles.active?.id === profile.id ? '使用中' : '使用'}</button><button data-edit="${esc(profile.id)}">编辑</button></div></article>`).join('')}</div><button class="secondary full-btn" id="ai-add-profile">添加 AI 配置</button><section class="settings-section"><h3>允许 AI 读取</h3><div class="ai-permissions">${AI_SCOPES.map(scope => `<label><span>${AI_SCOPE_LABELS[scope]}</span><input type="checkbox" data-scope="${scope}" ${permissions.read[scope] ? 'checked' : ''}></label>`).join('')}<label><span>允许提出写入建议</span><input type="checkbox" id="ai-write-permission" ${permissions.writeProposals ? 'checked' : ''}></label></div><p class="ai-note">写入建议始终需要你确认。关闭后仍可聊天或读取已授权的数据。</p></section><section class="settings-section"><h3>隐私与凭据</h3><p class="ai-note">${AI_PRIVACY_TEXT}</p><p class="ai-note">${AI_CREDENTIAL_TEXT}</p><p class="ai-note">${VISION_PRIVACY_TEXT}</p><p class="ai-note">${VISION_PROVIDER_PRIVACY_TEXT}</p></section>`
    host.querySelector('#ai-add-profile')?.addEventListener('click', () => editor())
    host.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(button => button.addEventListener('click', () => editor(profiles.profiles.find(profile => profile.id === button.dataset.edit))))
    host.querySelectorAll<HTMLButtonElement>('[data-activate]').forEach(button => button.addEventListener('click', () => { profiles.activate(button.dataset.activate!); changed(); overview() }))
    const savePermissions = () => {
      const next = profiles.permissions
      host.querySelectorAll<HTMLInputElement>('[data-scope]').forEach(input => { next.read[input.dataset.scope as AiScope] = input.checked })
      next.writeProposals = host.querySelector<HTMLInputElement>('#ai-write-permission')!.checked
      profiles.setPermissions(next); changed()
    }
    host.querySelectorAll('input[type=checkbox]').forEach(input => input.addEventListener('change', savePermissions))
  }
  const editor = (existing?: AiProviderProfile) => {
    host.innerHTML = `<button class="text-btn" id="ai-settings-back">返回配置列表</button><form class="form ai-profile-form"><label>配置名称<input name="name" maxlength="80" value="${esc(existing?.name ?? '')}" placeholder="我的 AI 服务" required></label><label>服务预设<select name="preset"><option value="custom" ${existing?.preset !== 'zhipu' ? 'selected' : ''}>自定义服务</option><option value="zhipu" ${existing?.preset === 'zhipu' ? 'selected' : ''}>智谱（地址预设）</option></select></label><label>API Base URL<input name="baseUrl" type="url" autocapitalize="off" spellcheck="false" value="${esc(existing?.baseUrl ?? '')}" placeholder="https://api.example.com/v1" required></label><label>API Key<input name="apiKey" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" value="" placeholder="${existing && profiles.key(existing.id) ? '已保存；留空则保持不变' : '粘贴你的 API Key'}"></label><p class="ai-note">${AI_CREDENTIAL_TEXT}</p><label>模型名称<input name="model" list="ai-models" maxlength="200" autocapitalize="off" spellcheck="false" value="${esc(existing?.model ?? '')}" placeholder="填写服务支持的模型名称" required></label><datalist id="ai-models"></datalist><div class="ai-settings-tests"><button type="button" id="ai-test-connection">测试连接</button><button type="button" id="ai-test-tools">测试工具调用</button><button type="button" id="ai-test-vision">测试图片识别</button><button type="button" id="ai-list-models">读取模型列表</button></div>${!profiles.privacyAcknowledged ? `<div class="ai-privacy"><p>${AI_PRIVACY_TEXT}</p><label><input id="ai-privacy-ack" type="checkbox">我知道了</label></div>` : ''}<p class="ai-status" role="status"></p><button class="primary full-btn" type="submit">保存配置</button>${existing ? '<button class="text-btn danger" type="button" id="ai-delete-profile">删除这份配置</button>' : ''}</form>`
    const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.ai-status')!
    let testedCapability: AiProviderProfile['toolCapability'], testedSignature: string | undefined
    let testedVision: AiProviderProfile['visionCapability'], testedVisionSignature: string | undefined
    const values = () => {
      const data = new FormData(form)
      return { name: String(data.get('name') ?? ''), baseUrl: String(data.get('baseUrl') ?? ''), model: String(data.get('model') ?? ''), preset: data.get('preset') === 'zhipu' ? 'zhipu' as const : 'custom' as const }
    }
    const key = () => String(new FormData(form).get('apiKey') ?? '').trim() || (existing ? profiles.key(existing.id) : '')
    const signature = () => JSON.stringify([values().baseUrl.trim().replace(/\/+$/, ''), values().model.trim(), key()])
    const ack = () => { if (!profiles.privacyAcknowledged && !form.querySelector<HTMLInputElement>('#ai-privacy-ack')?.checked) throw new Error('privacy'); profiles.acknowledgePrivacy() }
    const busy = (state: boolean) => form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = state })
    const test = async (operation: 'connection' | 'tools' | 'models' | 'vision') => {
      try {
        ack(); controller = new AbortController(); busy(true); status.textContent = '正在连接…'
        const profile: AiProviderProfile = { ...values(), id: existing?.id ?? 'draft', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' }
        const client = new AiClient(profile, key(), profiles.knownSecrets), requestSignature = signature()
        if (operation === 'vision') { testedVision = 'unknown'; testedVisionSignature = requestSignature }
        if (operation === 'models') {
          const models = await client.listModels(controller.signal)
          const list = form.querySelector<HTMLDataListElement>('datalist')!; list.replaceChildren(...models.map(model => { const option = document.createElement('option'); option.value = model; return option }))
          status.textContent = models.length ? `已读取 ${models.length} 个模型，也可手动填写` : '服务没有提供模型列表，可以手动填写'
        } else if (operation === 'vision') {
          testedVision = await client.testVisionCapability(createVisionProbeImage(), controller.signal)
          status.textContent = testedVision === 'supported' ? '图片识别已验证，保存后可拍包装录入' : testedVision === 'unsupported' ? '当前模型或接口明确不支持图片识别' : '图片测试未准确返回三个数字，能力仍待验证'
        } else if (operation === 'tools') {
          testedCapability = await client.testToolCapability(controller.signal); testedSignature = requestSignature
          status.textContent = testedCapability === 'supported' ? '已验证工具调用，保存后可读取数据和提出建议' : '当前模型可聊天，但未验证工具调用，因此暂时不能读取或修改 FitLog 数据。'
        } else { await client.testConnection(controller.signal); status.textContent = '连接成功'; }
      } catch (error) {
        status.textContent = error instanceof Error && error.message === 'privacy' ? '请先阅读隐私说明并勾选“我知道了”' : operation === 'models' ? `${safeAiError(error)}；可以手动填写模型，不影响已保存的配置` : safeAiError(error)
      } finally { busy(false); controller = undefined }
    }
    form.addEventListener('submit', event => {
      event.preventDefault()
      try { ack(); const profile = profiles.save(values(), String(new FormData(form).get('apiKey') ?? ''), existing?.id); if (testedCapability && testedSignature === signature()) profiles.setCapability(profile.id, testedCapability === 'supported' ? 'supported' : 'unsupported'); if (testedVision && testedVisionSignature === signature()) profiles.setVisionCapability(profile.id, testedVision); changed(); overview() }
      catch (error) { status.textContent = error instanceof Error && error.message === 'privacy' ? '请先阅读隐私说明并勾选“我知道了”' : safeAiError(error) }
    })
    form.querySelector<HTMLSelectElement>('[name=preset]')?.addEventListener('change', event => { if ((event.target as HTMLSelectElement).value === 'zhipu') form.querySelector<HTMLInputElement>('[name=baseUrl]')!.value = ZHIPU_BASE_URL })
    host.querySelector('#ai-settings-back')?.addEventListener('click', overview)
    form.querySelector('#ai-test-connection')?.addEventListener('click', () => void test('connection'))
    form.querySelector('#ai-test-tools')?.addEventListener('click', () => void test('tools'))
    form.querySelector('#ai-test-vision')?.addEventListener('click', () => void test('vision'))
    form.querySelector('#ai-list-models')?.addEventListener('click', () => void test('models'))
    form.querySelector('#ai-delete-profile')?.addEventListener('click', () => {
      host.innerHTML = '<h3>删除这份 AI 配置？</h3><p class="ai-note">将移除此设备的配置和 API Key。使用中的配置也会断开。</p><button class="danger-button full-btn" id="ai-confirm-delete">确认删除配置</button><button class="secondary full-btn" id="ai-cancel-delete">取消</button>'
      host.querySelector('#ai-confirm-delete')?.addEventListener('click', () => { profiles.delete(existing!.id); changed(); overview() })
      host.querySelector('#ai-cancel-delete')?.addEventListener('click', () => editor(existing))
    })
  }
  overview()
}
