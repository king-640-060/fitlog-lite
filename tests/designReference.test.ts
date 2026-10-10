import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
it('retains the exact approved immutable V4.2 interactive reference', () => {
  const original = readFileSync('design/reference/v4.2/FitLog_V4_2_Prototype.html')
  expect(createHash('sha256').update(original).digest('hex')).toBe('aa8d37f0509035970eb3a26be056eec619066ba308cf5bc8f5911d2458d24687')
})
