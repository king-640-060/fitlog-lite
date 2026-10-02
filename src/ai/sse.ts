import type { AiChatResponse, AiChatStreamCallbacks, AiToolCall, AiUsage } from './types'
import { AI_LIMITS, AiError } from './security'
const invalid = () => new AiError('invalid_response', 'AI 服务返回了无法识别的响应')
/** Incremental UTF-8 SSE framing. Only complete, blank-line-delimited events dispatch. */
export class SseParser {
  private readonly decoder = new TextDecoder('utf-8', { fatal: true })
  private line = ''
  private data: string[] = []
  private skipLf = false
  private bytes = 0
  private readonly emit: (data: string) => void
  constructor(emit: (data: string) => void) { this.emit = emit }
  push(bytes: Uint8Array): void {
    this.bytes += bytes.byteLength
    if (this.bytes > AI_LIMITS.responseBytes) throw new AiError('response_limit', 'AI 响应过大，请缩小请求范围')
    try { this.text(this.decoder.decode(bytes, { stream: true })) } catch (error) { if (error instanceof AiError) throw error; throw invalid() }
  }
  get incompleteEvent(): boolean { return this.data.length > 0 || this.line.startsWith('data:') }
  end(): void {
    try { this.text(this.decoder.decode()) } catch (error) { if (error instanceof AiError) throw error; throw invalid() }
    // SSE does not dispatch an unfinished event at EOF.
    this.line = ''; this.data = []
  }
  private text(value: string): void {
    for (const char of value) {
      if (this.skipLf) { this.skipLf = false; if (char === '\n') continue }
      if (char === '\r' || char === '\n') { this.consumeLine(); this.skipLf = char === '\r' }
      else this.line += char
    }
  }
  private consumeLine(): void {
    const line = this.line; this.line = ''
    if (!line) { if (this.data.length) this.emit(this.data.join('\n')); this.data = []; return }
    if (line.startsWith(':')) return
    const colon = line.indexOf(':'), field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'data') this.data.push(value)
  }
}
export function streamUsage(value: unknown): AiUsage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>, usage: AiUsage = {}
  for (const [source, target] of [['prompt_tokens', 'inputTokens'], ['completion_tokens', 'outputTokens'], ['total_tokens', 'totalTokens']] as const) {
    const n = row[source]; if (typeof n === 'number' && Number.isFinite(n) && n >= 0) usage[target] = n
  }
  return Object.keys(usage).length ? usage : undefined
}
export function validateStreamCalls(calls: AiToolCall[]): void {
  if (calls.length > AI_LIMITS.callsPerRound) throw new AiError('tool_limit', '一次工具请求过多，请缩小任务范围')
  for (const call of calls) {
    if (!call.id || call.id.length > 200 || call.type !== 'function' || !/^[a-zA-Z0-9_-]{1,200}$/.test(call.function.name)) throw invalid()
    if (new TextEncoder().encode(call.function.arguments).byteLength > AI_LIMITS.toolArgumentsBytes) throw new AiError('invalid_arguments', '工具参数过大，请缩小请求范围')
    try { JSON.parse(call.function.arguments) } catch { throw invalid() }
  }
}
/** Holds only a possible credential prefix, never a completed credential, for early safe display. */
export class StreamingSecretGuard {
  private pending = ''
  private readonly secrets: string[]
  constructor(secrets: readonly string[]) { this.secrets = [...new Set(secrets.filter(Boolean))] }
  push(delta: string): string {
    const value = this.pending + delta
    if (this.secrets.some(secret => value.includes(secret))) throw new AiError('secret_detected', '内容包含已保存的凭据，请移除后再发送')
    let held = 0
    for (const secret of this.secrets) for (let n = Math.min(secret.length - 1, value.length); n > held; n--) {
      if (value.endsWith(secret.slice(0, n))) { held = n; break }
    }
    this.pending = held ? value.slice(-held) : ''
    return held ? value.slice(0, -held) : value
  }
  end(): string { const value = this.pending; this.pending = ''; return value }
}
interface PartialCall { id?: string; type?: string; name: string; arguments: string[]; argumentBytes: number }
/** Protocol aggregation owns tool fragments. Consumers see text only until final validation. */
export class ChatStreamAccumulator {
  readonly parser: SseParser
  done = false
  private seen = false
  private content: string[] = []
  private calls = new Map<number, PartialCall>()
  private usage?: AiUsage
  private finishReason?: string
  private readonly guard: StreamingSecretGuard
  private readonly callbacks: AiChatStreamCallbacks
  constructor(callbacks: AiChatStreamCallbacks = {}, secrets: readonly string[] = []) {
    this.callbacks = callbacks
    this.guard = new StreamingSecretGuard(secrets)
    this.parser = new SseParser(data => this.event(data))
  }
  private event(data: string): void {
    if (this.done) return
    if (data.trim() === '[DONE]') { this.done = true; return }
    let raw: Record<string, unknown>
    try { raw = JSON.parse(data) } catch { throw invalid() }
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.choices)) throw invalid()
    const usage = streamUsage(raw.usage); if (usage) this.usage = usage
    if (!raw.choices.length) { if (!usage) throw invalid(); return }
    const choice = raw.choices[0]
    if (!choice || typeof choice !== 'object' || !choice.delta || typeof choice.delta !== 'object') throw invalid()
    if (choice.finish_reason !== undefined && choice.finish_reason !== null) { if (typeof choice.finish_reason !== 'string') throw invalid(); this.finishReason = choice.finish_reason }
    this.seen = true
    const delta = choice.delta
    if (delta.content !== undefined && delta.content !== null) {
      if (typeof delta.content !== 'string') throw invalid()
      this.content.push(delta.content)
      const safe = this.guard.push(delta.content); if (safe) this.callbacks.onContentDelta?.(safe)
    }
    if (delta.tool_calls !== undefined) {
      if (!Array.isArray(delta.tool_calls)) throw invalid()
      for (const fragment of delta.tool_calls) {
        if (!fragment || !Number.isInteger(fragment.index) || fragment.index < 0 || fragment.index >= AI_LIMITS.callsPerRound) throw invalid()
        let call = this.calls.get(fragment.index)
        if (!call) { call = { name: '', arguments: [], argumentBytes: 0 }; this.calls.set(fragment.index, call) }
        for (const field of ['id', 'type'] as const) if (fragment[field] !== undefined) {
          const value = fragment[field]
          if (typeof value !== 'string' || (field === 'id' && (!value || value.length > 200)) || (field === 'type' && value !== 'function') || (call[field] !== undefined && call[field] !== value)) throw invalid()
          call[field] = value
        }
        if (fragment.function !== undefined) {
          if (!fragment.function || typeof fragment.function !== 'object') throw invalid()
          if (fragment.function.name !== undefined) { if (typeof fragment.function.name !== 'string') throw invalid(); call.name += fragment.function.name; if (call.name.length > 200) throw invalid() }
          if (fragment.function.arguments !== undefined) {
            if (typeof fragment.function.arguments !== 'string') throw invalid()
            call.argumentBytes += new TextEncoder().encode(fragment.function.arguments).byteLength
            if (call.argumentBytes > AI_LIMITS.toolArgumentsBytes) throw new AiError('invalid_arguments', '工具参数过大，请缩小请求范围')
            call.arguments.push(fragment.function.arguments)
          }
        }
      }
    }
  }
  finish(): AiChatResponse {
    if (!this.done && this.parser.incompleteEvent) throw invalid()
    this.parser.end()
    if (!this.seen) throw invalid()
    const toolCalls: AiToolCall[] = [...this.calls].sort(([a], [b]) => a - b).map(([, call]) => ({ id: call.id ?? '', type: call.type as 'function', function: { name: call.name, arguments: call.arguments.join('') } }))
    if (toolCalls.length && ['length', 'content_filter'].includes(this.finishReason ?? '')) throw invalid()
    validateStreamCalls(toolCalls)
    const tail = this.guard.end(); if (tail) this.callbacks.onContentDelta?.(tail)
    return { content: this.content.join(''), toolCalls, ...(this.usage ? { usage: this.usage } : {}) }
  }
}
