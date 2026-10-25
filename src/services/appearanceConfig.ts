export type AppearanceMode = 'system' | 'light' | 'dark'
export type VisualTheme = 'classic' | 'light-native'
export const appearanceKey = 'fitlog-appearance-v1'
export const visualThemeKey = 'fitlog-visual-theme-v1'
export const appearanceEvent = 'fitlog-theme-change'
export function readAppearance(): AppearanceMode {
  try { const value = localStorage.getItem(appearanceKey); return value === 'light' || value === 'dark' ? value : 'system' } catch { return 'system' }
}
export function readVisualTheme(): VisualTheme | undefined {
  try { const value = localStorage.getItem(visualThemeKey); return value === 'classic' || value === 'light-native' ? value : undefined } catch { return undefined }
}
export function effectiveAppearance(mode: AppearanceMode, systemDark: boolean): 'light' | 'dark' { return mode === 'system' ? systemDark ? 'dark' : 'light' : mode }
/** Absent visual preference is the exact previous production light/dark policy. No auto-write. */
export function resolveAppearance(visual: VisualTheme | undefined, mode: AppearanceMode, systemDark: boolean): {visual: VisualTheme; theme: 'light'|'dark'; color: string} {
  const old = effectiveAppearance(mode, systemDark)
  const selected = visual ?? (old === 'dark' ? 'classic' : 'light-native')
  const theme = selected === 'light-native' ? 'light' : old
  return { visual: selected, theme, color: theme === 'dark' ? '#171c19' : selected === 'classic' ? '#f5f2eb' : '#f5f7fa' }
}
export function applyAppearance(): void {
  const state = resolveAppearance(readVisualTheme(), readAppearance(), matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.visualTheme = state.visual
  document.documentElement.dataset.effectiveTheme = state.theme
  document.documentElement.style.colorScheme = state.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.color)
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', state.theme === 'dark' ? 'black' : 'default')
  document.dispatchEvent(new Event(appearanceEvent))
}
export function saveAppearance(mode: AppearanceMode): void {
  if (!['system', 'light', 'dark'].includes(mode)) throw Error('外观模式不合法')
  localStorage.setItem(appearanceKey, mode)
  applyAppearance()
}
export function saveVisualTheme(theme: VisualTheme): void {
  if (theme !== 'classic' && theme !== 'light-native') throw Error('视觉主题不合法')
  localStorage.setItem(visualThemeKey, theme)
  applyAppearance()
}
export function setupAppearance(): () => void {
  const system = matchMedia('(prefers-color-scheme: dark)'), changed = () => applyAppearance()
  const stored = (event: StorageEvent) => { if (event.key === appearanceKey || event.key === visualThemeKey || event.key === null) applyAppearance() }
  system.addEventListener('change', changed); window.addEventListener('storage', stored); applyAppearance()
  return () => { system.removeEventListener('change', changed); window.removeEventListener('storage', stored) }
}
