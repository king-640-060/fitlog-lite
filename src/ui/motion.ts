type Motion = 'navigation' | 'subview' | 'back' | 'message' | 'disclosure' | 'completion' | 'completion-off' | 'number' | 'toast-exit' | 'state'
const running = new Map<Element, Animation>()
/** Explicit event feedback only. No animation owns layout, state or saved values. */
export function animateMotion(element: Element | null | undefined, motion: Motion, from?: Partial<Record<'backgroundColor' | 'borderColor' | 'color', string>>): Animation | undefined {
  if (!element) return
  running.get(element)?.cancel()
  if (!element.isConnected || typeof element.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const styles = getComputedStyle(document.documentElement)
  const duration = parseFloat(styles.getPropertyValue(motion === 'subview' || motion === 'back' || motion === 'number' || motion === 'state' ? '--motion-normal' : '--motion-fast')) || 120
  const offset = motion === 'navigation' ? 'translateY(4px)' : motion === 'subview' ? 'translateX(4px)' : motion === 'back' ? 'translateX(-4px)' : motion === 'completion' ? 'scale(.8)' : 'translateY(3px)'
  const finalStyle = motion === 'state' ? getComputedStyle(element) : undefined
  const finalColors = finalStyle ? Object.fromEntries(Object.keys(from ?? {}).map(property => [property, finalStyle.getPropertyValue(property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`))])) : undefined
  const frames = motion === 'state' ? [from ?? {}, finalColors ?? {}] : motion === 'completion-off' ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.8)' }] : motion === 'number' ? [{ opacity: .75 }, { opacity: 1 }] : motion === 'toast-exit' ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: motion === 'navigation' ? .96 : .88, transform: offset }, { opacity: 1, transform: 'none' }]
  const animation = element.animate(frames, { duration, easing: styles.getPropertyValue('--ease-standard').trim() || 'ease-out' })
  running.set(element, animation)
  const release = () => { if (running.get(element) === animation) running.delete(element) }
  void animation.finished.then(release, release)
  return animation
}

/** Freeze the current Sheet frame for explicit subviews; keyboard max-height still applies. */
export function stabilizeSheetSubview(dialog: HTMLDialogElement): void {
  if (!dialog.style.height) dialog.style.height = `${dialog.getBoundingClientRect().height}px`
}

export function setupMotionInteractions(): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', () => { if (reduced.matches) for (const animation of running.values()) animation.cancel() })
  // Opt-in patterns only; menus, imports and arbitrary details retain native behavior.
  const requested = new WeakSet<HTMLDetailsElement>()
  document.addEventListener('click', event => {
    const summary = event.target instanceof Element ? event.target.closest('summary') : null
    if (summary?.parentElement instanceof HTMLDetailsElement) requested.add(summary.parentElement)
  }, true)
  document.addEventListener('toggle', event => {
    const details = event.target
    if (!(details instanceof HTMLDetailsElement) || !requested.delete(details) || !details.matches('.ai-advanced, .plan-completed, .strategy-archive, .pelvic-plan-details, .pelvic-safety')) return
    if (details.open) { for (const child of details.children) if (child.tagName !== 'SUMMARY') animateMotion(child, 'disclosure') }
    else { for (const child of details.children) running.get(child)?.cancel() }
  }, true)
  window.addEventListener('pagehide', () => { for (const animation of running.values()) animation.cancel(); running.clear() })
}
