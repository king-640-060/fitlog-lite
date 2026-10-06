import { AiError, assertNoKnownSecrets } from '../ai/security'
import { videoQueryVariants } from './trainingVideoIntent'

export const VIDEO_CONFIG_KEY = 'fitlog-video-search-config-v1'
export const VIDEO_CONFIG_KEY_V2 = 'fitlog-video-search-config-v2'
export const VIDEO_KEY = 'fitlog-video-search-key-v1'
export const BILIBILI_KEY_V2 = 'fitlog-video-search-bilibili-key-v2'
export const VIDEO_PRIVACY_KEY = 'fitlog-video-search-privacy-ack-v1'
export const VIDEO_PRIVACY_KEY_V2 = 'fitlog-video-search-privacy-ack-v2'
export const VIDEO_PRIVACY_TEXT = '搜索训练视频会把动作关键词发送给已启用的视频搜索服务；播放视频时，浏览器会连接对应的外部视频服务。'
export const VIDEO_CREDENTIAL_TEXT = '视频搜索凭据只保存在当前设备浏览器，并会直接用于连接已启用的视频搜索服务。'
export const BILIBILI_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

export type VideoProviderId = 'bilibili' | 'youtube'
export type VideoSourcePolicy = 'auto' | 'all' | 'bilibili' | 'youtube'
export interface VideoSearchConfigV1 { version: 1; provider: 'youtube'; status: 'configured' | 'success' | 'failed' }
export interface VideoSearchConfigV2 {
  version: 2
  enabled: { bilibili: boolean; youtube: boolean }
  policy: VideoSourcePolicy
  bilibiliStatus: 'unconfigured' | 'configured' | 'success' | 'failed'
  youtubeStatus: 'unconfigured' | 'configured' | 'success' | 'failed'
  bilibiliCredentialSource: 'reuse-profile' | 'separate'
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
function defaultStorage(): StorageLike { return globalThis.localStorage }
function parseConfig(storage: StorageLike): VideoSearchConfigV2 {
  try {
    const value = JSON.parse(storage.getItem(VIDEO_CONFIG_KEY_V2) ?? '') as Partial<VideoSearchConfigV2>
    if (value.version === 2 && value.enabled && ['auto', 'all', 'bilibili', 'youtube'].includes(value.policy ?? '')) {
      return { version: 2, enabled: { bilibili: value.enabled.bilibili === true, youtube: value.enabled.youtube === true }, policy: value.policy!, bilibiliStatus: value.bilibiliStatus ?? 'unconfigured', youtubeStatus: value.youtubeStatus ?? 'unconfigured', bilibiliCredentialSource: value.bilibiliCredentialSource === 'separate' ? 'separate' : 'reuse-profile' }
    }
  } catch { /* migrate below */ }
  let youtubeStatus: VideoSearchConfigV2['youtubeStatus'] = storage.getItem(VIDEO_KEY) ? 'configured' : 'unconfigured'
  try { const old = JSON.parse(storage.getItem(VIDEO_CONFIG_KEY) ?? '') as VideoSearchConfigV1; if (old.status === 'success' || old.status === 'failed') youtubeStatus = old.status } catch { /* old config is optional */ }
  return { version: 2, enabled: { bilibili: false, youtube: Boolean(storage.getItem(VIDEO_KEY)) }, policy: 'auto', bilibiliStatus: 'unconfigured', youtubeStatus, bilibiliCredentialSource: 'reuse-profile' }
}
export class VideoSearchSettings {
  private readonly storage: StorageLike
  constructor(storage: StorageLike = defaultStorage()) { this.storage = storage }
  get key(): string { return this.storage.getItem(VIDEO_KEY) ?? '' }
  get bilibiliKey(): string { return this.storage.getItem(BILIBILI_KEY_V2) ?? '' }
  get acknowledged(): boolean { return this.storage.getItem(VIDEO_PRIVACY_KEY) === '1' || this.storage.getItem(VIDEO_PRIVACY_KEY_V2) === '1' }
  get acknowledgedV2(): boolean { return this.storage.getItem(VIDEO_PRIVACY_KEY_V2) === '1' }
  acknowledge(): void { this.storage.setItem(VIDEO_PRIVACY_KEY_V2, '1') }
  get config(): VideoSearchConfigV2 { return parseConfig(this.storage) }
  get policy(): VideoSourcePolicy { return this.config.policy }
  get status(): string { const c = this.config; return c.youtubeStatus === 'success' || c.bilibiliStatus === 'success' ? '测试成功' : c.youtubeStatus === 'failed' || c.bilibiliStatus === 'failed' ? '测试失败' : (c.enabled.youtube || c.enabled.bilibili) ? '已配置' : '未配置' }
  save(key: string): void {
    const value = key.trim()
    if (value) { if (!/^[A-Za-z0-9_-]{10,200}$/.test(value)) throw new AiError('invalid_key', '视频搜索 Key 格式不正确'); this.storage.setItem(VIDEO_KEY, value) }
    else if (!this.key) throw new AiError('missing_key', '请填写视频搜索 Key')
    this.setConfig({ youtubeStatus: 'configured', enabled: { ...this.config.enabled, youtube: true } })
  }
  saveBilibiliKey(key: string): void {
    const value = key.trim()
    if (value && (value.includes('\\n') || value.includes('\\r') || value.length > 4096)) throw new AiError('invalid_key', '国内视频搜索 Key 格式无效')
    if (value) this.storage.setItem(BILIBILI_KEY_V2, value)
    else if (!this.bilibiliKey) throw new AiError('missing_key', '请填写国内视频搜索 Key，或选择复用兼容的智谱 AI 配置')
    this.setConfig({ bilibiliStatus: 'configured', enabled: { ...this.config.enabled, bilibili: true }, bilibiliCredentialSource: 'separate' })
  }
  setCredentialSource(source: VideoSearchConfigV2['bilibiliCredentialSource']): void {
    const current = this.config
    // A connection result belongs to its credential source; changing source keeps the key but needs a fresh test.
    this.setConfig({ bilibiliCredentialSource: source, enabled: { ...current.enabled, bilibili: true }, ...(current.bilibiliCredentialSource !== source ? { bilibiliStatus: source === 'separate' && this.bilibiliKey ? 'configured' : 'unconfigured' } : {}) })
  }
  setPolicy(policy: VideoSourcePolicy): void { this.setConfig({ policy }) }
  setEnabled(provider: VideoProviderId, enabled: boolean): void { this.setConfig({ enabled: { ...this.config.enabled, [provider]: enabled } }) }
  setStatus(status: 'success' | 'failed', provider: VideoProviderId = 'youtube'): void { this.setConfig({ [provider === 'youtube' ? 'youtubeStatus' : 'bilibiliStatus']: status }) }
  private setConfig(partial: Partial<VideoSearchConfigV2>): void { const current = this.config; this.storage.setItem(VIDEO_CONFIG_KEY_V2, JSON.stringify({ ...current, ...partial, enabled: { ...current.enabled, ...(partial.enabled ?? {}) }, version: 2 })) }
  remove(): void { this.storage.removeItem(VIDEO_KEY); this.storage.removeItem(BILIBILI_KEY_V2); this.storage.removeItem(VIDEO_CONFIG_KEY); this.storage.removeItem(VIDEO_CONFIG_KEY_V2); this.storage.removeItem(VIDEO_PRIVACY_KEY); this.storage.removeItem(VIDEO_PRIVACY_KEY_V2) }
}
export interface VideoSearchResult {
  id: string; title: string; channel: string; thumbnailUrl: string; publishedAt?: string
  provider: VideoProviderId; providerLabel: string; watchUrl: string; embedUrl: string
}
export type TrainingVideoSearchResult = VideoSearchResult
export interface VideoSearchProvider { search(query: string, limit?: number, signal?: AbortSignal): Promise<VideoSearchResult[]> }
export interface VideoSearchOutcome { videos: VideoSearchResult[]; notices: string[] }
export interface DetailedVideoSearchProvider extends VideoSearchProvider { searchDetailed(query: string, limit?: number, signal?: AbortSignal): Promise<VideoSearchOutcome> }
export function validVideoId(id: unknown): id is string { return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id) }
export function videoWatchUrl(id: string): string { if (!validVideoId(id)) throw new AiError('video_id', '视频 ID 无效'); return `https://www.youtube.com/watch?v=${id}` }
export function videoEmbedUrl(id: string, origin: string): string { if (!validVideoId(id)) throw new AiError('video_id', '视频 ID 无效'); const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`); url.search = new URLSearchParams({ autoplay: '0', playsinline: '1', enablejsapi: '1', origin: new URL(origin).origin }).toString(); return url.href }
export function validBilibiliId(id: unknown): id is string { return typeof id === 'string' && /^BV[0-9A-Za-z]{10}$/.test(id) }
export function bilibiliWatchUrl(id: string): string { if (!validBilibiliId(id)) throw new AiError('bilibili_id', 'B站视频 ID 无效'); return `https://www.bilibili.com/video/${id}` }
export function bilibiliEmbedUrl(id: string): string { if (!validBilibiliId(id)) throw new AiError('bilibili_id', 'B站视频 ID 无效'); return `https://player.bilibili.com/player.html?${new URLSearchParams({ bvid: id, autoplay: '0', poster: '1', danmaku: '0' })}` }
export function extractBilibiliVideoId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 500) return undefined
  try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.bilibili.com', 'bilibili.com', 'm.bilibili.com'].includes(url.hostname)) return undefined; const match = /^\/video\/(BV[0-9A-Za-z]{10})\/?$/.exec(url.pathname); return match?.[1] } catch { return undefined }
}
export function normalizeBilibiliVideoUrl(value: unknown): string | undefined { const id = extractBilibiliVideoId(value); return id ? bilibiliWatchUrl(id) : undefined }
export function validateVideoQuery(query: string, limit: number, secrets: readonly string[] = []): string {
  const value = query.trim(); assertNoKnownSecrets(value, secrets)
  if (!value || value.length > 120 || !Number.isInteger(limit) || limit < 1 || limit > 5 || /(?:https?:|javascript:|data:|www\.|@|[\r\n\x00-\x1f]|API.?Key|token|密码|体重|公斤|饮食|热量|健康记录|私人备注|病史|诊断|不舒服|疼痛|受伤|术后|weight|bodyweight|calorie|medical|diagnos|private|health|diet|kg|injury|pain)/i.test(value)) throw new AiError('invalid_arguments', '仅填写训练动作与技术关键词（最多 120 字），结果数量为 1–5')
  return value
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function projectVideoResults(raw: unknown, limit: number, secrets: readonly string[]): VideoSearchResult[] {
  assertNoKnownSecrets(raw, secrets); const root = object(raw); if (!Array.isArray(root.items)) throw new AiError('invalid_response', '视频服务返回了无法识别的结果')
  const seen = new Set<string>(), results: VideoSearchResult[] = []
  for (const item of root.items.slice(0, 50)) { const entry = object(item), id = object(entry.id).videoId, snippet = object(entry.snippet); if (!validVideoId(id) || seen.has(id) || typeof snippet.title !== 'string' || !snippet.title.trim() || typeof snippet.channelTitle !== 'string') continue; seen.add(id); results.push({ id, title: snippet.title.slice(0, 240), channel: snippet.channelTitle.slice(0, 100), thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, provider: 'youtube', providerLabel: 'YouTube', watchUrl: videoWatchUrl(id), embedUrl: '' , ...(typeof snippet.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(snippet.publishedAt) && Number.isFinite(Date.parse(snippet.publishedAt)) ? { publishedAt: snippet.publishedAt.slice(0, 30) } : {}) }); if (results.length === limit) break }
  return results
}
async function readJson(response: Response, controller: AbortController): Promise<unknown> {
  if (!response.ok) { await response.body?.cancel(); throw new AiError('video_service', [401, 403].includes(response.status) ? '视频搜索未获授权，请检查 Key、API 启用状态、网站限制和额度。' : '视频搜索服务暂时不可用，请稍后重试。') }
  if (Number(response.headers.get('Content-Length')) > 128 * 1024 || !response.body) { await response.body?.cancel(); throw new AiError('video_response_limit', '视频服务响应过大或为空') }
  const reader = response.body.getReader(), decoder = new TextDecoder(); let bytes = 0, text = ''
  try { while (true) { const chunk = await reader.read(); if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError'); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 128 * 1024) throw new AiError('video_response_limit', '视频服务响应过大'); text += decoder.decode(chunk.value, { stream: true }) } text += decoder.decode() } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  try { return JSON.parse(text) } catch { throw new AiError('invalid_response', '视频服务返回了无法识别的结果') }
}
export class YouTubeVideoSearchProvider implements VideoSearchProvider {
  private readonly settings: VideoSearchSettings; private readonly fetcher: typeof fetch; private readonly secrets: () => readonly string[]; private readonly timeoutMs: number
  constructor(settings = new VideoSearchSettings(), fetcher: typeof fetch = fetch, secrets: () => readonly string[] = () => [], timeoutMs = 15000) { this.settings = settings; this.fetcher = fetcher; this.secrets = secrets; this.timeoutMs = timeoutMs }
  async search(query: string, limit = 3, signal?: AbortSignal): Promise<VideoSearchResult[]> {
    if (!this.settings.key) throw new AiError('video_not_configured', 'YouTube 视频搜索尚未配置。'); if (!this.settings.acknowledged) throw new AiError('video_privacy', '请先在训练视频搜索设置中确认隐私说明，再搜索。')
    const key = this.settings.key, value = validateVideoQuery(query, limit, [...this.secrets(), key]), url = new URL('https://www.googleapis.com/youtube/v3/search'); url.search = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true', order: 'relevance', safeSearch: 'strict', maxResults: String(limit), q: value }).toString()
    const controller = new AbortController(); let expired = false; const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort(); const timer = setTimeout(() => { expired = true; abort() }, this.timeoutMs)
    try { const response = await this.fetcher.call(globalThis, url.href, { headers: { 'X-Goog-Api-Key': key }, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'strict-origin-when-cross-origin', signal: controller.signal }); return projectVideoResults(await readJson(response, controller), limit, [...this.secrets(), key]) }
    catch (error) { if (controller.signal.aborted) throw new AiError(expired ? 'video_timeout' : 'aborted', expired ? '视频搜索等待过久，已停止。' : '已停止视频搜索。'); if (error instanceof AiError) throw error; throw new AiError('video_network', '无法连接视频搜索服务，请检查网络或浏览器访问限制。') }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
}
type ZhipuCredential = { key: string; baseUrl?: string }
function normalizeBaseUrl(value: string): string { return value.trim().replace(/\/$/, '') }
export interface BilibiliCandidates { videos: VideoSearchResult[]; candidateLinks: number; validVideos: number }
export function extractBilibiliCandidates(raw: unknown, limit = 3, secrets: readonly string[] = []): BilibiliCandidates {
  const encoded = JSON.stringify(raw)
  if (!encoded || new TextEncoder().encode(encoded).byteLength > 128 * 1024) throw new AiError('video_response_limit', '视频服务响应过大或为空')
  assertNoKnownSecrets(encoded, secrets)
  const videos: VideoSearchResult[] = [], seen = new Set<string>(), links = new Set<string>()
  let visited = 0
  const add = (url: string, title?: string, channel?: string) => {
    links.add(url)
    const canonical = normalizeBilibiliVideoUrl(url), id = canonical && extractBilibiliVideoId(canonical)
    if (!id || seen.has(id)) return
    seen.add(id)
    if (videos.length >= Math.min(5, limit)) return
    const safeText = (value: string) => value.replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
    videos.push({ id, title: safeText(title ?? '').slice(0, 160) || `B站训练视频 ${id}`, channel: safeText(channel ?? '哔哩哔哩').slice(0, 80), thumbnailUrl: '', provider: 'bilibili', providerLabel: 'B站', watchUrl: canonical!, embedUrl: bilibiliEmbedUrl(id) })
  }
  const text = (value: string, title?: string, channel?: string) => {
    if (/<(?:iframe|script)\b/i.test(value)) return
    const decoded = value.slice(0, 8192).replace(/\\\//g, '/').replace(/\\u002f/gi, '/').replace(/&amp;/g, '&')
    for (const match of decoded.matchAll(/\[([^\]\n]{1,240})\]\((https?:\/\/[^\s<>"'()]{1,500})\)/g)) add(match[2]!, match[1], channel)
    for (const match of decoded.matchAll(/https?:\/\/[^\s<>"'()\]，。；]{1,500}/g)) add(match[0].replace(/[.,;]+$/, ''), title, channel)
  }
  const visit = (value: unknown, depth = 0, title?: string, channel?: string): void => {
    if (++visited > 1500 || depth > 12) return
    if (typeof value === 'string') { text(value, title, channel); return }
    if (Array.isArray(value)) { value.slice(0, 80).forEach(item => visit(item, depth + 1, title, channel)); return }
    if (!value || typeof value !== 'object') return
    const entry = value as Record<string, unknown>
    const name = [entry.title, entry.name].find((item): item is string => typeof item === 'string') ?? title
    const author = [entry.author, entry.media, entry.site_name].find((item): item is string => typeof item === 'string') ?? channel
    Object.values(entry).slice(0, 40).forEach(item => visit(item, depth + 1, name, author))
  }
  visit(raw)
  return { videos, candidateLinks: links.size, validVideos: seen.size }
}
export class ZhipuBilibiliSearchProvider implements VideoSearchProvider {
  lastDiagnostics?: { requests: number; candidateLinks: number; validVideos: number }
  private readonly settings: VideoSearchSettings; private readonly credential: () => ZhipuCredential | undefined; private readonly fetcher: typeof fetch; private readonly secrets: () => readonly string[]; private readonly timeoutMs: number
  constructor(settings: VideoSearchSettings, credential: () => ZhipuCredential | undefined, fetcher: typeof fetch = fetch, secrets: () => readonly string[] = () => [], timeoutMs = 12000) { this.settings = settings; this.credential = credential; this.fetcher = fetcher; this.secrets = secrets; this.timeoutMs = timeoutMs }
  async search(query: string, limit = 3, signal?: AbortSignal): Promise<VideoSearchResult[]> {
    if (!this.settings.acknowledgedV2) throw new AiError('video_privacy', '请先确认新版训练视频搜索隐私说明。'); const credential = this.credential(); if (!credential?.key) throw new AiError('video_not_configured', '国内视频搜索尚未配置。'); const value = validateVideoQuery(query, limit, [...this.secrets(), credential.key])
    const controller = new AbortController(); let expired = false; const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort(); const timer = setTimeout(() => { expired = true; abort() }, this.timeoutMs)
    this.lastDiagnostics = undefined
    try {
      const diagnostics = { requests: 0, candidateLinks: 0, validVideos: 0 }
      for (const variant of videoQueryVariants(value)) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        diagnostics.requests++
        const response = await this.fetcher.call(globalThis, `${normalizeBaseUrl(credential.baseUrl ?? BILIBILI_BASE_URL)}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential.key}` }, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'strict-origin-when-cross-origin', signal: controller.signal, body: JSON.stringify({ model: 'web-search-pro', stream: false, temperature: 0.1, messages: [{ role: 'user', content: `搜索 ${variant} 的训练动作教学。只返回与动作直接相关的 B站公开视频，优先 canonical https://www.bilibili.com/video/BV... 链接。不要搜索页、专栏、用户主页或非视频页面。` }] }) })
        const parsed = extractBilibiliCandidates(await readJson(response, controller), limit, [...this.secrets(), credential.key])
        diagnostics.candidateLinks += parsed.candidateLinks; diagnostics.validVideos += parsed.validVideos
        this.lastDiagnostics = { ...diagnostics }
        if (parsed.videos.length) return parsed.videos
      }
      return []
    }
    catch (error) { if (controller.signal.aborted) throw new AiError(expired ? 'video_timeout' : 'aborted', expired ? '国内视频搜索等待过久，已停止。' : '已停止视频搜索。'); if (error instanceof AiError) throw error; throw new AiError('video_network', '无法连接国内视频搜索服务，请检查 API 地址、网络或 CORS 设置。') }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
}
export class TrainingVideoSearchRouter implements DetailedVideoSearchProvider {
  private readonly settings: VideoSearchSettings
  private readonly providers: { bilibili?: VideoSearchProvider; youtube?: VideoSearchProvider }
  constructor(settings: VideoSearchSettings, providers: { bilibili?: VideoSearchProvider; youtube?: VideoSearchProvider }) { this.settings = settings; this.providers = providers }
  async search(query: string, limit = 3, signal?: AbortSignal): Promise<VideoSearchResult[]> { return (await this.searchDetailed(query, limit, signal)).videos }
  async searchDetailed(query: string, limit = 3, signal?: AbortSignal): Promise<VideoSearchOutcome> {
    const config = this.settings.config
    if (!config.enabled.bilibili && !config.enabled.youtube) throw new AiError('video_not_configured', '训练视频搜索尚未配置。请打开 AI 设置中的训练视频搜索。')
    const notices: string[] = [], videos: VideoSearchResult[] = [], run = async (id: VideoProviderId) => { const provider = this.providers[id]; if (!provider || !config.enabled[id]) return []; try { return await provider.search(query, limit, signal) } catch (error) { if (error instanceof AiError && (error.code === 'video_not_configured' || error.code === 'video_privacy')) throw error; notices.push(error instanceof AiError ? error.message : (id === 'bilibili' ? 'B站搜索暂时不可用' : 'YouTube 搜索暂时不可用')); return [] } }
    if (config.policy === 'bilibili') videos.push(...await run('bilibili')); else if (config.policy === 'youtube') videos.push(...await run('youtube')); else if (config.policy === 'all') { const [b, y] = await Promise.all([run('bilibili'), run('youtube')]); videos.push(...b, ...y) } else { const b = await run('bilibili'); videos.push(...b); if (!videos.length) videos.push(...await run('youtube')) }
    return { videos: videos.slice(0, Math.min(5, limit)), notices }
  }
}
