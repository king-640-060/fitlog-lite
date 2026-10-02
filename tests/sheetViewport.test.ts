import { describe, expect, it } from 'vitest'
import { computeSheetViewportState, type SheetViewportInput, type SheetViewportState } from '../src/ui/sheetViewport'
const input: SheetViewportInput = { height: 844, offsetTop: 0, layoutHeight: 844, layoutWidth: 390, editing: false }
const calculate = (value: Partial<SheetViewportInput> = {}, previous?: SheetViewportState) => computeSheetViewportState(previous, { ...input, ...value })
describe('shared Sheet keyboard state machine', () => {
  it.each([{ height: 760, offsetTop: 40 }, { height: 700, offsetTop: 0 }, { height: 600, offsetTop: 100 }])('ignores nonediting toolbar/visual movements %j', movement => { const s = calculate(movement); expect(s.keyboardOpen).toBe(false); expect(s.viewport).toEqual({ height: 844, offsetTop: 0, bottomOffset: 0, keyboardOverlap: 0 }) })
  it('does not mistake a focused input plus a 60px toolbar difference for keyboard', () => { expect(calculate({ height: 784, editing: true }).viewport.bottomOffset).toBe(0) })
  it('opens for a real 344px occlusion and supports keyboard panning', () => {
    const s = calculate({ height: 480, offsetTop: 20, editing: true }); expect(s.keyboardOpen).toBe(true); expect(s.viewport).toEqual({ height: 480, offsetTop: 20, bottomOffset: 344, keyboardOverlap: 344 })
    expect(calculate({ height: 450, offsetTop: 50, editing: true }, s).viewport.bottomOffset).toBe(344)
  })
  it('uses 140px open / 80px close hysteresis instead of threshold oscillation', () => {
    let s = calculate({ height: 714, editing: true }); expect(s.keyboardOpen).toBe(false)
    s = calculate({ height: 704, editing: true }, s); expect(s.keyboardOpen).toBe(true)
    for (const occlusion of [130, 140, 100, 81]) { s = calculate({ height: 844 - occlusion, editing: true }, s); expect(s.keyboardOpen).toBe(true) }
    s = calculate({ height: 764, editing: true }, s); expect(s.keyboardOpen).toBe(false); expect(s.viewport.bottomOffset).toBe(0)
  })
  it('retains keyboard geometry after blur until dismissal clears occlusion, then resets all variables once', () => {
    let s = calculate({ height: 480, editing: true })
    for (const h of [480, 560, 650, 740]) { s = calculate({ height: h }, s); expect(s.keyboardOpen).toBe(true) }
    s = calculate({ height: 790 }, s); expect(s.viewport).toEqual({ height: 844, offsetTop: 0, bottomOffset: 0, keyboardOverlap: 0 })
    for (const h of [760, 800, 780, 844]) { s = calculate({ height: h, offsetTop: 20 }, s); expect(s.viewport.bottomOffset).toBe(0); expect(s.viewport.height).toBe(844) }
  })
  it('keeps toolbar animation sequences stable even when layout height changes', () => { let s = calculate(); for (const [h, top] of [[820, 10], [800, 20], [760, 40], [810, 20], [844, 0]]) { s = calculate({ height: h, layoutHeight: h, offsetTop: top }, s); expect(s.viewport.height).toBe(844); expect(s.viewport.bottomOffset).toBe(0) } })
  it('does not open keyboard for unfocused voice with substantial viewport occlusion', () => { expect(calculate({ height: 480 }).keyboardOpen).toBe(false) })
  it('refreshes baseline for orientation and actual desktop window resize', () => {
    const s = calculate(); const landscape = calculate({ height: 390, layoutHeight: 390, layoutWidth: 844 }, s); expect(landscape.viewport.height).toBe(390); expect(landscape.viewport.bottomOffset).toBe(0)
    expect(calculate({ height: 700, layoutHeight: 700, layoutResize: true }, s).viewport.height).toBe(700)
  })
  it('does not misclassify user zoom as a newly opened keyboard', () => { expect(calculate({ height: 420, editing: true, scale: 2 }).keyboardOpen).toBe(false) })
})
