/** Device-only display preference. Never read by Backup/Restore/Sync services. */
export const WATER_REFERENCE_KEY = 'fitlog-water-reference-v1'
const DEFAULT_REFERENCE_ML = 2500
const CHANGE_EVENT = 'fitlog-water-reference-change'
export function validateWaterReference(value: unknown): asserts value is number | null {
  if (value !== null && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 100000)) throw new Error('参考值需为 1–100000 ml 的整数')
}
export function readWaterReference(storage: Pick<Storage, 'getItem'> = localStorage): number | null {
  try {
    const raw = storage.getItem(WATER_REFERENCE_KEY)
    if (raw === null) return DEFAULT_REFERENCE_ML
    const value: unknown = JSON.parse(raw).referenceMl
    validateWaterReference(value)
    return value
  } catch { return DEFAULT_REFERENCE_ML }
}
export function saveWaterReference(value: number | null, storage: Pick<Storage, 'setItem'> = localStorage): void {
  validateWaterReference(value)
  storage.setItem(WATER_REFERENCE_KEY, JSON.stringify({ referenceMl: value }))
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
}
export function observeWaterReference(redraw: () => void): () => void {
  const stored = (event: StorageEvent) => { if (event.key === WATER_REFERENCE_KEY || event.key === null) redraw() }
  window.addEventListener('storage', stored); window.addEventListener(CHANGE_EVENT, redraw)
  return () => { window.removeEventListener('storage', stored); window.removeEventListener(CHANGE_EVENT, redraw) }
}
