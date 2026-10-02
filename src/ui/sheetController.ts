import { inputModality } from './inputModality'
export type SheetVariant = 'content' | 'form' | 'large' | 'assistant'
export interface SheetViewport { height: number; offsetTop: number; bottomOffset: number; keyboardOverlap: number }
export function sheetViewport(height: number, offsetTop: number, layoutHeight: number, editing: boolean): SheetViewport {
  const bottomOffset = Math.max(0, layoutHeight - height - offsetTop)
  return { height: Math.max(120, height), offsetTop: Math.max(0, offsetTop), bottomOffset, keyboardOverlap: editing && bottomOffset > 120 ? bottomOffset : 0 }
}
/** One app lifetime coordinator; sheets inherit the same viewport and have no private resize listeners. */
export function setupSheetViewport(): () => void {
  const events = new AbortController(), viewport = window.visualViewport
  const update = () => {
    const editing = document.activeElement instanceof Element && !!document.activeElement.closest('input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true]')
    const value = sheetViewport(viewport?.height ?? innerHeight, viewport?.offsetTop ?? 0, innerHeight, editing)
    for (const [key, number] of Object.entries({ height: value.height, 'offset-top': value.offsetTop, 'bottom-offset': value.bottomOffset, 'keyboard-overlap': value.keyboardOverlap })) document.documentElement.style.setProperty(`--sheet-${key === 'height' ? 'viewport-height' : key}`, `${number}px`)
    document.body.classList.toggle('keyboard-open', value.keyboardOverlap > 0)
  }
  viewport?.addEventListener('resize', update, { signal: events.signal }); viewport?.addEventListener('scroll', update, { signal: events.signal })
  window.addEventListener('resize', update, { signal: events.signal })
  document.addEventListener('focusin', update, { signal: events.signal }); document.addEventListener('focusout', () => queueMicrotask(update), { signal: events.signal })
  update(); return () => events.abort()
}
let primary: HTMLDialogElement | undefined
let locks = 0, scrollX = 0, scrollY = 0, originalStyle = '', originalScrollBehavior = ''
function lockBackground(): () => void {
  if (locks++ === 0) {
    scrollX = window.scrollX; scrollY = window.scrollY; originalStyle = document.body.style.cssText; originalScrollBehavior = document.documentElement.style.scrollBehavior
    Object.assign(document.body.style, { position: 'fixed', top: `${-scrollY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' })
    document.body.classList.add('sheet-open')
  }
  let released = false
  return () => {
    if (released) return; released = true
    if (--locks === 0) {
      document.body.style.cssText = originalStyle; document.body.classList.remove('sheet-open')
      document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(scrollX, scrollY); document.documentElement.style.scrollBehavior = originalScrollBehavior
    }
  }
}
export function setSheetVariant(dialog: HTMLDialogElement, variant: SheetVariant): void { dialog.dataset.sheetVariant = variant }
/** Normal close notifies consumers synchronously once, before replacement. Native late close is suppressed. */
export function presentDialog(dialog: HTMLDialogElement, overlay = false): HTMLDialogElement {
  const release = lockBackground(), trigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
  if (!overlay && primary?.open) { primary.dataset.replacing = 'true'; primary.close() }
  if (!overlay) primary = dialog
  let finalized = false, delivered = false
  const nativeClose = dialog.close.bind(dialog)
  const finish = () => {
    if (finalized) return; finalized = true
    if (primary === dialog) primary = undefined
    dialog.remove(); release()
    if (!dialog.dataset.replacing && trigger?.isConnected && inputModality() === 'keyboard') trigger.focus({ preventScroll: true })
  }
  dialog.addEventListener('close', event => {
    if (delivered) { event.stopImmediatePropagation(); return }
    delivered = true; finish()
  }, { capture: true })
  dialog.close = (value?: string) => {
    if (finalized) return
    nativeClose(value); dialog.dispatchEvent(new Event('close'))
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close() })
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
  const title = dialog.querySelector<HTMLElement>('h2')
  if (title) { title.tabIndex = -1; title.classList.add('sheet-focus-anchor'); title.setAttribute('autofocus', ''); const id = `sheet-title-${crypto.randomUUID()}`; title.id = id; dialog.setAttribute('aria-labelledby', id) }
  document.body.append(dialog)
  try { dialog.showModal(); title?.focus({ preventScroll: true }) } catch (error) { finish(); throw error }
  return dialog
}
export function openSheet(titleHtml: string, body: string, closeHtml: string, wide = false): HTMLDialogElement {
  const dialog = document.createElement('dialog'); dialog.className = wide ? 'sheet sheet-wide' : 'sheet'
  setSheetVariant(dialog, wide ? 'large' : body.includes('<form') ? 'form' : 'content')
  dialog.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="modal-head"><h2>${titleHtml}</h2><button class="icon-btn quiet" data-close aria-label="关闭">${closeHtml}</button></header><div class="modal-body">${body}</div>`
  return presentDialog(dialog)
}
