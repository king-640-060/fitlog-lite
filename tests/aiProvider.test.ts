import { describe, expect, it, vi } from 'vitest'
import type { AiProviderProfile } from '../src/ai/types'
import { AI_LIMITS } from '../src/ai/security'
import { buildAiRequest, OpenAICompatibleChatAdapter } from '../src/services/aiProvider'
const profile: AiProviderProfile = { id: 'test', name: 'test', model: 'editable-model', protocol: 'openai-chat-completions', baseUrl: 'https://example.com/v1/', createdAt: '', updatedAt: '' }
const response = (message: unknown, usage?: unknown) => new Response(JSON.stringify({ choices: [{ message }], usage }), { headers: { 'Content-Type': 'application/json' } })
describe('OpenAI-compatible browser transport', () => {
  it('purely builds the expected system/messages/tool protocol body without transport secrets or signals', () => {
    const messages = [{ role: 'system' as const, content: 'FitLog 系统提示', apiKey: 'secret-extra' }, { role: 'user' as const, content: '提问' }]
    const tools = [{ type: 'function' as const, function: { name: 'get_current_context', description: '只读', parameters: { type: 'object', properties: {}, additionalProperties: false } } }]
    const body = buildAiRequest('editable', { messages, tools, signal: new AbortController().signal })
    expect(body).toEqual({ model: 'editable', messages: [{ role: 'system', content: 'FitLog 系统提示' }, { role: 'user', content: '提问' }], tools, tool_choice: 'auto' })
    expect(JSON.stringify(body)).not.toMatch(/secret-extra|apiKey|Authorization|signal/)
  })
  it('binds native fetch to the global browser receiver', async () => {
    const fetcher = vi.fn(function () { if (this !== globalThis) throw new TypeError('Illegal invocation'); return Promise.resolve(response({ content: 'OK' })) })
    await expect(new OpenAICompatibleChatAdapter(profile, 'synthetic-key', fetcher).testConnection()).resolves.toBeUndefined()
  })
  it('blocks credentials accidentally embedded in an API path before making a request', async () => {
    const fetcher = vi.fn()
    await expect(new OpenAICompatibleChatAdapter({ ...profile, baseUrl: 'https://example.com/private-secret' }, 'private-secret', fetcher).testConnection()).rejects.toMatchObject({ code: 'secret_detected' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('normalizes response and keeps Bearer credentials out of the request body with safe fetch options', async () => {
    const fetcher = vi.fn(async () => response({ content: '你好', tool_calls: [{ id: 'c', type: 'function', function: { name: 'get_current_context', arguments: '{}' } }] }, { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 }))
    const result = await new OpenAICompatibleChatAdapter(profile, 'private-key', fetcher).chat({ messages: [{ role: 'user', content: '你好' }] })
    expect(result).toEqual({ content: '你好', toolCalls: [{ id: 'c', type: 'function', function: { name: 'get_current_context', arguments: '{}' } }], usage: { inputTokens: 10, outputTokens: 3, totalTokens: 13 } })
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.com/v1/chat/completions')
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error', cache: 'no-store' })
    expect(options.headers).toMatchObject({ Authorization: 'Bearer private-key' })
    expect(options.body).not.toContain('private-key'); expect(JSON.parse(String(options.body)).model).toBe('editable-model')
  })
  it('tests with tiny data-free prompts, probes function capability and bounds best-effort model ids', async () => {
    const bodies: unknown[] = []
    const fetcher = vi.fn(async (url, options) => {
      if (String(url).endsWith('/models')) return new Response(JSON.stringify({ data: Array.from({ length: 300 }, (_, i) => ({ id: `model-${i}` })) }))
      const body = JSON.parse(options!.body as string); bodies.push(body)
      return body.tools ? response({ content: null, tool_calls: [{ id: 'probe', type: 'function', function: { name: 'fitlog_capability_probe', arguments: '{}' } }] }) : response({ content: 'OK' })
    }) as typeof fetch
    const adapter = new OpenAICompatibleChatAdapter(profile, 'key', fetcher)
    await adapter.testConnection(); expect(await adapter.testToolCapability()).toBe('supported')
    expect(await adapter.listModels()).toHaveLength(200)
    expect(bodies.every(body => !('stream' in body) && !('stream_options' in body))).toBe(true)
    expect(JSON.stringify(bodies)).not.toMatch(/foodLogs|workouts|backup/i)
    expect(JSON.stringify(bodies)).toContain('Reply with OK.')
    const chatOnly = new OpenAICompatibleChatAdapter(profile, 'key', async () => response({ content: 'OK' }))
    expect(await chatOnly.testToolCapability()).toBe('unsupported')
  })
  it.each([400, 401, 403, 404, 429, 500])('sanitizes HTTP %s without retry or raw provider errors', async status => {
    const fetcher = vi.fn(async () => new Response('RAW SECRET FROM PROVIDER', { status }))
    await expect(new OpenAICompatibleChatAdapter(profile, 'key', fetcher).testConnection()).rejects.toMatchObject({ code: `http_${status}` })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('gives HTTP 400 a fixed actionable message without reflecting malicious provider data', async () => {
    const adapter = new OpenAICompatibleChatAdapter(profile, 'private-key', async () => new Response('<script>private-key</script> raw parameters', { status: 400 }))
    await expect(adapter.testConnection()).rejects.toMatchObject({ code: 'http_400', message: '请求参数无效，请检查模型名称和接口兼容性。' })
  })
  it('distinguishes cancellation, timeout, CORS/network, invalid JSON and response size bounds', async () => {
    const aborting: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => { if (options?.signal?.aborted) reject(new DOMException('Abort', 'AbortError')); else options?.signal?.addEventListener('abort', () => reject(new DOMException('Abort', 'AbortError'))) })
    const stop = new AbortController(), adapter = new OpenAICompatibleChatAdapter(profile, 'key', aborting, [], 10)
    const request = adapter.testConnection(stop.signal); stop.abort(); await expect(request).rejects.toMatchObject({ code: 'aborted' })
    await expect(adapter.testConnection()).rejects.toMatchObject({ code: 'timeout' })
    await expect(new OpenAICompatibleChatAdapter(profile, 'key', async () => { throw new TypeError('failed fetch') }).testConnection()).rejects.toMatchObject({ code: 'network' })
    await expect(new OpenAICompatibleChatAdapter(profile, 'key', async () => new Response('invalid')).testConnection()).rejects.toMatchObject({ code: 'invalid_response' })
    await expect(new OpenAICompatibleChatAdapter(profile, 'key', async () => new Response('x'.repeat(AI_LIMITS.responseBytes + 1))).testConnection()).rejects.toMatchObject({ code: 'response_limit' })
  })
})
