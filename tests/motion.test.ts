import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { animateMotion } from '../src/ui/motion'
afterEach(() => vi.unstubAllGlobals())
describe('shared explicit motion', () => {
  it('uses a bounded token vocabulary, with only real recording repeating', () => {
    const css = readFileSync('src/styles/main.css', 'utf8')
    for (const [token,value] of [['instant','80'],['fast','120'],['normal','160'],['sheet','200'],['toast','180'],['recording','1300']]) expect(css).toContain(`--motion-${token}: ${value}ms;`)
    const all = ['main','primitives','interaction','sheets','plan','ai'].map(n => readFileSync(`src/styles/${n}.css`,'utf8')).join('\n')
    expect(all.match(/infinite/g)).toHaveLength(1); expect(all).toContain('recording-dot var(--motion-recording)')
    expect(all).not.toMatch(/transition:[^;]*\d+ms/)
    expect(all).not.toMatch(/button[^{}]*:active\s*\{[^}]*transform:\s*scale/)
  })
  it('cancels replaced feedback and never writes persistent inline styles', async () => {
    let reduced = false
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (key: string) => key === '--motion-fast' ? '120ms' : key === '--motion-normal' ? '160ms' : 'cubic-bezier(.2,0,0,1)' }))
    let reject!: (reason?: unknown) => void
    const cancel = vi.fn(() => reject('cancelled'))
    const animate = vi.fn(() => ({ cancel, finished: new Promise<void>((_resolve, fail) => { reject = fail }) }))
    const element = { isConnected: true, animate } as unknown as Element
    animateMotion(element, 'navigation'); expect(animate.mock.calls[0]).toEqual([[{ opacity: .96, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 120, easing: 'cubic-bezier(.2,0,0,1)' }])
    reduced = true; animateMotion(element, 'navigation'); expect(cancel).toHaveBeenCalledOnce(); expect(animate).toHaveBeenCalledOnce()
    await Promise.resolve(); expect(element).not.toHaveProperty('style')
  })
  it('does not animate detached nodes or reduced-motion initial feedback', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const animate = vi.fn()
    animateMotion({ isConnected: false, animate } as unknown as Element, 'message')
    animateMotion({ isConnected: true, animate } as unknown as Element, 'message')
    expect(animate).not.toHaveBeenCalled()
  })
})
