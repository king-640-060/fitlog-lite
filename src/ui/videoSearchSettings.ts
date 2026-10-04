import { BILIBILI_BASE_URL, VideoSearchSettings, YouTubeVideoSearchProvider, ZhipuBilibiliSearchProvider, VIDEO_CREDENTIAL_TEXT, VIDEO_PRIVACY_TEXT } from '../services/videoSearchService'
import { isCompatibleZhipuProfile, type AiProfiles } from '../services/aiProfiles'
import { safeAiError } from '../ai/security'
export function mountVideoSearchSettings(host: HTMLElement, dialog: HTMLDialogElement, back: () => void, secrets: () => readonly string[], profiles?: AiProfiles): void {
  const settings = new VideoSearchSettings(), controller = new AbortController()
  const activeProfile = profiles?.active
  const compatible = Boolean(activeProfile && isCompatibleZhipuProfile(activeProfile) && profiles && profiles.key(activeProfile.id))
  const config = settings.config
  dialog.querySelector('h2')!.textContent = '训练视频搜索'
  host.innerHTML = `<button class="text-btn" type="button" id="video-settings-back">返回</button><form class="form video-settings-form"><h3>来源与顺序</h3><label><input type="checkbox" name="enableBilibili" ${config.enabled.bilibili ? 'checked' : ''}> B站</label><label><input type="checkbox" name="enableYoutube" ${config.enabled.youtube ? 'checked' : ''}> YouTube</label><label>搜索策略<select name="policy"><option value="auto" ${config.policy === 'auto' ? 'selected' : ''}>自动（B站优先）</option><option value="all" ${config.policy === 'all' ? 'selected' : ''}>全部来源</option><option value="bilibili" ${config.policy === 'bilibili' ? 'selected' : ''}>仅 B站</option><option value="youtube" ${config.policy === 'youtube' ? 'selected' : ''}>仅 YouTube</option></select></label><h3>YouTube</h3><p class="ai-note">${VIDEO_CREDENTIAL_TEXT}</p><label>API Key<input type="password" name="videoKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.key ? '已保存；留空则保持不变' : '粘贴 YouTube 搜索 Key'}"></label><h3>B站搜索</h3><p class="ai-note">国内搜索使用智谱 Web-Search-Pro 返回 B站公开视频页面。不会读取地区、语言、时区或 VPN 状态。</p>${compatible ? `<label><input type="radio" name="bilSource" value="reuse-profile" ${config.bilibiliCredentialSource === 'reuse-profile' ? 'checked' : ''}> 复用当前兼容的智谱 AI 配置（${activeProfile?.name ?? ''}）</label>` : ''}<label><input type="radio" name="bilSource" value="separate" ${config.bilibiliCredentialSource === 'separate' || !compatible ? 'checked' : ''}> 使用单独的国内搜索 Key</label><label>国内搜索 Key<input type="password" name="bilibiliKey" autocomplete="new-password" placeholder="${settings.bilibiliKey ? '已保存；留空则保持不变' : '粘贴智谱 Key'}"></label><p class="ai-note">${VIDEO_PRIVACY_TEXT}</p>${settings.acknowledgedV2 ? '' : '<label class="vision-consent"><input type="checkbox" name="videoConsent">我知道了</label>'}<p role="status" class="video-config-status"></p><button class="primary full-btn" type="submit">保存并测试</button><button class="secondary full-btn" id="video-save-only" type="button">仅保存配置</button>${settings.key || settings.bilibiliKey ? '<button class="text-btn" type="button" id="video-remove-key">移除视频搜索配置</button>' : ''}</form>`
  const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.video-config-status')!
  status.textContent = settings.status
  const save = () => {
    const data = new FormData(form), key = String(data.get('videoKey') ?? ''), domestic = String(data.get('bilibiliKey') ?? '')
    if (key.trim() || settings.key) settings.save(key)
    if (domestic.trim()) settings.saveBilibiliKey(domestic)
    const keyInput = form.querySelector<HTMLInputElement>('[name=videoKey]'); if (keyInput) { keyInput.value = ''; keyInput.placeholder = '已保存；留空则保持不变' }
    const domesticInput = form.querySelector<HTMLInputElement>('[name=bilibiliKey]'); if (domesticInput) { domesticInput.value = ''; domesticInput.placeholder = '已保存；留空则保持不变' }
    const source = String(data.get('bilSource') ?? (compatible ? 'reuse-profile' : 'separate')) as 'reuse-profile' | 'separate'
    settings.setCredentialSource(source); settings.setEnabled('bilibili', data.get('enableBilibili') === 'on' || Boolean(domestic.trim())); settings.setEnabled('youtube', data.get('enableYoutube') === 'on' || (!config.enabled.youtube && Boolean(key.trim()))); settings.setPolicy(String(data.get('policy') ?? 'auto') as 'auto' | 'all' | 'bilibili' | 'youtube')
    if (form.querySelector<HTMLInputElement>('[name=videoConsent]')?.checked) settings.acknowledge()
    status.textContent = settings.status
  }
  const leave = () => { controller.abort(); back() }
  host.querySelector('#video-settings-back')!.addEventListener('click', leave)
  host.querySelector('#video-save-only')!.addEventListener('click', () => { try { save() } catch (error) { status.textContent = safeAiError(error) } })
  host.querySelector('#video-remove-key')?.addEventListener('click', () => { settings.remove(); leave() })
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (controller.signal.aborted) return
    try { save(); if (!settings.acknowledgedV2) { status.textContent = '请先确认视频搜索隐私说明。'; return }; form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true }); status.textContent = '正在测试…'; const data = new FormData(form); if (data.get('enableBilibili') === 'on') { const provider = new ZhipuBilibiliSearchProvider(settings, () => { if (String(data.get('bilSource')) === 'reuse-profile' && compatible && profiles?.active) return { key: profiles.key(profiles.active.id), baseUrl: profiles.active.baseUrl || BILIBILI_BASE_URL }; return settings.bilibiliKey ? { key: settings.bilibiliKey, baseUrl: BILIBILI_BASE_URL } : undefined }, fetch, secrets); await provider.search('cable face pull exercise tutorial', 1, controller.signal) } if (data.get('enableYoutube') === 'on') await new YouTubeVideoSearchProvider(settings, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal); if (!controller.signal.aborted && form.isConnected) { if (data.get('enableBilibili') === 'on') settings.setStatus('success', 'bilibili'); if (data.get('enableYoutube') === 'on') settings.setStatus('success', 'youtube'); status.textContent = settings.status } }
    catch (error) { if (!controller.signal.aborted && form.isConnected) { status.textContent = `测试失败 · ${safeAiError(error)}` } }
    finally { form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false }) }
  })
  dialog.addEventListener('close', () => controller.abort(), { once: true })
}
