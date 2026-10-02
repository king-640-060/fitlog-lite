import { inputModality } from './inputModality'
export type SheetVariant = 'content' | 'form' | 'large' | 'assistant'
export type { SheetViewport } from './sheetViewport'
export { sheetViewport } from './sheetViewport'
import { computeSheetViewportState, type SheetViewportState } from './sheetViewport'
/** One app lifetime coordinator; visual movement is coalesced, and closed-keyboard geometry is stable. */
export function setupSheetViewport(): () => void {
  const events = new AbortController(), viewport = window.visualViewport
  let state: SheetViewportState | undefined, frame = 0, layoutResize = false, revealFocused = false
  const editing = () => document.activeElement instanceof Element && !!document.activeElement.closest('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=file]), textarea, [contenteditable=true]')
  const update = () => {
    frame = 0
    const current = window.visualViewport
    const next = computeSheetViewportState(state, { height: current?.height ?? innerHeight, offsetTop: current?.offsetTop ?? 0, layoutHeight: innerHeight, layoutWidth: innerWidth, editing: editing(), layoutResize, scale: current?.scale })
    layoutResize = false
    for (const [key, number] of Object.entries({ height: next.viewport.height, 'offset-top': next.viewport.offsetTop, 'bottom-offset': next.viewport.bottomOffset, 'keyboard-overlap': next.viewport.keyboardOverlap })) {
      const property = `--sheet-${key === 'height' ? 'viewport-height' : key}`, value = `${number}px`
      if (document.documentElement.style.getPropertyValue(property) !== value) document.documentElement.style.setProperty(property, value)
    }
    if (state?.keyboardOpen !== next.keyboardOpen) document.body.classList.toggle('keyboard-open', next.keyboardOpen)
    if (next.keyboardOpen && (!state?.keyboardOpen || revealFocused)) {
      const active = document.activeElement
      const surface = active instanceof HTMLElement ? active.closest<HTMLElement>('.sheet .modal-body') : null
      if (surface && getComputedStyle(surface).overflowY === 'auto') {
        const field = active!.getBoundingClientRect(), body = surface.getBoundingClientRect()
        const bottom = Math.min(body.bottom, next.viewport.height + next.viewport.offsetTop) - 12, top = Math.max(body.top, next.viewport.offsetTop) + 12
        // Native focus scrolling goes first; correct only residual real keyboard occlusion, within this body.
        if (field.bottom > bottom) surface.scrollTop += field.bottom - bottom
        else if (field.top < top) surface.scrollTop -= top - field.top
      }
    }
    revealFocused = false; state = next
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  const visualScroll = () => { if (!state?.keyboardOpen && !editing()) return; schedule() }
  const windowResize = () => {
    // Mobile toolbar can resize innerHeight too. Only width/orientation establishes a new mobile baseline.
    if (!viewport || !matchMedia('(pointer: coarse)').matches) layoutResize = true
    schedule()
  }
  viewport?.addEventListener('resize', schedule, { signal: events.signal }); viewport?.addEventListener('scroll', visualScroll, { signal: events.signal })
  window.addEventListener('resize', windowResize, { signal: events.signal })
  window.addEventListener('orientationchange', () => { layoutResize = true; schedule() }, { signal: events.signal })
  document.addEventListener('focusin', () => { revealFocused = true; schedule() }, { signal: events.signal }); document.addEventListener('focusout', () => queueMicrotask(schedule), { signal: events.signal })
  update(); return () => { events.abort(); cancelAnimationFrame(frame) }
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
  if (!overlay && primary) { primary.dataset.replacing = 'true'; primary.close() }
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
  // Native Escape emits close unless a domain subview prevents cancel. Do not pre-empt that event.
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
