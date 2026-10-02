import type { AiPermissions, AiProviderProfile, AiScope } from '../ai/types'
import { AiError, assertNoKnownSecrets, normalizeAiBaseUrl } from '../ai/security'

export const AI_STORAGE_KEYS = { profiles: 'fitlog-ai-profiles-v1', active: 'fitlog-ai-active-profile-v1', keyPrefix: 'fitlog-ai-key-v1:', permissions: 'fitlog-ai-permissions-v1', privacy: 'fitlog-ai-privacy-ack-v1' } as const
export const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
export const AI_SCOPES: AiScope[] = ['food', 'training', 'weight', 'plan', 'habit', 'nutritionTargets']
export const defaultAiPermissions = (): AiPermissions => ({ read: Object.fromEntries(AI_SCOPES.map(scope => [scope, true])) as AiPermissions['read'], writeProposals: true })
export interface AiProfileInput { name: string; baseUrl: string; model: string; preset?: 'zhipu' | 'custom' }
export class AiProfiles {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  constructor(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) { this.storage = storage }
  get profiles(): AiProviderProfile[] {
    try {
      const values: unknown = JSON.parse(this.storage.getItem(AI_STORAGE_KEYS.profiles) || '[]')
      if (!Array.isArray(values)) return []
      return values.slice(0, 20).flatMap(value => {
        try {
          if (!value || value.protocol !== 'openai-chat-completions' || typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id) || typeof value.name !== 'string' || typeof value.model !== 'string') return []
          return [{ id: value.id, name: value.name.slice(0, 80), model: value.model.slice(0, 200), baseUrl: normalizeAiBaseUrl(value.baseUrl), protocol: 'openai-chat-completions', preset: value.preset === 'zhipu' ? 'zhipu' : 'custom', toolCapability: ['supported', 'unsupported'].includes(value.toolCapability) ? value.toolCapability : 'unknown', visionCapability: ['supported', 'unsupported'].includes(value.visionCapability) ? value.visionCapability : 'unknown', createdAt: String(value.createdAt), updatedAt: String(value.updatedAt) } satisfies AiProviderProfile]
        } catch { return [] }
      })
    } catch { return [] }
  }
  get active(): AiProviderProfile | undefined { return this.profiles.find(profile => profile.id === this.storage.getItem(AI_STORAGE_KEYS.active)) }
  key(id: string): string { return this.storage.getItem(AI_STORAGE_KEYS.keyPrefix + id) || '' }
  get knownSecrets(): string[] { return [...this.profiles.map(profile => this.key(profile.id)), this.storage.getItem('fitlog-github-sync-token-v1') || ''].filter(Boolean) }
  get privacyAcknowledged(): boolean { return this.storage.getItem(AI_STORAGE_KEYS.privacy) === '1' }
  acknowledgePrivacy(): void { this.storage.setItem(AI_STORAGE_KEYS.privacy, '1') }
  get permissions(): AiPermissions {
    try {
      const value = JSON.parse(this.storage.getItem(AI_STORAGE_KEYS.permissions) || 'null')
      if (!value) return defaultAiPermissions()
      return { read: Object.fromEntries(AI_SCOPES.map(scope => [scope, value.read?.[scope] === true])) as AiPermissions['read'], writeProposals: value.writeProposals === true }
    } catch { return defaultAiPermissions() }
  }
  setPermissions(value: AiPermissions): void { this.storage.setItem(AI_STORAGE_KEYS.permissions, JSON.stringify({ read: Object.fromEntries(AI_SCOPES.map(scope => [scope, value.read[scope] === true])), writeProposals: value.writeProposals === true })) }
  save(input: AiProfileInput, key = '', id?: string): AiProviderProfile {
    const name = input.name.trim(), model = input.model.trim(), baseUrl = normalizeAiBaseUrl(input.baseUrl)
    if (!name || name.length > 80 || !model || model.length > 200) throw new AiError('invalid_profile', '请填写配置名称和模型名称')
    if (key.includes('\n') || key.includes('\r') || key.trim().length > 4096) throw new AiError('invalid_key', 'API Key 格式无效')
    const profiles = this.profiles, existing = id ? profiles.find(profile => profile.id === id) : undefined
    if (id && !existing) throw new AiError('invalid_profile', '这份配置已不存在，请重新打开设置')
    if (!existing && profiles.length >= 20) throw new AiError('profile_limit', '最多保存 20 份 AI 配置')
    const profileId = existing?.id ?? crypto.randomUUID()
    if (!key.trim() && !this.key(profileId)) throw new AiError('missing_key', '请填写 API Key')
    assertNoKnownSecrets({ name, baseUrl, model }, [...this.knownSecrets, key.trim(), this.key(profileId)].filter(Boolean))
    const now = new Date().toISOString()
    const unchanged = existing && existing.baseUrl === baseUrl && existing.model === model && (!key.trim() || key.trim() === this.key(profileId))
    const profile: AiProviderProfile = { id: profileId, name, baseUrl, model, protocol: 'openai-chat-completions', preset: input.preset ?? 'custom', toolCapability: unchanged ? existing.toolCapability : 'unknown', visionCapability: unchanged ? existing.visionCapability : 'unknown', createdAt: existing?.createdAt ?? now, updatedAt: now }
    // Explicit field projection keeps secrets out even if callers supply extra properties.
    this.storage.setItem(AI_STORAGE_KEYS.profiles, JSON.stringify([...profiles.filter(item => item.id !== profileId), profile]))
    if (key.trim()) this.storage.setItem(AI_STORAGE_KEYS.keyPrefix + profileId, key.trim())
    if (!this.active) this.activate(profileId)
    return profile
  }
  activate(id: string): void { if (!this.profiles.some(profile => profile.id === id)) throw new AiError('invalid_profile', '这份配置已不存在'); this.storage.setItem(AI_STORAGE_KEYS.active, id) }
  setCapability(id: string, capability: 'supported' | 'unsupported'): void {
    this.storage.setItem(AI_STORAGE_KEYS.profiles, JSON.stringify(this.profiles.map(profile => profile.id === id ? { ...profile, toolCapability: capability, updatedAt: new Date().toISOString() } : profile)))
  }
  setVisionCapability(id: string, capability: NonNullable<AiProviderProfile['visionCapability']>): void {
    this.storage.setItem(AI_STORAGE_KEYS.profiles, JSON.stringify(this.profiles.map(profile => profile.id === id ? { ...profile, visionCapability: capability, updatedAt: new Date().toISOString() } : profile)))
  }
  delete(id: string): void {
    const active = this.active?.id === id
    this.storage.setItem(AI_STORAGE_KEYS.profiles, JSON.stringify(this.profiles.filter(profile => profile.id !== id)))
    this.storage.removeItem(AI_STORAGE_KEYS.keyPrefix + id)
    if (active) this.storage.removeItem(AI_STORAGE_KEYS.active)
  }
}
