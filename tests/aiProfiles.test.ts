import { describe, expect, it } from 'vitest'
import { AiProfiles, AI_STORAGE_KEYS } from '../src/services/aiProfiles'
export const memoryStorage = () => { const values = new Map<string, string>(); return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } } }
const input = { name: 'A', baseUrl: 'https://example.com/v1/', model: 'model-a' }
describe('device-local AI profiles', () => {
  it('projects metadata, stores credentials separately, preserves empty edit keys and switches/deletes active configuration', () => {
    const storage = memoryStorage(), profiles = new AiProfiles(storage)
    const a = profiles.save({ ...input, apiKey: 'must-not-copy' } as typeof input, 'secret-A')
    const b = profiles.save({ ...input, name: 'B', model: 'model-b' }, 'secret-B')
    expect(storage.getItem(AI_STORAGE_KEYS.profiles)).not.toContain('secret')
    expect(storage.getItem(AI_STORAGE_KEYS.profiles)).not.toContain('apiKey')
    expect(a.baseUrl).toBe('https://example.com/v1')
    profiles.setCapability(a.id, 'supported')
    profiles.save(input, '', a.id)
    expect(profiles.key(a.id)).toBe('secret-A'); expect(profiles.active?.toolCapability).toBe('supported')
    profiles.save({ ...input, model: 'other' }, '', a.id)
    expect(profiles.active?.toolCapability).toBe('unknown')
    profiles.activate(b.id); expect(profiles.active?.model).toBe('model-b')
    profiles.delete(b.id); expect(profiles.active).toBeUndefined(); expect(profiles.key(b.id)).toBe('')
    expect(profiles.profiles.map(p => p.id)).toEqual([a.id])
    expect(() => profiles.save({ ...input, name: 'secret-A' }, 'new-secret')).toThrow('凭据')
  })
  it('does not manufacture credentials, defaults all scopes on, validates corrupt metadata and persists permission projection', () => {
    const storage = memoryStorage(), profiles = new AiProfiles(storage)
    expect(() => profiles.save(input)).toThrow('API Key')
    expect(Object.values(profiles.permissions.read).every(Boolean)).toBe(true)
    const permission = profiles.permissions; permission.read.weight = false; permission.writeProposals = false
    profiles.setPermissions(permission); expect(profiles.permissions).toEqual(permission)
    storage.setItem(AI_STORAGE_KEYS.profiles, '{invalid'); expect(profiles.profiles).toEqual([])
    expect(profiles.privacyAcknowledged).toBe(false); profiles.acknowledgePrivacy(); expect(profiles.privacyAcknowledged).toBe(true)
  })
})
