import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RETIRED_VIDEO_KEYS, retireLegacyVideoSearchStorage } from '../src/services/retiredVideoStorage'
import { AiProfiles } from '../src/services/aiProfiles'
import { AiOrchestrator } from '../src/ai/orchestrator'
import { buildFitLogSystemPrompt } from '../src/ai/systemPrompt'
import { exportBackup } from '../src/services/backupService'
import { canonicalSyncData } from '../src/utils/syncDataHash'
import { aiEnvironment, aiCall } from './helpers/ai'
const environments: ReturnType<typeof aiEnvironment>[] = []
const storage = () => { const values = new Map<string, string>(); return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) } } }
afterEach(async () => { for (const env of environments.splice(0)) { env.database.close(); await env.database.delete() } })
describe('retired external search boundary', () => {
  it('cleans exactly six explicit keys, preserving unrelated settings even with similar names', () => {
    const store = storage()
    for (const key of RETIRED_VIDEO_KEYS) store.setItem(key, 'legacy')
    const kept = ['fitlog-ai-key-v1:main', 'fitlog-ai-profiles-v1', 'fitlog-voice-config-v1', 'fitlog-voice-key-v1', 'fitlog-github-sync-token-v1', 'fitlog-pwa-update', 'fitlog-video-other-user-data']
    for (const key of kept) store.setItem(key, 'preserved')
    retireLegacyVideoSearchStorage(store); retireLegacyVideoSearchStorage(store)
    expect([...store.values.keys()]).toEqual(kept)
    for (const key of kept) expect(store.getItem(key)).toBe('preserved')
  })
  it('continues after a restricted key and never enumerates storage', () => {
    const removeItem = vi.fn((key: string) => { if (key === RETIRED_VIDEO_KEYS[0]) throw Error('restricted') })
    expect(() => retireLegacyVideoSearchStorage({ removeItem })).not.toThrow()
    expect(removeItem.mock.calls.flat()).toEqual(RETIRED_VIDEO_KEYS)
    expect(() => retireLegacyVideoSearchStorage()).not.toThrow()
  })
  it('retains AI, Voice and GitHub secret guards without collecting obsolete credentials', () => {
    const store = storage(), profiles = new AiProfiles(store)
    profiles.save({ name: 'Synthetic', baseUrl: 'https://mock.invalid/v1', model: 'chat' }, 'synthetic-ai')
    store.setItem('fitlog-voice-key-v1', 'synthetic-voice'); store.setItem('fitlog-github-sync-token-v1', 'synthetic-github')
    store.setItem(RETIRED_VIDEO_KEYS[2], 'retired-key')
    expect(profiles.knownSecrets).toEqual(['synthetic-ai', 'synthetic-github', 'synthetic-voice'])
    retireLegacyVideoSearchStorage(store)
    expect(profiles.knownSecrets).toEqual(['synthetic-ai', 'synthetic-github', 'synthetic-voice'])
  })
  it('leaves every business store unchanged and rejects an unsolicited retired tool', async () => {
    const env = aiEnvironment(); environments.push(env)
    await env.database.weights.add({ id: 'saved', date: '2026-10-02', weightKg: 72, createdAt: '' })
    const snapshot = async () => JSON.stringify(await Promise.all(env.database.tables.map(async table => [table.name, await table.toArray()])))
    const before = await snapshot(), beforeBackup = await exportBackup(env.database), beforeSync = canonicalSyncData(beforeBackup.data); const store = storage(); RETIRED_VIDEO_KEYS.forEach(k => store.setItem(k, 'legacy'))
    retireLegacyVideoSearchStorage(store)
    expect(env.registry.definitions().some(d => d.function.name === 'search_training_videos')).toBe(false)
    expect(env.env).not.toHaveProperty('videoSearch'); expect(env.env).not.toHaveProperty('onVideos')
    expect(JSON.parse(await env.registry.execute(aiCall('search_training_videos', { query: '深蹲' }))).error).toBe('unknown_tool')
    expect(await snapshot()).toBe(before)
    const afterBackup = await exportBackup(env.database)
    expect(afterBackup.data).toEqual(beforeBackup.data); expect(afterBackup.schemaVersion).toBe(11); expect(canonicalSyncData(afterBackup.data)).toBe(beforeSync)
    // Backup and Sync serialize these same business rows; neither may import device cleanup.
    for (const file of ['src/services/backupService.ts', 'src/services/githubSyncService.ts']) expect(readFileSync(file, 'utf8')).not.toContain('retiredVideoStorage')
  })
  it('routes explicit requests through ordinary text chat, never a local search or artifact', async () => {
    const env = aiEnvironment(); environments.push(env); const profiles = new AiProfiles(storage())
    const profile = profiles.save({ name: 'Synthetic', baseUrl: 'https://mock.invalid/v1', model: 'chat' }, 'synthetic-ai')
    profiles.acknowledgePrivacy(); profiles.setCapability(profile.id, 'supported')
    const chat = vi.fn().mockResolvedValue({ content: '当前没有实时视频搜索，可以说明动作要点。', toolCalls: [] })
    const engine = new AiOrchestrator({ profiles, database: env.database, context: () => env.context, clientFactory: () => ({ chat, chatStream: chat } as never) })
    await engine.send('帮我找深蹲视频')
    expect(chat).toHaveBeenCalledOnce(); expect(JSON.stringify(chat.mock.calls[0][0].tools)).not.toContain('search_training_videos')
    expect(engine.items.some(i => (i.kind as string) === 'videos')).toBe(false)
    const prompt = buildFitLogSystemPrompt(env.context)
    for (const text of ['没有外部网页或视频搜索工具', '不得声称已实时搜索', '一般知识', 'dietEvents', 'subjective', 'API Key']) expect(prompt).toContain(text)
  })
  it('keeps generic duplicate READ call caching after feature-only tests were removed', async () => {
    const env = aiEnvironment(); environments.push(env); const profiles = new AiProfiles(storage())
    const profile = profiles.save({ name: 'Synthetic', baseUrl: 'https://mock.invalid/v1', model: 'chat' }, 'synthetic-ai'); profiles.acknowledgePrivacy(); profiles.setCapability(profile.id, 'supported')
    const call = aiCall('get_current_context', {}, 'same')
    const chat = vi.fn().mockResolvedValueOnce({ content: '', toolCalls: [call, call] }).mockResolvedValueOnce({ content: '日期已返回。', toolCalls: [] })
    const engine = new AiOrchestrator({ profiles, database: env.database, context: () => env.context, clientFactory: () => ({ chat, chatStream: chat } as never) })
    const execute = vi.spyOn(engine.registry, 'execute'); await engine.send('日期')
    expect(execute).toHaveBeenCalledOnce(); expect(chat).toHaveBeenCalledTimes(2)
  })
})
