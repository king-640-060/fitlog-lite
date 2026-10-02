import { describe, expect, it, vi } from 'vitest'
import { consumeQuickLaunch, parseQuickLaunchHash } from '../src/ui/quickLaunch'
import { AI_LIMITS } from '../src/ai/security'
describe('ephemeral AI launch fragment', () => {
  it('opens text/voice with only explicit supported fields', () => {
    expect(parseQuickLaunchHash('#quick=ai')).toEqual({target:'ai',voice:false,autoSend:false,prompt:undefined})
    expect(parseQuickLaunchHash('#quick=ai&voice=1&unknown=x')).toMatchObject({voice:true})
    expect(parseQuickLaunchHash('#quick=food&voice=1')).toBeUndefined()
    expect(parseQuickLaunchHash('#quick=ai&voice=true&send=1')).toMatchObject({voice:false,autoSend:false})
  })
  it('decodes once, trims, and treats URL text only as an untrusted prompt', () => {
    const prompt = '<img onerror=attack> 你好+%20'
    expect(parseQuickLaunchHash('#quick=ai&prompt='+encodeURIComponent('  '+prompt+'  ')+'&send=1')).toMatchObject({prompt,autoSend:true})
    expect(parseQuickLaunchHash('#quick=ai&prompt=+++&send=1')?.autoSend).toBe(false)
  })
  it('rejects malformed encoding and oversized prompts', () => {
    for (const prompt of ['%','%E0%A4%A','%FF']) expect(parseQuickLaunchHash('#quick=ai&prompt='+prompt)).toBeUndefined()
    expect(parseQuickLaunchHash('#quick=ai&prompt='+'字'.repeat(AI_LIMITS.userChars+1))).toBeUndefined()
    expect(parseQuickLaunchHash('#quick=ai&prompt='+'字'.repeat(AI_LIMITS.userChars))).toBeDefined()
  })
  it('consumes sensitive and invalid launch fragments without changing Pages base/query/history state', () => {
    const history = { state: { scroll:4 }, replaceState:vi.fn() }
    const location = {hash:'#quick=ai&prompt=你好&send=1',pathname:'/fitlog-lite/',search:'?normal=1'}
    expect(consumeQuickLaunch(location,history)?.prompt).toBe('你好')
    expect(history.replaceState).toHaveBeenCalledExactlyOnceWith(history.state,'','/fitlog-lite/?normal=1')
    history.replaceState.mockClear(); location.hash='#quick=ai&prompt=%FF';expect(consumeQuickLaunch(location,history)).toBeUndefined();expect(history.replaceState).toHaveBeenCalledOnce()
    history.replaceState.mockClear();location.hash='#other';consumeQuickLaunch(location,history);expect(history.replaceState).not.toHaveBeenCalled()
  })
})
