import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeechRecognitionService, browserRecognition, speechErrorMessage, type Recognition, type SpeechResultEvent, type SpeechOptions } from '../src/services/speechRecognitionService'
class MockRecognition implements Recognition {
  static last: MockRecognition
  lang='';continuous=true;interimResults=false;maxAlternatives=0
  onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null
  start=vi.fn(()=>this.onstart?.());stop=vi.fn();abort=vi.fn()
  constructor(){MockRecognition.last=this}
  results(rows:[string,boolean][]){this.onresult?.({resultIndex:0,results:rows.map(([transcript,isFinal])=>({isFinal,length:1,0:{transcript}}))} as SpeechResultEvent)}
}
describe('finite browser speech lifecycle',()=>{
  let service:SpeechRecognitionService,options:SpeechOptions
  beforeEach(()=>{service=new SpeechRecognitionService(MockRecognition);options={onState:vi.fn(),onInterim:vi.fn(),onFinal:vi.fn(),onError:vi.fn()}})
  it('starts Chinese one-shot recognition, sends no interim or early final, ends exactly once',()=>{
    service.start(options);const r=MockRecognition.last;expect(service.state).toBe('listening');expect([r.lang,r.continuous,r.interimResults,r.maxAlternatives]).toEqual(['zh-CN',false,true,1])
    r.results([['临时',false]]);expect(options.onFinal).not.toHaveBeenCalled()
    r.results([['今天',true],['如何',false]]);r.results([['今天',true],['蛋白质还差多少',true]])
    expect(options.onFinal).not.toHaveBeenCalled();const end=r.onend!;end();end();expect(options.onFinal).toHaveBeenCalledExactlyOnceWith('今天蛋白质还差多少');expect(r.onresult).toBeNull();expect(service.state).toBe('idle')
  })
  it('manual stop aborts immediately and sends only already-final text once',()=>{service.start(options);const r=MockRecognition.last;r.results([['一句话',true],['临时',false]]);const end=r.onend!;service.stop();expect(service.state).toBe('idle');expect(r.abort).toHaveBeenCalledOnce();expect(r.stop).not.toHaveBeenCalled();end();expect(options.onFinal).toHaveBeenCalledExactlyOnceWith('一句话')})
  it('abort, background/close disposal and old callbacks cannot publish or corrupt a new session',()=>{
    service.start(options);const old=MockRecognition.last;old.results([['不发送',true]]);const end=old.onend!,result=old.onresult!;service.abort();expect(old.abort).toHaveBeenCalledOnce();service.start(options);end();result({results:[],resultIndex:0});expect(service.state).toBe('listening');expect(options.onFinal).not.toHaveBeenCalled();service.dispose();MockRecognition.last.onend?.();expect(options.onFinal).not.toHaveBeenCalled();expect(MockRecognition.last.onerror).toBeNull();service.start(options);expect(service.state).toBe('idle')
  })
  it('does not restart when no speech ends',()=>{service.start(options);MockRecognition.last.onend?.();expect(options.onError).toHaveBeenCalledWith(speechErrorMessage('no-speech'),'no-speech');expect(options.onFinal).not.toHaveBeenCalled();expect(MockRecognition.last.start).toHaveBeenCalledOnce()})
  it.each(['not-allowed','service-not-allowed','audio-capture','no-speech','network','aborted','language-not-supported','private raw error'])('uses safe fixed copy for %s, drops final, never retries',code=>{service.start(options);const r=MockRecognition.last,end=r.onend!;r.results([['不能自动发送',true]]);r.onerror?.({error:code});end();expect(options.onFinal).not.toHaveBeenCalled();expect(options.onError).toHaveBeenCalledWith(speechErrorMessage(code),code);expect(r.start).toHaveBeenCalledOnce();expect(service.state).toBe('error')})
  it('supports standard and Safari-prefixed APIs, without claiming actual device support',()=>{
    vi.stubGlobal('window',{webkitSpeechRecognition:MockRecognition});expect(browserRecognition()).toBe(MockRecognition)
    vi.stubGlobal('window',{SpeechRecognition:MockRecognition,webkitSpeechRecognition:class extends MockRecognition{}});expect(browserRecognition()).toBe(MockRecognition)
    vi.stubGlobal('window',{});const unsupported=new SpeechRecognitionService();unsupported.start(options);expect(unsupported.state).toBe('unsupported');expect(options.onFinal).not.toHaveBeenCalled();expect(options.onError).toHaveBeenCalledWith(expect.stringContaining('系统键盘听写'),'unsupported');vi.unstubAllGlobals()
  })
  it('catches activation denial from start',()=>{class Denied extends MockRecognition{start=vi.fn(()=>{const e=new Error('private');e.name='NotAllowedError';throw e})};const denied=new SpeechRecognitionService(Denied);denied.start(options);expect(options.onError).toHaveBeenCalledWith(speechErrorMessage('not-allowed'),'not-allowed')})
})
