/** Local, handle-only sorting. The draft changes once, on release; cancellation is presentation-only. */
export function reorderByIds<T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] {
  if (ids.length !== items.length || new Set(ids).size !== ids.length || ids.some(id => !items.some(i => i.id === id))) throw new Error('排序来源已变化，请重试')
  const byId = new Map(items.map(item => [item.id, item]))
  return ids.map(id => byId.get(id)!)
}
export function sortHandleHtml(label: string): string {
  return `<button type="button" class="sort-handle icon-btn quiet" data-sort-handle aria-label="${label}；拖动或上下方向键排序" title="拖动或上下方向键排序"><svg width="16" height="24" viewBox="0 0 16 24" aria-hidden="true" fill="currentColor">${[6,12,18].map(y=>`<circle cx="5" cy="${y}" r="1.5"/><circle cx="11" cy="${y}" r="1.5"/>`).join('')}</svg></button>`
}
export function bindSortableList(list: HTMLElement, options: { row: string; id(row: HTMLElement): string; commit(ids: string[]): void }): { cancel(): void; destroy(): void } {
  const events = new AbortController(), signal = events.signal
  const live = document.createElement('span'); live.className = 'sr-only'; live.setAttribute('role', 'status'); list.after(live)
  const rows = () => [...list.querySelectorAll<HTMLElement>(`:scope > ${options.row}`)]
  let drag: { row: HTMLElement; handle: HTMLElement; placeholder: HTMLElement; original: HTMLElement[]; style: string | null; id: number; x: number; y: number; top: number; left: number; width: number; height: number; lastY: number; startScroll: number; scroll: HTMLElement | null } | undefined
  let frame = 0, translation = 0
  const announce = () => { live.textContent = '顺序已更新；可继续使用上下方向键调整' }
  const finish = (cancel = false) => {
    const d = drag; drag = undefined; cancelAnimationFrame(frame); frame = 0
    if (!d) return
    if (cancel) {
      // Restore exact original nodes/order; no cloned inputs or lost editing state.
      for (const row of d.original) list.append(row)
    } else d.placeholder.replaceWith(d.row)
    d.placeholder.remove(); if (d.style === null) d.row.removeAttribute('style'); else d.row.setAttribute('style', d.style)
    d.row.classList.remove('is-sorting'); d.handle.removeAttribute('aria-pressed'); list.removeAttribute('data-sorting')
    try { if (d.handle.hasPointerCapture(d.id)) d.handle.releasePointerCapture(d.id) } catch { /* pointer already canceled */ }
    if (!cancel) { options.commit(rows().map(options.id)); announce() } else live.textContent = '已取消排序，原顺序保留'
    d.handle.focus({ preventScroll: true })
  }
  const paint = () => {
    const d = drag; if (!d) return
    if (!list.isConnected || !d.row.isConnected || document.hidden) { finish(true); return }
    if (d.scroll) {
      const r = d.scroll.getBoundingClientRect(), edge = 52
      const step = d.lastY < r.top + edge ? -Math.min(14, (r.top + edge - d.lastY) / 4) : d.lastY > r.bottom - edge ? Math.min(14, (d.lastY - r.bottom + edge) / 4) : 0
      if (step) d.scroll.scrollTop += step
    } else {
      const step = d.lastY < 70 ? -12 : d.lastY > innerHeight - 70 ? 12 : 0
      if (step) window.scrollBy(0, step)
    }
    // A native dialog / transformed Sheet may establish the fixed containing block.
    // Read the real origin after native scrolling, then apply one translation.
    const origin=d.row.getBoundingClientRect().top-translation
    translation=d.top+d.lastY-d.y-origin
    d.row.style.transform = `translate3d(0,${translation}px,0)`
    const peers = [...list.children].filter((r): r is HTMLElement => r instanceof HTMLElement && r.matches(options.row) && r !== d.row)
    const target = peers.find(r => d.lastY < r.getBoundingClientRect().top + r.getBoundingClientRect().height / 2)
    const before = new Map(peers.map(r => [r, r.getBoundingClientRect().top]))
    if (target) { if (d.placeholder.nextElementSibling !== target) list.insertBefore(d.placeholder, target) }
    else if (list.lastElementChild !== d.placeholder) list.append(d.placeholder)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for (const r of peers) {
      const dy = before.get(r)! - r.getBoundingClientRect().top
      if (Math.abs(dy) > .5) { r.getAnimations().forEach(a=>a.cancel()); r.animate([{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:160,easing:'cubic-bezier(.2,0,0,1)'}) }
    }
    frame = requestAnimationFrame(paint)
  }
  list.addEventListener('pointerdown', e => {
    const handle = (e.target as Element).closest<HTMLElement>('[data-sort-handle]'), row = handle?.closest<HTMLElement>(options.row)
    if (!handle || !row || row.parentElement !== list || e.button !== 0 || !e.isPrimary) return
    if (drag) { finish(true); return }
    const r = row.getBoundingClientRect(), placeholder = document.createElement('div'); placeholder.className = 'sort-placeholder'; placeholder.style.height = `${r.height}px`
    const original = rows(); row.before(placeholder)
    const scroll = list.closest<HTMLElement>('.modal-body,.deck-scroll')
    drag = { row, handle, placeholder, original, style:row.getAttribute('style'), id:e.pointerId, x:e.clientX, y:e.clientY, top:r.top, left:r.left, width:r.width, height:r.height, lastY:e.clientY, startScroll:scroll?.scrollTop??scrollY, scroll }
    // Keep the real row inside its native dialog/top layer while removing it from layout.
    Object.assign(row.style,{position:'fixed',top:`${r.top}px`,left:`${r.left}px`,width:`${r.width}px`,height:`${r.height}px`,margin:'0',zIndex:'20',pointerEvents:'none'})
    const placed=row.getBoundingClientRect();row.style.top=`${r.top-(placed.top-r.top)}px`;row.style.left=`${r.left-(placed.left-r.left)}px`;translation=0
    row.classList.add('is-sorting');handle.setAttribute('aria-pressed','true');list.dataset.sorting='true'
    handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); live.textContent='正在排序；Escape取消'; frame=requestAnimationFrame(paint)
  },{signal})
  list.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId){drag.lastY=e.clientY;e.preventDefault();e.stopPropagation()}},{signal})
  list.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){e.stopPropagation();finish()}},{signal})
  list.addEventListener('pointercancel',()=>finish(true),{signal})
  list.addEventListener('lostpointercapture',()=>finish(true),{signal})
  list.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish(true);return}
    const handle=(e.target as Element).closest<HTMLElement>('[data-sort-handle]');if(!handle||!['ArrowUp','ArrowDown'].includes(e.key))return
    e.preventDefault();const row=handle.closest<HTMLElement>(options.row)!,all=rows(),index=all.indexOf(row),next=index+(e.key==='ArrowUp'?-1:1)
    if(next<0||next>=all.length)return
    if(next<index)list.insertBefore(row,all[next]!);else all[next]!.after(row)
    options.commit(rows().map(options.id));announce();handle.focus({preventScroll:true})
  },{signal})
  window.addEventListener('blur',()=>finish(true),{signal});window.addEventListener('pagehide',()=>finish(true),{signal});window.addEventListener('resize',()=>finish(true),{signal})
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(true)},{signal})
  return {cancel:()=>finish(true),destroy:()=>{finish(true);events.abort();live.remove()}}
}
