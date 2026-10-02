import type { AiProviderProfile } from './types'

/** Legacy profiles use their chat model for image input until explicitly separated. */
export function getVisionModel(profile: Pick<AiProviderProfile, 'model' | 'visionModel'>): string {
  return profile.visionModel?.trim() || profile.model
}

/** Ignore chat-only changes when validating a captured image request. */
export function visionRoutingSignature(profile: AiProviderProfile, key: string): string {
  return JSON.stringify([profile.id, profile.baseUrl, getVisionModel(profile), key])
}
