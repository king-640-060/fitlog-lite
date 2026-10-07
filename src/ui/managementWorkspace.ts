import { openSheet } from './sheetController'
import { animateMotion } from './motion'
import { icon } from './icons'

interface Route {
  title: string
  loading?: boolean
  content: DocumentFragment
  localReturn?: () => void
  classes?: string
  scroll: number
  query: Map<string, string>
  dispose: Set<() => void>
  suspend: Set<() => void>
  resume: Set<() => void>
  back?: { action: () => void; title: string }
}
/** Explicit mount seam shared by standalone renderers and the management workspace. */
export interface ManagedSurfaceContext {
  readonly dialog: HTMLDialogElement
  readonly host: HTMLElement
  readonly alive: boolean
  push(title: string, html: string): HTMLDialogElement
  replace(title: string, html: string): HTMLDialogElement
  setContent(html: string): HTMLDialogElement
  dispose(): void
  open(title: string, html: string, wide?: boolean): HTMLDialogElement
  navigate(title: string, mount: (context: ManagedSurfaceContext) => void | Promise<void>): void
  returnTo(title: string): void
  back(): void
  close(): void
  setTitle(title: string): void
  setBackTarget(action?: () => void, title?: string): void
  onDispose(cleanup: () => void): void
  onResume(refresh: () => void): void
  onSuspend(cleanup: () => void): void
  /** Existing same-host subviews retain their own DOM and callback state. */
  subview(title: string, host: HTMLElement): void
  restoreScroll(): void
}

/** A route stack for this Sheet only. No business records or general page routing. */
export function createManagementWorkspace(escape: (value: unknown) => string): ManagedSurfaceContext {
  const dialog = openSheet(escape('管理与设置'), '', icon('x'), true)
  dialog.classList.add('management-workspace')
  const host = dialog.querySelector<HTMLElement>('.modal-body')!
  const heading = dialog.querySelector<HTMLElement>('.modal-head h2')!
  const backButton = document.createElement('button')
  backButton.className = 'icon-btn quiet workspace-back'; backButton.type = 'button'; backButton.innerHTML = icon('chevron', 20)
  backButton.dataset.workspaceBack = ''; heading.before(backButton)
  let closed = false
  const routes: Route[] = []
  const make = (title: string): Route => ({ title, content: document.createDocumentFragment(), scroll: 0, query: new Map(), dispose: new Set(), suspend: new Set(), resume: new Set() })
  const current = () => routes.at(-1)!
  const stop = (route: Route) => { for (const cleanup of route.suspend) cleanup() }
  const dispose = (route: Route) => { stop(route); for (const cleanup of route.dispose) cleanup(); route.dispose.clear(); route.suspend.clear(); route.resume.clear(); route.content.replaceChildren() }
  const remember = () => {
    const route = current(); if (!route) return
    route.classes = dialog.className
    route.scroll = host.scrollTop
    host.querySelectorAll<HTMLInputElement>('input[type=search]').forEach(input => { if (input.id) route.query.set(input.id, input.value) })
    stop(route)
    route.content.append(...Array.from(host.childNodes))
  }
  const header = () => {
    const route = current(); if (route.classes) dialog.className = route.classes; heading.textContent = route.title
    backButton.hidden = routes.length < 2 && !route.back
    backButton.setAttribute('aria-label', `返回${route.back?.title ?? routes.at(-2)?.title ?? '管理与设置'}`)
    dialog.dataset.managementLoading = String(Boolean(route.loading))
    dialog.dataset.managementRoute = route.title; dialog.dataset.managementDepth = String(routes.length)
    // A domain renderer must never resize the persistent frame.
    dialog.dataset.sheetVariant = 'large'; dialog.style.removeProperty('height')
  }
  const restore = () => { header(); for (const refresh of current().resume) refresh(); heading.focus({ preventScroll: true }); host.scrollTop = current().scroll; animateMotion(host, 'back') }
  const surface: ManagedSurfaceContext = {
    dialog, host, get alive() { return !closed && dialog.open },
    push(title, html) { return surface.open(title, html) },
    replace(title, html) { current().title = title; return surface.open(title, html) },
    setContent(html) { return surface.open(current().title, html) },
    dispose() { surface.close() },
    open(title, html) {
      if (closed) throw new DOMException('Management workspace closed', 'AbortError')
      const index = routes.findLastIndex(route => route.title === title)
      if (index >= 0) {
        if (index === routes.length - 1) remember()
        while (routes.length > index + 1) dispose(routes.pop()!)
        const route = current(); for (const cleanup of route.dispose) cleanup(); route.dispose.clear(); route.suspend.clear(); route.resume.clear(); route.content.replaceChildren(); route.back = undefined
      } else { remember(); routes.push(make(title)) }
      current().loading = false
      dialog.className = 'sheet sheet-wide management-workspace'; current().classes = dialog.className
      host.innerHTML = html
      const route = current()
      host.querySelectorAll<HTMLInputElement>('input[type=search]').forEach(input => { if (route.query.has(input.id)) input.value = route.query.get(input.id)! })
      header(); heading.focus({ preventScroll: true }); host.scrollTop = route.scroll
      animateMotion(host, index >= 0 ? 'back' : 'subview')
      return dialog
    },
    navigate(title, mount) {
      if (closed) return
      surface.push(title, '<p class="settings-section-note" role="status">正在读取…</p>')
      const owner = current(); owner.loading = true; header()
      // A deferred renderer belongs to this destination, even if another route opens later.
      const context = Object.create(surface) as ManagedSurfaceContext
      Object.defineProperty(context, 'alive', { get: () => !closed && routes.includes(owner) && dialog.open })
      context.open = (nextTitle, html, wide) => {
        if (!context.alive) throw new DOMException('Management route disposed', 'AbortError')
        return surface.open(nextTitle, html, wide)
      }
      void Promise.resolve().then(() => mount(context)).catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (context.alive) surface.setContent('<p role="alert">暂时无法打开，请返回后重试。</p>')
      })
    },
    returnTo(title) {
      if (!routes.some(route => route.title === title)) return
      while (!closed && routes.length > 1 && current().title !== title) surface.back()
    },
    back() {
      if (closed || routes.length < 2) return
      if (current().localReturn) { current().localReturn!(); return }
      dispose(routes.pop()!); host.replaceChildren(...Array.from(current().content.childNodes)); restore()
    },
    close() { dialog.close() },
    setTitle(title) { if (!closed) { current().title = title; header() } },
    setBackTarget(action, title) { if (!closed) { current().back = action ? { action, title: title ?? routes.at(-2)?.title ?? '管理与设置' } : undefined; header() } },
    onDispose(cleanup) { if (closed) cleanup(); else current().dispose.add(cleanup) },
    onResume(refresh) { if (!closed) current().resume.add(refresh) },
    onSuspend(cleanup) { if (closed) cleanup(); else current().suspend.add(cleanup) },
    subview(title, target) {
      if (closed || current().title === title) return
      if (routes.some(route => route.title === title)) { surface.returnTo(title); return }
      // A local subview uses the same container so existing render callbacks remain valid.
      current().classes = dialog.className
      current().scroll = host.scrollTop
      const scroll = host.scrollTop, nodes = Array.from(target.childNodes), parentTitle = current().title, parentBack = current().back
      const child = make(title); child.back = { title: parentTitle, action: () => {
        if (closed) return
        dispose(routes.pop()!); target.replaceChildren(...nodes); current().back = parentBack; header(); for (const refresh of current().resume) refresh(); heading.focus({ preventScroll: true }); host.scrollTop = scroll; animateMotion(target, 'back')
      } }
      child.localReturn = child.back.action
      child.classes = dialog.className
      stop(current()); routes.push(child); header(); heading.focus({ preventScroll: true }); host.scrollTop = 0; animateMotion(target, 'subview')
    },
    restoreScroll() { if (!closed) host.scrollTop = current().scroll },
  }
  routes.push(make('管理与设置')); header()
  backButton.addEventListener('click', () => { const action = current().back?.action; if (action) action(); else surface.back() })
  const events = new AbortController()
  dialog.addEventListener('cancel', event => { if (routes.length > 1) { event.preventDefault(); event.stopImmediatePropagation(); backButton.click() } }, { signal: events.signal })
  dialog.addEventListener('close', () => {
    closed = true; events.abort(); host.getAnimations({ subtree: true }).forEach(animation => animation.cancel())
    while (routes.length) dispose(routes.pop()!)
  }, { once: true })
  // Existing inner view renderers may set the variant; enforce the workspace's fixed contract.
  const observer = new MutationObserver(() => { if (!closed && dialog.dataset.sheetVariant !== 'large') dialog.dataset.sheetVariant = 'large' })
  observer.observe(dialog, { attributes: true, attributeFilter: ['data-sheet-variant'] })
  dialog.addEventListener('close', () => observer.disconnect(), { once: true })
  return surface
}
