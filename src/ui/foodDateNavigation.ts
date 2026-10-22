import { bindHorizontalSwipe, navigationBlocked, shouldCommitSwipe, swipeControl } from './horizontalNavigation'
import { shiftLocalDate } from '../utils/date'

/** Native rail momentum stays native; its continuous calendar offset drives readonly day panels. */
export function createFoodDateNavigation(options: {
  content: HTMLElement; rail: HTMLElement; date: string
  preview(date: string): Promise<HTMLElement>
  select(date: string): Promise<void>
  fail(error: unknown): void
}) {
  const { content, rail, date } = options, body = content.querySelector<HTMLElement>('.food-content-body')!, track = rail.querySelector<HTMLElement>('.food-date-rail-track')!
  const events = new AbortController(), reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const cache = new Map<string, Promise<HTMLElement>>()
  let version = 0, frame = 0, panels: HTMLElement[] = [], ratio = 0, custom = false, pair = '', readyPair = '', paintBase = 0, disposed = false
  let pairReady = Promise.resolve()
  const itemWidth = () => rail.querySelector<HTMLElement>('.food-date-item')!.offsetWidth
  const selectedItem = () => [...rail.querySelectorAll<HTMLElement>('.food-date-item')].find(b => b.dataset.foodDate === date)
  const reset = () => {
    version++; cancelAnimationFrame(frame); frame = 0; panels.forEach(p => p.remove()); panels = []; pair = ''; readyPair = ''; ratio = 0; cache.clear()
    body.style.removeProperty('visibility'); body.inert = false; content.removeAttribute('data-swiping'); track.style.removeProperty('transform'); custom = false
  }
  const load = (day: string) => {
    let read = cache.get(day)
    if (!read) { read = options.preview(day); cache.set(day, read) }
    return read
  }
  const paint = () => {
    if (panels.length !== 2 || pair !== readyPair) return
    const fraction = Math.max(0, Math.min(1, ratio - paintBase)), width = content.clientWidth
    panels[0]!.style.transform = `translate3d(${-fraction * width}px,0,0)`
    panels[1]!.style.transform = `translate3d(${(1 - fraction) * width}px,0,0)`
  }
  const draw = (offset: number) => {
    if (disposed || navigationBlocked()) return
    ratio = offset
    if (Math.abs(offset) < .0001) { version++; panels.forEach(p => p.remove()); panels = []; pair = ''; readyPair = ''; body.style.removeProperty('visibility'); body.inert = false; return }
    const first = shiftLocalDate(date, Math.floor(offset)), second = shiftLocalDate(first, 1), key = first + '/' + second
    if (pair === key) { paint(); return }
    pair = key; const token = ++version
    const base = Math.floor(offset)
    pairReady = Promise.all([load(first), load(second)]).then(values => {
      if (disposed || token !== version) return
      panels.forEach(p => p.remove())
      panels = values.map(value => {
        const p = value.cloneNode(true) as HTMLElement; p.classList.add('food-day-preview'); p.inert = true; p.setAttribute('aria-hidden', 'true')
        for (const node of p.querySelectorAll('[id],[aria-live]')) { node.removeAttribute('id'); node.removeAttribute('aria-live') }
        content.append(p); return p
      })
      readyPair = key; paintBase = base
      content.dataset.swiping = 'true'; body.style.visibility = 'hidden'; body.inert = true; paint()
    }).catch(error => { reset(); options.fail(error) })
  }
  const railProgress = () => {
    if (custom || disposed || navigationBlocked()) return
    const selected = selectedItem(); if (!selected) return
    const r = rail.getBoundingClientRect(), b = selected.getBoundingClientRect()
    draw((r.left + r.width / 2 - b.left - b.width / 2) / itemWidth())
  }
  const swipe = bindHorizontalSwipe(content, {
    allowed: target => !target.closest(`${swipeControl},.row-menu,[data-no-page-swipe]`),
    start: () => { reset(); custom = true; for (const offset of [-1,0,1]) void load(shiftLocalDate(date,offset)).catch(() => {}) },
    move: dx => {
      if (!custom) return
      const offset = Math.max(-1, Math.min(1, -dx / content.clientWidth)); draw(offset)
      track.style.transform = `translate3d(${-offset * itemWidth()}px,0,0)`
    },
    end: (dx, velocity, canceled) => {
      if (!custom) return
      const commit = !canceled && shouldCommitSwipe(dx, velocity, content.clientWidth), startRatio = ratio, endRatio = commit ? (dx < 0 ? 1 : -1) : 0
      const token = version, duration = reduced.matches ? 0 : commit ? 230 : 205
      let at = performance.now()
      // The same pair remains prepared during the finite release animation.
      const tick = (now: number) => {
        if (disposed || token !== version) return
        const t = duration ? Math.min(1, (now-at)/duration) : 1
        ratio = startRatio + (endRatio-startRatio)*(1-(1-t)**3); paint()
        track.style.transform = `translate3d(${-ratio * itemWidth()}px,0,0)`
        if (t < 1) frame = requestAnimationFrame(tick)
        else if (commit) void options.select(shiftLocalDate(date,endRatio)).catch(error => { reset(); options.fail(error) })
        else reset()
      }
      void pairReady.then(() => { if (!disposed && token === version) { at = performance.now(); frame = requestAnimationFrame(tick) } })
    },
  })
  const cancel = () => { swipe.cancel(); reset() }
  window.addEventListener('resize', cancel, { signal: events.signal }); window.addEventListener('pagehide', cancel, { signal: events.signal })
  document.addEventListener('fitlog-sheet-open', cancel, { signal: events.signal }); reduced.addEventListener('change', cancel, { signal: events.signal })
  return { get dragging() { return custom }, railProgress, reset, destroy: () => { disposed = true; swipe.destroy(); reset(); cache.clear(); events.abort() } }
}
