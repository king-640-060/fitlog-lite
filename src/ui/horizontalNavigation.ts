/** Presentation only. Committing a route/date remains owned by its existing renderer. */
export function swipeAxis(x: number, y: number): 'pending' | 'horizontal' | 'vertical' {
  if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x) * .9) return 'vertical'
  return Math.abs(x) > 12 && Math.abs(x) > Math.abs(y) * 1.4 ? 'horizontal' : 'pending'
}
export function shouldCommitSwipe(distance: number, velocity: number, width: number): boolean {
  return Math.abs(distance) >= width * .28 || (Math.abs(distance) >= 40 && Math.abs(velocity) > .48 && Math.sign(velocity) === Math.sign(distance))
}
export function adjacentSwipe(index: number, distance: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index + (distance < 0 ? 1 : -1)))
}
export const swipeControl = 'button,a,input,textarea,select,summary,[contenteditable=true],[role=button],[role=slider]'
export function navigationBlocked(editing = true): boolean {
  return !!document.querySelector('dialog[open]') || document.body.matches('.keyboard-open,.immersive') || (editing && !!document.activeElement?.matches('input,textarea,select,[contenteditable=true]'))
}

/** Touch is handled locally, after direction/owner arbitration. Native vertical and child scroll stay native. */
export function bindHorizontalSwipe(surface: HTMLElement, options: {
  allowed(target: Element): boolean
  start(): void
  move(dx: number): void
  end(dx: number, velocity: number, canceled: boolean): void
}): { cancel(): void; destroy(): void } {
  const events = new AbortController(), signal = events.signal
  let gesture: { id: number; x: number; y: number; axis: 'pending' | 'horizontal'; samples: { x: number; t: number }[]; dx: number } | undefined
  let suppressUntil = 0
  const begin = (id: number, x: number, y: number, target: EventTarget | null) => {
    if (gesture || navigationBlocked() || document.getSelection()?.toString() || !(target instanceof Element) || !options.allowed(target) || x - surface.getBoundingClientRect().left < 26) return
    // Text remains selectable. Desktop drag navigation starts only on whitespace, not a text run.
    if (target.matches('p,span,strong,small,h1,h2,h3,h4,label,time,text')) return
    gesture = { id, x, y, axis: 'pending', samples: [{ x, t: performance.now() }], dx: 0 }; options.start()
  }
  const move = (id: number, x: number, y: number, event: Event) => {
    const g = gesture; if (!g || g.id !== id) return
    if (navigationBlocked()) { finish(true); return }
    const dx = x - g.x, axis = swipeAxis(dx, y - g.y)
    if (g.axis === 'pending') {
      if (axis === 'vertical') { finish(true); return }
      if (axis !== 'horizontal') return
      g.axis = 'horizontal'
    }
    if (event.cancelable) event.preventDefault()
    g.dx = dx
    const t = performance.now(); g.samples.push({ x, t }); g.samples = g.samples.filter(s => t - s.t < 130)
    options.move(dx)
  }
  const finish = (canceled = false) => {
    const g = gesture; gesture = undefined
    if (!g) return
    if (g.axis === 'horizontal') suppressUntil = performance.now() + 420
    // A held finger is not a flick: include release time in the velocity window.
    const first = g.samples.find(s => performance.now() - s.t < 130), last = g.samples.at(-1)!
    const velocity = first ? (last.x - first.x) / Math.max(1, performance.now() - first.t) : 0
    options.end(g.dx, velocity, canceled || g.axis !== 'horizontal')
  }
  surface.addEventListener('touchstart', e => { suppressUntil = 0; if (e.touches.length === 1) { const t = e.touches[0]!; begin(t.identifier, t.clientX, t.clientY, e.target) } else finish(true) }, { signal, passive: true })
  surface.addEventListener('touchmove', e => { const g = gesture, t = [...e.touches].find(t => t.identifier === g?.id); if (t) move(t.identifier, t.clientX, t.clientY, e) }, { signal, passive: false })
  surface.addEventListener('touchend', () => finish(), { signal, passive: true })
  surface.addEventListener('touchcancel', () => finish(true), { signal, passive: true })
  surface.addEventListener('pointerdown', e => {
    suppressUntil = 0
    if (e.pointerType !== 'touch' && e.isPrimary && e.button === 0) {
      begin(e.pointerId, e.clientX, e.clientY, e.target)
      if (gesture) e.preventDefault() // Whitespace only; do not initiate a competing native text selection.
    }
  }, { signal })
  window.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') move(e.pointerId, e.clientX, e.clientY, e) }, { signal })
  window.addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && gesture?.id === e.pointerId) finish() }, { signal })
  surface.addEventListener('pointercancel', e => { if (e.pointerType !== 'touch') finish(true) }, { signal })
  surface.addEventListener('lostpointercapture', e => { if (gesture?.id === e.pointerId) finish(true) }, { signal })
  surface.addEventListener('click', e => { if (e.detail !== 0 && performance.now() < suppressUntil) { e.preventDefault(); e.stopImmediatePropagation() } }, { signal, capture: true })
  return { cancel: () => finish(true), destroy: () => { gesture = undefined; events.abort() } }
}

export interface NavigationPreview { element: HTMLElement; dispose(): void; activate?(): void }
export function createPageNavigation<T extends string>(options: {
  tabs: readonly T[]; stage: HTMLElement; current: HTMLElement; nav: HTMLElement
  active(): T
  prepare(tab: T, signal: AbortSignal): Promise<NavigationPreview>
  commit(tab: T, prepared: NavigationPreview): Promise<HTMLElement | void>
  fail(error: unknown): void
}) {
  let current = options.current
  const { stage, nav, tabs } = options, events = new AbortController(), reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const capsule = document.createElement('i'); capsule.className = 'nav-capsule'; capsule.setAttribute('aria-hidden', 'true'); nav.prepend(capsule)
  const buttons = [...nav.querySelectorAll<HTMLElement>('[data-tab]')]
  let revision = 0, frame = 0, preview: NavigationPreview | undefined, ownCommit = false, dx = 0, from = 0, to = 0, ended = false
  let queued: T | undefined, requested: T | undefined, resolveTween: (() => void) | undefined, previewTo = -1
  const scrollPositions = new Map<T, number>()
  const pendingReads = new Set<AbortController>()
  let stageWidth = stage.clientWidth
  let capsuleState: [number, number, number] | undefined
  const index = () => tabs.indexOf(options.active())
  const paintCapsule = (a = index(), b = a, t = 0) => {
    capsuleState = [a,b,t]
    const first = buttons[a]!, last = buttons[b]!, fraction = Math.max(0, Math.min(1, t))
    // Geometry is measured once at setup/resize, never changed during an animation frame.
    const x = Number(first.dataset.capsuleX), nextX = Number(last.dataset.capsuleX)
    capsule.style.transform = `translate3d(${x + (nextX - x) * fraction}px,0,0)`
  }
  const measure = () => {
    for (const b of buttons) b.dataset.capsuleX = String(b.offsetLeft + 5)
    const b = buttons[0]!; capsule.style.width = `${b.offsetWidth - 10}px`; capsule.style.height = `${b.offsetHeight - 6}px`; capsule.style.top = `${b.offsetTop + 3}px`
    if (stage.dataset.swiping && capsuleState) paintCapsule(...capsuleState); else paintCapsule()
  }
  const clean = () => {
    cancelAnimationFrame(frame); frame = 0; resolveTween?.(); resolveTween = undefined
    preview?.dispose(); preview?.element.remove(); preview = undefined; previewTo = -1
    current.style.removeProperty('transform'); current.inert = false; stage.removeAttribute('data-swiping'); paintCapsule()
  }
  const interrupt = () => { if (ownCommit) return; requested = undefined; revision++; for (const read of pendingReads) read.abort(); pendingReads.clear(); clean() }
  const draw = (distance: number) => {
    if (!preview || previewTo !== to) return
    const width = stage.clientWidth, d = Math.max(-width, Math.min(width, distance)), direction = to > from ? 1 : -1
    stage.dataset.swiping = 'true'; current.style.transform = `translate3d(${d}px,0,0)`; current.inert = true
    preview.element.style.transform = `translate3d(${d + direction * width}px,0,0)`
    paintCapsule(from, to, Math.abs(d) / width)
  }
  const prepare = async (target: number, token: number) => {
    for (const pending of pendingReads) pending.abort()
    pendingReads.clear()
    if (preview) clean()
    const read = new AbortController(); pendingReads.add(read)
    let next: NavigationPreview
    try { next = await options.prepare(tabs[target]!, read.signal) }
    catch (error) { if (read.signal.aborted) return false; throw error }
    finally { pendingReads.delete(read) }
    if (revision !== token || navigationBlocked(false)) { next.dispose(); next.element.remove(); return false }
    preview?.dispose(); preview?.element.remove(); preview = next; to = target; previewTo = target
    next.element.style.top = `${window.scrollY - (scrollPositions.get(tabs[target]!) ?? 0)}px`
    // Prepared pages may already be mounted for layout; moving the same DOM resets native scroll in Chromium.
    if (next.element.parentElement !== stage) stage.append(next.element)
    return true
  }
  const finish = async (distance: number, commit: boolean, token: number) => {
    if (token !== revision) return
    const end = commit ? (to > from ? -1 : 1) * stage.clientWidth : 0, start = performance.now(), duration = reduced.matches ? 0 : commit ? 245 : 205
    await new Promise<void>(resolve => {
      resolveTween = resolve
      const tick = (now: number) => {
        if (revision !== token) { resolve(); return }
        const t = duration ? Math.min(1, (now - start) / duration) : 1
        draw(distance + (end - distance) * (1 - (1 - t) ** 3))
        if (t === 1) { resolveTween = undefined; resolve() } else frame = requestAnimationFrame(tick)
      }; tick(start)
    })
    if (token !== revision) return
    if (commit) {
      scrollPositions.set(options.active(), window.scrollY)
      const target = tabs[to]!
      ownCommit = true
      try {
        const adopted = await options.commit(target, preview!)
        if (adopted) { current = adopted; preview = undefined; previewTo = -1 }
        window.scrollTo({ top: scrollPositions.get(target) ?? 0, behavior: 'instant' })
      } catch (error) { clean(); throw error } finally { ownCommit = false }
    }
    if (token === revision) { requested = undefined; clean(); measure() }
    if (queued !== undefined) { const latest = queued; queued = undefined; await go(latest) }
  }
  const go = async (tab: T) => {
    if (navigationBlocked(false)) return
    if (ownCommit) { queued = tab; return }
    const target = tabs.indexOf(tab); if (target < 0) return
    interrupt(); const token = revision; from = index(); to = target
    if (from === to) return
    requested = tab
    if (await prepare(target, token)) await finish(0, true, token)
  }
  const swipe = bindHorizontalSwipe(stage, {
    allowed: target => !ownCommit && !target.closest(`${swipeControl},.food-content,.food-date-navigation,.trend-chart-shell,.calendar-grid,[data-no-page-swipe]`),
    start: () => { interrupt(); from = index(); to = from; dx = 0; ended = false },
    move: distance => {
      dx = distance; const target = adjacentSwipe(from, dx, tabs.length)
      if (target === from) { clean(); to = from; return }
      if (target !== to) {
        const token = ++revision; to = target
        void prepare(target, token).then(ready => { if (ready && !ended) draw(dx) }).catch(options.fail)
      } else draw(dx)
    },
    end: (distance, velocity, canceled) => {
      ended = true
      if (to === from || canceled && !preview) { interrupt(); return }
      const token = revision
      // Never commit an unprepared/blank neighbor, including slow DB and interrupted touch streams.
      if (!preview) { interrupt(); return }
      void finish(distance, !canceled && shouldCommitSwipe(distance, velocity, stage.clientWidth), token).catch(error => { clean(); options.fail(error) })
    },
  })
  const cancel = () => { swipe.cancel(); interrupt() }
  for (const button of buttons) button.addEventListener('click', () => void go(button.dataset.tab as T).catch(options.fail), { signal: events.signal })
  window.addEventListener('resize', () => {
    const width = stage.clientWidth, changed = Math.abs(width-stageWidth) > 1
    stageWidth = width
    // Mobile toolbar/height-only events do not invalidate horizontal coordinates or a pending read.
    if (!changed) { measure(); return }
    const target = requested, committing = ownCommit
    cancel(); measure()
    // A resize cancels an uncommitted drag, but must not swallow the user's explicit Tab click.
    if (!committing && target !== undefined) void go(target).catch(options.fail)
  }, { signal: events.signal })
  window.addEventListener('pagehide', cancel, { signal: events.signal })
  document.addEventListener('fitlog-viewport-change', () => { if (navigationBlocked()) cancel() }, { signal: events.signal })
  document.addEventListener('fitlog-sheet-open', cancel, { signal: events.signal })
  reduced.addEventListener('change', cancel, { signal: events.signal })
  const resize = new ResizeObserver(measure); resize.observe(nav); measure()
  return { interrupt, update: measure, go, destroy: () => { cancel(); swipe.destroy(); events.abort(); resize.disconnect(); capsule.remove() } }
}
