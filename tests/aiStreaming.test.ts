import { afterEach, describe, expect, it, vi } from 'vitest'
import { SseParser, ChatStreamAccumulator, StreamingSecretGuard } from '../src/ai/sse'
import { AI_LIMITS } from '../src/ai/security'
import { OpenAICompatibleChatAdapter } from '../src/services/aiProvider'
import type { AiProviderProfile } from '../src/ai/types'
const enc = new TextEncoder()
const event = (delta: unknown, extra = {}) => `data: ${JSON.stringify({ choices: [{ delta }], ...extra })}\n\n`
const profile: AiProviderProfile = { id: 'test', name: 'test', protocol: 'openai-chat-completions', baseUrl: 'https://mock.invalid/v1', model: 'chat', visionModel: 'image', createdAt: '', updatedAt: '' }
const request = { messages: [{ role: 'user' as const, content: '你好' }] }
function fixture() {
  let source!: ReadableStreamDefaultController<Uint8Array>
  const cancel = vi.fn()
  const body = new ReadableStream<Uint8Array>({ start(c) { source = c }, cancel })
  const fetcher = vi.fn(async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }))
  const adapter = new OpenAICompatibleChatAdapter(profile, 'test-key', fetcher)
  return { adapter, fetcher, source, cancel, push: (s: string) => source.enqueue(enc.encode(s)) }
}
afterEach(() => vi.useRealTimers())
describe('incremental SSE framing', () => {
  it.each([1, 2, 3, 7, 23, 1000])('decodes Chinese UTF-8 and events across arbitrary %s-byte boundaries', size => {
    const emit = vi.fn(), p = new SseParser(emit), bytes = enc.encode(': ping\r\nevent: message\r\nid: 8\r\nretry: 9\r\ndata: 第一行\r\ndata: 第二行\r\n\r\ndata: [DONE]\n\n')
    for (let i = 0; i < bytes.length; i += size) p.push(bytes.slice(i, i + size))
    p.end(); expect(emit.mock.calls.map(c => c[0])).toEqual(['第一行\n第二行', '[DONE]'])
  })
  it('does not dispatch an unfinished event at EOF', () => { const emit = vi.fn(), p = new SseParser(emit); p.push(enc.encode('data: partial')); p.end(); expect(emit).not.toHaveBeenCalled() })
  it('bounds raw cumulative bytes', () => { const p = new SseParser(() => {}); expect(() => p.push(new Uint8Array(AI_LIMITS.responseBytes + 1))).toThrowError(expect.objectContaining({ code: 'response_limit' })) })
  it('rejects invalid UTF-8 rather than silently corrupting text', () => { const p = new SseParser(() => {}); expect(() => p.push(new Uint8Array([255]))).toThrowError(expect.objectContaining({ code: 'invalid_response' })) })
})
describe('complete chat/tool aggregation', () => {
  it.each([true, false])('emits ordered deltas before completion, DONE=%s, preserves optional usage', done => {
    const cb = vi.fn(), a = new ChatStreamAccumulator({ onContentDelta: cb })
    a.parser.push(enc.encode(event({ content: '你好' }))); expect(cb).toHaveBeenCalledWith('你好')
    a.parser.push(enc.encode(event({ content: '世界' }, { usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }) + (done ? 'data: [DONE]\n\n' : '')))
    expect(a.finish()).toEqual({ content: cb.mock.calls.map(c => c[0]).join(''), toolCalls: [], usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } })
  })
  it('accepts usage-only chunks and absent usage', () => {
    const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ content: 'x' }) + 'data: {"choices":[],"usage":{"total_tokens":4}}\n\n')); expect(a.finish().usage).toEqual({ totalTokens: 4 })
    const b = new ChatStreamAccumulator(); b.parser.push(enc.encode(event({ content: 'x' }))); expect(b.finish().usage).toBeUndefined()
  })
  it('aggregates fragmented names/arguments and indexed calls; repeated id/type are consistent', () => {
    const a = new ChatStreamAccumulator()
    a.parser.push(enc.encode(event({ tool_calls: [{ index: 1, id: 'b', type: 'function', function: { name: 'get_', arguments: '{' } }, { index: 0, id: 'a', type: 'function', function: { name: 'get_current_context', arguments: '{}' } }] })))
    a.parser.push(enc.encode(event({ tool_calls: [{ index: 1, id: 'b', type: 'function', function: { name: 'weight_trend', arguments: '"start":"2026-10-01"}' } }] })))
    expect(a.finish().toolCalls).toEqual([{ id: 'a', type: 'function', function: { name: 'get_current_context', arguments: '{}' } }, { id: 'b', type: 'function', function: { name: 'get_weight_trend', arguments: '{"start":"2026-10-01"}' } }])
  })
  it.each([-1, 0.5, 16, '0', undefined])('rejects invalid tool index %s', index => { const a = new ChatStreamAccumulator(); expect(() => a.parser.push(enc.encode(event({ tool_calls: [{ index }] })))).toThrow() })
  it.each([{ index: 0, id: 'x', type: 'bad' }, { index: 0, id: 7 }, { index: 0, function: { arguments: 3 } }, { index: 0, function: { name: 3 } }])('rejects malformed tool fields %j', fragment => { const a = new ChatStreamAccumulator(); expect(() => a.parser.push(enc.encode(event({ tool_calls: [fragment] })))).toThrow() })
  it('rejects conflicting repeated ids', () => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, id: 'x' }] }))); expect(() => a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, id: 'y' }] })))).toThrow() })
  it.each([{ id: '', name: 'tool', args: '{}' }, { id: 'x', name: '', args: '{}' }, { id: 'x', name: 'tool', args: '{' }])('rejects incomplete final tools %j', ({ id, name, args }) => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, id: id || undefined, type: 'function', function: { name, arguments: args } }] }))); expect(() => a.finish()).toThrow() })
  it('rejects tool arguments incrementally at 64KiB', () => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, function: { arguments: 'x'.repeat(40000) } }] }))); expect(() => a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, function: { arguments: 'x'.repeat(26000) } }] })))).toThrowError(expect.objectContaining({ code: 'invalid_arguments' })) })
  it.each(['data: nope\n\n', 'data: null\n\n', 'data: {}\n\n'])('rejects malformed payload %s', data => { const a = new ChatStreamAccumulator(); expect(() => a.parser.push(enc.encode(data))).toThrow() })
  it('rejects truncated final SSE frames even after earlier valid events', () => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ content: '部分' }) + 'data: {"choices":[')); expect(() => a.finish()).toThrow() })
  it.each(['length', 'content_filter'])('never executes tools from a %s termination', reason => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode(event({ tool_calls: [{ index: 0, id: 'x', type: 'function', function: { name: 'tool', arguments: '{}' } }] }) + `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\n\n`)); expect(() => a.finish()).toThrow() })
  it('does not accept DONE or empty EOF without a valid delta', () => { const a = new ChatStreamAccumulator(); a.parser.push(enc.encode('data: [DONE]\n\n')); expect(() => a.finish()).toThrow() })
  it('blocks a credential crossing deltas before it can be exposed', () => {
    const cb = vi.fn(), a = new ChatStreamAccumulator({ onContentDelta: cb }, ['private-key'])
    a.parser.push(enc.encode(event({ content: '安全 private-' }))); expect(cb).toHaveBeenCalledWith('安全 ')
    expect(() => a.parser.push(enc.encode(event({ content: 'key 后续' })))).toThrowError(expect.objectContaining({ code: 'secret_detected' }))
    expect(cb.mock.calls.map(c => c[0]).join('')).toBe('安全 ')
  })
  it('flushes an incomplete credential prefix only on valid completion', () => { const g = new StreamingSecretGuard(['secret']); expect(g.push('hello sec')).toBe('hello '); expect(g.push('ond')).toBe('second'); expect(g.end()).toBe('') })
})
describe('stream transport', () => {
  it('uses one native POST stream:true and emits before DONE', async () => {
    const f = fixture(), cb = vi.fn(), pending = f.adapter.chatStream(request, { onContentDelta: cb })
    f.push(event({ content: '首字' })); await vi.waitFor(() => expect(cb).toHaveBeenCalledWith('首字'))
    expect(JSON.parse(f.fetcher.mock.calls[0][1]!.body as string)).toMatchObject({ stream: true, model: 'chat' })
    f.push(event({ content: '尾字' }) + 'data: [DONE]\n\n'); expect((await pending).content).toBe('首字尾字'); expect(f.cancel).toHaveBeenCalledOnce()
  })
  it('normalizes JSON fallback from the same response, emits once, never retries', async () => {
    const cb = vi.fn(), fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'fallback' } }] }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } }))
    const result = await new OpenAICompatibleChatAdapter(profile, 'key', fetcher).chatStream(request, { onContentDelta: cb })
    expect(result.content).toBe('fallback'); expect(cb).toHaveBeenCalledExactlyOnceWith('fallback'); expect(fetcher).toHaveBeenCalledOnce()
  })
  it('immediately cancels a pending reader on Stop and never finalizes half a tool', async () => {
    const f = fixture(), abort = new AbortController(), pending = f.adapter.chatStream({ ...request, signal: abort.signal })
    f.push(event({ tool_calls: [{ index: 0, id: 't', type: 'function', function: { name: 'propose_weight', arguments: '{' } }] })); await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledOnce())
    abort.abort(); await expect(pending).rejects.toMatchObject({ code: 'aborted' }); expect(f.cancel).toHaveBeenCalledOnce()
  })
  it('retains emitted text on midstream network failure', async () => { const f = fixture(), cb = vi.fn(), p = f.adapter.chatStream(request, { onContentDelta: cb }); f.push(event({ content: 'partial' })); await vi.waitFor(() => expect(cb).toHaveBeenCalled()); f.source.error(new TypeError('private network details')); await expect(p).rejects.toMatchObject({ code: 'network' }); expect(cb.mock.calls).toEqual([['partial']]) })
  it('cancels and rejects overlarge responses and malformed JSON', async () => { const f = fixture(), p = f.adapter.chatStream(request); f.source.enqueue(new Uint8Array(AI_LIMITS.responseBytes + 1)); await expect(p).rejects.toMatchObject({ code: 'response_limit' }); expect(f.cancel).toHaveBeenCalledOnce(); const b = fixture(), q = b.adapter.chatStream(request); b.push('data: bad\n\n'); await expect(q).rejects.toMatchObject({ code: 'invalid_response' }); expect(b.cancel).toHaveBeenCalledOnce() })
  it.each([['stream is not supported', 'stream_unsupported'], ['private-key bad model', 'http_400']])('sanitizes 400 %s without retry', async (body, code) => { const fetcher = vi.fn(async () => new Response(body, { status: 400 })); await expect(new OpenAICompatibleChatAdapter(profile, 'private-key', fetcher).chatStream(request)).rejects.toMatchObject({ code }); expect(fetcher).toHaveBeenCalledOnce() })
  it('stops waiting for initial headers after 45 seconds', async () => {
    vi.useFakeTimers(); const a = new OpenAICompatibleChatAdapter(profile, 'key', async (_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new DOMException('Abort', 'AbortError')))))
    const p = a.chatStream(request), rejection = expect(p).rejects.toMatchObject({ code: 'timeout' }); await vi.advanceTimersByTimeAsync(45001); await rejection
  })
  it('supports sustained deltas past 45 seconds, but stops after 30 seconds idle', async () => {
    vi.useFakeTimers(); const f = fixture(), cb = vi.fn(), p = f.adapter.chatStream(request, { onContentDelta: cb }); const rejection = expect(p).rejects.toMatchObject({ code: 'timeout' })
    f.push(event({ content: 'a' })); await vi.advanceTimersByTimeAsync(20000); f.push(event({ content: 'b' })); await vi.advanceTimersByTimeAsync(20000); f.push(event({ content: 'c' })); await vi.advanceTimersByTimeAsync(20000); expect(cb).toHaveBeenCalledTimes(3); expect(f.cancel).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(10001); await rejection; expect(f.cancel).toHaveBeenCalledOnce()
  })
  it('bounds total stream duration at 120 seconds despite heartbeats', async () => { vi.useFakeTimers(); const f = fixture(), p = f.adapter.chatStream(request); const rejection = expect(p).rejects.toMatchObject({ code: 'timeout' }); for (let i = 0; i < 6; i++) { f.push(': ping\n\n'); await vi.advanceTimersByTimeAsync(20000) }; await rejection; expect(f.cancel).toHaveBeenCalledOnce() })
  it('keeps chat and Vision nonstreaming with independent models', async () => { const bodies: Record<string, unknown>[] = []; const a = new OpenAICompatibleChatAdapter(profile, 'key', async (_url, options) => { bodies.push(JSON.parse(options!.body as string)); return new Response('{"choices":[{"message":{"content":"OK"}}]}') }); await a.chat(request); await a.visionChat(request); expect(bodies.map(b => b.model)).toEqual(['chat', 'image']); expect(bodies.every(b => b.stream === undefined && b.stream_options === undefined)).toBe(true) })
})
