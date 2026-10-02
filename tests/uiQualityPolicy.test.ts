import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { formatNumber } from '../src/utils/nutrition'
const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
describe('durable mobile presentation gates', () => {
  it('formats nutrition noise, tiny values and negative zero without exponents', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(1e-7)).toBe('0'); expect(formatNumber(-0.001)).toBe('0')
    expect(formatNumber(999999.123456)).toBe('999999.1')
    expect(formatNumber(1e21)).not.toMatch(/e\+/)
  })
  it('excludes native toggles from field boxes without custom appearances', () => {
    const css = read('src/styles/primitives.css')
    expect(css).toContain('input:not([type="checkbox"]):not([type="radio"])')
    expect(css).toContain('input[type="checkbox"], input[type="radio"]')
    expect(css).not.toContain('appearance: none')
  })
  it('requires Vision transitions to own scroll and default profiles to re-encode', () => {
    const source = read('src/ui/foodVisionImport.ts'), images = read('src/ai/visionImages.ts')
    expect(source).toContain('const renderStep =')
    expect(source.match(/host.innerHTML =/g)).toHaveLength(1)
    expect(source).toContain('scrollBody.scrollTop = reviewScroll')
    expect(images).toContain("canvas.toBlob(resolve, 'image/jpeg', quality)")
    expect(source).not.toContain('console.log')
    expect(source).toContain('sources = []')
  })
})
