import type { BackupData } from '../db/types'
// Sort entity collections only. Nested arrays encode order and must remain ordered.
export function canonicalSyncData(data: BackupData['data']): string {
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable)
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable((value as Record<string, unknown>)[key])]))
    return value
  }
  const sorted = Object.fromEntries(Object.keys(data).sort().map(store => [store, [...data[store as keyof typeof data]].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)]))
  return JSON.stringify(stable(sorted))
}
export async function syncDataHash(data: BackupData['data']): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalSyncData(data)))
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('')
}
