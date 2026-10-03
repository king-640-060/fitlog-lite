import { describe, expect, it } from 'vitest'
import { appBuild, publicUrl, updateBlockReason, type UpdateSafety } from '../src/pwa/diagnostics'

describe('runtime diagnostics and safe update policy', () => {
  it('uses a Git identity and strips credentials, query and launch drafts', () => {
    expect(appBuild).toMatch(/^[a-f0-9]{40}$/)
    expect(publicUrl('https://user:secret@example.com/fitlog-lite/?key=secret#quick=ai&prompt=private')).toBe('https://example.com/fitlog-lite/')
    expect(publicUrl('not a URL')).toBe('不可用')
  })
  const idle: UpdateSafety = { otherDialog: false, workout: false, timer: false, aiBusy: false, aiDraft: false, aiProposal: false }
  it('permits an idle client and blocks every transient-state category', () => {
    expect(updateBlockReason(idle)).toBeUndefined()
    for (const key of Object.keys(idle)) expect(updateBlockReason({ ...idle, [key]: true })).toBeTruthy()
  })
})
