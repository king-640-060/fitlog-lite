export type InputModality = 'pointer' | 'keyboard'
const navigationKeys = new Set(['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])
/** Typing, caret movement and IME in editable fields do not change modality. */
export function isKeyboardNavigation(key: string, editable: boolean, composing = false): boolean {
  return !composing && (key === 'Tab' || (!editable && (navigationKeys.has(key) || key === 'Enter' || key === ' ')))
}
export function inputModality(): InputModality { return document.documentElement.dataset.inputModality === 'keyboard' ? 'keyboard' : 'pointer' }
export function setupInputModality(): () => void {
  const events = new AbortController()
  const set = (value: InputModality) => { document.documentElement.dataset.inputModality = value }
  const pointer = () => set('pointer')
  document.addEventListener('pointerdown', pointer, { capture: true, signal: events.signal })
  document.addEventListener('touchstart', pointer, { capture: true, passive: true, signal: events.signal })
  document.addEventListener('keydown', event => {
    const editable = event.target instanceof Element && !!event.target.closest('textarea, [contenteditable=true], input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit])')
    if (isKeyboardNavigation(event.key, editable, event.isComposing)) set('keyboard')
  }, { capture: true, signal: events.signal })
  set('pointer')
  return () => events.abort()
}
