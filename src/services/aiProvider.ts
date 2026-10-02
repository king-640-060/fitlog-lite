import type { AiChatRequest, AiChatResponse, AiProviderProfile, AiToolCall, AiUsage } from '../ai/types'
import { AI_LIMITS, AiError, assertNoKnownSecrets, normalizeAiBaseUrl } from '../ai/security'
import { AI_VISION_LIMITS, assertVisionDataUrl, visionDataBytes, visionImagePart, type PreparedVisionImage } from '../ai/visionImages'

export interface AiProviderAdapter {
  chat(request: AiChatRequest): Promise<AiChatResponse>
  testConnection(signal?: AbortSignal): Promise<void>
  testToolCapability(signal?: AbortSignal): Promise<'supported' | 'unsupported'>
  testVisionCapability(image: PreparedVisionImage, signal?: AbortSignal): Promise<'unknown' | 'supported' | 'unsupported'>
  listModels(signal?: AbortSignal): Promise<string[]>
}
/** Pure protocol payload construction; credentials belong only to transport headers. */
export function buildAiRequest(model: string, request: AiChatRequest) {
  let imageCount = 0, imageBytes = 0
  const messages = request.messages.map(message => {
    const content = Array.isArray(message.content) ? message.content.map(part => {
      if (part.type === 'text' && typeof part.text === 'string') return { type: 'text' as const, text: part.text }
      if (part.type !== 'image_url' || message.role !== 'user') throw new AiError('invalid_image', '图片只能由用户主动选择')
      assertVisionDataUrl(part.image_url?.url)
      if (++imageCount > AI_VISION_LIMITS.images) throw new AiError('image_limit', '一次最多识别 2 张包装图片')
      imageBytes += visionDataBytes(part.image_url.url)
      if (imageBytes > AI_VISION_LIMITS.totalBytes) throw new AiError('image_limit', '图片总量过大，请缩小后再识别')
      const detail = part.image_url.detail
      if (detail !== undefined && !['auto', 'low', 'high'].includes(detail)) throw new AiError('invalid_image', '图片识别参数无效')
      return { type: 'image_url' as const, image_url: { url: part.image_url.url, ...(detail ? { detail } : {}) } }
    }) : message.content
    return { role: message.role, content, ...(message.tool_calls ? { tool_calls: message.tool_calls.map(call => ({ id: call.id, type: call.type, function: { name: call.function.name, arguments: call.function.arguments } })) } : {}), ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}) }
  })
  return {
    model,
    messages,
    ...(request.tools?.length ? { tools: request.tools.map(tool => ({ type: tool.type, function: { name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters } })), tool_choice: request.toolChoice ?? 'auto' } : {}),
  }
}
const statusError = (status: number): AiError => {
  const messages: Record<number, string> = { 400: '请求参数无效，请检查模型名称和接口兼容性。', 401: 'API Key 无效或已过期，请检查配置', 403: '当前 API Key 没有访问权限', 404: '未找到 API 地址、模型或接口，请检查配置', 429: '请求额度或速率已达到限制，请稍后再试' }
  return new AiError(`http_${status}`, messages[status] ?? (status >= 500 ? 'AI 服务暂时不可用，请稍后再试' : 'AI 服务拒绝了请求，请检查配置'))
}
export class OpenAICompatibleChatAdapter implements AiProviderAdapter {
  private readonly profile: AiProviderProfile
  private readonly apiKey: string
  private readonly fetcher: typeof fetch
  private readonly secrets: readonly string[]
  private readonly timeoutMs: number
  constructor(profile: AiProviderProfile, apiKey: string, fetcher: typeof fetch = fetch, secrets: readonly string[] = [], timeoutMs: number = AI_LIMITS.timeoutMs) {
    this.profile = { ...profile, baseUrl: normalizeAiBaseUrl(profile.baseUrl) }; this.apiKey = apiKey; this.fetcher = fetcher; this.secrets = [...secrets, apiKey].filter(Boolean); this.timeoutMs = timeoutMs
  }
  private async request(path: '/chat/completions' | '/models', body?: unknown, signal?: AbortSignal): Promise<unknown> {
    if (!this.apiKey) throw new AiError('missing_key', '请先配置 API Key')
    assertNoKnownSecrets(this.profile.baseUrl + path, this.secrets)
    if (body) {
      // The validated, ephemeral raster payload is not text. Scan all other fields.
      const payload = body as ReturnType<typeof buildAiRequest>
      const textual = { ...payload, messages: payload.messages.map(message => ({ ...message, content: Array.isArray(message.content) ? message.content.map(part => part.type === 'image_url' ? { type: part.type, image_url: { ...part.image_url, url: '[validated local image]' } } : part) : message.content })) }
      assertNoKnownSecrets(textual, this.secrets)
      if (JSON.stringify(body).length > 9 * 1024 * 1024) throw new AiError('request_limit', '请求过大，请缩小图片或上下文')
    }
    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) controller.abort()
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, this.timeoutMs)
    try {
      const response = await this.fetcher.call(globalThis, this.profile.baseUrl + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal })
      if (!response.ok) {
        // Inspect a bounded error solely to distinguish an explicit image rejection.
        // Never display or log this untrusted provider text.
        const vision = (body as ReturnType<typeof buildAiRequest> | undefined)?.messages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'))
        if (vision && [400, 415, 422].includes(response.status) && response.body) {
          const reader = response.body.getReader(); let text = '', bytes = 0
          try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 8192) break; text += new TextDecoder().decode(chunk.value) } }
          finally { await reader.cancel(); reader.releaseLock() }
          if (/unsupported[_ -](?:image|vision)|(?:image|vision|图片|图像).{0,80}(?:not supported|unsupported|不支持)|(?:does not support|不支持).{0,80}(?:image|vision|图片|图像)/i.test(text)) throw new AiError('vision_unsupported', '当前模型或接口明确不支持图片识别')
        } else await response.body?.cancel()
        throw statusError(response.status)
      }
      const declared = Number(response.headers.get('Content-Length'))
      if (declared > AI_LIMITS.responseBytes) { await response.body?.cancel(); throw new AiError('response_limit', 'AI 响应过大，请缩小请求范围') }
      if (!response.body) throw new AiError('invalid_response', 'AI 服务返回了空响应')
      const reader = response.body.getReader(), decoder = new TextDecoder()
      let bytes = 0, text = ''
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > AI_LIMITS.responseBytes) { await reader.cancel(); throw new AiError('response_limit', 'AI 响应过大，请缩小请求范围') }
          text += decoder.decode(chunk.value, { stream: true })
        }
        text += decoder.decode()
      } finally { reader.releaseLock() }
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      try { return JSON.parse(text) } catch { throw new AiError('invalid_response', 'AI 服务返回了无法识别的响应') }
    } catch (error) {
      if (error instanceof AiError) throw error
      if (controller.signal.aborted) throw new AiError(timedOut ? 'timeout' : 'aborted', timedOut ? '请求超过 45 秒，已停止；可以稍后重新发送' : '已停止本次请求')
      throw new AiError('network', '浏览器无法直接连接这个 API，可能是网络或服务端 CORS 限制。FitLog 不会自动把请求转发到其它服务器。')
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
  }
  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const raw = await this.request('/chat/completions', buildAiRequest(this.profile.model, request), request.signal) as { choices?: { message?: { content?: unknown; tool_calls?: unknown } }[]; usage?: Record<string, unknown> }
    const message = raw?.choices?.[0]?.message
    if (!message) throw new AiError('invalid_response', 'AI 服务返回了无法识别的响应')
    const content = typeof message.content === 'string' ? message.content : Array.isArray(message.content) ? message.content.filter(item => item?.type === 'text' && typeof item.text === 'string').map(item => item.text).join('\n') : ''
    const calls = message.tool_calls
    if (calls !== undefined && !Array.isArray(calls)) throw new AiError('invalid_response', '工具调用格式无效')
    if (Array.isArray(calls) && calls.length > AI_LIMITS.callsPerRound) throw new AiError('tool_limit', '一次工具请求过多，请缩小任务范围')
    const toolCalls: AiToolCall[] = (Array.isArray(calls) ? calls : []).map(call => {
      if (call?.type !== 'function' || typeof call.id !== 'string' || call.id.length > 200 || !call.id || typeof call.function?.name !== 'string' || typeof call.function?.arguments !== 'string') throw new AiError('invalid_response', '工具调用格式无效')
      return { id: call.id, type: 'function', function: { name: call.function.name, arguments: call.function.arguments } }
    })
    const number = (key: string) => typeof raw.usage?.[key] === 'number' && Number.isFinite(raw.usage[key]) && Number(raw.usage[key]) >= 0 ? Number(raw.usage[key]) : undefined
    const usage: AiUsage = { inputTokens: number('prompt_tokens'), outputTokens: number('completion_tokens'), totalTokens: number('total_tokens') }
    return { content, toolCalls, ...(Object.values(usage).some(value => value !== undefined) ? { usage } : {}) }
  }
  async testConnection(signal?: AbortSignal): Promise<void> {
    const result = await this.chat({ messages: [{ role: 'user', content: 'Reply with OK.' }], signal })
    if (!result.content.trim()) throw new AiError('empty_response', '连接成功，但模型没有返回文字')
  }
  async testToolCapability(signal?: AbortSignal): Promise<'supported' | 'unsupported'> {
    try {
      const result = await this.chat({ messages: [{ role: 'user', content: 'Call fitlog_capability_probe with no arguments.' }], tools: [{ type: 'function', function: { name: 'fitlog_capability_probe', description: 'A harmless connection capability probe. No app data.', parameters: { type: 'object', properties: {}, additionalProperties: false } } }], toolChoice: { type: 'function', function: { name: 'fitlog_capability_probe' } }, signal })
      return result.toolCalls.some(call => { try { return call.function.name === 'fitlog_capability_probe' && JSON.stringify(JSON.parse(call.function.arguments)) === '{}' } catch { return false } }) ? 'supported' : 'unsupported'
    } catch (error) { if (error instanceof AiError && error.code === 'http_400') return 'unsupported'; throw error }
  }
  async listModels(signal?: AbortSignal): Promise<string[]> {
    const result = await this.request('/models', undefined, signal) as { data?: { id?: unknown }[] }
    if (!Array.isArray(result?.data)) throw new AiError('invalid_response', '服务未提供模型列表，可以手动填写模型名称')
    return [...new Set(result.data.flatMap(item => typeof item?.id === 'string' && item.id.length <= 200 ? [item.id] : []))].slice(0, AI_LIMITS.modelIds)
  }
  async testVisionCapability(image: PreparedVisionImage, signal?: AbortSignal): Promise<'unknown' | 'supported' | 'unsupported'> {
    try {
      const result = await this.chat({ messages: [{ role: 'user', content: [{ type: 'text', text: '读取图片中央的三个数字，只返回数字。' }, visionImagePart(image)] }], signal })
      return result.content.trim() === '731' && !result.toolCalls.length ? 'supported' : 'unknown'
    } catch (error) { if (error instanceof AiError && error.code === 'vision_unsupported') return 'unsupported'; throw error }
  }
}
/** Immutable credentials and routing for one turn, independent of later profile changes. */
export class AiClient implements AiProviderAdapter {
  private readonly adapter: AiProviderAdapter
  constructor(profile: AiProviderProfile, key: string, secrets: readonly string[] = [], fetcher: typeof fetch = fetch) { this.adapter = new OpenAICompatibleChatAdapter(profile, key, fetcher, secrets) }
  chat(request: AiChatRequest): Promise<AiChatResponse> { return this.adapter.chat(request) }
  testConnection(signal?: AbortSignal): Promise<void> { return this.adapter.testConnection(signal) }
  testToolCapability(signal?: AbortSignal): Promise<'supported' | 'unsupported'> { return this.adapter.testToolCapability(signal) }
  testVisionCapability(image: PreparedVisionImage, signal?: AbortSignal): Promise<'unknown' | 'supported' | 'unsupported'> { return this.adapter.testVisionCapability(image, signal) }
  listModels(signal?: AbortSignal): Promise<string[]> { return this.adapter.listModels(signal) }
}
