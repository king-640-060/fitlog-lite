import { describe, expect, it, vi } from 'vitest'
import { AiProfiles, AI_STORAGE_KEYS } from '../src/services/aiProfiles'
import { AiClient } from '../src/services/aiProvider'
import { getVisionModel, visionRoutingSignature } from '../src/ai/modelRouting'
import { analyzeFoodPackageImages } from '../src/services/aiVisionFoodService'

const input = { name: 'Service', baseUrl: 'https://example.invalid/v1', model: 'chat-model', visionModel: 'image-model' }
const store = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } } }
const image = { dataUrl: 'data:image/jpeg;base64,/9j/AA==', width: 100, height: 100, bytes: 4 }
const extraction = { format: 'fitlog-food-label', version: 1, productName: null, brand: null, netQuantity: { value: null, unit: null, evidence: null }, basis: { kind: 'unknown', amount: null, unit: null, evidence: null }, nutrients: Object.fromEntries(['energy', 'protein', 'carbs', 'fat'].map(key => [key, { value: null, unit: null, evidence: null }])), warnings: [] }
describe('capability-specific model configuration', () => {
  it.each([undefined, null, '', '   ', 123, {}, 'x'.repeat(201)])('reads invalid/legacy visionModel %j as absent without losing the profile', value => {
    const storage = store(), profiles = new AiProfiles(storage), profile = profiles.save(input, 'synthetic-key')
    storage.setItem(AI_STORAGE_KEYS.profiles, JSON.stringify([{ ...profile, visionModel: value }]))
    expect(profiles.active?.visionModel).toBeUndefined()
    expect(getVisionModel(profiles.active!)).toBe('chat-model')
  })
  it('projects and trims the optional model, omits blank values, rejects long IDs and known secrets', () => {
    const storage = store(), profiles = new AiProfiles(storage)
    const profile = profiles.save({ ...input, visionModel: ' image-model ', apiKey: 'extra-secret' } as typeof input, 'synthetic-key')
    expect(profiles.active?.visionModel).toBe('image-model')
    const json = storage.getItem(AI_STORAGE_KEYS.profiles)!
    expect(json).toContain('visionModel'); expect(json).not.toMatch(/synthetic-key|extra-secret|apiKey/)
    expect(() => profiles.save({ ...input, visionModel: 'x'.repeat(201) }, '', profile.id)).toThrow()
    expect(() => profiles.save({ ...input, visionModel: 'synthetic-key' }, '', profile.id)).toThrow('凭据')
    expect(() => profiles.save({ ...input, visionModel: 'new-secret' }, 'new-secret', profile.id)).toThrow('凭据')
    profiles.save({ ...input, visionModel: '  ' }, '', profile.id)
    expect(profiles.active?.visionModel).toBeUndefined()
    expect(storage.getItem(AI_STORAGE_KEYS.profiles)).not.toContain('visionModel')
    expect(profiles.key(profile.id)).toBe('synthetic-key')
  })
  it.each([
    ['image only', input, { visionModel: 'image-two' }, '', 'supported', 'unknown'],
    ['chat with independent image', input, { model: 'chat-two' }, '', 'unknown', 'supported'],
    ['chat with fallback', { ...input, visionModel: undefined }, { model: 'chat-two' }, '', 'unknown', 'unknown'],
    ['root', input, { baseUrl: 'https://other.invalid/v1' }, '', 'unknown', 'unknown'],
    ['key', input, {}, 'other-synthetic-key', 'unknown', 'unknown'],
    ['same key', input, {}, 'synthetic-key', 'supported', 'supported'],
    ['rename', input, { name: 'Renamed' }, '', 'supported', 'supported'],
    ['explicit same effective image', { ...input, visionModel: undefined }, { visionModel: 'chat-model' }, '', 'supported', 'supported'],
    ['remove independent image', input, { visionModel: undefined }, '', 'supported', 'unknown'],
  ] as const)('invalidates only changed routes: %s', (_label, original, change, key, tools, vision) => {
    const profiles = new AiProfiles(store()), saved = profiles.save(original, 'synthetic-key')
    profiles.setCapability(saved.id, 'supported'); profiles.setVisionCapability(saved.id, 'supported')
    profiles.save({ ...original, ...change }, key, saved.id)
    expect(profiles.active).toMatchObject({ toolCapability: tools, visionCapability: vision })
  })
  it('compares captured image routing independently from chat, but includes profile/root/key', () => {
    const profiles = new AiProfiles(store()), profile = profiles.save(input, 'synthetic-key')
    const signature = visionRoutingSignature(profile, 'synthetic-key')
    expect(visionRoutingSignature({ ...profile, model: 'chat-two' }, 'synthetic-key')).toBe(signature)
    for (const change of [{ visionModel: 'image-two' }, { baseUrl: 'https://other.invalid' }, { id: 'other' }]) expect(visionRoutingSignature({ ...profile, ...change }, 'synthetic-key')).not.toBe(signature)
    expect(visionRoutingSignature(profile, 'other-key')).not.toBe(signature)
    const legacy = { ...profile, visionModel: undefined }
    expect(visionRoutingSignature({ ...legacy, model: 'chat-two' }, 'synthetic-key')).not.toBe(visionRoutingSignature(legacy, 'synthetic-key'))
  })
})
describe('one provider and credential, independent request routes', () => {
  it.each([true, false])('routes chat, connection, tools, image probe and package scan (independent=%s)', async independent => {
    const profiles = new AiProfiles(store()), profile = profiles.save({ ...input, visionModel: independent ? input.visionModel : undefined }, 'synthetic-key')
    const requests: { url: string; body: any; options: RequestInit }[] = []
    const fetcher: typeof fetch = vi.fn(async (url, options) => {
      const body = JSON.parse(String(options?.body)); requests.push({ url: String(url), body, options: options! })
      const message = body.tools ? { content: null, tool_calls: [{ id: 'probe', type: 'function', function: { name: 'fitlog_capability_probe', arguments: '{}' } }] } : { content: body.messages.length === 2 ? JSON.stringify(extraction) : Array.isArray(body.messages[0].content) ? '731' : 'OK' }
      return new Response(JSON.stringify({ choices: [{ message }], usage: { total_tokens: 3 } }))
    })
    const client = new AiClient(profile, 'synthetic-key', [], fetcher)
    expect(await client.chat({ messages: [{ role: 'user', content: 'hello' }] })).toMatchObject({ content: 'OK', usage: { totalTokens: 3 } })
    await client.testConnection(); expect(await client.testToolCapability()).toBe('supported')
    expect(await client.testVisionCapability(image)).toBe('supported')
    expect(await analyzeFoodPackageImages({ client, images: [image] })).toEqual(extraction)
    expect(requests.map(r => r.body.model)).toEqual(['chat-model', 'chat-model', 'chat-model', independent ? 'image-model' : 'chat-model', independent ? 'image-model' : 'chat-model'])
    for (const r of requests) { expect(r.url).toBe(input.baseUrl + '/chat/completions'); expect(r.options.headers).toMatchObject({ Authorization: 'Bearer synthetic-key' }); expect(JSON.stringify(r.body)).not.toContain('synthetic-key') }
    expect(requests[3].body.tools).toBeUndefined(); expect(requests[4].body.tools).toBeUndefined()
  })
})
