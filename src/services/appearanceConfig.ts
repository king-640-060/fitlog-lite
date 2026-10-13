export type AppearanceMode = 'system' | 'light' | 'dark'
export const appearanceKey = 'fitlog-appearance-v1'
export const appearanceEvent = 'fitlog-theme-change'
export function readAppearance(): AppearanceMode {
  try { const value = localStorage.getItem(appearanceKey); return value === 'light' || value === 'dark' ? value : 'system' } catch { return 'system' }
}
export function effectiveAppearance(mode: AppearanceMode, systemDark: boolean): 'light' | 'dark' { return mode === 'system' ? systemDark ? 'dark' : 'light' : mode }
export function applyAppearance(): void {
  const theme = effectiveAppearance(readAppearance(), matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.effectiveTheme = theme
  document.documentElement.style.colorScheme = theme
  const color = theme === 'dark' ? '#171c19' : '#f5f2eb'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', theme === 'dark' ? 'black' : 'default')
  document.dispatchEvent(new Event(appearanceEvent))
}
export function saveAppearance(mode: AppearanceMode): void {
  if (!['system', 'light', 'dark'].includes(mode)) throw Error('外观模式不合法')
  localStorage.setItem(appearanceKey, mode)
  applyAppearance()
}
export function setupAppearance(): () => void {
  const system = matchMedia('(prefers-color-scheme: dark)'), changed = () => { if (readAppearance() === 'system') applyAppearance() }
  const stored = (event: StorageEvent) => { if (event.key === appearanceKey) applyAppearance() }
  system.addEventListener('change', changed); window.addEventListener('storage', stored); applyAppearance()
  return () => { system.removeEventListener('change', changed); window.removeEventListener('storage', stored) }
}
