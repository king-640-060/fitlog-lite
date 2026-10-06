import { AiError, assertNoKnownSecrets } from '../ai/security'
import { AiProfiles, isCompatibleZhipuProfile, ZHIPU_BASE_URL } from './aiProfiles'
import { VOICE_MAX_BYTES } from './voiceAudio'
export const VOICE_CONFIG_KEY = 'fitlog-voice-config-v1'
export const VOICE_KEY = 'fitlog-voice-key-v1'
export const VOICE_PRIVACY_TEXT = '语音会在你主动开启麦克风时录制，并用于转写。停止后立即释放麦克风。原始录音不会保存到 FitLog 数据库、Backup 或 Sync。'
export type VoiceMode = 'auto' | 'zhipu-key' | 'browser'
export interface VoiceConfigV1 { version: 1; mode: VoiceMode }
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export class VoiceSettings {
  private readonly storage: StorageLike
  constructor(storage: StorageLike = localStorage) { this.storage = storage }
  get config(): VoiceConfigV1 { try { const value = JSON.parse(this.storage.getItem(VOICE_CONFIG_KEY) ?? ''); if (value.version === 1 && ['auto', 'zhipu-key', 'browser'].includes(value.mode)) return { version: 1, mode: value.mode } } catch { /* optional local setting */ } return { version: 1, mode: 'auto' } }
  get key(): string { return this.storage.getItem(VOICE_KEY) ?? '' }
  save(mode: VoiceMode, key = ''): void {
    if (!['auto', 'zhipu-key', 'browser'].includes(mode)) throw new AiError('voice_config', '语音配置无效')
    if (key.includes('\n') || key.includes('\r') || key.length > 4096) throw new AiError('invalid_key', '语音 Key 格式无效')
    if (mode === 'zhipu-key' && !key.trim() && !this.key) throw new AiError('missing_key', '请填写智谱转写 Key')
    if (key.trim()) this.storage.setItem(VOICE_KEY, key.trim())
    this.storage.setItem(VOICE_CONFIG_KEY, JSON.stringify({ version: 1, mode }))
  }
  removeKey(): void { this.storage.removeItem(VOICE_KEY) }
}
export interface VoiceTranscriptionProvider { readonly label: string; transcribe(audio: Blob, signal: AbortSignal): Promise<string> }
export class ZhipuVoiceTranscriptionProvider implements VoiceTranscriptionProvider {
  readonly label = '智谱 · glm-asr-2512'
  private readonly key: string
  private readonly secrets: readonly string[]
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  constructor(key: string, secrets: readonly string[], fetcher: typeof fetch = fetch, timeoutMs = 30000) { this.key = key; this.secrets = secrets; this.fetcher = fetcher; this.timeoutMs = timeoutMs }
  async transcribe(audio: Blob, signal: AbortSignal): Promise<string> {
    if (!this.key) throw new AiError('missing_key', '请配置语音转写服务')
    if (audio.type !== 'audio/wav' || !audio.size || audio.size > VOICE_MAX_BYTES) throw new AiError('voice_size', '这段语音太长或格式不可用，请重新录制。')
    const controller = new AbortController(), abort = () => controller.abort()
    signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort()
    let expired = false
    const timer = setTimeout(() => { expired = true; abort() }, this.timeoutMs)
    const body = new FormData(); body.set('model', 'glm-asr-2512'); body.set('stream', 'false'); body.set('file', audio, 'voice.wav')
    try {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const response = await this.fetcher.call(globalThis, `${ZHIPU_BASE_URL}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${this.key}` }, body, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal })
      if (!response.ok) { await response.body?.cancel(); throw new AiError('voice_transcription', [401, 403].includes(response.status) ? '语音转写未获授权，请检查智谱 Key 和服务额度。' : '这段语音没有转写成功，可以重试或直接输入。') }
      if (!response.body || Number(response.headers.get('Content-Length')) > 32768) { await response.body?.cancel(); throw new AiError('voice_response', '语音转写结果过长，请分段录制。') }
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0
      try { while (true) { const part = await reader.read(); if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError'); if (part.done) break; bytes += part.value.byteLength; if (bytes > 32768) throw new AiError('voice_response', '语音转写结果过长，请分段录制。'); chunks.push(part.value) } } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
      const raw: unknown = JSON.parse(await new Blob(chunks as BlobPart[]).text()); assertNoKnownSecrets(raw, [...this.secrets, this.key])
      const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : undefined
      if (typeof text !== 'string' || !text.trim() || text.length > 6000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new AiError('voice_empty', '没有听清，可以再说一次。')
      return text.trim()
    } catch (error) {
      if (controller.signal.aborted) throw new AiError(expired ? 'voice_timeout' : 'aborted', expired ? '语音转写等待过久，可以重试或直接输入。' : '语音已取消。')
      if (error instanceof AiError) throw error
      throw new AiError('voice_network', '这段语音没有转写成功，请检查网络或浏览器访问限制，也可以直接输入。')
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); body.delete('file') }
  }
}
export function voiceProvider(profiles: AiProfiles, settings = new VoiceSettings()): VoiceTranscriptionProvider | undefined {
  if (settings.config.mode === 'browser') return undefined
  const active = profiles.active
  const key = settings.config.mode === 'zhipu-key' ? settings.key : isCompatibleZhipuProfile(active) ? profiles.key(active!.id) : ''
  return key ? new ZhipuVoiceTranscriptionProvider(key, profiles.knownSecrets) : undefined
}
