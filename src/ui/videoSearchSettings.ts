import { VideoSearchSettings, YouTubeVideoSearchProvider, VIDEO_CREDENTIAL_TEXT, VIDEO_PRIVACY_TEXT } from '../services/videoSearchService'
import { safeAiError } from '../ai/security'
export function mountVideoSearchSettings(host: HTMLElement, dialog: HTMLDialogElement, back: () => void, secrets: () => readonly string[]): void {
  const settings = new VideoSearchSettings(), controller = new AbortController()
  dialog.querySelector('h2')!.textContent = '训练视频搜索'
  host.innerHTML = `<button class="text-btn" type="button" id="video-settings-back">返回</button><form class="form video-settings-form"><h3>YouTube</h3><p class="ai-note">${VIDEO_CREDENTIAL_TEXT}</p><p class="ai-note">在 Google Cloud 启用 YouTube Data API v3，限制 Key 仅用于该 API 和当前网站来源。浏览器配置不能绝对隐藏凭据。</p><label>API Key<input type="password" name="videoKey" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.key ? '已保存；留空则保持不变' : '粘贴你的视频搜索 Key'}"></label><p class="ai-note">${VIDEO_PRIVACY_TEXT}</p>${settings.acknowledged ? '' : '<label class="vision-consent"><input type="checkbox" name="videoConsent">我知道了</label>'}<p role="status" class="video-config-status"></p><button class="primary full-btn" type="submit">保存并测试</button><button class="secondary full-btn" id="video-save-only" type="button">仅保存配置</button>${settings.key ? '<button class="text-btn" type="button" id="video-remove-key">移除视频搜索配置</button>' : ''}</form>`
  const form = host.querySelector<HTMLFormElement>('form')!, status = host.querySelector<HTMLElement>('.video-config-status')!, key = form.querySelector<HTMLInputElement>('input[name=videoKey]')!
  status.textContent = settings.status
  const save = () => { settings.save(key.value); key.value = ''; key.placeholder = '已保存；留空则保持不变'; if (form.querySelector<HTMLInputElement>('[name=videoConsent]')?.checked) settings.acknowledge(); status.textContent = settings.status }
  const leave = () => { controller.abort(); back() }
  host.querySelector('#video-settings-back')!.addEventListener('click', leave)
  host.querySelector('#video-save-only')!.addEventListener('click', () => { try { save() } catch (error) { status.textContent = safeAiError(error) } })
  host.querySelector('#video-remove-key')?.addEventListener('click', () => { settings.remove(); leave() })
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (controller.signal.aborted) return
    try {
      save()
      if (!settings.acknowledged) { status.textContent = '请先确认视频搜索隐私说明。'; return }
      form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true }); status.textContent = '正在测试…'
      await new YouTubeVideoSearchProvider(settings, fetch, secrets).search('cable face pull exercise tutorial', 1, controller.signal)
      if (!controller.signal.aborted && form.isConnected) { settings.setStatus('success'); status.textContent = settings.status }
    } catch (error) { if (!controller.signal.aborted && form.isConnected) { settings.setStatus('failed'); status.textContent = `测试失败 · ${safeAiError(error)}` } }
    finally { form.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false }) }
  })
  dialog.addEventListener('close', () => controller.abort(), { once: true })
}
