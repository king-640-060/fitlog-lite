import { BILIBILI_BASE_URL, VideoSearchSettings, YouTubeVideoSearchProvider, ZhipuBilibiliSearchProvider, VIDEO_CREDENTIAL_TEXT, VIDEO_PRIVACY_TEXT, type VideoProviderId, type VideoSourcePolicy } from '../services/videoSearchService'
import { isCompatibleZhipuProfile, type AiProfiles } from '../services/aiProfiles'
import { safeAiError } from '../ai/security'
import { aiChatModelLabel } from './aiUiHelpers'

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, character => ({ '&': '&#38;', '<': '&#60;', '>': '&#62;', "'": '&#39;', '"': '&#34;' }[character] ?? character))
function normalizePolicy(bilibili: boolean, youtube: boolean, selected: VideoSourcePolicy): VideoSourcePolicy {
  if (bilibili && !youtube) return 'bilibili'
  if (!bilibili && youtube) return 'youtube'
  if (!bilibili && !youtube) return 'auto'
  return selected === 'all' ? 'all' : 'auto'
}
type ProviderStatus = 'unconfigured' | 'configured' | 'success' | 'failed'
function providerStatusLabel(status: ProviderStatus): string {
  return { unconfigured: '未配置', configured: '已配置', success: '已连接', failed: '测试失败' }[status]
}

export function mountVideoSearchSettings(host: HTMLElement, dialog: HTMLDialogElement, back: () => void, secrets: () => readonly string[], profiles?: AiProfiles): void {
  const settings = new VideoSearchSettings(), controller = new AbortController()
  const activeProfile = profiles?.active
  const compatible = Boolean(activeProfile && isCompatibleZhipuProfile(activeProfile) && profiles && profiles.key(activeProfile.id))
  const config = settings.config
  const modelLabel = activeProfile ? aiChatModelLabel(activeProfile) : ''
  dialog.querySelector('h2')!.textContent = '训练视频搜索'
  host.innerHTML = '<button class="text-btn" type="button" id="video-settings-back">返回</button>' +
    '<form class="form video-settings-form">' +
      '<header class="video-settings-header"><h3>训练视频搜索</h3><p>选择要使用的视频来源，搜索时会按你的设置返回训练教程。</p></header>' +
      '<section class="video-settings-section" aria-labelledby="video-sources-title"><h4 id="video-sources-title">视频来源</h4><div class="video-source-list">' +
        '<label class="video-source-row"><span class="video-source-copy"><strong>B站</strong><small>国内网络优先</small></span><span class="video-switch"><input type="checkbox" name="enableBilibili" ' + (config.enabled.bilibili ? 'checked' : '') + '><span aria-hidden="true"></span></span></label>' +
        '<label class="video-source-row"><span class="video-source-copy"><strong>YouTube</strong><small>需要可访问 YouTube 的网络</small></span><span class="video-switch"><input type="checkbox" name="enableYoutube" ' + (config.enabled.youtube ? 'checked' : '') + '><span aria-hidden="true"></span></span></label></div></section>' +
      '<section class="video-settings-section video-policy-section" data-policy-section aria-labelledby="video-policy-title"><h4 id="video-policy-title">搜索策略</h4><label class="video-field">两种来源都启用时<select name="policy"><option value="auto" ' + (config.policy === 'all' ? '' : 'selected') + '>自动选择</option><option value="all" ' + (config.policy === 'all' ? 'selected' : '') + '>同时搜索全部来源</option></select></label></section>' +
      '<section class="video-settings-section video-provider-section" data-provider-section="bilibili" aria-labelledby="video-bilibili-title"><h4 id="video-bilibili-title">B站搜索配置</h4><p class="ai-note">' + VIDEO_CREDENTIAL_TEXT + ' 国内搜索使用智谱 Web-Search-Pro 返回 B站公开视频页面。</p>' +
        (compatible ? '<div class="video-settings-panel video-reuse-panel"><span class="video-panel-eyebrow">当前使用</span><strong class="video-settings-model">' + escapeHtml(modelLabel) + '</strong><small>复用当前 AI 配置</small><span class="video-connected">● 已连接</span><button class="text-btn video-quiet-action" type="button" data-bil-source="separate">使用单独的搜索 Key</button></div>' : '<div class="video-settings-panel"><strong>当前 AI 配置无法直接复用</strong><small>请使用单独的国内搜索 Key。</small></div>') +
        '<div class="video-standalone-panel" data-standalone-panel ' + (compatible && config.bilibiliCredentialSource !== 'separate' ? 'hidden' : '') + '><label class="video-field">国内搜索 Key<input type="password" name="bilibiliKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="' + (settings.bilibiliKey ? '已保存；留空则保持不变' : '粘贴智谱 Key') + '"></label>' + (compatible ? '<button class="text-btn video-quiet-action" type="button" data-bil-source="reuse-profile">改回复用当前 AI 配置</button>' : '') + '</div></section>' +
      '<section class="video-settings-section video-provider-section" data-provider-section="youtube" aria-labelledby="video-youtube-title"><h4 id="video-youtube-title">YouTube 搜索配置</h4><p class="ai-note">' + VIDEO_CREDENTIAL_TEXT + '</p><label class="video-field">API Key<input type="password" name="videoKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="' + (settings.key ? '已保存；留空则保持不变' : '粘贴 YouTube 搜索 Key') + '"></label></section>' +
      '<section class="video-settings-section video-status-section" aria-labelledby="video-status-title"><h4 id="video-status-title">连接状态</h4><div class="video-provider-statuses"><p data-provider-status="bilibili"><span>B站</span><strong>' + providerStatusLabel(config.bilibiliStatus) + '</strong></p><p data-provider-status="youtube"><span>YouTube</span><strong>' + providerStatusLabel(config.youtubeStatus) + '</strong></p></div><p role="status" class="video-config-status"></p></section>' +
      '<section class="video-privacy video-settings-section"><h4>隐私说明</h4><p class="ai-note">' + VIDEO_PRIVACY_TEXT + '</p>' + (settings.acknowledgedV2 ? '<p class="video-privacy-ack">已确认视频搜索隐私说明</p>' : '<label class="video-consent"><input type="checkbox" name="videoConsent">我知道了</label>') + '</section>' +
      '<div class="video-settings-actions"><button class="primary full-btn" type="submit">保存并测试</button><button class="secondary full-btn" id="video-save-only" type="button">仅保存配置</button>' + (settings.key || settings.bilibiliKey ? '<button class="text-btn" type="button" id="video-remove-key">移除视频搜索配置</button>' : '') + '</div></form>'

  const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.video-config-status')!
  const sourceSection = (provider: VideoProviderId) => host.querySelector<HTMLElement>('[data-provider-section="' + provider + '"]')!
  const updateStatusRow = (provider: VideoProviderId, value: ProviderStatus) => { const row = host.querySelector<HTMLElement>('[data-provider-status="' + provider + '"] strong'); if (row) row.textContent = providerStatusLabel(value) }
  const updateOverallStatus = () => {
    const current = settings.config, enabledProviders = (['bilibili', 'youtube'] as VideoProviderId[]).filter(provider => form.querySelector<HTMLInputElement>('[name=enable' + (provider === 'bilibili' ? 'Bilibili' : 'Youtube') + ']')?.checked)
    if (!enabledProviders.length) { status.textContent = '尚未启用视频来源 · 请先启用至少一个来源。'; return }
    const getStatus = (provider: VideoProviderId) => current[provider === 'bilibili' ? 'bilibiliStatus' : 'youtubeStatus']
    const successes = enabledProviders.filter(provider => getStatus(provider) === 'success').length, failures = enabledProviders.filter(provider => getStatus(provider) === 'failed').length
    status.textContent = successes === enabledProviders.length ? '视频搜索可用' : successes > 0 || failures > 0 ? '部分来源可用' : '尚未测试'
  }
  const syncVisibility = () => {
    const bilibili = form.querySelector<HTMLInputElement>('[name=enableBilibili]')!.checked, youtube = form.querySelector<HTMLInputElement>('[name=enableYoutube]')!.checked
    sourceSection('bilibili').hidden = !bilibili; sourceSection('youtube').hidden = !youtube
    host.querySelector<HTMLElement>('[data-policy-section]')!.hidden = !(bilibili && youtube); updateOverallStatus()
  }
  syncVisibility()
  const save = () => {
    const data = new FormData(form), key = String(data.get('videoKey') ?? ''), domestic = String(data.get('bilibiliKey') ?? '')
    const bilibili = data.get('enableBilibili') === 'on' || Boolean(domestic.trim()), youtube = data.get('enableYoutube') === 'on' || (!config.enabled.youtube && Boolean(key.trim()))
    const panel = host.querySelector<HTMLElement>('[data-standalone-panel]')!, source = String(form.querySelector<HTMLInputElement>('[name=bilSource]')?.value ?? (panel.hidden ? 'reuse-profile' : 'separate')) as 'reuse-profile' | 'separate'
    if (key.trim() || settings.key) settings.save(key)
    if (domestic.trim()) settings.saveBilibiliKey(domestic)
    settings.setCredentialSource(source); settings.setEnabled('bilibili', bilibili); settings.setEnabled('youtube', youtube)
    settings.setPolicy(normalizePolicy(bilibili, youtube, String(data.get('policy') ?? 'auto') as VideoSourcePolicy))
    if (form.querySelector<HTMLInputElement>('[name=videoConsent]')?.checked) settings.acknowledge()
    form.querySelector<HTMLInputElement>('[name=enableBilibili]')!.checked = bilibili
    form.querySelector<HTMLInputElement>('[name=enableYoutube]')!.checked = youtube
    const keyInput = form.querySelector<HTMLInputElement>('[name=videoKey]'); if (keyInput) { keyInput.value = ''; keyInput.placeholder = '已保存；留空则保持不变' }
    const domesticInput = form.querySelector<HTMLInputElement>('[name=bilibiliKey]'); if (domesticInput) { domesticInput.value = ''; domesticInput.placeholder = '已保存；留空则保持不变' }
    const saved = settings.config
    updateStatusRow('bilibili', saved.bilibiliStatus); updateStatusRow('youtube', saved.youtubeStatus); syncVisibility()
  }
  const leave = () => { controller.abort(); back() }
  host.querySelector('#video-settings-back')!.addEventListener('click', leave)
  form.querySelectorAll<HTMLInputElement>('[name=enableBilibili],[name=enableYoutube]').forEach(input => input.addEventListener('change', syncVisibility))
  host.querySelectorAll<HTMLElement>('[data-bil-source]').forEach(button => button.addEventListener('click', () => {
    const source = button.dataset.bilSource as 'reuse-profile' | 'separate', panel = host.querySelector<HTMLElement>('[data-standalone-panel]')!
    panel.hidden = source !== 'separate'
    let sourceInput = form.querySelector<HTMLInputElement>('[name=bilSource]')
    if (!sourceInput) { sourceInput = document.createElement('input'); sourceInput.type = 'hidden'; sourceInput.name = 'bilSource'; form.append(sourceInput) }
    sourceInput.value = source
  }))
  host.querySelector('#video-save-only')!.addEventListener('click', () => { try { save() } catch (error) { status.textContent = safeAiError(error) } })
  host.querySelector('#video-remove-key')?.addEventListener('click', () => { settings.remove(); leave() })
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (controller.signal.aborted) return
    try {
      save(); const current = settings.config
      if (!settings.acknowledgedV2 && (current.enabled.bilibili || current.enabled.youtube)) { status.textContent = '请先确认视频搜索隐私说明。'; return }
      form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true }); status.textContent = '正在测试…'
      const run: PromiseSettledResult<unknown>[] = await Promise.allSettled([
        current.enabled.bilibili ? new ZhipuBilibiliSearchProvider(settings, () => {
          const panel = host.querySelector<HTMLElement>('[data-standalone-panel]')!, source = String(form.querySelector<HTMLInputElement>('[name=bilSource]')?.value ?? (panel.hidden ? 'reuse-profile' : 'separate'))
          if (source === 'reuse-profile' && compatible && profiles?.active) return { key: profiles.key(profiles.active.id), baseUrl: profiles.active.baseUrl || BILIBILI_BASE_URL }
          return settings.bilibiliKey ? { key: settings.bilibiliKey, baseUrl: BILIBILI_BASE_URL } : undefined
        }, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal) : Promise.resolve(),
        current.enabled.youtube ? new YouTubeVideoSearchProvider(settings, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal) : Promise.resolve(),
      ])
      if (current.enabled.bilibili) { const result = run[0]; settings.setStatus(result.status === 'fulfilled' ? 'success' : 'failed', 'bilibili'); updateStatusRow('bilibili', result.status === 'fulfilled' ? 'success' : 'failed') }
      if (current.enabled.youtube) { const result = run[1]; settings.setStatus(result.status === 'fulfilled' ? 'success' : 'failed', 'youtube'); updateStatusRow('youtube', result.status === 'fulfilled' ? 'success' : 'failed') }
      if (run.some(result => result.status === 'rejected')) { const error = run.find(result => result.status === 'rejected') as PromiseRejectedResult; status.textContent = (settings.config.bilibiliStatus === 'success' || settings.config.youtubeStatus === 'success' ? '部分来源可用' : '测试失败') + ' · ' + safeAiError(error.reason) } else updateOverallStatus()
    } catch (error) { if (!controller.signal.aborted && form.isConnected) status.textContent = safeAiError(error) }
    finally { form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false }) }
  })
  dialog.addEventListener('close', () => controller.abort(), { once: true })
}
