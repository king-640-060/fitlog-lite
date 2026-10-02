import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiOrchestrator } from '../src/ai/orchestrator'
import { AiProfiles } from '../src/services/aiProfiles'
import { aiEnvironment, aiCall } from './helpers/ai'
import { AiError } from '../src/ai/security'
import type { AiChatResponse } from '../src/ai/types'
const environments: ReturnType<typeof aiEnvironment>[] = []
const reply = (content = '已根据实际数据返回。', toolCalls = []): AiChatResponse => ({ content, toolCalls })
const setup = (supported = true) => {
  const env = aiEnvironment(); environments.push(env)
  const values = new Map<string, string>(), storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  const profiles = new AiProfiles(storage), profile = profiles.save({ name: 'A', baseUrl: 'https://a.example/v1', model: 'a-model' }, 'synthetic-key-A')
  profiles.acknowledgePrivacy(); profiles.setCapability(profile.id, supported ? 'supported' : 'unsupported')
  const chat = vi.fn(), clientFactory = vi.fn(() => ({ chat, visionChat: vi.fn(), testConnection: vi.fn(), testToolCapability: vi.fn(), testVisionCapability: vi.fn(), listModels: vi.fn() }))
  const engine = new AiOrchestrator({ profiles, database: env.database, context: () => env.context, clientFactory })
  return { env, engine, chat, profiles, profile, clientFactory, storage }
}
afterEach(async () => { for (const env of environments.splice(0)) { env.database.close(); await env.database.delete() } })
describe('bounded assistant orchestration', () => {
  it('keeps an in-flight chat and its history when only the image model changes', async () => {
    const { engine, chat, profiles, profile, clientFactory } = setup()
    let finish!: (value: AiChatResponse) => void
    chat.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const sending = engine.send('继续聊天')
    await vi.waitFor(() => expect(chat).toHaveBeenCalledTimes(1))
    profiles.save({ ...profile, visionModel: 'independent-image' }, '', profile.id); engine.settingsChanged()
    expect(chat.mock.calls[0][0].signal.aborted).toBe(false)
    finish(reply('保留聊天结果')); await sending
    expect(engine.items.at(-1)?.content).toBe('保留聊天结果')
    chat.mockResolvedValueOnce(reply('继续')); await engine.send('下一问')
    expect(JSON.stringify(chat.mock.calls[1][0].messages)).toContain('保留聊天结果')
    expect(clientFactory.mock.calls[1][0].model).toBe('a-model')
    profiles.save({ ...profiles.active!, model: 'chat-two' }, '', profile.id); engine.settingsChanged()
    expect(engine.items).toEqual([])
  })
  it('retains natural-language conversation in memory, accumulates provided usage and clears only AI state', async () => {
    const { engine, chat, env } = setup()
    chat.mockResolvedValueOnce({ ...reply('你好'), usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 } }).mockResolvedValueOnce({ ...reply('继续'), usage: { totalTokens: 5 } })
    await engine.send('第一问'); await engine.send('第二问')
    expect(chat.mock.calls[1][0].messages.map((message: { content: string }) => message.content)).toContain('第一问')
    expect(engine.usage).toEqual({ inputTokens: 10, outputTokens: 2, totalTokens: 17 })
    expect(JSON.stringify(chat.mock.calls)).not.toContain('synthetic-key-A')
    const fresh = new AiOrchestrator({ profiles: engine.profiles, database: env.database, context: () => env.context }); expect(fresh.items).toEqual([])
    engine.clear(); expect(engine.items).toEqual([]); expect(engine.profiles.active?.id).toBeTruthy(); expect(await env.database.exercises.count()).toBe(7)
  })
  it('returns matching tool call IDs for multiple reads, then a final explanation without retaining old tool payloads', async () => {
    const { engine, chat } = setup()
    chat.mockResolvedValueOnce(reply('', [aiCall('get_current_context', {}, 'context'), aiCall('get_weight_trend', { start: '2026-09-29', end: '2026-10-02' }, 'weights')])).mockResolvedValueOnce(reply('没有体重记录。')).mockResolvedValueOnce(reply('可以继续。'))
    await engine.send('看一下日期和体重')
    const tools = chat.mock.calls[1][0].messages.filter((message: { role: string }) => message.role === 'tool')
    expect(tools.map((tool: { tool_call_id: string }) => tool.tool_call_id)).toEqual(['context', 'weights'])
    expect(JSON.parse(tools[0].content).foodDate).toBe('2026-09-29')
    await engine.send('继续'); expect(chat.mock.calls[2][0].messages.some((message: { role: string }) => message.role === 'tool')).toBe(false)
  })
  it('produces one pending proposal for duplicate call IDs and records only explicit local confirmation', async () => {
    const { engine, chat, env } = setup(), call = aiCall('propose_weight', { date: '2026-09-29', weightKg: 72 }, 'duplicate')
    chat.mockResolvedValueOnce(reply('', [call, call])).mockResolvedValueOnce(reply('体重建议待确认。'))
    await engine.send('记录72kg')
    expect(engine.proposals.all).toHaveLength(1); expect(await env.database.weights.count()).toBe(0)
    const proposal = engine.proposals.all[0]
    expect(engine.items.filter(item => item.kind === 'proposal')).toHaveLength(1)
    await engine.proposals.confirm(proposal.id); expect(await env.database.weights.count()).toBe(1)
    chat.mockResolvedValueOnce(reply('应用已经确认保存。')); await engine.send('是否保存了？')
    expect(JSON.stringify(chat.mock.calls.at(-1)[0].messages)).toContain('FitLog 本地确认事件')
  })
  it('returns unknown-tool and invalid-JSON/schema errors without crashes or writes', async () => {
    const { engine, chat, env } = setup(), invalid = aiCall('propose_weight', {}, 'invalid-json'); invalid.function.arguments = 'not json'
    chat.mockResolvedValueOnce(reply('', [aiCall('delete_database', {}, 'unknown'), invalid, aiCall('propose_weight', { date: '2026-09-29', weightKg: -1 }, 'invalid-schema')])).mockResolvedValueOnce(reply('请补充参数。'))
    await engine.send('测试请求')
    const toolMessages = chat.mock.calls[1][0].messages.filter((message: { role: string }) => message.role === 'tool')
    expect(toolMessages.map((message: { content: string }) => JSON.parse(message.content).error)).toEqual(['unknown_tool', 'invalid_arguments', 'invalid_arguments'])
    expect(await env.database.weights.count()).toBe(0); expect(engine.proposals.all).toHaveLength(0)
  })
  it('enforces eight tool rounds, tool argument size, user size and serialized context budget', async () => {
    const { engine, chat } = setup()
    for (let index = 0; index < 9; index++) chat.mockResolvedValueOnce(reply('', [aiCall('get_current_context', {}, `c${index}`)]))
    await engine.send('持续调用')
    expect(engine.items.filter(item => item.kind === 'activity')).toHaveLength(8); expect(engine.items.at(-1)?.content).toContain('上限')
    engine.clear(); chat.mockReset()
    const call = aiCall('get_current_context', {}, 'oversized'); call.function.arguments = JSON.stringify({ value: 'x'.repeat(66000) })
    const result = JSON.parse(await engine.registry.execute(call)); expect(result.error).toBe('invalid_arguments')
    await engine.send('x'.repeat(6001)); expect(chat).not.toHaveBeenCalled()
    engine.clear(); chat.mockResolvedValueOnce(reply('x'.repeat(51000), [aiCall('propose_weight', { date: '2026-09-29', weightKg: 70 })]))
    await engine.send('过长结果')
    expect(engine.items.at(-1)?.content).toContain('缩小'); expect(engine.proposals.all[0].status).toBe('cancelled')
  })
  it('supports Stop and invalidates proposals created by an interrupted turn without mutating business data', async () => {
    const { engine, chat, env } = setup()
    chat.mockResolvedValueOnce(reply('', [aiCall('propose_weight', { date: '2026-09-29', weightKg: 72 })])).mockImplementationOnce(({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new AiError('aborted', '已停止本次请求')))))
    const task = engine.send('记录体重')
    await vi.waitFor(() => expect(chat).toHaveBeenCalledTimes(2)); engine.stop(); await task
    expect(engine.busy).toBe(false); expect(engine.proposals.all[0].status).toBe('cancelled'); expect(await env.database.weights.count()).toBe(0)
    expect(engine.items.at(-1)?.content).toContain('停止')
  })
  it('allows chat-only providers but rejects their tool calls and empty responses', async () => {
    const { engine, chat, env } = setup(false)
    chat.mockResolvedValueOnce(reply('你好')).mockResolvedValueOnce(reply('', [aiCall('get_current_context', {})])).mockResolvedValueOnce(reply(''))
    await engine.send('聊天'); expect(chat.mock.calls[0][0].tools).toBeUndefined()
    expect(engine.items.some(item => item.content.includes('未验证工具调用'))).toBe(true)
    await engine.send('读数据'); expect(engine.items.at(-1)?.kind).toBe('error'); expect(await env.database.weights.count()).toBe(0)
    await engine.send('空响应'); expect(engine.items.at(-1)?.content).toContain('空内容')
  })
  it('blocks known secrets before fetch and never routes later profile B turns through captured profile A', async () => {
    const { engine, chat, profiles, clientFactory, storage } = setup()
    storage.setItem('fitlog-github-sync-token-v1', 'synthetic-github-token')
    await engine.send('我的 synthetic-key-A'); await engine.send('我的 synthetic-github-token'); expect(chat).not.toHaveBeenCalled()
    chat.mockResolvedValueOnce(reply('synthetic-key-A'))
    await engine.send('普通提问')
    expect(engine.items.at(-1)?.content).toContain('凭据')
    expect(JSON.stringify(engine.items)).not.toMatch(/synthetic-key-A|synthetic-github-token/)
    engine.clear(); chat.mockResolvedValue(reply('你好'))
    await engine.send('A提问')
    const b = profiles.save({ name: 'B', baseUrl: 'https://b.example/v1', model: 'b-model' }, 'synthetic-key-B'); profiles.activate(b.id)
    await engine.send('B提问')
    expect(clientFactory.mock.calls.at(-1)?.[0]).toMatchObject({ baseUrl: 'https://b.example/v1', model: 'b-model' }); expect(clientFactory.mock.calls.at(-1)?.[1]).toBe('synthetic-key-B')
    expect(JSON.stringify(chat.mock.calls.at(-1)?.[0])).not.toContain('A提问')
    const permissions = profiles.permissions; permissions.read.weight = false; profiles.setPermissions(permissions)
    await engine.send('权限变化')
    expect(JSON.stringify(chat.mock.calls.at(-1)?.[0])).not.toContain('B提问')
  })
})
