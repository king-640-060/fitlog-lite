import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { isKeyboardNavigation } from '../src/ui/inputModality'
import { sheetViewport } from '../src/ui/sheetController'
const source = readFileSync('src/main.ts', 'utf8')
const css = readdirSync('src/styles').filter(file => file.endsWith('.css')).map(file => readFileSync(`src/styles/${file}`, 'utf8')).join('\n')
describe('shared interaction stability', () => {
  it('distinguishes navigation from typing and composition', () => {
    expect(isKeyboardNavigation('Tab', true)).toBe(true)
    for (const key of ['ArrowLeft', 'Enter', ' ', 'a']) expect(isKeyboardNavigation(key, true)).toBe(false)
    for (const key of ['ArrowDown', 'Enter', ' ']) expect(isKeyboardNavigation(key, false)).toBe(true)
    expect(isKeyboardNavigation('Tab', false, true)).toBe(false)
  })
  it('handles keyboard overlap, shifted visual viewport, rotation and fallback', () => {
    expect(sheetViewport(480, 20, 844, true)).toEqual({ height: 480, offsetTop: 20, bottomOffset: 344, keyboardOverlap: 344 })
    expect(sheetViewport(812, 0, 812, false).keyboardOverlap).toBe(0)
    expect(sheetViewport(390, 0, 390, true).bottomOffset).toBe(0)
    expect(sheetViewport(932, 0, 844, false).bottomOffset).toBe(0)
  })
  it('prevents replay animation, scale presses, focus glow and private sheet viewport code', () => {
    expect(/(^|\n)button:active\s*\{[^}]*transform/.test(css)).toBe(false)
    // Match the animation name, not shared tokens such as --page-inline.
    expect(css).not.toMatch(/\bpage-in\b/); expect(css).not.toContain('backdrop-filter'); expect(css).not.toContain('0 0 0 3px')
    expect(source).not.toMatch(/querySelector\('dialog'\)\?\.remove/)
    expect(source).not.toMatch(/<input[^>]*autofocus/)
    expect(source).not.toContain('requestAnimationFrame(paint)')
    for (const file of ['aiAssistant', 'foodVisionImport']) expect(readFileSync(`src/ui/${file}.ts`, 'utf8')).not.toContain('visualViewport')
    // Each hover rule has a fine-pointer media scope on its own line or enclosing block.
    for (const line of css.split('\n').filter(line => line.includes(':hover'))) expect(line).toContain('@media (hover: hover) and (pointer: fine)')
  })
})

describe('visual and accessibility primitives', () => {
  it('keeps secondary actions neutral and Workout main actions on shared primary styling', () => {
    const primitives = readFileSync('src/styles/primitives.css', 'utf8')
    const secondary = primitives.match(/\.secondary\s*\{([^}]+)\}/)![1]
    expect(secondary).toContain('background: var(--surface-soft)'); expect(secondary).not.toContain('var(--accent-soft)')
    expect(primitives).toContain('font-size: 1rem'); expect(primitives).toContain('min-height: 44px')
    expect(css).not.toContain('chart-reveal'); expect(css).not.toContain('goal-crossed')
    for (const id of ['start-workout', 'add-cardio', 'start-pelvic-floor']) {
      expect(source).toContain(`class="primary training-card-action" id="${id}"`)
      expect(source).not.toContain(`class="secondary training-card-action" id="${id}"`)
    }
  })
  it('has one native modal boundary and no per-sheet viewport listeners', () => {
    const main = readFileSync('src/main.ts', 'utf8'), controller = readFileSync('src/ui/sheetController.ts', 'utf8')
    expect(main).not.toContain('.showModal()'); expect(controller).toContain('dialog.showModal()')
    expect(controller).toContain('primary.close()'); expect(controller).toContain("dialog.dispatchEvent(new Event('close'))")
  })
})
