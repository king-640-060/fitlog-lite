import { AiError, assertNoKnownSecrets } from '../ai/security'
export const VIDEO_CONFIG_KEY = 'fitlog-video-search-config-v1'
export const VIDEO_KEY = 'fitlog-video-search-key-v1'
export const VIDEO_PRIVACY_KEY = 'fitlog-video-search-privacy-ack-v1'
export const VIDEO_PRIVACY_TEXT = '搜索训练视频会把动作关键词发送给 YouTube；播放视频时，浏览器会连接外部视频服务。'
export const VIDEO_CREDENTIAL_TEXT = '视频搜索 Key 保存在当前设备浏览器，并会直接用于连接视频搜索服务。'
export interface VideoSearchConfigV1 { version: 1; provider: 'youtube'; status: 'configured' | 'success' | 'failed' }
export class VideoSearchSettings {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  constructor(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) { this.storage = storage }
  get key(): string { return this.storage.getItem(VIDEO_KEY) ?? '' }
  get acknowledged(): boolean { return this.storage.getItem(VIDEO_PRIVACY_KEY) === '1' }
  acknowledge(): void { this.storage.setItem(VIDEO_PRIVACY_KEY, '1') }
  get status(): string {
    if (!this.key) return '未配置'
    try { const v = JSON.parse(this.storage.getItem(VIDEO_CONFIG_KEY) ?? '{}') as VideoSearchConfigV1; return v.status === 'success' ? '测试成功' : v.status === 'failed' ? '测试失败' : '已配置' } catch { return '已配置' }
  }
  save(key: string): void {
    if (key.trim()) {
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(key.trim())) throw new AiError('invalid_key', '视频搜索 Key 格式不正确')
      this.storage.setItem(VIDEO_KEY, key.trim()); this.setStatus('configured')
    } else if (!this.key) throw new AiError('missing_key', '请填写视频搜索 Key')
  }
  setStatus(status: VideoSearchConfigV1['status']): void { this.storage.setItem(VIDEO_CONFIG_KEY, JSON.stringify({ version: 1, provider: 'youtube', status } satisfies VideoSearchConfigV1)) }
  remove(): void { this.storage.removeItem(VIDEO_KEY); this.storage.removeItem(VIDEO_CONFIG_KEY) }
}
export interface VideoSearchResult { id: string; title: string; channel: string; thumbnailUrl: string; publishedAt?: string }
export interface VideoSearchProvider { search(query: string, limit?: number, signal?: AbortSignal): Promise<VideoSearchResult[]> }
export function validVideoId(id: unknown): id is string { return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id) }
export function videoWatchUrl(id: string): string { if (!validVideoId(id)) throw new AiError('video_id', '视频 ID 无效'); return `https://www.youtube.com/watch?v=${id}` }
export function videoEmbedUrl(id: string, origin: string): string {
  if (!validVideoId(id)) throw new AiError('video_id', '视频 ID 无效')
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`)
  url.search = new URLSearchParams({ autoplay: '0', playsinline: '1', enablejsapi: '1', origin: new URL(origin).origin }).toString()
  return url.href
}
export function validateVideoQuery(query: string, limit: number, secrets: readonly string[] = []): string {
  const value = query.trim()
  assertNoKnownSecrets(value, secrets)
  if (!value || value.length > 120 || !Number.isInteger(limit) || limit < 1 || limit > 5 || /(?:https?:|www\.|@|\d|[\r\n\x00-\x1f]|API.?Key|token|密码|体重|公斤|饮食|热量|健康记录|私人备注|病史|诊断|weight|bodyweight|calorie|medical|diagnos|private|health|diet|kg)/i.test(value)) throw new AiError('invalid_arguments', '仅填写训练动作与技术关键词（最多 120 字），结果数量为 1–5')
  return value
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function projectVideoResults(raw: unknown, limit: number, secrets: readonly string[]): VideoSearchResult[] {
  assertNoKnownSecrets(raw, secrets)
  const root = object(raw)
  if (!Array.isArray(root.items)) throw new AiError('invalid_response', '视频服务返回了无法识别的结果')
  const seen = new Set<string>(), results: VideoSearchResult[] = []
  for (const item of root.items.slice(0, 50)) {
    const entry = object(item), id = object(entry.id).videoId, snippet = object(entry.snippet)
    if (!validVideoId(id) || seen.has(id) || typeof snippet.title !== 'string' || !snippet.title.trim() || typeof snippet.channelTitle !== 'string') continue
    seen.add(id)
    results.push({ id, title: snippet.title.slice(0, 240), channel: snippet.channelTitle.slice(0, 100), thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, ...(typeof snippet.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(snippet.publishedAt) && Number.isFinite(Date.parse(snippet.publishedAt)) ? { publishedAt: snippet.publishedAt.slice(0, 30) } : {}) })
    if (results.length === limit) break
  }
  return results
}
export class YouTubeVideoSearchProvider implements VideoSearchProvider {
  private readonly settings: VideoSearchSettings
  private readonly fetcher: typeof fetch
  private readonly secrets: () => readonly string[]
  private readonly timeoutMs: number
  constructor(settings = new VideoSearchSettings(), fetcher: typeof fetch = fetch, secrets: () => readonly string[] = () => [], timeoutMs = 15000) { this.settings = settings; this.fetcher = fetcher; this.secrets = secrets; this.timeoutMs = timeoutMs }
  async search(query: string, limit = 3, signal?: AbortSignal): Promise<VideoSearchResult[]> {
    if (!this.settings.key) throw new AiError('video_not_configured', '训练视频搜索尚未配置。请打开 AI 设置中的训练视频搜索。')
    if (!this.settings.acknowledged) throw new AiError('video_privacy', '请先在训练视频搜索设置中确认隐私说明，再搜索。')
    const key = this.settings.key, secrets = [...this.secrets(), key], value = validateVideoQuery(query, limit, secrets)
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.search = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true', order: 'relevance', safeSearch: 'strict', maxResults: String(limit), q: value }).toString()
    const controller = new AbortController(); let expired = false
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort()
    const timer = setTimeout(() => { expired = true; abort() }, this.timeoutMs)
    try {
      const response = await this.fetcher.call(globalThis, url.href, { headers: { 'X-Goog-Api-Key': key }, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'strict-origin-when-cross-origin', signal: controller.signal })
      if (!response.ok) { await response.body?.cancel(); throw new AiError('video_service', [401,403].includes(response.status) ? '视频搜索未获授权，请检查 Key、YouTube API 启用状态、网站限制和额度。' : '视频搜索服务暂时不可用，请稍后重试。') }
      if (Number(response.headers.get('Content-Length')) > 128 * 1024 || !response.body) { await response.body?.cancel(); throw new AiError('video_response_limit', '视频服务响应过大或为空') }
      const reader = response.body.getReader(), decoder = new TextDecoder(); let bytes = 0, text = ''
      const cancel = () => { void reader.cancel().catch(() => {}) }; controller.signal.addEventListener('abort', cancel, { once: true })
      try {
        while (true) {
          const chunk = await reader.read()
          if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > 128 * 1024) throw new AiError('video_response_limit', '视频服务响应过大')
          text += decoder.decode(chunk.value, { stream: true })
        }
        text += decoder.decode()
      } finally { controller.signal.removeEventListener('abort', cancel); void reader.cancel().catch(() => {}); reader.releaseLock() }
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      let raw: unknown
      try { raw = JSON.parse(text) } catch { throw new AiError('invalid_response', '视频服务返回了无法识别的结果') }
      return projectVideoResults(raw, limit, secrets)
    } catch (error) {
      if (controller.signal.aborted) throw new AiError(expired ? 'video_timeout' : 'aborted', expired ? '视频搜索等待过久，已停止。' : '已停止视频搜索。')
      if (error instanceof AiError) throw error
      throw new AiError('video_network', '无法连接视频搜索服务，请检查网络或浏览器访问限制。')
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
}
