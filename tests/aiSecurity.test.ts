import { describe, expect, it } from 'vitest'
import { assertNoKnownSecrets, boundedToolResult, normalizeAiBaseUrl, safeAiError } from '../src/ai/security'
describe('AI security boundaries', () => {
  it.each(['http://example.com/v1', 'https://user:pass@example.com/v1', 'https://example.com/v1?key=x', 'https://example.com/v1#key', 'file:///tmp/x', 'ftp://example.com', 'javascript:alert(1)'])('rejects unsafe URL %s', url => { expect(() => normalizeAiBaseUrl(url)).toThrow() })
  it.each(['https://example.com/v1/', 'http://localhost:8080/v1/', 'http://127.0.0.1:3000/v1'])('accepts HTTPS and explicit localhost proxy %s', url => { expect(normalizeAiBaseUrl(url)).toBe(url.replace(/\/$/, '')) })
  it('blocks exact known AI or GitHub secrets before transport and never exposes arbitrary error bodies', () => {
    expect(() => assertNoKnownSecrets({ title: 'contains ghp_saved' }, ['sk_saved', 'ghp_saved'])).toThrow('凭据')
    expect(() => assertNoKnownSecrets('contains sk_saved', ['sk_saved'])).toThrow('凭据')
    expect(() => assertNoKnownSecrets('hello', ['', 'other'])).not.toThrow()
    expect(safeAiError(new Error('SECRET RAW'))).not.toContain('SECRET')
  })
  it('bounds oversized tool data with valid JSON and an explicit truncation label', () => {
    const encoded = boundedToolResult({ rows: Array.from({ length: 500 }, (_, i) => ({ name: `name${i}`.repeat(500), value: i })), dates: new Set(['2026-10-02']) })
    expect(encoded.length).toBeLessThanOrEqual(16000); expect(JSON.parse(encoded).truncated).toBe(true)
    expect(JSON.parse(boundedToolResult({ dates: new Set(['2026-10-02']) })).dates).toEqual(['2026-10-02'])
  })
})
