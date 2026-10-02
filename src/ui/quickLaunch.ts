import { AI_LIMITS } from '../ai/security'
export interface QuickLaunchIntent { target: 'ai'; voice: boolean; prompt?: string; autoSend: boolean }
export function parseQuickLaunchHash(hash: string): QuickLaunchIntent | undefined {
  try {
    // URLSearchParams silently repairs invalid encoding; validate it before decoding once.
    decodeURIComponent(hash.replace(/\+/g, ' '))
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    if (params.get('quick') !== 'ai') return undefined
    const prompt = params.get('prompt')?.trim() || undefined
    if (prompt && prompt.length > AI_LIMITS.userChars) return undefined
    return { target: 'ai', voice: params.get('voice') === '1', prompt, autoSend: !!prompt && params.get('send') === '1' }
  } catch { return undefined }
}
export function consumeQuickLaunch(location: Pick<Location, 'hash' | 'pathname' | 'search'>, history: Pick<History, 'replaceState' | 'state'>): QuickLaunchIntent | undefined {
  const intent = parseQuickLaunchHash(location.hash)
  // Also erase malformed/oversized quick-launch fragments rather than retaining drafts in the URL.
  if (intent || new URLSearchParams(location.hash.replace(/^#/, '')).get('quick') === 'ai') history.replaceState(history.state, '', location.pathname + location.search)
  return intent
}
