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
  if (source === 'reuse-profile' && compatible && statuses.bilibili === 'unconfigured') statuses.bilibili = 'configured'
  dialog.querySelector('h2')!.textContent = '训练视频搜索'
  host.innerHTML = `<button class="text-btn" type="button" id="video-settings-back">${icon('chevron', 16)} 返回</button>
    <form class="form video-settings-form">
      <p class="video-settings-intro">选择视频来源，查找动作教程。</p>
      <section class="video-settings-section" aria-labelledby="video-sources-title">
        <h3 id="video-sources-title">视频来源</h3>
        <div class="video-source-list">
          <label class="video-source-row"><span class="video-source-copy"><strong>B站</strong><small>国内网络优先</small></span><span class="video-switch"><input type="checkbox" name="enableBilibili" ${config.enabled.bilibili ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
          <label class="video-source-row"><span class="video-source-copy"><strong>YouTube</strong><small>需要可访问 <span class="video-source-network">YouTube 的网络</span></small></span><span class="video-switch"><input type="checkbox" name="enableYoutube" ${config.enabled.youtube ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
        </div>
      </section>
      <section class="video-settings-section" data-policy-section aria-labelledby="video-policy-title">
        <h3 id="video-policy-title">搜索方式</h3>
        <label class="video-field"><span class="sr-only">搜索方式</span><select name="policy"><option value="auto" ${config.policy === 'all' ? '' : 'selected'}>自动（推荐）</option><option value="all" ${config.policy === 'all' ? 'selected' : ''}>全部来源</option></select></label>
        <p class="ai-note" data-policy-note></p>
      </section>
      <section class="video-settings-section" data-provider-section="bilibili" aria-labelledby="video-bilibili-title">
        <h3 id="video-bilibili-title">B站搜索</h3>
        ${compatible && activeProfile ? `<div class="video-settings-panel" data-reuse-panel><div class="video-reuse-heading"><div><span class="video-panel-eyebrow">当前使用</span><strong class="video-settings-model">${escapeHtml(aiChatModelLabel(activeProfile))}</strong><small>复用当前 AI 配置</small></div><span class="video-credential-state">${icon('check', 16)} 可复用</span></div><button class="text-btn video-quiet-action" type="button" data-bil-source="separate">使用单独的搜索 Key ${icon('chevron', 14)}</button></div>` : '<p class="ai-note">当前 AI 配置无法直接复用，请填写国内搜索 Key。</p>'}
        <div class="video-standalone-panel" data-standalone-panel><label class="video-field">国内搜索 Key<input type="password" name="bilibiliKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.bilibiliKey ? '已保存；留空则保持不变' : '粘贴智谱 Key'}"></label>${compatible ? '<button class="text-btn video-quiet-action" type="button" data-bil-source="reuse-profile">改回复用当前 AI 配置</button>' : ''}</div>
        <p class="ai-note">通过智谱联网搜索查找 B站公开视频，不读取地区或 VPN 状态。</p>
      </section>
      <section class="video-settings-section" data-provider-section="youtube" aria-labelledby="video-youtube-title">
        <h3 id="video-youtube-title">YouTube</h3>
        <label class="video-field">API Key<input type="password" name="videoKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.key ? '已保存；留空则保持不变' : '粘贴 YouTube 搜索 Key'}"></label>
        <p class="ai-note">需要 Google / YouTube 可访问网络。</p>
      </section>
      <section class="video-privacy video-settings-section"><h3>隐私说明</h3><div data-privacy>${settings.acknowledgedV2 ? '<p class="video-privacy-ack">已确认视频搜索隐私说明</p>' : `<p class="ai-note">${VIDEO_PRIVACY_TEXT} 搜索凭据只保存在当前设备浏览器。</p><label class="video-consent"><input type="checkbox" name="videoConsent">我知道了</label>`}</div></section>
      <section class="video-settings-section" aria-labelledby="video-status-title"><h3 id="video-status-title">连接状态</h3><div class="video-provider-statuses">${providers.map(provider => `<p data-provider-status="${provider}"><span>${providerNames[provider]}</span><strong></strong></p>`).join('')}</div><p role="status" class="video-config-status"></p></section>
      <div class="video-settings-actions"><button class="primary" type="submit">保存并测试</button><button class="secondary" id="video-save-only" type="button">仅保存</button>${settings.key || settings.bilibiliKey ? '<button class="text-btn" type="button" id="video-remove-key">移除视频搜索配置</button>' : ''}</div>
    </form>`

  const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.video-config-status')!
  const inputs = { bilibili: form.querySelector<HTMLInputElement>('[name=enableBilibili]')!, youtube: form.querySelector<HTMLInputElement>('[name=enableYoutube]')! }
  const domesticInput = form.querySelector<HTMLInputElement>('[name=bilibiliKey]')!, youtubeInput = form.querySelector<HTMLInputElement>('[name=videoKey]')!
  const policy = form.querySelector<HTMLSelectElement>('[name=policy]')!
  const valid = () => !controller.signal.aborted && form.isConnected
  const updateStatus = () => {
    const enabled = providers.filter(provider => inputs[provider].checked)
    for (const provider of providers) {
      const target = host.querySelector<HTMLElement>(`[data-provider-status="${provider}"] strong`)!
      target.textContent = inputs[provider].checked ? statusLabels[statuses[provider]] : '未启用'
      target.dataset.state = inputs[provider].checked ? statuses[provider] : 'disabled'
      if (!inputs[provider].checked || statuses[provider] !== 'failed') target.parentElement!.querySelector('small')?.remove()
    }
    const successes = enabled.filter(provider => statuses[provider] === 'success').length
    status.textContent = !enabled.length ? '未启用视频来源 · 请先启用至少一个视频来源。' : successes === enabled.length ? '视频搜索可用' : successes ? '部分来源可用' : enabled.every(provider => statuses[provider] === 'failed') ? '测试失败' : '已启用 · 保存并测试以检查连接'
  }
  const syncVisibility = () => {
    for (const provider of providers) host.querySelector<HTMLElement>(`[data-provider-section="${provider}"]`)!.hidden = !inputs[provider].checked
    host.querySelector<HTMLElement>('[data-policy-section]')!.hidden = !(inputs.bilibili.checked && inputs.youtube.checked)
    host.querySelector<HTMLElement>('[data-standalone-panel]')!.hidden = source !== 'separate'
    const reuse = host.querySelector<HTMLElement>('[data-reuse-panel]'); if (reuse) reuse.hidden = source !== 'reuse-profile'
    host.querySelector<HTMLElement>('[data-policy-note]')!.textContent = policy.value === 'all' ? '同时搜索两个来源。' : '优先 B站，没有结果或不可用时尝试 YouTube。'
    updateStatus()
  }
  const save = () => {
    // Source switches remain authoritative even if an inactive field has an unsaved draft.
    if (inputs.youtube.checked && youtubeInput.value.trim()) { settings.save(youtubeInput.value); statuses.youtube = 'configured' }
    if (inputs.bilibili.checked && source === 'separate' && domesticInput.value.trim()) { settings.saveBilibiliKey(domesticInput.value); statuses.bilibili = 'configured' }
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
  const leave = () => { controller.abort(); back() }
  host.querySelector('#video-settings-back')!.addEventListener('click', leave)
  for (const input of Object.values(inputs)) input.addEventListener('change', syncVisibility)
  policy.addEventListener('change', syncVisibility)
  host.querySelectorAll<HTMLElement>('[data-bil-source]').forEach(button => button.addEventListener('click', () => {
    source = button.dataset.bilSource as 'reuse-profile' | 'separate'
    statuses.bilibili = source === 'reuse-profile' && compatible || source === 'separate' && settings.bilibiliKey ? 'configured' : 'unconfigured'
    syncVisibility()
  }))
  host.querySelector('#video-save-only')!.addEventListener('click', () => { if (!busy) try { save() } catch (error) { status.textContent = safeAiError(error) } })
  host.querySelector('#video-remove-key')?.addEventListener('click', () => { settings.remove(); leave() })
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !valid()) return
    try {
      save()
      const enabled = providers.filter(provider => inputs[provider].checked)
      if (!enabled.length) return
      if (!settings.acknowledgedV2) { status.textContent = '请先确认视频搜索隐私说明。'; return }
      busy = true
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button').forEach(control => { control.disabled = true })
      status.textContent = '正在测试…'
      for (const provider of enabled) host.querySelector(`[data-provider-status="${provider}"] small`)?.remove()
      await Promise.all(enabled.map(async provider => {
        try {
          if (provider === 'bilibili') await new ZhipuBilibiliSearchProvider(settings, () => {
            if (source === 'reuse-profile' && compatible && activeProfile) return { key: profiles!.key(activeProfile.id), baseUrl: activeProfile.baseUrl || BILIBILI_BASE_URL }
            return settings.bilibiliKey ? { key: settings.bilibiliKey, baseUrl: BILIBILI_BASE_URL } : undefined
          }, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal)
          else await new YouTubeVideoSearchProvider(settings, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal)
          if (!valid()) return
          settings.setStatus('success', provider); statuses[provider] = 'success'
        } catch (error) {
          if (!valid()) return
          settings.setStatus('failed', provider); statuses[provider] = 'failed'
          const target = host.querySelector<HTMLElement>(`[data-provider-status="${provider}"]`)!
          let detail = target.querySelector<HTMLElement>('small')
          if (!detail) { detail = document.createElement('small'); target.append(detail) }
          detail.textContent = safeAiError(error)
        }
        if (valid()) updateStatus()
      }))
    } catch (error) { if (valid()) status.textContent = safeAiError(error) }
    finally {
      busy = false
      if (valid()) form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button').forEach(control => { control.disabled = false })
    }
  })
  syncVisibility()
  dialog.addEventListener('close', () => controller.abort(), { once: true })
}
