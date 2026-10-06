import { AiProfiles } from '../services/aiProfiles'
import { VoiceSettings, voiceProvider, VOICE_PRIVACY_TEXT, type VoiceMode } from '../services/voiceTranscriptionService'
import { safeAiError } from '../ai/security'
import { icon } from './icons'
export function mountVoiceSettings(host: HTMLElement, dialog: HTMLDialogElement, back: () => void, profiles: AiProfiles): void {
  const settings = new VoiceSettings(), provider = voiceProvider(profiles, settings)
  dialog.querySelector('h2')!.textContent = '语音'
  host.innerHTML = `<button class="text-btn" id="voice-settings-back">${icon('chevron', 16)} 返回</button><form class="form voice-settings-form"><section><h3>语音转写</h3><p class="ai-note" data-voice-provider>${provider ? `${provider.label} · ${settings.config.mode === 'auto' ? '复用当前 AI Key' : '独立 Key'}` : settings.config.mode === 'browser' ? '浏览器语音输入 · 兼容模式' : '当前 AI 服务不支持直接语音转写'}</p><label>转写方式<select name="voiceMode"><option value="auto" ${settings.config.mode === 'auto' ? 'selected' : ''}>复用兼容的当前 AI 服务</option><option value="zhipu-key" ${settings.config.mode === 'zhipu-key' ? 'selected' : ''}>智谱转写 · 独立 Key</option><option value="browser" ${settings.config.mode === 'browser' ? 'selected' : ''}>浏览器语音输入（兼容模式）</option></select></label><label data-voice-key hidden>智谱转写 Key<input name="voiceKey" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${settings.key ? '已保存；留空保持不变' : '粘贴智谱 API Key'}"></label></section><section><h3>如何处理语音</h3><p class="ai-note">${VOICE_PRIVACY_TEXT}</p><p class="ai-note">Voice Mode 使用智谱 GLM-ASR-2512，只发送一次 WAV 录音，最长 30 秒。录制格式按浏览器支持选择，再于内存转换。回复默认用系统语音朗读，不自动重新监听。</p><p class="ai-note">兼容模式由浏览器或系统识别，可能使用网络；它不具备 FitLog 自持麦克风的完整 Voice Mode 生命周期。</p></section><p class="ai-status" role="status"></p><button class="primary" type="submit">保存语音配置</button>${settings.key ? '<button class="text-btn danger" id="voice-remove-key" type="button">移除独立转写 Key</button>' : ''}</form>`
  const form = host.querySelector<HTMLFormElement>('form')!, mode = form.querySelector<HTMLSelectElement>('[name=voiceMode]')!
  const sync = () => { form.querySelector<HTMLElement>('[data-voice-key]')!.hidden = mode.value !== 'zhipu-key' }
  mode.addEventListener('change', sync); sync()
  host.querySelector('#voice-settings-back')!.addEventListener('click', back)
  form.addEventListener('submit', event => { event.preventDefault(); try { settings.save(mode.value as VoiceMode, form.querySelector<HTMLInputElement>('[name=voiceKey]')!.value); back() } catch (error) { form.querySelector('.ai-status')!.textContent = safeAiError(error) } })
  form.querySelector('#voice-remove-key')?.addEventListener('click', () => { settings.removeKey(); mountVoiceSettings(host, dialog, back, profiles) })
}
