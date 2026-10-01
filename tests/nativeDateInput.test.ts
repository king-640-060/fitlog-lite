import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// Exceptions require an explicit documented use case. No business-date exceptions exist.
const exemptions: string[] = []
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)])
}
it('rejects native business date inputs throughout src, including dynamic constructors', () => {
  const patterns = [/\btype\s*=\s*["']date["']/i, /\.type\s*=\s*["'`]date["'`]/i, /setAttribute\(\s*["'`]type["'`]\s*,\s*["'`]date["'`]/i, /\btype\s*:\s*["'`]date["'`]/i]
  const offenders = files('src').filter(path => /\.(ts|html|js)$/.test(path) && !exemptions.includes(path) && patterns.some(pattern => pattern.test(readFileSync(path, 'utf8'))))
  expect(offenders).toEqual([])
})
