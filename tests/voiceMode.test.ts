import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceCaptureController } from '../src/services/voiceCaptureController'
import { pcmWav, VOICE_MAX_BYTES } from '../src/services/voiceAudio'
import { VoiceSettings, voiceProvider, ZhipuVoiceTranscriptionProvider, VOICE_KEY } from '../src/services/voiceTranscriptionService'
import { AiProfiles } from '../src/services/aiProfiles'
import { aiEnvironment } from './helpers/ai'
import { exportBackup } from '../src/services/backupService'
import { VoiceReply } from '../src/services/voiceReply'
class Recorder {
  static last: Recorder
  static isTypeSupported = vi.fn((type: string) => type === 'audio/mp4')
  mimeType = 'audio/mp4'; state = 'inactive'; ondataavailable: ((e: {data:Blob})=>void)|null=null; onstop:(()=>void)|null=null; onerror:(()=>void)|null=null
  constructor(){Recorder.last=this}
  start(){this.state='recording'}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['memory-only'])});this.onstop?.()})}
}
const options=()=>({onState:vi.fn(),onTranscript:vi.fn(),onError:vi.fn()})
const setup=(transcribe=vi.fn().mockResolvedValue('最终文字'),extras={})=>{
  const tracks=[{readyState:'live',stop:vi.fn(function(this:{readyState:string}){this.readyState='ended'})}],stream={getTracks:()=>tracks} as unknown as MediaStream
  const encode=vi.fn().mockResolvedValue(new Blob(['wav'],{type:'audio/wav'})),getUserMedia=vi.fn().mockResolvedValue(stream)
  const capture=new VoiceCaptureController({label:'synthetic',transcribe},{getUserMedia,Recorder:Recorder as unknown as typeof MediaRecorder,encode,...extras})
  return {capture,tracks,stream,transcribe,encode,getUserMedia}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
describe('owned push-to-talk capture',()=>{
  it('stops tracks before encoding/network, auto emits final exactly once, no active stream while pending',async()=>{
    let finish!:(s:string)=>void
    const transcribe=vi.fn(()=>new Promise<string>(r=>{finish=r})),s=setup(transcribe),o=options()
    await s.capture.start(o);expect(s.capture.active).toBe(true);expect(s.getUserMedia).toHaveBeenCalledOnce()
    const pending=s.capture.stopAndTranscribe();expect(s.capture.active).toBe(false);expect(s.tracks.every(t=>t.readyState==='ended')).toBe(true)
    await vi.waitFor(()=>expect(transcribe).toHaveBeenCalledOnce());expect(s.capture.state).toBe('transcribing');finish('最终文字');await pending
    expect(o.onTranscript).toHaveBeenCalledExactlyOnceWith('最终文字');expect(s.encode).toHaveBeenCalledOnce();await s.capture.stopAndTranscribe();expect(transcribe).toHaveBeenCalledOnce();s.capture.dispose()
  })
  it.each(['cancel','dispose'] as const)('%s releases tracks and detaches stale callbacks',async method=>{const s=setup(),o=options();await s.capture.start(o);const stale=Recorder.last.ondataavailable!;s.capture[method]();stale({data:new Blob(['stale'])});expect(s.tracks[0]!.readyState).toBe('ended');expect(Recorder.last.onstop).toBeNull();expect(o.onTranscript).not.toHaveBeenCalled();expect(s.capture.pending).toBe(false)})
  it('late system permission after cancel releases the late stream',async()=>{let resolve!:(s:MediaStream)=>void;const s=setup(undefined,{getUserMedia:()=>new Promise<MediaStream>(r=>{resolve=r})});const pending=s.capture.start(options());s.capture.cancel();resolve(s.stream);await pending;expect(s.tracks[0]!.readyState).toBe('ended');expect(s.capture.pending).toBe(false)})
  it('permission denial uses fixed copy, never sends or retries',async()=>{const e=new DOMException('private','NotAllowedError'),s=setup(undefined,{getUserMedia:vi.fn().mockRejectedValue(e)}),o=options();await s.capture.start(o);expect(o.onError).toHaveBeenCalledWith(expect.stringContaining('未获得麦克风权限'));expect(s.transcribe).not.toHaveBeenCalled()})
  it('recorder error releases all tracks',async()=>{const s=setup(),o=options();await s.capture.start(o);Recorder.last.onerror?.();expect(s.tracks[0]!.readyState).toBe('ended');expect(o.onError).toHaveBeenCalledOnce();expect(s.transcribe).not.toHaveBeenCalled()})
  it('provider failure keeps microphone ended and does not retry',async()=>{const s=setup(vi.fn().mockRejectedValue(new Error('private raw'))),o=options();await s.capture.start(o);await s.capture.stopAndTranscribe();expect(s.tracks[0]!.readyState).toBe('ended');expect(s.transcribe).toHaveBeenCalledOnce();expect(o.onError.mock.calls.flat().join()).not.toContain('private raw')})
  it('cancel aborts pending transcription and drops late final',async()=>{let finish!:(s:string)=>void;const s=setup(vi.fn(()=>new Promise<string>(r=>{finish=r}))),o=options();await s.capture.start(o);const p=s.capture.stopAndTranscribe();await vi.waitFor(()=>expect(s.transcribe).toHaveBeenCalledOnce());const signal=s.transcribe.mock.calls[0]![1] as AbortSignal;s.capture.cancel();expect(signal.aborted).toBe(true);finish('late');await p;expect(o.onTranscript).not.toHaveBeenCalled();expect(s.tracks[0]!.readyState).toBe('ended')})
  it('duration bound automatically stops and transcribes once',async()=>{vi.useFakeTimers();const s=setup(undefined,{maxSeconds:1}),o=options();await s.capture.start(o);await vi.advanceTimersByTimeAsync(1000);expect(s.transcribe).toHaveBeenCalledOnce();expect(s.tracks[0]!.readyState).toBe('ended');expect(o.onTranscript).toHaveBeenCalledOnce();s.capture.dispose()})
  it('oversized chunks cancel recording without network',async()=>{const s=setup(),o=options();await s.capture.start(o);Recorder.last.ondataavailable?.({data:new Blob([new Uint8Array(VOICE_MAX_BYTES+1)])});expect(s.tracks[0]!.readyState).toBe('ended');expect(o.onError).toHaveBeenCalledWith('这段语音太长，请分成两段。');expect(s.transcribe).not.toHaveBeenCalled()})
  it('silent recorder flush times out with all tracks already ended',async()=>{vi.useFakeTimers();class Silent extends Recorder{stop(){this.state='inactive'}}const s=setup(undefined,{Recorder:Silent as unknown as typeof MediaRecorder}),o=options();await s.capture.start(o);const p=s.capture.stopAndTranscribe();expect(s.tracks[0]!.readyState).toBe('ended');await vi.advanceTimersByTimeAsync(2000);await p;expect(s.capture.pending).toBe(false);expect(o.onError).toHaveBeenCalledOnce();expect(s.transcribe).not.toHaveBeenCalled()})
  it('WAV encodes mono PCM header and bounds duration',async()=>{const blob=pcmWav([new Float32Array([0,1,-1]),new Float32Array([0,1,-1])],16000),view=new DataView(await blob.arrayBuffer());expect(blob.type).toBe('audio/wav');expect(view.getUint16(22,true)).toBe(1);expect(view.getUint32(24,true)).toBe(16000);expect(view.getInt16(46,true)).toBe(32767);expect(()=>pcmWav([new Float32Array(16000*31)],16000)).toThrow()})
})
const memory=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}}}
describe('official independent transcription boundary',()=>{
  it('sends one multipart WAV request to fixed STT route; no chat model/audio storage',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({text:'最终文字',model:'glm-asr-2512'}))),p=new ZhipuVoiceTranscriptionProvider('synthetic-key',[],fetcher);expect(await p.transcribe(new Blob(['wav'],{type:'audio/wav'}),new AbortController().signal)).toBe('最终文字');const [url,init]=fetcher.mock.calls[0]!;expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/audio/transcriptions');expect(init.credentials).toBe('omit');expect(init.headers).toEqual({Authorization:'Bearer synthetic-key'});expect(init.body.get('model')).toBe('glm-asr-2512');expect(init.body.get('stream')).toBe('false');expect(init.body.get('file')).toBeNull();expect(fetcher).toHaveBeenCalledOnce()})
  it.each([new Response('raw synthetic-key',{status:401}),new Response(JSON.stringify({text:'synthetic-key'})),new Response('bad json'),new Response(JSON.stringify({text:''})),new Response('x'.repeat(33000))])('rejects unsafe responses without key leakage or retry',async response=>{const f=vi.fn().mockResolvedValue(response),p=new ZhipuVoiceTranscriptionProvider('synthetic-key',[],f);await expect(p.transcribe(new Blob(['wav'],{type:'audio/wav'}),new AbortController().signal)).rejects.not.toThrow('synthetic-key');expect(f).toHaveBeenCalledOnce()})
  it('timeout aborts transport, does not retry',async()=>{const f=vi.fn((_url,init)=>new Promise<Response>((_r,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('private'))))),p=new ZhipuVoiceTranscriptionProvider('key',[],f as typeof fetch,5);await expect(p.transcribe(new Blob(['wav'],{type:'audio/wav'}),new AbortController().signal)).rejects.toMatchObject({code:'voice_timeout'});expect(f).toHaveBeenCalledOnce()})
  it('device voice config/key and raw audio never enter exported Backup or its Sync payload',async()=>{const env=aiEnvironment(),storage=memory(),settings=new VoiceSettings(storage);settings.save('zhipu-key','synthetic-voice-separate');try{const s=setup(),o=options();const before=await exportBackup(env.database);await s.capture.start(o);await s.capture.stopAndTranscribe();const after=await exportBackup(env.database);expect(after.data).toEqual(before.data);expect(after.schemaVersion).toBe(10);expect(Object.keys(after.data)).toHaveLength(18);expect(JSON.stringify(after)).not.toMatch(/synthetic-voice-separate|memory-only|fitlog-voice|audio\/wav/);s.capture.dispose()}finally{env.database.close();await env.database.delete()}})
  it('only official preset/base may reuse a key, never copies it; separate key stays device-only',()=>{const storage=memory(),profiles=new AiProfiles(storage),settings=new VoiceSettings(storage);const p=profiles.save({name:'custom',model:'glm-5.3-flash',baseUrl:'https://custom.invalid/v1'},'profile-key');expect(voiceProvider(profiles,settings)).toBeUndefined();profiles.save({...p,preset:'zhipu',baseUrl:'https://open.bigmodel.cn/api/paas/v4'},'profile-key',p.id);expect(voiceProvider(profiles,settings)?.label).toContain('glm-asr');expect(storage.getItem(VOICE_KEY)).toBeNull();settings.save('zhipu-key','separate-key');expect(profiles.knownSecrets).toContain('separate-key');expect(settings.config).toEqual({version:1,mode:'zhipu-key'});settings.save('browser');expect(voiceProvider(profiles,settings)).toBeUndefined()})
})
describe('system TTS',()=>{
  it('speaks final text without URLs/debug and cancels with detached stale state',()=>{const speech={speak:vi.fn(),cancel:vi.fn()},state=vi.fn();vi.stubGlobal('speechSynthesis',speech);vi.stubGlobal('SpeechSynthesisUtterance',class{ text:string; constructor(text:string){this.text=text} });const reply=new VoiceReply(state);reply.speak('找到视频。 https://example.com ```debug```');expect(speech.speak).toHaveBeenCalledOnce();const utterance=speech.speak.mock.calls[0]![0];expect(utterance.text).not.toMatch(/example|debug/);expect(utterance.lang).toBe('zh-CN');const end=utterance.onend;reply.cancel();end();expect(reply.active).toBe(false);expect(speech.cancel).toHaveBeenCalledTimes(2)})
})
