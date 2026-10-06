import { BILIBILI_BASE_URL, VideoSearchSettings, YouTubeVideoSearchProvider, ZhipuBilibiliSearchProvider, VIDEO_PRIVACY_TEXT, type VideoProviderId, type VideoSourcePolicy } from '../services/videoSearchService'
import { isCompatibleZhipuProfile, type AiProfiles } from '../services/aiProfiles'
import { safeAiError } from '../ai/security'
import { aiChatModelLabel } from './aiUiHelpers'
import { icon } from './icons'

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character))
type ProviderStatus = 'unconfigured' | 'configured' | 'success' | 'failed'
const providers: VideoProviderId[] = ['bilibili', 'youtube']
const providerNames = { bilibili: 'B站', youtube: 'YouTube' } as const
const statusLabels = { unconfigured: '未配置', configured: '已配置', success: '已连接', failed: '测试失败' } as const
function normalizePolicy(bilibili: boolean, youtube: boolean, selected: VideoSourcePolicy): VideoSourcePolicy {
  if (bilibili && !youtube) return 'bilibili'
  if (!bilibili && youtube) return 'youtube'
  return bilibili && youtube && selected === 'all' ? 'all' : 'auto'
}

export function mountVideoSearchSettings(host: HTMLElement, dialog: HTMLDialogElement, back: () => void, secrets: () => readonly string[], profiles?: AiProfiles): void {
  const settings = new VideoSearchSettings(), controller = new AbortController()
  const activeProfile = profiles?.active
  const compatible = Boolean(activeProfile && isCompatibleZhipuProfile(activeProfile) && profiles?.key(activeProfile.id))
  const config = settings.config
  let source = compatible ? config.bilibiliCredentialSource : 'separate'
  let busy = false
  const statuses: Record<VideoProviderId, ProviderStatus> = { bilibili: config.bilibiliStatus, youtube: config.youtubeStatus }
  if (config.bilibiliCredentialSource !== source) statuses.bilibili = settings.bilibiliKey ? 'configured' : 'unconfigured'
  if (source === 'reuse-profile' && compatible && statuses.bilibili === 'unconfigured') statuses.bilibili = 'configured'
  dialog.querySelector('h2')!.textContent = '训练视频搜索'
  host.innerHTML = `<form class="form video-settings-form"><div class="video-settings-home" data-video-home>
      <button class="text-btn" type="button" id="video-settings-back">${icon('chevron', 16)} 返回</button>
      <p class="video-settings-intro">选择视频来源，查找动作教程。</p>
      <section class="video-settings-section" aria-labelledby="video-sources-title">
        <h3 id="video-sources-title">视频来源</h3>
        <div class="video-source-list">
          <label class="video-source-row setting-toggle-row"><span class="video-source-copy setting-toggle-copy"><strong>B站</strong><small>国内网络优先</small></span><span class="video-switch setting-toggle"><input type="checkbox" name="enableBilibili" ${config.enabled.bilibili ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
          <label class="video-source-row setting-toggle-row"><span class="video-source-copy setting-toggle-copy"><strong>YouTube</strong><small>需要可访问 <span class="video-source-network">YouTube 的网络</span></small></span><span class="video-switch setting-toggle"><input type="checkbox" name="enableYoutube" ${config.enabled.youtube ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
        </div>
      </section>
      <section class="video-settings-section" data-policy-section aria-labelledby="video-policy-title">
        <h3 id="video-policy-title">搜索方式</h3>
        <div class="video-policy-control"><label class="video-field" data-policy-picker><span class="sr-only">搜索方式</span><select name="policy"><option value="auto" ${config.policy === 'all' ? '' : 'selected'}>自动（推荐）</option><option value="all" ${config.policy === 'all' ? 'selected' : ''}>全部来源</option></select></label><p class="video-policy-static" data-policy-static></p></div>
        <p class="ai-note" data-policy-note></p>
      </section>
      <section class="video-settings-section" aria-labelledby="video-config-title"><h3 id="video-config-title">来源配置</h3><div class="video-provider-summaries">${providers.map(provider => `<button type="button" class="video-provider-row" data-provider-config="${provider}"><span class="video-provider-copy"><span class="video-provider-heading"><strong>${providerNames[provider]}</strong><span data-provider-status="${provider}"><strong></strong></span></span><small class="video-provider-model" data-provider-detail></small><small class="video-provider-mode" data-provider-detail></small></span>${icon('chevron', 16)}</button>`).join('')}</div></section>
      <section class="video-privacy video-settings-section"><h3>隐私说明</h3><div data-privacy>${settings.acknowledgedV2 ? '<p class="video-privacy-ack">已确认视频搜索隐私说明</p>' : `<p class="ai-note">${VIDEO_PRIVACY_TEXT} 搜索凭据只保存在当前设备浏览器。</p><label class="video-consent"><input type="checkbox" name="videoConsent">我知道了</label>`}</div></section>
      <p role="status" class="video-config-status"></p>
      <div class="video-settings-actions"><button class="primary" type="submit">保存并测试</button><button class="secondary" id="video-save-only" type="button">仅保存</button>${settings.key || settings.bilibiliKey ? '<button class="text-btn" type="button" id="video-remove-key">移除视频搜索配置</button>' : ''}</div>
      </div>
      <section class="video-settings-section video-provider-editor" data-provider-section="bilibili" hidden aria-label="B站凭据"><button class="text-btn" type="button" data-provider-back>${icon('chevron', 16)} 返回视频设置</button>
        ${compatible && activeProfile ? `<div class="video-settings-panel" data-reuse-panel><div class="video-reuse-heading"><div><span class="video-panel-eyebrow">当前使用</span><strong class="video-settings-model">${escapeHtml(aiChatModelLabel(activeProfile))}</strong><small>复用当前 AI 配置</small></div><span class="video-credential-state">${icon('check', 16)} 可复用</span></div><button class="text-btn video-quiet-action" type="button" data-bil-source="separate">使用单独的搜索 Key ${icon('chevron', 14)}</button></div>` : '<p class="ai-note">当前 AI 配置无法直接复用，请填写国内搜索 Key。</p>'}
        <div class="video-standalone-panel" data-standalone-panel><label class="video-field">国内搜索 Key<input type="password" name="bilibiliKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.bilibiliKey ? '已保存；留空则保持不变' : '粘贴智谱 Key'}"></label>${compatible ? '<button class="text-btn video-quiet-action" type="button" data-bil-source="reuse-profile">改回复用当前 AI 配置</button>' : ''}</div>
        <p class="ai-note">通过智谱联网搜索查找 B站公开视频，不读取地区或 VPN 状态。</p>
        <p class="ai-note" data-provider-error="bilibili" hidden></p><p class="video-editor-status" role="status"></p><button class="primary" type="button" data-provider-save="bilibili">保存配置</button><button class="secondary" type="button" data-provider-test="bilibili">测试 B站搜索</button>
      </section>
      <section class="video-settings-section video-provider-editor" data-provider-section="youtube" hidden aria-label="YouTube凭据"><button class="text-btn" type="button" data-provider-back>${icon('chevron', 16)} 返回视频设置</button>
        <label class="video-field">API Key<input type="password" name="videoKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.key ? '已保存；留空则保持不变' : '粘贴 YouTube 搜索 Key'}"></label>
        <p class="ai-note">需要 Google / YouTube 可访问网络。</p>
        <p class="ai-note" data-provider-error="youtube" hidden></p><p class="video-editor-status" role="status"></p><button class="primary" type="button" data-provider-save="youtube">保存配置</button>
      </section>
    </form>`

  const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.video-config-status')!
  const inputs = { bilibili: form.querySelector<HTMLInputElement>('[name=enableBilibili]')!, youtube: form.querySelector<HTMLInputElement>('[name=enableYoutube]')! }
  const domesticInput = form.querySelector<HTMLInputElement>('[name=bilibiliKey]')!, youtubeInput = form.querySelector<HTMLInputElement>('[name=videoKey]')!
  const policy = form.querySelector<HTMLSelectElement>('[name=policy]')!
  const home = form.querySelector<HTMLElement>('[data-video-home]')!, body = dialog.querySelector<HTMLElement>('.modal-body')!
  const errors: Partial<Record<VideoProviderId, string>> = {}
  let domesticDiagnostics: { requests: number; candidateLinks: number; validVideos: number } | undefined
  let editor: VideoProviderId | undefined, homeScroll = 0
  const valid = () => !controller.signal.aborted && form.isConnected
  const updateStatus = () => {
    const enabled = providers.filter(provider => inputs[provider].checked)
    for (const provider of providers) {
      const target = host.querySelector<HTMLElement>(`[data-provider-status="${provider}"] strong`)!
      target.textContent = inputs[provider].checked ? statusLabels[statuses[provider]] : '未启用'
      target.dataset.state = inputs[provider].checked ? statuses[provider] : 'disabled'
      if (!inputs[provider].checked || statuses[provider] !== 'failed') delete errors[provider]
      const detail = form.querySelector<HTMLElement>(`[data-provider-error="${provider}"]`)!
      detail.textContent = errors[provider] ?? ''; detail.hidden = !detail.textContent
      const row = form.querySelector<HTMLElement>(`[data-provider-config="${provider}"]`)!
      row.classList.toggle('is-disabled', !inputs[provider].checked)
      row.querySelectorAll<HTMLElement>('[data-provider-detail]').forEach(element => element.setAttribute('aria-hidden', String(!inputs[provider].checked)))
      row.querySelector<HTMLElement>('.video-provider-model')!.textContent = provider === 'bilibili' && source === 'reuse-profile' && activeProfile ? aiChatModelLabel(activeProfile) : provider === 'bilibili' ? '单独的搜索 Key' : '独立 API Key'
      row.querySelector<HTMLElement>('.video-provider-mode')!.textContent = provider === 'bilibili' && domesticDiagnostics ? `请求成功 · 候选 ${domesticDiagnostics.candidateLinks} · 有效 ${domesticDiagnostics.validVideos}` : provider === 'bilibili' && source === 'reuse-profile' ? '复用当前 AI 配置' : '保存在当前设备'
      row.setAttribute('aria-label', `${providerNames[provider]}配置，${target.textContent}`)
    }
    const successes = enabled.filter(provider => statuses[provider] === 'success').length
    status.textContent = domesticDiagnostics && !domesticDiagnostics.validVideos && enabled.length === 1 && enabled[0] === 'bilibili' && statuses.bilibili === 'success' ? '搜索服务已连接，但没有解析到可用 B站视频' : !enabled.length ? '未启用视频来源 · 请先启用至少一个视频来源。' : successes === enabled.length ? '视频搜索可用' : successes ? '部分来源可用' : enabled.every(provider => statuses[provider] === 'failed') ? '测试失败' : '已启用 · 保存并测试以检查连接'
  }
  const syncVisibility = () => {
    const both = inputs.bilibili.checked && inputs.youtube.checked
    host.querySelector<HTMLElement>('[data-policy-picker]')!.hidden = !both
    const staticPolicy = host.querySelector<HTMLElement>('[data-policy-static]')!
    staticPolicy.hidden = both
    staticPolicy.textContent = inputs.bilibili.checked ? '当前使用：B站' : inputs.youtube.checked ? '当前使用：YouTube' : '未启用视频来源'
    host.querySelector<HTMLElement>('[data-standalone-panel]')!.hidden = source !== 'separate'
    const reuse = host.querySelector<HTMLElement>('[data-reuse-panel]'); if (reuse) reuse.hidden = source !== 'reuse-profile'
    host.querySelector<HTMLElement>('[data-policy-note]')!.textContent = both ? policy.value === 'all' ? '同时搜索两个来源。' : '优先 B站，不可用时尝试 YouTube。' : inputs.bilibili.checked || inputs.youtube.checked ? '仅搜索已开启的来源。' : '开启来源后即可搜索。'
    updateStatus()
  }
  const save = (credentialProvider?: VideoProviderId) => {
    // Source switches remain authoritative even if an inactive field has an unsaved draft.
    if ((inputs.youtube.checked || credentialProvider === 'youtube') && youtubeInput.value.trim()) { settings.save(youtubeInput.value); statuses.youtube = 'configured' }
    else if (credentialProvider === 'youtube' && !settings.key) settings.save('')
    if (source === 'separate' && (inputs.bilibili.checked || credentialProvider === 'bilibili') && domesticInput.value.trim()) { settings.saveBilibiliKey(domesticInput.value); domesticDiagnostics = undefined; statuses.bilibili = 'configured' }
    else if (source === 'separate' && credentialProvider === 'bilibili' && !settings.bilibiliKey) settings.saveBilibiliKey('')
    settings.setCredentialSource(source)
    for (const provider of providers) settings.setEnabled(provider, inputs[provider].checked)
    settings.setPolicy(normalizePolicy(inputs.bilibili.checked, inputs.youtube.checked, policy.value as VideoSourcePolicy))
    if (form.querySelector<HTMLInputElement>('[name=videoConsent]')?.checked) {
      settings.acknowledge(); host.querySelector<HTMLElement>('[data-privacy]')!.innerHTML = '<p class="video-privacy-ack">已确认视频搜索隐私说明</p>'
    }
    youtubeInput.value = ''; domesticInput.value = ''
    youtubeInput.placeholder = settings.key ? '已保存；留空则保持不变' : '粘贴 YouTube 搜索 Key'
    domesticInput.placeholder = settings.bilibiliKey ? '已保存；留空则保持不变' : '粘贴智谱 Key'
    syncVisibility()
  }
  const showHome = () => {
    editor = undefined
    for (const provider of providers) form.querySelector<HTMLElement>(`[data-provider-section="${provider}"]`)!.hidden = true
    home.hidden = false; dialog.querySelector('h2')!.textContent = '训练视频搜索'
    dialog.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true }); body.scrollTop = homeScroll
  }
  const cancel = (event: Event) => { if (editor) { event.preventDefault(); showHome() } }
  const leave = () => { controller.abort(); dialog.removeEventListener('cancel', cancel); back() }
  const saveEditor = (provider: VideoProviderId) => {
    const notice = form.querySelector<HTMLElement>(`[data-provider-section="${provider}"] .video-editor-status`)!
    notice.textContent = ''; delete notice.dataset.state
    try { save(provider); showHome() }
    catch (error) { notice.textContent = safeAiError(error) }
  }
  host.querySelectorAll<HTMLElement>('[data-provider-config]').forEach(button => button.addEventListener('click', () => {
    homeScroll = body.scrollTop; editor = button.dataset.providerConfig as VideoProviderId
    home.hidden = true; form.querySelector<HTMLElement>(`[data-provider-section="${editor}"]`)!.hidden = false
    dialog.querySelector('h2')!.textContent = `${providerNames[editor]}搜索`
    dialog.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true }); body.scrollTop = 0
  }))
  host.querySelectorAll('[data-provider-back]').forEach(button => button.addEventListener('click', showHome))
  host.querySelectorAll<HTMLElement>('[data-provider-save]').forEach(button => button.addEventListener('click', () => saveEditor(button.dataset.providerSave as VideoProviderId)))
  dialog.addEventListener('cancel', cancel)
  host.querySelector('#video-settings-back')!.addEventListener('click', leave)
  for (const input of Object.values(inputs)) input.addEventListener('change', syncVisibility)
  policy.addEventListener('change', syncVisibility)
  host.querySelectorAll<HTMLElement>('[data-bil-source]').forEach(button => button.addEventListener('click', () => {
    source = button.dataset.bilSource as 'reuse-profile' | 'separate'; domesticDiagnostics = undefined
    statuses.bilibili = source === 'reuse-profile' && compatible || source === 'separate' && settings.bilibiliKey ? 'configured' : 'unconfigured'
    syncVisibility()
  }))
  host.querySelector('#video-save-only')!.addEventListener('click', () => { if (!busy) try { save() } catch (error) { status.textContent = safeAiError(error) } })
  host.querySelector('#video-remove-key')?.addEventListener('click', () => { settings.remove(); leave() })
  const testProviders = async (only?: VideoProviderId) => {
    if (busy || !valid()) return
    try {
      save(only)
      const enabled = only ? [only] : providers.filter(provider => inputs[provider].checked)
      if (!enabled.length) return
      if (!settings.acknowledgedV2) { status.textContent = '请先返回视频设置确认隐私说明。'; if (editor) { const notice=form.querySelector<HTMLElement>(`[data-provider-section="${editor}"] .video-editor-status`)!; notice.textContent=status.textContent; notice.dataset.state='error' } return }
      busy = true
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button:not(#video-settings-back)').forEach(control => { control.disabled = true })
      status.textContent = '正在测试…'
      if (editor) { const notice=form.querySelector<HTMLElement>(`[data-provider-section="${editor}"] .video-editor-status`)!; notice.textContent = '正在测试…'; notice.dataset.state='busy' }
      for (const provider of enabled) delete errors[provider]
      await Promise.all(enabled.map(async provider => {
        try {
          if (provider === 'bilibili') {
            domesticDiagnostics = undefined
            const domestic = new ZhipuBilibiliSearchProvider(settings, () => {
            if (source === 'reuse-profile' && compatible && activeProfile) return { key: profiles!.key(activeProfile.id), baseUrl: activeProfile.baseUrl || BILIBILI_BASE_URL }
            return settings.bilibiliKey ? { key: settings.bilibiliKey, baseUrl: BILIBILI_BASE_URL } : undefined
          }, fetch, secrets)
            await domestic.search('杠铃俯身划船', 3, controller.signal)
            domesticDiagnostics = domestic.lastDiagnostics
          }
          else await new YouTubeVideoSearchProvider(settings, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal)
          if (!valid()) return
          settings.setStatus('success', provider); statuses[provider] = 'success'
        } catch (error) {
          if (!valid()) return
          settings.setStatus('failed', provider); statuses[provider] = 'failed'
          errors[provider] = safeAiError(error)
        }
        if (valid()) {
          updateStatus()
          const notice = form.querySelector<HTMLElement>(`[data-provider-section="${provider}"] .video-editor-status`)!
          notice.dataset.state = errors[provider] ? 'error' : 'success'
          notice.textContent = errors[provider] ?? (provider === 'bilibili' && domesticDiagnostics ? `${domesticDiagnostics.validVideos ? '连接成功' : '搜索服务已连接，但没有解析到可用 B站视频'} · 请求 ${domesticDiagnostics.requests} 次 · 候选链接 ${domesticDiagnostics.candidateLinks} · 有效 B站视频 ${domesticDiagnostics.validVideos}` : '连接成功')
        }
      }))
    } catch (error) { if (valid()) { status.textContent = safeAiError(error); if (editor) { const notice=form.querySelector<HTMLElement>(`[data-provider-section="${editor}"] .video-editor-status`)!; notice.textContent=status.textContent; notice.dataset.state='error' } } }
    finally {
      busy = false
      if (valid()) form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button:not(#video-settings-back)').forEach(control => { control.disabled = false })
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); if (editor) saveEditor(editor); else void testProviders() })
  host.querySelector('[data-provider-test=bilibili]')!.addEventListener('click', () => { void testProviders('bilibili') })
  syncVisibility()
  dialog.addEventListener('close', () => { controller.abort(); dialog.removeEventListener('cancel', cancel) }, { once: true })
}
