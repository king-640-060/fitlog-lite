export const AI_LIMITS = { responseBytes: 2 * 1024 * 1024, toolArgumentsBytes: 64 * 1024, userChars: 6000, contextChars: 50000, toolResultChars: 16000, historyMessages: 20, toolRounds: 8, callsPerRound: 16, timeoutMs: 45000, modelIds: 200 } as const
export class AiError extends Error {
  readonly code: string
  constructor(code: string, message: string) { super(message); this.name = 'AiError'; this.code = code }
}
export function normalizeAiBaseUrl(value: string): string {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new AiError('invalid_url', '请填写有效的 API Base URL') }
  if (url.username || url.password || url.search || url.hash) throw new AiError('invalid_url', 'API 地址不能包含凭据、查询参数或片段')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new AiError('invalid_url', 'API 地址需要 HTTPS；本机代理可使用 localhost 或 127.0.0.1')
  return url.href.replace(/\/+$/, '')
}
export function assertNoKnownSecrets(value: unknown, secrets: readonly string[]): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (secrets.some(secret => secret.length > 0 && text?.includes(secret))) throw new AiError('secret_detected', '内容包含已保存的凭据，请移除后再发送')
}
export function safeAiError(error: unknown): string {
  return error instanceof AiError ? error.message : 'AI 操作未完成，请检查配置或稍后再试'
}
/** Preserve valid JSON and label omissions; never cut a JSON string in half. */
export function boundedToolResult(value: unknown): string {
  const encoded = JSON.stringify(value, (_key, item) => item instanceof Set ? [...item] : item)
  if (encoded.length <= AI_LIMITS.toolResultChars) return encoded
  const prune = (item: unknown, cap: number, depth = 0): unknown => {
    if (depth > 8) return '[已省略]'
    if (typeof item === 'string') return item.length > 240 ? `${item.slice(0, 240)}…` : item
    if (Array.isArray(item) || item instanceof Set) return [...item].slice(0, cap).map(child => prune(child, cap, depth + 1))
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, prune(child, cap, depth + 1)]))
    return item
  }
  for (const cap of [20, 8, 3, 1]) {
    const reduced = JSON.stringify({ truncated: true, data: prune(value, cap) })
    if (reduced.length <= AI_LIMITS.toolResultChars) return reduced
  }
  return JSON.stringify({ truncated: true, message: '结果过大，请缩小日期范围或查询范围' })
}
