import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { aiCall, aiEnvironment } from './helpers/ai'
import { AiProfiles } from '../src/services/aiProfiles'
import { AiOrchestrator } from '../src/ai/orchestrator'
import { SpeechRecognitionService, type Recognition } from '../src/services/speechRecognitionService'
import { parseQuickLaunchHash } from '../src/ui/quickLaunch'
class RecognitionMock implements Recognition {
 static last:RecognitionMock
 lang='';continuous=false;interimResults=true;maxAlternatives=1
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null
 constructor(){RecognitionMock.last=this}start(){this.onstart?.()}stop(){}abort(){}
}
async function environment(run:(state:ReturnType<typeof aiEnvironment>,engine:AiOrchestrator,chat:ReturnType<typeof vi.fn>)=>Promise<void>){
 const env=aiEnvironment(), values=new Map<string,string>(), profiles=new AiProfiles({getItem:k=>values.get(k)||null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)}})
 const profile=profiles.save({name:'合成',baseUrl:'https://mock.invalid/v1',model:'chat',visionModel:'image'},'synthetic-voice-key');profiles.acknowledgePrivacy();profiles.setCapability(profile.id,'supported');profiles.setVisionCapability(profile.id,'unsupported')
 const chat=vi.fn(),engine=new AiOrchestrator({profiles,database:env.database,context:()=>env.context,clientFactory:()=>({chat,chatStream:chat,visionChat:vi.fn(),testConnection:vi.fn(),testToolCapability:vi.fn(),testVisionCapability:vi.fn(),listModels:vi.fn()})})
 try{await run(env,engine,chat)}finally{env.database.close();await env.database.delete()}
}
describe('voice and fragment reuse existing safety path',()=>{
 it('spoken final/end can create only a pending proposal; repeated end never confirms or writes',async()=>environment(async(env,engine,chat)=>{
  chat.mockResolvedValueOnce({content:'',toolCalls:[aiCall('propose_weight',{date:'2026-10-02',weightKg:72})]}).mockResolvedValueOnce({content:'请确认',toolCalls:[]})
  const send=vi.spyOn(engine,'send'),speech=new SpeechRecognitionService(RecognitionMock)
  speech.start({onFinal:text=>void engine.send(text),onError:vi.fn()});const r=RecognitionMock.last
  r.onresult?.({resultIndex:0,results:[{length:1,isFinal:false,0:{transcript:'记录今天'}}]});expect(send).not.toHaveBeenCalled()
  r.onresult?.({resultIndex:0,results:[{length:1,isFinal:true,0:{transcript:'记录今天72kg'}}]});expect(send).not.toHaveBeenCalled()
  const end=r.onend!;end();end();await vi.waitFor(()=>expect(engine.busy).toBe(false));expect(send).toHaveBeenCalledExactlyOnceWith('记录今天72kg');expect(chat).toHaveBeenCalledTimes(2);expect(engine.proposals.all[0].status).toBe('pending');expect(await env.database.weights.count()).toBe(0)
  speech.dispose()
 }))
 it('voice and quick prompt credentials are rejected before provider calls and never enter history',async()=>environment(async(_env,engine,chat)=>{
  const speech=new SpeechRecognitionService(RecognitionMock);speech.start({onFinal:text=>void engine.send(text),onError:vi.fn()});RecognitionMock.last.onresult?.({resultIndex:0,results:[{length:1,isFinal:true,0:{transcript:'synthetic-voice-key'}}]});RecognitionMock.last.onend?.()
  const intent=parseQuickLaunchHash('#quick=ai&prompt=synthetic-voice-key&send=1')!;await engine.send(intent.prompt!);expect(chat).not.toHaveBeenCalled();expect(JSON.stringify(engine.items)).not.toContain('synthetic-voice-key');expect(engine.items.at(-1)?.content).toContain('凭据');speech.dispose()
 }))
})
